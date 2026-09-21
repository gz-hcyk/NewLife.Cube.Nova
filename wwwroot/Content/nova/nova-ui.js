/*!
 * Nova 皮肤交互层 —— 零 jQuery，原型 nova-ui.js + MVC 落地适配脚本
 * 契约：window.nv { theme, density, sidebar, drawer, toast, icons, nav, refreshBulk, reveal, countUp, gauge, live }
 * 兼容：window.Nova { refresh, applyTheme, highlight }
 * 详见文件末尾「MVC 落地适配脚本」注释。
 */

/* ============================================================================
 * 偏好键迁移 —— 必须最先执行（早于下面原型 IIFE 注册 DOMContentLoaded）
 * 旧 nova.js 持久化键：nova.theme / nova.sidebar.mini
 * 原型（本文件下半部分）键：nova-theme / nova-sidebar / nova-density
 * 原型 IIFE 会在 DOMContentLoaded 时立即按新键应用主题与侧栏，若迁移晚于它，
 * 老用户换肤后首次加载会丢一次设置（刷新才恢复）。因此迁移在这里同步跑完。
 * ==========================================================================*/
(function () {
    try {
        var LS = window.localStorage;
        function get(k) { try { return LS.getItem(k); } catch (e) { return null; } }
        function set(k, v) { try { LS.setItem(k, v); } catch (e) { } }
        function del(k) { try { LS.removeItem(k); } catch (e) { } }
        if (get('nova-theme') === null && get('nova.theme') !== null) {
            set('nova-theme', get('nova.theme'));
            del('nova.theme');
        }
        if (get('nova-sidebar') === null && get('nova.sidebar.mini') !== null) {
            set('nova-sidebar', get('nova.sidebar.mini') === '1' ? '1' : '0');
            del('nova.sidebar.mini');
        }
    } catch (e) { /* localStorage 不可用（隐私模式）则跳过 */ }
})();

/* ============================================================================
 * nova-ui.js —— Nova 界面原型交互脚本（零依赖）
 * 与生产版 nova.js 的关系：本文件只服务原型，命名空间同走 nv；生产落地时
 * 「主题/密度/侧栏」三段可原样并入 nova.js，其余仅为原型演示用。
 * 约定（与现网 nova.js 一致）：
 *   - 主题持久化键  nova-theme     值 light | dark      → <html data-bs-theme>
 *   - 密度持久化键  nova-density   值 compact | cozy    → <html data-nv-density>
 *   - 侧栏持久化键  nova-sidebar   值 1 | 0             → .nv-shell.is-mini
 * ==========================================================================*/
(function () {
    'use strict';

    var html = document.documentElement;
    var LS = window.localStorage;

    function get(k, d) { try { var v = LS.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
    function set(k, v) { try { LS.setItem(k, v); } catch (e) { /* 隐私模式忽略 */ } }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ------------------------------------------------------------------ 图标
     * 现网 277 处 fa-* / glyphicon-* 因 Nova 未内置 Font Awesome 而全部断链。
     * 原型改为内联 SVG（当前色描边，天然适配深浅主题），用法：
     *   <i class="nv-ico" data-nv-ico="lock"></i>
     * JS 启动时一次性注入 <svg>，HTML 侧保持可读。
     * -------------------------------------------------------------------- */
    var P = {
        dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
        cpu: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/>',
        list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
        form: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M15 8l2.5 2.5"/>',
        building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
        pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
        bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
        trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
        refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
        upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
        filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
        columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
        sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        collapse: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 10l-2 2 2 2"/>',
        battery: '<rect x="1" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M4 10v4" stroke-width="3"/>',
        wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19.5h.01M1.5 9a15 15 0 0 1 21 0"/>',
        door: '<path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><circle cx="14.5" cy="12" r="1"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
        chevron_right: '<path d="M9 6l6 6-6 6"/>',
        chevron_down: '<path d="M6 9l6 6 6-6"/>',
        chevron_up: '<path d="M6 15l6-6 6 6"/>',
        chevron_left: '<path d="M15 6l-6 6 6 6"/>',
        more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
        external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a2 2 0 1 1 0-4 1.7 1.7 0 0 0 1.5-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 4.6a2 2 0 1 1 4 0 1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 11a2 2 0 1 1 0 4z"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
        chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3.5 3L21 6"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
        save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
        send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
        eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
        lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
        battery_low: '<rect x="1" y="7" width="17" height="10" rx="2"/><path d="M22 11v2"/><path d="M4 10v4" stroke-width="3"/>',
        grid: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
        activity: '<path d="M22 12h-4l-3 8-4-16-3 8H2"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>',
        zap: '<path d="M13 2 3 14h8l-1 8 10-12h-8z"/>'
    };
    var FALLBACK = '<rect x="4" y="4" width="16" height="16" rx="2"/>';

    function svg(name) {
        var body = P[name] || FALLBACK;
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
    }
    function hydrateIcons(root) {
        $all('[data-nv-ico]', root).forEach(function (el) {
            if (el.getAttribute('data-nv-done') === '1') return;
            var name = el.getAttribute('data-nv-ico');
            if (!el.classList.contains('nv-ico')) el.classList.add('nv-ico');
            el.innerHTML = svg(name);
            el.setAttribute('data-nv-done', '1');
        });
    }
    window.nvIcon = { html: svg, hydrate: hydrateIcons };

    /* ---------------------------------------------------------------- 主题 */
    function applyTheme(t) {
        html.setAttribute('data-bs-theme', t);
        set('nova-theme', t);
        $all('[data-nv-theme-ico]').forEach(function (el) {
            el.setAttribute('data-nv-ico', t === 'dark' ? 'sun' : 'moon');
            el.removeAttribute('data-nv-done');
        });
        hydrateIcons(document);
        broadcast('theme', t);
    }
    function applyDensity(d) {
        html.setAttribute('data-nv-density', d);
        set('nova-density', d);
        $all('[data-nv-density-val]').forEach(function (el) { el.textContent = d === 'cozy' ? '宽松' : '紧凑'; });
    }

    /* ------------------------------------------------- 与 iframe 内容页同步
     * index.html 是外壳，pages/*.html 跑在 iframe 里。file:// 下 iframe 属
     * 不透明源，父页无法直接操作其 DOM，所以统一走 postMessage 单向广播。
     * ---------------------------------------------------------------- */
    function broadcast(key, value) {
        var f = document.getElementById('main');
        if (f && f.contentWindow) f.contentWindow.postMessage({ nv: key, value: value }, '*');
    }
    function pendingState() { return { theme: html.getAttribute('data-bs-theme'), density: html.getAttribute('data-nv-density') }; }

    /* ---------------------------------------------------------------- 侧栏 */
    function applySidebar(mini) {
        var shell = document.querySelector('.nv-shell');
        if (shell) shell.classList.toggle('is-mini', mini);
        set('nova-sidebar', mini ? '1' : '0');
    }
    function applyDrawer(on) {
        var shell = document.querySelector('.nv-shell');
        if (shell) shell.classList.toggle('is-drawer', !!on);
    }

    /* ------------------------------------------------------------ 表格全选 */
    function refreshBulk() {
        var main = document.getElementById('main');
        var root = document.querySelector('.nv-table-wrap') || document;
        var boxes = $all('.nv-table tbody input[type=checkbox]', root);
        if (!boxes.length) {
            var bar = document.querySelector('.nv-bulkbar');
            if (bar) bar.classList.remove('is-on');
            return;
        }
        var n = boxes.filter(function (b) { return b.checked; }).length;
        var head = document.querySelector('.nv-table thead input[type=checkbox]');
        if (head) {
            head.checked = n > 0 && n === boxes.length;
            head.indeterminate = n > 0 && n < boxes.length;
        }
        var bar = document.querySelector('.nv-bulkbar');
        if (bar) {
            bar.classList.toggle('is-on', n > 0);
            var c = bar.querySelector('.nv-bulkbar-count b');
            if (c) c.textContent = n;
        }
        $all('.nv-table tbody tr').forEach(function (tr) {
            var cb = tr.querySelector('input[type=checkbox]');
            if (cb) tr.classList.toggle('is-selected', cb.checked);
        });
    }

    /* ------------------------------------------------------- 原型导航（外壳）
     * 菜单项激活态挂在 .nv-menu-item（与 nova.css 的 ::before 竖条一致），
     * 不是挂在 <a> 上 —— 这是现网 _Left_Item 的既有契约。
     * ---------------------------------------------------------------- */
    function markActive(path) {
        if (!path) return;
        $all('.nv-menu-item').forEach(function (li) {
            var a = li.querySelector('.nv-menu-link[data-nav]');
            li.classList.toggle('is-active', !!a && a.getAttribute('data-nav') === path);
        });
        $all('.nv-menu-item.is-active').forEach(function (li) {
            var p = li.parentElement;
            while (p && p !== document.body) {
                if (p.classList && p.classList.contains('nv-submenu')) {
                    var owner = p.previousElementSibling;
                    /* 展开所属一级菜单，收起同级其他菜单 */
                    $all('.nv-menu-item.is-open').forEach(function (o) {
                        if (o !== owner) o.classList.remove('is-open');
                    });
                    if (owner) owner.classList.add('is-open');
                    break;
                }
                p = p.parentElement;
            }
        });
    }

    function shellNavigate(url, title, path) {
        var f = document.getElementById('main');
        if (f) f.src = url;
        var t = document.getElementById('pageTitle');
        if (t && title) t.textContent = title;
        markActive(path || url);
    }

    /* ---------------------------------------------------------------- Toast */
    function toast(msg, kind) {
        var host = document.querySelector('.nv-toast-host');
        if (!host) {
            host = document.createElement('div');
            host.className = 'nv-toast-host';
            document.body.appendChild(host);
        }
        var ico = kind === 'success' ? 'check' : kind === 'danger' ? 'alert' : kind === 'warning' ? 'alert' : 'info';
        var el = document.createElement('div');
        el.className = 'nv-toast' + (kind ? ' nv-toast-' + kind : '');
        el.innerHTML = '<i class="nv-ico nv-toast-ico" data-nv-ico="' + ico + '"></i><span>' + msg + '</span>';
        host.appendChild(el);
        hydrateIcons(el);
        setTimeout(function () {
            el.style.transition = 'opacity .2s';
            el.style.opacity = '0';
            setTimeout(function () { el.remove(); }, 220);
        }, 2600);
    }

    /* ------------------------------------------------- 滚动揭示（入场动效）
     * 内容页带 .nv-reveal 的元素进入视口时加 .is-in，触发 CSS nv-rise 动画。 */
    function reveal() {
        var els = $all('.nv-reveal:not(.is-in)');
        if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
        if (!reveal._io) {
            reveal._io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) { en.target.classList.add('is-in'); reveal._io.unobserve(en.target); }
                });
            }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
        }
        els.forEach(function (e) { reveal._io.observe(e); });
    }

    /* ------------------------------------------------- 数字滚动（count-up）
     * 元素带 data-count="目标值" 即自动从 0 滚动到目标；prefers-reduced-motion 直接落定。 */
    function prefersReduced() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    function countUp(el, to, dur) {
        to = parseFloat(to);
        if (isNaN(to)) return;
        var from = parseFloat((el.getAttribute('data-count-from') || '').replace(/[^\d.\-]/g, '')) || 0;
        if (prefersReduced()) { el.textContent = Math.round(to).toLocaleString('en-US'); return; }
        var d = dur || 950, t0 = null;
        function step(t) {
            if (!t0) t0 = t;
            var p = Math.min(1, (t - t0) / d);
            var e = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US');
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    /* ------------------------------------------------- 仪表盘环形进度
     * el 为 .nv-gauge 容器，pct ∈ [0,1]。设置 stroke-dashoffset，CSS 已有 1s 过渡。 */
    function gauge(el, pct) {
        if (!el) return;
        var circle = el.querySelector('.nv-gauge-fill');
        if (!circle) return;
        var r = (circle.r && circle.r.baseVal) ? circle.r.baseVal.value : 52;
        var c = 2 * Math.PI * r;
        circle.style.strokeDasharray = c;
        pct = Math.max(0, Math.min(1, pct));
        circle.style.strokeDashoffset = prefersReduced() ? c * (1 - pct) : c * (1 - pct);
    }

    /* ------------------------------------------------- 实时数据模拟（演示用）
     * opts: { feed, items:[fn->html], interval, onTick }
     * 用于高保真仪表盘：事件流滚动追加 + 数字微跳动。返回 {start,stop}。 */
    function live(opts) {
        opts = opts || {};
        var feed = opts.feed ? document.querySelector(opts.feed) : null;
        var timer = null;
        function push() {
            if (feed && opts.items && opts.items.length) {
                var html = opts.items[Math.floor(Math.random() * opts.items.length)]();
                var li = document.createElement('div');
                li.className = 'nv-tl-item nv-reveal is-in';
                li.innerHTML = html;
                hydrateIcons(li);
                feed.insertBefore(li, feed.firstChild);
                while (feed.children.length > 9) feed.removeChild(feed.lastChild);
            }
            if (opts.onTick) opts.onTick();
        }
        function start() { if (!timer) timer = setInterval(push, opts.interval || 2600); }
        function stop() { if (timer) { clearInterval(timer); timer = null; } }
        push(); start();
        return { start: start, stop: stop };
    }

    /* ------------------------------------------------------------ 初始化 */
    function init() {
        /* 1) 恢复用户偏好：三者都是「先读存储再落地」，与 nova.js 一致 */
        applyTheme(get('nova-theme', 'light'));
        applyDensity(get('nova-density', 'compact'));
        var mini = get('nova-sidebar', '0') === '1';
        applySidebar(mini);
        hydrateIcons(document);
        reveal();
        $all('[data-count]').forEach(function (el) { countUp(el, el.getAttribute('data-count')); });

        /* 1.5) 外壳 iframe 每次换页后补推一次主题/密度，防止 ready 消息竞态 */
        var frame = document.getElementById('main');
        if (frame) {
            frame.addEventListener('load', function () {
                var st = pendingState();
                broadcast('theme', st.theme);
                broadcast('density', st.density);
            });
        }

        /* 2) 顶栏控件 */
        document.addEventListener('click', function (e) {
            var t = e.target.closest ? e.target.closest('[data-nv-act]') : null;

            /* 内联图标：若点击的是 svg 内部，向上找带 data-nv-act 的祖先 */
            if (!t) return;
            var act = t.getAttribute('data-nv-act');

            if (act === 'theme') {
                applyTheme(html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark');
            } else if (act === 'density') {
                applyDensity(html.getAttribute('data-nv-density') === 'cozy' ? 'compact' : 'cozy');
            } else if (act === 'sidebar') {
                applySidebar(!document.querySelector('.nv-shell').classList.contains('is-mini'));
            } else if (act === 'burger') {
                applyDrawer(true);
            } else if (act === 'drawer-close') {
                applyDrawer(false);
            } else if (act === 'menu') {
                var item = t.closest('.nv-menu-item');
                if (item) {
                    var open = item.classList.contains('is-open');
                    $all('.nv-menu-item.is-open').forEach(function (li) { if (li !== item) li.classList.remove('is-open'); });
                    item.classList.toggle('is-open', !open);
                }
            } else if (act === 'drawer' || act === 'modal') {
                var sel = t.getAttribute('data-target');
                var el = sel ? document.querySelector(sel) : null;
                if (el) el.classList.add('is-on');
                var mk = document.querySelector('.nv-drawer-mask,.nv-modal-mask');
                if (mk) mk.classList.add('is-on');
            } else if (act === 'close') {
                var sel2 = t.getAttribute('data-target');
                var el2 = sel2 ? document.querySelector(sel2) : null;
                if (el2) el2.classList.remove('is-on');
                $all('.nv-drawer-mask,.nv-modal-mask').forEach(function (m) { m.classList.remove('is-on'); });
            } else if (act === 'toast') {
                toast(t.getAttribute('data-msg') || '操作已完成', t.getAttribute('data-kind') || 'success');
            } else if (act === 'nav') {
                var url = t.getAttribute('data-url');
                var win = t.getAttribute('data-win');
                if (win === 'self') location.href = url;
                else shellNavigate(url, t.getAttribute('data-title'));
            } else if (act === 'tab') {
                var group = t.closest('[data-nv-tabs]');
                if (group) {
                    $all('.nv-seg-btn', group).forEach(function (b) { b.classList.remove('is-on'); });
                    t.classList.add('is-on');
                }
            } else if (act === 'chips-clear') {
                var wrap = t.closest('.nv-chips');
                if (wrap) $all('.nv-chip', wrap).forEach(function (c) { c.remove(); });
            } else if (act === 'chip-x') {
                var chip = t.closest('.nv-chip');
                if (chip) chip.remove();
            } else if (act === 'colpanel') {
                var cp = document.querySelector('.nv-colpanel');
                if (cp) cp.classList.toggle('is-on');
            } else if (act === 'tree-toggle') {
                var node = t.closest('.nv-tree-node');
                if (node) {
                    var kids = node.nextElementSibling;
                    var isOpen = node.classList.toggle('is-open');
                    if (kids && kids.classList.contains('nv-tree-children')) kids.hidden = !isOpen;
                }
            }
        });

        /* 3) 全选 / 单选 */
        document.addEventListener('change', function (e) {
            var cb = e.target;
            if (!cb || cb.type !== 'checkbox') return;
            if (cb.closest('.nv-table')) {
                if (cb.closest('thead')) {
                    var wrap = cb.closest('.nv-table-wrap') || document;
                    $all('.nv-table tbody input[type=checkbox]', wrap).forEach(function (b) { b.checked = cb.checked; });
                }
                refreshBulk();
            }
        });

        /* 4) 行双击进编辑（与现网一致：行为 .editcell 的单元格双击） */
        document.addEventListener('dblclick', function (e) {
            var cell = e.target.closest ? e.target.closest('td') : null;
            if (!cell || !cell.classList.contains('editcell')) return;
            var tr = cell.closest('tr');
            var id = tr && tr.getAttribute('data-id');
            toast('双击进入编辑：ID=' + (id || '?'), 'info');
        });

        /* 5) 内容页：向父页报告自身信息，并接收外壳广播的主题/密度 */
        var isFrame = window.self !== window.top;
        if (!isFrame) {
            /* 独立打开内容页时也要有内容页壳自己的主题能力 */
        }
        window.addEventListener('message', function (ev) {
            var d = ev.data || {};
            if (d.nv === 'theme') applyTheme(d.value);
            else if (d.nv === 'density') applyDensity(d.value);
        });
        if (isFrame && window.parent) {
            window.parent.postMessage({
                nv: 'ready',
                title: document.title,
                path: (document.body && document.body.getAttribute('data-nv-page')) || '',
                height: document.body.scrollHeight
            }, '*');
        }

        /* 6) 外壳接收内容页 ready：回推主题/密度，同步标题与菜单激活态 */
        window.addEventListener('message', function (ev) {
            var d = ev.data || {};
            if (d.nv !== 'ready') return;
            var st = pendingState();
            broadcast('theme', st.theme);
            broadcast('density', st.density);
            var t = document.getElementById('pageTitle');
            if (t && d.title) t.textContent = d.title;
            /* 只有外壳才能看到菜单，内容页自己判断不了该高亮哪一项 */
            markActive(d.path);
            /* 内容页里点「整页跳转」类链接（无 iframe 时）也走外壳导航 */
            var crumb = document.getElementById('crumbTail');
            if (crumb && d.title) crumb.textContent = d.title;
        });

        /* 7) 首屏批量条状态校正 */
        refreshBulk();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    /* 对外暴露，便于原型页内联演示 */
    window.nv = {
        theme: applyTheme, density: applyDensity, sidebar: applySidebar, drawer: applyDrawer,
        toast: toast, icons: hydrateIcons, nav: shellNavigate, refreshBulk: refreshBulk,
        reveal: reveal, countUp: countUp, gauge: gauge, live: live
    };
})();


/* ============================================================================
 * Nova 皮肤 · MVC 落地适配脚本（Cube 魔方 MVC 专用）
 * ----------------------------------------------------------------------------
 * 上半部分是原型 nova-ui.js 的原样落地（图标注入 / 主题 / 密度 / 侧栏 / 抽屉 /
 * Toast / 批量条 / 滚动入场 / 数字滚动 / 仪表盘 / 实时流，以及外壳与 iframe 的
 * postMessage 同步）。本段只补「真实 Cube 站点必须有、原型里不存在」的部分：
 *
 *   ① 偏好键迁移：旧 nova.js 用 nova.theme / nova.sidebar.mini，原型用 nova-theme /
 *      nova-sidebar。首次加载时搬运一次，老用户换肤后不丢设置。
 *   ② 通用通知条：业务侧（LicenseNoticeHelper）只输出 .nv-notice-host 声明式 HTML，
 *      交互（iframe 去重 / 24h 免打扰 / 关闭 / 去处理）全部在这里。铁律 8 双槽：
 *      外壳槽（顶栏下 iframe 上）与内容页槽（data-nv-notice-when="top"）二选一可见。
 *   ③ 菜单高亮：内容页由 Cube 动态加载，外壳按 iframe 实际地址做最长前缀命中，
 *      覆盖深链、后退/前进等不触发 postMessage 的场景。
 *   ④ 列表增强：行双击进编辑（.editcell）、表头全选（data-nv-checkall）、
 *      日期控件（Litepicker 接管 input[dateformat]）。
 *   ⑤ 兼容导出 window.Nova（旧业务视图可能调用 Nova.refresh / Nova.applyTheme）。
 * ========================================================================== */
(function () {
    'use strict';

    var LS = window.localStorage;
    function get(k, d) { try { var v = LS.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
    function set(k, v) { try { LS.setItem(k, v); } catch (e) { } }
    function del(k) { try { LS.removeItem(k); } catch (e) { } }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    /* ---------------------------------------------------------------- ① 偏好键迁移 */
    function migratePrefs() {
        if (get('nova-theme', null) === null && get('nova.theme', null) !== null) {
            set('nova-theme', get('nova.theme', 'light'));
            del('nova.theme');
        }
        if (get('nova-sidebar', null) === null && get('nova.sidebar.mini', null) !== null) {
            set('nova-sidebar', get('nova.sidebar.mini', '0') === '1' ? '1' : '0');
            del('nova.sidebar.mini');
        }
    }

    /* ---------------------------------------------------------------- ② 通用通知条 */
    function initNotice() {
        var DISMISS_KEY = 'nova.notice.dismiss';
        var HOURS = 24;
        var hosts = $all('.nv-notice-host');
        if (!hosts.length) return;

        function reflow() {
            // 外壳 iframe 高度依赖布局流，横幅增减后让浏览器重算
            try { window.dispatchEvent(new Event('resize')); } catch (e) { }
        }

        function remove(host) {
            if (host.parentNode) host.parentNode.removeChild(host);
            reflow();
        }

        var dismissed = null;
        try {
            var raw = get(DISMISS_KEY, null);
            if (raw) {
                var obj = JSON.parse(raw);
                if (obj && obj.until > Date.now()) dismissed = obj.state;
            }
        } catch (e) { }

        hosts.forEach(function (host) {
            // 内容页槽：被外壳 iframe 嵌套时移除，避免与外壳槽重复
            if (host.getAttribute('data-nv-notice-when') === 'top' && window.self !== window.top) {
                remove(host);
                return;
            }

            var bar = host.querySelector('.nv-notice');
            if (!bar) return;

            // 免打扰期内同状态直接不显示
            if (dismissed && dismissed === bar.getAttribute('data-nv-notice')) {
                remove(host);
                return;
            }

            var close = bar.querySelector('[data-nv-notice-close]');
            if (close) {
                close.addEventListener('click', function () {
                    try {
                        set(DISMISS_KEY, JSON.stringify({
                            state: bar.getAttribute('data-nv-notice'),
                            until: Date.now() + HOURS * 3600 * 1000
                        }));
                    } catch (e) { }
                    remove(host);
                });
            }

            var go = bar.querySelector('[data-nv-notice-go]');
            if (go) {
                go.addEventListener('click', function (e) {
                    var href = go.getAttribute('href');
                    if (!href) return;
                    var frm = document.getElementById('main');
                    if (frm && frm.contentWindow) {
                        e.preventDefault();
                        frm.src = href;
                    }
                });
            }
        });
    }

    /* ---------------------------------------------------------------- ③ 菜单高亮（外壳侧） */
    function highlightByPath(path) {
        var links = $all('.nv-menu-link[data-nav]');
        var best = null, bestLen = -1;
        links.forEach(function (a) {
            var href = (a.getAttribute('data-nav') || a.getAttribute('href') || '').toLowerCase();
            if (!href || href === '#' || href.indexOf('http') === 0) return;
            var hit = (path === '/' || path === '') ? (href === '/') : (path.indexOf(href) === 0);
            if (hit && href.length > bestLen) { best = a; bestLen = href.length; }
        });

        $all('.nv-menu-item.is-active').forEach(function (li) { li.classList.remove('is-active'); });
        if (!best) return;

        var item = best.closest ? best.closest('.nv-menu-item') : best.parentElement;
        if (!item) return;
        item.classList.add('is-active');
        var p = item.parentElement;
        while (p && p !== document.body) {
            if (p.classList && p.classList.contains('nv-menu-item')) p.classList.add('is-open');
            p = p.parentElement;
        }
    }

    function initMenuSync() {
        var frm = document.getElementById('main');
        if (!frm) return;

        function fromFrame() {
            try {
                var w = frm.contentWindow;
                if (!w || !w.location) return;
                highlightByPath((w.location.pathname + w.location.search).toLowerCase());
            } catch (e) { /* 跨域或未就绪：忽略 */ }
        }

        frm.addEventListener('load', fromFrame);
        window.addEventListener('DOMContentLoaded', fromFrame);

        // 点击菜单即时高亮（iframe 加载完成后由 load 再校正一次）
        document.addEventListener('click', function (e) {
            var link = e.target && e.target.closest ? e.target.closest('.nv-menu-link') : null;
            if (!link) return;
            var href = (link.getAttribute('data-nav') || link.getAttribute('href') || '');
            if (!href || href === '#' || href.indexOf('http') === 0) return;
            highlightByPath(href.toLowerCase());
        });
    }

    /* ---------------------------------------------------------------- ④ 列表增强 */
    function initRowDoubleClick() {
        if (document.body.getAttribute('data-nv-dblclick') !== '1') return;
        document.addEventListener('dblclick', function (e) {
            var tr = e.target && e.target.closest ? e.target.closest('tr') : null;
            if (!tr) return;
            var cell = tr.querySelector('.editcell');
            if (cell && cell.getAttribute('href')) location.href = cell.getAttribute('href');
        });
    }

    function initCheckAll() {
        document.addEventListener('change', function (e) {
            var el = e.target;
            if (!el || el.type !== 'checkbox') return;
            var name = el.getAttribute('data-nv-checkall');
            if (!name) return;
            $all('input[type="checkbox"][name="' + name + '"]').forEach(function (c) { c.checked = el.checked; });
            if (window.nv && window.nv.refreshBulk) window.nv.refreshBulk();
        });
        // 行内复选框变化时同步批量条
        document.addEventListener('change', function (e) {
            var el = e.target;
            if (el && el.type === 'checkbox' && window.nv && window.nv.refreshBulk) window.nv.refreshBulk();
        });
    }

    function initDatePicker() {
        if (!window.Litepicker) return;
        $all('input[dateformat]').forEach(function (el) {
            if (el.getAttribute('data-nv-lp') === '1') return;
            el.setAttribute('data-nv-lp', '1');
            var df = el.getAttribute('dateformat') || 'yyyy-mm-dd hh:ii:ss';
            var fmt = df
                .replace(/yyyy/g, 'YYYY').replace(/yy/g, 'YY')
                .replace(/dd/g, 'DD')
                .replace(/HH/g, 'HH').replace(/hh/g, 'hh')
                .replace(/ii/g, 'mm').replace(/ss/g, 'ss');
            var withTime = /[Hh]/.test(fmt);
            try {
                new window.Litepicker({
                    element: el,
                    format: fmt,
                    lang: 'zh-CN',
                    singleMode: true,
                    autoApply: !withTime,
                    enableTime: withTime,
                    tooltipText: { one: '天', other: '天' },
                    buttonText: { apply: '确定', cancel: '取消', previousMonth: '上月', nextMonth: '下月' }
                });
            } catch (e) { /* 降级：保持普通文本框 */ }
        });
    }

    /* ---------------------------------------------------------------- ⑤ 启动 */
    function boot() {
        initNotice();
        initMenuSync();
        initRowDoubleClick();
        initDatePicker();
        initCheckAll();
    }

    migratePrefs();

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    // 兼容导出：旧业务视图/脚本可能引用 window.Nova
    window.Nova = {
        refresh: function () {
            boot();
            if (window.nv && window.nv.icons) window.nv.icons(document);
        },
        applyTheme: function (t) { if (window.nv && window.nv.theme) window.nv.theme(t); },
        highlight: highlightByPath
    };
})();
