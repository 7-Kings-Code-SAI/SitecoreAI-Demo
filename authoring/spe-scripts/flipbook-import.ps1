<#
.SYNOPSIS
    Imports a flipbook-manifest.json (produced by extract-flipbook.mjs)
    into Sitecore content items.

.DESCRIPTION
    Creates, under a chosen parent item:
      - One "Flipbook" datasource item (template created by flipbook-setup.ps1)
      - Child "Flipbook Page" items (one per manifest page)
      - Child "Flipbook Hotspot" items under each page
      - Child "Flipbook TOC Entry" items

    Page images must already exist in the Media Library — the script links
    them by media path stored in each page's `image`/`thumb` fields.
    Before running, update $MediaRoot to your media folder and ensure the
    manifest's image filenames match files in that folder.

    Prerequisites: run flipbook-setup.ps1 first.
#>

$ErrorActionPreference = 'Stop'

# ------------------------------------------------------------- config
$ManifestPath = 'C:\path\to\flipbook-manifest.json'   # <-- UPDATE
$ParentPath   = '/sitecore/content/ai-sales-agent/ai-sales-agent/Data/Flipbooks/Workwear Flipbook'  # <-- UPDATE
$MediaRoot    = '/sitecore/media library/Project/ai-sales-agent/Flipbook'                          # <-- UPDATE
$SiteName     = 'ai-sales-agent'

$FLIPBOOK_TPL_PATH  = "/sitecore/templates/Project/$SiteName/Page Content/Flipbook/Flipbook"
$PAGE_TPL_PATH      = "/sitecore/templates/Project/$SiteName/Page Content/Flipbook/Flipbook Page"
$HOTSPOT_TPL_PATH   = "/sitecore/templates/Project/$SiteName/Page Content/Flipbook/Flipbook Hotspot"
$TOC_TPL_PATH       = "/sitecore/templates/Project/$SiteName/Page Content/Flipbook/Flipbook TOC Entry"

if (-not (Test-Path $ManifestPath)) { throw "Manifest not found: $ManifestPath" }
$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json

function Get-TemplateId($path) { (Get-Item $path).ID }

$flipbookTplId = Get-TemplateId $FLIPBOOK_TPL_PATH
$pageTplId     = Get-TemplateId $PAGE_TPL_PATH
$hotspotTplId  = Get-TemplateId $HOTSPOT_TPL_PATH
$tocTplId      = Get-TemplateId $TOC_TPL_PATH

# ------------------------------------------------------------- helpers
function Get-OrCreateItem($parentPath, $name, $templateId) {
    $item = Get-Item -Path (Join-Path $parentPath $name) -ErrorAction SilentlyContinue
    if ($item) { return $item }
    return New-Item -Path $parentPath -Name $name -TemplateId $templateId
}

function Set-Field($item, $fieldName, $value) {
    if ($null -eq $value -or "$value" -eq '') { return }
    $item.Editing.BeginEdit()
    try { $item[$fieldName] = "$value"; $item.Editing.EndEdit() }
    catch { $item.Editing.CancelEdit(); throw }
}

function Find-MediaItem($mediaRoot, $fileName) {
    if (-not $fileName) { return $null }
    $leaf = Split-Path $fileName -Leaf
    $hits = Get-ChildItem -Path $mediaRoot -Recurse -Filter $leaf -ErrorAction SilentlyContinue |
            Where-Object { $_.TemplateName -match 'Jpeg|Png|WebP|Image|File' -or $_.Paths.Path -match 'media library' } |
            Select-Object -First 1
    return $hits
}

function Set-ImageField($item, $fieldName, $mediaItem) {
    if (-not $mediaItem) { return }
    $item.Editing.BeginEdit()
    try {
        # Image field stores XML: <image mediaid="{id}" src="..."/>
        $item[$fieldName] = "<image mediaid=`"$($mediaItem.ID)`" src=`"$($mediaItem.Paths.FullPath)`"/>"
        $item.Editing.EndEdit()
    } catch { $item.Editing.CancelEdit(); throw }
}

function Set-GeneralLink($item, $fieldName, $url) {
    if (-not $url) { return }
    $href = $url -match '^https?://' ? $url : "https://$url"
    $item.Editing.BeginEdit()
    try {
        $item[$fieldName] = "<link text=`"$url`" linktype=`"external`" url=`"$href`" anchor=`"`" target=`"_blank`" />"
        $item.Editing.EndEdit()
    } catch { $item.Editing.CancelEdit(); throw }
}

# ------------------------------------------------------------- import
Write-Host "Creating flipbook root: $ParentPath"
$rootItem = Get-OrCreateItem (Split-Path $ParentPath -Parent) (Split-Path $ParentPath -Leaf) $flipbookTplId

Set-Field $rootItem 'Title'                  $manifest.settings.title
Set-Field $rootItem 'Description'            $manifest.settings.description
Set-Field $rootItem 'Page Width'             $manifest.pageWidth
Set-Field $rootItem 'Page Height'            $manifest.pageHeight
Set-Field $rootItem 'Flip Style'             $manifest.settings.flipStyle
Set-Field $rootItem 'Theme Color'            $manifest.settings.themeColor
Set-Field $rootItem 'Background Color'       $manifest.settings.backgroundColor
$checkboxMap = @{
    'Show Toolbar'            = 'showToolbar'
    'Show Thumbnails'         = 'showThumbnails'
    'Show Table Of Contents'  = 'showTableOfContents'
    'Show Search'             = 'showSearch'
    'Show Page Numbers'       = 'showPageNumbers'
    'Right To Left'           = 'rightToLeft'
    'Auto Play'               = 'autoPlay'
}
foreach ($field in $checkboxMap.Keys) {
    $val = $manifest.settings.($checkboxMap[$field])
    if ($null -ne $val) { Set-Field $rootItem $field $(if ($val) { '1' } else { '0' }) }
}
Set-Field $rootItem 'Auto Play Interval'     $manifest.settings.autoPlayInterval

# --- Pages -------------------------------------------------------------
$pageItems = @{}
foreach ($p in $manifest.pages) {
    $name = "Page $($p.index + 1)"
    $pageItem = Get-OrCreateItem $rootItem.Paths.Path $name $pageTplId
    $pageItems[$p.index] = $pageItem

    $img  = Find-MediaItem $MediaRoot $p.image
    $thb  = Find-MediaItem $MediaRoot $p.thumb
    Set-ImageField $pageItem 'Page Image' $img
    Set-ImageField $pageItem 'Thumbnail'  $thb
    Set-Field     $pageItem 'Page Label'  $p.label
    Set-Field     $pageItem 'Search Text' $p.searchText
}

# --- Hotspots ----------------------------------------------------------
foreach ($p in $manifest.pages) {
    $pageItem = $pageItems[$p.index]
    foreach ($h in $p.hotspots) {
        $hName = "Hotspot $($h.index + 1)"
        $hItem = Get-OrCreateItem $pageItem.Paths.Path $hName $hotspotTplId

        Set-Field $hItem 'Hotspot Type' $h.type
        Set-Field $hItem 'Area Left'    $h.rect.left
        Set-Field $hItem 'Area Top'     $h.rect.top
        Set-Field $hItem 'Area Width'   $h.rect.width
        Set-Field $hItem 'Area Height'  $h.rect.height
        Set-Field $hItem 'Label'        $h.label

        if ($h.type -eq 'internalPage' -and $null -ne $h.targetIndex) {
            $target = $pageItems[$h.targetIndex]
            if ($target) {
                $hItem.Editing.BeginEdit()
                try { $hItem['Target Page'] = $target.ID.ToString(); $hItem.Editing.EndEdit() }
                catch { $hItem.Editing.CancelEdit() }
            }
        } else {
            # External / popup / iframe / audio all use URL-ish fields
            Set-GeneralLink $hItem 'Link' $h.url
            if ($h.type -eq 'iframe')    { Set-Field $hItem 'Iframe URL' $h.url }
            if ($h.type -eq 'popupVideo'){ Set-Field $hItem 'Video URL'  $h.url }
            if ($h.type -eq 'audio')     { Set-Field $hItem 'Audio URL'  $h.url }
            if ($h.type -eq 'popupImage' -and $h.url) {
                $m = Find-MediaItem $MediaRoot $h.url
                Set-ImageField $hItem 'Popup Image' $m
            }
        }
    }
}

# --- TOC ----------------------------------------------------------------
foreach ($t in $manifest.toc) {
    $tName = "TOC - $($t.caption)"
    $tItem = Get-OrCreateItem $rootItem.Paths.Path $tName $tocTplId
    Set-Field $tItem 'Caption' $t.caption
    if ($null -ne $t.targetPage) {
        $target = $pageItems[($t.targetPage - 1)]
        if ($target) {
            $tItem.Editing.BeginEdit()
            try { $tItem['Target Page'] = $target.ID.ToString(); $tItem.Editing.EndEdit() }
            catch { $tItem.Editing.CancelEdit() }
        }
    }
}

Write-Host "Import complete: $($manifest.pages.Count) pages under $($rootItem.Paths.Path)"
Write-Host "Next: add the Flipbook rendering to a page via Presentation Details."
