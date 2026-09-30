# 宿主覆写与回归清单

阶段 4 交付的手工检查表。本仓库没有自动化 UI 测试工程；宿主报告「只覆写了部分文件、界面退步」时，按本清单冒烟。不上 axe / Playwright CI。

## 机制

- **静态文件**：`NovaService` 使用 `CompositeFileProvider(Physical WebRoot, Embedded)`。宿主 `wwwroot` 物理文件优先，未命中再回退程序集内嵌资源（`wwwroot/**/*`）。
- **视图**：宿主 `Views/`、`Areas/.../Views/` 与 RCL 同相对路径即覆写。主题经 `_ViewStart` 解析到 `~/Views/{Theme}/_Layout.cshtml`。
- **缓存**：库存布局用 `NovaSkin.WithVersion` 追加 `?v=`。宿主自行复制的 CSS/JS 若没走 `WithVersion`，可能吃到旧缓存。
- **成对加载**：`nova-tokens.css` 与 `nova-ui.css` 要一起在。只换其中一份，`--nv-*` 会断。

外壳与内容页分层不变：`_Frame` 只出现一次（侧栏 + 顶栏 + `iframe#main`）；内容页 `_Layout` 无导航。`ViewData["NoticeBarHtml"]` 与内容页 `data-nv-notice-when="top"` 互斥。

### 选择器兼容（阶段 4）

内容页主区域由 `<div class="nv-container">` 改为：

```html
<main id="nv-main" class="nv-container">
```

- `.nv-container`、`.nv-body > .nv-container` 仍然命中（class 留在 `main` 上，没有多套一层）。
- 标签限定选择器 `div.nv-container` 不再命中。宿主覆写 CSS 时请改用 class。
- 外壳跳过链接是 `<a class="nv-skip nv-sr-only" href="#main">跳到内容</a>`，目标是 iframe `#main`。跨文档辅助技术对 iframe 内焦点的支持有限；内容页在非嵌入打开时自带 `<main id="nv-main">`。
- 窄屏抽屉的 Escape 只在**外壳文档**里生效（焦点在顶栏 / 侧栏）。焦点已在 iframe 内容文档时，本阶段不把 Escape 转给外壳，避免抢走内容页浮层（TreeSelect / SelectPop / MultiPop / 下拉）自己的 Escape。焦点陷阱与 `inert` iframe 不在本阶段。

## A. 原装冒烟（无宿主覆写）

| # | 步骤 | 期望 |
| --- | --- | --- |
| A1 | 登录：错误密码 / 空字段 | `#nv-login-notice` 可见，不出现 `alert()`；密码眼睛切换 `aria-pressed` |
| A2 | 登录：在允许注册时切换登录 / 注册 | 只有一个 pane 可见；回车提交登录；触发器 `aria-selected` 跟当前 pane；pane 为 `role="tabpanel"` |
| A3 | 外壳：Tab 经过顶栏 | 汉堡 / 侧栏 / 搜索 / 密度 / 主题 / 用户按钮有焦点环 |
| A4 | 窄屏：汉堡打开抽屉；点遮罩关闭；焦点仍在外壳时按 Escape | `.nv-shell.is-drawer` 去掉；汉堡 `aria-expanded` 与开合同步。菜单搜索框有内容、或下拉 / 浮层已打开时，Escape 先交给它们，不关抽屉 |
| A5 | 键盘展开菜单分组 | `button[data-nv-act="menu"]` 的 `aria-expanded` 与 `.is-open` 一致；关闭兄弟分组时其 `aria-expanded` 为 `false`；叶子进 iframe |
| A6 | 有数据的列表：空格全选 | 批量条出现，计数 `aria-live` 更新；`chkAll` 名为「全选本页」，行勾选名为「选择该行」 |
| A7 | 列表空 / 筛选空 | `.nv-empty` 且 `role="status"`，文案区分「暂无数据」与「无匹配结果」 |
| A8 | 分页：改 PageSize、跳转、首页末页禁用 | 有可访问名；控制台无脚本错误 |
| A9 | 表单校验失败 | 顶部 `.nv-notice` 为 `role="alert"`；字段 `aria-invalid` 与错误 id。成功状态条为 `role="status"`（`_Form_Header`） |
| A10 | ObjectForm 多分组 | 保留 `data-bs-toggle="tab"`；按钮有 `aria-controls` / `aria-selected`，面板有 `role="tabpanel"` 与 `aria-labelledby` |
| A11 | 主题 + 密度 | `localStorage` 记住；iframe 内容经 postMessage 跟随 |
| A12 | DevTools 模拟 `prefers-reduced-motion: reduce` | 入场 / Toast 无长动画 |
| A13 | 行删除 / 批量删除 | 仍是 `window.confirm`；取消不提交 |
| A14 | File / Db / SetPermission / 用户 Info | 空态与通知条仍在；权限勾选级联仍可用 |
| A15 | 外壳第一个 Tab | 出现「跳到内容」，激活后焦点落到 iframe `#main` |

## B. 部分覆写矩阵（宿主 wwwroot / Views）

| # | 宿主只放了… | 冒烟 |
| --- | --- | --- |
| B1 | 改过的 `wwwroot/Content/nova/nova-ui.css` | 令牌文件仍从内嵌加载；列表 / 表单不是裸样式；焦点环还在 |
| B2 | 只改 `nova-tokens.css` 颜色 | 组件吃到新令牌；暗色主题仍有定义 |
| B3 | 只换 `nova-ui.js` | 主题 / 密度 / 批量条 / `data-confirm` / `data-action` 对库存视图仍可用 |
| B4 | 分叉 `Views/Nova/_Layout.cshtml`（保留 script） | 不出现双菜单；通知槽与外壳互斥；表单仍初始化 `aria-invalid`。若保留内容容器，请用 `<main id="nv-main" class="nv-container">`，不要改回无 class 的包裹层 |
| B5 | 分叉 `Views/Nova/_Frame.cshtml` | iframe `id/name="main"` 稳定；菜单 `data-nav` 高亮；跳过链接若保留，目标仍是 `#main` |
| B6 | 旧版 `Views/Nova/_List_Data.cshtml` | 空表会退回（阶段 1 空行丢失）。宿主必须并入空态行，并保留 `name="keys"`、`#chkAll[data-nv-checkall]` |
| B7 | 分叉 `Areas/.../Login.cshtml` | RSA 相关 id 仍在；通知槽仍在；不要重新依赖已删除的 jquery-3.6 |
| B8 | 只覆写 CSS 或只覆写 JS | 两边都带 `?v=`；硬刷新后不要混用不同阶段的 css/js |
| B9 | 删掉宿主覆写文件 | 回退到内嵌资源，界面恢复 |

## C. 契约冻结点检

改皮肤或覆写时，这些名字不能动：

```text
Frame: iframe#main[name=main]；NoticeBarHtml 互斥；loadbar id
Login: username / password（可见、无 name）/ pwd / pkey* / remember / cube-login / login-btn
List: name=keys；chkAll[data-nv-checkall]；BulkBar data-fields；data-action + data-confirm
Form: 字段 name/id=属性名；data-nv-invalid；route Action 新增判定
SetPermission: p* / pf* / authorize / parentkey / child / pro*；无嵌套 BeginForm
File: data-action=upload + data-fields=r
Static: Physical WebRoot 优先于 Embedded；window.nv.* 公开面不删
```

`window.nv` 公开面至少包括：`theme`、`density`、`sidebar`、`drawer`、`toast`、`icons`、`nav`、`refreshBulk`，以及适配层追加的 `bulkCount` / `bulkClear`。`toast(msg, kind)` 签名不变。

## D. 工作台与内容页眉（阶段 5）

| # | 步骤 | 期望 |
| --- | --- | --- |
| D1 | `Theme=Skin=Nova`，打开 `/Admin/Index/Dashboard` | 命中 `Index_Nova/Dashboard`（欢迎横幅 → KPI → 性能监控 → 系统信息 → 其余卡）。`CubeSetting.StartPage` 未改；`Index_Nova/Main` 仍单独可达 |
| D2 | 隐藏 / 恢复 / 重置布局 | 仍是 `HideWidget` / `SaveOrder` / `ResetLayout`。拖拽用内嵌 SortableJS（不依赖宿主 `jquery-ui.custom.min.js`） |
| D3 | 部件视图 | 有 `Widgets_Nova/{Name}.cshtml` 时优先；否则回退 Ace `Widgets/{Name}.cshtml`。本库不附带三件套副本 |
| D4 | 全局 `EnableNavbar=true` 的列表 / 表单 | 内容页顶出现面包屑 + 标题；`EnableNavbar=false` 无页头。`EnableFooter` 控制 `_Layout_Footer`。外壳 `#crumbTail` 仍在 |

## 本阶段明确不测 / 不做

- 自定义 `data-confirm` Modal（仍是 `window.confirm`）
- `_HtmlEditor` 的 `alert` 改 Toast
- 抽屉焦点陷阱、iframe `inert`
- 密度按钮 `aria-pressed`、表单标题改 `h1`、只给 SetPermission 补 `aria-label`
- Tabler 大版本升级、拆 iframe、重写 SetPermission / RSA / `keys` / `data-action`
