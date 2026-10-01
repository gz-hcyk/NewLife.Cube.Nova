# Nova 令牌明细速查（nova-tokens.css 分段与业务域令牌清单）

> 权威源：`G:\009repos\002MingJia\NewLife.Cube.Nova\wwwroot\Content\nova\nova-tokens.css`
> 本文是快速索引；改值以文件内注释与 docs/66 为准。

## 文件分段（v3 政务蓝，主色锚点 `#1e5cae`）

| 段 | 选择器 | 内容 |
|---|---|---|
| §1 | `:root` | 色彩原语：`--nv-blue-50..900`（锚点 600）、冷调灰 `--nv-gray-0..900`、green/amber/orange/red/cyan 阶 |
| §2 | `:root` | 语义令牌：`--nv-primary(+hover/active/rgb/weak/weak-2/wash/grad)`、`--nv-success/warning/danger/info(+weak/text)`、`--nv-bg/bg-frame`、`--nv-sidebar-*`(7)、`--nv-surface(-2/-3/hover)`、`--nv-border(-strong)`、`--nv-text(-2/-3/-4/inverse/link)`、`--nv-overlay/tooltip-*` |
| §3 | `:root` | 设备状态 `--nv-st-online/offline/alarm/warn/busy/pending/disabled(+weak)`；电量 `--nv-batt-sufficient/normal/warning/critical/unknown` |
| §4–6 | `:root` | 字体（中文优先栈、mono）、字号 `--nv-fs-11..34`、行高 `--nv-lh-*`、字重、间距 `--nv-sp-1..16`、圆角 `--nv-r-*` |
| §7–9 | `:root` | 阴影 `--nv-sh-1/2/3/focus/primary`、结构尺寸（`--nv-sidebar-w/mini`、`--nv-header-h`、`--nv-ctrl-h(-lg)`、`--nv-row-h`、`--nv-pad-page`、`--nv-z-*` 5 层）、动效 `--nv-dur-*`/`--nv-ease(-out)` |
| §10 | `:root` | 密度（紧凑默认）：`--nv-row-h-eff:34px`、`--nv-cell-py:6px`、`--nv-fs-table`、`--nv-sp-section` |
| §11 | `:root` | 业务域令牌（47 个，见下表） |
| §11a | `[data-nv-density=...]` | standard / cozy·comfortable 档覆盖 |
| §12 | `html[data-bs-theme="dark"]` | 暗色全量 + 业务域暗色补齐（`--nv-ka-ok/warn`、`--nv-lkm-ok/warn` = `#6ed07f/#f0b74a`） |
| §13 | media | `max-width:1200px`/`560px` 页距与侧栏；`prefers-contrast:more` 边框/文字加深 |

## §11 业务域令牌清单（47 个，前缀 → 归属页面）

| 前缀 | 数量 | 归属 | 备注 |
|---|---|---|---|
| `--nv-lv-*` | 6 | 设备卡片/列表电量别名 | 直连 `--nv-batt-*`，`--nv-lv-unknown-text` 直连 `--nv-text-3` |
| `--nv-biz-*` | 5 | 仪表盘 `.nv-biz-board` + 授权页 accent | `line/text/text-weak/bg/accent` |
| `--nv-ka-*` | 17 | 授权/钥匙列表（key-authorize） | `ok/warn` 浅色硬编码 `#1e7e4a/#a66a00`，暗色已补齐 |
| `--nv-lkm-*` | 7 | 锁具介质列表（LockKeyMedia） | 同上暗色补齐 |
| `--nv-inbox-*` | 14 | 告警收件箱 | 全部 var() 引用语义令牌，双主题自动跟随 |

## 消费方与接入点

- **只消费**：皮肤 `nova-ui.css`（组件层）、Web `Web/wwwroot/css/nova-biz.css`（业务组件层）。
- **加载点**（tokens 必须最先）：皮肤 `_Layout.cshtml` / `_Frame.cshtml` / `User_Nova/Login.cshtml`；Web 13 个 `*_Nova` 视图（`~/Content/nova/nova-tokens.css` + `asp-append-version`）。
- 新增 `*_Nova` 视图模板行：

```html
<link rel="stylesheet" href="~/Content/nova/nova-tokens.css" asp-append-version="true" />
<link rel="stylesheet" href="~/css/nova-biz.css" asp-append-version="true" />
```
