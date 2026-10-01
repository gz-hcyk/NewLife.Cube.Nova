using NewLife.Cube;
using NewLife.Cube.Entity;
using NewLife.Model;
using XCode.Membership;
using NewLife;

namespace NewLife.Cube.Nova;

/// <summary>
/// 用户令牌列表脱敏与登录态一次性打开。
/// 列表页不输出完整 Token，也不把 Token 写进 href；已登录管理员点「页面 / Json / …」时，
/// 由本处理按主键查出令牌再 302 到数据地址。
/// </summary>
public static class NovaUserToken
{
    /// <summary>登录态一次性打开的路径。不占用 UserTokenController 的动作名，避免被区域路由先 404。</summary>
    public const String OpenPath = "/Admin/UserToken/Open";

    static readonly HashSet<String> _formats = new(StringComparer.OrdinalIgnoreCase)
    {
        "Html", "Json", "Xml", "Csv", "Excel"
    };

    /// <summary>列表展示用掩码：保留短前缀，其余以 ••• 代替。空令牌返回空串。</summary>
    public static String Mask(String token)
    {
        if (token.IsNullOrEmpty()) return "";
        var keep = token.Length <= 8 ? 1 : 4;
        return token.Substring(0, keep) + "•••";
    }

    /// <summary>是否为本皮肤接管的一次性打开请求。</summary>
    public static Boolean IsOpenRequest(HttpRequest request)
    {
        if (request == null || !HttpMethods.IsGet(request.Method)) return false;
        var path = request.Path.Value ?? "";
        if (path.Length > 1 && path.EndsWith('/')) path = path.TrimEnd('/');
        return path.Equals(OpenPath, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// 处理一次性打开。未登录去登录页；非属主且非系统角色返回 403；成功则 302 到带 token 的数据地址。
    /// </summary>
    public static Task HandleOpenAsync(HttpContext ctx)
    {
        var request = ctx.Request;
        // UseNova 常排在 UseAuthentication 之前，此时 ctx.User 仍是匿名，但登录 Cookie 已经在请求上。
        // 若按 User 为空就 302 到 Login，登录页又能认出同一会话并跳回 Open，会无限循环。
        var user = ResolveLoginUser(ctx);
        if (user == null)
        {
            var back = (request.PathBase + request.Path + request.QueryString).ToString();
            ctx.Response.Redirect("/Admin/User/Login?ReturnUrl=" + Uri.EscapeDataString(back));
            return Task.CompletedTask;
        }

        var id = request.Query["id"].ToString().ToInt();
        var fmt = request.Query["fmt"].ToString();
        if (id <= 0 || fmt.IsNullOrEmpty() || !_formats.Contains(fmt))
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        }

        var entity = UserToken.FindByKey(id);
        if (entity == null)
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        }

        var sys = user is IUser iu && iu.Roles?.Any(e => e.IsSystem) == true;
        if (!sys && entity.UserID != user.ID)
        {
            ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        }

        if (!TryBuildShareUrl(entity.Url, entity.Token, fmt, out var target))
        {
            ctx.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        }

        ctx.Response.Headers.CacheControl = "no-store";
        ctx.Response.Headers["Referrer-Policy"] = "no-referrer";
        ctx.Response.Redirect(target);
        return Task.CompletedTask;
    }

    /// <summary>
    /// 与登录页相同：用 ManageProvider.TryLogin 从 Header / Query / Cookie 读取魔方令牌。
    /// 不把「当前管道阶段 User 尚未写入」当成未登录。
    /// </summary>
    static IManageUser ResolveLoginUser(HttpContext ctx)
    {
        var provider = ManageProvider.Provider;
        if (provider == null || ctx == null) return null;
        return provider.TryLogin(ctx);
    }

    /// <summary>
    /// 拼出数据地址。只接受站内相对路径，拒绝协议相对和外链，避免把令牌重定向到第三方。
    /// </summary>
    public static Boolean TryBuildShareUrl(String rawUrl, String token, String fmt, out String target)
    {
        target = null;
        if (token.IsNullOrEmpty() || rawUrl.IsNullOrEmpty() || fmt.IsNullOrEmpty() || !_formats.Contains(fmt))
            return false;

        var url = rawUrl.Trim();
        if (url.Contains("://", StringComparison.Ordinal) || url.StartsWith("//", StringComparison.Ordinal))
            return false;
        if (url.IndexOfAny(['\r', '\n', '\\']) >= 0 || url.Contains("..", StringComparison.Ordinal))
            return false;

        var query = "";
        var p = url.IndexOf('?');
        if (p >= 0)
        {
            query = url.Substring(p);
            url = url.Substring(0, p);
        }
        if (url.IsNullOrEmpty()) return false;
        if (!url.StartsWith('/')) url = "/" + url;

        var sep = query.IsNullOrEmpty() ? "?" : "&";
        target = url + "/" + fmt + query + sep + "token=" + Uri.EscapeDataString(token);
        return target.StartsWith('/') && !target.StartsWith("//", StringComparison.Ordinal);
    }
}
