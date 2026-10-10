using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NewLife.Cube.Entity;
using XCode.Membership;
using NewLife.Cube;

namespace NewLife.Cube.Nova;

/// <summary>登录页 Logo / 背景。匿名读取当前魔方设置里的那一张；上传后复制到静态目录。</summary>
/// <remarks>
/// 不修改通用 <c>/cube/image</c> 鉴权。代理不接收附件编号参数，只读 <see cref="CubeSetting.LoginLogo"/> 与 <see cref="CubeSetting.LoginBackground"/>。
/// </remarks>
[Route("/Nova/LoginAsset")]
public class LoginAssetController : ControllerBaseX
{
    readonly IWebHostEnvironment _env;

    /// <summary>实例化</summary>
    /// <param name="env">宿主环境，公开文件写到 WebRoot</param>
    public LoginAssetController(IWebHostEnvironment env) => _env = env;

    /// <summary>输出当前登录 Logo。配置已是公开地址时不走这里</summary>
    /// <returns>图片内容；没有可输出的附件时 404</returns>
    [AllowAnonymous]
    [HttpGet("Logo")]
    public IActionResult Logo() => Open(false);

    /// <summary>输出当前登录背景。只给左侧品牌区使用</summary>
    /// <returns>图片内容；没有可输出的附件时 404</returns>
    [AllowAnonymous]
    [HttpGet("Background")]
    public IActionResult Background() => Open(true);

    /// <summary>把刚上传的登录图复制到可静态访问目录</summary>
    /// <param name="field">LoginLogo 或 LoginBackground</param>
    /// <param name="filePath">User/UploadFile 返回的 <c>/cube/image?id=</c></param>
    /// <returns>JSON，<c>data.filePath</c> 为 <c>/Content/nova/login/...</c></returns>
    [HttpPost("Publish")]
    [ValidateAntiForgeryToken]
    public ActionResult Publish(String field, String filePath)
    {
        var user = ManageProvider.User;
        if (user == null && ManageProvider.Provider?.TryLogin(HttpContext) is IUser logged)
            user = logged;
        if (user == null) return Json(401, "未登录");
        if (!NovaLoginAsset.IsLoginImageField(field))
            return Json(400, "仅登录 Logo 与背景可公开");
        if (!NovaLoginAsset.TryParseCubeImageId(filePath, out var id))
            return Json(400, "无法识别上传结果");

        var att = Attachment.FindById(id);
        if (att == null || !att.Enable) return Json(404, "找不到附件");

        var sys = user is IUser iu && iu.Roles != null && iu.Roles.Any(e => e.IsSystem);
        if (att.CreateUserID > 0 && att.CreateUserID != user.ID && !sys)
            return Json(403, "只能公开自己上传的图片");
        if (!NovaLoginAsset.TryPickExtension(att.Extension, att.FileName, att.ContentType, out var ext))
            return Json(400, "不是可公开的图片");
        if (!att.IsLocalStorage())
            return Json(400, "云存储附件不能写成静态地址");

        try
        {
            var dir = NovaLoginAsset.PublicDirectory(_env.WebRootPath, _env.ContentRootPath);
            var url = NovaLoginAsset.PublishLocalFile(att.GetFilePath(), dir, field, att.Id, ext);
            var pathBase = (Request.PathBase.Value ?? "").TrimEnd('/');
            return Json(0, null, new { filePath = pathBase + url });
        }
        catch (InvalidOperationException ex)
        {
            return Json(400, ex.Message);
        }
    }

    IActionResult Open(Boolean background)
    {
        var raw = background ? CubeSetting.Current.LoginBackground : CubeSetting.Current.LoginLogo;
        if (!NovaLoginAsset.TryParseCubeImageId(raw, out var id))
            return NotFound();

        var att = Attachment.FindById(id);
        if (att == null || !att.Enable) return NotFound();
        if (!att.IsLocalStorage()) return NotFound();
        if (!NovaLoginAsset.TryPickExtension(att.Extension, att.FileName, att.ContentType, out var ext))
            return NotFound();

        var path = att.GetFilePath();
        if (path.IsNullOrEmpty() || !System.IO.File.Exists(path)) return NotFound();

        var info = new FileInfo(path);
        if (info.Length <= 0 || info.Length > NovaLoginAsset.MaxBytes) return NotFound();

        Response.Headers.CacheControl = "public,max-age=60";
        return PhysicalFile(path, NovaLoginAsset.ContentTypeFor(ext, att.ContentType));
    }
}
