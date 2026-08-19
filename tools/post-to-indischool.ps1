# post-to-indischool.ps1 — 오늘 자 아침신문 소개글을 클립보드에 넣고 인디스쿨 라운지를 연다.
# 발행된 사이트에서 직접 읽으므로 저장소·Node 없이 어느 윈도우 PC에서나 돌아간다.
#
#   .\post-to-indischool.ps1              # 지금 실행
#   .\post-to-indischool.ps1 2026-08-18   # 특정 호
#   .\post-to-indischool.ps1 -Install     # 매일(평일) 아침 8:10 자동 실행 등록
#   .\post-to-indischool.ps1 -Install -At 08:30
#   .\post-to-indischool.ps1 -Uninstall

param(
  [string]$Date,
  [switch]$Install,
  [switch]$Uninstall,
  [string]$At = "08:10"
)

$Site = "https://matto12-1.github.io/matto-morning-news"
$Lounge = "https://indischool.com/tweets/channels/lounge"
$TaskName = "마또의 아침신문 - 쫑알쫑알"

if ($Uninstall) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  "제거했습니다."
  exit
}

if ($Install) {
  $action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  $trigger = New-ScheduledTaskTrigger -Weekly `
    -DaysOfWeek Monday, Tuesday, Wednesday, Thursday, Friday -At $At
  # StartWhenAvailable: 그 시각에 PC가 꺼져 있었으면 켜는 즉시 밀린 작업을 실행한다.
  $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
  try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
      -Settings $settings -Force | Out-Null
    "등록 완료: 평일 $At. 그때 PC가 꺼져 있었으면 켜는 즉시 실행됩니다."
    "  해제하려면  .\post-to-indischool.ps1 -Uninstall"
  } catch {
    "등록 실패: $($_.Exception.Message)"
    "PowerShell을 '관리자 권한으로 실행'한 뒤 다시 시도해보세요."
  }
  exit
}

# KST 기준 오늘. PC 시간대와 무관하게 맞다.
$today = (Get-Date).ToUniversalTime().AddMinutes(540).ToString("yyyy-MM-dd")

if (-not $Date) {
  # 오늘 이하 가장 최근 호(주말·미발행 폴백).
  $index = Invoke-RestMethod "$Site/content/index.json"
  $Date = ($index | Where-Object { $_ -le $today } | Sort-Object)[-1]
}
if (-not $Date) { throw "발행된 호가 없습니다." }

$a = Invoke-RestMethod "$Site/content/$Date.json"
$paper = [char]::ConvertFromUtf32(0x1F4F0)  # 📰 — 파일 인코딩에 흔들리지 않게 코드포인트로.
$text = "$paper 문해력 기초를 키우는 마또의 아침뉴스 제$($a.issueNo)호`n`n오늘의 주제 : $($a.title)`n`n$Site/?date=$Date"

$text
Set-Clipboard -Value $text
Start-Process $Lounge
