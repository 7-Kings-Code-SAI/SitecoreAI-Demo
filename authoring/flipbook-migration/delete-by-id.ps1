param(
    [Parameter(Mandatory=$true)]
    [string]$CMUrl,
    [Parameter(Mandatory=$true)]
    [string]$ApiKey
)

$ErrorActionPreference = "Continue"

# Use item IDs directly instead of paths
$itemsToDelete = @(
    @{ Id = "87DF459A-B428-4875-B0F3-464B300209AD"; Path = "/sitecore/templates/Project/ai-sales-agent/Page Content/Flipbook" },
    @{ Id = "494BD64E-2BDF-4564-92AA-7FA9C39ED041"; Path = "/sitecore/layout/Renderings/Project/ai-sales-agent/Page Content/Flipbook" },
    @{ Id = "D16C8A7B-F9A0-4316-AF94-46E4495AC5FA"; Path = "/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks" },
    @{ Id = "268B6DAA-3C2D-4566-B799-1F3585449A7A"; Path = "/sitecore/content/ai-sales-agent/ai-sales-agent/Home/Data/Flipbook" },
    @{ Id = "86A16550-37A1-4CA6-95F5-7C1B1618AA66"; Path = "/sitecore/content/ai-sales-agent/ai-sales-agent/Settings/Flipbook" },
    @{ Id = "7E67AFBA-8B30-4A66-A48C-70769B5F68F6"; Path = "/sitecore/content/ai-sales-agent/ai-sales-agent/Presentation/Available Renderings/Flipbook" }
)

Write-Host "Deleting Flipbook items..."

foreach ($item in $itemsToDelete) {
    Write-Host "Processing: $($item.Path)"
    Write-Host "  ID: $($item.Id)"
    
    try {
        $deleteUrl = "$CMUrl/sitecore/api/ssc/item/$($item.Id)?database=master"
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
    }
    catch {
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Done."