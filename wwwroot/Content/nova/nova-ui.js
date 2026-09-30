/*!
 * Nova 皮肤交互层 —— 零 jQuery，原型 nova-ui.js + MVC 落地适配脚本
 * 契约：window.nv { theme, density, sidebar, drawer, toast, confirm, icons, nav, refreshBulk, reveal, countUp, gauge, live }
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
 *   - 密度持久化键  nova-density   值 comfortable | standard | compact（cozy 为历史别名→comfortable） → <html data-nv-density>
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
    /* 密度三档：舒适 comfortable / 标准 standard / 紧凑 compact（compact 为默认基值）。
       历史键名 cozy 归一化为 comfortable，存量偏好不受影响。 */
    var DENSITIES = ['comfortable', 'standard', 'compact'];
    var DENSITY_LABEL = { comfortable: '舒适', standard: '标准', compact: '紧凑' };
    function normDensity(d) {
        if (d === 'cozy') d = 'comfortable';
        return DENSITIES.indexOf(d) >= 0 ? d : 'compact';
    }
    function applyDensity(d) {
        d = normDensity(d);
        html.setAttribute('data-nv-density', d);
        set('nova-density', d);
        $all('[data-nv-density-val]').forEach(function (el) { el.textContent = DENSITY_LABEL[d]; });
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
        var open = !!on;
        if (shell) shell.classList.toggle('is-drawer', open);
        /* 汉堡与抽屉开合同步；本阶段不做焦点陷阱 */
        $all('[data-nv-act="burger"]').forEach(function (btn) {
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
    }
    /* 菜单分组按钮的 aria-expanded 必须跟着 .is-open，含兄弟关闭 */
    function setMenuExpanded(item, open) {
        if (!item) return;
        var btn = item.querySelector(':scope > button[data-nv-act="menu"]');
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
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
        /* 跨页保留选择（规范 5.4）：MVC 适配器注册 nv.bulkCount 后，
           计数改用 sessionStorage 记忆集合（含其它页已勾选行）。 */
        if (window.nv && window.nv.bulkCount) n = Math.max(n, window.nv.bulkCount());
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
            /* 只匹配直接子级链接：li 内 querySelector 会命中子菜单后代，
               导致父分组在孩子激活时被连带标成 is-active（双高亮） */
            var a = li.querySelector(':scope > .nv-menu-link[data-nav]');
            var on = !!a && a.getAttribute('data-nav') === path;
            li.classList.toggle('is-active', on);
            if (a) {
                if (on) a.setAttribute('aria-current', 'page');
                else a.removeAttribute('aria-current');
            }
        });
        $all('.nv-menu-item.is-active').forEach(function (li) {
            var p = li.parentElement;
            while (p && p !== document.body) {
                if (p.classList && p.classList.contains('nv-submenu')) {
                    /* owner 是 .nv-submenu 的前一个兄弟（父级 button），
                       展开态类名必须挂在 .nv-menu-item 容器上才有 CSS 效果
                       （.nv-menu-item.is-open > .nv-submenu 才显示），
                       挂在 button 上会导致每次跳转后菜单收起 */
                    var owner = p.previousElementSibling;
                    var ownerItem = owner && owner.closest ? owner.closest('.nv-menu-item') : null;
                    /* 展开所属一级菜单，收起同级其他菜单 */
                    $all('.nv-menu-item.is-open').forEach(function (o) {
                        if (o !== ownerItem) {
                            o.classList.remove('is-open');
                            setMenuExpanded(o, false);
                        }
                    });
                    if (ownerItem) {
                        ownerItem.classList.add('is-open');
                        setMenuExpanded(ownerItem, true);
                    }
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
        /* 危险类走 assertive，其余 polite；不改 window.nv.toast(msg, kind) 签名 */
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', kind === 'danger' ? 'assertive' : 'polite');
        el.innerHTML = '<i class="nv-ico nv-toast-ico" data-nv-ico="' + ico + '" aria-hidden="true"></i><span>' + msg + '</span>';
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
    /* Font Awesome → Tabler 图标映射：框架 widget 页（Dashboard 等）用 fa 字体而 Nova 不内置 FA，
       统一换成随皮肤加载的 tabler 图标（ti 类），避免渲染成空心方框。 */
    var FA_MAP = {
        arrows: 'arrows-move', 'ellipsis-v': 'dots-vertical', 'ellipsis-h': 'dots', 'eye-slash': 'eye-off', 'clock-o': 'clock',
        database: 'database', 'exclamation-triangle': 'alert-triangle', warning: 'alert-triangle', 'file-text': 'file-text',
        'file-text-o': 'file-text', 'file-o': 'file', file: 'file', heartbeat: 'heartbeat', history: 'history', home: 'home',
        'line-chart': 'chart-line', 'bar-chart': 'chart-bar', 'bar-chart-o': 'chart-bar', 'pie-chart': 'chart-pie', 'area-chart': 'chart-area',
        navicon: 'menu-2', bars: 'menu-2', reorder: 'menu-2', refresh: 'refresh', server: 'server',
        'sign-in': 'login', 'sign-out': 'logout', signal: 'antenna-bars-5', spinner: 'loader', 'circle-o-notch': 'loader',
        stethoscope: 'stethoscope', tachometer: 'dashboard', dashboard: 'dashboard',
        'th-large': 'layout-grid', th: 'layout-grid', 'th-list': 'list', 'list-alt': 'list-details', 'list-ul': 'list', 'list-ol': 'list-numbers',
        undo: 'arrow-back-up', user: 'user', 'user-o': 'user', 'user-circle': 'user-circle',
        'user-circle-o': 'user-circle', 'user-plus': 'user-plus', 'user-secret': 'user-circle', 'user-times': 'user-x',
        users: 'users', group: 'users', wrench: 'tools',
        /* 菜单常用 Font Awesome（未加载 FA 字体时换成 Tabler） */
        desktop: 'device-desktop', laptop: 'device-laptop', tablet: 'device-tablet', mobile: 'device-mobile', 'mobile-phone': 'device-mobile',
        television: 'device-tv', tv: 'device-tv', cog: 'settings', gear: 'settings', cogs: 'settings', gears: 'settings',
        list: 'list', table: 'table', folder: 'folder', 'folder-o': 'folder', 'folder-open': 'folder', 'folder-open-o': 'folder',
        key: 'key', lock: 'lock', unlock: 'lock-open', 'unlock-alt': 'lock-open', shield: 'shield', sitemap: 'sitemap',
        cube: 'box', cubes: 'box-multiple', book: 'book', calendar: 'calendar', 'calendar-o': 'calendar', bell: 'bell', 'bell-o': 'bell',
        envelope: 'mail', 'envelope-o': 'mail', search: 'search', plus: 'plus', minus: 'minus', edit: 'edit', pencil: 'pencil',
        'pencil-square-o': 'edit', trash: 'trash', 'trash-o': 'trash', download: 'download', upload: 'upload', eye: 'eye',
        globe: 'world', link: 'link', chain: 'link', unlink: 'unlink', 'chain-broken': 'unlink', cloud: 'cloud',
        'cloud-download': 'cloud-download', 'cloud-upload': 'cloud-upload', code: 'code', bug: 'bug',
        info: 'info-circle', 'info-circle': 'info-circle', question: 'help', 'question-circle': 'help',
        check: 'check', times: 'x', close: 'x', remove: 'x', ban: 'ban',
        image: 'photo', 'picture-o': 'photo', photo: 'photo', camera: 'camera', print: 'printer',
        tag: 'tag', tags: 'tags', comment: 'message', 'comment-o': 'message', comments: 'messages', 'comments-o': 'messages', phone: 'phone',
        star: 'star', 'star-o': 'star', heart: 'heart', 'heart-o': 'heart', flag: 'flag', 'flag-o': 'flag', filter: 'filter',
        'power-off': 'power', bolt: 'bolt', flash: 'bolt', 'map-marker': 'map-pin', map: 'map', 'map-o': 'map',
        building: 'building', 'building-o': 'building', briefcase: 'briefcase', 'external-link': 'external-link',
        copy: 'copy', 'files-o': 'copy', clone: 'copy', clipboard: 'clipboard', save: 'device-floppy', 'floppy-o': 'device-floppy',
        plug: 'plug', 'hdd-o': 'device-sd-card', terminal: 'terminal-2', rocket: 'rocket', tasks: 'list-check',
        'id-card': 'id', 'id-card-o': 'id', 'address-card': 'id', 'address-book': 'address-book',
        qrcode: 'qrcode', barcode: 'barcode', money: 'cash', rmb: 'currency-yuan', cny: 'currency-yuan', dollar: 'currency-dollar',
        'credit-card': 'credit-card', 'shopping-cart': 'shopping-cart', gift: 'gift', certificate: 'certificate',
        'graduation-cap': 'school', university: 'building-bank', bank: 'building-bank', 'life-ring': 'lifebuoy', support: 'lifebuoy',
        medkit: 'first-aid-kit', wifi: 'wifi', archive: 'archive', bookmark: 'bookmark', 'bookmark-o': 'bookmark',
        'puzzle-piece': 'puzzle', legal: 'gavel', gavel: 'gavel', share: 'share', repeat: 'repeat', columns: 'columns',
        'keyboard-o': 'keyboard', 'mouse-pointer': 'pointer', sliders: 'adjustments-horizontal', magic: 'wand',
        'lightbulb-o': 'bulb', industry: 'building-factory', truck: 'truck', 'file-pdf-o': 'pdf', 'file-excel-o': 'file-spreadsheet',
        'file-word-o': 'file-text', 'file-code-o': 'file-code', 'file-archive-o': 'file-zip', 'file-image-o': 'photo',
        'check-square': 'square-check', 'check-square-o': 'square-check', 'caret-down': 'caret-down', 'caret-right': 'caret-right',
        'caret-left': 'caret-left', 'caret-up': 'caret-up', 'chevron-down': 'chevron-down', 'chevron-right': 'chevron-right',
        'chevron-left': 'chevron-left', 'chevron-up': 'chevron-up', 'angle-down': 'chevron-down', 'angle-right': 'chevron-right',
        'angle-left': 'chevron-left', 'angle-up': 'chevron-up', 'arrow-left': 'arrow-left', 'arrow-right': 'arrow-right',
        'arrow-up': 'arrow-up', 'arrow-down': 'arrow-down',
        /* AI 助手浮窗 / 诊断弹窗（_AIAssistant.cshtml 与核心工作台视图） */
        expand: 'arrows-maximize', compress: 'arrows-minimize', 'paper-plane': 'send',
        'check-circle': 'circle-check', 'exclamation-circle': 'alert-circle', inbox: 'inbox'
    };
    /* 未映射的 fa-* 用中性圆点，不用齿轮（齿轮专留给 cog/settings）。 */
    var FA_FALLBACK = 'point';
    function remapFaIcons(root) {
        $all('.fa', root).forEach(function (el) {
            var m = el.className.match(/\bfa-([a-z0-9-]+)\b/);
            if (!m) return;
            el.className = 'ti ti-' + (FA_MAP[m[1]] || FA_FALLBACK);
        });
    }

    /* 顶栏菜单搜索：实时过滤侧栏菜单；命中子项的父级保留并临时展开子菜单，清空/ESC 还原 */
    function bindMenuSearch() {
        var input = document.getElementById('nvMenuSearch');
        if (!input) return;
        var all = $all('.nv-menu-item');
        var parents = all.filter(function (li) { return li.querySelector('.nv-submenu'); });
        var leaves = all.filter(function (li) { return !li.querySelector('.nv-submenu'); });
        function labelOf(li) {
            var s = li.querySelector('.nv-menu-link .nv-menu-label');
            return s ? s.textContent.toLowerCase() : '';
        }
        input.addEventListener('input', function () {
            var q = this.value.trim().toLowerCase();
            if (!q) {
                all.forEach(function (li) { li.classList.remove('nv-menu-hide', 'nv-filter-open'); });
                return;
            }
            leaves.forEach(function (li) { li.classList.toggle('nv-menu-hide', labelOf(li).indexOf(q) < 0); });
            parents.forEach(function (li) {
                var childHit = $all('.nv-menu-item', li).some(function (c) { return !c.classList.contains('nv-menu-hide'); });
                var hit = labelOf(li).indexOf(q) >= 0 || childHit;
                li.classList.toggle('nv-menu-hide', !hit);
                li.classList.toggle('nv-filter-open', hit);
            });
        });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { this.value = ''; this.dispatchEvent(new Event('input')); }
        });
    }

    function init() {
        /* 1) 恢复用户偏好：三者都是「先读存储再落地」，与 nova.js 一致 */
        applyTheme(get('nova-theme', 'light'));
        applyDensity(get('nova-density', 'compact'));
        var mini = get('nova-sidebar', '0') === '1';
        applySidebar(mini);
        hydrateIcons(document);
        remapFaIcons(document);
        bindMenuSearch();
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
                var cur = normDensity(html.getAttribute('data-nv-density'));
                applyDensity(DENSITIES[(DENSITIES.indexOf(cur) + 1) % DENSITIES.length]);
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
                    $all('.nv-menu-item.is-open').forEach(function (li) {
                        if (li !== item) {
                            li.classList.remove('is-open');
                            setMenuExpanded(li, false);
                        }
                    });
                    item.classList.toggle('is-open', !open);
                    setMenuExpanded(item, item.classList.contains('is-open'));
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

        /* 8) 窄屏抽屉：Escape 关闭。浮层（菜单搜索 / TreeSelect / SelectPop / MultiPop / 下拉）自己消费 Escape 时不抢。 */
        if (document.querySelector('.nv-shell')) {
            document.addEventListener('keydown', function (e) {
                if (e.key !== 'Escape') return;
                var shell = document.querySelector('.nv-shell.is-drawer');
                if (!shell) return;
                if (document.querySelector('.nv-treeselect.is-open, .nv-selectpop.is-open, .nv-multipop.is-open, .dropdown-menu.show, .nv-modal.is-on, .nv-drawer.is-on')) return;
                var tgt = e.target;
                if (tgt && tgt.id === 'nvMenuSearch' && tgt.value) return;
                applyDrawer(false);
            }, true);
        }
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

        $all('.nv-menu-link[data-nav][aria-current="page"]').forEach(function (a) { a.removeAttribute('aria-current'); });
        $all('.nv-menu-item.is-active').forEach(function (li) { li.classList.remove('is-active'); });
        if (!best) return;

        var item = best.closest ? best.closest('.nv-menu-item') : best.parentElement;
        if (!item) return;
        item.classList.add('is-active');
        best.setAttribute('aria-current', 'page');
        var p = item.parentElement;
        while (p && p !== document.body) {
            if (p.classList && p.classList.contains('nv-menu-item')) {
                p.classList.add('is-open');
                var btn = p.querySelector(':scope > button[data-nv-act="menu"]');
                if (btn) btn.setAttribute('aria-expanded', 'true');
            }
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

    /* ------------------------------------------------- ④c 跨页保留选择（规范 5.4）
     * 魔方分页为整页跳转，勾选状态用 sessionStorage 按页面路径记忆：翻页 /
     * 改页大小 / 筛选后自动回填，批量操作条计数为记忆集合总数（含其它页）。
     * 提交时由 initBulkAction 把记忆集合并入 keys 参数；批量成功后清空记忆。
     * sessionStorage 不可用（隐私模式等）时静默降级为页内选择。
     * ---------------------------------------------------------------- */
    var BULK_KEY_PREFIX = 'nv-bulk:';

    function bulkLoad() {
        try { return JSON.parse(sessionStorage.getItem(BULK_KEY_PREFIX + location.pathname) || '[]') || []; }
        catch (e) { return null; }
    }
    function bulkSave(arr) {
        try {
            var k = BULK_KEY_PREFIX + location.pathname;
            if (arr && arr.length) sessionStorage.setItem(k, JSON.stringify(arr));
            else sessionStorage.removeItem(k);
        } catch (e) { /* 静默降级 */ }
    }
    /* 记忆集合大小；sessionStorage 不可用或本页无勾选列时返回 0 */
    function bulkCount() {
        var arr = bulkLoad();
        return arr ? arr.length : 0;
    }
    function bulkClear() {
        bulkSave([]);
        $all('.nv-table tbody input[name=keys], .nv-tree-table tbody input[name=keys]').forEach(function (b) { b.checked = false; });
        if (window.nv && window.nv.refreshBulk) window.nv.refreshBulk();
    }

    function initBulkKeep() {
        var table = document.querySelector('.nv-table tbody') || document.querySelector('.nv-tree-table tbody');
        if (!table || !table.querySelector('input[name=keys]')) return;
        /* 回填：翻页回来后恢复本页已勾选行 */
        var sel = bulkLoad();
        if (sel && sel.length) {
            $all('input[name=keys]', table).forEach(function (b) {
                if (sel.indexOf(b.value) >= 0) b.checked = true;
            });
        }
        /* 勾选变化 → 同步记忆集合 */
        table.addEventListener('change', function (e) {
            var el = e.target;
            if (!el || el.type !== 'checkbox' || el.name !== 'keys') return;
            var arr = bulkLoad();
            if (!arr) return;
            var i = arr.indexOf(el.value);
            if (el.checked && i < 0) arr.push(el.value);
            if (!el.checked && i >= 0) arr.splice(i, 1);
            bulkSave(arr);
        });
        if (window.nv && window.nv.refreshBulk) window.nv.refreshBulk();
    }

    /* ------------------------------------------- ④d data-action 契约（原生补齐）
     * Cube.js（jQuery）在 ACE 等皮肤拦截 [data-action] 发起 ajax；Nova 布局
     * 不加载 Cube.js，此处用原生 fetch 补齐同一契约，行为对齐：
     *   data-fields="keys"  → 序列化同名控件（勾选集合），keys 并入跨页记忆
     *   data-confirm        → nv.confirm 后执行（DOM/异常回退 window.confirm）
     *   data-method         → GET/POST（默认 GET）
     *   响应 { message|data, url, time } → toast 提示；url=[refresh] 刷新，否则跳转
     * 覆盖：批量操作条按钮、行内 删除/恢复、高级菜单（删除选中/同步/备份…）、
     *       data-action="upload" 文件导入。
     * ---------------------------------------------------------------- */
    var bulkActionBound = false;

    function serializeFields(fields) {
        var parts = [];
        fields.forEach(function (f) {
            if (f === 'keys') {
                /* 跨页保留选择合并提交：记忆集 ∪ 当前页已勾选 */
                var vals = bulkLoad() || [];
                $all('input[name=keys]:checked').forEach(function (b) {
                    if (vals.indexOf(b.value) < 0) vals.push(b.value);
                });
                vals.forEach(function (v) { parts.push('keys=' + encodeURIComponent(v)); });
                return;
            }
            $all('[name="' + f + '"]').forEach(function (inp) {
                if ((inp.type === 'checkbox' || inp.type === 'radio') && !inp.checked) return;
                if (inp.tagName === 'SELECT' && (inp.value == null || inp.value === '')) return;
                parts.push(encodeURIComponent(f) + '=' + encodeURIComponent(inp.value));
            });
        });
        return parts.join('&');
    }

    function finishAction(rs, usedKeys) {
        if (rs && (rs.message || rs.data) && window.nv && window.nv.toast) {
            window.nv.toast(rs.message || rs.data, rs.result === false || rs.code > 0 ? 'danger' : 'success');
        }
        /* 批量操作成功后清空记忆，避免刷新后回填已处理行 */
        if (usedKeys) bulkClear();
        var u = rs && rs.url, t = rs && +rs.time > 0 ? Math.min(+rs.time, 10) * 1000 : 0;
        if (u === '[refresh]') setTimeout(function () { location.reload(); }, t);
        else if (u) setTimeout(function () { location.href = u; }, t);
    }

    function doClickAction(el) {
        var fields = (el.getAttribute('data-fields') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var body = serializeFields(fields);
        var method = (el.getAttribute('data-method') || 'GET').toUpperCase();
        var url = el.getAttribute('data-url') || el.getAttribute('href') || '';
        if (!url) return;
        if (method === 'GET' && body) url += (url.indexOf('?') >= 0 ? '&' : '?') + body;
        fetch(url, {
            method: method,
            credentials: 'same-origin',
            headers: method === 'GET' ? {} : { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
            body: method === 'GET' ? null : body
        }).then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (rs) { finishAction(rs, fields.indexOf('keys') >= 0); })
            .catch(function () {
                if (window.nv && window.nv.toast) window.nv.toast('请求异常，请稍后重试', 'danger');
            });
    }

    function doFileUpload(el) {
        var fd = new FormData();
        fd.append(el.name || 'file', el.files[0]);
        (el.getAttribute('data-fields') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (f) {
            var inp = document.querySelector('[name="' + f + '"]');
            if (inp) fd.append(f, inp.value);
        });
        var url = el.getAttribute('data-url') || '';
        if (!url) return;
        fetch(url, {
            method: (el.getAttribute('data-method') || 'POST').toUpperCase(),
            credentials: 'same-origin',
            body: fd
        }).then(function (r) { return r.json().catch(function () { return null; }); })
            .then(function (rs) { finishAction(rs, false); })
            .catch(function () {
                if (window.nv && window.nv.toast) window.nv.toast('上传失败，请稍后重试', 'danger');
            });
    }

    /* ------------------------------------------- ④d2 自定义确认框（data-confirm）
     * 内容文档 JS 注入单例，策略同 toast-host：宿主覆写 Layout 也不会丢节点。
     * 复用 .nv-modal / .nv-modal-mask。这不是 Tabler/Bootstrap .modal，勿与 initCompat 混用。
     * 正文与标题只用 textContent。创建失败、节点残缺或打开抛错 → window.confirm。
     * 不替换全局 window.confirm。打开期间忽略第二次打开，避免双击连发两次 fetch。
     * ---------------------------------------------------------------- */
    var confirmPending = null;
    var confirmKeyBound = false;

    function isDanger(el) {
        return !!(el && el.matches && el.matches('.nv-btn-danger, .nv-link-danger'));
    }

    function getConfirmEls() {
        var mask = document.getElementById('nvConfirmMask');
        var modal = document.getElementById('nvConfirm');
        if (!mask || !modal) return null;
        if (!mask.classList.contains('nv-modal-mask') || !modal.classList.contains('nv-modal')) return null;
        if (modal.getAttribute('role') !== 'dialog') return null;
        var title = document.getElementById('nvConfirmTitle');
        var msgEl = document.getElementById('nvConfirmMsg');
        var cancel = modal.querySelector('[data-nv-confirm-cancel]');
        var ok = modal.querySelector('[data-nv-confirm-ok]');
        if (!title || !msgEl || !cancel || !ok) return null;
        if (!modal.contains(title) || !modal.contains(msgEl) || !modal.contains(cancel) || !modal.contains(ok)) return null;
        return { mask: mask, modal: modal, title: title, msg: msgEl, cancel: cancel, ok: ok };
    }

    function closeConfirmUi() {
        var mask = document.getElementById('nvConfirmMask');
        var modal = document.getElementById('nvConfirm');
        if (mask) {
            mask.classList.remove('is-on');
            mask.hidden = true;
        }
        if (modal) {
            modal.classList.remove('is-on');
            modal.hidden = true;
        }
    }

    function finishConfirm(ok) {
        var pending = confirmPending;
        if (!pending) {
            closeConfirmUi();
            return;
        }
        confirmPending = null;
        var trigger = pending.trigger;
        try {
            closeConfirmUi();
        } finally {
            if (trigger && typeof trigger.focus === 'function' && document.documentElement.contains(trigger)) {
                try { trigger.focus(); } catch (e) { }
            }
            try { pending.resolve(!!ok); } catch (e2) { }
        }
    }

    function ensureConfirmDom() {
        if (getConfirmEls()) return;
        /* 残缺节点不修补，交给 confirmDialog 回退 window.confirm */
        if (document.getElementById('nvConfirmMask') || document.getElementById('nvConfirm')) return;
        if (!document.body) return;

        var mask = document.createElement('div');
        mask.className = 'nv-modal-mask';
        mask.id = 'nvConfirmMask';
        mask.hidden = true;

        var modal = document.createElement('div');
        modal.className = 'nv-modal';
        modal.id = 'nvConfirm';
        modal.hidden = true;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'nvConfirmTitle');

        var head = document.createElement('div');
        head.className = 'nv-modal-head';
        var title = document.createElement('h2');
        title.className = 'nv-modal-title';
        title.id = 'nvConfirmTitle';
        title.textContent = '确认';
        head.appendChild(title);

        var body = document.createElement('div');
        body.className = 'nv-modal-body';
        var msgEl = document.createElement('p');
        msgEl.id = 'nvConfirmMsg';
        body.appendChild(msgEl);

        var foot = document.createElement('div');
        foot.className = 'nv-modal-foot';
        var cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'nv-btn';
        cancel.setAttribute('data-nv-confirm-cancel', '');
        cancel.textContent = '取消';
        var ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'nv-btn nv-btn-primary';
        ok.setAttribute('data-nv-confirm-ok', '');
        ok.textContent = '确定';
        foot.appendChild(cancel);
        foot.appendChild(ok);

        modal.appendChild(head);
        modal.appendChild(body);
        modal.appendChild(foot);

        cancel.addEventListener('click', function () { finishConfirm(false); });
        ok.addEventListener('click', function () { finishConfirm(true); });
        mask.addEventListener('click', function () { finishConfirm(false); });

        if (!confirmKeyBound) {
            confirmKeyBound = true;
            document.addEventListener('keydown', function (e) {
                if (e.key !== 'Escape' || !confirmPending) return;
                var dlg = document.getElementById('nvConfirm');
                if (!dlg || !dlg.classList.contains('is-on')) return;
                e.preventDefault();
                e.stopPropagation();
                finishConfirm(false);
            }, true);
        }

        try {
            document.body.appendChild(mask);
            document.body.appendChild(modal);
        } catch (e) {
            if (mask.parentNode) mask.parentNode.removeChild(mask);
            if (modal.parentNode) modal.parentNode.removeChild(modal);
            throw e;
        }
    }

    function openConfirm(msg, opts) {
        opts = opts || {};
        if (confirmPending) return Promise.resolve(false);
        var els = getConfirmEls();
        if (!els) return Promise.resolve(window.confirm(msg));
        return new Promise(function (resolve) {
            var settled = false;
            function done(v) {
                if (settled) return;
                settled = true;
                resolve(!!v);
            }
            confirmPending = { trigger: opts.trigger || null, resolve: done };
            try {
                els.title.textContent = '确认';
                els.cancel.textContent = '取消';
                els.ok.textContent = '确定';
                /* 属性正文可能不可信，禁止 innerHTML */
                els.msg.textContent = msg == null ? '' : String(msg);
                var danger = opts.danger != null ? !!opts.danger : isDanger(opts.trigger);
                els.ok.className = danger ? 'nv-btn nv-btn-danger' : 'nv-btn nv-btn-primary';
                els.mask.hidden = false;
                els.modal.hidden = false;
                els.mask.classList.add('is-on');
                els.modal.classList.add('is-on');
                try { els.cancel.focus(); } catch (eFocus) { }
            } catch (err) {
                confirmPending = null;
                try { closeConfirmUi(); } catch (e2) { }
                try { done(window.confirm(msg)); }
                catch (e3) { done(false); }
            }
        });
    }

    function confirmDialog(msg, opts) {
        try {
            ensureConfirmDom();
            if (!getConfirmEls()) {
                try { closeConfirmUi(); } catch (e1) { }
                return Promise.resolve(window.confirm(msg));
            }
            return openConfirm(msg, opts || {});
        } catch (e) {
            try { closeConfirmUi(); } catch (e1) { }
            try { return Promise.resolve(window.confirm(msg)); }
            catch (e2) { return Promise.resolve(false); }
        }
    }

    function initBulkAction() {
        /* 挂到 window.nv，供批量条“取消选择”与工具栏脚本使用 */
        if (window.nv) {
            window.nv.bulkCount = bulkCount;
            window.nv.bulkClear = bulkClear;
        }
        if (bulkActionBound) return;
        bulkActionBound = true;
        document.addEventListener('click', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('button[data-action="action"],input[data-action="action"],a[data-action="action"]') : null;
            if (!el || el.disabled) return;
            e.preventDefault();
            var cf = el.getAttribute('data-confirm');
            if (cf) {
                confirmDialog(cf, { danger: isDanger(el), trigger: el })
                    .then(function (ok) { if (ok) doClickAction(el); });
            } else {
                doClickAction(el);
            }
        });
        document.addEventListener('change', function (e) {
            var el = e.target;
            if (!el || el.type !== 'file' || el.getAttribute('data-action') !== 'upload') return;
            if (el.files && el.files[0]) doFileUpload(el);
        });
    }

    /* ------------------------------------------- ④e jQuery modal 兼容垫片
     * 魔方核心视图（工作台 AI 诊断弹窗等）按 Bootstrap 3/4 契约调用：
     *   $('#x').modal('show') / <button data-dismiss="modal">
     * Nova 的 Tabler 只内置原生 Bootstrap 5（无 jQuery 插件注册），
     * 这里补 $.fn.modal 薄桥 + data-dismiss 委托，使核心视图开箱可用。
     * ---------------------------------------------------------------- */
    var compatBound = false;
    function initCompat() {
        if (compatBound) return;
        compatBound = true;
        /* Tabler 1.5 的 UMD 导出挂 window.tabler（含 Modal/Dropdown 等 Bootstrap 组件），
           不挂 window.bootstrap；两个来源都试。 */
        var BS = window.bootstrap || window.tabler || {};
        if (window.$ && window.$.fn && !window.$.fn.modal && BS.Modal) {
            window.$.fn.modal = function (action) {
                return this.each(function () {
                    var m = BS.Modal.getOrCreateInstance(this);
                    if (action === 'hide') m.hide();
                    else m.show();
                });
            };
        }
        document.addEventListener('click', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-dismiss="modal"]') : null;
            if (!el) return;
            var modalEl = el.closest('.modal');
            if (modalEl && BS.Modal) {
                e.preventDefault();
                BS.Modal.getOrCreateInstance(modalEl).hide();
            }
        });
    }

    /* ---------------------------------------------------------------- ④b 树表 / 树状下拉 */
    var treeBound = false;

    function treeParentMap(rows, idAttr, parentAttr) {
        var parentOf = {};
        rows.forEach(function (row) {
            parentOf[row.getAttribute(idAttr) || ''] = row.getAttribute(parentAttr) || '';
        });
        return parentOf;
    }
    function buriedUnder(id, parentOf, collapsed) {
        var seen = {};
        var p = parentOf[id];
        var guard = 0;
        while (p && guard++ < 64 && !seen[p]) {
            seen[p] = true;
            if (collapsed[p]) return true;
            p = parentOf[p];
        }
        return false;
    }
    function applyTreeTable(table) {
        var rows = $all('tbody > tr[data-nv-tree-id]', table);
        var collapsed = {};
        rows.forEach(function (tr) {
            if (tr.getAttribute('data-nv-collapsed') === '1') collapsed[tr.getAttribute('data-nv-tree-id')] = true;
        });
        var parentOf = treeParentMap(rows, 'data-nv-tree-id', 'data-nv-tree-parent');
        rows.forEach(function (tr) {
            tr.hidden = buriedUnder(tr.getAttribute('data-nv-tree-id'), parentOf, collapsed);
        });
    }
    function enhanceTreeTable(table) {
        if (table.getAttribute('data-nv-tree-ready') === '1') return;
        table.setAttribute('data-nv-tree-ready', '1');
        var rows = $all('tbody > tr[data-nv-tree-id]', table);
        var min = 0;
        var has = false;
        rows.forEach(function (tr) {
            var depth = parseInt(tr.getAttribute('data-nv-tree-depth') || '0', 10);
            if (!has || depth < min) { min = depth; has = true; }
        });
        var labelIdxAttr = table.getAttribute('data-nv-tree-label');
        var labelIdx = labelIdxAttr == null || labelIdxAttr === '' ? -1 : parseInt(labelIdxAttr, 10);
        rows.forEach(function (tr) {
            var cell = null;
            if (labelIdx >= 0) {
                // 服务端指定的树标签列（通常是名称列）：按列序取，跳过表尾操作列
                var tds = [];
                for (var i = 0; i < tr.children.length; i++) {
                    if (tr.children[i].tagName === 'TD') tds.push(tr.children[i]);
                }
                cell = tds[labelIdx] || null;
            }
            if (!cell) {
                for (var j = 0; j < tr.children.length; j++) {
                    var td = tr.children[j];
                    if (td.tagName !== 'TD') continue;
                    if (td.querySelector('input[type="checkbox"][name="keys"]')) continue;
                    cell = td;
                    break;
                }
            }
            if (!cell || cell.querySelector('.nv-tree-toggle')) return;
            cell.classList.add('nv-tree-cell');
            var depth = parseInt(tr.getAttribute('data-nv-tree-depth') || '0', 10);
            var indent = document.createElement('span');
            indent.className = 'nv-tree-indent';
            indent.style.width = (Math.max(0, depth - min) * 16) + 'px';
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nv-tree-toggle';
            btn.setAttribute('data-nv-tree-fold', '');
            btn.setAttribute('aria-label', '展开或折叠');
            if (tr.getAttribute('data-nv-tree-branch') === '1') btn.classList.add('is-open');
            else btn.classList.add('is-leaf');
            btn.innerHTML = window.nvIcon ? window.nvIcon.html('chevron_right') : '';
            cell.insertBefore(btn, cell.firstChild);
            cell.insertBefore(indent, cell.firstChild);
        });
    }
    function setTreeExpanded(table, open) {
        $all('tbody > tr[data-nv-tree-branch="1"]', table).forEach(function (tr) {
            if (open) tr.removeAttribute('data-nv-collapsed');
            else tr.setAttribute('data-nv-collapsed', '1');
            var btn = tr.querySelector('.nv-tree-toggle');
            if (btn) btn.classList.toggle('is-open', open);
        });
        applyTreeTable(table);
    }
    function initTreeTable() {
        $all('table.nv-tree-table').forEach(enhanceTreeTable);
    }

    function selectedTreeOptions(sel) {
        var list = [];
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].selected && sel.options[i].value !== '') list.push(sel.options[i]);
        }
        return list;
    }
    function paintTreeSelect(box) {
        var sel = box.querySelector('select');
        var label = box.querySelector('.nv-treeselect-value');
        if (!sel || !label) return;
        var multiple = box.getAttribute('data-multiple') === '1';
        var placeholder = box.getAttribute('data-placeholder') || '请选择';
        var picked = selectedTreeOptions(sel);
        $all('.nv-tree-node', box).forEach(function (node) {
            var id = node.getAttribute('data-nv-id') || '';
            var on = false;
            for (var i = 0; i < picked.length; i++) if (picked[i].value === id) on = true;
            node.classList.toggle('is-active', !!id && on);
            var cb = node.querySelector('.nv-tree-check');
            if (cb) cb.checked = on;
        });
        if (!picked.length) {
            label.textContent = placeholder;
            label.classList.add('is-placeholder');
        } else if (!multiple || picked.length <= 2) {
            var names = [];
            for (var n = 0; n < picked.length; n++) names.push(picked[n].text);
            label.textContent = names.join('、');
            label.classList.remove('is-placeholder');
        } else {
            label.textContent = '已选 ' + picked.length + ' 项';
            label.classList.remove('is-placeholder');
        }
    }
    function chooseTreeNode(box, id, on) {
        var sel = box.querySelector('select');
        if (!sel) return;
        var multiple = box.getAttribute('data-multiple') === '1';
        for (var i = 0; i < sel.options.length; i++) {
            var op = sel.options[i];
            if (!multiple) op.selected = op.value === id;
            else if (op.value === id) op.selected = !!on;
        }
        paintTreeSelect(box);
        var hidden = box.querySelector('.nv-treeselect-value-input');
        if (hidden) {
            var ids = [];
            for (var n = 0; n < sel.options.length; n++) {
                if (sel.options[n].selected && sel.options[n].value !== '') ids.push(sel.options[n].value);
            }
            hidden.value = ids.join(',');
        }
        try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { }
        if (!multiple && box.getAttribute('data-autopost') === '1') {
            var form = box.closest('form');
            if (form) form.submit();
        }
    }
    function applyTreeSelectFold(box) {
        var nodes = $all('.nv-tree-node', box);
        var collapsed = {};
        nodes.forEach(function (node) {
            var id = node.getAttribute('data-nv-id') || '';
            if (id && node.getAttribute('data-nv-branch') === '1' && !node.classList.contains('is-open')) collapsed[id] = true;
        });
        var parentOf = treeParentMap(nodes, 'data-nv-id', 'data-nv-parent');
        nodes.forEach(function (node) {
            var id = node.getAttribute('data-nv-id') || '';
            node.hidden = !!id && buriedUnder(id, parentOf, collapsed);
        });
    }
    function filterTreeSelect(box, keyword) {
        var q = (keyword || '').replace(/^\s+|\s+$/g, '').toLowerCase();
        var nodes = $all('.nv-tree-node', box);
        if (!q) {
            nodes.forEach(function (node) { node.hidden = false; });
            applyTreeSelectFold(box);
            return;
        }
        var parentOf = treeParentMap(nodes, 'data-nv-id', 'data-nv-parent');
        var hit = {};
        nodes.forEach(function (node) {
            var text = (node.getAttribute('data-nv-text') || '').toLowerCase();
            if (text.indexOf(q) >= 0) hit[node.getAttribute('data-nv-id') || ''] = true;
        });
        Object.keys(hit).forEach(function (id) {
            var p = parentOf[id];
            var guard = 0;
            while (p && guard++ < 64) { hit[p] = true; p = parentOf[p]; }
        });
        nodes.forEach(function (node) {
            node.hidden = !hit[node.getAttribute('data-nv-id') || ''];
        });
    }
    function closeTreeSelect(box) {
        var pop = box.querySelector('.nv-treeselect-pop');
        var btn = box.querySelector('.nv-treeselect-btn');
        if (pop) pop.hidden = true;
        box.classList.remove('is-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (box.getAttribute('data-multiple') === '1' && box.getAttribute('data-nv-dirty') === '1' && box.getAttribute('data-autopost') === '1') {
            box.removeAttribute('data-nv-dirty');
            var form = box.closest('form');
            if (form) form.submit();
        }
    }
    function openTreeSelect(box) {
        $all('.nv-treeselect.is-open').forEach(function (other) { if (other !== box) closeTreeSelect(other); });
        var pop = box.querySelector('.nv-treeselect-pop');
        var btn = box.querySelector('.nv-treeselect-btn');
        box.classList.add('is-open');
        if (pop) pop.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
        var input = box.querySelector('.nv-treeselect-filter');
        if (input) {
            input.value = '';
            filterTreeSelect(box, '');
            input.focus();
        }
    }
    function initTreeSelect() {
        $all('[data-nv-treeselect]').forEach(paintTreeSelect);
        if (treeBound) return;
        treeBound = true;
        document.addEventListener('click', function (e) {
            var expandBtn = e.target.closest ? e.target.closest('[data-nv-tree-expand]') : null;
            if (expandBtn) {
                var wrap = expandBtn.closest('.nv-table-wrap') || document;
                var table = wrap.querySelector('table.nv-tree-table');
                if (table) setTreeExpanded(table, expandBtn.getAttribute('data-nv-tree-expand') === 'all');
                return;
            }
            var fold = e.target.closest ? e.target.closest('[data-nv-tree-fold]') : null;
            if (fold && fold.closest('table.nv-tree-table')) {
                e.preventDefault();
                var tr = fold.closest('tr');
                if (!tr || tr.getAttribute('data-nv-tree-branch') !== '1') return;
                var willOpen = tr.getAttribute('data-nv-collapsed') === '1';
                if (willOpen) tr.removeAttribute('data-nv-collapsed');
                else tr.setAttribute('data-nv-collapsed', '1');
                fold.classList.toggle('is-open', willOpen);
                applyTreeTable(tr.closest('table'));
                return;
            }
            var box = e.target.closest ? e.target.closest('[data-nv-treeselect]') : null;
            if (!box) {
                $all('.nv-treeselect.is-open').forEach(closeTreeSelect);
                return;
            }
            if (e.target.closest('.nv-treeselect-btn')) {
                if (box.classList.contains('is-open')) closeTreeSelect(box);
                else openTreeSelect(box);
                return;
            }
            var node = e.target.closest('.nv-tree-node');
            if (!node || !box.contains(node)) return;
            if (e.target.closest('[data-nv-tree-fold]')) {
                e.preventDefault();
                if (node.getAttribute('data-nv-branch') === '1') {
                    node.classList.toggle('is-open');
                    var typing = box.querySelector('.nv-treeselect-filter');
                    if (!typing || !typing.value) applyTreeSelectFold(box);
                }
                return;
            }
            var id = node.getAttribute('data-nv-id') || '';
            if (box.getAttribute('data-multiple') === '1') {
                if (!id) return;
                var cb = node.querySelector('.nv-tree-check');
                var turnOn = cb && e.target === cb ? cb.checked : !node.classList.contains('is-active');
                chooseTreeNode(box, id, turnOn);
                box.setAttribute('data-nv-dirty', '1');
                return;
            }
            chooseTreeNode(box, id, true);
            closeTreeSelect(box);
        });
        document.addEventListener('input', function (e) {
            if (!e.target.classList || !e.target.classList.contains('nv-treeselect-filter')) return;
            filterTreeSelect(e.target.closest('[data-nv-treeselect]'), e.target.value);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape' && e.key !== 'Enter') return;
            var box = e.target.closest ? e.target.closest('[data-nv-treeselect]') : null;
            if (!box || !box.classList.contains('is-open')) return;
            if (e.key === 'Enter') e.preventDefault();
            if (e.key === 'Escape' || (e.key === 'Enter' && e.target.classList.contains('nv-treeselect-filter'))) closeTreeSelect(box);
        });
    }

    /* ---------------- 原生单选下拉增强（nv-selectpop） ----------------
       覆盖 .nv-select、框架 select.form-control/.form-select，以及搜索/筛选槽
       （.nv-field-ctl / .nv-filters / .nv-biz-*）内裸 select：闭合态与 Nova 下拉
       观感一致，打开态改为自绘面板（原生 popup 无法样式化）。原生 select 保留在组件内
       （裁剪隐藏），负责表单提交与内联 onchange 自动回发。 */
    var spBound = false;

    function paintSelectPop(box) {
        var sel = box.querySelector('select');
        var val = box.querySelector('.nv-selectpop-value');
        if (!sel || !val) return;
        var cur = null;
        for (var i = 0; i < sel.options.length; i++) if (sel.options[i].selected) { cur = sel.options[i]; break; }
        if (!cur || cur.value === '') {
            val.textContent = box.getAttribute('data-placeholder') || '请选择';
            val.classList.add('is-placeholder');
        } else {
            val.textContent = cur.text;
            val.classList.remove('is-placeholder');
        }
        $all('.nv-selectpop-opt', box).forEach(function (el) {
            el.classList.toggle('is-selected', !!cur && cur.value !== '' && el.getAttribute('data-val') === cur.value);
        });
        box.classList.toggle('is-disabled', !!sel.disabled);
    }

    function closeSelectPop(box) {
        var pop = box.querySelector('.nv-selectpop-pop');
        var btn = box.querySelector('.nv-selectpop-btn');
        if (pop) pop.hidden = true;
        box.classList.remove('is-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    function openSelectPop(box) {
        $all('.nv-selectpop.is-open').forEach(function (other) { if (other !== box) closeSelectPop(other); });
        var pop = box.querySelector('.nv-selectpop-pop');
        var btn = box.querySelector('.nv-selectpop-btn');
        if (!pop) return;
        box.classList.add('is-open');
        pop.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
        var f = box.querySelector('.nv-selectpop-filter');
        if (f) { f.value = ''; filterSelectPop(box, ''); }
        $all('.nv-selectpop-opt', box).forEach(function (el) { el.classList.remove('is-active'); });
        var cur = pop.querySelector('.nv-selectpop-opt.is-selected:not(.is-hidden)') || pop.querySelector('.nv-selectpop-opt:not(.is-hidden)');
        if (cur) {
            cur.classList.add('is-active');
            try { cur.scrollIntoView({ block: 'nearest' }); } catch (e) { }
        }
    }

    /* 单选下拉筛选：按文本过滤选项；清空关键字还原 */
    function filterSelectPop(box, keyword) {
        var q = (keyword || '').replace(/^\s+|\s+$/g, '').toLowerCase();
        $all('.nv-selectpop-opt', box).forEach(function (el) {
            el.classList.toggle('is-hidden', !!q && (el.textContent || '').toLowerCase().indexOf(q) < 0);
        });
    }

    function chooseSelectPop(box, item) {
        var sel = box.querySelector('select');
        if (!sel) return;
        sel.value = item.getAttribute('data-val');
        paintSelectPop(box);
        try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { }
    }

    function spMove(box, dir) {
        var opts = $all('.nv-selectpop-opt', box).filter(function (o) {
            return !o.classList.contains('is-disabled') && !o.classList.contains('is-hidden');
        });
        if (!opts.length) return;
        var idx = -1;
        for (var i = 0; i < opts.length; i++) if (opts[i].classList.contains('is-active')) { idx = i; break; }
        idx = idx < 0 ? (dir > 0 ? 0 : opts.length - 1) : (idx + dir + opts.length) % opts.length;
        opts.forEach(function (o) { o.classList.remove('is-active'); });
        opts[idx].classList.add('is-active');
        try { opts[idx].scrollIntoView({ block: 'nearest' }); } catch (e) { }
    }

    function buildSelectPop(sel) {
        if (sel.getAttribute('data-nv-sp') === '1') return;
        if (sel.multiple || sel.size > 1) return;
        if (sel.closest('[data-nv-treeselect]')) return;
        var ctl = sel.parentElement;
        if (!ctl) return;
        sel.setAttribute('data-nv-sp', '1');
        var box = document.createElement('span');
        box.className = 'nv-selectpop';
        box.setAttribute('data-nv-selectpop', '');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nv-selectpop-btn';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        var val = document.createElement('span');
        val.className = 'nv-selectpop-value';
        btn.appendChild(val);
        var ico = document.createElement('i');
        ico.className = 'nv-ico nv-ico-sm';
        ico.setAttribute('data-nv-ico', 'chevron_down');
        btn.appendChild(ico);
        var pop = document.createElement('div');
        pop.className = 'nv-selectpop-pop';
        pop.setAttribute('role', 'listbox');
        pop.hidden = true;
        // 筛选框：单选下拉支持按关键字过滤选项（与树下拉/多选下拉交互一致）
        var filter = document.createElement('input');
        filter.type = 'search';
        filter.className = 'nv-input nv-selectpop-filter';
        filter.placeholder = '筛选';
        filter.setAttribute('aria-label', '筛选');
        filter.setAttribute('autocomplete', 'off');
        pop.appendChild(filter);
        for (var i = 0; i < sel.options.length; i++) {
            var o = sel.options[i];
            var it = document.createElement('div');
            it.className = 'nv-selectpop-opt';
            it.setAttribute('role', 'option');
            it.setAttribute('data-val', o.value);
            it.textContent = o.text;
            if (o.disabled) it.classList.add('is-disabled');
            pop.appendChild(it);
        }
        box.appendChild(btn);
        box.appendChild(pop);
        ctl.insertBefore(box, sel);
        box.appendChild(sel);
        sel.classList.add('nv-selectpop-native');
        paintSelectPop(box);
    }

    function initSelectPop() {
        /* 显式令牌类 + 框架遗留 form-control/form-select + 搜索/筛选槽内裸 select（自定义 View 漏加 class 时兜底） */
        $all(
            'select.nv-select, select.form-control, select.form-select,' +
            '.nv-field-ctl > select, .nv-filters select, .nv-biz-filters select, .nv-biz-searchbar select'
        ).forEach(buildSelectPop);
        if (spBound) return;
        spBound = true;
        document.addEventListener('input', function (e) {
            if (!e.target.classList || !e.target.classList.contains('nv-selectpop-filter')) return;
            filterSelectPop(e.target.closest('[data-nv-selectpop]'), e.target.value);
        });
        document.addEventListener('click', function (e) {
            var box = e.target.closest ? e.target.closest('[data-nv-selectpop]') : null;
            if (!box) {
                $all('.nv-selectpop.is-open').forEach(closeSelectPop);
                return;
            }
            if (e.target.closest('.nv-selectpop-btn')) {
                if (box.classList.contains('is-disabled')) return;
                if (box.classList.contains('is-open')) closeSelectPop(box);
                else openSelectPop(box);
                return;
            }
            var it = e.target.closest('.nv-selectpop-opt');
            if (it && box.contains(it) && !it.classList.contains('is-disabled')) {
                chooseSelectPop(box, it);
                closeSelectPop(box);
            }
        });
        document.addEventListener('keydown', function (e) {
            var box = e.target.closest ? e.target.closest('[data-nv-selectpop]') : null;
            if (!box) return;
            if (e.target.classList && e.target.classList.contains('nv-selectpop-filter')) {
                if (e.key === 'Escape') { closeSelectPop(box); return; }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    var first = $all('.nv-selectpop-opt', box).filter(function (o) {
                        return !o.classList.contains('is-disabled') && !o.classList.contains('is-hidden');
                    })[0];
                    if (first) { chooseSelectPop(box, first); closeSelectPop(box); }
                }
                return;
            }
            if (e.key === 'Escape') { closeSelectPop(box); return; }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter' && e.key !== ' ') return;
            if (!(e.target.closest && e.target.closest('.nv-selectpop-btn'))) return;
            e.preventDefault();
            if (!box.classList.contains('is-open')) {
                openSelectPop(box);
                spMove(box, e.key === 'ArrowUp' ? -1 : 1);
                return;
            }
            if (e.key === 'ArrowDown') spMove(box, 1);
            else if (e.key === 'ArrowUp') spMove(box, -1);
            else if (e.key === 'Enter') {
                var act = box.querySelector('.nv-selectpop-opt.is-active');
                if (act && !act.classList.contains('is-disabled')) {
                    chooseSelectPop(box, act);
                    closeSelectPop(box);
                }
            }
        });
    }

    function initDatePicker() {
        if (!window.Litepicker) return;
        $all('input[dateformat]').forEach(function (el) {
            if (el.getAttribute('data-nv-lp') === '1') return;
            var df = el.getAttribute('dateformat') || 'yyyy-MM-dd';
            // Litepicker 无时间插件：含时分秒时不要接管，否则 format 里的 HH:mm:ss 会原样写回输入框，
            // 提交变成 "2026-05-26 HH:mm:ss" 导致模型绑定失败。
            if (/[Hh]|ii|ss/.test(df) && /[:：]/.test(df)) return;
            el.setAttribute('data-nv-lp', '1');
            var fmt = df
                .replace(/yyyy/g, 'YYYY').replace(/yy/g, 'YY')
                .replace(/dd/g, 'DD')
                .replace(/HH/g, 'HH').replace(/hh/g, 'hh')
                .replace(/ii/g, 'mm').replace(/ss/g, 'ss');
            try {
                new window.Litepicker({
                    element: el,
                    format: fmt,
                    lang: 'zh-CN',
                    singleMode: true,
                    autoApply: true,
                    tooltipText: { one: '天', other: '天' },
                    buttonText: { apply: '确定', cancel: '取消', previousMonth: '上月', nextMonth: '下月' }
                });
            } catch (e) { /* 降级：保持普通文本框 */ }
        });
    }

    /* ---------------- 原生多选下拉增强（nv-multipop） ----------------
       扁平数据源的多选：下拉面板 = 筛选框 + 全选/清空 + 勾选列表（树下拉仍走 nv-treeselect）。
       原生 select[multiple] 保留在组件内（裁剪隐藏）负责表单提交；勾选状态与 option.selected 双向同步。 */
    var mpBound = false;

    function paintMultiPop(box) {
        var sel = box.querySelector('select');
        var label = box.querySelector('.nv-multipop-value');
        if (!sel || !label) return;
        var placeholder = box.getAttribute('data-placeholder') || '请选择';
        var picked = [];
        for (var i = 0; i < sel.options.length; i++) {
            var op = sel.options[i];
            if (op.selected && op.value !== '') picked.push(op);
        }
        $all('.nv-multipop-item', box).forEach(function (item) {
            var idx = parseInt(item.getAttribute('data-idx'), 10);
            var cb = item.querySelector('.nv-multipop-check');
            if (cb && sel.options[idx]) cb.checked = !!sel.options[idx].selected;
            item.classList.toggle('is-on', !!(sel.options[idx] && sel.options[idx].selected));
        });
        if (!picked.length) {
            label.textContent = placeholder;
            label.classList.add('is-placeholder');
        } else if (picked.length <= 2) {
            var names = [];
            for (var n = 0; n < picked.length; n++) names.push(picked[n].text);
            label.textContent = names.join('、');
            label.classList.remove('is-placeholder');
        } else {
            label.textContent = '已选 ' + picked.length + ' 项';
            label.classList.remove('is-placeholder');
        }
    }

    function syncMultiPop(box) {
        paintMultiPop(box);
        var sel = box.querySelector('select');
        if (sel) { try { sel.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { } }
    }

    function setMultiPopAll(box, on, onlyVisible) {
        var sel = box.querySelector('select');
        if (!sel) return;
        $all('.nv-multipop-item', box).forEach(function (item) {
            if (onlyVisible && item.classList.contains('is-hidden')) return;
            var idx = parseInt(item.getAttribute('data-idx'), 10);
            if (sel.options[idx] && !sel.options[idx].disabled) sel.options[idx].selected = on;
        });
        box.setAttribute('data-nv-dirty', '1');
        syncMultiPop(box);
    }

    function filterMultiPop(box, keyword) {
        var q = (keyword || '').replace(/^\s+|\s+$/g, '').toLowerCase();
        $all('.nv-multipop-item', box).forEach(function (item) {
            item.classList.toggle('is-hidden', !!q && (item.textContent || '').toLowerCase().indexOf(q) < 0);
        });
    }

    function closeMultiPop(box) {
        var pop = box.querySelector('.nv-multipop-pop');
        var btn = box.querySelector('.nv-multipop-btn');
        if (pop) pop.hidden = true;
        box.classList.remove('is-open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        if (box.getAttribute('data-nv-dirty') === '1' && box.getAttribute('data-autopost') === '1') {
            box.removeAttribute('data-nv-dirty');
            var form = box.closest('form');
            if (form) form.submit();
        }
    }

    function openMultiPop(box) {
        $all('.nv-multipop.is-open').forEach(function (other) { if (other !== box) closeMultiPop(other); });
        var pop = box.querySelector('.nv-multipop-pop');
        var btn = box.querySelector('.nv-multipop-btn');
        if (!pop) return;
        box.classList.add('is-open');
        pop.hidden = false;
        if (btn) btn.setAttribute('aria-expanded', 'true');
        var f = box.querySelector('.nv-multipop-filter');
        if (f) { f.value = ''; filterMultiPop(box, ''); f.focus(); }
    }

    function buildMultiPop(sel) {
        if (sel.getAttribute('data-nv-mp') === '1') return;
        if (!sel.multiple || sel.size > 1) return;
        if (sel.closest('[data-nv-treeselect]')) return;
        var ctl = sel.parentElement;
        if (!ctl) return;
        sel.setAttribute('data-nv-mp', '1');
        var box = document.createElement('span');
        box.className = 'nv-multipop';
        box.setAttribute('data-nv-multipop', '');
        box.setAttribute('data-placeholder', sel.getAttribute('data-placeholder') || '请选择');
        if (sel.getAttribute('data-autopost') === '1') box.setAttribute('data-autopost', '1');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nv-multipop-btn';
        btn.setAttribute('aria-haspopup', 'listbox');
        btn.setAttribute('aria-expanded', 'false');
        var val = document.createElement('span');
        val.className = 'nv-multipop-value';
        btn.appendChild(val);
        var ico = document.createElement('i');
        ico.className = 'nv-ico nv-ico-sm';
        ico.setAttribute('data-nv-ico', 'chevron_down');
        btn.appendChild(ico);
        var pop = document.createElement('div');
        pop.className = 'nv-multipop-pop';
        pop.hidden = true;
        var filter = document.createElement('input');
        filter.type = 'search';
        filter.className = 'nv-input nv-multipop-filter';
        filter.placeholder = '筛选';
        filter.setAttribute('aria-label', '筛选');
        filter.setAttribute('autocomplete', 'off');
        pop.appendChild(filter);
        var bar = document.createElement('div');
        bar.className = 'nv-multipop-bar';
        bar.innerHTML = '<a href="javascript:;" data-nv-mp-all>全选</a><a href="javascript:;" data-nv-mp-none>清空</a>';
        pop.appendChild(bar);
        var list = document.createElement('div');
        list.className = 'nv-multipop-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-multiselectable', 'true');
        for (var i = 0; i < sel.options.length; i++) {
            var o = sel.options[i];
            var item = document.createElement('label');
            item.className = 'nv-multipop-item';
            item.setAttribute('data-idx', i);
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'nv-multipop-check';
            cb.checked = !!o.selected;
            cb.disabled = !!o.disabled;
            cb.setAttribute('tabindex', '-1');
            item.appendChild(cb);
            var tx = document.createElement('span');
            tx.textContent = o.text;
            item.appendChild(tx);
            if (o.disabled) item.classList.add('is-disabled');
            list.appendChild(item);
        }
        pop.appendChild(list);
        box.appendChild(btn);
        box.appendChild(pop);
        ctl.insertBefore(box, sel);
        box.appendChild(sel);
        sel.classList.add('nv-multipop-native');
        paintMultiPop(box);
    }

    function initMultiPop() {
        $all('select[multiple]').forEach(buildMultiPop);
        if (mpBound) return;
        mpBound = true;
        document.addEventListener('change', function (e) {
            if (!e.target.classList || !e.target.classList.contains('nv-multipop-check')) return;
            var item = e.target.closest('.nv-multipop-item');
            var box = e.target.closest('[data-nv-multipop]');
            if (!item || !box) return;
            var sel = box.querySelector('select');
            var idx = parseInt(item.getAttribute('data-idx'), 10);
            if (!sel || !sel.options[idx]) return;
            sel.options[idx].selected = e.target.checked;
            box.setAttribute('data-nv-dirty', '1');
            syncMultiPop(box);
        });
        document.addEventListener('input', function (e) {
            if (!e.target.classList || !e.target.classList.contains('nv-multipop-filter')) return;
            filterMultiPop(e.target.closest('[data-nv-multipop]'), e.target.value);
        });
        document.addEventListener('click', function (e) {
            var box = e.target.closest ? e.target.closest('[data-nv-multipop]') : null;
            if (!box) {
                $all('.nv-multipop.is-open').forEach(closeMultiPop);
                return;
            }
            if (e.target.closest('.nv-multipop-btn')) {
                var sel0 = box.querySelector('select');
                if (sel0 && sel0.disabled) return;
                if (box.classList.contains('is-open')) closeMultiPop(box);
                else openMultiPop(box);
                return;
            }
            if (e.target.closest('[data-nv-mp-all]')) { e.preventDefault(); setMultiPopAll(box, true, true); return; }
            if (e.target.closest('[data-nv-mp-none]')) { e.preventDefault(); setMultiPopAll(box, false, true); return; }
        });
        document.addEventListener('keydown', function (e) {
            var box = e.target.closest ? e.target.closest('[data-nv-multipop]') : null;
            if (!box || !box.classList.contains('is-open')) return;
            if (e.key === 'Escape') closeMultiPop(box);
        });
    }

    /* 字段校验：把 data-nv-invalid 接到真实控件的 aria-invalid / aria-describedby */
    function initFieldInvalid() {
        document.querySelectorAll('[data-nv-invalid]').forEach(function (wrap) {
            var id = wrap.getAttribute('data-nv-describedby');
            var el = wrap.querySelector('input:not([type=hidden]),select,textarea');
            if (!el) return;
            el.setAttribute('aria-invalid', 'true');
            if (id) el.setAttribute('aria-describedby', id);
        });
    }

    /* ---------------------------------------------------------------- ⑤ 启动 */
    function boot() {
        initFieldInvalid();
        initNotice();
        initMenuSync();
        initRowDoubleClick();
        initDatePicker();
        initCheckAll();
        initBulkAction();
        initBulkKeep();
        initCompat();
        initTreeTable();
        initTreeSelect();
        initSelectPop();
        initMultiPop();
    }

    migratePrefs();

    /* 解析期即挂出（早于各视图内联脚本的 DOMContentLoaded 初始 sync，
       保证首屏按钮启停就能读到记忆集合计数）。 */
    if (window.nv) {
        window.nv.bulkCount = bulkCount;
        window.nv.bulkClear = bulkClear;
        window.nv.confirm = confirmDialog;
    }

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
