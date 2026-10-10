using System.ComponentModel;
using System.Net;
using System.Security.Principal;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace XUnitTest.Nova;

/// <summary>
/// 复现设置页与 Publish 的防伪差异：令牌在 GenericPrincipal 下签发，过滤器若在匿名身份上校验会得到空 body 的 400。
/// 同一主体先写回 HttpContext.User 再 ValidateRequestAsync 则通过。
/// </summary>
public class NovaLoginAssetAntiforgeryTests
{
    [Fact]
    [DisplayName("登录身份下签发的防伪令牌，匿名校验为 400，恢复同一主体后通过")]
    public async Task ClaimUidMatchesOnlyAfterPrincipalIsRestored()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.SetMinimumLevel(LogLevel.Warning);
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddAntiforgery();
        builder.Services.AddControllersWithViews()
            .AddApplicationPart(typeof(LoginAssetAntiforgeryProbeController).Assembly);

        var app = builder.Build();
        app.MapControllers();
        await app.StartAsync();
        var address = app.Services.GetRequiredService<IServer>()
            .Features.Get<IServerAddressesFeature>()!
            .Addresses.Single();
        using var client = new HttpClient(new HttpClientHandler { UseCookies = false })
        {
            BaseAddress = new Uri(address),
        };
        try
        {
            var issued = await client.GetAsync("/probe-login-asset/issue");
            Assert.Equal(HttpStatusCode.OK, issued.StatusCode);
            var token = (await issued.Content.ReadAsStringAsync()).Trim();
            Assert.False(String.IsNullOrEmpty(token));

            Assert.True(issued.Headers.TryGetValues("Set-Cookie", out var setCookies));
            var cookie = String.Join("; ", setCookies.Select(v => v.Split(';')[0]));
            Assert.Contains(".AspNetCore.Antiforgery.", cookie, StringComparison.Ordinal);

            using var anonymous = new HttpRequestMessage(HttpMethod.Post, "/probe-login-asset/filter");
            anonymous.Headers.TryAddWithoutValidation("RequestVerificationToken", token);
            anonymous.Headers.TryAddWithoutValidation("Cookie", cookie);
            anonymous.Content = new FormUrlEncodedContent(new Dictionary<String, String>
            {
                ["field"] = "LoginLogo",
                ["filePath"] = "/cube/image?id=1.png",
                ["__RequestVerificationToken"] = token,
            });
            var rejected = await client.SendAsync(anonymous);
            var rejectedBody = await rejected.Content.ReadAsStringAsync();
            Assert.True(rejected.StatusCode == HttpStatusCode.BadRequest, ((Int32)rejected.StatusCode) + " " + rejectedBody);
            Assert.True(String.IsNullOrEmpty(rejectedBody), rejectedBody);

            using var restored = new HttpRequestMessage(HttpMethod.Post, "/probe-login-asset/after");
            restored.Headers.TryAddWithoutValidation("RequestVerificationToken", token);
            restored.Headers.TryAddWithoutValidation("Cookie", cookie);
            restored.Content = new FormUrlEncodedContent(new Dictionary<String, String>
            {
                ["field"] = "LoginLogo",
                ["filePath"] = "/cube/image?id=1.png",
                ["__RequestVerificationToken"] = token,
            });
            var accepted = await client.SendAsync(restored);
            var body = await accepted.Content.ReadAsStringAsync();
            Assert.True(accepted.StatusCode == HttpStatusCode.OK, body);
            Assert.Equal("ok", body);
        }
        finally
        {
            await app.StopAsync();
            await app.DisposeAsync();
        }
    }
}

/// <summary>仅测试宿主使用，模拟设置页签发与 Publish 的两种校验时机。</summary>
[Route("/probe-login-asset")]
public class LoginAssetAntiforgeryProbeController : ControllerBase
{
    /// <summary>按魔方 SetPrincipal 的方式签发请求令牌</summary>
    [HttpGet("issue")]
    public IActionResult Issue([FromServices] IAntiforgery antiforgery)
    {
        HttpContext.User = new GenericPrincipal(new GenericIdentity("admin", "XCode"), ["管理员"]);
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Content(tokens.RequestToken ?? "");
    }

    /// <summary>过滤器在匿名身份上校验，对应修复前的 Publish</summary>
    [HttpPost("filter")]
    [ValidateAntiForgeryToken]
    public IActionResult Filter() => Content("ok");

    /// <summary>先写回同一登录主体再校验，对应修复后的 Publish</summary>
    [HttpPost("after")]
    public async Task<IActionResult> After([FromServices] IAntiforgery antiforgery)
    {
        HttpContext.User = new GenericPrincipal(new GenericIdentity("admin", "XCode"), ["管理员"]);
        await antiforgery.ValidateRequestAsync(HttpContext);
        return Content("ok");
    }
}
