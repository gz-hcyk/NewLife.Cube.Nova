$ErrorActionPreference = 'Continue'
$wd  = 'G:\009repos\002MingJia\NovaDemo\bin\Debug\net8.0'
$out = 'G:\009repos\002MingJia\NewLife.Cube.Nova\docs\preview'
$log = $out + '\demo-run.log'
$errlog = $out + '\demo-run.err.log'
$base = 'http://127.0.0.1:5259'

# preview dir must exist BEFORE the server starts (PhysicalFileProvider snapshots wwwroot at startup)
$pvDir = $wd + '\wwwroot\__preview'
New-Item -ItemType Directory -Force $pvDir | Out-Null

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
Check 'css-anchor-btn-guard' ($css -match 'body\.nv a\.nv-btn-primary')
Check 'css-sidebar-anchor-guard' ($css -match 'body\.nv \.nv-menu-link \{ color:var\(--nv-sidebar-text\)')

# 1b. nova-ui.js: 跨页保留选择 + data-action 契约（规范 5.4）
$js = (Invoke-WebRequest -Uri ($base + '/Content/nova/nova-ui.js') -UseBasicParsing -TimeoutSec 15).Content
Check 'js-served' ($js -match 'window\.nv =')
Check 'js-bulk-keep' ($js -match 'nv-bulk:' -and $js -match 'initBulkKeep')
Check 'js-bulk-action' ($js -match 'initBulkAction' -and $js -match 'data-action=\\?"action\\?"')
Check 'js-bulkcount-parse-time' ($js -match 'window\.nv\.bulkCount = bulkCount')
# AI 助手入口 + jQuery modal 垫片（_AIAssistant.cshtml 注入块 / initCompat）
Check 'js-modal-shim' ($js -match '\$\.fn\.modal' -and $js -match 'initCompat')
Check 'js-famap-ai' ($js -match 'arrows-maximize' -and $js -match "'paper-plane': 'send'")

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
# 规范 5.4 跨页保留选择：工具栏脚本须带 DOMContentLoaded 包裹（解析期表格尚不存在）+ 记忆集合计数
Check 'list-toolbar-ready' ($idx.Content -match 'ready\(function')
Check 'list-toolbar-bulk-keep' ($idx.Content -match '跨页保留选择')
# AI 助手悬浮入口：布局注入块 + 核心脚本（契约同 Ace 皮肤）
Check 'layout-ai-assistant' ($idx.Content -match 'aiAssistantFab' -and $idx.Content -match 'ai-assistant\.js' -and $idx.Content -match 'data-ai-url="/Ai/AiChat"')
Check 'list-legacy-purple-gone' ($idx.Content -notmatch 'btn-purple')
Check 'list-pager' ($idx.Content -match 'nv-pager')
Check 'list-add-anchor-btn' ($idx.Content -match '<a[^>]*nv-btn-primary')
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

# 5.5 shell page (sidebar+topbar+iframe, baseline for gov-blue-preview.png)
try {
    $shell = Invoke-WebRequest -Uri ($base + '/Admin') -UseBasicParsing -TimeoutSec 30 -WebSession $s -MaximumRedirection 5
    Check 'shell-page' ($shell.StatusCode -eq 200)
    Check 'shell-sidebar' ($shell.Content -match 'nv-sidebar')
    Check 'shell-header' ($shell.Content -match 'nv-topbar|nv-header')
    Check 'shell-iframe' ($shell.Content -match '<iframe')
    Check 'shell-topsearch' ($shell.Content -match 'nvMenuSearch')
    Check 'shell-crumb-strong' ($shell.Content -match '<strong id="crumbTail">')
    # inline iframe content (headless Edge has no auth cookie, iframe would show login page)
    $main = Invoke-WebRequest -Uri ($base + '/Admin/Index/Dashboard') -UseBasicParsing -TimeoutSec 30 -WebSession $s
    $m = [regex]::Match($main.Content, '(?s)<body[^>]*>(.*)</body>')
    if ($m.Success) {
        $shellHtml = $shell.Content -replace '(?s)<iframe id="main"[^>]*></iframe>', ('<div id="main" class="nv-frame">' + $m.Groups[1].Value + '</div>')
        # no postMessage source in the composite: highlight the first menu item (首页 = start page) like the real shell does
        $mi = '<div class="nv-menu-item">'
        $miIdx = $shellHtml.IndexOf($mi)
        if ($miIdx -ge 0) {
            $shellHtml = $shellHtml.Substring(0, $miIdx) + '<div class="nv-menu-item is-active">' + $shellHtml.Substring($miIdx + $mi.Length)
        }
    } else {
        $shellHtml = $shell.Content
    }
    Check 'shell-inline' ($shellHtml -notmatch '<iframe')
    $htmlShell = $shellHtml -replace '(?i)<head>', ('<head><base href="' + $base + '/">')
    $htmlShell | Out-File -FilePath ($out + '\runtime-shell.html') -Encoding utf8
} catch {
    Write-Output 'CHECK shell-page : FAIL(exception)'
}

# 5.7 department list page(ParentID 树形自动判定;回归:动态类型上调用 IsNullOrEmpty 扩展方法)
try {
    $dept = Invoke-WebRequest -Uri ($base + '/Admin/Department') -UseBasicParsing -TimeoutSec 30 -WebSession $s
    Check 'dept-page' ($dept.StatusCode -eq 200)
    Check 'dept-tree-table' ($dept.Content -match 'nv-tree-table')
    Check 'dept-tree-label-col' ($dept.Content -match 'data-nv-tree-label="\d+"')
    # 树序:首行必须是根(depth=0)，否则父行散在子行之后，树形/折叠都错乱
    $mFirst = [regex]::Match($dept.Content, 'data-nv-tree-depth="(\d+)"')
    Check 'dept-tree-root-first' ($mFirst.Success -and $mFirst.Groups[1].Value -eq '0')
} catch {
    Write-Output 'CHECK dept-page : FAIL(exception)'
}

# 6. screenshots via headless Edge (CSS/JS served by running site)
# 6.1 same-origin preview copies: file:// + <base> makes font requests cross-origin (CORS blocked),
#     which renders tabler icons as .notdef boxes. Serving the saved HTML from the site origin avoids that.
#     (dir was created before server startup; see top of script)
Copy-Item ($out + '\runtime-shell.html') ($pvDir + '\shell.html') -Force
Copy-Item ($out + '\runtime-list.html') ($pvDir + '\list.html') -Force
Copy-Item ($out + '\runtime-form.html') ($pvDir + '\form.html') -Force
# open the first multi/single dropdown on load so the screenshot shows the pop panels
$formPv = Get-Content ($pvDir + '\form.html') -Raw
$formPv = $formPv -replace '</body>', '<script>window.addEventListener("load",function(){setTimeout(function(){var m=document.querySelectorAll(".nv-multipop-btn");if(m[0])m[0].click();},300);});</script></body>'
$formPv | Out-File -FilePath ($pvDir + '\form.html') -Encoding utf8
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$shot1 = Start-Process -FilePath $edge -ArgumentList ('--headless --disable-gpu --hide-scrollbars --window-size=1500,1400 --virtual-time-budget=8000 --screenshot="' + $out + '\runtime-list.png" "' + $base + '/__preview/list.html"') -Wait -PassThru
$shot2 = Start-Process -FilePath $edge -ArgumentList ('--headless --disable-gpu --hide-scrollbars --window-size=1500,2200 --virtual-time-budget=8000 --screenshot="' + $out + '\runtime-form.png" "' + $base + '/__preview/form.html"') -Wait -PassThru
$shot3 = Start-Process -FilePath $edge -ArgumentList ('--headless --disable-gpu --hide-scrollbars --window-size=1600,1200 --virtual-time-budget=8000 --screenshot="' + $out + '\runtime-shell.png" "' + $base + '/__preview/shell.html"') -Wait -PassThru
Write-Output 'SHOTS_DONE'

# 6.2 DOM-level checks after JS runs: dropdown widgets built, filter inputs present
$dom = & $edge --headless --disable-gpu --virtual-time-budget=8000 --dump-dom ($base + '/__preview/form.html') 2>$null | Out-String
Check 'dom-multipop-built' ($dom -match 'nv-multipop-pop')
Check 'dom-multipop-filter' ($dom -match 'nv-multipop-filter')
Check 'dom-selectpop-filter' ($dom -match 'nv-selectpop-filter')
Check 'dom-multipop-items' ($dom -match 'nv-multipop-item')

Remove-Item -Recurse -Force $pvDir

Stop-Process -Id $p.Id -Force
Write-Output 'SERVER_STOPPED'
