# Nova 对照 Ace 皮肤理念审计

审计只读，未改产品代码。供确认差距后再决定要不要补皮肤，不作为实现方案。

## 对照基准

| 侧 | 版本 |
| --- | --- |
| Nova | 本仓 `main` @ `a9bd26c`（阶段 4b 之后） |
| Ace 契约 | `NewLife.Cube.Core` **6.15.2026.901**（Nova `csproj` 所引；nupkg 2026-09-01）。视图编译进 `NewLife.Cube.dll`，路径与源码树一致 |
| Ace 源码 | [NewLifeX/NewLife.Cube](https://github.com/NewLifeX/NewLife.Cube) `NewLife.CubeNC`，交叉核对 master `47c3ed46`（2026-09-19） |

定位规则以 `NewLife.CubeNC/Common/ThemeViewLocationExpander.cs` 与 `ViewLocationHelper.cs` 为准（`XUnitTest/ViewLocationHelperTests.cs` 锁了默认主题名 `ACE`）。Ace **没有**独立的 `*_ACE` 目录：未带主题后缀的 Area 视图就是 Ace 皮肤；扩展器在默认路径**前面**插入主题路径。

主题 `Nova` 时，分部视图按下面顺序查找（区域页，`{View}` 不含扩展名）：

1. `/Areas/{Area}/Views/{Controller}_Nova/{View}.cshtml`
2. `/Areas/{Area}/Views/{Controller}/{View}.cshtml`（Cube 内置，即 Ace）
3. `/Areas/{Area}/Views/Nova/{View}.cshtml`
4. `/Areas/{Area}/Views/Shared/{View}.cshtml`（Cube 内置）
5. `/Views/Nova/{View}.cshtml`
6. `/Views/Shared/{View}.cshtml`（Cube 内置）

宿主项目里的同路径物理文件优先于 RCL。静态文件由 `NovaService` 的 `CompositeFileProvider`（物理 WebRoot，然后内嵌）提供。

master 比 6.15.2026.901 多出来、本审计不记入「Nova 漏移植」的文件：`Views/Shared/_NotifyBell.cshtml`（ACE `_Navbar` 注入）、`Areas/Cube/Views/ModelTable/_List_Search.cshtml`。宿主若升级到更新的 Cube，这两处会变成新的回落点。

## 一句话总评

**核心列表 / 表单的分部名字和「主题目录 + `{控制器}_{主题}`」查找约定已经落地，但不是严格的 Ace 增量继承。** Nova 把 `Views/Shared` 整树复制进 `Views/Nova`，又漏掉一批 Ace 区域视图；这些漏网页面会在 Nova 布局里直接渲染 Ace 的 Bootstrap 标记。默认首页就是其中一页。

## 已对齐

- **注册**：Ace 是 Cube 内置默认主题（`Theme` / `Skin` 为空即 `ACE`），没有 `UseAce`。Nova 与 Tabler 等外置皮肤同一条路：`UseNova` → `CubeEmbeddedFileProvider` + `UIService.AddTheme("Nova")` + `AddSkin("Nova")`（`NovaService.cs`）。不另写视图扩展器，沿用 Cube 的 `ThemeViewLocationExpander`。
- **主题 vs 皮肤**：`CubeSetting.Theme` 管内容页，`Skin` 管最外层框架。`Admin/Index/Index` 在扩展器里改走 `Skin`（`ThemeViewLocationExpander.PopulateValues`）。`IndexController` 按 UA 返回 `CubeIndex` / `MCubeIndex`。
- **`_ViewStart`**：`Areas/Admin/Views/_ViewStart.cshtml` 与 Cube 相同，`Layout = ~/Views/{Theme}/_Layout.cshtml`，空主题回落 `ACE`。列表 / 表单页再次强制写同一 Layout，避免宿主 `_ViewStart` 覆盖魔方页。
- **外壳 vs 内容页**：Ace 的 `Views/ACE/CubeIndex.cshtml` 是 `Layout = null` 的整页，内含 `_Navbar` + `_Left` + `iframe#main`。内容页 `Views/ACE/_Layout.cshtml` 只有面包屑和 `RenderBody()`，不再嵌菜单。Nova 的 `CubeIndex` / `MCubeIndex` 同样 `Layout = null`，内容页 `Views/Nova/_Layout.cshtml` 无侧栏顶栏。`iframe` 的 `id/name` 仍是 `main`。
- **通用列表链**（`Views/Nova/List.cshtml`，名字与 `Views/Shared/List.cshtml` 一致）：`NavView` → `_List_Toolbar` → `_ECharts` → `_List_Data` → `_List_Pager`。工具栏再拆 `_List_Toolbar_Batch` / `_Custom` / `_Adv` / `_List_Search` → `_Common_List_Search` / `_List_Toolbar_Search`。树列表是 `_ListTree_Data`。Nova 在 Data 与 Pager 之间多插了 `_List_BulkBar`（见刻意差异）。
- **通用表单链**：`AddForm` / `EditForm` / `Form` = `_Form_Header` + `_Form_Body` + `_Form_Footer` + `_Form_Action`。`_Form_Body` → `_Form_Group` 或 `Field.GroupView` → `_Form_Item` → `_Form_*` 类型分部。`Detail` 只有 Body + Footer。
- **登录分部**：`User_Nova/Login.cshtml` 组合 `_Login_Login` / `_Login_Register` / `_Login_Login3`，与 `Areas/Admin/Views/User/` 同名。
- **区域共享导航槽**：`_User_Nav`、`_Object_Nav` 放在 `Areas/Admin/Views/Nova/`，正好是规则第 3 步（`/Areas/Admin/Views/{Theme}/`），用来盖住 Cube 的 `Areas/Admin/Views/Shared/`。这是正确的主题覆写，不是放错目录。
- **`_Navbar` 防回落**：`Views/Nova/_Navbar.cshtml` 转调 `_Layout_Header`，避免框架按名字找到 ACE 的 Bootstrap 顶栏。
- **宿主物理覆写**：覆写点是主题相对路径（`Views/Nova/...`、`Areas/Admin/Views/{Controller}_Nova/...`、`Areas/Admin/Views/Nova/...`），不是 `Views/Shared`。`docs/host-override-checklist.md` 与此一致。

## 差距清单

### 1. 整树复制，Shared 的后续修补进不来 Nova

- **Ace**：`Views/ACE/` 只放外壳差异（约 13 个文件：`CubeIndex`、`MCubeIndex`、`_Layout`、`_Left`、`_Navbar`、`_List_Pager`、`_List_Data_Action`、图标、`_Form_Action` 等）。其余分部留在 `Views/Shared`，主题目录没有的文件自动回落。
- **Nova**：`Views/Nova/` 复制了整份 Shared 列表/表单树（约 90 个 cshtml）。主题路径命中后不再读 `Views/Shared`。
- **影响**：Cube 后来加在 Shared 上的行为不会自动出现在 Nova。已经发生的例子是 `Areas/Admin/Views/Shared/_User_Nav.cshtml` 与 `Areas/Admin/Views/Nova/_User_Nav.cshtml`：
  - Ace 用路由值补 `id`，非系统角色把 `userId` 钳回当前用户，用户标签指向只读 `Detail`，通知链接带 `channel=InApp`。
  - Nova 副本不钳 `userId`，用户标签指向 `Edit`，也不读路由 `id`。
  宿主若只改 `Views/Shared/_List_Data.cshtml`，Nova 列表也不会变。
- **优先级**：P1（维护与权限导航漂移）。不要为了「像 Ace」删掉 `Views/Nova` 副本去回落 Shared，那些文件是 Bootstrap 3 标记。

### 2. 默认工作台仍是 Ace 页

- **Ace**：`CubeSetting.StartPage` 为空时写成 `/Admin/Index/Dashboard`（`Setting.cs`）。`Index/Dashboard.cshtml` 是 Font Awesome + `table` / `widget-*` 工作台，部件默认路径写死为 `~/Areas/Admin/Views/Widgets/{Name}.cshtml`（绝对路径，**不走**主题扩展器），管理员再 `Partial("_AiDiagnoseModal")`。包内部件视图：`Widgets/LoginLog.cshtml`、`Profile.cshtml`、`QuickLink.cshtml`。
- **Nova**：有 `Areas/Admin/Views/Index_Nova/Main.cshtml`（运维中心），**没有** `Index_Nova/Dashboard.cshtml`，也没有 `Widgets_Nova/` 或 `_AiDiagnoseModal`。`docs/Nova界面设计规范.md` §6.5 已规定工作台版面，视图未落地。
- **影响**：`UseNova` 且 `Theme=Skin=Nova` 后，iframe 第一页仍是 Ace 工作台（含 Ace 部件和诊断弹层）。只补 `Widgets_Nova` 而不改 Dashboard 无效，因为路径是绝对的。
- **优先级**：P0。

### 3. 若干区域「数据分部」回落到 Ace 表格，和 Nova 工具栏拼在一页

主题目录只覆盖了搜索条时，数据分部仍命中 Cube 的无后缀目录（查找顺序第 2 步）。

| Ace 文件 | Nova | 页面 |
| --- | --- | --- |
| `Areas/Admin/Views/Log/_List_Data.cshtml` | 仅有 `Log_Nova/_List_Search.cshtml` | 日志列表：Nova 筛选 + Ace `table-bordered` |
| `Areas/Admin/Views/Menu/_ListTree_Data.cshtml` | 仅有 `Menu_Nova/_List_Search.cshtml` | 菜单树表同样混排 |
| `Areas/Admin/Views/UserToken/_List_Data.cshtml` | 无 `UserToken_Nova` | 用户令牌列表整表是 Ace |

- **Ace**：这些是控制器专用数据分部，优先于通用 `Views/Shared/_List_Data.cshtml`。
- **Nova**：通用 `Views/Nova/_List_Data.cshtml` 因此不会被用到。
- **影响**：后台常用列表出现两套 CSS（`nv-*` 工具栏 + Bootstrap 表）。勾选列仍是 Ace 的 `#chkAll`，和 Nova 批量条脚本（`.nv-table`、`data-nv-checkall`）不是同一套标记。
- **优先级**：P1（日志、菜单建议按 P0 对待，若这两页是日常入口）。

### 4. 移动端资料页 / 改密页没有 Nova 视图

- **Ace**：`UserController` 在移动 UA 下返回 `MInfo`、`MChangePassword`、`MLogin`（`Areas/Admin/Views/User/MInfo.cshtml`、`MChangePassword.cshtml`、`MLogin.cshtml` 各自一整页）。
- **Nova**：`User_Nova/MLogin.cshtml` 转为 `Partial("Login")`。没有 `MInfo.cshtml`、`MChangePassword.cshtml`。
- **影响**：手机打开个人资料或修改密码时，内容区是 Ace 页，套在 Nova 的 `_Layout` 里。
- **优先级**：P1。

### 5. 租户成员页与用户字段分部缺失

- **Ace**：`TenantUserController.Manage` → `TenantUser/Manage.cshtml`。表单字段 `GroupView = "_Form_UserId"` → `TenantUser/_Form_UserId.cshtml`（Bootstrap `form-group` + `_SelectUser`）。
- **Nova**：无 `TenantUser_Nova/`。`_SelectUser` 本身会命中 `Views/Nova/_SelectUser.cshtml`，但外层分组标记仍是 Ace。
- **影响**：租户成员管理页和「用户」字段不是 Nova 表单栅格。
- **优先级**：P1。

### 6. Cube 区域没有任何 `*_Nova`

包内、Nova 未覆盖：

- `Areas/Cube/Views/Area/Map.cshtml`、`Area/_List_Search.cshtml`
- `Areas/Cube/Views/PrincipalAgent/_Form_AgentName.cshtml`、`_Form_PrincipalName.cshtml`（控制器把 `GroupView` 指到这两个名字）
- `Areas/Cube/Views/ViewTrace/Index.cshtml`
- `Areas/Cube/Views/Widget/Index.cshtml`

- **影响**：Cube 区域页面在 Nova 主题下整页或整段回落 Ace。委托/代理表单里这两个字段会是 Bootstrap 控件，插在 Nova 表单中间。
- **优先级**：P2。

### 7. 数据库差异页、OAuth 导航条未覆盖

- **Ace**：`DbController` 返回 `Diff` → `Areas/Admin/Views/Db/Diff.cshtml`。`OAuthConfig/_List_Nav.cshtml` 只是包一层 `_Object_Nav`（控制器的 `NavView` 已直接设为 `_Object_Nav`，这条多半是死入口）。
- **Nova**：`Db_Nova` 有 `Index` / `Tables` / `Entities`，没有 `Diff`。没有 `OAuthConfig_Nova`。
- **影响**：模型差异页是 Ace 标记。OAuth 列表导航实际走已覆盖的 `_Object_Nav`，`_List_Nav` 缺口影响面小。
- **优先级**：P2。

### 8. 内容页布局不再组合面包屑 / 页脚分部

- **Ace**：`Views/ACE/_Layout.cshtml` 在 `PageSetting.EnableNavbar` / `EnableFooter` 为真时渲染 `_Layout_Nav`、`_Layout_Footer`。
- **Nova**：`Views/Nova/_Layout.cshtml` 注释写明忽略这两个开关，只渲染 `main#nv-main`。`_Layout_Nav.cshtml`、`_Layout_Footer.cshtml` 仍在目录里，库存链不引用。
- **影响**：宿主只覆写这两个分部，内容页上看不到变化。`PageSetting.EnableNavbar` 对 Nova 内容页无效。规范 §7 仍写「面包屑 + 页面标题」，与布局注释不一致，需产品确认以哪边为准。
- **优先级**：P2（若确认不要面包屑，则改为刻意差异，并删掉或注明死文件）。

### 9. AI 分部文件名大小写与 Ace 不一致

- **Ace**：`Views/Shared/_AiAssistant.cshtml`，`Views/ACE/_Layout.cshtml` 调用 `_AiAssistant`。诊断弹层是 `_AiDiagnoseModal`。
- **Nova**：文件是 `Views/Nova/_AIAssistant.cshtml`，`_Layout` 调用 `_AIAssistant`。没有 `_AiDiagnoseModal`。
- **影响**：Nova 自己的布局能找到自己的文件。Linux 上视图名区分大小写，宿主若按 Ace 名字放置 `Views/Nova/_AiAssistant.cshtml`，Nova 布局不会加载它，请求 `_AiAssistant` 时会落到 Cube 的 Bootstrap 助手。
- **优先级**：P2。

## 刻意差异（不是缺陷）

- **视觉栈**：Tabler 1.5.1 / Bootstrap 5 + `nova-tokens.css` / `nova-ui.css` / `nova-ui.js`，替代 Ace 的 Bootstrap 3 + jQuery + `ace.min.css`。内容页 jQuery 仅留 3.7.1 给旧插件。
- **`_Frame.cshtml`**：桌面 `CubeIndex` 与移动 `MCubeIndex` 共用外壳。Ace 两份整页各写一遍 `_Navbar` + `_Left`。这是更符合分部理念的拆分。
- **`MLogin`**：整页转调 `Login`，而不是 Ace 那样再写一份移动登录 HTML。与规范 §6.4「共用 `_Login_Login`」同方向。
- **批量条**：`_List_BulkBar` 承接启用/禁用/删除；Ace 的启用按钮写在 `_List_Toolbar` 里，默认 `_List_Toolbar_Batch` 里的删除按钮是注释掉的。Nova 默认会露出「批量删除」。`_List_Toolbar` 仍引用 `_List_Toolbar_Batch`，子级覆写这个名字仍然生效（`User_Nova`、`Department_Nova` 已用）。
- **`_List_Toolbar_Links`**：新的空槽，Ace 没有。`User_Nova/_List_Toolbar_Links.cshtml` 是这条槽的区域覆写。
- **`_ObjectForm_Field`**：Ace 的 `ObjectForm.cshtml` 把字段内联在页里。Nova 抽成分部，仍调用 `_Form_DropDownList` / `_Form_Editor`。
- **`_TreeSelect`、`_Menu_Icon`**：Ace 的下拉/菜单图标不经过这两个名字。
- **页眉页脚从内容页拿掉**：见差距 8。若产品确认规范让位于布局注释，此项保持为刻意差异。
- **`_User_Nav` / `_Object_Nav` 的 `nv-tabnav` / `nv-objnav`**：标记换肤是刻意的；差距 1 里的链接目标与 `userId` 钳制不是。

## 契约红线

下面这些不能为了「目录长得像 Ace」去改：

1. **不要删 `Views/Nova` 下已换肤的分部来回落 `Views/Shared`。** Shared 是 Ace/Bootstrap 标记。缺的是区域主题视图，不是把通用列表再交回 Shared。
2. **保持查找约定用的目录名**：`Views/Nova/`、`Areas/Admin/Views/{Controller}_Nova/`、`Areas/Admin/Views/Nova/`（区域级共享分部）。不要改成 `*_ACE` 或把 `_User_Nav` 挪进 `Shared`。
3. **视图逻辑名保持 Cube 控制器的返回值**：`CubeIndex`、`MCubeIndex`、`List`、`ListTree`、`AddForm`、`EditForm`、`Form`、`Detail`、`ObjectForm`、`Login`、`Info`。`Layout` 继续是 `~/Views/{Theme}/_Layout.cshtml`。
4. **外壳与内容页分层**：`_Frame` 只出现一次；内容页 `_Layout` 不引用 `_Left` / `_Layout_Header`。`iframe` 保持 `id="main"` 且 `name="main"`。
5. **控制器写入的分部名**（业务仓和 Cube 都在用）：`PageSetting.NavView` 的 `_User_Nav` / `_Object_Nav`；`GroupView` 的 `_Form_UserId`、`_Form_PrincipalName`、`_Form_AgentName`；字段 `ItemView` / `View`。补皮肤时用这些名字，不要另起一套。
6. **列表/表单 DOM 契约**（`docs/host-override-checklist.md` 已冻结）：`name="keys"`、`#chkAll[data-nv-checkall]`、`data-action` + `data-confirm`、表单字段 `name/id`、登录页 `username` / `pwd` / `pkey*` / `cube-login`。补 Log/Menu 数据分部时要接上这套，而不是把 Ace 表原样换皮。
7. **`Theme` 与 `Skin` 必须同时为 `Nova`。** 只设其中一个会让外壳和内容页各走一套皮肤。`UseNova` 只注册名字，不写配置，这与其它 Cube 皮肤一致。
8. **工作台部件路径**：在替换 `Dashboard` 之前，不要假设 `Widgets_Nova` 会被找到。Ace 使用的是绝对路径 `~/Areas/Admin/Views/Widgets/{Name}.cshtml`。

## 建议确认的问题

1. 默认首页是否必须是 Nova 版 Dashboard（P0），还是允许继续用 Ace 工作台、把 `StartPage` 改到已有的 `Index/Main`？
2. 内容页面包屑是按布局注释永久关闭，还是按规范 §7 恢复 `_Layout_Nav`？
3. `_User_Nav` 是否要追平 Ace 的「非系统角色只看自己 + 用户标签进 Detail」？
4. 日志 / 菜单 / 令牌三张专用表，是按 Nova `_List_Data` 重做，还是接受混排？
