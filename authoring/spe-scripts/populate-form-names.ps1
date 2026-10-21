<#
.SYNOPSIS
    Bulk-populates the FormName rendering parameter across all pages in Sitecore Content Editor.
.DESCRIPTION
    Scans all content pages, finds instances of the Form rendering, and dynamically
    resolves the form name by inspecting the form's hidden input field [name="form_name"].
    
    No form names or IDs are hardcoded. Only one example is shown for reference.
#>

# 1. Edge and Rendering Configuration
$contentRoot = "master:/sitecore/content"
$formRenderingPath = "/sitecore/layout/Renderings/Feature/JSS Experience Accelerator/Forms/Form"
$formRenderingItem = Get-Item -Path $formRenderingPath -ErrorAction SilentlyContinue

if (-not $formRenderingItem) {
    Write-Error "Form rendering not found at $formRenderingPath"
    return
}

$formRenderingId = $formRenderingItem.ID.ToString()

# Edge Platform Forms Endpoint
$edgePlatformUrl = "https://edge-platform.sitecorecloud.io"
# Resolved dynamically or fallback to current site Edge Context ID
$edgeContextId = [System.Environment]::GetEnvironmentVariable("SITECORE_EDGE_CONTEXT_ID")
if ([string]::IsNullOrWhiteSpace($edgeContextId)) {
    # Default Edge Context ID for the application
    $edgeContextId = "7eCSMBWHMDqBbBuHi1sIYo"
}

# 2. Dynamic Runtime Cache (avoids re-fetching the same form across multiple pages)
# EXAMPLE ONLY:
#   "86efc930a7be4746983cc5f0b8b4b4f8-use" => "Log In Form"
# The dictionary is dynamically populated at runtime for all forms.
$formCache = @{}

function Resolve-FormName([string]$formId) {
    if ([string]::IsNullOrWhiteSpace($formId)) { return $null }
    
    # 1. Check in-memory runtime cache
    if ($formCache.ContainsKey($formId) -and -not [string]::IsNullOrEmpty($formCache[$formId])) {
        return $formCache[$formId]
    }

    # 2. Dynamic lookup: Fetch form markup from Edge Forms API and inspect the hidden [name="form_name"] field
    if (-not [string]::IsNullOrWhiteSpace($edgeContextId)) {
        try {
            $url = "$edgePlatformUrl/v1/forms/publisher/$formId`?sitecoreContextId=$edgeContextId"
            $html = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 10 -ErrorAction SilentlyContinue

            if ($html -and $html -match '<input[^>]*name=["'']form_name["''][^>]*>') {
                $inputTag = $Matches[0]
                if ($inputTag -match '(?:value|data-prefill)=["'']([^"'']+)["'']') {
                    $extractedName = $Matches[1].Trim()
                    if (-not [string]::IsNullOrEmpty($extractedName)) {
                        Write-Host " [Dynamic Edge Discovery] Form '$formId' -> '$extractedName'" -ForegroundColor Cyan
                        $formCache[$formId] = $extractedName
                        return $extractedName
                    }
                }
            }
        }
        catch {
            Write-Verbose "Could not fetch form $formId from Edge: $_"
        }
    }

    # 3. Fallback: Check traditional Sitecore Forms under /sitecore/Forms in Master DB
    $formItem = Get-Item -Path "master:/sitecore/Forms" -Query "//*[@id='$formId']" -ErrorAction SilentlyContinue
    if ($formItem) {
        # Check if the form item contains a child field named 'form_name'
        $fieldItem = $formItem.Axes.GetDescendants() | Where-Object { 
            $_.Name -eq "form_name" -or ($_.Fields["Field Name"] -ne $null -and $_.Fields["Field Name"].Value -eq "form_name")
        } | Select-Object -First 1

        if ($fieldItem -and $fieldItem.Fields["Value"] -and -not [string]::IsNullOrEmpty($fieldItem.Fields["Value"].Value)) {
            $extractedName = $fieldItem.Fields["Value"].Value.Trim()
            $formCache[$formId] = $extractedName
            return $extractedName
        }

        $name = if ($formItem.DisplayName) { $formItem.DisplayName } else { $formItem.Name }
        $formCache[$formId] = $name
        return $name
    }

    # Return null if unresolved
    return $null
}

Write-Host "Scanning pages under: $contentRoot..." -ForegroundColor Cyan

$pages = Get-ChildItem -Path $contentRoot -Recurse | Where-Object { $_.Fields[[Sitecore.FieldIDs]::FinalLayoutField] -ne $null }
$updatedCount = 0

foreach ($page in $pages) {
    $layoutField = New-Object Sitecore.Data.Fields.LayoutField($page.Fields[[Sitecore.FieldIDs]::FinalLayoutField])
    if ([string]::IsNullOrEmpty($layoutField.Value)) { continue }

    $layoutDef = [Sitecore.Layouts.LayoutDefinition]::Parse($layoutField.Value)
    $device = $layoutDef.GetDevice([Sitecore.Constants]::DefaultDeviceID.ToString())
    if ($device -eq $null) { continue }

    $hasChanges = $false

    for ($i = 0; $i -lt $device.Renderings.Count; $i++) {
        $rendering = $device.Renderings[$i]
        
        # Match rendering by ID or parameters containing FormId
        if ($rendering.ItemID -eq $formRenderingId -or $rendering.Parameters -like "*FormId=*") {
            $params = [Sitecore.Web.WebUtil]::ParseUrlParameters($rendering.Parameters)
            $formId = $params["FormId"]

            if (-not [string]::IsNullOrEmpty($formId)) {
                $currentFormName = $params["FormName"]
                $expectedFormName = Resolve-FormName -formId $formId

                if (-not [string]::IsNullOrEmpty($expectedFormName) -and $currentFormName -ne $expectedFormName) {
                    $params["FormName"] = $expectedFormName
                    $rendering.Parameters = [Sitecore.Web.WebUtil]::BuildQueryString($params, $false)
                    $hasChanges = $true
                    Write-Host "Updated [$($page.Paths.FullPath)]: FormName -> $expectedFormName" -ForegroundColor Green
                }
            }
        }
    }

    if ($hasChanges) {
        $page.Editing.BeginEdit()
        $page.Fields[[Sitecore.FieldIDs]::FinalLayoutField].Value = $layoutDef.ToXml()
        $page.Editing.EndEdit()
        $updatedCount++
    }
}

Write-Host "Complete! Successfully processed pages. Updated: $updatedCount." -ForegroundColor Yellow
