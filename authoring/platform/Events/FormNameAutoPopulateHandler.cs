
using System;
using System.Collections.Concurrent;
using System.Collections.Specialized;
using System.Text;
using System.Web;
using Sitecore.Data.Events;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Events;
using Sitecore.Layouts;
using Sitecore.SecurityModel;
using Sitecore.Web;

namespace XmCloudNextJsStarter.Events
{
    public class FormNameAutoPopulateHandler
    {
        private const string LogPrefix = "[FormNameAutoPopulate]";

        public static readonly ConcurrentDictionary<string, string>
            FormNameCache = CreateInitialCache();

        private static ConcurrentDictionary<string, string> CreateInitialCache()
        {
            var cache = new ConcurrentDictionary<string, string>(
                StringComparer.OrdinalIgnoreCase);

            cache["86efc930a7be4746983cc5f0b8b4b4f8-use"] =
                "Log In Form";

            return cache;
        }

        public void OnItemSaving(object sender, EventArgs args)
        {
            try
            {
                Item item = Event.ExtractParameter(args, 0) as Item;

                if (!IsEligibleItem(item))
                    return;

                Log.Info(
                    LogPrefix + " OnItemSaving: " + item.Paths.FullPath,
                    typeof(FormNameAutoPopulateHandler));

                SyncAllLayouts(item);
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " Error in OnItemSaving.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));
            }
        }

        public void OnItemSaved(object sender, EventArgs args)
        {
            try
            {
                Item item = Event.ExtractParameter(args, 0) as Item;

                if (!IsEligibleItem(item))
                    return;

                Log.Info(
                    LogPrefix + " OnItemSaved: " + item.Paths.FullPath,
                    typeof(FormNameAutoPopulateHandler));

                bool hasFormId =
                    ContainsFormId(item[Sitecore.FieldIDs.LayoutField]) ||
                    ContainsFormId(item[Sitecore.FieldIDs.FinalLayoutField]);

                if (!hasFormId)
                    return;

                using (new EventDisabler())
                using (new SecurityDisabler())
                {
                    item.Editing.BeginEdit();

                    bool modified;

                    try
                    {
                        modified = SyncAllLayouts(item);
                    }
                    catch
                    {
                        item.Editing.CancelEdit();
                        throw;
                    }

                    if (modified)
                    {
                        item.Editing.EndEdit();

                        Log.Info(
                            LogPrefix + " Post-save update committed: " +
                            item.Paths.FullPath,
                            typeof(FormNameAutoPopulateHandler));
                    }
                    else
                    {
                        item.Editing.CancelEdit();
                    }
                }
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " Error in OnItemSaved.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));
            }
        }

        private static bool IsEligibleItem(Item item)
        {
            if (item == null || item.Database == null)
                return false;

            if (!string.Equals(
                item.Database.Name,
                "master",
                StringComparison.OrdinalIgnoreCase))
                return false;

            return item.Paths.FullPath.StartsWith(
                "/sitecore/content/",
                StringComparison.OrdinalIgnoreCase);
        }

        public static bool SyncAllLayouts(Item item)
        {
            if (!IsEligibleItem(item))
                return false;

            bool sharedModified = UpdateLayoutField(
                item,
                Sitecore.FieldIDs.LayoutField,
                "SharedLayout");

            bool finalModified = UpdateLayoutField(
                item,
                Sitecore.FieldIDs.FinalLayoutField,
                "FinalLayout");

            return sharedModified || finalModified;
        }

        private static bool ContainsFormId(string xml)
        {
            return !string.IsNullOrWhiteSpace(xml) &&
                   xml.IndexOf(
                       "FormId",
                       StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static bool UpdateLayoutField(
            Item item,
            Sitecore.Data.ID fieldId,
            string fieldLabel)
        {
            string rawXml = item[fieldId];

            if (!ContainsFormId(rawXml))
            {
                Log.Info(
                    LogPrefix + " " + fieldLabel +
                    ": no FormId parameter in raw layout XML.",
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }

            try
            {
                LayoutDefinition layout = LayoutDefinition.Parse(rawXml);

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

                        NameValueCollection parameters =
                            WebUtil.ParseUrlParameters(
                                rendering.Parameters ?? string.Empty);

                        string rawFormId =
                            GetParameterValue(parameters, "FormId");

                        if (string.IsNullOrWhiteSpace(rawFormId))
                            continue;

                        string formId = SanitizeFormId(rawFormId);

                        if (string.IsNullOrWhiteSpace(formId))
                            continue;

                        string formName = ResolveFormName(
                            item.Database, formId);

                        if (string.IsNullOrWhiteSpace(formName))
                        {
                            Log.Warn(
                                LogPrefix + " No mapping found for FormId='" +
                                formId + "' in " + fieldLabel +
                                " on '" + item.Paths.FullPath + "'.",
                                typeof(FormNameAutoPopulateHandler));
                            continue;
                        }

                        string currentName =
                            GetParameterValue(parameters, "FormName");

                        if (string.Equals(
                            currentName,
                            formName,
                            StringComparison.Ordinal))
                            continue;

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
                    // Write back only to the same raw field being processed.
                    item[fieldId] = layout.ToXml();
                }

                return modified;
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " Failed processing " + fieldLabel +
                    " on '" + item.Paths.FullPath + "'.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));
                return false;
            }
        }

        private static string BuildParameters(
            NameValueCollection parameters)
        {
            var builder = new StringBuilder();

            foreach (string key in parameters.AllKeys)
            {
                if (string.IsNullOrEmpty(key))
                    continue;

                if (builder.Length > 0)
                    builder.Append("&");

                builder.Append(HttpUtility.UrlEncode(key));

                string value = parameters[key];

                if (value != null)
                {
                    builder.Append("=")
                           .Append(HttpUtility.UrlEncode(value));
                }
            }

            return builder.ToString();
        }

        private static string GetParameterValue(
            NameValueCollection parameters,
            string keyName)
        {
            if (parameters == null)
                return null;

            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(
                    key,
                    keyName,
                    StringComparison.OrdinalIgnoreCase))
                    return parameters[key];
            }

            return null;
        }

        private static string FindKeyIgnoreCase(
            NameValueCollection parameters,
            string keyName)
        {
            if (parameters == null)
                return null;

            foreach (string key in parameters.AllKeys)
            {
                if (string.Equals(
                    key,
                    keyName,
                    StringComparison.OrdinalIgnoreCase))
                    return key;
            }

            return null;
        }

        public static string SanitizeFormId(string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            string clean = HttpUtility.UrlDecode(formId.Trim());

            return clean.Trim().Trim('{', '}', '"', '\'', ' ');
        }

        public static string ResolveFormName(
            Sitecore.Data.Database db,
            string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            string name;

            if (FormNameCache.TryGetValue(
                SanitizeFormId(formId), out name))
                return name ?? string.Empty;

            Log.Warn(
                LogPrefix + " No FormName mapping for FormId='" +
                formId + "', database='" +
                (db == null ? "(null)" : db.Name) + "'.",
                typeof(FormNameAutoPopulateHandler));

            return string.Empty;
        }
    }
}
