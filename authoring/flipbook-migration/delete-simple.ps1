param(
    [Parameter(Mandatory=$true)]
    [string]$CMUrl,
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Continue"

$itemsToDelete = @(
    "/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/layout/Renderings/Project/ai-sales-agent/Page Content/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Settings/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Home/Data/Flipbook",
    "/sitecore/content/ai-sales-agent/ai-sales-agent/Presentation/Available Renderings/Flipbook"
)

Write-Host "Deleting Flipbook items..."

foreach ($itemPath in $itemsToDelete) {
    Write-Host "Processing: $itemPath"
    
    try {
        $encodedPath = [System.Web.HttpUtility]::UrlEncode($itemPath)
        $getUrl = "$CMUrl/sitecore/api/ssc/item/$encodedPath?database=master"
        $getHeaders = @{ "X-Scitemanagerapi-ApiKey" = $ApiKey }
        
        $item = Invoke-RestMethod -Uri $getUrl -Method GET -Headers $getHeaders -TimeoutSec 30
        
        if ($item -and $item.ID) {
            Write-Host "  Found: $($item.DisplayName)"
            
            $deleteUrl = "$CMUrl/sitecore/api/ssc/item/$($item.ID)?database=master"
            $deleteHeaders = @{ 
                "X-Scitemanagerapi-ApiKey" = $ApiKey
                "Content-Type" = "application/json"
            }
            
            $response = Invoke-RestMethod -Uri $deleteUrl -Method DELETE -Headers $deleteHeaders -TimeoutSec 30
            
            if ($response.Success) {
                Write-Host "  Deleted successfully" -ForegroundColor Green
            } else {
                Write-Host "  Failed: $($response.Message)" -ForegroundColor Red
            }
        } else {
            Write-Host "  Not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Done."