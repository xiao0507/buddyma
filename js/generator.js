/* ============================================================
 * WorkBuddy · 创作生成引擎（WorkBuddy 能力）
 * 幼儿园教案（教案+说课稿+PPT脚本）+ 方案/总结/PPT稿/表格/文案/报告
 * 纯前端模板组合引擎，无 API Key 依赖。
 * ============================================================ */
var Gen = (function () {
  'use strict';

  var LIB = (typeof window !== 'undefined') ? window.LIB : require('./data.js').LIB;

  /* ---------- 工具 ---------- */
  function pick(arr) {
    if (!arr || !arr.length) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickN(arr, n) {
    if (!arr || !arr.length) return [];
    var copy = arr.slice();
    var out = [];
    var guard = 0;
    while (out.length < n && copy.length && guard < 100) {
      var idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
      guard++;
    }
    return out;
  }

  function stripEnd(text) {
    return String(text || '').replace(/[。！？!?；;：:，,、\s]+$/, '');
  }

  function shortText(text, max) {
    text = String(text || '');
    if (text.length <= max) return text;
    return text.slice(0, max) + '…';
  }

  function fill(tpl, ctx) {
    return String(tpl || '').replace(/\{\{(\w+)\}\}/g, function (m, key) {
      return (ctx && ctx[key] !== undefined && ctx[key] !== null) ? ctx[key] : '';
    });
  }

  function stripAgePrefix(text, ageName) {
    // 去掉 "小班幼儿（3-4岁）小班幼儿" 之类的重复
    var pat = new RegExp('^((' + ageName + '|' + (ageName === '小班' ? '3-4岁' : ageName === '中班' ? '4-5岁' : '5-6岁') + ')幼儿?[（(]?[0-9-]*岁?[)）]?)+', '');
    return String(text || '').replace(pat, '');
  }

  /* ---------- 主题词包 ---------- */
  function getThemePack(domain, theme) {
    var pack = LIB.defaultPack;
    if (domain && domain.themes && theme && domain.themes[theme]) {
      pack = domain.themes[theme];
    }
    return pack;
  }

  /* ---------- 领域与年龄解析 ---------- */
  function parseConfig(cfg) {
    cfg = cfg || {};
    var ageKey = String(cfg.age || '').replace(/\s/g, '');
    var age;
    if (/大班|5-6/.test(ageKey)) age = LIB.ages.big;
    else if (/中班|4-5/.test(ageKey)) age = LIB.ages.middle;
    else age = LIB.ages.small;

    var domainKey = String(cfg.domain || '').replace(/\s/g, '');
    var domain = LIB.domains[domainKey] || LIB.domains.language;

    var theme = String(cfg.theme || '').trim() || '我的好朋友';
    var purpose = String(cfg.purpose || '').trim() || 'normal';
    return { age: age, domain: domain, theme: theme, purpose: purpose, ageKey: ageKey, domainKey: domainKey };
  }

  /* ---------- 教案生成 ---------- */
  function buildLesson(age, domain, theme, purpose) {
    var pack = getThemePack(domain, theme);
    var ctx = {
      theme: theme,
      obj: pack.obj,
      act: pack.act,
      scene: pack.scene,
      kw: pack.kw,
      age: age.name,
      range: age.range,
      duration: age.duration
    };

    // 目标
    var cognitions = pickN(domain.cognitions, 2).map(function (t) { return fill(t, ctx); });
    var skills = pickN(domain.skills, 2).map(function (t) { return fill(t, ctx); });
    var emotions = pickN(domain.emotions, 1).map(function (t) { return fill(t, ctx); });

    // 重难点
    var focus = stripEnd(fill(pick(domain.focuses), ctx));
    var difficulty = stripEnd(fill(pick(domain.difficulties), ctx));
    ctx.focus = focus;
    ctx.difficulty = difficulty;

    // 准备
    var expPrep = pick(domain.expPreps);
    var matPrep = pick(domain.matPreps);

    // 时间分配（提前声明，供步骤引用）
    var timePlan = age.timePlan;

    // 过程
    var opening = pick(domain.openings);
    var stepGroups = pickN(domain.steps, 3);
    var steps = stepGroups.map(function (g, i) {
      return { title: ['感知体验', '游戏探索', '巩固提升'][i] || ('步骤' + (i + 1)), min: timePlan[1].min, items: g.map(function (t) { return fill(t, ctx); }) };
    });
    var ending = pick(domain.endings);
    var extAll = pickN(domain.extends, 2).map(function (t) { return fill(t, ctx); });
    var reflection = pick(domain.reflections);

    // 目的差异化：features
    var features = [];
    if (purpose === 'contest') {
      features = [
        '活动以原创游戏情境贯穿始终，环节层层递进，幼儿在玩中学、学中玩。',
        '师幼互动自然真实，注重个体差异，每位幼儿都有操作和表达的机会。',
        '活动源于幼儿生活，回归幼儿生活，充分体现幼儿主体性与学习品质培养。'
      ];
    } else if (purpose === 'exam') {
      features = [
        '活动设计符合《纲要》与《指南》精神，目标明确、结构完整、环节清晰。',
        '以幼儿直接感知、实际操作、亲身体验为主要学习方式，避免小学化倾向。',
        '注重师幼互动与同伴合作，活动延伸体现家园共育与生活渗透。'
      ];
    } else {
      features = [
        '活动取材于幼儿熟悉的生活情境，贴近经验、趣味性强。',
        '以游戏为主要活动形式，幼儿在轻松愉快的氛围中获得新经验。'
      ];
    }

    return {
      title: age.name + domain.name + '活动：《' + theme + '》',
      duration: age.duration,
      ageName: age.name,
      range: age.range,
      domainName: domain.name,
      designIntent: '本活动来源于幼儿熟悉的生活经验，结合' + age.name + '幼儿（' + age.range + '）' + pick(age.features).replace(/。/g, '。') + '依据《3-6岁儿童学习与发展指南》' + domain.name + '领域目标，以' + domain.name + '领域核心经验为线索，通过' + ctx.scene + '的情境创设，引导幼儿在' + ctx.act + '的实践体验中获得新经验，萌发' + ctx.kw + '的兴趣与能力。',
      cognitionGoals: cognitions,
      skillGoals: skills,
      emotionGoals: emotions,
      focus: focus,
      difficulty: difficulty,
      expPrep: fill(expPrep, ctx),
      matPrep: fill(matPrep, ctx),
      opening: { type: opening.type, text: fill(opening.text, ctx) },
      steps: steps,
      timePlan: timePlan,
      ending: fill(ending, ctx),
      extends: extAll,
      reflection: { bright: fill(reflection.bright, ctx), lack: fill(reflection.lack, ctx), improve: fill(reflection.improve, ctx) },
      features: features,
      pack: ctx
    };
  }

  /* ---------- 说课稿 ---------- */
  function buildTalk(lesson, purpose) {
    var l = lesson;
    var theme = l.title.replace(/^.{2,4}活动：《/, '').replace(/》$/, '');
    var purposeText = purpose === 'contest'
      ? '本次说课重点阐述活动的创新设计、师幼互动亮点与活动特色'
      : purpose === 'exam'
      ? '本次说课从活动设计的规范性、科学性与完整性进行阐述'
      : '下面我从九个方面对本节活动进行说课';

    var goalsText = '认知目标：' + l.cognitionGoals.map(stripEnd).join('；') + '。技能目标：' + l.skillGoals.map(stripEnd).join('；') + '。情感目标：' + l.emotionGoals.map(stripEnd).join('；') + '。';

    var stepsText = l.steps.map(function (s, i) {
      return '环节' + (i + 1) + '（' + s.min + '）：' + s.title + '，' + s.items[0];
    }).join('');

    var highlightText = l.features.slice(0, 2).join('');

    var talk = [
      '各位评委、各位老师，大家好！今天我说课的内容是' + l.title + '，本活动适合' + l.ageName + '幼儿，活动时长' + l.duration + '。' + purposeText + '。',
      '一、说教材与主题来源：本活动主题《' + theme + '》来源于幼儿日常生活，贴近' + l.ageName + '幼儿的经验与兴趣。结合《纲要》与《指南》' + l.domainName + '领域目标，确立本次活动的教育价值：通过' + l.pack.scene + '情境，引导幼儿在' + l.pack.act + '的实践体验中获得新经验，萌发' + l.pack.kw + '的兴趣与能力。',
      '二、说幼儿年龄特点：' + l.ageName + '幼儿（' + l.range + '）' + pickAgeDesc(l) + '因此活动设计遵循直观性、游戏性与递进性原则。',
      '三、说活动目标：从认知、技能、情感三维确定目标：' + goalsText,
      '四、说活动重难点：活动重点是' + l.focus + '。活动难点是' + l.difficulty + '。我通过情境创设、示范操作和分层支持来突破重难点。',
      '五、说活动准备：经验准备方面，' + stripEnd(l.expPrep) + '。物质准备方面，' + stripEnd(l.matPrep) + '。',
      '六、说教法与学法：主要采用情境教学法、游戏法、操作法与观察指导法，让幼儿在直接感知、实际操作、亲身体验中学习，体现幼儿主体性。',
      '七、说活动过程：导入环节（' + l.timePlan[0].min + '）采用' + l.opening.type + '：' + shortText(l.opening.text, 22) + stepsText + '结束环节：' + l.ending,
      '八、说活动亮点：' + highlightText,
      '九、说活动延伸与反思：延伸方面，' + l.extends.map(stripEnd).join('；') + '。反思方面，本活动亮点是' + stripEnd(l.reflection.bright) + '；不足是' + stripEnd(l.reflection.lack) + '，今后我会' + stripEnd(l.reflection.improve),
      '我的说课完毕，谢谢大家！'
    ];

    return talk.join('\n');
  }

  function pickAgeDesc(l) {
    var libAge = LIB.ages[l.ageName === '小班' ? 'small' : l.ageName === '中班' ? 'middle' : 'big'];
    return libAge.features[0] + '';
  }

  /* ---------- PPT 脚本 ---------- */
  function buildPpt(lesson, age, domain, ctx) {
    var slides = domain.ppt.slides.slice();
    var animPool = [
      ['淡入', '缩放进入', '向上浮动'],
      ['从左滑入', '缩放进入'],
      ['淡入', '逐个浮现'],
      ['从上滑入', '缩放进入'],
      ['逐个浮现', '向右滑入'],
      ['淡入', '缩放进入'],
      ['从右滑入', '逐个浮现'],
      ['缩放进入', '淡入'],
      ['逐个浮现', '向上浮动'],
      ['缩放进入', '淡入'],
      ['淡入', '从下弹入'],
      ['缩放进入', '逐个浮现'],
      ['淡入', '向上浮动']
    ];

    var pptCtx = Object.assign({}, ctx, {
      t0: lesson.steps[0].title,
      t1: lesson.steps[1].title,
      t2: lesson.steps[2].title,
      focus: shortText(lesson.focus, 14).replace('重点：', '').replace('难点：', ''),
      difficulty: shortText(lesson.difficulty, 14).replace('重点：', '').replace('难点：', ''),
      pptStudent: age.pptStudent,
      pptDesign: age.pptDesign
    });

    return slides.map(function (slide, i) {
      var title = fill(slide.title, pptCtx);
      var content = fill(slide.content, pptCtx);
      var desc = fill(slide.desc, pptCtx);
      var anims = pick(animPool[i % animPool.length]);
      return {
        no: i + 1,
        title: title,
        content: content,
        desc: desc,
        anim: anims
      };
    });
  }

  /* ---------- 通用创作 ---------- */
  function buildPlan(cfg) {
    var theme = String(cfg.theme || '').trim() || '未命名方案';
    var purpose = String(cfg.purpose || '').trim() || '活动';
    var who = String(cfg.who || '').trim() || '相关人员';
    var when = String(cfg.when || '').trim() || '待定';
    var where = String(cfg.where || '').trim() || '待定';

    return {
      title: '《' + theme + '》' + purpose + '方案',
      sections: [
        { head: '一、活动背景与目的', body: '为扎实推进' + purpose + '工作，结合实际情况，特制定本方案。本次活动旨在帮助' + who + '明确目标、统一认识，提升' + theme + '的质量与实效，营造积极向上的氛围。' },
        { head: '二、活动主题', body: '「' + theme + '」' },
        { head: '三、活动时间与地点', body: '时间：' + when + '；地点：' + where + '。' },
        { head: '四、参加对象', body: who + '。' },
        { head: '五、活动目标', body: '1. 明确' + theme + '的意义与要求，统一思想认识。\n2. 通过' + theme + '的开展，提升参与者的积极性与获得感。\n3. 总结经验、固化成果，形成长效机制。' },
        { head: '六、活动流程', body: '（一）准备阶段（前期）：制定方案、明确分工、准备物资、发布通知。\n（二）实施阶段（现场）：签到开场 → 领导致辞 → 主题环节 → 互动交流 → 总结表彰。\n（三）总结阶段（后期）：整理资料、复盘总结、宣传报道、持续跟进。' },
        { head: '七、人员分工', body: '总负责：统筹协调；执行组：具体实施；宣传组：摄影报道；后勤组：物资保障。' },
        { head: '八、安全保障', body: '提前排查场地安全隐患，制定应急预案，活动期间安排专人负责秩序与安全。' },
        { head: '九、预期效果', body: '通过本次活动，' + who + '对' + theme + '的认识更加深入，参与热情明显提升，活动成果形成可推广的经验。' },
        { head: '十、经费预算（参考）', body: '宣传物料、物资采购、奖品等费用按实际需要编制，厉行节约。' }
      ]
    };
  }

  function buildSummary(cfg) {
    var period = String(cfg.period || '').trim() || '本阶段';
    var scope = String(cfg.scope || '').trim() || '各项工作';
    var highlights = String(cfg.highlights || '').trim() || '重点工作有序推进';

    return {
      title: period + '工作总结',
      sections: [
        { head: '一、总体情况', body: period + '以来，围绕' + scope + '，在全体同事的共同努力下，各项工作按计划稳步推进，整体态势良好，较好地完成了阶段目标任务。' },
        { head: '二、主要工作及成效', body: '（一）' + highlights + '，取得明显进展。\n（二）加强沟通协作，团队凝聚力进一步增强。\n（三）注重规范管理，工作质量稳步提升。\n（四）及时总结反思，不断优化工作方法。' },
        { head: '三、工作亮点', body: '一是' + highlights + '，形成可复制经验；二是注重过程管理，实现闭环；三是坚持以结果为导向，成效导向鲜明。' },
        { head: '四、存在不足', body: '一是部分工作推进节奏不够均衡；二是创新举措有待加强；三是经验总结与宣传还需提升。' },
        { head: '五、下一步计划', body: '一是继续围绕重点任务精准发力；二是加强学习培训，提升能力水平；三是完善机制，推动' + scope + '再上新台阶。' }
      ]
    };
  }

  function buildPptDraft(cfg) {
    var theme = String(cfg.theme || '').trim() || '汇报主题';
    var audience = String(cfg.audience || '').trim() || '各位领导、同事';
    var total = 10;
    var slides = [
      { title: theme, content: '汇报人 · 日期', desc: '主标题居中，简洁大气背景，公司/单位标识。' },
      { title: '目录', content: '背景 · 进展 · 亮点 · 计划', desc: '四列卡片式目录，关键词呈现。' },
      { title: '背景与目标', content: '为什么做 · 目标是什么', desc: '左右布局：左边背景，右边目标。' },
      { title: '总体进展', content: '完成情况 · 关键数据', desc: '数据卡片 + 进度条展示。' },
      { title: '重点工作一', content: '做法 · 成效', desc: '图文左右版式，要点短句。' },
      { title: '重点工作二', content: '做法 · 成效', desc: '图文左右版式，要点短句。' },
      { title: '工作亮点', content: '创新点 · 典型案例', desc: '三列亮点卡片。' },
      { title: '存在问题', content: '问题 · 原因', desc: '问题清单式排版，简洁。' },
      { title: '下一步计划', content: '重点任务 · 时间节点', desc: '时间轴布局，分阶段呈现。' },
      { title: '谢谢聆听', content: '敬请指导', desc: '致谢页，联系方式。' }
    ];
    return {
      title: '《' + theme + '》演示文稿',
      audience: audience,
      pages: slides.map(function (s, i) {
        return { no: i + 1, title: s.title, content: s.content, desc: s.desc };
      }),
      style: '图大字少 · 简洁排版 · 每页不超过30字'
    };
  }

  function buildTable(cfg) {
    var title = String(cfg.title || '').trim() || String(cfg.theme || '').trim() || '工作计划表';
    var cols = String(cfg.cols || '').trim() || '序号,事项,负责人,时间,完成标准';
    var rows = String(cfg.rows || '').trim() || '1,任务一,张三,第1周,完成初稿;2,任务二,李四,第2周,审核定稿;3,任务三,王五,第3周,修改完善;4,任务四,赵六,第4周,总结归档';
    var colArr = cols.split(/[,，]/).map(function (c) { return c.trim(); });
    var rowArr = rows.split(/[;；]/).map(function (r) {
      return r.split(/[,，]/).map(function (c) { return c.trim(); });
    }).filter(function (r) { return r.length === colArr.length; });
    var csv = [];
    csv.push(colArr.join(','));
    rowArr.forEach(function (r) { csv.push(r.join(',')); });
    return {
      title: title,
      columns: colArr,
      rows: rowArr,
      csv: csv.join('\n')
    };
  }

  function buildArticle(cfg) {
    var theme = String(cfg.theme || '').trim() || '主题';
    var type = String(cfg.type || '').trim() || '宣传文案';
    var audience = String(cfg.audience || '').trim() || '读者';
    return {
      title: type + '：' + theme,
      content: [
        '## 标题：' + theme + '，这件事值得关注',
        '',
        '『开场』' + audience + '，今天想和你聊聊' + theme + '这件事。它看起来平常，却和我们每个人都息息相关。',
        '',
        '『为什么重要』随着' + theme + '的推进，越来越多的人开始关注它带来的变化。从' + theme + '的成效看，它不仅改变了' + audience + '的体验，也为后续工作打下了坚实基础。',
        '',
        '『核心亮点』一是' + theme + '让' + audience + '获得了实实在在的收获；二是' + theme + '注重细节、稳步推进；三是' + theme + '形成了可复制、可推广的经验。',
        '',
        '『展望』下一步，' + theme + '将继续深化，让' + audience + '感受到更多的便利与温暖。',
        '',
        '（以上为AI生成的' + type + '初稿，可根据实际情况修改补充。）'
      ].join('\n')
    };
  }

  function buildReport(cfg, doc) {
    var theme = String(cfg.theme || '').trim() || '文档分析';
    var summary = (doc && doc.summary) || '';
    var keywords = (doc && doc.keywords) || [];
    var outline = (doc && doc.outline) || [];
    var body = summary ? '本报告基于对上传文档的精读结果生成。文档核心内容如下：\n' + summary : '本报告基于用户提供的信息整理生成。';
    return {
      title: '《' + theme + '》分析报告',
      sections: [
        { head: '一、报告背景', body: '根据任务需求，对"' + theme + '"相关资料进行整理分析，形成本报告。' },
        { head: '二、核心内容提炼', body: body },
        { head: '三、关键词', body: keywords.length ? keywords.join('、') : '（文档未提供关键词，可根据内容补充）' },
        { head: '四、内容框架', body: outline.length ? outline.map(function (o, i) { return (i + 1) + '. ' + o; }).join('\n') : '（文档未提取到明显框架，建议人工梳理）' },
        { head: '五、结论与建议', body: '1. ' + theme + '整体脉络清晰，核心要点明确。\n2. 建议后续围绕关键词深化专题研究。\n3. 涉及引用内容请以原文为准，本报告仅作辅助参考。' }
      ]
    };
  }

  /* ---------- 统一入口 ---------- */
  function generate(config) {
    config = config || {};
    var type = config.type || 'lesson';

    if (type === 'lesson') {
      var c = parseConfig(config);
      var lesson = buildLesson(c.age, c.domain, c.theme, c.purpose);
      var talk = buildTalk(lesson, c.purpose);
      var ppt = buildPpt(lesson, c.age, c.domain, lesson.pack);
      return {
        type: 'lesson',
        meta: { age: c.age.name, domain: c.domain.name, theme: c.theme, purpose: c.purpose },
        lesson: lesson,
        talk: talk,
        ppt: ppt
      };
    }
    if (type === 'plan') {
      var plan = buildPlan(config);
      return { type: 'plan', plan: plan };
    }
    if (type === 'summary') {
      var summary = buildSummary(config);
      return { type: 'summary', summary: summary };
    }
    if (type === 'ppt') {
      var pptDraft = buildPptDraft(config);
      return { type: 'ppt', ppt: pptDraft };
    }
    if (type === 'table') {
      var table = buildTable(config);
      return { type: 'table', table: table };
    }
    if (type === 'article') {
      var article = buildArticle(config);
      return { type: 'article', article: article };
    }
    if (type === 'report') {
      var report = buildReport(config, config.doc);
      return { type: 'report', report: report };
    }
    if (type === 'todo') {
      return { type: 'todo', plan: TaskPlannerRef.plan(config.raw || '', config.extra || '') };
    }
    return { type: 'lesson' };
  }

  /* 引用 TaskPlanner（避免循环依赖，运行时获取） */
  var TaskPlannerRef = (typeof window !== 'undefined') ? window.TaskPlanner : require('./tasks.js').TaskPlanner;

  return {
    pick: pick,
    pickN: pickN,
    fill: fill,
    shortText: shortText,
    getThemePack: getThemePack,
    parseConfig: parseConfig,
    buildLesson: buildLesson,
    buildTalk: buildTalk,
    buildPpt: buildPpt,
    buildPlan: buildPlan,
    buildSummary: buildSummary,
    buildPptDraft: buildPptDraft,
    buildTable: buildTable,
    buildArticle: buildArticle,
    buildReport: buildReport,
    generate: generate
  };
})();

if (typeof window !== 'undefined') {
  window.Gen = Gen;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Gen: Gen };
}
