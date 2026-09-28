using System.Reflection;
using NewLife;

namespace NewLife.Cube.Nova;

/// <summary>Nova 皮肤包标记类。供宿主程序在启动时定位本程序集，
/// 以便用 CubeEmbeddedFileProvider 将其内嵌的 wwwroot 静态资源（/Content/...）对外提供。</summary>
public static class NovaSkin
{
    /// <summary>
    /// 皮肤静态资源缓存穿透版本。取程序集 <see cref="AssemblyInformationalVersionAttribute"/>
    ///（与 csproj <c>Version</c> / 日构建后缀一致），缺省回落 <see cref="AssemblyName.Version"/>。
    /// </summary>
    public static String AssetVersion { get; } = ResolveAssetVersion();

    /// <summary>为静态资源 URL 追加 <c>?v=</c>/<c>&amp;v=</c> 查询串，避免发布后浏览器强缓存旧 CSS/JS。</summary>
    /// <param name="url">资源地址（可含已有查询串）</param>
    /// <returns>带版本号的 URL；空入参原样返回</returns>
    public static String WithVersion(String url)
    {
        if (url.IsNullOrEmpty()) return url;
        var sep = url.Contains('?') ? "&" : "?";
        return url + sep + "v=" + AssetVersion;
    }

    private static String ResolveAssetVersion()
    {
        var asm = typeof(NovaSkin).Assembly;
        var info = asm.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (!info.IsNullOrEmpty())
        {
            // 去掉可能附带的 +gitSHA 等元数据，只留版本主体作缓存键
            var plus = info.IndexOf('+');
            if (plus > 0) info = info[..plus];
            return info;
        }

        return asm.GetName().Version?.ToString() ?? "1";
    }
}
