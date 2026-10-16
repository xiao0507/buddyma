/* ============================================================
 * WorkBuddy · 任务拆解引擎
 * 把用户的一句话任务拆成可执行的多步骤清单
 * 内置常见任务类型的标准拆解流程
 * ============================================================ */
var TaskPlanner = (function () {
  'use strict';

  /* 任务类型关键词匹配 */
  function matchType(input) {
    var text = String(input || '').toLowerCase();
    if (/教案|说课|公开课|优质课|教学活动|幼儿园/.test(text)) return 'lesson';
    if (/方案|活动方案|项目方案|策划|计划书/.test(text)) return 'plan';
    if (/总结|复盘|回顾/.test(text)) return 'summary';
    if (/ppt|演示文稿|课件|幻灯片/.test(text)) return 'ppt';
    if (/表格|excel|数据表|统计表|清单表/.test(text)) return 'table';
    if (/报告|调研|分析报告|调研报告/.test(text)) return 'report';
    if (/文案|公众号|宣传|演讲稿|文章|新闻稿/.test(text)) return 'article';
    if (/拆解|步骤|计划|安排|清单|todo|待办/.test(text)) return 'todo';
    return 'todo';
  }

  /* 拆解模板库 */
  var PLANS = {
    lesson: {
      title: '幼儿园教案/说课/PPT 制作任务',
      steps: [
        { name: '明确需求', detail: '确认年龄段（小/中/大班）、领域（健康/语言/社会/科学/艺术）、主题和用途（比赛/教资/教研）。', tool: '在顶部表单选择或直接输入' },
        { name: '生成完整教案', detail: '按"设计意图→三维目标→重难点→准备→过程→延伸→反思"生成原创教案。', tool: '任务工作台 → 幼儿园教案' },
        { name: '生成配套说课稿', detail: '按九段式输出800-1200字说课稿，自然融入《纲要》《指南》理念。', tool: '复制到说课稿区' },
        { name: '生成卡通风PPT脚本', detail: '输出10-14页分页脚本：页面标题/内容/画面描述/动画建议。', tool: 'PPT 文稿生成器' },
        { name: '检查与导出', detail: '核对无占位符、无"参考某网站"表述，导出为 Markdown 文件。', tool: '一键下载' }
      ]
    },
    plan: {
      title: '工作方案制作任务',
      steps: [
        { name: '明确背景', detail: '确认活动/项目的主题、时间、地点、对象和预期目标。', tool: '输入背景信息' },
        { name: '设计目标与内容', detail: '确定总目标和分项目标，规划核心内容与亮点。', tool: '任务工作台 → 工作方案' },
        { name: '编排流程与时间表', detail: '拆解为准备期、执行期、总结期的具体步骤和时间安排。', tool: '表格生成器辅助' },
        { name: '补充保障与预案', detail: '人员分工、物资准备、安全措施和应急预案。', tool: '补充完善' },
        { name: '输出完整方案', detail: '整理成结构完整的方案文档，可直接复制使用或导出。', tool: '一键导出' }
      ]
    },
    summary: {
      title: '工作总结撰写任务',
      steps: [
        { name: '收集素材', detail: '整理这段时间的工作数据、照片、成果和典型案例。', tool: '文档精读（如有资料）' },
        { name: '梳理框架', detail: '按"总体情况→主要工作→亮点成效→不足→改进方向"搭框架。', tool: '任务工作台 → 工作总结' },
        { name: '撰写初稿', detail: '突出亮点，用数据说话，语言专业简洁。', tool: '工作总结生成器' },
        { name: '打磨定稿', detail: '检查逻辑、补充细节、控制篇幅，输出最终版本。', tool: '复制/下载' }
      ]
    },
    ppt: {
      title: 'PPT 文稿制作任务',
      steps: [
        { name: '明确主题与听众', detail: '确认主题、受众、页数要求和风格倾向（商务/教学/汇报）。', tool: '输入主题' },
        { name: '搭建大纲', detail: '梳理核心信息，按"封面→目录→正文→总结"搭大纲。', tool: '任务工作台 → PPT 文稿' },
        { name: '分页撰写内容', detail: '每页图大字少：标题 + 关键词/短句 + 画面建议。', tool: 'PPT 文稿生成器' },
        { name: '整理交付', detail: '把分页脚本整理成可用的演示稿或导入 PPT 工具。', tool: '复制/下载' }
      ]
    },
    table: {
      title: '数据表格制作任务',
      steps: [
        { name: '明确表格用途', detail: '确认是计划表、统计表、清单还是台账，确定列结构。', tool: '输入用途' },
        { name: '设计表头与行', detail: '规划列名、行分类和字段格式。', tool: '表格生成器' },
        { name: '填充内容', detail: '逐行填写具体内容，保证数据/条目完整。', tool: '复制 CSV 导入 Excel' },
        { name: '检查导出', detail: '核对表头一致、无空行乱列，导出 CSV/Excel 使用。', tool: '下载 CSV' }
      ]
    },
    report: {
      title: '分析报告撰写任务',
      steps: [
        { name: '上传/输入资料', detail: '上传 PDF/Word/文本资料，或粘贴长文本。', tool: '文档精读' },
        { name: '精读提取', detail: '本地解析全文，自动提取关键词、摘要和框架。', tool: '精读结果' },
        { name: '组织报告', detail: '按"背景→分析→结论→建议"组织报告结构。', tool: '任务工作台 → 分析报告' },
        { name: '引用与核对', detail: '忠于原文，区分原文信息与总结，标注来源。', tool: '生成报告' }
      ]
    },
    article: {
      title: '文案创作任务',
      steps: [
        { name: '明确用途', detail: '确认文案类型（公众号/宣传/演讲稿/新闻稿）、受众和语气。', tool: '输入类型' },
        { name: '收集素材', detail: '整理关键信息、亮点和案例，作为创作素材。', tool: '文档精读（如有资料）' },
        { name: '撰写成稿', detail: '标题吸睛、结构清晰、语言流畅，一次给出完整成品。', tool: '任务工作台 → 文案创作' },
        { name: '调整优化', detail: '根据反馈调整语气、篇幅和细节。', tool: '提出修改意见' }
      ]
    },
    todo: {
      title: '通用任务拆解',
      steps: [
        { name: '明确目标', detail: '把用户的一句话目标写清楚，确认最终要交付什么。', tool: '输入目标' },
        { name: '拆分步骤', detail: '按"准备→执行→检查→交付"拆成3-6个可执行步骤。', tool: '自动拆解' },
        { name: '标注要点', detail: '每步标注关键动作、注意事项和完成标准。', tool: '自动生成' },
        { name: '开始执行', detail: '按顺序逐项完成，每步完成后打勾确认。', tool: '逐步执行' }
      ]
    }
  };

  /* 生成拆解结果 */
  function plan(input, extra) {
    var type = matchType(input);
    var tpl = PLANS[type];
    var steps = tpl.steps.map(function (s, i) {
      return { no: i + 1, name: s.name, detail: s.detail, tool: s.tool, done: false };
    });
    return {
      type: type,
      typeName: tpl.title,
      rawInput: input,
      extra: extra || '',
      steps: steps,
      note: '小步快跑：按顺序逐项完成，也可跳过不需要的步骤。'
    };
  }

  /* 生成 Markdown 展示 */
  function toMarkdown(planResult) {
    var md = [];
    md.push('## ' + planResult.typeName);
    md.push('');
    md.push('**任务目标：** ' + (planResult.rawInput || '（未填写）'));
    if (planResult.extra) {
      md.push('');
      md.push('**补充说明：** ' + planResult.extra);
    }
    md.push('');
    md.push('### 执行步骤');
    planResult.steps.forEach(function (s) {
      md.push('**步骤' + s.no + ' · ' + s.name + '**');
      md.push('- ' + s.detail);
      md.push('- 建议工具：' + s.tool);
      md.push('');
    });
    md.push('> ' + planResult.note);
    return md.join('\n');
  }

  return {
    matchType: matchType,
    plan: plan,
    toMarkdown: toMarkdown
  };
})();

if (typeof window !== 'undefined') {
  window.TaskPlanner = TaskPlanner;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TaskPlanner: TaskPlanner };
}
