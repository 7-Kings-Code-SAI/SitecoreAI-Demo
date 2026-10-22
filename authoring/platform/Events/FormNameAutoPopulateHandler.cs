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
            try
            {
                var item = Event.ExtractParameter(args, 0) as Item;
                if (item == null)
                {
                    return;
                }

                if (item.Database == null || !string.Equals(item.Database.Name, "master", StringComparison.OrdinalIgnoreCase))
                    return;

                if (!item.Paths.FullPath.StartsWith("/sitecore/content", StringComparison.OrdinalIgnoreCase))
                    return;

                Log.Info(string.Format("[FormNameAutoPopulate] OnItemSaved fired for '{0}'", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));

                // Read the computed Final Layout (merged shared + delta) using LayoutField helper
                var finalLayoutField = item.Fields[Sitecore.FieldIDs.FinalLayoutField];
                var sharedLayoutField = item.Fields[Sitecore.FieldIDs.LayoutField];

                string finalXml = finalLayoutField != null ? LayoutField.GetFieldValue(finalLayoutField) : null;
                string sharedXml = sharedLayoutField != null ? LayoutField.GetFieldValue(sharedLayoutField) : null;

                Log.Info(string.Format("[FormNameAutoPopulate] FinalLayout length={0}, SharedLayout length={1}",
                    finalXml != null ? finalXml.Length.ToString() : "null",
                    sharedXml != null ? sharedXml.Length.ToString() : "null"), typeof(FormNameAutoPopulateHandler));

                bool hasFormInFinal = !string.IsNullOrEmpty(finalXml) && finalXml.IndexOf("FormId", StringComparison.OrdinalIgnoreCase) >= 0;
                bool hasFormInShared = !string.IsNullOrEmpty(sharedXml) && sharedXml.IndexOf("FormId", StringComparison.OrdinalIgnoreCase) >= 0;

                if (!hasFormInFinal && !hasFormInShared)
                {
                    Log.Info(string.Format("[FormNameAutoPopulate] No FormId found in layouts for '{0}', skipping.", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                    return;
                }

                Log.Info(string.Format("[FormNameAutoPopulate] FormId detected! Final={0}, Shared={1}. Processing...", hasFormInFinal, hasFormInShared), typeof(FormNameAutoPopulateHandler));

                using (new EventDisabler())
                {
                    using (new SecurityDisabler())
                    {
                        item.Editing.BeginEdit();

                        bool modified = false;

                        // Process Final Layout
                        if (hasFormInFinal)
                        {
                            modified |= UpdateLayoutXml(item, Sitecore.FieldIDs.FinalLayoutField, finalXml);
                        }

                        // Process Shared Layout
                        if (hasFormInShared)
                        {
                            modified |= UpdateLayoutXml(item, Sitecore.FieldIDs.LayoutField, sharedXml);
                        }

                        if (modified)
                        {
                            item.Editing.EndEdit();
                            Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' successfully committed FormName into database.", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                        }
                        else
                        {
                            item.Editing.CancelEdit();
                            Log.Info(string.Format("[FormNameAutoPopulate] Page '{0}' - no changes needed (FormName already set or could not resolve).", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error(string.Format("[FormNameAutoPopulate] EXCEPTION in OnItemSaved: {0}", ex.Message), ex, typeof(FormNameAutoPopulateHandler));
            }
        }

        /// <summary>
        /// Fallback handler: executes during item:saving.
        /// </summary>
        public void OnItemSaving(object sender, EventArgs args)
        {
            try
            {
                var item = Event.ExtractParameter(args, 0) as Item;
                if (item == null || item.Database == null || !string.Equals(item.Database.Name, "master", StringComparison.OrdinalIgnoreCase))
                    return;

                if (!item.Paths.FullPath.StartsWith("/sitecore/content", StringComparison.OrdinalIgnoreCase))
                    return;

                Log.Info(string.Format("[FormNameAutoPopulate] OnItemSaving fired for '{0}'", item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));

                SyncAllLayouts(item);
            }
            catch (Exception ex)
            {
                Log.Error(string.Format("[FormNameAutoPopulate] EXCEPTION in OnItemSaving: {0}", ex.Message), ex, typeof(FormNameAutoPopulateHandler));
            }
        }

        /// <summary>
        /// Updates a single layout field's XML with resolved FormName values.
        /// Uses the computed/merged XML from LayoutField.GetFieldValue, parses it, updates FormName, writes back.
        /// </summary>
        private static bool UpdateLayoutXml(Item item, Sitecore.Data.ID fieldId, string layoutXml)
        {
            if (string.IsNullOrWhiteSpace(layoutXml))
                return false;

            try
            {
                var layoutDef = LayoutDefinition.Parse(layoutXml);
                if (layoutDef == null || layoutDef.Devices == null || layoutDef.Devices.Count == 0)
                {
                    Log.Info(string.Format("[FormNameAutoPopulate] LayoutDefinition.Parse returned no devices for field '{0}' on '{1}'",
                        fieldId == Sitecore.FieldIDs.FinalLayoutField ? "FinalLayout" : "SharedLayout",
                        item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                    return false;
                }

                bool isModified = false;
                string fieldLabel = fieldId == Sitecore.FieldIDs.FinalLayoutField ? "FinalLayout" : "SharedLayout";

                for (int d = 0; d < layoutDef.Devices.Count; d++)
                {
                    var device = layoutDef.Devices[d] as DeviceDefinition;
                    if (device == null || device.Renderings == null) continue;

                    for (int i = 0; i < device.Renderings.Count; i++)
                    {
                        var rendering = device.Renderings[i] as RenderingDefinition;
                        if (rendering == null) continue;

                        var parameters = WebUtil.ParseUrlParameters(rendering.Parameters ?? string.Empty);

                        string formId = GetParameterValue(parameters, "FormId");
                        if (string.IsNullOrEmpty(formId)) continue;

                        formId = SanitizeFormId(formId);
                        if (string.IsNullOrEmpty(formId)) continue;

                        Log.Info(string.Format("[FormNameAutoPopulate] Found FormId='{0}' in {1} on '{2}', resolving name...", formId, fieldLabel, item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));

                        var resolvedName = ResolveFormName(item.Database, formId);
                        string currentFormName = GetParameterValue(parameters, "FormName");

                        Log.Info(string.Format("[FormNameAutoPopulate] Resolved='{0}', Current='{1}'", resolvedName ?? "(null)", currentFormName ?? "(null)"), typeof(FormNameAutoPopulateHandler));

                        // Clean FormId if it had brackets
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
                            Log.Info(string.Format("[FormNameAutoPopulate] Updated FormName to '{0}' for FormId '{1}' in {2} on '{3}'",
                                resolvedName, formId, fieldLabel, item.Paths.FullPath), typeof(FormNameAutoPopulateHandler));
                        }
                    }
                }

                if (isModified)
                {
                    var newXml = layoutDef.ToXml();
                    Log.Info(string.Format("[FormNameAutoPopulate] Writing updated XML to {0} (length={1})", fieldLabel, newXml.Length), typeof(FormNameAutoPopulateHandler));
                    item[fieldId] = newXml;
                }

                return isModified;
            }
            catch (Exception ex)
            {
                Log.Error(string.Format("[FormNameAutoPopulate] EXCEPTION in UpdateLayoutXml for field '{0}' on '{1}': {2}",
                    fieldId == Sitecore.FieldIDs.FinalLayoutField ? "FinalLayout" : "SharedLayout",
                    item.Paths.FullPath, ex.Message), ex, typeof(FormNameAutoPopulateHandler));
                return false;
            }
        }

        /// <summary>
        /// Synchronizes FormName across both Final Layout and Shared Layout regardless of shared settings.
        /// </summary>
       public static bool SyncAllLayouts(Item item)
{
    if (item == null ||
        item.Database == null ||
        !string.Equals(item.Database.Name, "master",
            StringComparison.OrdinalIgnoreCase))
    {
        return false;
    }

    bool modified = false;

    modified |= UpdateLayoutField(
        item,
        Sitecore.FieldIDs.LayoutField);

    modified |= UpdateLayoutField(
        item,
        Sitecore.FieldIDs.FinalLayoutField);

    return modified;
}

private static bool UpdateLayoutField(
    Item item,
    Sitecore.Data.ID fieldId)
{
    string layoutXml = item[fieldId];

    if (string.IsNullOrWhiteSpace(layoutXml) ||
        layoutXml.IndexOf("FormId",
            StringComparison.OrdinalIgnoreCase) < 0)
    {
        return false;
    }

    try
    {
        var layout = LayoutDefinition.Parse(layoutXml);

        if (layout == null || layout.Devices == null)
            return false;

        bool modified = false;

        foreach (DeviceDefinition device in layout.Devices)
        {
            if (device == null || device.Renderings == null)
                continue;

            foreach (RenderingDefinition rendering in device.Renderings)
            {
                if (rendering == null)
                    continue;

                var parameters = WebUtil.ParseUrlParameters(
                    rendering.Parameters ?? string.Empty);

                string rawFormId = GetParameterValue(
                    parameters, "FormId");

                // Never infer an ID from another rendering.
                if (string.IsNullOrWhiteSpace(rawFormId))
                    continue;

                string formId = SanitizeFormId(rawFormId);
                if (string.IsNullOrWhiteSpace(formId))
                    continue;

                string formName = ResolveFormName(
                    item.Database, formId);

                // An unknown form must not be assigned a guessed name.
                if (string.IsNullOrWhiteSpace(formName))
                {
                    Log.Warn(
                        "[FormNameAutoPopulate] No mapping found for FormId '" +
                        formId + "' on '" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));

                    continue;
                }

                string currentName = GetParameterValue(
                    parameters, "FormName");

                if (string.Equals(
                    currentName, formName,
                    StringComparison.Ordinal))
                {
                    continue;
                }

                string nameKey =
                    FindKeyIgnoreCase(parameters, "FormName")
                    ?? "FormName";

                parameters[nameKey] = formName;

                var builder = new StringBuilder();

                foreach (string key in parameters.AllKeys)
                {
                    if (string.IsNullOrEmpty(key))
                        continue;

                    if (builder.Length > 0)
                        builder.Append("&");

                    string value = parameters[key];

                    builder.Append(key);

                    if (value != null)
                    {
                        builder.Append("=")
                               .Append(HttpUtility.UrlEncode(value));
                    }
                }

                rendering.Parameters = builder.ToString();
                modified = true;

                Log.Info(
                    "[FormNameAutoPopulate] Set FormName='" +
                    formName + "' for FormId='" + formId +
                    "' on '" + item.Paths.FullPath + "'.",
                    typeof(FormNameAutoPopulateHandler));
            }
        }

        if (modified)
            item[fieldId] = layout.ToXml();

        return modified;
    }
    catch (Exception ex)
    {
        Log.Error(
            "[FormNameAutoPopulate] Failed to update layout field '" +
            fieldId + "' on '" + item.Paths.FullPath + "'.",
            ex,
            typeof(FormNameAutoPopulateHandler));

        return false;
    }
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

        public static string ResolveFormName(
    Sitecore.Data.Database db,
    string formId)
{
    if (string.IsNullOrWhiteSpace(formId))
        return string.Empty;

    formId = SanitizeFormId(formId);

    string formName;

    if (FormNameCache.TryGetValue(formId, out formName) &&
        !string.IsNullOrWhiteSpace(formName))
    {
        return formName;
    }

    return string.Empty;
}
    }
}
