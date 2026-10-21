using System;
using System.Threading.Tasks;
using Sitecore.Configuration;
using Sitecore.Data.Fields;
using Sitecore.Data.Items;
using Sitecore.Diagnostics;
using Sitecore.Pipelines;
using Sitecore.SecurityModel;
using XmCloudNextJsStarter.Events;

namespace XmCloudNextJsStarter.Pipelines
{
    /// <summary>
    /// Sitecore initialize pipeline processor.
    /// Runs a background task on CM startup to automatically backfill FormName on all existing pages
    /// without requiring any manual PowerShell execution.
    /// </summary>
    public class InitializeFormNameMigration
    {
        private static bool _migrationRunning = false;

        public void Process(PipelineArgs args)
        {
            // Launch asynchronously so CM startup is completely uninterrupted
            Task.Run(() => ExecuteMigration());
        }

        private void ExecuteMigration()
        {
            if (_migrationRunning)
                return;

            _migrationRunning = true;

            try
            {
                // Allow Sitecore databases and caches to initialize before querying
                Task.Delay(15000).Wait();

                var masterDb = Factory.GetDatabase("master");
                if (masterDb == null)
                {
                    Log.Warn("[FormNameMigration] Master database not available. Skipping automatic backfill.", this);
                    return;
                }

                var contentRoot = masterDb.GetItem("/sitecore/content");
                if (contentRoot == null)
                {
                    Log.Warn("[FormNameMigration] Root /sitecore/content not found.", this);
                    return;
                }

                Log.Info("[FormNameMigration] Starting background backfill for existing pages...", this);

                int scannedCount = 0;
                int updatedCount = 0;

                using (new SecurityDisabler())
                {
                    var items = contentRoot.Axes.GetDescendants();
                    foreach (var item in items)
                    {
                        scannedCount++;

                        var finalLayoutField = item.Fields[Sitecore.FieldIDs.FinalLayoutField];
                        var sharedLayoutField = item.Fields[Sitecore.FieldIDs.LayoutField];

                        bool needsUpdate = false;

                        // Check if item contains FormId
                        if ((finalLayoutField != null && finalLayoutField.Value.Contains("FormId")) ||
                            (sharedLayoutField != null && sharedLayoutField.Value.Contains("FormId")))
                        {
                            item.Editing.BeginEdit();
                            try
                            {
                                bool finalUpdated = FormNameAutoPopulateHandler.SyncFormNameInLayout(item, Sitecore.FieldIDs.FinalLayoutField);
                                bool sharedUpdated = FormNameAutoPopulateHandler.SyncFormNameInLayout(item, Sitecore.FieldIDs.LayoutField);

                                if (finalUpdated || sharedUpdated)
                                {
                                    needsUpdate = true;
                                    updatedCount++;
                                }
                            }
                            finally
                            {
                                if (needsUpdate)
                                {
                                    item.Editing.EndEdit();
                                }
                                else
                                {
                                    item.Editing.CancelEdit();
                                }
                            }
                        }
                    }
                }

                Log.Info($"[FormNameMigration] Completed backfill! Scanned {scannedCount} items, updated {updatedCount} pages with FormName.", this);
            }
            catch (Exception ex)
            {
                Log.Error($"[FormNameMigration] Error during background FormName migration: {ex.Message}", ex, this);
            }
            finally
            {
                _migrationRunning = false;
            }
        }
    }
}
