# Delete Flipbook items via Sitecore Management Services
# Run with: .\delete-flipbook.ps1 -CMUrl "https://your-cm.sitecorecloud.io" -ApiKey "your-api-key"

param(
    [Parameter(Mandatory=$true)]
    [string]$CMUrl,
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Stop"

# Flipbook item paths to delete
$itemsToDelete = @(
    "/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/layout/Renderings/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Settings/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Home/Data/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Presentation/Available Renderings/Flipbook"
)

$headers = @{
    "X-Scitemanagerapi-ApiKey" = $ApiKey
    "Content-Type" = "application/json"
}

Write-Host "Connecting to Sitecore at $CMUrl..."

foreach ($itemPath in $itemsToDelete) {
    Write-Host "Deleting: $itemPath"
    
    try {
        $response = Invoke-RestMethod -Uri "$CMUrl/sitecore/api/ssc/item/$([System.Web.HttpUtility]::UrlEncode($itemPath))" `
            -Method DELETE `
            -Headers $headers `
            -TimeoutSec 30
        
        if ($response.Success -eq $true) {
            Write-Host "  ✓ Deleted successfully" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Failed: $($response.Message)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "  ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Deletion complete."