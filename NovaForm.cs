using Microsoft.AspNetCore.Mvc.ModelBinding;
using NewLife;
using NewLife.Cube.ViewModels;

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

    /// <summary>字段名以 url 结尾，或 ItemType 为 url。这类字段在列长度判断之前用单行输入框。</summary>
    public static Boolean IsUrlField(String name, String itemType) =>
        (!name.IsNullOrEmpty() && name.EndsWithIgnoreCase("url")) || itemType.EqualIgnoreCase("url");

    /// <summary>html、markdown、密码、电话、邮箱、图片、文件等已有专用控件，不按列长度改控件。</summary>
    public static Boolean IsDedicatedStringControl(String name, String itemType)
    {
        if (itemType.EqualIgnoreCase("html", "markdown", "password", "phone", "fax", "mobile", "email", "mail")) return true;
        if (itemType.EqualIgnoreCase("image", "file") || itemType.StartsWithIgnoreCase("image-", "file-")) return true;
        if (itemType.EqualIgnoreCase("area", "area1", "area2", "area3", "area4", "singleSelect", "multipleSelect")) return true;
        if (name.EqualIgnoreCase("Pass", "Password")) return true;
        if (name.EqualIgnoreCase("Phone", "TelPhone", "OfficePhone", "HomePhone", "Fax")) return true;
        if (name.EqualIgnoreCase("Mobile", "MobilePhone", "CellularPhone")) return true;
        if (name.EqualIgnoreCase("email", "mail")) return true;
        return false;
    }

    static Boolean IsPlainString(String name, String itemType, Type type) =>
        (type == null || type == typeof(String)) && !IsUrlField(name, itemType) && !IsDedicatedStringControl(name, itemType);

    /// <summary>1–99：窄单行。数值、布尔、枚举、日期、URL 与专用控件不看长度。</summary>
    public static Boolean IsNarrowSingleLine(String name, String itemType, Type type, Int32 length) =>
        IsPlainString(name, itemType, type) && length >= 1 && length <= 99;

    /// <summary>
    /// 100–299：宽单行。200–299 且名为 Remark、Description、Comment 改走多行，这里返回 false。
    /// 名称以 url 结尾且列长度达到宽档或大文本时，仍是整列宽单行。
    /// </summary>
    public static Boolean IsWideSingleLine(String name, String itemType, Type type, Int32 length)
    {
        if (type != null && type != typeof(String)) return false;
        if (IsUrlField(name, itemType)) return length < 0 || length >= 100;
        if (!IsPlainString(name, itemType, type)) return false;
        if (length >= 200 && name.EqualIgnoreCase("Remark", "Description", "Comment")) return false;
        return length >= 100 && length <= 299;
    }

    /// <summary>多行条件与 <see cref="DataField.IsBigText"/> 一致，但 URL 在长度判断之前保持单行。</summary>
    public static Boolean IsMultilineString(String name, String itemType, Type type, Int32 length)
    {
        if (!IsPlainString(name, itemType, type)) return false;
        return length < 0 || length >= 300 || (length >= 200 && name.EqualIgnoreCase("Remark", "Description", "Comment"));
    }

    /// <summary>大文本行数。Length 小于 0 时用现有最少 3 行，不把负数除进 rows。</summary>
    public static Int32 BigTextRows(Int32 length)
    {
        if (length < 0) return 3;
        var row = (Int32)Math.Round(length / 100d);
        if (row < 3) row = 3;
        return row;
    }

    /// <summary>下拉、外键映射不按字符串列长度分档。</summary>
    public static Boolean IgnoresStringLength(DataField field) =>
        field != null && (field.DataSource != null || !field.MapField.IsNullOrEmpty());

    /// <summary>1–99 窄单行。有数据源或映射的字段不套用。</summary>
    public static Boolean IsNarrowSingleLine(DataField field) =>
        field != null && !IgnoresStringLength(field) && IsNarrowSingleLine(field.Name, field.ItemType, field.Type, field.Length);

    /// <summary>宽单行（含长 URL）。有数据源或映射的字段不套用。</summary>
    public static Boolean IsWideSingleLine(DataField field) =>
        field != null && !IgnoresStringLength(field) && IsWideSingleLine(field.Name, field.ItemType, field.Type, field.Length);

    /// <summary>
    /// 独占表单一行。多行与 <see cref="DataField.IsBigText"/> 一致；
    /// 宽单行、列长度达到宽档的 URL 也占整列宽。自定义 GroupView 与权限矩阵不并排。
    /// </summary>
    public static Boolean SpansFormRow(DataField field)
    {
        if (field == null) return false;
        if (field is FormField form && !form.GroupView.IsNullOrEmpty()) return true;
        if (field.Name.EqualIgnoreCase("Permission")) return true;
        if (field.ItemType.EqualIgnoreCase("html", "markdown")) return true;
        if (IgnoresStringLength(field)) return field.IsBigText();
        if (field.IsBigText()) return true;
        return IsWideSingleLine(field.Name, field.ItemType, field.Type, field.Length);
    }
}
