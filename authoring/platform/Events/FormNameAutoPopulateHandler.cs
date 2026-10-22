using System;
using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using Sitecore.Configuration;
using Sitecore.Data.Fields;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Events;
using Sitecore.Layouts;
using Sitecore.Web;

namespace XmCloudNextJsStarter.Events
{
    /// <summary>
    /// Sitecore item:saving event handler.
    /// Triggers ONLY when an author saves a page in Content Editor.
    /// Dynamically extracts the form name from the form's hidden input [name="form_name"]
    /// and populates the FormName rendering parameter for that specific saved page.
    /// </summary>
    public class FormNameAutoPopulateHandler
    {
        // Runtime in-memory cache to avoid repeated HTTP calls for the same FormId during authoring sessions
        public static readonly ConcurrentDictionary<string, string> FormNameCache = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        public void OnItemSaving(object sender, EventArgs args)
        {
            var item = Event.ExtractParameter(args, 0) as Item;
            if (item == null || item.Database == null || !string.Equals(item.Database.Name, "master", StringComparison.OrdinalIgnoreCase))
                return;

            if (!item.Paths.FullPath.StartsWith("/sitecore/content", StringComparison.OrdinalIgnoreCase))
                return;

            // Trigger on the single saved page only - updates Final Layout and Shared Layout
            SyncFormNameInLayout(item, Sitecore.FieldIDs.FinalLayoutField);
            SyncFormNameInLayout(item, Sitecore.FieldIDs.LayoutField);
        }

        public static bool SyncFormNameInLayout(Item item, Sitecore.Data.ID fieldId)
        {
            var layoutFieldValue = item[fieldId];
            if (string.IsNullOrWhiteSpace(layoutFieldValue))
                return false;

            if (!layoutFieldValue.Contains("FormId"))
                return false;

            var layoutDef = LayoutDefinition.Parse(layoutFieldValue);
            if (layoutDef == null || layoutDef.Devices == null || layoutDef.Devices.Count == 0)
                return false;

            bool isModified = false;

            // Inspect all devices on the item layout
            for (int d = 0; d < layoutDef.Devices.Count; d++)
            {
                var device = layoutDef.Devices[d] as DeviceDefinition;
                if (device == null || device.Renderings == null) continue;

                for (int i = 0; i < device.Renderings.Count; i++)
                {
                    var rendering = device.Renderings[i] as RenderingDefinition;
                    if (rendering != null && !string.IsNullOrEmpty(rendering.Parameters) && rendering.Parameters.Contains("FormId"))
                    {
                        var parameters = WebUtil.ParseUrlParameters(rendering.Parameters);
                        var formId = parameters["FormId"];

                        if (!string.IsNullOrEmpty(formId))
                        {
                            var resolvedName = ResolveFormName(item.Database, formId);
                            if (!string.IsNullOrEmpty(resolvedName) && parameters["FormName"] != resolvedName)
                            {
                                parameters["FormName"] = resolvedName;

                                var sb = new StringBuilder();
                                foreach (string key in parameters.AllKeys)
                                {
                                    if (string.IsNullOrEmpty(key)) continue;
                                    if (sb.Length > 0) sb.Append("&");
                                    var val = parameters[key];
                                    if (string.IsNullOrEmpty(val))
                                    {
                                        sb.Append(key);
                                    }
                                    else
                                    {
                                        sb.Append(key).Append("=").Append(HttpUtility.UrlEncode(val));
                                    }
                                }
                                rendering.Parameters = sb.ToString();

                                isModified = true;
                                Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' automatically saved FormName '{1}' for FormId '{2}'", item.Paths.FullPath, resolvedName, formId), typeof(FormNameAutoPopulateHandler));
                            }
                        }
                    }
                }
            }

            if (isModified)
            {
                item[fieldId] = layoutDef.ToXml();
            }

            return isModified;
        }

        public static string ResolveFormName(Sitecore.Data.Database db, string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            // 1. Check in-memory runtime cache
            string cachedName;
            if (FormNameCache.TryGetValue(formId, out cachedName) && !string.IsNullOrEmpty(cachedName))
                return cachedName;

            // 2. Dynamic lookup: Query XM Cloud Edge Forms API and inspect the hidden [name="form_name"] input tag
            try
            {
                var edgeContextId = Settings.GetSetting("Sitecore.Edge.ContextId",
                    Environment.GetEnvironmentVariable("SITECORE_EDGE_CONTEXT_ID") ?? "7eCSMBWHMDqBbBuHi1sIYo");

                if (!string.IsNullOrEmpty(edgeContextId))
                {
                    try
                    {
                        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11 | SecurityProtocolType.Tls;
                    }
                    catch { }

                    var url = string.Format("https://edge-platform.sitecorecloud.io/v1/forms/publisher/{0}?sitecoreContextId={1}", formId, edgeContextId);
                    using (var webClient = new WebClient())
                    {
                        webClient.Headers.Add("User-Agent", "Sitecore-Authoring");
                        var html = webClient.DownloadString(url);

                        if (!string.IsNullOrEmpty(html))
                        {
                            var inputMatch = Regex.Match(html, @"<input[^>]*name=[""']form_name[""'][^>]*>", RegexOptions.IgnoreCase);
                            if (inputMatch.Success)
                            {
                                var valMatch = Regex.Match(inputMatch.Value, @"(?:value|data-prefill)=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
                                if (valMatch.Success && !string.IsNullOrWhiteSpace(valMatch.Groups[1].Value))
                                {
                                    var extracted = valMatch.Groups[1].Value.Trim();
                                    FormNameCache[formId] = extracted;
                                    Log.Info(string.Format("[FormNameAutoPopulate] Dynamically extracted FormName '{0}' for Form '{1}' from Edge API", extracted, formId), typeof(FormNameAutoPopulateHandler));
                                    return extracted;
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Warn(string.Format("[FormNameAutoPopulate] Could not fetch form '{0}' from Edge API: {1}", formId, ex.Message), typeof(FormNameAutoPopulateHandler));
            }

            // 3. Fallback: Check traditional Sitecore Forms under /sitecore/Forms in Master DB
            if (db != null)
            {
                var formItem = db.GetItem(string.Format("/sitecore/Forms/{0}", formId));
                if (formItem != null)
                {
                    foreach (Item child in formItem.Axes.GetDescendants())
                    {
                        if (child.Name.Equals("form_name", StringComparison.OrdinalIgnoreCase) ||
                            (child.Fields["Field Name"] != null && child.Fields["Field Name"].Value.Equals("form_name", StringComparison.OrdinalIgnoreCase)))
                        {
                            var val = child.Fields["Value"] != null ? child.Fields["Value"].Value : null;
                            if (!string.IsNullOrWhiteSpace(val))
                            {
                                FormNameCache[formId] = val.Trim();
                                return val.Trim();
                            }
                        }
                    }

                    var displayName = !string.IsNullOrEmpty(formItem.DisplayName) ? formItem.DisplayName : formItem.Name;
                    FormNameCache[formId] = displayName;
                    return displayName;
                }
            }

            return formId;
        }
    }
}
