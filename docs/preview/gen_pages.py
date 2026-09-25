# -*- coding: utf-8 -*-
"""从生产 nova-ui.css 提取 :root 令牌块，生成列表页/表单页预览 HTML。"""
import re, pathlib

CSS = pathlib.Path(r"G:\009repos\002MingJia\NewLife.Cube.Nova\wwwroot\Content\nova\nova-ui.css")
OUT = pathlib.Path(r"G:\009repos\002MingJia\NewLife.Cube.Nova\docs\preview")

css = CSS.read_text(encoding="utf-8")
m = re.search(r":root\s*\{.*?\n\}", css, re.S)
assert m, "未找到 :root 令牌块"
tokens = m.group(0)

PAGE_CSS = """
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{font-family:var(--nv-font);background:var(--nv-bg);color:var(--nv-text);font-size:var(--nv-fs-14);line-height:var(--nv-lh-body);display:flex}
.sidebar{width:var(--nv-sidebar-w);background:var(--nv-bg-frame);border-right:1px solid var(--nv-border);flex-shrink:0;display:flex;flex-direction:column;height:100vh;position:sticky;top:0}
.brand{height:var(--nv-header-h);display:flex;align-items:center;gap:10px;padding:0 16px;border-bottom:1px solid var(--nv-border);font-weight:var(--nv-fw-semi)}
.brand .logo{width:30px;height:30px;border-radius:var(--nv-r-sm);background:var(--nv-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:var(--nv-sh-primary)}
.menu{padding:12px 8px;flex:1}
.menu-group{font-size:var(--nv-fs-12);color:var(--nv-text-4);padding:14px 12px 6px}
.menu-item{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:var(--nv-r-sm);color:var(--nv-text-2);font-size:var(--nv-fs-14);margin-bottom:2px;cursor:pointer}
.menu-item:hover{background:var(--nv-primary-wash);color:var(--nv-primary)}
.menu-item.active{background:var(--nv-primary-weak);color:var(--nv-primary);font-weight:var(--nv-fw-semi);box-shadow:inset 0 0 0 1px var(--nv-primary-weak-2)}
.menu-item .arrow{margin-left:auto;color:var(--nv-text-4);font-size:11px}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.topbar{height:var(--nv-header-h);background:var(--nv-surface);border-bottom:1px solid var(--nv-border);display:flex;align-items:center;padding:0 var(--nv-pad-page);gap:14px}
.crumb{color:var(--nv-text-3);font-size:var(--nv-fs-13)}
.crumb b{color:var(--nv-text);font-weight:var(--nv-fw-semi)}
.topbar .sp{flex:1}
.search{display:flex;align-items:center;gap:8px;width:230px;height:32px;border:1px solid var(--nv-border-strong);border-radius:var(--nv-r-sm);padding:0 10px;color:var(--nv-text-4);font-size:var(--nv-fs-13);background:var(--nv-surface)}
.user{display:flex;align-items:center;gap:8px;font-size:var(--nv-fs-13);color:var(--nv-text-2);cursor:pointer;padding:4px 8px;border-radius:var(--nv-r-sm)}
.user:hover{background:var(--nv-gray-100)}
.avatar{width:26px;height:26px;border-radius:50%;background:var(--nv-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px}
.content{padding:var(--nv-sp-5) var(--nv-pad-page);flex:1}
.page-head{display:flex;align-items:center;margin-bottom:var(--nv-sp-4)}
.page-head h1{font-size:var(--nv-fs-20);font-weight:var(--nv-fw-semi)}
.page-head .sub{color:var(--nv-text-3);font-size:var(--nv-fs-13);margin-left:12px}
.page-head .sp{flex:1}
/* 按钮（生产令牌：--nv-grad-primary 已是纯色） */
.btn{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:var(--nv-r-sm);font-size:var(--nv-fs-13);cursor:pointer;border:1px solid transparent;font-family:inherit;transition:all .15s}
.btn-pri{background:var(--nv-grad-primary);color:var(--nv-on-primary);box-shadow:var(--nv-sh-primary)}
.btn-pri:hover{background:var(--nv-grad-primary-hover)}
.btn-sec{background:var(--nv-surface);border-color:var(--nv-border-strong);color:var(--nv-text-2)}
.btn-sec:hover{border-color:var(--nv-primary);color:var(--nv-primary);background:var(--nv-primary-weak)}
.btn-danger{background:var(--nv-surface);border-color:var(--nv-border-strong);color:var(--nv-danger)}
.btn-danger:hover{background:var(--nv-danger);border-color:var(--nv-danger);color:#fff}
.card{background:var(--nv-surface);border:1px solid var(--nv-border);border-radius:var(--nv-r-md);box-shadow:var(--nv-sh-1)}
/* 工具栏 */
.toolbar{padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--nv-border)}
.toolbar .sp{flex:1}
.tinput{height:34px;border:1px solid var(--nv-border-strong);border-radius:var(--nv-r-sm);padding:0 10px;font-size:var(--nv-fs-13);font-family:inherit;color:var(--nv-text);width:200px;background:var(--nv-surface)}
.tinput:focus{outline:none;border-color:var(--nv-primary);box-shadow:var(--nv-sh-focus)}
.filters{display:flex;align-items:flex-end;gap:12px;padding:12px 16px;flex-wrap:wrap;border-bottom:1px solid var(--nv-border)}
.fi-mini{display:flex;flex-direction:column;gap:4px}
.fi-mini label{font-size:var(--nv-fs-12);color:var(--nv-text-3)}
.fi-mini select,.fi-mini input{height:34px;border:1px solid var(--nv-border-strong);border-radius:var(--nv-r-sm);padding:0 10px;font-size:var(--nv-fs-13);font-family:inherit;color:var(--nv-text);background:var(--nv-surface);width:200px}
.fi-mini input{width:126px}
/* 表格 */
table{width:100%;border-collapse:collapse;font-size:var(--nv-fs-13)}
th{background:var(--nv-surface-3);color:var(--nv-text-2);font-weight:var(--nv-fw-semi);text-align:left;padding:10px 12px;border-bottom:1px solid var(--nv-border-strong);font-size:var(--nv-fs-12);white-space:nowrap}
td{padding:var(--nv-cell-py) 12px;border-bottom:1px solid var(--nv-border);color:var(--nv-text-2);white-space:nowrap}
tbody tr:hover{background:var(--nv-surface-hover)}
tbody tr:last-child td{border-bottom:none}
.num{font-variant-numeric:tabular-nums;color:var(--nv-text-2)}
.link{color:var(--nv-primary);cursor:pointer}
.link:hover{text-decoration:underline}
.st{display:inline-flex;align-items:center;gap:6px;font-size:var(--nv-fs-12);padding:2px 10px;border-radius:var(--nv-r-xs);font-weight:var(--nv-fw-medium)}
.st i{width:6px;height:6px;border-radius:50%;display:inline-block}
.st-on{background:var(--nv-st-online-weak);color:var(--nv-success-text)} .st-on i{background:var(--nv-st-online)}
.st-off{background:var(--nv-st-offline-weak);color:var(--nv-text-3)} .st-off i{background:var(--nv-st-offline)}
.st-warn{background:var(--nv-st-warn-weak);color:var(--nv-warning-text)} .st-warn i{background:var(--nv-st-warn)}
.st-err{background:var(--nv-st-alarm-weak);color:var(--nv-danger-text)} .st-err i{background:var(--nv-st-alarm)}
.st-busy{background:var(--nv-st-busy-weak);color:var(--nv-primary)} .st-busy i{background:var(--nv-st-busy)}
.pager{display:flex;align-items:center;gap:6px;justify-content:flex-end;padding:12px 16px;font-size:var(--nv-fs-13);color:var(--nv-text-3)}
.pg{min-width:28px;height:28px;border-radius:var(--nv-r-xs);border:1px solid var(--nv-border-strong);display:flex;align-items:center;justify-content:center;cursor:pointer;background:var(--nv-surface)}
.pg:hover{border-color:var(--nv-primary);color:var(--nv-primary)}
.pg.cur{background:var(--nv-primary);border-color:var(--nv-primary);color:#fff}
/* 批量条 */
.bulkbar{display:flex;align-items:center;gap:12px;margin:14px 16px;padding:9px 14px;background:var(--nv-primary-weak);border:1px solid var(--nv-primary-weak-2);border-radius:var(--nv-r-sm);font-size:var(--nv-fs-13);color:var(--nv-text-2)}
.bulkbar b{color:var(--nv-primary);font-weight:var(--nv-fw-semi)}
/* 表单 */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;padding:16px}
.fi label{display:block;font-size:var(--nv-fs-13);color:var(--nv-text-2);margin-bottom:6px}
.fi label em{color:var(--nv-danger);font-style:normal;margin-left:2px}
.fi input,.fi select,.fi textarea{width:100%;height:36px;border:1px solid var(--nv-border-strong);border-radius:var(--nv-r-sm);padding:0 10px;font-size:var(--nv-fs-13);font-family:inherit;color:var(--nv-text);background:var(--nv-surface);transition:border-color .15s,box-shadow .15s}
.fi textarea{height:auto;padding:8px 10px;resize:vertical}
.fi input:focus,.fi select:focus,.fi textarea:focus{outline:none;border-color:var(--nv-primary);box-shadow:var(--nv-sh-focus)}
.fi .hint{font-size:var(--nv-fs-12);color:var(--nv-text-4);margin-top:4px}
.fi.full{grid-column:1/-1}
.fi.err input{border-color:var(--nv-danger)}
.fi.err input:focus{box-shadow:0 0 0 3px rgba(192,68,68,.15)}
.fi .err-msg{font-size:var(--nv-fs-12);color:var(--nv-danger-text);margin-top:4px;display:flex;align-items:center;gap:5px}
.fi.ok input{border-color:var(--nv-success)}
.form-foot{display:flex;gap:10px;padding:14px 16px;border-top:1px solid var(--nv-border);background:var(--nv-surface);position:sticky;bottom:0}
.group-t{font-size:var(--nv-fs-14);font-weight:var(--nv-fw-semi);padding:13px 16px;border-bottom:1px solid var(--nv-border);display:flex;align-items:center}
.group-t .tag{font-size:var(--nv-fs-12);color:var(--nv-text-4);font-weight:var(--nv-fw-normal);margin-left:10px}
"""

LAYOUT = """
<aside class="sidebar">
  <div class="brand"><span class="logo">◆</span>应用管理平台</div>
  <nav class="menu">
    <div class="menu-item active"><span>▦</span>工作台</div>
    <div class="menu-group">业务管理</div>
    <div class="menu-item"><span>▤</span>业务台账<span class="arrow">›</span></div>
    <div class="menu-item"><span>⚠</span>告警中心<span class="arrow">›</span></div>
    <div class="menu-item"><span>◫</span>统计报表</div>
    <div class="menu-group">系统管理</div>
    <div class="menu-item"><span>♟</span>用户管理</div>
    <div class="menu-item"><span>⚙</span>权限设置</div>
    <div class="menu-item"><span>◷</span>操作日志</div>
  </nav>
</aside>
<div class="main">
  <header class="topbar">
    <span class="crumb">{crumb}</span>
    <div class="sp"></div>
    <div class="search">🔍 关键字搜索</div>
    <div class="user"><span class="avatar">管</span>系统管理员 <span style="color:var(--nv-text-4)">▾</span></div>
  </header>
  <main class="content">
    <div class="page-head">
      <h1>{title}</h1><span class="sub">{sub}</span>
      <div class="sp"></div>
      {head_btns}
    </div>
    {body}
  </main>
</div>
"""

LIST_BODY = """
<div class="card">
  <div class="toolbar">
    <button class="btn btn-pri">＋ 新增</button>
    <button class="btn btn-sec">批量导入</button>
    <button class="btn btn-danger">删 除</button>
    <div class="sp"></div>
    <input class="tinput" placeholder="名称 / 编号关键字">
    <button class="btn btn-pri" style="box-shadow:none">查 询</button>
    <button class="btn btn-sec">重 置</button>
  </div>
  <div class="filters">
    <div class="fi-mini"><label>所属单位</label><select><option>全部</option><option>机关单位</option><option>下属事业单位</option></select></div>
    <div class="fi-mini"><label>状态</label><select><option>全部</option><option>在线</option><option>离线</option><option>告警</option></select></div>
    <div class="fi-mini"><label>创建日期</label><div style="display:flex;gap:6px"><input placeholder="2026-09-01"> <span style="align-self:center;color:var(--nv-text-4)">—</span> <input placeholder="2026-09-25"></div></div>
  </div>
  <table>
    <thead><tr><th><input type="checkbox"></th><th>编号</th><th>名称</th><th>所属单位</th><th>位置</th><th>状态</th><th>电量</th><th>最近更新</th><th style="text-align:right">数值A</th><th style="text-align:right">数值B</th><th>操作</th></tr></thead>
    <tbody>
      <tr><td><input type="checkbox"></td><td class="num">SB-2024-0087</td><td>采集终端甲</td><td>机关事务管理局</td><td>1号楼 3层</td><td><span class="st st-on"><i></i>在线</span></td><td class="num">86%</td><td class="num">2026-09-25 07:42</td><td class="num" style="text-align:right">12,480</td><td class="num" style="text-align:right">3,216.50</td><td><span class="link">详情</span> · <span class="link">编辑</span></td></tr>
      <tr><td><input type="checkbox"></td><td class="num">SB-2024-0103</td><td>计量仪表乙</td><td>水务服务中心</td><td>配电室 B</td><td><span class="st st-warn"><i></i>告警</span></td><td class="num">42%</td><td class="num">2026-09-25 06:15</td><td class="num" style="text-align:right">8,042</td><td class="num" style="text-align:right">1,098.00</td><td><span class="link">详情</span> · <span class="link">处理</span></td></tr>
      <tr><td><input type="checkbox"></td><td class="num">SB-2023-0561</td><td>控制单元丙</td><td>图书档案馆</td><td>东门岗亭</td><td><span class="st st-off"><i></i>离线</span></td><td class="num">—</td><td class="num">2026-09-22 18:03</td><td class="num" style="text-align:right">0</td><td class="num" style="text-align:right">0.00</td><td><span class="link">详情</span> · <span class="link">重启</span></td></tr>
      <tr><td><input type="checkbox"></td><td class="num">SB-2024-0218</td><td>探测装置丁</td><td>档案保管中心</td><td>库房 2F</td><td><span class="st st-on"><i></i>在线</span></td><td class="num">93%</td><td class="num">2026-09-25 07:51</td><td class="num" style="text-align:right">27,615</td><td class="num" style="text-align:right">9,334.75</td><td><span class="link">详情</span> · <span class="link">编辑</span></td></tr>
      <tr><td><input type="checkbox"></td><td class="num">SB-2024-0330</td><td>监控主机戊</td><td>体育活动中心</td><td>中控室</td><td><span class="st st-busy"><i></i>维护中</span></td><td class="num">67%</td><td class="num">2026-09-24 22:10</td><td class="num" style="text-align:right">5,390</td><td class="num" style="text-align:right">2,007.20</td><td><span class="link">详情</span> · <span class="link">编辑</span></td></tr>
    </tbody>
  </table>
  <div class="bulkbar">已选 <b>2</b> 项：<span class="link">批量启用</span> · <span class="link">批量导出</span> · <span class="link" style="color:var(--nv-danger-text)">批量删除</span><span style="margin-left:auto" class="link">取消选择</span></div>
  <div class="pager">共 4,216 条 <span class="pg">‹</span><span class="pg cur">1</span><span class="pg">2</span><span class="pg">3</span><span class="pg">…</span><span class="pg">212</span><span class="pg">›</span></div>
</div>
"""

FORM_BODY = """
<div class="card" style="margin-bottom:16px">
  <div class="group-t">基础信息<span class="tag">带 <em style="color:var(--nv-danger);font-style:normal">*</em> 为必填项</span></div>
  <div class="form-grid">
    <div class="fi"><label>名称<em>*</em></label><input value="采集终端甲"><div class="hint">保存后名称全局唯一，不可与其他条目重复。</div></div>
    <div class="fi"><label>编号<em>*</em></label><input placeholder="留空则由系统自动生成"></div>
    <div class="fi"><label>所属单位<em>*</em></label><select><option>机关事务管理局</option><option>水务服务中心</option><option>图书档案馆</option></select></div>
    <div class="fi err"><label>联系电话<em>*</em></label><input value="1380013800"><div class="err-msg">⚠ 号码格式不完整，请输入 11 位手机号</div></div>
    <div class="fi"><label>安装位置</label><input placeholder="如：1号楼 3层"></div>
    <div class="fi ok"><label>邮箱</label><input value="contact@example.gov.cn"></div>
    <div class="fi full"><label>备注说明</label><textarea rows="3" placeholder="选填，补充用途、采购信息等内容"></textarea><div class="hint">备注仅本单位管理员可见，最长 500 字。</div></div>
  </div>
</div>
<div class="card">
  <div class="group-t">参数配置</div>
  <div class="form-grid">
    <div class="fi"><label>上报周期</label><select><option>每 5 分钟</option><option>每 15 分钟</option><option>每 1 小时</option></select></div>
    <div class="fi"><label>告警阈值</label><input value="80"><div class="hint">超过阈值即触发告警并通知管理员。</div></div>
    <div class="fi"><label>启用状态</label><select><option>启用</option><option>停用</option></select></div>
    <div class="fi"><label>维护窗口</label><input placeholder="如：每周日 02:00–04:00"></div>
  </div>
  <div class="form-foot">
    <button class="btn btn-pri">保 存</button>
    <button class="btn btn-sec">取消</button>
    <button class="btn btn-sec" style="margin-left:auto;color:var(--nv-text-4)">保存中…</button>
  </div>
</div>
"""

def page(name, crumb, title, sub, head_btns, body, extra_h=0):
    h = 1240 + extra_h
    html = f"""<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><title>{title} — Nova v3 预览</title>
<style>{tokens}
{PAGE_CSS}
</style></head><body>
{LAYOUT.format(crumb=crumb, title=title, sub=sub, head_btns=head_btns, body=body)}
</body></html>"""
    (OUT / name).write_text(html, encoding="utf-8")
    print(f"{name}  written, viewport height {h}")
    return h

h1 = page("list.html", "业务管理 / <b>业务台账</b>", "业务台账", "共 4,216 条 · 更新于 10 分钟前",
          '<button class="btn btn-sec">⬇ 导出</button><button class="btn btn-pri">＋ 新增</button>',
          LIST_BODY)
h2 = page("form.html", "业务管理 / 业务台账 / <b>新增</b>", "新增条目", "编辑 / 详情同构，必填项已标星",
          '<button class="btn btn-sec">返回列表</button>',
          FORM_BODY)
pathlib.Path(OUT / "_heights.txt").write_text(f"{h1}\n{h2}", encoding="ascii")
print("done")
