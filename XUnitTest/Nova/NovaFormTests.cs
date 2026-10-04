using System.ComponentModel;
using NewLife.Cube.Nova;
using NewLife.Cube.ViewModels;
using Xunit;

namespace XUnitTest.Nova;

public class NovaFormTests
{
    static DataField Text(String name, Int32 length) => new()
    {
        Name = name,
        Type = typeof(String),
        Length = length,
    };

    [Fact]
    [DisplayName("列长 500 且无数据源时仍是大文本")]
    public void LongTextWithoutSourceRendersAsBigText()
    {
        var remark = Text("Remark", 500);

        Assert.True(NovaForm.RendersAsBigText(remark));
        Assert.True(NovaForm.SpansFormRow(remark));
    }

    [Fact]
    [DisplayName("备注名且长度 200–299、无数据源时仍是多行")]
    public void RemarkInMidLengthStaysMultiline()
    {
        var remark = Text("Remark", 250);

        Assert.True(NovaForm.RendersAsBigText(remark));
        Assert.False(NovaForm.IsWideSingleLine(remark));
    }

    [Fact]
    [DisplayName("数据部门：有数据源的长字符串不渲染成大文本，仍独占一行")]
    public void DataDepartmentIdsWithSourceIsNotBigText()
    {
        var field = Text("DataDepartmentIds", 500);
        field.DataSource = _ => new Dictionary<Int32, String>();

        Assert.True(NovaForm.IgnoresStringLength(field));
        Assert.False(NovaForm.RendersAsBigText(field));
        Assert.False(NovaForm.IsWideSingleLine(field));
        Assert.False(NovaForm.IsNarrowSingleLine(field));
        Assert.True(NovaForm.SpansFormRow(field));
    }

    [Fact]
    [DisplayName("外键映射的长字符串不渲染成大文本")]
    public void MapFieldDoesNotRenderAsBigText()
    {
        var field = Text("PlaceName", 500);
        field.MapField = "PlaceID";

        Assert.False(NovaForm.RendersAsBigText(field));
        Assert.True(NovaForm.SpansFormRow(field));
    }

    [Fact]
    [DisplayName("有数据源的短字段保持普通下拉，不占整行")]
    public void ShortSingleSelectStaysInline()
    {
        var field = new DataField
        {
            Name = "DepartmentId",
            Type = typeof(Int32),
            Length = 0,
            DataSource = _ => new Dictionary<Int32, String>(),
        };

        Assert.False(NovaForm.RendersAsBigText(field));
        Assert.False(NovaForm.SpansFormRow(field));
    }

    [Fact]
    [DisplayName("有数据源的单选长字符串也不改成大文本")]
    public void LongSingleSelectSourceIsNotBigText()
    {
        var field = Text("Theme", 500);
        field.DataSource = _ => new Dictionary<String, String>();

        Assert.False(NovaForm.RendersAsBigText(field));
    }

    [Fact]
    [DisplayName("空字段不是大文本，也不独占一行")]
    public void NullFieldIsNeither()
    {
        Assert.False(NovaForm.RendersAsBigText(null));
        Assert.False(NovaForm.SpansFormRow(null));
    }

    [Fact]
    [DisplayName("权限矩阵仍独占一行，且不因列长被当成大文本")]
    public void PermissionMatrixStillSpans()
    {
        var field = new DataField
        {
            Name = "Permission",
            Type = typeof(String),
            Length = 0,
        };

        Assert.False(NovaForm.RendersAsBigText(field));
        Assert.True(NovaForm.SpansFormRow(field));
    }

    [Theory]
    [InlineData("DataDepartmentIds", null, true)]
    [InlineData("RoleIds", null, true)]
    [InlineData("RoleId", null, false)]
    [InlineData("DepartmentId", null, false)]
    [InlineData("Theme", "singleSelect", false)]
    [InlineData("Roles", "singleSelect", false)]
    [InlineData("Code", "multipleSelect", true)]
    [InlineData(null, "multipleSelect", true)]
    [InlineData(null, null, false)]
    [DisplayName("singleSelect 保持单选，multipleSelect 或名称以 s 结尾为多选")]
    public void MultipleSelectFollowsItemTypeThenName(String? name, String? itemType, Boolean multi)
    {
        Assert.Equal(multi, NovaForm.IsMultipleSelect(name, itemType));
    }

    [Fact]
    [DisplayName("分组视图用 RendersAsBigText，不再直接按 IsBigText 输出大文本")]
    public void FormGroupsDelegateBigTextToHelper()
    {
        var root = RepoRoot();
        foreach (var rel in new[]
        {
            "Views/Nova/_Form_Group.cshtml",
            "Areas/Admin/Views/Role_Nova/_Form_Group.cshtml",
        })
        {
            var text = File.ReadAllText(Path.Combine(root, rel));
            Assert.Contains("NovaForm.RendersAsBigText(", text);
            Assert.DoesNotContain(".IsBigText()", text);
            Assert.Contains("_Form_Item", text);
        }

        var role = File.ReadAllText(Path.Combine(root, "Areas/Admin/Views/Role_Nova/_Form_Group.cshtml"));
        Assert.Contains("SetPermission", role);
        Assert.Contains("Permission", role);

        var big = File.ReadAllText(Path.Combine(root, "Views/Nova/_Form_BigText.cshtml"));
        Assert.Contains("NovaForm.IgnoresStringLength(", big);
        Assert.Contains("_Form_Item", big);

        var item = File.ReadAllText(Path.Combine(root, "Views/Nova/_Form_Item.cshtml"));
        Assert.Contains("NovaForm.IsMultipleSelect(", item);
        Assert.Contains("_Form_ListBox", item);
        Assert.Contains("_Form_DropDownList", item);

        var obj = File.ReadAllText(Path.Combine(root, "Views/Nova/_ObjectForm_Field.cshtml"));
        Assert.Contains("NovaForm.IsMultipleSelect(", obj);
        Assert.Contains("_Form_ListBox", obj);
        Assert.Contains("_Form_DropDownList", obj);
    }

    [Fact]
    [DisplayName("除列表截断外，表单模板不再直接调用 IsBigText")]
    public void FormTemplatesDoNotCallIsBigTextDirectly()
    {
        var root = RepoRoot();
        var hits = new List<String>();
        foreach (var dir in new[] { "Views", "Areas" })
        {
            var full = Path.Combine(root, dir);
            if (!Directory.Exists(full)) continue;
            foreach (var file in Directory.EnumerateFiles(full, "*.cshtml", SearchOption.AllDirectories))
            {
                var rel = Path.GetRelativePath(root, file).Replace('\\', '/');
                if (rel.EndsWith("_List_Data_Item.cshtml", StringComparison.Ordinal)) continue;
                var text = File.ReadAllText(file);
                if (text.Contains(".IsBigText(", StringComparison.Ordinal))
                    hits.Add(rel);
            }
        }

        Assert.Empty(hits);
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
