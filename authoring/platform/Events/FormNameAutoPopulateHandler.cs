using System;
using System.Collections.Concurrent;
using System.Configuration;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Xml;
using Sitecore.Data.Events;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Events;
using Sitecore.SecurityModel;

namespace XmCloudNextJsStarter.Events
{
    public class FormNameAutoPopulateHandler
    {
        private const string LogPrefix = "[FormNameAutoPopulate]";

        private static readonly HttpClient FormsHttpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5)
        };

        private class CacheEntry
        {
            public string FormName { get; private set; }
            private long _expiresAtUtcTicks;
            private readonly long _ttlTicks;

            public CacheEntry(string formName, TimeSpan ttl)
            {
                FormName = formName;
                _ttlTicks = ttl.Ticks;
                _expiresAtUtcTicks = DateTime.UtcNow.Add(ttl).Ticks;
            }

            public bool IsExpired
            {
                get { return DateTime.UtcNow.Ticks >= Interlocked.Read(ref _expiresAtUtcTicks); }
            }

            public void Slide()
            {
                long newExpiry = DateTime.UtcNow.Ticks + _ttlTicks;
                Interlocked.Exchange(ref _expiresAtUtcTicks, newExpiry);
            }
        }

        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);

        private static readonly ConcurrentDictionary<string, CacheEntry>
            FormNameCache = new ConcurrentDictionary<string, CacheEntry>(StringComparer.OrdinalIgnoreCase);

        /// <summary>
        /// Prevents recursive save loops when OnItemSaved triggers additional item events.
        /// </summary>
        private static readonly ThreadLocal<bool> IsProcessing =
            new ThreadLocal<bool>(() => false);

        /// <summary>
        /// Clears all cached FormName resolutions (including language-specific variants).
        /// </summary>
        public static void ClearCache()
        {
            FormNameCache.Clear();
            Log.Info(LogPrefix + " FormNameCache cleared.", typeof(FormNameAutoPopulateHandler));
        }

        public void OnItemSaving(object sender, EventArgs args)
        {
            if (IsProcessing.Value)
                return;

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
            if (IsProcessing.Value)
                return;

            try
            {
                Item item = Event.ExtractParameter(args, 0) as Item;

                if (!IsEligibleItem(item))
                    return;

                bool hasFormId =
                    ContainsFormId(item[Sitecore.FieldIDs.LayoutField]) ||
                    ContainsFormId(item[Sitecore.FieldIDs.FinalLayoutField]);

                if (!hasFormId)
                    return;

                Log.Info(
                    LogPrefix + " OnItemSaved: " + item.Paths.FullPath,
                    typeof(FormNameAutoPopulateHandler));

                IsProcessing.Value = true;

                using (new EventDisabler())
                using (new SecurityDisabler())
                {
                    item.Editing.BeginEdit();

                    bool modified = false;

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
            finally
            {
                IsProcessing.Value = false;
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
                return false;
            }

            try
            {
                var doc = new XmlDocument();
                doc.LoadXml(rawXml);

                var nsmgr = new XmlNamespaceManager(doc.NameTable);
                nsmgr.AddNamespace("p", "p");
                nsmgr.AddNamespace("s", "s");

                // Target rendering elements under devices in layout XML
                XmlNodeList renderingNodes = doc.SelectNodes("//d/r", nsmgr);

                if (renderingNodes == null || renderingNodes.Count == 0)
                    return false;

                // Explicitly determine if this field is Final Layout (__Final Renderings)
                bool isFinalLayout = (fieldId == Sitecore.FieldIDs.FinalLayoutField);
                bool modified = false;

                foreach (XmlNode node in renderingNodes)
                {
                    if (node.Attributes == null)
                        continue;

                    XmlAttribute parAttr = node.Attributes["s:par"] ?? node.Attributes["par"];
                    string currentParameters = parAttr != null ? parAttr.Value : string.Empty;

                    // Extract FormId from parameters or from direct node attribute if present
                    string rawFormId = ExtractParameter(currentParameters, "FormId");

                    if (string.IsNullOrWhiteSpace(rawFormId) && node.Attributes["FormId"] != null)
                    {
                        rawFormId = node.Attributes["FormId"].Value;
                    }

                    if (string.IsNullOrWhiteSpace(rawFormId))
                        continue;

                    string formId = SanitizeFormId(rawFormId);

                    if (string.IsNullOrWhiteSpace(formId))
                        continue;

                    string language = item.Language != null ? item.Language.Name : null;
                    string formName = ResolveFormName(formId, language);

                    // If API failed or form_name could not be found, DO NOT clear or overwrite
                    // any existing valid FormName parameter.
                    if (string.IsNullOrWhiteSpace(formName))
                    {
                        Log.Warn(
                            LogPrefix + " Could not resolve FormName for FormId='" +
                            formId + "' in " + fieldLabel +
                            " on '" + item.Paths.FullPath + "'. Existing parameters preserved.",
                            typeof(FormNameAutoPopulateHandler));
                        continue;
                    }

                    string currentName = ExtractParameter(currentParameters, "FormName");

                    // If parameter already matches the resolved FormName, skip to avoid unnecessary writes
                    if (string.Equals(
                        currentName,
                        formName,
                        StringComparison.Ordinal))
                        continue;

                    // If parameter attribute was absent on this rendering, create the correct attribute:
                    // s:par for Final Layout delta, par for Shared Layout
                    if (parAttr == null)
                    {
                        if (isFinalLayout)
                        {
                            // Ensure xmlns:s is in scope on the node or its ancestors
                            string inScopeUri = node.GetNamespaceOfPrefix("s");
                            if (!string.Equals(inScopeUri, "s", StringComparison.Ordinal))
                            {
                                if (doc.DocumentElement != null && doc.DocumentElement.Attributes["xmlns:s"] == null)
                                {
                                    XmlAttribute nsAttr = doc.CreateAttribute("xmlns:s");
                                    nsAttr.Value = "s";
                                    doc.DocumentElement.Attributes.Append(nsAttr);
                                }
                            }
                            parAttr = doc.CreateAttribute("s", "par", "s");
                        }
                        else
                        {
                            parAttr = doc.CreateAttribute("par");
                        }
                        node.Attributes.Append(parAttr);
                    }

                    // Non-destructively update or append FormName in-place,
                    // normalizing duplicate keys and handling whitespace cleanly.
                    string updatedParameters = UpdateFormNameParameter(currentParameters, formName);

                    if (!string.Equals(parAttr.Value, updatedParameters, StringComparison.Ordinal))
                    {
                        parAttr.Value = updatedParameters;
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
                    // Write back the preserved XML document to the layout field
                    item[fieldId] = doc.OuterXml;
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

        public static string ResolveFormName(string formId, string language = null)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return null;

            formId = formId.Trim();

            // 1. web.config appSettings
            string contextId = ConfigurationManager.AppSettings["SitecoreFormsContextId"];

            // 2. Environment variable fallback (XM Cloud container / local dev)
            if (string.IsNullOrWhiteSpace(contextId))
            {
                contextId = Environment.GetEnvironmentVariable("SITECORE_FORMS_CONTEXT_ID");
            }

            // 3. Sitecore settings fallback (<settings><setting name="SitecoreFormsContextId" ... />)
            if (string.IsNullOrWhiteSpace(contextId))
            {
                contextId = Sitecore.Configuration.Settings.GetSetting("SitecoreFormsContextId");
            }

            if (string.IsNullOrWhiteSpace(contextId))
            {
                Log.Error(
                    LogPrefix + " SitecoreFormsContextId is not configured in AppSettings, " +
                    "environment variable (SITECORE_FORMS_CONTEXT_ID), or Sitecore settings.",
                    typeof(FormNameAutoPopulateHandler));

                return null;
            }

            string cleanContextId = contextId.Trim();

            // Ignore placeholder or unresolved token values
            if (cleanContextId.StartsWith("$(") || cleanContextId.Equals("YOUR_SITECORE_CONTEXT_ID", StringComparison.OrdinalIgnoreCase))
            {
                Log.Error(
                    LogPrefix + " SitecoreFormsContextId contains a placeholder value and is not configured.",
                    typeof(FormNameAutoPopulateHandler));
                return null;
            }

            string cacheKey =
                cleanContextId + "|" +
                formId + "|" +
                (language ?? string.Empty);

            CacheEntry cached;
            if (FormNameCache.TryGetValue(cacheKey, out cached) && !cached.IsExpired)
            {
                cached.Slide(); // True sliding expiration on access
                return cached.FormName;
            }

            try
            {
                string url =
                    "https://edge-platform.sitecorecloud.io/v1/forms/publisher/" +
                    Uri.EscapeDataString(formId) +
                    "?sitecoreContextId=" +
                    Uri.EscapeDataString(cleanContextId);

                if (!string.IsNullOrWhiteSpace(language))
                {
                    url += "&language=" + Uri.EscapeDataString(language.Trim());
                }

                using (HttpResponseMessage response =
                    FormsHttpClient.GetAsync(url).GetAwaiter().GetResult())
                {
                    if (!response.IsSuccessStatusCode)
                    {
                        Log.Warn(
                            LogPrefix + " Forms API returned " +
                            (int)response.StatusCode + " for FormId '" + formId + "'.",
                            typeof(FormNameAutoPopulateHandler));

                        return null;
                    }

                    string content =
                        response.Content.ReadAsStringAsync().GetAwaiter().GetResult();

                    string formName = ExtractFormName(content);

                    if (!string.IsNullOrWhiteSpace(formName))
                    {
                        FormNameCache[cacheKey] = new CacheEntry(formName, CacheDuration);
                        return formName;
                    }

                    Log.Warn(
                        LogPrefix + " Hidden form_name field was not found in response for FormId '" + formId + "'.",
                        typeof(FormNameAutoPopulateHandler));

                    return null;
                }
            }
            catch (Exception ex)
            {
                Log.Error(
                    LogPrefix + " Failed to resolve FormName for FormId '" + formId + "'.",
                    ex,
                    typeof(FormNameAutoPopulateHandler));

                return null;
            }
        }

        /// <summary>
        /// Backward-compatible overload for existing callers.
        /// </summary>
        public static string ResolveFormName(Sitecore.Data.Database db, string formId)
        {
            return ResolveFormName(formId, null);
        }

        public static string ExtractFormName(string responseContent)
        {
            if (string.IsNullOrWhiteSpace(responseContent))
                return null;

            string trimmed = responseContent.TrimStart();

            // Check if response is structured JSON
            if (trimmed.StartsWith("{") || trimmed.StartsWith("["))
            {
                try
                {
                    using (JsonDocument document = JsonDocument.Parse(responseContent))
                    {
                        string fromJson = ExtractFromJson(document.RootElement);
                        if (!string.IsNullOrWhiteSpace(fromJson))
                            return fromJson;
                    }
                }
                catch (JsonException)
                {
                    // Continue by evaluating content as raw HTML
                }
            }

            // Direct HTML markup
            return ExtractFromHtml(responseContent);
        }

        private static string ExtractFromJson(JsonElement element)
        {
            if (element.ValueKind != JsonValueKind.Object)
                return null;

            // 1. Check for embedded markup string properties first ("html", "markup", "content")
            JsonElement htmlProp;
            if (element.TryGetProperty("html", out htmlProp) &&
                htmlProp.ValueKind == JsonValueKind.String)
            {
                string fromHtml = ExtractFromHtml(htmlProp.GetString());
                if (!string.IsNullOrWhiteSpace(fromHtml))
                    return fromHtml;
            }

            JsonElement markupProp;
            if (element.TryGetProperty("markup", out markupProp) &&
                markupProp.ValueKind == JsonValueKind.String)
            {
                string fromMarkup = ExtractFromHtml(markupProp.GetString());
                if (!string.IsNullOrWhiteSpace(fromMarkup))
                    return fromMarkup;
            }

            // 2. Direct property on form definition: "form_name": "Contact Us" or "formName": "..."
            JsonElement fnProp;
            if (element.TryGetProperty("form_name", out fnProp) &&
                fnProp.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(fnProp.GetString()))
            {
                return WebUtility.HtmlDecode(fnProp.GetString().Trim());
            }

            JsonElement fnCamel;
            if (element.TryGetProperty("formName", out fnCamel) &&
                fnCamel.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(fnCamel.GetString()))
            {
                return WebUtility.HtmlDecode(fnCamel.GetString().Trim());
            }

            // 3. Inspect form "fields" array (standard Sitecore Cloud Forms schema)
            JsonElement fieldsProp;
            if (element.TryGetProperty("fields", out fieldsProp) &&
                fieldsProp.ValueKind == JsonValueKind.Array)
            {
                foreach (JsonElement field in fieldsProp.EnumerateArray())
                {
                    if (field.ValueKind != JsonValueKind.Object)
                        continue;

                    JsonElement fName;
                    if (field.TryGetProperty("name", out fName) &&
                        fName.ValueKind == JsonValueKind.String &&
                        string.Equals(fName.GetString(), "form_name", StringComparison.OrdinalIgnoreCase))
                    {
                        JsonElement fVal;
                        if (field.TryGetProperty("value", out fVal) &&
                            fVal.ValueKind == JsonValueKind.String &&
                            !string.IsNullOrWhiteSpace(fVal.GetString()))
                        {
                            return WebUtility.HtmlDecode(fVal.GetString().Trim());
                        }

                        JsonElement fDef;
                        if (field.TryGetProperty("defaultValue", out fDef) &&
                            fDef.ValueKind == JsonValueKind.String &&
                            !string.IsNullOrWhiteSpace(fDef.GetString()))
                        {
                            return WebUtility.HtmlDecode(fDef.GetString().Trim());
                        }
                    }
                }
            }

            return null;
        }

        private static string ExtractFromHtml(string html)
        {
            if (string.IsNullOrWhiteSpace(html))
                return null;

            foreach (Match match in Regex.Matches(
                html,
                @"<input\b[^>]*>",
                RegexOptions.IgnoreCase | RegexOptions.Singleline))
            {
                string input = match.Value;

                string type = GetHtmlAttribute(input, "type");
                string name = GetHtmlAttribute(input, "name");
                string id = GetHtmlAttribute(input, "id");
                string value = GetHtmlAttribute(input, "value");

                bool isHidden = string.Equals(
                    type, "hidden", StringComparison.OrdinalIgnoreCase);

                bool isFormName =
                    string.Equals(name, "form_name", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(id, "form_name", StringComparison.OrdinalIgnoreCase);

                if (isHidden && isFormName && !string.IsNullOrWhiteSpace(value))
                    return WebUtility.HtmlDecode(value).Trim();
            }

            return null;
        }

        private static string GetHtmlAttribute(string htmlTag, string attributeName)
        {
            Match match = Regex.Match(
                htmlTag,
                @"(?:^|\s)" + Regex.Escape(attributeName) +
                @"\s*=\s*(?:""([^""]*)""|'([^']*)'|([^\s>]+))",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);

            if (!match.Success)
                return null;

            for (int i = 1; i <= 3; i++)
            {
                if (match.Groups[i].Success)
                    return match.Groups[i].Value;
            }

            return null;
        }

        private static string ExtractParameter(string rawParameters, string key)
        {
            if (string.IsNullOrEmpty(rawParameters))
                return null;

            Match match = Regex.Match(
                rawParameters,
                @"(?:^|&)\s*" + Regex.Escape(key) + @"\s*=\s*([^&]*)",
                RegexOptions.IgnoreCase);

            if (match.Success)
            {
                return WebUtility.UrlDecode(match.Groups[1].Value.Trim());
            }

            return null;
        }

        private static string UpdateFormNameParameter(string rawParameters, string formName)
        {
            string encodedFormName = WebUtility.UrlEncode(formName);

            if (string.IsNullOrWhiteSpace(rawParameters))
            {
                return "FormName=" + encodedFormName;
            }

            // Remove all existing FormName parameters (case-insensitive, handling duplicates, whitespace, bare keys)
            string cleaned = Regex.Replace(
                rawParameters,
                @"(^|&)\s*FormName\s*(?:=[^&]*)?",
                "",
                RegexOptions.IgnoreCase);

            cleaned = cleaned.Trim('&');

            if (string.IsNullOrEmpty(cleaned))
            {
                return "FormName=" + encodedFormName;
            }

            return cleaned + "&FormName=" + encodedFormName;
        }

        public static string SanitizeFormId(string formId)
        {
            if (string.IsNullOrWhiteSpace(formId))
                return string.Empty;

            string clean = WebUtility.UrlDecode(formId.Trim());

            return clean.Trim().Trim('{', '}', '"', '\'', ' ');
        }
    }
}