$ErrorActionPreference = 'Continue'
$wd  = 'G:\009repos\002MingJia\NovaDemo\bin\Debug\net8.0'
$out = 'G:\009repos\002MingJia\NewLife.Cube.Nova\docs\preview'
$log = $out + '\demo-run.log'
$errlog = $out + '\demo-run.err.log'
$base = 'http://127.0.0.1:5259'

$p = Start-Process -FilePath 'C:\Program Files\dotnet\dotnet.exe' `
    -ArgumentList 'NovaDemo.dll --urls http://127.0.0.1:5259/' `
    -WorkingDirectory $wd -RedirectStandardOutput $log -RedirectStandardError $errlog -PassThru
Write-Output ("PID=" + $p.Id)

$up = $false
for ($i = 0; $i -lt 40; $i++) {
    if ($p.HasExited) {
        Write-Output 'PROCESS_EXITED'
        Get-Content $errlog -Tail 20
        Get-Content $log -Tail 20
        exit 1
    }
    try {
        Invoke-WebRequest -Uri ($base + '/') -UseBasicParsing -TimeoutSec 3 | Out-Null
        $up = $true
        break
    } catch {
        if ($_.Exception.Response -ne $null) { $up = $true; break }
        Start-Sleep -Seconds 3
    }
}
Write-Output ("UP=" + $up)
if (-not $up) {
    Get-Content $errlog -Tail 20
    Get-Content $log -Tail 30
    Stop-Process -Id $p.Id -Force
    exit 1
}

function Check($name, $cond) {
    if ($cond) { Write-Output ("CHECK " + $name + " : PASS") }
    else { Write-Output ("CHECK " + $name + " : FAIL") }
}

# 1. static asset: v3 theme active
$css = (Invoke-WebRequest -Uri ($base + '/Content/nova/nova-ui.css') -UseBasicParsing -TimeoutSec 15).Content
Check 'css-served' ($css -match 'nv-primary')
Check 'css-v3-solid-primary' ($css -match '--nv-grad-primary:#1e5cae')

# 2. login page
$login = Invoke-WebRequest -Uri ($base + '/Admin/User/Login') -UseBasicParsing -TimeoutSec 20 -SessionVariable s
Check 'login-page' ($login.StatusCode -eq 200)

# 3. login (single attempt)
$body = @{ username = 'admin'; password = 'admin'; remember = 'true' }
try {
    $resp = Invoke-WebRequest -Uri ($base + '/Admin/User/Login') -Method Post -Body $body -WebSession $s -UseBasicParsing -TimeoutSec 20
    Check 'login-post' ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 302)
} catch {
    Check 'login-post' $false
}

# 4. list page (user mgmt has Enable field -> bulkbar expected)
$idx = Invoke-WebRequest -Uri ($base + '/Admin/User/Index') -UseBasicParsing -TimeoutSec 30 -WebSession $s
Check 'list-page' ($idx.StatusCode -eq 200)
Check 'list-nova-table' ($idx.Content -match 'nv-table')
Check 'list-toolbar-filters' ($idx.Content -match 'nv-toolbar-filters')
Check 'list-bulkbar-rendered' ($idx.Content -match 'nv-bulkbar')
Check 'list-bulkbar-count' ($idx.Content -match 'nv-bulkbar-count')
$bulkBlock = $idx.Content.Substring($idx.Content.IndexOf('nv-bulkbar"'))
$bulkBlock = $bulkBlock.Substring(0, [Math]::Min(1500, $bulkBlock.Length))
Check 'list-bulk-enable-in-bar' ($bulkBlock -match 'EnableSelect')
Check 'list-bulk-delete-in-bar' ($bulkBlock -match 'DeleteSelect')
Check 'list-legacy-purple-gone' ($idx.Content -notmatch 'btn-purple')
Check 'list-pager' ($idx.Content -match 'nv-pager')
$htmlList = $idx.Content -replace '(?i)<head>', ('<head><base href="' + $base + '/">')
$htmlList | Out-File -FilePath ($out + '\runtime-list.html') -Encoding utf8

# 5. form page (add user)
try {
    $add = Invoke-WebRequest -Uri ($base + '/Admin/User/Add') -UseBasicParsing -TimeoutSec 30 -WebSession $s
    Check 'form-page' ($add.StatusCode -eq 200)
    Check 'form-grid' ($add.Content -match 'nv-form-grid')
    Check 'form-cards' ($add.Content -match 'nv-card-head')
    Check 'form-no-tabs' ($add.Content -notmatch 'data-bs-toggle=.tab.')
    $htmlForm = $add.Content -replace '(?i)<head>', ('<head><base href="' + $base + '/">')
    $htmlForm | Out-File -FilePath ($out + '\runtime-form.html') -Encoding utf8
} catch {
    Write-Output 'CHECK form-page : FAIL(exception)'
}

# 6. screenshots via headless Edge (CSS/JS served by running site)
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$shot1 = Start-Process -FilePath $edge -ArgumentList ('--headless --disable-gpu --hide-scrollbars --window-size=1500,1400 --screenshot="' + $out + '\runtime-list.png" "file:///' + ($out -replace '\\','/') + '/runtime-list.html"') -Wait -PassThru
$shot2 = Start-Process -FilePath $edge -ArgumentList ('--headless --disable-gpu --hide-scrollbars --window-size=1500,2200 --screenshot="' + $out + '\runtime-form.png" "file:///' + ($out -replace '\\','/') + '/runtime-form.html"') -Wait -PassThru
Write-Output 'SHOTS_DONE'

Stop-Process -Id $p.Id -Force
Write-Output 'SERVER_STOPPED'
