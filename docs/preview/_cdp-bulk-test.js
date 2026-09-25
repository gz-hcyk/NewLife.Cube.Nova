/* 跨页保留选择 + data-action 契约 · CDP 集成测试（规范 5.4）
 * 依赖：本机 Edge + Node>=22（全局 WebSocket/fetch）。
 * 前置：pub-verify 实例已在 5260 端口运行（主题 Nova，admin/admin）。
 * 流程：登录 → 部门页第1页勾2行 → 翻第2页验证记忆计数/回填/按钮启停
 *       → 回第1页验证回填 → 取消选择 → 用户页点“批量启用”验证 ajax 契约。
 * 退出码 0 全过；非 0 有断言失败（输出 FAIL 明细）。 */
const { spawn } = require('child_process');
const fs = require('fs');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9223;
const BASE = 'http://127.0.0.1:5260';
const PROFILE = 'C:\\Users\\thinkpad\\AppData\\Local\\Temp\\nv-cdp-profile';
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
        // 等 DevTools 起来
        let version = null;
        for (let i = 0; i < 40 && !version; i++) {
            await new Promise(r => setTimeout(r, 500));
            try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch (e) { }
        }
        if (!version) throw new Error('DevTools 未启动');

        // 新开标签页
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
        const netLog = [];
        ws.onmessage = (e) => {
            const m = JSON.parse(e.data);
            if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
            if (m.method === 'Network.requestWillBeSent') netLog.push(m.params);
        };
        const send = (method, params) => new Promise((res) => {
            const id = ++seq; pending.set(id, res);
            ws.send(JSON.stringify({ id, method, params: params || {} }));
        });
        await send('Network.enable');
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

        // 1. 登录（fetch 表单提交，Cookie 进本 profile）
        await nav(BASE + '/Admin/User/Login');
        const loginStatus = await evaluate(`(async () => {
            const r = await fetch('/Admin/User/Login', { method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'username=admin&password=admin&remember=true', credentials: 'same-origin' });
            return r.status;
        })()`, true);
        check('login-post', loginStatus === 200 || loginStatus === 302, { loginStatus });

        // 2. 部门页第 1 页（每页5条 → 共2页），勾前 2 行
        await nav(BASE + '/Admin/Department?PageSize=5');
        const p1 = await evaluate(`(() => {
            const boxes = document.querySelectorAll('.nv-table tbody input[name=keys], .nv-tree-table tbody input[name=keys]');
            for (let i = 0; i < Math.min(2, boxes.length); i++) {
                boxes[i].checked = true;
                boxes[i].dispatchEvent(new Event('change', { bubbles: true }));
            }
            return {
                boxes: boxes.length,
                firstVals: Array.from(boxes).slice(0, 2).map(b => b.value),
                stored: sessionStorage.getItem('nv-bulk:/Admin/Department'),
                count: (document.querySelector('.nv-bulkbar-count b') || {}).textContent,
                barOn: document.querySelector('.nv-bulkbar') && document.querySelector('.nv-bulkbar').classList.contains('is-on')
            };
        })()`);
        const stored1 = JSON.parse(p1.stored || '[]');
        check('p1-check-2', p1.boxes >= 5 && stored1.length === 2, p1);
        check('p1-count-2', String(p1.count) === '2' && p1.barOn === true, p1);

        // 3. 翻第 2 页：记忆计数保持、批量条亮、按钮可用
        await nav(BASE + '/Admin/Department?PageIndex=2&PageSize=5');
        const p2 = await evaluate(`(() => {
            const boxes = Array.from(document.querySelectorAll('tbody input[name=keys]'));
            return {
                pageBoxes: boxes.length,
                checkedVals: boxes.filter(b => b.checked).map(b => b.value),
                stored: JSON.parse(sessionStorage.getItem('nv-bulk:/Admin/Department') || '[]'),
                count: (document.querySelector('.nv-bulkbar-count b') || {}).textContent,
                barOn: document.querySelector('.nv-bulkbar') && document.querySelector('.nv-bulkbar').classList.contains('is-on'),
                btnsDisabled: Array.from(document.querySelectorAll('[data-action="action"][data-fields]')).map(b => b.disabled)
            };
        })()`);
        check('p2-count-kept', String(p2.count) === '2' && p2.stored.length === 2, p2);
        check('p2-bar-on', p2.barOn === true && p2.btnsDisabled.length > 0 && p2.btnsDisabled.every(d => d === false || d == null), p2);

        // 4. 回第 1 页：已勾选行回填
        await nav(BASE + '/Admin/Department?PageIndex=1&PageSize=5');
        const back = await evaluate(`(() => {
            const boxes = Array.from(document.querySelectorAll('tbody input[name=keys]'));
            const want = ${JSON.stringify(stored1)};
            const checkedVals = boxes.filter(b => b.checked).map(b => b.value);
            return { checkedVals, want, ok: want.every(v => checkedVals.indexOf(v) >= 0) };
        })()`);
        check('p1-restore', back.ok === true, back);

        // 5. 取消选择：记忆清空、批量条收起
        await evaluate(`(() => {
            const btn = document.querySelector('[data-nv-bulk-clear]');
            if (btn) btn.click();
            return {
                stored: sessionStorage.getItem('nv-bulk:/Admin/Department'),
                count: (document.querySelector('.nv-bulkbar-count b') || {}).textContent,
                barOn: document.querySelector('.nv-bulkbar') && document.querySelector('.nv-bulkbar').classList.contains('is-on')
            };
        })()`).then(clear => {
            check('bulk-clear', clear.stored === null && String(clear.count) === '0' && clear.barOn === false, clear);
        });

        // 6. data-action 契约：用户页勾 1 行点“批量启用”（无害：已启用用户不受影响）
        await nav(BASE + '/Admin/User/Index');
        /* 预包裹 fetch：把响应 JSON 存 sessionStorage（[refresh] 重载后会话存储仍在），
           解决重载抹掉 toast/DOM 证据的问题 */
        await evaluate(`(() => {
            if (window.__fetchPatched) return true;
            window.__fetchPatched = true;
            const of = window.fetch.bind(window);
            window.fetch = function (u, o) {
                return of(u, o).then(async r => {
                    try { sessionStorage.setItem('__test_resp', JSON.stringify(await r.clone().json())); } catch (e) { }
                    return r;
                });
            };
            return true;
        })()`);
        await evaluate(`(() => {
            const box = document.querySelector('.nv-table tbody input[name=keys]');
            if (box) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
            return !!box;
        })()`);
        netLog.length = 0;
        const clickedBtn = await evaluate(`(() => {
            const btns = Array.from(document.querySelectorAll('[data-action="action"][data-fields]'));
            const b = btns.find(x => /批量启用/.test(x.textContent));
            if (b) b.click();
            return !!b;
        })()`);
        check('action-button-found', clickedBtn === true);
        await sleep(3000); // 等 ajax + toast + [refresh] 重载
        /* toast 随 [refresh] 重载消失，用 Network 日志取证请求、会话存储取证响应 */
        const req = netLog.find(n => (n.request.url || '').indexOf('/Admin/User/EnableSelect') >= 0);
        check('action-request', !!req && (req.request.url || '').indexOf('keys=') >= 0, req ? { url: req.request.url.slice(0, 160), method: req.request.method } : null);
        const after = await evaluate(`(() => ({
            resp: sessionStorage.getItem('__test_resp'),
            stored: sessionStorage.getItem('nv-bulk:/Admin/User/Index'),
            count: (document.querySelector('.nv-bulkbar-count b') || {}).textContent,
            url: location.pathname
        }))()`);
        let respObj = null;
        try { respObj = JSON.parse(after.resp || 'null'); } catch (e) { }
        check('action-response-json', !!respObj && !!(respObj.url || respObj.data || respObj.message), { resp: after.resp && after.resp.slice(0, 200) });
        check('action-store-cleared', after.stored === null, { stored: after.stored, count: after.count, url: after.url });

        ws.close();
    } catch (err) {
        failures++;
        console.log('FAIL exception :: ' + err.message);
    } finally {
        cleanup();
    }
    console.log('TOTAL ' + (results.length + (failures && !results.length ? 1 : 0)) + ' checks, failures=' + failures);
    process.exit(failures ? 1 : 0);
})();
