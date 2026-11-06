<#
.SYNOPSIS
    Creates the Sitecore content model + rendering for the Flipbook component.

.DESCRIPTION
    Idempotent SPE script. Creates:
      - Templates: Flipbook, Flipbook Page, Flipbook Hotspot, Flipbook TOC Entry
        under /sitecore/templates/Project/<site>/Page Content/Flipbook
      - Flip Style droplist items (Flip / Slide / Scroll)
      - Controller rendering "Flipbook" under
        /sitecore/layout/Renderings/Project/<site>/Page Content
      - "Available Renderings" entry so authors can add it to pages

    Run in Sitecore PowerShell Extensions (ISE or `powershell` tool) on CM.
    Adjust $SiteName if your site folder differs.

.NOTES
    Field -> Next.js mapping is handled by normalizeFlipbook() in
    src/components/Flipbook/model.ts — keep field names in sync.
#>

$ErrorActionPreference = 'Stop'

# ------------------------------------------------------------------ config
$SiteName          = 'ai-sales-agent'   # folder name under /sitecore/templates/Project
$TemplatesRoot     = "/sitecore/templates/Project/$SiteName/Page Content/Flipbook"
$RenderingsParent  = "/sitecore/layout/Renderings/Project/$SiteName/Page Content"
$AvailableRoot     = "/sitecore/content/$SiteName/$SiteName/Presentation/Available Renderings"
$SettingsRoot      = "/sitecore/content/$SiteName/$SiteName/Settings/Flipbook"

$TEMPLATE_ITEM  = '{AB86861A-6030-46C5-B394-E8F99E8B87DB}'  # Template
$SECTION_ITEM   = '{E269FBB5-3750-427A-9149-7AA950B49301}'  # Template section
$FIELD_ITEM     = '{455A3E98-A627-4B40-8035-E683A0331AC7}'  # Template field
$RENDERING_ITEM = '{04646A89-996F-4EE7-878A-FFDBF1F0EF0D}'  # Controller View rendering
$AVAIL_TEMPLATE = '{76DA0A8D-FC7E-42B2-AF1E-205B49E43F98}'  # Available Renderings folder entry
$PARAM_TEMPLATE = '{4247AAD4-EBDE-4994-998F-E067A51B1FE4}'  # Rendering Parameters standard

# ------------------------------------------------------------- helpers
function Add-Section($template, $name) {
    $sectionPath = Join-Path $template.Paths.Path $name
    $section = Get-Item -Path $sectionPath -ErrorAction SilentlyContinue
    if (-not $section) {
        $section = New-Item -Path $template.Paths.Path -Name $name `
                   -TemplateId $SECTION_ITEM
    }
    return $section
}

function Add-Field($section, $name, $type, $source, $sortOrder) {
    $fieldPath = Join-Path $section.Paths.Path $name
    $field = Get-Item -Path $fieldPath -ErrorAction SilentlyContinue
    if (-not $field) {
        $field = New-Item -Path $section.Paths.Path -Name $name `
                 -TemplateId $FIELD_ITEM
    }
    $field.Editing.BeginEdit()
    try {
        $field['Type']        = $type
        $field['__Sortorder'] = "$sortOrder"
        if ($source) { $field['Source'] = $source }
        # Field titles are language-specific; set invariant display via name.
        $field.Editing.EndEdit()
    } catch {
        $field.Editing.CancelEdit()
        throw
    }
    return $field
}

function New-TemplateTree($name, $sectionFields) {
    # $sectionFields: @{ 'Section Name' = @( @('Field','Type','Source',sort), ... ) }
    $tpl = Get-Item -Path (Join-Path $TemplatesRoot $name) -ErrorAction SilentlyContinue
    if (-not $tpl) {
        $tpl = New-Item -Path $TemplatesRoot -Name $name -TemplateId $TEMPLATE_ITEM
    }

    foreach ($sectionName in $sectionFields.Keys) {
        $section = Add-Section $tpl $sectionName
        $i = 100
        foreach ($f in $sectionFields[$sectionName]) {
            Add-Field $section $f[0] $f[1] $f[2] $i
            $i += 100
        }
    }
    return $tpl
}

# ------------------------------------------------------------------ run
Write-Host "Ensuring template root: $TemplatesRoot"
$root = Get-Item -Path "/sitecore/templates/Project/$SiteName/Page Content" -ErrorAction SilentlyContinue
if (-not $root) { throw "Page Content templates folder not found: $root" }
if (-not (Get-Item -Path $TemplatesRoot -ErrorAction SilentlyContinue)) {
    New-Item -Path $root.Paths.Path -Name 'Flipbook' -ItemType 'Template folder' | Out-Null
}

# --- Flip Style droplist items --------------------------------------
if (-not (Get-Item -Path $SettingsRoot -ErrorAction SilentlyContinue)) {
    New-Item -Path "/sitecore/content/$SiteName/$SiteName" -Name 'Settings' -ItemType 'Folder' | Out-Null
}
if (-not (Get-Item -Path $SettingsRoot -ErrorAction SilentlyContinue)) {
    New-Item -Path "/sitecore/content/$SiteName/$SiteName/Settings" -Name 'Flipbook' -ItemType 'Folder' | Out-Null
}
$flipStyles = @{}
foreach ($style in @('Flip','Slide','Scroll')) {
    $p = Join-Path $SettingsRoot "Flip Style - $style"
    if (-not (Get-Item -Path $p -ErrorAction SilentlyContinue)) {
        New-Item -Path $SettingsRoot -Name "Flip Style - $style" -ItemType 'Sample/Sample Item' | Out-Null
    }
    $flipStyles[$style] = $p
}
$flipStyleSource = ($flipStyles.Values -join '|')

# --- Templates --------------------------------------------------------
$flipbookPageTpl   = $null
$hotspotTpl        = $null
$tocTpl            = $null

$tocTpl = New-TemplateTree 'Flipbook TOC Entry' @{
    'Content' = @(
        @('Caption',      'Single-Line Text', '', 100),
        @('Target Page',  'Droptree',         '', 200)   # source set after templates exist
    )
}

# NOTE: Droptree source can't reference siblings reliably; use template-scoped
# query against the Flipbook datasource's children instead. We set sources
# after all templates exist.

$hotspotTpl = New-TemplateTree 'Flipbook Hotspot' @{
    'Content' = @(
        @('Hotspot Type',  'Droplist', '', 100),   # source set after templates exist
        @('Area Left',     'Number',    '', 200),
        @('Area Top',      'Number',    '', 300),
        @('Area Width',    'Number',    '', 400),
        @('Area Height',   'Number',    '', 500),
        @('Label',         'Single-Line Text', '', 600),
        @('Target Page',   'Droptree',  '', 700),
        @('Link',          'General Link','', 800),
        @('Popup Image',   'Image',     '', 900),
        @('Video URL',     'Single-Line Text', '', 1000),
        @('Iframe URL',    'Single-Line Text', '', 1100),
        @('Audio URL',     'Single-Line Text', '', 1200)
    )
}

$flipbookPageTpl = New-TemplateTree 'Flipbook Page' @{
    'Content' = @(
        @('Page Image',    'Image',           '', 100),
        @('Thumbnail',     'Image',           '', 200),
        @('Page Label',    'Single-Line Text','', 300),
        @('Search Text',   'Multi-Line Text', '', 400),
        @('Hotspots',      'Multilist',       '', 500)
    )
}

$flipbookTpl = New-TemplateTree 'Flipbook' @{
    'Content' = @(
        @('Title',                  'Single-Line Text','', 100),
        @('Description',            'Multi-Line Text', '', 200),
        @('Page Width',             'Number',          '1167', 300),
        @('Page Height',            'Number',          '825', 400),
        @('Flip Style',             'Droplist',        $flipStyleSource, 500),
        @('Theme Color',            'Single-Line Text','', 600),
        @('Background Color',       'Single-Line Text','', 700),
        @('Show Toolbar',           'Checkbox',        '', 800),
        @('Show Thumbnails',        'Checkbox',        '', 900),
        @('Show Table Of Contents', 'Checkbox',        '', 1000),
        @('Show Search',            'Checkbox',        '', 1100),
        @('Show Page Numbers',      'Checkbox',        '', 1200),
        @('Right To Left',          'Checkbox',        '', 1300),
        @('Auto Play',              'Checkbox',        '', 1400),
        @('Auto Play Interval',     'Number',          '5', 1500),
        @('Pages',                  'Multilist',       '', 1600),
        @('Table Of Contents',      'Multilist',       '', 1700)
    )
}

# --- Fix up sources that need template IDs ----------------------------
# Hotspot Type droplist: dedicated items under Settings
$hotspotTypesRoot = "$SettingsRoot/Hotspot Types"
if (-not (Get-Item -Path $hotspotTypesRoot -ErrorAction SilentlyContinue)) {
    New-Item -Path $SettingsRoot -Name 'Hotspot Types' -ItemType 'Folder' | Out-Null
}
$hotspotTypeSource = @()
foreach ($t in @('Internal Page','External Link','Popup Image','Popup Video','Iframe','Audio')) {
    $p = "$hotspotTypesRoot/$t"
    if (-not (Get-Item -Path $p -ErrorAction SilentlyContinue)) {
        New-Item -Path $hotspotTypesRoot -Name $t -ItemType 'Sample/Sample Item' | Out-Null
    }
    $hotspotTypeSource += $p
}
$hotspotTypeSource = $hotspotTypeSource -join '|'

$flipbookId   = $flipbookTpl.ID
$pageTplId    = $flipbookPageTpl.ID
$hotspotTplId = $hotspotTpl.ID
$tocTplId     = $tocTpl.ID

function Set-FieldSource($templatePath, $sectionName, $fieldName, $source) {
    $f = Get-Item -Path (Join-Path (Join-Path $templatePath $sectionName) $fieldName) -ErrorAction SilentlyContinue
    if ($f) {
        $f.Editing.BeginEdit()
        $f['Source'] = $source
        $f.Editing.EndEdit()
    }
}

# Pages = children of the Flipbook item that are Flipbook Page
Set-FieldSource $flipbookTpl.Paths.Path 'Content' 'Pages' "query:./*[@@templateid='$pageTplId']"
Set-FieldSource $flipbookTpl.Paths.Path 'Content' 'Table Of Contents' "query:./*[@@templateid='$tocTplId']"
Set-FieldSource $flipbookPageTpl.Paths.Path 'Content' 'Hotspots' "query:./*[@@templateid='$hotspotTplId']"

# Practical approach: allow selecting any item based on Flipbook Page template.
$anyPageQuery = "query:/sitecore/content//*[@@templateid='$pageTplId']"
Set-FieldSource $tocTpl.Paths.Path 'Content' 'Target Page' $anyPageQuery
Set-FieldSource $hotspotTpl.Paths.Path 'Content' 'Target Page' $anyPageQuery
Set-FieldSource $hotspotTpl.Paths.Path 'Content' 'Hotspot Type' $hotspotTypeSource

# --- Insert options (authoring UX) ------------------------------------
$flipbookTpl.Editing.BeginEdit()
$flipbookTpl['__Insert Options'] = "$pageTplId|$tocTplId"
$flipbookTpl.Editing.EndEdit()

$flipbookPageTpl.Editing.BeginEdit()
$flipbookPageTpl['__Insert Options'] = $hotspotTplId
$flipbookPageTpl.Editing.EndEdit()

# --- Rendering ---------------------------------------------------------
$renderingPath = Join-Path $RenderingsParent 'Flipbook'
$rendering = Get-Item -Path $renderingPath -ErrorAction SilentlyContinue
if (-not $rendering) {
    $rendering = New-Item -Path $RenderingsParent -Name 'Flipbook' -TemplateId $RENDERING_ITEM
}
$rendering.Editing.BeginEdit()
$rendering['componentName']        = 'Flipbook'
$rendering['__Icon']               = 'Apps/32x32/book_open.png'
$rendering['Datasource Template']  = $flipbookTpl.Paths.Path
$rendering['Parameters Template']  = $PARAM_TEMPLATE
$rendering.Editing.EndEdit()

# --- Available Renderings ----------------------------------------------
if (-not (Get-Item -Path $AvailableRoot -ErrorAction SilentlyContinue)) {
    New-Item -Path "/sitecore/content/$SiteName/$SiteName/Presentation" -Name 'Available Renderings' -ItemType 'Node' -ErrorAction SilentlyContinue | Out-Null
}
$availPath = Join-Path $AvailableRoot 'Flipbook'
$avail = Get-Item -Path $availPath -ErrorAction SilentlyContinue
if (-not $avail) {
    $avail = New-Item -Path $AvailableRoot -Name 'Flipbook' -TemplateId $AVAIL_TEMPLATE
}
# Set Renderings field in every language version that exists on siblings
$languages = (Get-Item -Path $AvailableRoot).Languages
foreach ($lang in $languages) {
    $item = Get-Item -Path $availPath -Language $lang.Name
    if (-not $item.Versions.Count) { $item = $item.Versions.AddVersion() }
    $item.Editing.BeginEdit()
    $item['Renderings'] = "{$($rendering.ID.ToUpper())}"
    $item.Editing.EndEdit()
}

Write-Host ""
Write-Host "Flipbook setup complete."
Write-Host "  Templates root : $TemplatesRoot"
Write-Host "  Rendering      : $renderingPath  (componentName=Flipbook)"
Write-Host "  Available      : $availPath"
Write-Host "  Flipbook tpl ID: $($flipbookTpl.ID)"
Write-Host "  Page tpl ID    : $($flipbookPageTpl.ID)"
Write-Host "  Hotspot tpl ID : $($hotspotTpl.ID)"
Write-Host "  TOC tpl ID     : $($tocTpl.ID)"
