# Monthly batch for morningNEWs - prepares NEXT month's issues on a branch and opens a PR for Matto to merge.
#
# Scheduled task "MorningNewsMonthly" runs this daily at 04:00 (catches up after boot). It only acts on
# days 1-5 of the month, so a run cut off by a usage limit resumes the next morning from file state.
# Once a PR for the month exists, it does nothing - merging is Matto's call (DECISIONS 2026-09-10).
#
# master is never touched: all work happens in a separate git worktree (_auto\morningNEWs-monthly) on
# branch morning/YYYY-MM. The headless Claude only edits files; this script alone commits/pushes/opens the PR.
# Runbook for the headless Claude: monthly-prompt.md (Korean).
#
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less .ps1 as ANSI and mangles non-ASCII.
#
# Manual:  powershell -NoProfile -ExecutionPolicy Bypass -File tools\monthly-run.ps1                  (acts only on days 1-5)
#          powershell -NoProfile -ExecutionPolicy Bypass -File tools\monthly-run.ps1 -Month 2026-11   (any day, that month)
#          powershell -NoProfile -ExecutionPolicy Bypass -File tools\monthly-run.ps1 -Smoke           (any day: 2 issues, draft PR)
param([switch]$Smoke, [string]$Month)

$ErrorActionPreference = 'Continue'
$Repo   = 'F:\VibeCoding\morningNEWs'
$Auto   = 'F:\VibeCoding\_auto'
$Wt     = Join-Path $Auto 'morningNEWs-monthly'
$LogDir = Join-Path $Auto 'logs'
$Claude = "$env:USERPROFILE\.local\bin\claude.exe"
$GhRepo = 'matto12-1/matto-morning-news'

$now = [DateTime]::UtcNow.AddHours(9)                          # KST
if (-not $Smoke -and -not $Month -and $now.Day -gt 5) { exit 0 }   # quiet no-op outside days 1-5

# What is already published on origin/master (index.json is a flat array of 'YYYY-MM-DD').
& git -C $Repo fetch origin --prune 2>&1 | Out-Null
$json  = (& git -C $Repo show origin/master:content/index.json 2>$null) -join ''
$dates = @($json.Trim().Trim('[', ']').Split(',') | ForEach-Object { $_.Trim().Trim('"') } | Where-Object { $_ -match '^\d{4}-\d{2}-\d{2}$' })

# Target month. Scheduled run: next calendar month (run on the 1st -> the month after).
# Smoke: the month after the last published one - a calendar "next month" on Sept 10 was October, which
# was already published, and the first smoke test started rebuilding it (2026-09-10).
if ($Month) { $target = $Month }
elseif ($Smoke) { $target = [DateTime]::ParseExact(($dates[-1]).Substring(0, 7) + '-01', 'yyyy-MM-dd', $null).AddMonths(1).ToString('yyyy-MM') }
else { $target = $now.AddMonths(1).ToString('yyyy-MM') }
if ($target -notmatch '^\d{4}-\d{2}$') { Write-Output "bad target month: $target"; exit 1 }
$stamp  = $now.ToString('yyyyMMdd-HHmm')
$branch = if ($Smoke) { "morning/smoke-$stamp" } else { "morning/$target" }
$mode   = if ($Smoke) { 'test' } else { 'full' }

New-Item -ItemType Directory -Force $LogDir | Out-Null
$Log = Join-Path $LogDir "morning-$target-$stamp.log"
function Say($m) { $line = "$(Get-Date -f 'yyyy-MM-dd HH:mm:ss') $m"; Add-Content -LiteralPath $Log -Value $line -Encoding UTF8; Write-Output $line }
[Console]::OutputEncoding = [Text.Encoding]::UTF8             # claude/git/gh print UTF-8

Say "start target=$target branch=$branch mode=$mode (last published: $($dates[-1]))"

# 1) Already on master (e.g. made by hand in a session) -> nothing to do. Never rebuild a published month.
if (@($dates | Where-Object { $_.StartsWith("$target-") }).Count -gt 0) { Say "$target is already on master - nothing to do"; exit 0 }

# 1b) A PR for this month already exists -> Matto's turn, nothing to do.
if (-not $Smoke) {
  $prs = & gh pr list -R $GhRepo --head $branch --state all --json number,state 2>$null | ConvertFrom-Json
  if ($prs -and @($prs).Count -gt 0) { Say "PR already exists (#$(@($prs)[0].number) $(@($prs)[0].state)) - nothing to do"; exit 0 }
}

# 2) Worktree on the month's branch (resume if it already exists locally or on origin).
if (Test-Path $Wt) {
  $cur = & git -C $Wt rev-parse --abbrev-ref HEAD 2>$null
  if ($cur -ne $branch) {
    Say "removing stale worktree ($cur)"
    & git -C $Repo worktree remove --force $Wt 2>&1 | ForEach-Object { Say $_ }
    # git can unregister the worktree yet fail to delete the folder (a locked file). A leftover folder
    # would pass the checks below and be reused half-broken, so make sure it is really gone (2026-09-10).
    if (Test-Path $Wt) { Remove-Item -LiteralPath $Wt -Recurse -Force -ErrorAction SilentlyContinue }
    if (Test-Path $Wt) { Say "ERROR: cannot remove stale worktree folder $Wt"; exit 1 }
  }
}
& git -C $Repo worktree prune 2>&1 | Out-Null
if (-not (Test-Path $Wt)) {
  $local  = & git -C $Repo branch --list $branch
  $remote = & git -C $Repo ls-remote --heads origin $branch
  if ($local)      { & git -C $Repo worktree add $Wt $branch 2>&1 | ForEach-Object { Say $_ } }
  elseif ($remote) { & git -C $Repo worktree add -b $branch $Wt "origin/$branch" 2>&1 | ForEach-Object { Say $_ } }
  else             { & git -C $Repo worktree add -b $branch $Wt origin/master 2>&1 | ForEach-Object { Say $_ } }
}
if (-not (Test-Path (Join-Path $Wt 'monthly-prompt.md'))) { Say 'ERROR: worktree has no monthly-prompt.md'; exit 1 }
if (-not (Test-Path (Join-Path $Wt 'node_modules'))) {
  Say 'npm ci (first run for this worktree)'
  Push-Location $Wt; & npm ci --no-audit --no-fund 2>&1 | Out-Null; Pop-Location
}

# 3) Headless Claude does the work (files only). Retry watchdog: wait out 429s instead of dying.
$env:CLAUDE_CODE_RETRY_WATCHDOG = '1'
$Allowed = 'Read,Write,Edit,Glob,Grep,Agent,WebSearch,WebFetch,Bash(node:*),Bash(npm test:*),Bash(npm run:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(ls:*),Bash(mkdir:*)'
$prompt = @"
Target month: $target
Branch: $branch
Mode: $mode
Working directory: $Wt

Read monthly-prompt.md in the working directory and carry it out exactly, starting from section 0.
Mode "test" means the runbook's test mode. Do not run git commit, git push or gh - the calling script does that after you finish.
"@
Say 'claude start'
Push-Location $Wt
$out = & $Claude -p $prompt --allowedTools $Allowed 2>&1 | Out-String
$code = $LASTEXITCODE
Pop-Location
Add-Content -LiteralPath $Log -Value $out -Encoding UTF8
Say "claude exit=$code"

# 4) Checkpoint: commit only this month's content + history, push the branch. Never master.
Push-Location $Wt
foreach ($p in @("content/$target-*.json", "content/img/$target-*.jpg", 'content/index.json', 'content/topics.json')) { & git add -- $p 2>$null }
& git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  $done = Test-Path '.monthly\DONE'
  $msg  = if ($done) { "content: $target issues (monthly batch)" } else { "wip: $target issues (monthly batch, in progress)" }
  & git commit -q -m $msg -m 'Co-Authored-By: Claude (monthly batch) <noreply@anthropic.com>' 2>&1 | ForEach-Object { Say $_ }
}
& git push -q -u origin $branch 2>&1 | ForEach-Object { Say $_ }

# 5) Open the PR only when the runbook marked the batch finished (all checks passed).
if (Test-Path '.monthly\DONE') {
  $title = (Get-Content '.monthly\PR_TITLE.txt' -Raw -Encoding UTF8).Trim()
  $ghArgs = @('pr', 'create', '-R', $GhRepo, '--base', 'master', '--head', $branch, '--title', $title, '--body-file', '.monthly\PR_BODY.md')
  if ($Smoke) { $ghArgs += '--draft' }
  $url = & gh @ghArgs 2>&1
  Say "PR: $url"
} else {
  Say 'not finished (no .monthly/DONE) - the next scheduled run resumes from file state'
}
Pop-Location
Say 'end'
