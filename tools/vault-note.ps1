# Appends the monthly batch's lineup note to today's Obsidian journal (Matto's Brain \ 4-* \ YYYY-MM-DD.md),
# so Matto can check the titles in the vault before merging the PR (Matto decision 2026-09-11).
# Called by monthly-run.ps1 only after the PR was actually opened.
#
# ASCII-only (Windows PowerShell 5.1 mangles non-ASCII in BOM-less .ps1). The journal folder name is non-ASCII,
# so it is resolved by its "4-" prefix - same trick as graphify-sync.ps1. The note text itself is read from a
# UTF-8 file, so Korean content is safe. Written without BOM: Obsidian frontmatter must be the first bytes.
param(
  [Parameter(Mandatory = $true)] [string]$NoteFile,
  [string]$PrUrl = '',
  [string]$Marker = '',
  [string]$VaultRoot = "F:\Obsidian\Matto's Brain",
  [string]$Date = ([DateTime]::UtcNow.AddHours(9).ToString('yyyy-MM-dd'))
)
$utf8 = New-Object System.Text.UTF8Encoding $false

if (-not (Test-Path -LiteralPath $NoteFile)) { Write-Output "vault-note: no note file $NoteFile"; exit 1 }
$journal = Get-ChildItem -LiteralPath $VaultRoot -Directory | Where-Object { $_.Name -like '4-*' } | Select-Object -First 1
if (-not $journal) { Write-Output "vault-note: journal folder (4-*) not found under $VaultRoot"; exit 1 }
$path = Join-Path $journal.FullName "$Date.md"

# Never append the same month twice (a retried run, a manual re-run).
$tag = if ($Marker) { "<!-- $Marker -->" } else { '' }
if ($tag -and (Test-Path -LiteralPath $path) -and ([IO.File]::ReadAllText($path, $utf8).Contains($tag))) {
  Write-Output "vault-note: $Marker already in $path - skipped"; exit 0
}

$note = [IO.File]::ReadAllText($NoteFile, $utf8).Replace('{{PR_URL}}', $PrUrl).Trim()
if (-not (Test-Path -LiteralPath $path)) {
  [IO.File]::WriteAllText($path, "---`ncreated: $Date`ntags: [log]`n---`n# $Date`n", $utf8)
}
$block = "`n" + $(if ($tag) { "$tag`n" } else { '' }) + "$note`n"
[IO.File]::AppendAllText($path, $block, $utf8)
Write-Output "vault-note: appended to $path"
