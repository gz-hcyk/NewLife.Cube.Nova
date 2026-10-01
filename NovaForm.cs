using Microsoft.AspNetCore.Mvc.ModelBinding;
using NewLife;

namespace NewLife.Cube.Nova;

/// <summary>
/// 区分 ModelState 里的业务校验失败，与空数值 / 日期绑定失败（The value '' is invalid）。
/// 后者不打 aria-invalid，也不算「第一个真正失败的字段」。
/// </summary>
public static class NovaForm
{
    /// <summary>空值转换失败：文案里带着成对空引号，或只有异常没有业务文案。</summary>
    public static Boolean IsEmptyValueBindingNoise(ModelError error)
    {
        if (error == null) return false;
        var msg = error.ErrorMessage ?? "";
        if (msg.Contains("''", StringComparison.Ordinal) || msg.Contains("\"\"", StringComparison.Ordinal))
            return true;
        return error.Exception != null && msg.IsNullOrWhiteSpace();
    }

    /// <summary>该字段上真正的校验失败条数（不含空值绑定噪声）。</summary>
    public static Int32 RealErrorCount(ModelStateDictionary modelState, String key)
    {
        if (modelState == null || key.IsNullOrEmpty()) return 0;
        if (!modelState.TryGetValue(key, out var entry) || entry == null) return 0;

        var n = 0;
        foreach (var error in entry.Errors)
        {
            if (!IsEmptyValueBindingNoise(error)) n++;
        }
        return n;
    }

    /// <summary>整表是否存在至少一条真正的校验失败。</summary>
    public static Boolean HasRealErrors(ModelStateDictionary modelState)
    {
        if (modelState == null) return false;
        foreach (var entry in modelState.Values)
        {
            foreach (var error in entry.Errors)
            {
                if (!IsEmptyValueBindingNoise(error)) return true;
            }
        }
        return false;
    }
}
