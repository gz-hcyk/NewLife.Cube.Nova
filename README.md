# NewLife.Cube.Nova

魔方（NewLife.Cube）Nova 主题皮肤包 —— 基于 Tabler v1.0.0-beta19 / Bootstrap 5，提供一套完整的 Razor 视图与静态资源，支持视图覆写与主题切换。

## 项目简介

本项目是 NewLife.Cube 的 UI 皮肤（Razor Class Library），以嵌入资源的方式打包视图和静态资源（Tabler / Nova / jQuery），由宿主 Web 应用在运行时通过 `CubeEmbeddedFileProvider` 以 `/Content/...` 路径对外提供，机制与官方的 `NewLife.Cube.Tabler` 皮肤完全一致。

## 特性

- 🎨 基于 Tabler v1.0.0-beta19 + Bootstrap 5 的现代化后台界面
- 📦 Razor Class Library 打包，视图与静态资源全部内嵌，引用即用
- 🔄 支持视图覆写与主题切换
- 📱 响应式布局，兼容移动端（含移动端登录页 MLogin）
- 🧩 覆盖魔方常用页面：列表、表单、树形、权限设置、用户中心、数据库工具等

## 技术栈

| 项目 | 说明 |
| --- | --- |
| .NET 8.0 | 目标框架 |
| NewLife.Cube.Core 6.15.2026.901 | 魔方核心库 |
| Tabler v1.0.0-beta19 | UI 框架 |
| Bootstrap 5 | 前端框架 |
| jQuery | JS 基础库 |

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

宿主项目（如 IoT.Web）引用本库后，在 `Program.cs` / `Startup.cs` 中启用：

```csharp
// 注册魔方
services.AddCube();

// 使用 Nova 皮肤
var app = builder.Build();
app.UseCube(app.Environment)
   .UseNova(app.Environment);
```

静态资源由 `UseNova` 内置的 `CubeEmbeddedFileProvider` 自动提供：优先读取宿主 WebRoot 物理文件，未命中时回退到程序集内嵌资源，因此可以在宿主项目中放置同名文件实现视图 / 资源的覆写。

## 视图覆写

将本项目 `Views/` 或 `Areas/Admin/Views/` 下任意 `.cshtml` 复制到宿主项目的对应路径即可覆写。宿主文件优先，无需修改本库源码。

## 许可协议

本项目基于 [MIT License](LICENSE) 开源，可自由用于商业及个人项目。

## 相关项目

- [NewLife.Cube](https://github.com/NewLifeX/NewLife.Cube) —— 魔方快速开发平台
- [NewLifeX](https://github.com/NewLifeX) —— NewLife 团队
