using System.ComponentModel;
using NewLife.Cube.Nova;
using Xunit;

namespace XUnitTest.Nova;

public class NovaLoginAssetTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [DisplayName("空 Logo 保持为空，登录页继续走字标")]
    public void EmptyLogoStaysEmpty(String? url)
    {
        Assert.Equal(url, NovaLoginAsset.ResolveLogo(url!));
        Assert.Equal(url, NovaLoginAsset.ResolveBackground(url!));
    }

    [Theory]
    [InlineData("/cube/image?id=12.png")]
    [InlineData("/Cube/Image?id=12.jpg")]
    [InlineData("/cube/image/?id=12")]
    [InlineData("https://demo.local/cube/image?id=12.webp")]
    [DisplayName("旧的 /cube/image?id= 改写成固定匿名代理")]
    public void CubeImageRewritesToProxy(String url)
    {
        Assert.Equal(NovaLoginAsset.LogoUrl, NovaLoginAsset.ResolveLogo(url));
        Assert.Equal(NovaLoginAsset.BackgroundUrl, NovaLoginAsset.ResolveBackground(url));
        Assert.True(NovaLoginAsset.TryParseCubeImageId(url, out var id));
        Assert.Equal(12, id);
    }

    [Theory]
    [InlineData("/Content/nova/login/logo-3.png")]
    [InlineData("https://cdn.example/logo.png")]
    [InlineData("/cube/file?id=9.png")]
    [InlineData("/cube/image/extra?id=9")]
    [InlineData("//evil.example/cube/image?id=9")]
    [InlineData("notcube/image?id=9")]
    [DisplayName("公开地址、文件接口和伪装路径都不改写成代理")]
    public void OtherUrlsStay(String url)
    {
        Assert.Equal(url, NovaLoginAsset.ResolveLogo(url));
        Assert.False(NovaLoginAsset.IsCubeImageUrl(url));
    }

    [Fact]
    [DisplayName("同一附件编号才算同一张登录图")]
    public void SameCubeImageMatchesIdOnly()
    {
        Assert.True(NovaLoginAsset.SameCubeImage("/cube/image?id=4.png", "https://demo.local/Cube/Image?id=4.jpg"));
        Assert.False(NovaLoginAsset.SameCubeImage("/cube/image?id=4.png", "/cube/image?id=5.png"));
        Assert.False(NovaLoginAsset.SameCubeImage("/cube/image?id=4.png", "/Content/nova/login/logo-4.png"));
    }

    [Fact]
    [DisplayName("只给本皮肤的代理和公开目录补路径前缀")]
    public void PathBaseAppliesOnlyToOwnedUrls()
    {
        String Map(String p) => "/app" + p.Substring(1);

        Assert.Equal("/app/Nova/LoginAsset/Logo", NovaLoginAsset.ApplyPathBase(NovaLoginAsset.LogoUrl, Map));
        Assert.Equal("/app/Content/nova/login/logo-1.png", NovaLoginAsset.ApplyPathBase("/Content/nova/login/logo-1.png", Map));
        Assert.Equal("https://cdn.example/a.png", NovaLoginAsset.ApplyPathBase("https://cdn.example/a.png", Map));
        Assert.Equal("/images/hand.png", NovaLoginAsset.ApplyPathBase("/images/hand.png", Map));
    }

    [Fact]
    [DisplayName("扩展名与 Content-Type 都要像图片")]
    public void ExtensionWhitelist()
    {
        Assert.True(NovaLoginAsset.TryPickExtension("png", "a.png", "image/png", out var ext));
        Assert.Equal(".png", ext);
        Assert.True(NovaLoginAsset.TryPickExtension(null, null, "image/jpeg", out ext));
        Assert.Equal(".jpg", ext);
        Assert.False(NovaLoginAsset.TryPickExtension("exe", "a.exe", "application/octet-stream", out _));
        Assert.False(NovaLoginAsset.TryPickExtension("png", "a.png", "text/html", out _));
        Assert.True(NovaLoginAsset.TryPickExtension("../png", "a.png", "image/png", out ext));
        Assert.Equal(".png", ext);
        Assert.False(NovaLoginAsset.TryPickExtension("../png", "a.exe", "application/octet-stream", out _));
    }

    [Fact]
    [DisplayName("公开文件名只含种类、编号和扩展名")]
    public void PublicNameRejectsOtherFields()
    {
        Assert.Equal("logo-8.png", NovaLoginAsset.PublicFileName("LoginLogo", 8, ".PNG"));
        Assert.Equal("background-8.jpg", NovaLoginAsset.PublicFileName("LoginBackground", 8, "jpg"));
        Assert.Throws<ArgumentException>(() => NovaLoginAsset.PublicFileName("Avatar", 8, ".png"));
        Assert.Throws<ArgumentOutOfRangeException>(() => NovaLoginAsset.PublicFileName("LoginLogo", 0, ".png"));
    }

    [Fact]
    [DisplayName("复制到静态目录并清掉同种类旧文件")]
    public void PublishCopiesAndReplacesSameKind()
    {
        var root = Path.Combine(Path.GetTempPath(), "nova-login-" + Guid.NewGuid().ToString("n"));
        var srcDir = Path.Combine(root, "src");
        var pub = Path.Combine(root, "wwwroot", "Content", "nova", "login");
        Directory.CreateDirectory(srcDir);
        Directory.CreateDirectory(pub);
        try
        {
            var src = Path.Combine(srcDir, "a.png");
            File.WriteAllBytes(src, [0x89, 0x50, 0x4E, 0x47]);
            File.WriteAllBytes(Path.Combine(pub, "logo-1.png"), [1]);
            File.WriteAllBytes(Path.Combine(pub, "background-1.png"), [2]);

            var url = NovaLoginAsset.PublishLocalFile(src, pub, "LoginLogo", 9, ".png");

            Assert.Equal("/Content/nova/login/logo-9.png", url);
            Assert.Equal(new Byte[] { 0x89, 0x50, 0x4E, 0x47 }, File.ReadAllBytes(Path.Combine(pub, "logo-9.png")));
            Assert.False(File.Exists(Path.Combine(pub, "logo-1.png")));
            Assert.True(File.Exists(Path.Combine(pub, "background-1.png")));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    [DisplayName("空文件、过大文件和缺失文件不公开")]
    public void PublishRejectsBadFiles()
    {
        var root = Path.Combine(Path.GetTempPath(), "nova-login-" + Guid.NewGuid().ToString("n"));
        Directory.CreateDirectory(root);
        try
        {
            var empty = Path.Combine(root, "empty.png");
            File.WriteAllBytes(empty, []);
            var ex = Assert.Throws<InvalidOperationException>(() =>
                NovaLoginAsset.PublishLocalFile(empty, root, "LoginLogo", 1, ".png"));
            Assert.Equal("图片大小不合法", ex.Message);

            Assert.Throws<InvalidOperationException>(() =>
                NovaLoginAsset.PublishLocalFile(Path.Combine(root, "missing.png"), root, "LoginLogo", 1, ".png"));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, true);
        }
    }

    [Fact]
    [DisplayName("登录页与上传脚本只把这两个字段送去公开，并带裂图兜底")]
    public void ViewsKeepProxyAndFallback()
    {
        var root = RepoRoot();
        var login = File.ReadAllText(Path.Combine(root, "Areas/Admin/Views/User_Nova/Login.cshtml"));
        Assert.Contains("NovaLoginAsset.ResolveBackground", login);
        Assert.Contains("NovaLoginAsset.ResolveLogo", login);
        Assert.Contains("data-nv-login-bg", login);
        Assert.Contains("nv-login-aside--has-bg", login);
        Assert.Contains("onerror=", login);
        Assert.Contains("nv-aside-logo--txt", login);
        Assert.DoesNotContain("nv-login-page--has-bg", login);

        var card = File.ReadAllText(Path.Combine(root, "Areas/Admin/Views/User_Nova/_Login_Login.cshtml"));
        Assert.Contains("NovaLoginAsset.ResolveLogo", card);
        Assert.Contains("onerror=", card);
        Assert.Contains("nv-login-mark", card);

        var image = File.ReadAllText(Path.Combine(root, "Views/Nova/_ObjectForm_Image.cshtml"));
        Assert.Contains("LoginLogo", image);
        Assert.Contains("LoginBackground", image);
        Assert.Contains("data-nv-publish-url", image);
        Assert.Contains("/Nova/LoginAsset/Publish", image);

        var js = File.ReadAllText(Path.Combine(root, "wwwroot/Content/nova/nova-ui.js"));
        Assert.Contains("data-nv-publish-url", js);
        Assert.Contains("data-nv-publish-field", js);
        Assert.Contains("正在公开", js);

        var ctrl = File.ReadAllText(Path.Combine(root, "LoginAssetController.cs"));
        Assert.Contains("[AllowAnonymous]", ctrl);
        Assert.DoesNotContain("[ValidateAntiForgeryToken]", ctrl);
        var publishMethod = ctrl.Substring(ctrl.IndexOf("Task<ActionResult> Publish", StringComparison.Ordinal));
        var loginAt = publishMethod.IndexOf("TryLogin(HttpContext)", StringComparison.Ordinal);
        var validateAt = publishMethod.IndexOf("ValidateRequestAsync(HttpContext)", StringComparison.Ordinal);
        Assert.True(loginAt >= 0 && validateAt > loginAt, "必须先 TryLogin 恢复登录身份，再校验防伪");
        Assert.Contains("AntiforgeryValidationException", publishMethod);
        Assert.Contains("CubeSetting.Current.LoginLogo", ctrl);
        Assert.Contains("CubeSetting.Current.LoginBackground", ctrl);
        Assert.DoesNotContain("PublicAttachment", ctrl);

        var publish = js.Substring(js.IndexOf("function initObjectImageUpload", StringComparison.Ordinal));
        Assert.Contains("RequestVerificationToken", publish);
        Assert.Contains("__RequestVerificationToken", publish);
        Assert.Contains("fd2.append('field', field)", publish);
        Assert.Contains("fd2.append('filePath', path)", publish);
        Assert.Contains("publishOk", publish);
    }

    static String RepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "NewLife.Cube.Nova.csproj")))
                return dir.FullName;
            dir = dir.Parent;
        }

        throw new DirectoryNotFoundException("找不到 NewLife.Cube.Nova.csproj");
    }
}
