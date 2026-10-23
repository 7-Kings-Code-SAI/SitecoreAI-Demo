
using System;
using System.Collections.Concurrent;
using System.Text;
using System.Web;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Events;
using Sitecore.Layouts;
using Sitecore.SecurityModel;
using Sitecore.Web;
using Sitecore.Data.Events;

namespace XmCloudNextJsStarter.Events
{
    /// <summary>
    /// Populates FormName from the configured FormId mapping.
    /// Includes diagnostic logging for layout parsing, name resolution,
    /// and item save processing.
    /// </summary>
    public class FormNameAutoPopulateHandler
    {
        private const string LogPrefix = "[FormNameAutoPopulate]";

        public static readonly ConcurrentDictionary<string, string>
            FormNameCache = CreateInitialCache();

        private static ConcurrentDictionary<string, string>
            CreateInitialCache()
        {
            var cache = new ConcurrentDictionary<string, string>(
                StringComparer.OrdinalIgnoreCase);

            cache["86efc930a7be4746983cc5f0b8b4b4f8-use"] =
                "Log In Form";

            return cache;
        }

        /// <summary>
        /// Runs after an item is saved.
        /// </summary>
        public void OnItemSaved(object sender, EventArgs args)
        {
            try
            {
                var item = Event.ExtractParameter(args, 0) as Item;

                if (item == null)
                {
                    Log.Info(
                        LogPrefix + " OnItemSaved: event item is null.",
                        typeof(FormNameAutoPopulateHandler));
                    return;
                }

                if (item.Database == null ||
                    !string.Equals(
                        item.Database.Name,
                        "master",
                        StringComparison.OrdinalIgnoreCase))
                {
                    Log.Info(
                        LogPrefix + " OnItemSaved skipped: database is not master.",
                        typeof(FormNameAutoPopulateHandler));
                    return;
                }

                if (!item.Paths.FullPath.StartsWith(
                    "/sitecore/content",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                Log.Info(
                    LogPrefix + " OnItemSaved fired for '" +
                    item.Paths.FullPath + "'.",
                    typeof(FormNameAutoPopulateHandler));

                var finalLayoutField =
                    item.Fields[Sitecore.FieldIDs.FinalLayoutField];

                var sharedLayoutField =
                    item.Fields[Sitecore.FieldIDs.LayoutField];

                string finalXml = finalLayoutField != null
                    ? Sitecore.Data.Fields.LayoutField.GetFieldValue(
                        finalLayoutField)
                    : null;

                string sharedXml = sharedLayoutField != null
                    ? Sitecore.Data.Fields.LayoutField.GetFieldValue(
                        sharedLayoutField)
                    : null;

                Log.Info(
                    LogPrefix + " OnItemSaved layout lengths: FinalLayout=" +
                    (finalXml == null ? "null" : finalXml.Length.ToString()) +
                    ", SharedLayout=" +
                    (sharedXml == null ? "null" : sharedXml.Length.ToString()),
                    typeof(FormNameAutoPopulateHandler));

                bool hasFormInFinal =
                    !string.IsNullOrEmpty(finalXml) &&
                    finalXml.IndexOf(
                        "FormId",
                        StringComparison.OrdinalIgnoreCase) >= 0;

                bool hasFormInShared =
                    !string.IsNullOrEmpty(sharedXml) &&
                    sharedXml.IndexOf(
                        "FormId",
                        StringComparison.OrdinalIgnoreCase) >= 0;

                if (!hasFormInFinal && !hasFormInShared)
                {
                    Log.Info(
                        LogPrefix + " No FormId found in computed layouts for '" +
                        item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));
                    return;
                }

                Log.Info(
                    LogPrefix + " OnItemSaved found FormId: FinalLayout=" +
                    hasFormInFinal + ", SharedLayout=" + hasFormInShared + ".",
                    typeof(FormNameAutoPopulateHandler));

                using (new Sitecore.Data.Events.EventDisabler())
                using (new SecurityDisabler())
                {
                    item.Editing.BeginEdit();

                    bool modified = false;

                    /*
                     * WARNING:
                     * GetFieldValue can return a merged/computed layout.
                     * Writing that result into the raw Final Layout field can
                     * overwrite delta-layout semantics. Review this path before
                     * enabling it in production.
                     */
                    if (hasFormInFinal)
                    {
                        Log.Info(
                            LogPrefix + " Processing computed FinalLayout for '" +
                            item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        modified |= UpdateLayoutXml(
                            item,
                            Sitecore.FieldIDs.FinalLayoutField,
                            finalXml);
                    }

                    if (hasFormInShared)
                    {
                        Log.Info(
                            LogPrefix + " Processing SharedLayout for '" +
                            item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        modified |= UpdateLayoutXml(
                            item,
                            Sitecore.FieldIDs.LayoutField,
                            sharedXml);
                    }

                    if (modified)
                    {
                        item.Editing.EndEdit();

                        Log.Info(
                            LogPrefix + " OnItemSaved committed layout changes for '" +
                            item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));
                    }
                    else
                    {
                        item.Editing.CancelEdit();

                        Log.Info(
                            LogPrefix + " OnItemSaved made no changes for '" +
                            item.Paths.FullPath +
                            "' (name unresolved or already populated).",
                            typeof(FormNameAutoPopulateHandler));
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " EXCEPTION in OnItemSaved.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));
            }
        }

        /// <summary>
        /// Runs while an item is being saved.
        /// </summary>
        public void OnItemSaving(object sender, EventArgs args)
        {
            try
            {
                var item = Event.ExtractParameter(args, 0) as Item;

                if (item == null)
                {
                    Log.Info(
                        LogPrefix + " OnItemSaving: event item is null.",
                        typeof(FormNameAutoPopulateHandler));
                    return;
                }

                if (item.Database == null ||
                    !string.Equals(
                        item.Database.Name,
                        "master",
                        StringComparison.OrdinalIgnoreCase))
                {
                    Log.Info(
                        LogPrefix + " OnItemSaving skipped: database is not master.",
                        typeof(FormNameAutoPopulateHandler));
                    return;
                }

                if (!item.Paths.FullPath.StartsWith(
                    "/sitecore/content",
                    StringComparison.OrdinalIgnoreCase))
                {
                    return;
                }

                Log.Info(
                    LogPrefix + " OnItemSaving fired for '" +
                    item.Paths.FullPath + "'.",
                    typeof(FormNameAutoPopulateHandler));

                Log.Info(
                    LogPrefix + " BEFORE SyncAllLayouts: " +
                    item.Paths.FullPath,
                    typeof(FormNameAutoPopulateHandler));

                bool modified = SyncAllLayouts(item);

                Log.Info(
                    LogPrefix + " AFTER SyncAllLayouts: " +
                    item.Paths.FullPath + ", Modified=" + modified,
                    typeof(FormNameAutoPopulateHandler));
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " EXCEPTION in OnItemSaving.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));
            }
        }

        /// <summary>
        /// Updates layout XML supplied by the caller.
        /// </summary>
        private static bool UpdateLayoutXml(
            Item item,
            Sitecore.Data.ID fieldId,
            string layoutXml)
        {
            if (string.IsNullOrWhiteSpace(layoutXml))
            {
                Log.Info(
                    LogPrefix + " UpdateLayoutXml skipped: XML is empty for field '" +
                    fieldId + "'.",
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }

            string fieldLabel =
                fieldId == Sitecore.FieldIDs.FinalLayoutField
                    ? "FinalLayout"
                    : "SharedLayout";

            try
            {
                var layout = LayoutDefinition.Parse(layoutXml);

                if (layout == null ||
                    layout.Devices == null ||
                    layout.Devices.Count == 0)
                {
                    Log.Info(
                        LogPrefix + " LayoutDefinition.Parse returned no devices for " +
                        fieldLabel + " on '" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));
                    return false;
                }

                bool modified = false;

                foreach (DeviceDefinition device in layout.Devices)
                {
                    if (device == null || device.Renderings == null)
                    {
                        continue;
                    }

                    foreach (RenderingDefinition rendering in device.Renderings)
                    {
                        if (rendering == null)
                        {
                            continue;
                        }

                        var parameters = WebUtil.ParseUrlParameters(
                            rendering.Parameters ?? string.Empty);

                        string rawFormId = GetParameterValue(
                            parameters, "FormId");

                        Log.Info(
                            LogPrefix + " UpdateLayoutXml: field=" +
                            fieldLabel + ", raw FormId='" +
                            (rawFormId ?? "(null)") + "', page='" +
                            item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(rawFormId))
                        {
                            continue;
                        }

                        string formId = SanitizeFormId(rawFormId);

                        Log.Info(
                            LogPrefix + " UpdateLayoutXml: sanitized FormId='" +
                            formId + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(formId))
                        {
                            Log.Warn(
                                LogPrefix + " Empty FormId after sanitization on '" +
                                item.Paths.FullPath + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string resolvedName = ResolveFormName(
                            item.Database, formId);

                        string currentName = GetParameterValue(
                            parameters, "FormName");

                        Log.Info(
                            LogPrefix + " UpdateLayoutXml: Resolved FormName='" +
                            (resolvedName ?? "(null)") +
                            "', Current FormName='" +
                            (currentName ?? "(null)") +
                            "', FormId='" + formId +
                            "', field=" + fieldLabel + ".",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(resolvedName))
                        {
                            Log.Warn(
                                LogPrefix + " No mapping found for FormId='" +
                                formId + "' on '" + item.Paths.FullPath + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        if (string.Equals(
                            currentName,
                            resolvedName,
                            StringComparison.Ordinal))
                        {
                            Log.Info(
                                LogPrefix + " FormName already matches '" +
                                resolvedName + "' for FormId='" + formId + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string nameKey =
                            FindKeyIgnoreCase(parameters, "FormName")
                            ?? "FormName";

                        parameters[nameKey] = resolvedName;

                        rendering.Parameters = BuildParameters(parameters);
                        modified = true;

                        Log.Info(
                            LogPrefix + " Updated FormName='" +
                            resolvedName + "' for FormId='" + formId +
                            "' in " + fieldLabel + " on '" +
                            item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));
                    }
                }

                if (modified)
                {
                    string newXml = layout.ToXml();

                    Log.Info(
                        LogPrefix + " Writing updated XML to " +
                        fieldLabel + ", XML length=" + newXml.Length +
                        ", page='" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));

                    item[fieldId] = newXml;
                }
                else
                {
                    Log.Info(
                        LogPrefix + " No XML changes for " + fieldLabel +
                        " on '" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));
                }

                return modified;
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " EXCEPTION in UpdateLayoutXml for " +
                    fieldLabel + " on '" + item.Paths.FullPath + "'.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));

                return false;
            }
        }

        /// <summary>
        /// Processes the raw Shared Layout and Final Layout fields separately.
        /// </summary>
        public static bool SyncAllLayouts(Item item)
        {
            if (item == null ||
                item.Database == null ||
                !string.Equals(
                    item.Database.Name,
                    "master",
                    StringComparison.OrdinalIgnoreCase))
            {
                Log.Info(
                    LogPrefix + " SyncAllLayouts skipped: item is null or " +
                    "database is not master.",
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }

            Log.Info(
                LogPrefix + " SyncAllLayouts START: " +
                item.Paths.FullPath,
                typeof(FormNameAutoPopulateHandler));

            bool modified = false;

            bool sharedModified = UpdateLayoutField(
                item,
                Sitecore.FieldIDs.LayoutField);

            Log.Info(
                LogPrefix + " Shared Layout processed. Modified=" +
                sharedModified,
                typeof(FormNameAutoPopulateHandler));

            modified |= sharedModified;

            bool finalModified = UpdateLayoutField(
                item,
                Sitecore.FieldIDs.FinalLayoutField);

            Log.Info(
                LogPrefix + " Final Layout processed. Modified=" +
                finalModified,
                typeof(FormNameAutoPopulateHandler));

            modified |= finalModified;

            Log.Info(
                LogPrefix + " SyncAllLayouts END: " +
                item.Paths.FullPath + ", Overall Modified=" + modified,
                typeof(FormNameAutoPopulateHandler));

            return modified;
        }

        /// <summary>
        /// Reads and updates one raw layout field.
        /// </summary>
        private static bool UpdateLayoutField(
            Item item,
            Sitecore.Data.ID fieldId)
        {
            string fieldLabel =
                fieldId == Sitecore.FieldIDs.FinalLayoutField
                    ? "FinalLayout"
                    : "SharedLayout";

            string layoutXml = item[fieldId];

            Log.Info(
                LogPrefix + " Checking field='" + fieldLabel +
                "' on '" + item.Paths.FullPath +
                "', XML length=" +
                (layoutXml == null ? "null" : layoutXml.Length.ToString()),
                typeof(FormNameAutoPopulateHandler));

            if (string.IsNullOrWhiteSpace(layoutXml))
            {
                Log.Info(
                    LogPrefix + " Skipping " + fieldLabel +
                    ": XML is empty.",
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }

            if (layoutXml.IndexOf(
                "FormId",
                StringComparison.OrdinalIgnoreCase) < 0)
            {
                Log.Info(
                    LogPrefix + " Skipping " + fieldLabel +
                    ": no FormId text found.",
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }

            try
            {
                var layout = LayoutDefinition.Parse(layoutXml);

                if (layout == null || layout.Devices == null)
                {
                    Log.Warn(
                        LogPrefix + " Layout parsing returned null for " +
                        fieldLabel + " on '" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));
                    return false;
                }

                bool modified = false;

                foreach (DeviceDefinition device in layout.Devices)
                {
                    if (device == null || device.Renderings == null)
                    {
                        continue;
                    }

                    foreach (RenderingDefinition rendering in device.Renderings)
                    {
                        if (rendering == null)
                        {
                            continue;
                        }

                        var parameters = WebUtil.ParseUrlParameters(
                            rendering.Parameters ?? string.Empty);

                        string rawFormId = GetParameterValue(
                            parameters, "FormId");

                        Log.Info(
                            LogPrefix + " Parsed raw FormId='" +
                            (rawFormId ?? "(null)") +
                            "', field='" + fieldLabel +
                            "', page='" + item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(rawFormId))
                        {
                            continue;
                        }

                        string formId = SanitizeFormId(rawFormId);

                        Log.Info(
                            LogPrefix + " Sanitized FormId='" +
                            (formId ?? "(null)") +
                            "', field='" + fieldLabel + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(formId))
                        {
                            Log.Warn(
                                LogPrefix + " FormId became empty after " +
                                "sanitization on '" + item.Paths.FullPath + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string formName = ResolveFormName(
                            item.Database, formId);

                        Log.Info(
                            LogPrefix + " Resolved FormName='" +
                            (formName ?? "(null)") +
                            "' for FormId='" + formId +
                            "', page='" + item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.IsNullOrWhiteSpace(formName))
                        {
                            Log.Warn(
                                LogPrefix + " No mapping found for FormId='" +
                                formId + "' on '" + item.Paths.FullPath + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string currentName = GetParameterValue(
                            parameters, "FormName");

                        Log.Info(
                            LogPrefix + " Current FormName='" +
                            (currentName ?? "(null)") +
                            "', Resolved FormName='" + formName + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        if (string.Equals(
                            currentName,
                            formName,
                            StringComparison.Ordinal))
                        {
                            Log.Info(
                                LogPrefix + " FormName already correct for " +
                                "FormId='" + formId + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string nameKey =
                            FindKeyIgnoreCase(parameters, "FormName")
                            ?? "FormName";

                        parameters[nameKey] = formName;

                        rendering.Parameters = BuildParameters(parameters);
                        modified = true;

                        Log.Info(
                            LogPrefix + " Set FormName='" + formName +
                            "' for FormId='" + formId +
                            "' in " + fieldLabel +
                            " on '" + item.Paths.FullPath + "'.",
                            typeof(FormNameAutoPopulateHandler));
                    }
                }

                if (modified)
                {
                    string updatedXml = layout.ToXml();

                    Log.Info(
                        LogPrefix + " Writing updated XML to " +
                        fieldLabel + ", length=" + updatedXml.Length + ".",
                        typeof(FormNameAutoPopulateHandler));

                    item[fieldId] = updatedXml;
                }
                else
                {
                    Log.Info(
                        LogPrefix + " No changes made to " + fieldLabel +
                        " on '" + item.Paths.FullPath + "'.",
                        typeof(FormNameAutoPopulateHandler));
                }

                return modified;
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " Failed to update layout field '" +
                    fieldLabel + "' on '" + item.Paths.FullPath + "'.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));

                return false;
            }
        }

        /// <summary>
        /// Builds URL-style rendering parameters.
        /// </summary>
        private static string BuildParameters(
            System.Collections.Specialized.NameValueCollection parameters)
        {
            var builder = new StringBuilder();

            foreach (string key in parameters.AllKeys)
            {
                if (string.IsNullOrEmpty(key))
                {
                    continue;
                }

                if (builder.Length > 0)
                {
                    builder.Append("&");
                }

                string value = parameters[key];

                builder.Append(key);

                if (value != null)
                {
                    builder.Append("=")
                           .Append(HttpUtility.UrlEncode(value));
                }
            }

            return builder.ToString();
        }

        private static string GetParameterValue(
            System.Collections.Specialized.NameValueCollection parameters,
            string keyName)
        {
            if (parameters == null || parameters.Count == 0)
            {
                return null;
            }

            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(
                    key,
                    keyName,
                    StringComparison.OrdinalIgnoreCase))
                {
                    return parameters[key];
                }
            }

            return null;
        }

        private static string FindKeyIgnoreCase(
            System.Collections.Specialized.NameValueCollection parameters,
            string keyName)
        {
            if (parameters == null || parameters.Count == 0)
            {
                return null;
            }

            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(
                    key,
                    keyName,
                    StringComparison.OrdinalIgnoreCase))
                {
                    return key;
                }
            }

            return null;
        }

        /// <summary>
        /// Removes braces and URL-encoded braces from a form ID.
        /// </summary>
        public static string SanitizeFormId(string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
            {
                return string.Empty;
            }

            string clean = formId.Trim()
                .Replace("%7B", "")
                .Replace("%7b", "")
                .Replace("%7D", "")
                .Replace("%7d", "");

            clean = clean.Trim('{', '}', ' ', '"', '\'');

            if (clean.StartsWith(
                "7B",
                StringComparison.OrdinalIgnoreCase) &&
                clean.Length > 30)
            {
                clean = clean.Substring(2);
            }

            return clean.Trim();
        }

        /// <summary>
        /// Resolves a form name using the in-memory mapping.
        /// Add mappings here or populate FormNameCache from a trusted source.
        /// </summary>
        public static string ResolveFormName(
            Sitecore.Data.Database db,
            string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
            {
                Log.Info(
                    LogPrefix + " ResolveFormName skipped: FormId is empty.",
                    typeof(FormNameAutoPopulateHandler));
                return string.Empty;
            }

            formId = SanitizeFormId(formId);

            Log.Info(
                LogPrefix + " ResolveFormName lookup started for FormId='" +
                formId + "'.",
                typeof(FormNameAutoPopulateHandler));

            string formName;

            if (FormNameCache.TryGetValue(formId, out formName) &&
                !string.IsNullOrWhiteSpace(formName))
            {
                Log.Info(
                    LogPrefix + " Cache hit: FormId='" + formId +
                    "', FormName='" + formName + "'.",
                    typeof(FormNameAutoPopulateHandler));

                return formName;
            }

            Log.Warn(
                LogPrefix + " Cache miss: no FormName mapping for FormId='" +
                formId + "'. Database='" +
                (db == null ? "(null)" : db.Name) + "'.",
                typeof(FormNameAutoPopulateHandler));

            return string.Empty;
        }
    }
}
