---
name: cube-mvc-nova
description: 泰枢物联网中台 Nova 皮肤（NewLife.Cube.Nova RCL，基于 NewLife.Cube MVC）开发与维护技能。当任务涉及 Nova 皮肤视觉/组件/令牌修改、nova-tokens.css 设计令牌增改、皮肤静态资源变更、皮肤构建出包与 IoT.Web 联调时使用。覆盖仓库拓扑、三层令牌体系、加载顺序契约、DLL 内嵌静态资源重建、令牌值保真验证与两仓分归属提交全流程。
agent_created: true
---

# Cube MVC · Nova 皮肤开发与维护（泰枢物联中台）

## 0.0 技能归属与分发（权威源唯一，多端同步）

**权威源（唯一可编辑副本）**：本技能随皮肤仓 git 一起版本管理，路径：
`G:\009repos\002MingJia\NewLife.Cube.Nova\.workbuddy\skills\cube-mvc-nova\`（`SKILL.md` + `references/` + `scripts/`）。

- 修改技能内容（含脚本）**必须先改权威源**，并随皮肤仓一并提交（`git add .workbuddy/skills/cube-mvc-nova/...`），保持技能与皮肤代码同版本演进。
- **分发副本（只读，禁止直接改）**，改权威源后必须同步：
  1. 用户级 `~/.workbuddy/skills/cube-mvc-nova/`——供 WorkBuddy 任意会话（含团队子代理、IoT 仓会话）自动发现加载；
  2. 其他 AI 编码工具（Claude Code、Cursor、Codex 等）——本技能采用开放 Agent Skills 标准（SKILL.md YAML frontmatter + 纯文本资产），把整个 `cube-mvc-nova/` 目录复制到目标工具的技能目录即可（如 Claude Code 的 `~/.claude/skills/`）；无法自动发现的智能体，直接在提示词中指向权威源 SKILL.md 路径并声明「按 cube-mvc-nova 技能处理」。
- 本文档正文不依赖任何特定智能体：构建命令、验证脚本、提交规范均为通用 shell/Python/git 操作；`~` 与机器特定绝对路径（`G:\...`）按目标机器实际布局替换。
- 同步命令参考（Git Bash）：`cp -r <权威源>/SKILL.md <权威源>/references <权威源>/scripts ~/.workbuddy/skills/cube-mvc-nova/`

## 0. 仓库拓扑与构建链（先读，决定一切操作顺序）

| 仓库 | 角色 | 关键事实 |
|---|---|---|
| `G:\009repos\002MingJia\NewLife.Cube.Nova` | 皮肤 RCL（独立 git 仓） | `dotnet build` 输出到共享 Bin：`G:\009repos\Bin\NewLife.Cube.Nova\`（注意在 `009repos` 上一级，**不在** `002MingJia` 下） |
| `G:\009repos\002MingJia\IoT` | 主业务仓 | `IoT.Web.csproj` 以 **DLL 引用**接入皮肤（`HintPath=..\..\..\Bin\NewLife.Cube.Nova\NewLife.Cube.Nova.dll`） |

**铁律：皮肤静态资源经 `CubeEmbeddedFileProvider` 从程序集内嵌提供 ⇒ 任何 `wwwroot/` 下的变更（css/js/图标）必须重建皮肤项目，否则运行时不生效。**

```
# 皮肤变更后的标准构建链（Git Bash 下用相对路径，避免 MSB1001）
cd G:/009repos/002MingJia/NewLife.Cube.Nova && dotnet build -v q
# 验证 DLL 刷新且资源内嵌（二进制 grep）
# 然后 IoT.Web：cd G:/009repos/002MingJia/IoT/Web && dotnet build -v q
```

皮肤 cshtml 视图编译进 DLL；运行期验证需**停站 → 更新 Bin DLL → 重启**（切主题/换皮肤资产＝停站重启，见 IoT 仓工作记忆铁律 15）。

## 1. 设计令牌体系（唯一权威源机制）

**权威源＝皮肤仓 `wwwroot/Content/nova/nova-tokens.css`**（2026-09-29 起）。全两仓只允许此文件定义 `--nv-*`；`nova-ui.css`（皮肤组件层）与 `Web/wwwroot/css/nova-biz.css`（业务组件层）**只消费不定义**。

- 三层架构（docs/66 §1）：色彩原语（`--nv-blue-600` 等）→ 语义令牌（`--nv-primary` 等，**组件唯一可引用层**）→ 组件类。禁止组件层直引原语。
- 命名契约：`--nv-*` 令牌名与 docs/66 原型完全一致，**不改名**；改品牌色/主题只改语义层一行，组件层零改动（docs/81 §3）。
- nova-tokens.css 分段：§1–10 皮肤基座（原语/语义/状态/电量/字体/间距/圆角/阴影/结构/动效/密度）→ §11 业务域令牌（`--nv-lv-*/--nv-biz-*/--nv-ka-*/--nv-lkm-*/--nv-inbox-*`，共 47 个，自 nova-biz.css 归集）→ §11a 密度档 → §12 暗色主题（`body.nv [data-bs-theme="dark"]`，含业务令牌暗色补齐）→ §13 环境覆盖（响应式/高对比 `:root`）。
- 明细速查见 `references/nova-token-map.md`。

**加载顺序契约：`nova-tokens.css` → `nova-ui.css` → `nova-biz.css`**。接入点：
- 皮肤侧：`Views/Nova/_Layout.cshtml`、`Views/Nova/_Frame.cshtml`（`NovaSkin.WithVersion(res + "/nova/nova-tokens.css")`）、`Areas/Admin/Views/User_Nova/Login.cshtml`。
- Web 侧：13 个 `*_Nova` 视图（`<link href="~/Content/nova/nova-tokens.css" asp-append-version="true">`，置于 nova-biz.css 之前）。新增 Nova 业务视图时必须带上此行。

## 2. 常见变更操作

1. **改语义色/换品牌**：只改 nova-tokens.css 语义层（浅色 `:root` + §12 暗色对应行），同步状态色 `--nv-st-*`/`--nv-batt-*` 派生值；组件层不动。
2. **新增语义令牌**：在 nova-tokens.css 语义段成对补浅色与暗色值；禁止在 nova-ui.css/nova-biz.css 里新增定义。
3. **新增业务域令牌组**（如新列表页要独立前缀）：按 §11 模式加入 `:root` + 暗色补齐（硬编码深色文字必须给暗色档，对齐 `--nv-*-text` 暗色值），从组件作用域移除局部定义。
4. **改组件样式**：皮肤组件进 `nova-ui.css`、IoT 业务组件进 `Web/wwwroot/css/nova-biz.css`；遵守「设备卡片↔列表同步」「皮肤是独立 RCL 不得引用业务程序集」等 IoT 仓铁律。
5. **大屏「指挥态」**（docs/81 §3 未落地）：在 nova-tokens.css 语义层扩展新令牌段，严禁复制第二套视图/CSS。

## 3. 验证流程（每次令牌/样式手术必做）

1. **定义点唯一性**：两仓 grep 确认除 nova-tokens.css 外无 `--nv-[a-z0-9-]+\s*:` 定义行。
2. **值保真比对**（重构/归集类变更）：`scripts/verify_token_fidelity.py`，以 git HEAD 版本为基准逐对比对（脚本只读，`git show HEAD:` 解析基准）。注意 `git show` 输出恒为 LF，即使工作区是 CRLF——按 LF 解析。
3. **双构建**：皮肤项目 + IoT.Web 均 0 错误；皮肤构建后确认 `G:\009repos\Bin\NewLife.Cube.Nova\NewLife.Cube.Nova.dll` 时间戳刷新。
4. **运行验证**：停站重启后过一遍浅/暗双主题 + 三档密度 + Nova 业务页（仪表盘/授权列表/告警收件箱）。

## 4. 提交规范

- 两仓**分别提交**（皮肤仓 main、IoT 仓 develop）；只显式 `git add` 自己的文件，**禁 `git add -A`**（IoT 仓常有并发改动与未跟踪目录如 `prototype/`）。
- 提交信息中文走 UTF-8 无 BOM 文件 + `git commit -F`；参考格式 `feat(nova): ...` + 分条说明 + 验证结论。

## 5. 环境陷阱速查（本机 Windows）

- bash 缺 coreutils ⇒ git/dotnet 优先 PowerShell；**PS stdout 常不采集 ⇒ 落盘再 Read**；中文路径/提交信息走 `[IO.File]::WriteAllText`（UTF-8 无 BOM）。
- `git show > 文件`（bash 重定向）落盘为 LF；工作区文件可能是 CRLF ⇒ 脚本解析前先归一换行。
- 临时文件一律 `$env:TEMP`；清理用 `[IO.File]::Delete` + `Test-Path` 复核（`Remove-Item` 可能静默失败）。
- 大批量文本手术优先写 Python 脚本（模式匹配 + 断言 + 幂等 SKIP 分支），改完 Grep 复核落盘。

## 6. 权威文档

- `IoT/docs/66-Nova界面设计规范.md`：三层令牌、组件规格、令牌映射（§7）、无障碍。
- `IoT/docs/81-物联中台数据大屏产品路线与风险评估.md` §3：大屏令牌扩展原则。
- IoT 仓 `.workbuddy/memory/MEMORY.md`：项目工作记忆/铁律索引（含 15/19/23 条 Nova 相关），任何智能体执行前应读取并遵守。

## 7. 外部智能体接入清单（一次性）

1. 复制权威源目录到本工具技能目录（或直接引用其绝对路径）。
2. 确认本机存在两仓（皮肤仓 + IoT 仓）与共享 Bin 目录，路径不符时先向用户确认实际布局再操作。
3. 运行验证脚本需 Python 3.6+（仅标准库，无第三方依赖）：`python scripts/verify_token_fidelity.py --tokens <nova-tokens.css> --source <皮肤仓根>::wwwroot/Content/nova/nova-ui.css ...`。
4. 遵守 §4 提交规范：两仓分别提交、禁 `git add -A`、中文提交信息走 UTF-8 无 BOM 文件 + `git commit -F`。
