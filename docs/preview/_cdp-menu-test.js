/* 左侧菜单展开状态保持 · CDP 复现/回归测试
 * 现象：展开父级菜单后点击子项，菜单收起回到初始状态。
 * 依赖：本机 Edge + Node>=22；前置：pub-verify 实例已在 5260 运行（admin/admin）。
 * 步骤：登录 → 打开 /Admin 外壳 → 点父级「系统管理」→ 断言 is-open
 *       → 点子项「用户」→ 等 iframe 加载 → 断言外壳未重载、父级仍 is-open、子项高亮。
 * 退出码 0 全过；非 0 有断言失败。 */
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9224;
const BASE = 'http://127.0.0.1:5260';
const PROFILE = 'C:\\Users\\thinkpad\\AppData\\Local\\Temp\\nv-cdp-menu-profile';
const results = [];
let failures = 0;

function check(name, cond, detail) {
    results.push((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + JSON.stringify(detail) : ''));
    if (!cond) failures++;
    console.log(results[results.length - 1]);
}

(async () => {
    fs.rmSync(PROFILE, { recursive: true, force: true });
    const edge = spawn(EDGE, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'
    ], { stdio: 'ignore' });

    const cleanup = () => {
        try { edge.kill('SIGKILL'); } catch (e) { }
        setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { } }, 2000);
    };

    try {
        let version = null;
        for (let i = 0; i < 40 && !version; i++) {
            await new Promise(r => setTimeout(r, 500));
            try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch (e) { }
        }
        if (!version) throw new Error('DevTools 未启动');

        let target = null;
        try {
            const r = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
            target = await r.json();
        } catch (e) {
            target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`)).json();
        }

        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        let seq = 0;
        const pending = new Map();
        ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
        };
        const send = (method, params) => new Promise((res) => {
            const id = ++seq; pending.set(id, res);
            ws.send(JSON.stringify({ id, method, params: params || {} }));
        });
        const evaluate = async (expression, awaitP) => {
            const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: !!awaitP });
            if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
            return r.result && r.result.result ? r.result.result.value : undefined;
        };
        const nav = async (url) => {
            await send('Page.enable');
            await send('Page.navigate', { url });
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 500));
                const st = await evaluate('document.readyState === "complete"');
                if (st === true) break;
            }
        };
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // 1. 登录
        await nav(BASE + '/Admin/User/Login');
        const loginStatus = await evaluate(`(async () => {
            const r = await fetch('/Admin/User/Login', { method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'username=admin&password=admin&remember=true', credentials: 'same-origin' });
            return r.status;
        })()`, true);
        check('login-post', loginStatus === 200 || loginStatus === 302, { loginStatus });

        // 2. 打开外壳 /Admin
        await nav(BASE + '/Admin');
        const shellInfo = await evaluate(`(() => {
            window.__shellMark = 1;   // 外壳重载探测标记
            const frame = document.getElementById('main');
            const parents = Array.from(document.querySelectorAll('button.nv-menu-link'));
            return {
                url: location.pathname,
                hasFrame: !!frame,
                frameSrc: frame ? frame.getAttribute('src') : null,
                frameName: frame ? frame.getAttribute('name') : null,
                parents: parents.map(b => b.textContent.trim())
            };
        })()`);
        check('shell-loaded', shellInfo.url === '/Admin' && shellInfo.hasFrame === true, shellInfo);

        // 3. 点击父级「系统管理」展开（先强制收起全部，排除活动分组自动展开的干扰）
        const expand = await evaluate(`(() => {
            document.querySelectorAll('.nv-menu-item.is-open').forEach(li => li.classList.remove('is-open'));
            const btn = Array.from(document.querySelectorAll('button.nv-menu-link'))
                .find(b => /系统管理/.test(b.textContent));
            if (!btn) return { found: false };
            btn.click();
            const item = btn.closest('.nv-menu-item');
            return { found: true, open: item.classList.contains('is-open') };
        })()`);
        check('parent-expand', expand.found === true && expand.open === true, expand);

        // 4. 点击子项「用户」
        const leafClick = await evaluate(`(() => {
            const a = Array.from(document.querySelectorAll('a.nv-menu-link[data-nav]'))
                .find(x => /用户/.test(x.textContent) && (x.getAttribute('data-nav') || '').indexOf('/Admin/User') === 0);
            if (!a) return { found: false, leaves: Array.from(document.querySelectorAll('a.nv-menu-link[data-nav]')).map(x => x.getAttribute('data-nav')) };
            window.__preClick = { mark: window.__shellMark, href: a.getAttribute('href'), target: a.getAttribute('target') };
            a.click();
            return { found: true, href: a.getAttribute('href'), target: a.getAttribute('target') };
        })()`);
        check('leaf-found', leafClick.found === true, leafClick);
        check('leaf-target-main', leafClick.target === 'main', leafClick);

        // 5. 等 iframe 加载完成后再断言
        await sleep(3500);
        const after = await evaluate(`(() => {
            const frame = document.getElementById('main');
            let framePath = null;
            try { framePath = frame.contentWindow.location.pathname; } catch (e) { framePath = 'x:' + e.message; }
            const parentBtn = Array.from(document.querySelectorAll('button.nv-menu-link'))
                .find(b => /系统管理/.test(b.textContent));
            const parentItem = parentBtn ? parentBtn.closest('.nv-menu-item') : null;
            const active = Array.from(document.querySelectorAll('.nv-menu-item.is-active'))
                .map(li => (li.querySelector('.nv-menu-link .nv-menu-label') || {}).textContent);
            return {
                shellMarkKept: window.__shellMark === 1,       // false = 外壳被整页重载
                framePath,
                parentOpen: parentItem ? parentItem.classList.contains('is-open') : null,
                openItems: Array.from(document.querySelectorAll('.nv-menu-item.is-open')).length,
                activeLabels: active
            };
        })()`);
        check('shell-no-reload', after.shellMarkKept === true, after);
        check('iframe-navigated', (after.framePath || '').indexOf('/Admin/User') === 0, after);
        check('parent-stays-open', after.parentOpen === true, after);
        check('leaf-highlighted', (after.activeLabels || []).some(t => /用户/.test(t || '')), after);

        ws.close();
    } catch (err) {
        failures++;
        console.log('FAIL exception :: ' + err.message);
    } finally {
        cleanup();
    }
    console.log('TOTAL ' + results.length + ' checks, failures=' + failures);
    process.exit(failures ? 1 : 0);
})();
