<#
.SYNOPSIS
    Bulk-populates the FormName rendering parameter across all pages in Sitecore Content Editor.
.DESCRIPTION
    Scans all content pages, finds instances of the Form rendering, and dynamically
    resolves the form name by inspecting the form's hidden input field [name="form_name"].
    Updates both Shared Layout (__Renderings) and Final Layout (__Final Renderings).
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
$edgeContextId = [System.Environment]::GetEnvironmentVariable("SITECORE_EDGE_CONTEXT_ID")
if ([string]::IsNullOrWhiteSpace($edgeContextId)) {
    $edgeContextId = "7eCSMBWHMDqBbBuHi1sIYo"
}

# 2. Dynamic Runtime Cache
$formCache = @{}

function Sanitize-FormId([string]$id) {
    if ([string]::IsNullOrWhiteSpace($id)) { return $null }
    $clean = $id.Trim('{', '}', ' ', '"', "'").Replace('%7B','').Replace('%7b','').Replace('%7D','').Replace('%7d','')
    if ($clean.StartsWith("7B", [System.StringComparison]::OrdinalIgnoreCase) -and $clean.Length -gt 30) {
        $clean = $clean.Substring(2)
    }
    return $clean.Trim()
}

function Resolve-FormName([string]$formId) {
    $formId = Sanitize-FormId -id $formId
    if ([string]::IsNullOrWhiteSpace($formId)) { return $null }
    
    if ($formCache.ContainsKey($formId) -and -not [string]::IsNullOrEmpty($formCache[$formId])) {
        return $formCache[$formId]
    }

    # Dynamic lookup: Fetch form markup from Edge Forms API and inspect the hidden [name="form_name"] field
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

    # Fallback: Check traditional Sitecore Forms under /sitecore/Forms in Master DB
    $formItem = Get-Item -Path "master:/sitecore/Forms" -Query "//*[@id='$formId']" -ErrorAction SilentlyContinue
    if ($formItem) {
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

    return $null
}

function Update-LayoutDefinition([Item]$item, [Sitecore.Data.ID]$fieldId) {
    $field = $item.Fields[$fieldId]
    if ($field -eq $null -or [string]::IsNullOrEmpty($field.Value) -or $field.Value -notlike "*FormId*") {
        return $false
    }

    $layoutDef = [Sitecore.Layouts.LayoutDefinition]::Parse($field.Value)
    $device = $layoutDef.GetDevice([Sitecore.Constants]::DefaultDeviceID.ToString())
    if ($device -eq $null) { return $false }

    $modified = $false

    for ($i = 0; $i -lt $device.Renderings.Count; $i++) {
        $rendering = $device.Renderings[$i]
        
        if ($rendering.ItemID -eq $formRenderingId -or $rendering.Parameters -like "*FormId=*") {
            $params = [Sitecore.Web.WebUtil]::ParseUrlParameters($rendering.Parameters)
            $formId = $params["FormId"]

            if (-not [string]::IsNullOrEmpty($formId)) {
                $currentFormName = $params["FormName"]
                $expectedFormName = Resolve-FormName -formId $formId

                if (-not [string]::IsNullOrEmpty($expectedFormName) -and $currentFormName -ne $expectedFormName) {
                    $params["FormName"] = $expectedFormName
                    $rendering.Parameters = [Sitecore.Web.WebUtil]::BuildQueryString($params, $false)
                    $modified = $true
                    Write-Host "Updated [$($item.Paths.FullPath)] ($($field.Name)): FormName -> $expectedFormName" -ForegroundColor Green
                }
            }
        }
    }

    if ($modified) {
        $field.Value = $layoutDef.ToXml()
    }

    return $modified
}

Write-Host "Scanning pages under: $contentRoot..." -ForegroundColor Cyan

$pages = Get-ChildItem -Path $contentRoot -Recurse | Where-Object { 
    ($_.Fields[[Sitecore.FieldIDs]::FinalLayoutField] -ne $null -and $_.Fields[[Sitecore.FieldIDs]::FinalLayoutField].Value -like "*FormId*") -or
    ($_.Fields[[Sitecore.FieldIDs]::LayoutField] -ne $null -and $_.Fields[[Sitecore.FieldIDs]::LayoutField].Value -like "*FormId*")
}

$updatedCount = 0

foreach ($page in $pages) {
    $page.Editing.BeginEdit()
    try {
        $finalUpdated = Update-LayoutDefinition -item $page -fieldId [Sitecore.FieldIDs]::FinalLayoutField
        $sharedUpdated = Update-LayoutDefinition -item $page -fieldId [Sitecore.FieldIDs]::LayoutField

        if ($finalUpdated -or $sharedUpdated) {
            $page.Editing.EndEdit()
            $updatedCount++
        } else {
            $page.Editing.CancelEdit()
        }
    }
    catch {
        $page.Editing.CancelEdit()
        Write-Error "Failed to update $($page.Paths.FullPath): $_"
    }
}

Write-Host "Complete! Successfully updated $updatedCount pages." -ForegroundColor Yellow
