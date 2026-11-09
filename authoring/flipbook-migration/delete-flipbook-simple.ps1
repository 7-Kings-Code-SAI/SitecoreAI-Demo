# Delete Flipbook items using Sitecore Item Service
# Run: .\delete-flipbook-simple.ps1 -CMUrl "https://your-cm.sitecorecloud.io" -ApiKey "YOUR_API_KEY"

param(
    [Parameter(Mandatory=$true)]
    [string]$CMUrl,
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Stop"

# Item paths to delete (just the parent folders)
$itemsToDelete = @(
    "/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/layout/Renderings/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Settings/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Home/Data/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Presentation/Available Renderings/Flipbook"
)

Write-Host "Connecting to Sitecore at $CMUrl..."

foreach ($itemPath in $itemsToDelete) {
    Write-Host "`nDeleting: $itemPath"
    
    try {
        # First get the item to check if it exists
        $getUrl = "$CMUrl/sitecore/api/ssc/item/$([System.Web.HttpUtility]::UrlEncode($itemPath))?database=master"
        $getHeaders = @{ "X-Scitemanagerapi-ApiKey" = $ApiKey }
        
        $item = Invoke-RestMethod -Uri $getUrl -Method GET -Headers $getHeaders -TimeoutSec 30
        
        if ($item -and $item.ID) {
            Write-Host "  Found item: $($item.DisplayName)"
            
            # Delete the item
            $deleteUrl = "$CMUrl/sitecore/api/ssc/item/$($item.ID)?database=master"
            $deleteHeaders = @{ 
                "X-Scitemanagerapi-ApiKey" = $ApiKey
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers $deleteHeaders -TimeoutSec 30
            
            if ($response.Success) {
                Write-Host "  ✓ Deleted successfully" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Failed: $($response.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  ✗ Item not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Deletion complete."