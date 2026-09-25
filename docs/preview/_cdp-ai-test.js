/* AI 助手入口 + 诊断弹窗 · CDP 集成测试
 * 前置：pub-verify 实例在 5260（主题 Nova）。Node>=22。 */
const { spawn } = require('child_process');
const fs = require('fs');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9225;
const BASE = 'http://127.0.0.1:5260';
const PROFILE = 'C:\\Users\\thinkpad\\AppData\\Local\\Temp\\nv-cdp-ai';
const results = [];
let failures = 0;
function check(name, cond, detail) {
    results.push((cond ? 'PASS ' : 'FAIL ') + name + (detail ? ' :: ' + JSON.stringify(detail) : ''));
    if (!cond) failures++;
    console.log(results[results.length - 1]);
}
(async () => {
    fs.rmSync(PROFILE, { recursive: true, force: true });
    const edge = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank'], { stdio: 'ignore' });
    try {
        let version = null;
        for (let i = 0; i < 40 && !version; i++) {
            await new Promise(r => setTimeout(r, 500));
            try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch (e) { }
        }
        if (!version) throw new Error('DevTools 未启动');
        const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
        const ws = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        let seq = 0; const pending = new Map();
        ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
        const send = (m, p) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method: m, params: p || {} })); });
        const ev = async (x, a) => {
            const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: !!a });
            if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400));
            return r.result && r.result.result ? r.result.result.value : undefined;
        };
        const nav = async (u) => {
            await send('Page.enable'); await send('Page.navigate', { url: u });
            for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 500)); if ((await ev('document.readyState === "complete"')) === true) break; }
        };
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        await nav(BASE + '/Admin/User/Login');
        const loginStatus = await ev(`(async () => {
            const r = await fetch('/Admin/User/Login', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'username=admin&password=admin&remember=true', credentials: 'same-origin' }); return r.status; })()`, true);
        check('login-post', loginStatus === 200 || loginStatus === 302, { loginStatus });

        // 1. 列表页：悬浮球渲染（位置/尺寸）、图标映射、点击开面板
        await nav(BASE + '/Admin/User/Index');
        const fab = await ev(`(() => {
            const fab = document.getElementById('aiAssistantFab');
            if (!fab) return { found: false };
            const cs = getComputedStyle(fab);
            const r = fab.getBoundingClientRect();
            const ico = fab.querySelector('svg') ? true : false;
            const hdrIcons = Array.from(document.querySelectorAll('.ai-panel-header .ai-panel-actions i')).map(i => i.className);
            return { found: true, pos: cs.position, right: cs.right, bottom: cs.bottom, w: r.width, ico: ico, hdrIcons: hdrIcons.slice(0, 3) };
        })()`);
        check('fab-rendered', fab.found === true && fab.pos === 'fixed' && fab.w === 48 && fab.ico === true, fab);
        check('fab-icons-remapped', fab.hdrIcons.length >= 3 && fab.hdrIcons.every(c => /ti /.test(c)), fab);

        const open = await ev(`(() => {
            const fab = document.getElementById('aiAssistantFab');
            fab.click();
            const panel = document.getElementById('aiAssistantPanel');
            return { display: getComputedStyle(panel).display, open: document.getElementById('aiAssistant').classList.contains('panel-open') };
        })()`);
        check('panel-opens', open.display !== 'none' && open.open === true, open);

        // 2. 工作台：AI 诊断按钮 → 弹窗显示（jQuery modal 垫片生效）
        await nav(BASE + '/Admin/Index/Dashboard');
        const diag = await ev(`(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => /AI 诊断/.test(b.textContent));
            if (!btn) return { btn: false };
            const ico = btn.querySelector('i');
            const iconCls = ico ? ico.className : null;
            btn.click();
            return { btn: true, iconCls: iconCls };
        })()`);
        check('diag-btn', diag.btn === true, diag);
        check('diag-icon-remapped', diag.iconCls && /ti /.test(diag.iconCls), diag);
        await sleep(600);
        const modal = await ev(`(() => {
            const m = document.getElementById('aiDiagnoseModal');
            if (!m) return { found: false };
            const shown = m.classList.contains('show') || getComputedStyle(m).display === 'block';
            const dlg = !!m.querySelector('.modal-dialog');
            const subtitle = (document.getElementById('aiDiagnoseSubtitle') || {}).textContent || '';
            const status = (document.getElementById('aiDiagStatus') || {}).textContent || '';
            return { found: true, shown: shown, dlg: dlg, subtitle: subtitle, status: status };
        })()`);
        check('diag-modal-shown', modal.found === true && modal.shown === true && modal.dlg === true, modal);
        // 关闭（data-dismiss 垫片）
        const closed = await ev(`(() => {
            const m = document.getElementById('aiDiagnoseModal');
            const btn = m.querySelector('[data-dismiss="modal"]');
            if (btn) btn.click();
            return new Promise(res => setTimeout(() => {
                res({ shown: m.classList.contains('show') });
            }, 500));
        })()`, true);
        check('diag-modal-dismiss', closed.shown === false, closed);

        ws.close();
    } catch (err) {
        failures++;
        console.log('FAIL exception :: ' + err.message);
    } finally {
        try { edge.kill('SIGKILL'); } catch (e) { }
        setTimeout(() => { try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch (e) { } }, 2000);
    }
    console.log('checks=' + results.length + ' failures=' + failures);
    process.exit(failures ? 1 : 0);
})();
