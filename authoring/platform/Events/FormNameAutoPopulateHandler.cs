using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using Sitecore.Configuration;
using Sitecore.Data.Events;
using Sitecore.Data.Fields;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Events;
using Sitecore.Layouts;
using Sitecore.SecurityModel;
using Sitecore.Web;

namespace XmCloudNextJsStarter.Events
{
    /// <summary>
    /// Sitecore event handler for auto-populating FormName on Final Layout and Shared Layout.
    /// Runs on item:saved with an explicit database edit transaction so changes are committed to SQL.
    /// Regardless of whether fields are shared or unshared, writes FormName across all layouts.
    /// </summary>
    public class FormNameAutoPopulateHandler
    {
        // Runtime in-memory cache to avoid repeated HTTP calls for the same FormId during authoring sessions
        public static readonly ConcurrentDictionary<string, string> FormNameCache = CreateInitialCache();

        private static ConcurrentDictionary<string, string> CreateInitialCache()
        {
            var cache = new ConcurrentDictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            cache["86efc930a7be4746983cc5f0b8b4b4f8-use"] = "Log In Form";
            return cache;
        }

        /// <summary>
        /// Primary handler: executes on item:saved and performs an explicit BeginEdit / EndEdit
        /// inside EventDisabler to guarantee changes are committed to the Master database.
        /// </summary>
        public void OnItemSaved(object sender, EventArgs args)
        {
            var item = Event.ExtractParameter(args, 0) as Item;
            if (item == null || item.Database == null || !string.Equals(item.Database.Name, "master", StringComparison.OrdinalIgnoreCase))
                return;

            if (!item.Paths.FullPath.StartsWith("/sitecore/content", StringComparison.OrdinalIgnoreCase))
                return;

            using (new EventDisabler())
            {
                using (new SecurityDisabler())
                {
                    item.Editing.BeginEdit();
                    bool modified = SyncAllLayouts(item);

                    if (modified)
                    {
                        item.Editing.EndEdit();
                        Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' successfully committed FormName into database.", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                    }
                    else
                    {
                        item.Editing.CancelEdit();
                    }
                }
            }
        }

        /// <summary>
        /// Fallback handler: executes during item:saving.
        /// </summary>
        public void OnItemSaving(object sender, EventArgs args)
        {
            var item = Event.ExtractParameter(args, 0) as Item;
            if (item == null || item.Database == null || !string.Equals(item.Database.Name, "master", StringComparison.OrdinalIgnoreCase))
                return;

            if (!item.Paths.FullPath.StartsWith("/sitecore/content", StringComparison.OrdinalIgnoreCase))
                return;

            SyncAllLayouts(item);
        }

        /// <summary>
        /// Synchronizes FormName across both Final Layout and Shared Layout regardless of shared settings.
        /// </summary>
        public static bool SyncAllLayouts(Item item)
        {
            var formIdByUid = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            string genericFormId = null;

            // 1. Discover all FormIds present across both Final Layout and Shared Layout
            CollectFormIds(item[Sitecore.FieldIDs.FinalLayoutField], formIdByUid, ref genericFormId);
            CollectFormIds(item[Sitecore.FieldIDs.LayoutField], formIdByUid, ref genericFormId);

            if (formIdByUid.Count == 0 && string.IsNullOrEmpty(genericFormId))
                return false;

            // 2. Update both Final Layout and Shared Layout
            bool finalModified = UpdateLayoutField(item, Sitecore.FieldIDs.FinalLayoutField, formIdByUid, genericFormId);
            bool sharedModified = UpdateLayoutField(item, Sitecore.FieldIDs.LayoutField, formIdByUid, genericFormId);

            return finalModified || sharedModified;
        }

        private static void CollectFormIds(string layoutXml, Dictionary<string, string> formIdByUid, ref string lastFormId)
        {
            if (string.IsNullOrWhiteSpace(layoutXml)) return;
            if (layoutXml.IndexOf("FormId", StringComparison.OrdinalIgnoreCase) < 0) return;

            var layoutDef = LayoutDefinition.Parse(layoutXml);
            if (layoutDef == null || layoutDef.Devices == null) return;

            for (int d = 0; d < layoutDef.Devices.Count; d++)
            {
                var device = layoutDef.Devices[d] as DeviceDefinition;
                if (device == null || device.Renderings == null) continue;

                for (int i = 0; i < device.Renderings.Count; i++)
                {
                    var rendering = device.Renderings[i] as RenderingDefinition;
                    if (rendering != null && !string.IsNullOrEmpty(rendering.Parameters))
                    {
                        var parameters = WebUtil.ParseUrlParameters(rendering.Parameters);
                        string rawFormId = GetParameterValue(parameters, "FormId");
                        if (!string.IsNullOrEmpty(rawFormId))
                        {
                            var cleanId = SanitizeFormId(rawFormId);
                            if (!string.IsNullOrEmpty(rendering.UniqueId))
                            {
                                formIdByUid[rendering.UniqueId] = cleanId;
                            }
                            lastFormId = cleanId;
                        }
                    }
                }
            }
        }

        private static bool UpdateLayoutField(Item item, Sitecore.Data.ID fieldId, Dictionary<string, string> formIdByUid, string genericFormId)
        {
            var layoutXml = item[fieldId];
            if (string.IsNullOrWhiteSpace(layoutXml))
                return false;

            var layoutDef = LayoutDefinition.Parse(layoutXml);
            if (layoutDef == null || layoutDef.Devices == null || layoutDef.Devices.Count == 0)
                return false;

            bool isModified = false;

            for (int d = 0; d < layoutDef.Devices.Count; d++)
            {
                var device = layoutDef.Devices[d] as DeviceDefinition;
                if (device == null || device.Renderings == null) continue;

                for (int i = 0; i < device.Renderings.Count; i++)
                {
                    var rendering = device.Renderings[i] as RenderingDefinition;
                    if (rendering == null) continue;

                    var parameters = WebUtil.ParseUrlParameters(rendering.Parameters ?? string.Empty);

                    // Determine FormId for this rendering: directly in parameters, or inherited via UniqueId, or fallback
                    string formId = GetParameterValue(parameters, "FormId");
                    if (!string.IsNullOrEmpty(formId))
                    {
                        formId = SanitizeFormId(formId);
                    }
                    else if (!string.IsNullOrEmpty(rendering.UniqueId) && formIdByUid.ContainsKey(rendering.UniqueId))
                    {
                        formId = formIdByUid[rendering.UniqueId];
                    }
                    else if (!string.IsNullOrEmpty(rendering.Parameters) && rendering.Parameters.IndexOf("FormId", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        formId = genericFormId;
                    }

                    if (!string.IsNullOrEmpty(formId))
                    {
                        var resolvedName = ResolveFormName(item.Database, formId);
                        string currentFormName = GetParameterValue(parameters, "FormName");

                        bool formIdCleaned = false;
                        string formIdKey = FindKeyIgnoreCase(parameters, "FormId") ?? "FormId";
                        string currentFormIdVal = parameters[formIdKey];
                        if (currentFormIdVal != null && !string.Equals(currentFormIdVal, formId, StringComparison.Ordinal))
                        {
                            parameters[formIdKey] = formId;
                            formIdCleaned = true;
                        }

                        if ((!string.IsNullOrEmpty(resolvedName) && currentFormName != resolvedName) || formIdCleaned)
                        {
                            string formNameKey = FindKeyIgnoreCase(parameters, "FormName") ?? "FormName";
                            parameters[formNameKey] = resolvedName;

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
                            Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' updated FormName to '{1}' for FormId '{2}' in field '{3}'", item.Paths.FullPath, resolvedName, formId, fieldId == Sitecore.FieldIDs.FinalLayoutField ? "FinalLayout" : "SharedLayout"), typeof(FormNameAutoPopulateHandler));
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

        private static string GetParameterValue(System.Collections.Specialized.NameValueCollection parameters, string keyName)
        {
            if (parameters == null || parameters.Count == 0) return null;
            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(key, keyName, StringComparison.OrdinalIgnoreCase))
                {
                    return parameters[key];
                }
            }
            return null;
        }

        private static string FindKeyIgnoreCase(System.Collections.Specialized.NameValueCollection parameters, string keyName)
        {
            if (parameters == null || parameters.Count == 0) return null;
            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(key, keyName, StringComparison.OrdinalIgnoreCase))
                {
                    return key;
                }
            }
            return null;
        }

        /// <summary>
        /// Sanitizes Form ID by stripping curly brackets, URL-encoded %7B/%7D, and accidental 7B prefix.
        /// </summary>
        public static string SanitizeFormId(string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            var clean = formId.Trim('{', '}', ' ', '"', '\'')
                              .Replace("%7B", "")
                              .Replace("%7b", "")
                              .Replace("%7D", "")
                              .Replace("%7d", "");

            if (clean.StartsWith("7B", StringComparison.OrdinalIgnoreCase) && clean.Length > 30)
            {
                clean = clean.Substring(2);
            }

            return clean.Trim();
        }

        public static string ResolveFormName(Sitecore.Data.Database db, string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            formId = SanitizeFormId(formId);

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
                    Log.Info(string.Format("[FormNameAutoPopulate] Fetching form markup for FormId '{0}' from Edge API: {1}", formId, url), typeof(FormNameAutoPopulateHandler));

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
