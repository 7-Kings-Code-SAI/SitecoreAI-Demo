using System;
using System.Threading.Tasks;
using Sitecore.Configuration;
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
            Task.Run(new Action(ExecuteMigration));
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
                    TraverseAndUpdate(contentRoot, ref scannedCount, ref updatedCount);
                }

                Log.Info(string.Format("[FormNameMigration] Completed backfill! Scanned {0} items, updated {1} pages with FormName.", scannedCount, updatedCount), this);
            }
            catch (Exception ex)
            {
                Log.Error(string.Format("[FormNameMigration] Error during background FormName migration: {0}", ex.Message), ex, this);
            }
            finally
            {
                _migrationRunning = false;
            }
        }

        private void TraverseAndUpdate(Item item, ref int scannedCount, ref int updatedCount)
        {
            if (item == null) return;

            scannedCount++;

            var finalLayoutField = item.Fields[Sitecore.FieldIDs.FinalLayoutField];
            var sharedLayoutField = item.Fields[Sitecore.FieldIDs.LayoutField];

            bool needsUpdate = false;

            if ((finalLayoutField != null && !string.IsNullOrEmpty(finalLayoutField.Value) && finalLayoutField.Value.Contains("FormId")) ||
                (sharedLayoutField != null && !string.IsNullOrEmpty(sharedLayoutField.Value) && sharedLayoutField.Value.Contains("FormId")))
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

            // Recursively process children
            foreach (Item child in item.GetChildren())
            {
                TraverseAndUpdate(child, ref scannedCount, ref updatedCount);
            }
        }
    }
}
