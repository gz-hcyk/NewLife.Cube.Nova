$ErrorActionPreference = 'Continue'
$wd  = 'G:\009repos\002MingJia\IoT\Bin\Web\net8.0'
$log = 'G:\009repos\002MingJia\NewLife.Cube.Nova\docs\preview\iot-run.log'
$errlog = 'G:\009repos\002MingJia\NewLife.Cube.Nova\docs\preview\iot-run.err.log'

$p = Start-Process -FilePath 'C:\Program Files\dotnet\dotnet.exe' `
    -ArgumentList 'IoTWeb.dll --urls http://127.0.0.1:5080/' `
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
        Invoke-WebRequest -Uri 'http://127.0.0.1:5080/' -UseBasicParsing -TimeoutSec 3 | Out-Null
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
$css = (Invoke-WebRequest -Uri 'http://127.0.0.1:5080/Content/nova/nova-ui.css' -UseBasicParsing -TimeoutSec 15).Content
Check 'css-served' ($css -match 'nv-primary')
Check 'css-v3-solid-primary' ($css -match '--nv-grad-primary:#1e5cae')

# 2. login page
$login = Invoke-WebRequest -Uri 'http://127.0.0.1:5080/Admin/User/Login' -UseBasicParsing -TimeoutSec 20 -SessionVariable s
Check 'login-page' ($login.StatusCode -eq 200)
Check 'login-nova-skin' ($login.Content -match 'nova')

# 3. login (single attempt to avoid lockout MaxLoginError=5)
$body = @{ username = 'admin'; password = 'admin'; remember = 'true' }
try {
    $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:5080/Admin/User/Login' -Method Post -Body $body -WebSession $s -UseBasicParsing -TimeoutSec 20
    Check 'login-post-status' ($resp.StatusCode -eq 200 -or $resp.StatusCode -eq 302)
} catch {
    Check 'login-post-status' $false
}

# 4. list page (user mgmt, has Enable field so bulkbar expected)
$idx = Invoke-WebRequest -Uri 'http://127.0.0.1:5080/Admin/User/Index' -UseBasicParsing -TimeoutSec 30 -WebSession $s
Check 'list-page' ($idx.StatusCode -eq 200)
Check 'list-nova-table' ($idx.Content -match 'nv-table')
Check 'list-toolbar-filters' ($idx.Content -match 'nv-toolbar-filters')
Check 'list-bulkbar-rendered' ($idx.Content -match 'nv-bulkbar')
Check 'list-bulkbar-count' ($idx.Content -match 'nv-bulkbar-count')
Check 'list-bulk-delete' ($idx.Content -match 'DeleteSelect')
Check 'list-pager-total' ($idx.Content -match 'nv-pager')

# 5. form page (add user)
try {
    $add = Invoke-WebRequest -Uri 'http://127.0.0.1:5080/Admin/User/Add' -UseBasicParsing -TimeoutSec 30 -WebSession $s
    Check 'form-page' ($add.StatusCode -eq 200)
    Check 'form-grid' ($add.Content -match 'nv-form-grid')
    Check 'form-cards' ($add.Content -match 'nv-card')
    Check 'form-sticky-actions' ($add.Content -match 'nv-form-actions')
    Check 'form-no-tabs' ($add.Content -notmatch 'data-bs-toggle=.tab.')
} catch {
    Write-Output 'CHECK form-page : FAIL(exception)'
}

Stop-Process -Id $p.Id -Force
Write-Output 'SERVER_STOPPED'
