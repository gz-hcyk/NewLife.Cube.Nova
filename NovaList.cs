using NewLife;
using NewLife.Web;

namespace NewLife.Cube.Nova;

/// <summary>列表筛选是否生效。工具栏是 POST，不能只看地址栏 Query。</summary>
public static class NovaList
{
    /// <summary>
    /// 关键字 <c>q</c> 或其它非空筛选（Query 与表单，已并进 <see cref="Pager.Params"/>）视为已筛选。
    /// 分页 / 排序，以及用户选择器未选时提交的 0 / -1，不算筛选。
    /// </summary>
    public static Boolean IsFiltered(HttpRequest request, Pager page)
    {
        if (page?.Params != null)
        {
            foreach (var kv in page.Params)
            {
                if (IsActiveFilter(kv.Key, kv.Value)) return true;
            }
        }

        if (request == null) return false;
        if (AnyActive(request.Query)) return true;
        if (request.HasFormContentType && AnyActive(request.Form)) return true;
        return false;
    }

    static Boolean AnyActive(IEnumerable<KeyValuePair<String, Microsoft.Extensions.Primitives.StringValues>> source)
    {
        foreach (var kv in source)
        {
            if (IsActiveFilter(kv.Key, kv.Value.ToString())) return true;
        }
        return false;
    }

    /// <summary>单个参数是否算筛选条件。</summary>
    public static Boolean IsActiveFilter(String key, String value)
    {
        if (key.IsNullOrEmpty() || value.IsNullOrWhiteSpace()) return false;
        if (key[0] == '_') return false;

        var names = Pager._;
        if (key.EqualIgnoreCase(names.PageIndex, names.PageSize, names.Sort, names.Desc)) return false;

        // _SelectUser 未选择时仍提交 userId=0；日志检索把 &lt;0 当「全部」
        if (key.EqualIgnoreCase("userId", "userid", "createuserid") && (value == "0" || value == "-1"))
            return false;

        return true;
    }
}
