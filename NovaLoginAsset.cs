using NewLife;

namespace NewLife.Cube.Nova;

/// <summary>登录页 Logo / 背景的公开地址。</summary>
/// <remarks>
/// 只处理这两个字段。上传后把附件复制到宿主 wwwroot 的静态目录，登录页直接引用；
/// 历史配置若仍是 <c>/cube/image?id=</c>，渲染时改写成固定匿名代理，由代理按魔方设置读出这一张图。
/// 不放开通用附件，也不接受请求里的任意编号。
/// </remarks>
public static class NovaLoginAsset
{
    /// <summary>登录 Logo 字段名</summary>
    public const String LogoField = "LoginLogo";

    /// <summary>登录背景字段名</summary>
    public const String BackgroundField = "LoginBackground";

    /// <summary>Logo 匿名代理。浏览器无需登录</summary>
    public const String LogoUrl = "/Nova/LoginAsset/Logo";

    /// <summary>背景匿名代理。浏览器无需登录</summary>
    public const String BackgroundUrl = "/Nova/LoginAsset/Background";

    /// <summary>已公开文件的 URL 前缀</summary>
    public const String PublicPrefix = "/Content/nova/login/";

    /// <summary>单张登录图上限（8MB）</summary>
    public const Int64 MaxBytes = 8L * 1024 * 1024;

    static readonly HashSet<String> _extensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico",
    };

    /// <summary>是否为登录 Logo 或背景字段</summary>
    /// <param name="field">表单字段名</param>
    /// <returns>仅这两个字段为 true</returns>
    public static Boolean IsLoginImageField(String field)
        => field.EqualIgnoreCase(LogoField, BackgroundField);

    /// <summary>把仍指向魔方附件接口的地址改成对应匿名代理；其它地址原样返回</summary>
    /// <param name="url">配置中的 Logo 地址，可空</param>
    /// <returns>给浏览器使用的地址；空入参原样返回</returns>
    public static String ResolveLogo(String url) => Resolve(url, false);

    /// <summary>把仍指向魔方附件接口的背景地址改成匿名代理；其它地址原样返回</summary>
    /// <param name="url">配置中的背景地址，可空</param>
    /// <returns>给浏览器使用的地址；空入参原样返回</returns>
    public static String ResolveBackground(String url) => Resolve(url, true);

    /// <summary>本皮肤生成的根相对地址补上应用路径前缀；外链与手填地址不动</summary>
    /// <param name="url">已解析的地址</param>
    /// <param name="content">等价于 <c>IUrlHelper.Content</c>，入参形如 <c>~/Nova/LoginAsset/Logo</c></param>
    /// <returns>可写进 HTML 的地址</returns>
    public static String ApplyPathBase(String url, Func<String, String> content)
    {
        if (url.IsNullOrEmpty() || content == null) return url;
        if (url != LogoUrl && url != BackgroundUrl && !url.StartsWithIgnoreCase(PublicPrefix))
            return url;

        var mapped = content("~" + url);
        return mapped.IsNullOrEmpty() ? url : mapped;
    }

    /// <summary>两个地址是否指向同一张魔方图片附件</summary>
    /// <param name="left">页面即将使用的地址</param>
    /// <param name="right">魔方设置里的地址</param>
    /// <returns>都能解析且编号相同</returns>
    public static Boolean SameCubeImage(String left, String right)
        => TryParseCubeImageId(left, out var a) && TryParseCubeImageId(right, out var b) && a == b;

    /// <summary>是否为魔方图片附件地址（路径必须是 <c>/cube/image</c>）</summary>
    /// <param name="url">配置或上传返回的地址</param>
    /// <returns>能解析出附件编号时为 true</returns>
    public static Boolean IsCubeImageUrl(String url) => TryParseCubeImageId(url, out _);

    /// <summary>从 <c>/cube/image?id=</c> 解析附件编号。不接受其它路径，避免把任意附件公开</summary>
    /// <param name="url">配置或上传返回的地址</param>
    /// <param name="id">附件编号；失败时为 0</param>
    /// <returns>解析到正整数编号时为 true</returns>
    public static Boolean TryParseCubeImageId(String url, out Int64 id)
    {
        id = 0;
        if (url.IsNullOrWhiteSpace()) return false;

        var text = url.Trim();
        String path;
        String query;
        if (text.StartsWith('/'))
        {
            var q = text.IndexOf('?');
            path = q >= 0 ? text[..q] : text;
            query = q >= 0 ? text[(q + 1)..] : "";
        }
        else if (Uri.TryCreate(text, UriKind.Absolute, out var uri) && uri.IsAbsoluteUri)
        {
            path = uri.AbsolutePath;
            query = uri.Query.TrimStart('?');
        }
        else
        {
            return false;
        }

        path = path.TrimEnd('/');
        if (!path.EqualIgnoreCase("/cube/image")) return false;

        id = ReadId(query);
        return id > 0;
    }

    /// <summary>挑选可公开的图片扩展名。扩展名与 Content-Type 都须像图片</summary>
    /// <param name="extension">附件扩展名，可带或不带点</param>
    /// <param name="fileName">原始文件名，仅在扩展名为空时取后缀</param>
    /// <param name="contentType">MIME，空或 image/* 或 application/octet-stream 才接受</param>
    /// <param name="ext">规范化后的小写扩展名，含点</param>
    /// <returns>可以公开时为 true</returns>
    public static Boolean TryPickExtension(String extension, String fileName, String contentType, out String ext)
    {
        ext = null;
        if (!ContentTypeAllowed(contentType)) return false;

        ext = NormalizeExtension(extension);
        if (ext.IsNullOrEmpty()) ext = NormalizeExtension(Path.GetExtension(fileName ?? ""));
        if (ext.IsNullOrEmpty()) ext = ExtensionFromContentType(contentType);
        if (ext.IsNullOrEmpty() || !_extensions.Contains(ext))
        {
            ext = null;
            return false;
        }

        return true;
    }

    /// <summary>按扩展名给出响应类型。已声明的 image/* 优先</summary>
    /// <param name="ext">含点的扩展名</param>
    /// <param name="declared">附件上记录的 MIME，可空</param>
    /// <returns>用于输出图片的 Content-Type</returns>
    public static String ContentTypeFor(String ext, String declared)
    {
        if (!declared.IsNullOrWhiteSpace())
        {
            var ct = declared.Split(';')[0].Trim();
            if (ct.StartsWithIgnoreCase("image/")) return ct;
        }

        return (ext ?? "").ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".svg" => "image/svg+xml",
            ".bmp" => "image/bmp",
            ".ico" => "image/x-icon",
            _ => "image/png",
        };
    }

    /// <summary>公开文件要写入的目录：<c>{webRoot}/Content/nova/login</c></summary>
    /// <param name="webRoot">宿主 WebRoot，空则用内容根下的 wwwroot</param>
    /// <param name="contentRoot">宿主内容根</param>
    /// <returns>绝对或相对目录，尚未确保存在</returns>
    public static String PublicDirectory(String webRoot, String contentRoot)
    {
        var root = webRoot;
        if (root.IsNullOrEmpty())
            root = Path.Combine(contentRoot ?? "", "wwwroot");
        return Path.Combine(root, "Content", "nova", "login");
    }

    /// <summary>生成公开文件名，只含字段种类、附件编号和白名单扩展名</summary>
    /// <param name="field">LoginLogo 或 LoginBackground</param>
    /// <param name="id">附件编号，必须大于 0</param>
    /// <param name="ext">含点的白名单扩展名</param>
    /// <returns>如 <c>logo-12.png</c></returns>
    public static String PublicFileName(String field, Int64 id, String ext)
    {
        if (!IsLoginImageField(field)) throw new ArgumentException("仅登录 Logo 与背景可公开", nameof(field));
        if (id <= 0) throw new ArgumentOutOfRangeException(nameof(id));
        ext = NormalizeExtension(ext);
        if (ext.IsNullOrEmpty() || !_extensions.Contains(ext))
            throw new ArgumentException("不是可公开的图片", nameof(ext));

        var kind = field.EqualIgnoreCase(BackgroundField) ? "background" : "logo";
        return kind + "-" + id.ToString() + ext;
    }

    /// <summary>把本地附件复制到静态目录，并清掉同种类的旧文件</summary>
    /// <param name="sourcePath">附件在磁盘上的路径</param>
    /// <param name="destDirectory">公开目录</param>
    /// <param name="field">LoginLogo 或 LoginBackground</param>
    /// <param name="id">附件编号</param>
    /// <param name="ext">含点的扩展名</param>
    /// <returns>根相对公开地址，如 <c>/Content/nova/login/logo-12.png</c></returns>
    public static String PublishLocalFile(String sourcePath, String destDirectory, String field, Int64 id, String ext)
    {
        if (sourcePath.IsNullOrEmpty() || !File.Exists(sourcePath))
            throw new InvalidOperationException("附件文件不存在");

        var info = new FileInfo(sourcePath);
        if (info.Length <= 0 || info.Length > MaxBytes)
            throw new InvalidOperationException("图片大小不合法");

        var name = PublicFileName(field, id, ext);
        if (destDirectory.IsNullOrEmpty())
            throw new InvalidOperationException("公开目录无效");

        Directory.CreateDirectory(destDirectory);
        var root = Path.GetFullPath(destDirectory);
        var rootWithSep = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            + Path.DirectorySeparatorChar;
        var dest = Path.GetFullPath(Path.Combine(root, name));
        if (!dest.StartsWith(rootWithSep, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("公开路径越界");

        File.Copy(sourcePath, dest, true);

        var prefix = field.EqualIgnoreCase(BackgroundField) ? "background-" : "logo-";
        foreach (var old in Directory.EnumerateFiles(root))
        {
            var fileName = Path.GetFileName(old);
            if (fileName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                && !fileName.Equals(name, StringComparison.OrdinalIgnoreCase))
            {
                try { File.Delete(old); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }

        return PublicPrefix + name;
    }

    static String Resolve(String url, Boolean background)
    {
        if (url.IsNullOrWhiteSpace()) return url;
        var text = url.Trim();
        if (!TryParseCubeImageId(text, out _)) return text;
        return background ? BackgroundUrl : LogoUrl;
    }

    static Int64 ReadId(String query)
    {
        if (query.IsNullOrEmpty()) return 0;
        foreach (var part in query.Split('&'))
        {
            if (part.IsNullOrEmpty()) continue;
            var eq = part.IndexOf('=');
            if (eq <= 0) continue;
            if (!part[..eq].EqualIgnoreCase("id")) continue;

            var raw = Uri.UnescapeDataString(part[(eq + 1)..].Replace("+", " "));
            var dot = raw.IndexOf('.');
            if (dot > 0) raw = raw[..dot];
            var id = raw.ToLong();
            if (id > 0) return id;
        }

        return 0;
    }

    static Boolean ContentTypeAllowed(String contentType)
    {
        if (contentType.IsNullOrWhiteSpace()) return true;
        var ct = contentType.Split(';')[0].Trim();
        if (ct.StartsWithIgnoreCase("image/")) return true;
        return ct.EqualIgnoreCase("application/octet-stream");
    }

    static String NormalizeExtension(String ext)
    {
        if (ext.IsNullOrWhiteSpace()) return "";
        ext = ext.Trim();
        if (ext.Contains('/') || ext.Contains('\\') || ext.Contains("..", StringComparison.Ordinal))
            return "";
        if (!ext.StartsWith('.')) ext = "." + ext;
        if (ext.Count(c => c == '.') != 1) return "";
        return ext.ToLowerInvariant();
    }

    static String ExtensionFromContentType(String contentType)
    {
        if (contentType.IsNullOrWhiteSpace()) return "";
        var ct = contentType.Split(';')[0].Trim();
        if (ct.EqualIgnoreCase("image/jpeg")) return ".jpg";
        if (ct.EqualIgnoreCase("image/png")) return ".png";
        if (ct.EqualIgnoreCase("image/gif")) return ".gif";
        if (ct.EqualIgnoreCase("image/webp")) return ".webp";
        if (ct.EqualIgnoreCase("image/svg+xml")) return ".svg";
        if (ct.EqualIgnoreCase("image/bmp")) return ".bmp";
        if (ct.EqualIgnoreCase("image/x-icon") || ct.EqualIgnoreCase("image/vnd.microsoft.icon"))
            return ".ico";
        return "";
    }
}
