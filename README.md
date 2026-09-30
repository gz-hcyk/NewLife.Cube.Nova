# NewLife.Cube.Nova

魔方（NewLife.Cube）Nova 主题皮肤包 —— 基于 Tabler **v1.5.1**（**v1.0.0-beta19 → v1.5.1**，Bootstrap 5.3.8），提供一套完整的 Razor 视图与静态资源，支持视图覆写与主题切换。

## 项目简介

本项目是 NewLife.Cube 的 UI 皮肤（Razor Class Library），以嵌入资源的方式打包视图和静态资源（Tabler / Nova / jQuery），由宿主 Web 应用在运行时通过 `CubeEmbeddedFileProvider` 以 `/Content/...` 路径对外提供，机制与官方的 `NewLife.Cube.Tabler` 皮肤完全一致。

## 特性

- 🎨 基于 Tabler v1.5.1（由 v1.0.0-beta19 升级，Bootstrap 5.3.8）+ Tabler Icons 的现代化后台界面
- 📦 Razor Class Library 打包，视图与静态资源全部内嵌，引用即用
- 🔄 支持视图覆写与主题切换
- 📱 响应式布局，兼容移动端（含移动端登录页 MLogin）
- 🧩 覆盖魔方常用页面：列表、表单、树形、权限设置、用户中心、数据库工具等

## 技术栈

| 项目 | 说明 |
| --- | --- |
| .NET 8.0 | 目标框架 |
| NewLife.Cube.Core 6.15.2026.901 | 魔方核心库 |
| Tabler v1.5.1 | UI 框架（Bootstrap 5.3.8；由 v1.0.0-beta19 升级，与 `tabler.min.css` 文件头一致） |
| Tabler Icons | 图标字体（`tabler-icons.min.css`） |
| jQuery 3.7.1 | 仅内容页遗留插件兼容（如 bootstrap-treeview）；新页面不新增 jQuery 依赖 |

## 目录结构

```
NewLife.Cube.Nova/
├── Areas/Admin/Views/   # 管理后台视图（登录、用户、角色、权限、数据库等）
├── Views/Nova/          # 魔方核心视图覆写（列表、表单、布局组件等）
├── wwwroot/             # 静态资源（tabler / nova / jquery），内嵌为嵌入资源
├── NovaService.cs       # 服务入口，UseNova 扩展方法
├── NovaSkin.cs          # 皮肤定义
└── NewLife.Cube.Nova.csproj
```

## 使用方法

宿主项目引用本库后，在 `Program.cs` / `Startup.cs` 中启用：

```csharp
// 注册魔方
services.AddCube();

// 使用 Nova 皮肤
var app = builder.Build();
app.UseCube(app.Environment)
   .UseNova(app.Environment);
```

静态资源由 `UseNova` 内置的 `CubeEmbeddedFileProvider` 自动提供：优先读取宿主 WebRoot 物理文件，未命中时回退到程序集内嵌资源，因此可以在宿主项目中放置同名文件实现视图 / 资源的覆写。

视图分层与魔方 ACE 一致：桌面 `CubeIndex` 与移动端 `MCubeIndex` 共用整页外壳 `Views/Nova/_Frame.cshtml`（侧栏 + 顶栏 + iframe）；iframe 内的列表 / 表单 / 详情走无导航的 `_Layout.cshtml`，避免菜单重复。宿主物理文件始终优先于内嵌资源。

## 视图覆写

将本项目 `Views/` 或 `Areas/Admin/Views/` 下任意 `.cshtml` 复制到宿主项目的对应路径即可覆写。宿主文件优先，无需修改本库源码。

## 宿主覆写与回归

静态资源由 `CompositeFileProvider` 提供：宿主 WebRoot 物理文件优先，未命中再回退内嵌资源。视图按相同相对路径覆写 RCL。库存布局经 `NovaSkin.WithVersion` 追加 `?v=`。`nova-tokens.css` 与 `nova-ui.css` 需成对加载。

内容页主区域是 `<main id="nv-main" class="nv-container">`。`.nv-container` 与 `.nv-body > .nv-container` 仍然命中；`div.nv-container` 不再命中。外壳跳过链接指向 iframe `#main`。跨文档读屏对 iframe 内焦点支持有限，非嵌入打开的内容页自带该 `<main>`。

手工回归（原装冒烟、部分覆写矩阵、契约冻结）见 [docs/host-override-checklist.md](docs/host-override-checklist.md)。

## 许可协议

本项目基于 [MIT License](LICENSE) 开源，可自由用于商业及个人项目。

## 相关项目

- [NewLife.Cube](https://github.com/NewLifeX/NewLife.Cube) —— 魔方快速开发平台
- [NewLifeX](https://github.com/NewLifeX) —— NewLife 团队
