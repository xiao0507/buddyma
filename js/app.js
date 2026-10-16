/* ============================================================
 * WorkBuddy · 页面交互逻辑
 * 上传/精读/生成/导出/复制/PWA 注册
 * ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    doc: null,          // 精读结果
    lastResult: null,   // 最近生成结果
    lastType: null
  };

  /* ---------- 通用工具 ---------- */
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function textToLines(text) {
    return String(text || '').split('\n').map(function (l) { return escapeHtml(l); }).join('<br>');
  }

  function downloadText(filename, content) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function downloadCSV(filename, content) {
    var blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyText(text, okMsg) {
    var done = function () { toast(okMsg || '已复制到剪贴板'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败，请手动复制'); }
    document.body.removeChild(ta);
  }

  /* ---------- Tab 切换 ---------- */
  function bindTabs() {
    var tabs = document.querySelectorAll('.tab-btn');
    var panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-target');
        tabs.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        panels.forEach(function (p) { p.classList.toggle('active', p.id === target); });
      });
    });
  }

  /* ---------- 任务类型选择 ---------- */
  function initTaskTypes() {
    var wrap = $('taskTypeWrap');
    if (!wrap || !window.LIB) return;
    var html = '';
    LIB.taskTypes.forEach(function (t) {
      html += '<div class="task-card" data-type="' + t.key + '">' +
        '<div class="task-card-icon">' + t.icon + '</div>' +
        '<div class="task-card-name">' + t.name + '</div>' +
        '<div class="task-card-desc">' + t.desc + '</div></div>';
    });
    wrap.innerHTML = html;
    wrap.querySelectorAll('.task-card').forEach(function (card) {
      card.addEventListener('click', function () {
        wrap.querySelectorAll('.task-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
        $('taskType').value = card.getAttribute('data-type');
        onTypeChange();
      });
    });
  }

  function onTypeChange() {
    var type = $('taskType').value;
    var config = $('taskConfig');
    var lessonExtra = $('lessonExtra');
    var planExtra = $('planExtra');
    var genBtn = $('generateBtn');
    config.style.display = 'block';
    if (type === 'lesson') {
      lessonExtra.style.display = 'block';
      planExtra.style.display = 'none';
      genBtn.textContent = '生成教案 + 说课稿 + PPT脚本';
    } else if (type === 'plan') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成工作方案';
    } else if (type === 'summary') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成工作总结';
    } else if (type === 'ppt') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成PPT文稿';
    } else if (type === 'table') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成数据表格';
    } else if (type === 'article') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成文案';
    } else if (type === 'report') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '生成分析报告';
    } else if (type === 'todo') {
      lessonExtra.style.display = 'none';
      planExtra.style.display = 'block';
      genBtn.textContent = '拆解任务步骤';
    }
  }

  function bindTypeSelect() {
    $('taskType').addEventListener('change', onTypeChange);
  }

  /* ---------- 主题占位提示 ---------- */
  function updateThemePlaceholder() {
    var age = $('ageSelect').value;
    var domain = $('domainSelect').value;
    var d = LIB.domains[domain];
    if (d && d.themes) {
      var keys = Object.keys(d.themes);
      $('themeInput').placeholder = '例如：' + keys[Math.floor(Math.random() * keys.length)] + '（也可自定义主题）';
    }
  }

  /* ---------- 文档精读 ---------- */
  function initDocReader() {
    var fileInput = $('docFile');
    var dropZone = $('dropZone');
    var pasteBox = $('docText');
    var analyzeBtn = $('analyzeBtn');
    var docResult = $('docResult');

    function handleFile(file) {
      if (!file) return;
      if (!/\.(pdf|docx|doc|txt|md)$/i.test(file.name)) {
        toast('仅支持 PDF / Word / TXT 文件');
        return;
      }
      toast('正在本地解析 ' + file.name + ' …');
      $('docFileName').textContent = file.name;
      $('docFileType').textContent = Reader.getFileType(file);
      Reader.parseFile(file).then(function (text) {
        if (!text || !text.trim()) {
          toast('未能从文档中提取到文本（可能为扫描版）');
          return;
        }
        state.doc = Reader.analyze(text, { name: file.name, type: Reader.getFileType(file) });
        renderDocResult();
        toast('文档精读完成');
      }).catch(function (err) {
        toast(err.message || '解析失败');
        console.error(err);
      });
    }

    fileInput.addEventListener('change', function () {
      handleFile(fileInput.files[0]);
    });

    // 拖拽
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag');
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    dropZone.addEventListener('click', function () { fileInput.click(); });

    // 粘贴文本精读
    analyzeBtn.addEventListener('click', function () {
      var text = pasteBox.value.trim();
      if (!text) { toast('请先粘贴文本'); return; }
      state.doc = Reader.analyze(text, { name: '粘贴文本', type: '文本' });
      renderDocResult();
      toast('文本精读完成');
    });
  }

  function renderDocResult() {
    var d = state.doc;
    if (!d) return;
    var el = $('docResult');
    el.style.display = 'block';
    var kw = d.keywords && d.keywords.length ? d.keywords.slice(0, 8).map(function (k) { return '<span class="kw-chip">' + escapeHtml(k) + '</span>'; }).join('') : '<span class="muted">（未提取到明显关键词）</span>';
    var outline = d.outline && d.outline.length ? d.outline.map(function (o) { return '<li>' + escapeHtml(o) + '</li>'; }).join('') : '<li class="muted">（未提取到明显框架）</li>';
    el.innerHTML =
      '<div class="doc-meta">' +
        '<span class="badge">' + escapeHtml(d.meta.name) + '</span>' +
        '<span class="badge">' + escapeHtml(d.meta.type) + '</span>' +
        '<span class="badge">约 ' + d.charCount + ' 字</span>' +
        '<span class="badge">' + d.paragraphCount + ' 段</span>' +
      '</div>' +
      '<h4>📌 关键词</h4><div class="kw-box">' + kw + '</div>' +
      '<h4>📑 内容框架</h4><ul class="outline-list">' + outline + '</ul>' +
      '<h4>📄 摘要</h4><div class="summary-box">' + textToLines(d.summary) + '</div>' +
      '<div class="btn-row">' +
        '<button class="btn ghost" id="copySummaryBtn">复制摘要</button>' +
        '<button class="btn ghost" id="downloadFullBtn">下载全文</button>' +
      '</div>';
    $('copySummaryBtn').addEventListener('click', function () { copyText(d.summary, '摘要已复制'); });
    $('downloadFullBtn').addEventListener('click', function () { downloadText((d.meta.name || '文档') + '.txt', d.fullText); });
  }

  /* ---------- 任务拆解 ---------- */
  function initPlanner() {
    var rawInput = $('planRaw');
    var extra = $('planExtraInput');
    $('planBtn').addEventListener('click', function () {
      var r = rawInput.value.trim();
      if (!r) { toast('请先填写任务目标'); return; }
      var result = TaskPlanner.plan(r, extra.value.trim());
      var el = $('planResult');
      el.style.display = 'block';
      el.innerHTML = '<h4>' + escapeHtml(result.typeName) + '</h4>' +
        '<p class="muted">任务目标：' + escapeHtml(result.rawInput) + (result.extra ? '<br>补充：' + escapeHtml(result.extra) : '') + '</p>' +
        '<div class="plan-steps">' + result.steps.map(function (s) {
          return '<div class="plan-step"><span class="step-no">' + s.no + '</span><div><b>' + escapeHtml(s.name) + '</b><p>' + escapeHtml(s.detail) + '</p><span class="muted">建议：' + escapeHtml(s.tool) + '</span></div></div>';
        }).join('') + '</div>' +
        '<div class="btn-row"><button class="btn ghost" id="copyPlanBtn">复制拆解清单</button></div>';
      $('copyPlanBtn').addEventListener('click', function () { copyText(TaskPlanner.toMarkdown(result)); });
      toast('任务已拆解为 ' + result.steps.length + ' 个步骤');
    });
  }

  /* ---------- 生成 ---------- */
  function initGenerate() {
    $('generateBtn').addEventListener('click', doGenerate);
  }

  function doGenerate() {
    var type = $('taskType').value;
    var cfg = { type: type };
    if (type === 'lesson') {
      cfg.age = $('ageSelect').value;
      cfg.domain = $('domainSelect').value;
      cfg.theme = $('themeInput').value.trim();
      cfg.purpose = $('purposeSelect').value;
    } else {
      cfg.theme = $('planTheme').value.trim();
      cfg.purpose = $('planTypeName').value;
    }
    // 通用字段
    cfg.when = $('planWhen').value.trim();
    cfg.where = $('planWhere').value.trim();
    cfg.who = $('planWho').value.trim();
    cfg.period = $('planPeriod').value.trim();
    cfg.scope = $('planScope').value.trim();
    cfg.highlights = $('planHighlights').value.trim();
    cfg.audience = $('planAudience').value.trim();
    cfg.title = $('tableTitle').value.trim();
    cfg.cols = $('tableCols').value.trim();
    cfg.rows = $('tableRows').value.trim();
    cfg.type2 = $('articleType').value;
    cfg.raw = $('planRaw2').value.trim();
    cfg.doc = state.doc;

    if (type === 'lesson' && !cfg.theme) {
      var d = LIB.domains[cfg.domain];
      var keys = d && d.themes ? Object.keys(d.themes) : [];
      cfg.theme = keys[Math.floor(Math.random() * keys.length)] || '我的好朋友';
    }

    var result = Gen.generate(cfg);
    state.lastResult = result;
    state.lastType = type;
    renderResult(result);
    toast('生成完成');
  }

  /* ---------- 结果渲染 ---------- */
  function renderResult(result) {
    var el = $('resultArea');
    el.style.display = 'block';
    var html = '';

    if (result.type === 'lesson') {
      var l = result.lesson;
      html += '<div class="result-title">' + escapeHtml(l.title) + '</div>';
      html += '<div class="badge-row">' +
        '<span class="badge">' + escapeHtml(l.ageName) + '</span>' +
        '<span class="badge">' + escapeHtml(l.domainName) + '领域</span>' +
        '<span class="badge">' + escapeHtml(l.duration) + '</span>' +
        (result.meta.purpose === 'contest' ? '<span class="badge hot">比赛版</span>' : result.meta.purpose === 'exam' ? '<span class="badge hot">教资版</span>' : '') +
      '</div>';

      html += '<h4>一、设计意图</h4><p>' + textToLines(l.designIntent) + '</p>';

      html += '<h4>二、活动目标</h4>';
      html += '<p><b>认知目标：</b></p><ul>' + l.cognitionGoals.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>';
      html += '<p><b>技能目标：</b></p><ul>' + l.skillGoals.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>';
      html += '<p><b>情感目标：</b></p><ul>' + l.emotionGoals.map(function (g) { return '<li>' + escapeHtml(g) + '</li>'; }).join('') + '</ul>';

      html += '<h4>三、活动重难点</h4>';
      html += '<p><b>活动重点：</b>' + escapeHtml(l.focus) + '</p>';
      html += '<p><b>活动难点：</b>' + escapeHtml(l.difficulty) + '</p>';

      html += '<h4>四、活动准备</h4>';
      html += '<p><b>经验准备：</b>' + escapeHtml(l.expPrep) + '</p>';
      html += '<p><b>物质准备：</b>' + escapeHtml(l.matPrep) + '</p>';

      html += '<h4>五、活动过程</h4>';
      html += '<p><b>导入环节（' + l.timePlan[0].min + '）：' + escapeHtml(l.opening.type) + '</b></p><p>' + escapeHtml(l.opening.text) + '</p>';
      l.steps.forEach(function (s, i) {
        html += '<p><b>展开环节' + (i + 1) + ' · ' + escapeHtml(s.title) + '（' + s.min + '）</b></p>';
        html += '<ul>' + s.items.map(function (it) { return '<li>' + escapeHtml(it) + '</li>'; }).join('') + '</ul>';
      });
      html += '<p><b>结束环节（' + l.timePlan[2].min + '）</b></p><p>' + escapeHtml(l.ending) + '</p>';

      html += '<h4>六、活动延伸</h4><ul>' + l.extends.map(function (e) { return '<li>' + escapeHtml(e) + '</li>'; }).join('') + '</ul>';

      html += '<h4>七、活动特色</h4><ul>' + l.features.map(function (f) { return '<li>' + escapeHtml(f) + '</li>'; }).join('') + '</ul>';

      html += '<h4>八、活动反思</h4>';
      html += '<p><b>活动亮点：</b>' + escapeHtml(l.reflection.bright) + '</p>';
      html += '<p><b>可能不足：</b>' + escapeHtml(l.reflection.lack) + '</p>';
      html += '<p><b>改进策略：</b>' + escapeHtml(l.reflection.improve) + '</p>';

      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyLessonBtn">复制教案</button>' +
        '<button class="btn ghost" id="downloadMdBtn">下载 Markdown</button>' +
      '</div>';

      // 说课稿
      html += '<div class="divider"></div>';
      html += '<h4>🎤 配套说课稿</h4><div class="talk-box">' + textToLines(result.talk) + '</div>';
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyTalkBtn">复制说课稿</button>' +
      '</div>';

      // PPT 脚本
      html += '<div class="divider"></div>';
      html += '<h4>🖼️ 卡通风说课PPT脚本（' + result.ppt.length + '页）</h4>';
      html += '<div class="ppt-grid">' + result.ppt.map(function (p) {
        return '<div class="ppt-card"><div class="ppt-no">第' + p.no + '页</div>' +
          '<div class="ppt-title">' + escapeHtml(p.title) + '</div>' +
          '<div class="ppt-content">' + escapeHtml(p.content).replace(/\n/g, '<br>') + '</div>' +
          '<div class="ppt-desc">' + escapeHtml(p.desc) + '</div>' +
          '<div class="ppt-anim">🎞️ ' + escapeHtml(p.anim) + '</div></div>';
      }).join('') + '</div>';
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyPptBtn">复制PPT脚本</button>' +
        '<button class="btn ghost" id="downloadPptBtn">下载PPT脚本</button>' +
      '</div>';
    } else if (result.type === 'plan' || result.type === 'summary' || result.type === 'report') {
      var doc = result.plan || result.summary || result.report;
      html += '<div class="result-title">' + escapeHtml(doc.title) + '</div>';
      doc.sections.forEach(function (s) {
        html += '<h4>' + escapeHtml(s.head) + '</h4><div class="para-box">' + textToLines(s.body) + '</div>';
      });
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyDocBtn">复制全文</button>' +
        '<button class="btn ghost" id="downloadDocBtn">下载 Markdown</button>' +
      '</div>';
    } else if (result.type === 'ppt') {
      var ppt = result.ppt;
      html += '<div class="result-title">' + escapeHtml(ppt.title) + '</div>';
      html += '<p class="muted">' + escapeHtml(ppt.audience) + ' · ' + escapeHtml(ppt.style) + '</p>';
      html += '<div class="ppt-grid">' + ppt.pages.map(function (p) {
        return '<div class="ppt-card"><div class="ppt-no">第' + p.no + '页</div>' +
          '<div class="ppt-title">' + escapeHtml(p.title) + '</div>' +
          '<div class="ppt-content">' + escapeHtml(p.content).replace(/\n/g, '<br>') + '</div>' +
          '<div class="ppt-desc">' + escapeHtml(p.desc) + '</div></div>';
      }).join('') + '</div>';
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyDocBtn">复制PPT脚本</button>' +
        '<button class="btn ghost" id="downloadDocBtn">下载 Markdown</button>' +
      '</div>';
    } else if (result.type === 'table') {
      var tb = result.table;
      html += '<div class="result-title">' + escapeHtml(tb.title) + '</div>';
      html += '<table class="gen-table"><thead><tr>' + tb.columns.map(function (c) { return '<th>' + escapeHtml(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        tb.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + escapeHtml(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table>';
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyDocBtn">复制CSV</button>' +
        '<button class="btn ghost" id="downloadDocBtn">下载CSV文件</button>' +
      '</div>';
    } else if (result.type === 'article') {
      var ar = result.article;
      html += '<div class="result-title">' + escapeHtml(ar.title) + '</div>';
      html += '<div class="para-box">' + textToLines(ar.content) + '</div>';
      html += '<div class="btn-row">' +
        '<button class="btn primary" id="copyDocBtn">复制全文</button>' +
        '<button class="btn ghost" id="downloadDocBtn">下载 Markdown</button>' +
      '</div>';
    } else if (result.type === 'todo') {
      var p = result.plan;
      html += '<div class="result-title">' + escapeHtml(p.typeName) + '</div>';
      html += '<p class="muted">任务目标：' + escapeHtml(p.rawInput) + '</p>';
      html += '<div class="plan-steps">' + p.steps.map(function (s) {
        return '<div class="plan-step"><span class="step-no">' + s.no + '</span><div><b>' + escapeHtml(s.name) + '</b><p>' + escapeHtml(s.detail) + '</p><span class="muted">建议：' + escapeHtml(s.tool) + '</span></div></div>';
      }).join('') + '</div>';
      html += '<div class="btn-row"><button class="btn primary" id="copyDocBtn">复制拆解清单</button></div>';
    }

    el.innerHTML = html;
    bindResultButtons(result);
  }

  /* 组装完整 Markdown */
  function buildMarkdown(result) {
    var md = [];
    if (result.type === 'lesson') {
      var l = result.lesson;
      md.push('# ' + l.title);
      md.push('');
      md.push('## 一、设计意图');
      md.push(l.designIntent);
      md.push('');
      md.push('## 二、活动目标');
      md.push('**认知目标：**');
      l.cognitionGoals.forEach(function (g) { md.push('- ' + g); });
      md.push('**技能目标：**');
      l.skillGoals.forEach(function (g) { md.push('- ' + g); });
      md.push('**情感目标：**');
      l.emotionGoals.forEach(function (g) { md.push('- ' + g); });
      md.push('');
      md.push('## 三、活动重难点');
      md.push('**活动重点：**' + l.focus);
      md.push('**活动难点：**' + l.difficulty);
      md.push('');
      md.push('## 四、活动准备');
      md.push('**经验准备：**' + l.expPrep);
      md.push('**物质准备：**' + l.matPrep);
      md.push('');
      md.push('## 五、活动过程');
      md.push('**导入环节（' + l.timePlan[0].min + '）：' + l.opening.type + '**');
      md.push(l.opening.text);
      l.steps.forEach(function (s, i) {
        md.push('**展开环节' + (i + 1) + ' · ' + s.title + '（' + (l.timePlan[i + 1] && l.timePlan[i + 1].min) + '）**');
        s.items.forEach(function (it) { md.push('- ' + it); });
      });
      md.push('**结束环节（' + l.timePlan[2].min + '）**');
      md.push(l.ending);
      md.push('');
      md.push('## 六、活动延伸');
      l.extends.forEach(function (e) { md.push('- ' + e); });
      md.push('');
      md.push('## 七、活动特色');
      l.features.forEach(function (f) { md.push('- ' + f); });
      md.push('');
      md.push('## 八、活动反思');
      md.push('**活动亮点：**' + l.reflection.bright);
      md.push('**可能不足：**' + l.reflection.lack);
      md.push('**改进策略：**' + l.reflection.improve);
      md.push('');
      md.push('---');
      md.push('# 配套说课稿');
      md.push('');
      md.push(result.talk);
      md.push('');
      md.push('---');
      md.push('# 卡通风说课PPT脚本（' + result.ppt.length + '页）');
      md.push('');
      result.ppt.forEach(function (p) {
        md.push('## 【第' + p.no + '页】' + p.title);
        md.push('**页面内容：**');
        md.push(p.content);
        md.push('**画面描述：**' + p.desc);
        md.push('**动画建议：**' + p.anim);
        md.push('');
      });
    } else if (result.type === 'plan' || result.type === 'summary' || result.type === 'report') {
      var doc = result.plan || result.summary || result.report;
      md.push('# ' + doc.title);
      md.push('');
      doc.sections.forEach(function (s) {
        md.push('## ' + s.head);
        md.push(s.body);
        md.push('');
      });
    } else if (result.type === 'ppt') {
      var ppt = result.ppt;
      md.push('# ' + ppt.title);
      md.push('');
      ppt.pages.forEach(function (p) {
        md.push('## 第' + p.no + '页 · ' + p.title);
        md.push('**内容：**' + p.content);
        md.push('**画面描述：**' + p.desc);
        md.push('');
      });
    } else if (result.type === 'table') {
      var tb = result.table;
      md.push('# ' + tb.title);
      md.push('');
      md.push('```csv');
      md.push(tb.csv);
      md.push('```');
    } else if (result.type === 'article') {
      md.push(result.article.content);
    } else if (result.type === 'todo') {
      md.push(TaskPlanner.toMarkdown(result.plan));
    }
    return md.join('\n');
  }

  function bindResultButtons(result) {
    var btn = function (id) { return $(id); };
    if (result.type === 'lesson') {
      var l = result.lesson;
      var lessonText = buildMarkdown({ type: 'lesson', lesson: l, talk: result.talk, ppt: result.ppt, meta: result.meta });
      // 单独教案文本
      var lessonOnly = buildMarkdown({ type: 'lesson', lesson: l, talk: '', ppt: [] }).split('---')[0];
      if (btn('copyLessonBtn')) btn('copyLessonBtn').addEventListener('click', function () { copyText(lessonOnly.trim(), '教案已复制'); });
      if (btn('downloadMdBtn')) btn('downloadMdBtn').addEventListener('click', function () { downloadText((l.title || '教案') + '.md', lessonText); });
      if (btn('copyTalkBtn')) btn('copyTalkBtn').addEventListener('click', function () { copyText(result.talk, '说课稿已复制'); });
      var pptText = result.ppt.map(function (p) {
        return '【第' + p.no + '页】' + p.title + '\n页面内容：' + p.content + '\n画面描述：' + p.desc + '\n动画建议：' + p.anim;
      }).join('\n\n');
      if (btn('copyPptBtn')) btn('copyPptBtn').addEventListener('click', function () { copyText(pptText, 'PPT脚本已复制'); });
      if (btn('downloadPptBtn')) btn('downloadPptBtn').addEventListener('click', function () { downloadText((l.title || '教案') + '-PPT脚本.md', buildMarkdown({ type: 'lesson', lesson: l, talk: '', ppt: result.ppt }).split('---')[2] ? buildMarkdown({ type: 'lesson', lesson: l, talk: '', ppt: result.ppt }).split('---')[2] : '## 卡通风说课PPT脚本\n\n' + result.ppt.map(function (p) { return '## 【第' + p.no + '页】' + p.title + '\n**页面内容：**\n' + p.content + '\n**画面描述：**' + p.desc + '\n**动画建议：**' + p.anim; }).join('\n\n')); });
    } else if (result.type === 'plan' || result.type === 'summary' || result.type === 'report') {
      var doc = result.plan || result.summary || result.report;
      var fullText = doc.sections.map(function (s) { return s.head + '\n' + s.body; }).join('\n\n');
      if (btn('copyDocBtn')) btn('copyDocBtn').addEventListener('click', function () { copyText(fullText); });
      if (btn('downloadDocBtn')) btn('downloadDocBtn').addEventListener('click', function () { downloadText(doc.title + '.md', buildMarkdown(result)); });
    } else if (result.type === 'ppt') {
      var ppt = result.ppt;
      var pptFull = ppt.pages.map(function (p) { return '第' + p.no + '页 · ' + p.title + '\n内容：' + p.content + '\n画面描述：' + p.desc; }).join('\n\n');
      if (btn('copyDocBtn')) btn('copyDocBtn').addEventListener('click', function () { copyText(pptFull); });
      if (btn('downloadDocBtn')) btn('downloadDocBtn').addEventListener('click', function () { downloadText(ppt.title + '.md', buildMarkdown(result)); });
    } else if (result.type === 'table') {
      var tb = result.table;
      if (btn('copyDocBtn')) btn('copyDocBtn').addEventListener('click', function () { copyText(tb.csv); });
      if (btn('downloadDocBtn')) btn('downloadDocBtn').addEventListener('click', function () { downloadCSV(tb.title + '.csv', tb.csv); });
    } else if (result.type === 'article') {
      if (btn('copyDocBtn')) btn('copyDocBtn').addEventListener('click', function () { copyText(result.article.content); });
      if (btn('downloadDocBtn')) btn('downloadDocBtn').addEventListener('click', function () { downloadText(result.article.title + '.md', result.article.content); });
    } else if (result.type === 'todo') {
      if (btn('copyDocBtn')) btn('copyDocBtn').addEventListener('click', function () { copyText(TaskPlanner.toMarkdown(result.plan)); });
    }
  }

  /* ---------- 预填模板 ---------- */
  function initTemplates() {
    var demo = $('demoBtn');
    if (!demo) return;
    demo.addEventListener('click', function () {
      var type = $('taskType').value;
      if (type === 'lesson') {
        $('themeInput').value = '有趣的影子';
        $('ageSelect').value = 'big';
        $('domainSelect').value = 'science';
        $('purposeSelect').value = 'contest';
      } else if (type === 'plan') {
        $('planTheme').value = '春季亲子运动会';
        $('planTypeName').value = '活动';
        $('planWhen').value = '2026年5月上旬';
        $('planWhere').value = '园操场';
        $('planWho').value = '全体幼儿及家长';
      } else if (type === 'summary') {
        $('planPeriod').value = '2026年第一季度';
        $('planScope').value = '教学管理各项工作';
        $('planHighlights').value = '教研活动与课程建设';
      } else if (type === 'ppt') {
        $('planTheme').value = '幼儿园学期工作汇报';
        $('planAudience').value = '各位领导、老师';
      } else if (type === 'article') {
        $('planTheme').value = '幼儿园春季招生';
        $('articleType').value = '宣传文案';
      } else if (type === 'todo') {
        $('planRaw2').value = '组织一次全园亲子运动会';
      }
      updateThemePlaceholder();
      toast('已填入示例，点击生成即可');
    });
  }

  /* ---------- PWA 注册 ---------- */
  function initPwa() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then(function () {
        console.log('Service Worker 已注册');
      }).catch(function (err) {
        console.warn('Service Worker 注册失败（本地 file:// 打开时不支持，部署后生效）', err);
      });
    }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    bindTabs();
    initTaskTypes();
    bindTypeSelect();
    updateThemePlaceholder();
    $('ageSelect').addEventListener('change', updateThemePlaceholder);
    $('domainSelect').addEventListener('change', updateThemePlaceholder);
    initDocReader();
    initPlanner();
    initGenerate();
    initTemplates();
    initPwa();
    onTypeChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
