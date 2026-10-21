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
    /// Automatically inspects any Form attached to a page and resolves the form name
    /// by dynamically reading the form's hidden input [name="form_name"].
    /// </summary>
    public class FormNameAutoPopulateHandler
    {
        public static readonly string FormRenderingId = "{D15632E6-B944-4861-A79B-F4E5A8DE14EA}";
        private static readonly string DefaultDeviceId = "{FE5D7FDF-89C0-4D99-9AA3-B5FBD009C9F3}";

        // Dynamic runtime cache populated on-the-fly.
        public static readonly ConcurrentDictionary<string, string> FormNameCache = CreateInitialCache();

        private static ConcurrentDictionary<string, string> CreateInitialCache()
        {
            var cache = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            cache["86efc930a7be4746983cc5f0b8b4b4f8-use"] = "Log In Form"; // Reference example
            return cache;
        }

        public void OnItemSaving(object sender, EventArgs args)
        {
            var item = Event.ExtractParameter(args, 0) as Item;
            if (item == null || item.Database == null || item.Database.Name != "master" || !item.Paths.IsContentItem)
                return;

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
            DeviceDefinition device = null;
            if (layoutDef.Devices != null && layoutDef.Devices.Count > 0)
            {
                device = layoutDef.Devices[0] as DeviceDefinition;
            }
            if (device == null)
            {
                device = layoutDef.GetDevice(DefaultDeviceId);
            }
            if (device == null || device.Renderings == null)
                return false;

            bool isModified = false;

            for (int i = 0; i < device.Renderings.Count; i++)
            {
                var rendering = device.Renderings[i] as RenderingDefinition;
                if (rendering != null)
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
                                sb.Append(key).Append("=").Append(HttpUtility.UrlEncode(parameters[key] ?? string.Empty));
                            }
                            rendering.Parameters = sb.ToString();

                            isModified = true;
                            Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' updated FormName to '{1}' for FormId '{2}'", item.Paths.FullPath, resolvedName, formId), typeof(FormNameAutoPopulateHandler));
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
