/* ============================================================
 * WorkBuddy · 文档精读引擎（ima 能力）
 * 浏览器本地解析 PDF / Word / TXT，提取文本、关键词、摘要、框架
 * 不依赖任何服务器，文件不上传，本地完成精读。
 * ============================================================ */
var Reader = (function () {
  'use strict';

  /* ---------- 文本工具 ---------- */
  function normalizeText(text) {
    return (text || '')
      .replace(/\r\n/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /* 分句 */
  function splitSentences(text) {
    return text
      .replace(/([。！？!?；;])\s*/g, '$1\n')
      .split('\n')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 1; });
  }

  /* 简单中文停用词 */
  var STOP = new Set(('的 了 和 是 在 我 有 这 也 就 都 而 及 与 或 一个 我们 你们 他们 可以 进行 通过 对于 关于 以及 并且 因为 所以 但是 如果 然后 这样 这个 那个 什么 怎么 如何 自己 需要 应该 能够 主要 相关 内容 情况 活动 老师 幼儿 小朋友 孩子 班级 学校 工作 学习 问题 方面 一些 这些 那些 大家 一起 之后 之前 现在 今天 明天 昨天 时候 地方 东西 事情 方式 方法 过程 结果 发现 知道 了解 学会 愿意 喜欢 能够 尝试 体验 感受 表现 表达 帮助 支持 引导 鼓励 观察 操作 游戏 材料 环境 目标 重点 难点 准备 环节 步骤 延伸 反思 总结 计划 方案 报告 文档 文件 内容 信息 资料 数据 分析 整理 梳理 提取 归纳 概括 比较 讨论 交流 合作 分享 展示 评价 反馈 建议 意见 要求 需要 提供 完成 达到 实现 形成 建立 培养 发展 提高 增强 促进 推动 开展 组织 实施 落实 贯彻 执行 遵循 依据 根据 按照 结合 围绕 突出 注重 强调 确保 保证 有效 高效 具体 明确 清晰 完整 规范 专业 科学 合理 恰当 充分 及时 主动 积极 深入 全面 系统 持续 不断 进一步 更加 越来越 一定 非常 比较 十分 特别 尤其 重要 关键 核心 主要 基本 根本 基础 前提 条件 环节 要素 层面 维度 角度 方面 领域 范围 程度 水平 质量 效果 效率 成果 成绩 收获 经验 教训 不足 缺点 改进 完善 优化 调整 修改 补充 增加 减少 简化 细化 深化 强化 优化 规范 制度 机制 体系 流程 标准 指标 任务 职责 分工 协作 配合 协调 沟通 对接 衔接 跟进 落实').split(' '));

  function stripPunct(word) {
    return word.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '');
  }

  /* 统计词频，返回高频关键词 */
  function extractKeywords(text, topN) {
    topN = topN || 10;
    var freq = {};
    var chars = text.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '');
    // 2-4 字词频统计（简化：统计每个连续中文片段中的词）
    var cnBlocks = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    cnBlocks.forEach(function (block) {
      for (var i = 0; i < block.length - 1; i++) {
        var w2 = block.substr(i, 2);
        if (!STOP.has(w2)) freq[w2] = (freq[w2] || 0) + 1;
      }
      for (var i2 = 0; i2 < block.length - 2; i2++) {
        var w3 = block.substr(i2, 3);
        if (!STOP.has(w3)) freq[w3] = (freq[w3] || 0) + 1;
      }
    });
    // 英文单词
    var enWords = text.match(/[A-Za-z]{3,}/g) || [];
    enWords.forEach(function (w) {
      var lw = w.toLowerCase();
      freq[lw] = (freq[lw] || 0) + 1;
    });
    var arr = Object.keys(freq).map(function (k) { return { word: k, count: freq[k] }; });
    arr.sort(function (a, b) { return b.count - a.count || a.word.length - b.word.length; });
    var seen = new Set();
    var out = [];
    arr.forEach(function (item) {
      var key = item.word;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(item.word);
      if (out.length >= topN) return;
    });
    return out;
  }

  /* 标题识别（用于提取框架） */
  function detectHeadings(lines) {
    var headings = [];
    var headRe = /^(第[一二三四五六七八九十百千0-9]+[章节部分篇讲课]|[一二三四五六七八九十]+[、.．)）]?\s*[\u4e00-\u9fa5A-Za-z0-9]{2,}|[\u4e00-\u9fa5A-Za-z0-9]{4,}：)/;
    lines.forEach(function (line, idx) {
      var t = line.trim();
      if (t.length < 2 || t.length > 40) return;
      if (/^(一|二|三|四|五|六|七|八|九|十|1|2|3|4|5|6|7|8|9|0)[、.．)）]/.test(t)) {
        headings.push({ index: idx, text: t });
      } else if (/^第[一二三四五六七八九十百千0-9]+[章节部分篇讲课]/.test(t)) {
        headings.push({ index: idx, text: t });
      }
    });
    return headings;
  }

  /* 提取框架：标题 + 段落概要 */
  function extractOutline(text) {
    var lines = text.split('\n');
    var headings = detectHeadings(lines);
    var paras = [];
    lines.forEach(function (line) {
      var t = line.trim();
      if (t.length >= 20 && t.length <= 500) paras.push(t);
    });
    var outline = headings.slice(0, 25).map(function (h) { return h.text; });
    if (outline.length === 0) {
      outline = paras.slice(0, 8).map(function (p) { return p.slice(0, 30) + (p.length > 30 ? '…' : ''); });
    }
    return outline;
  }

  /* 摘要：抽取前若干关键句 */
  function extractSummary(text, sentencesCount) {
    sentencesCount = sentencesCount || 5;
    var sentences = splitSentences(text);
    if (sentences.length <= sentencesCount) {
      return text.slice(0, 500);
    }
    // 打分：包含关键词/数字/位于段落首行的句子优先
    var scored = sentences.map(function (s, i) {
      var score = 0;
      if (/^[\u4e00-\u9fa5]{2,6}[：:]/.test(s)) score += 3;
      if (/[0-9]+/.test(s)) score += 1;
      if (i < 5) score += 2;
      if (/（.*）/.test(s) || /\(.*\)/.test(s)) score += 1;
      if (/重要|关键|核心|主要|目标|目的|方法|结论|建议|问题|结果/.test(s)) score += 1;
      return { text: s, score: score, idx: i };
    });
    scored.sort(function (a, b) { return b.score - a.score || a.idx - b.idx; });
    var picked = scored.slice(0, sentencesCount).sort(function (a, b) { return a.idx - b.idx; });
    return picked.map(function (s) { return s.text; }).join('\n');
  }

  /* 全文精读结果 */
  function analyze(text, meta) {
    text = normalizeText(text);
    var outline = extractOutline(text);
    var keywords = extractKeywords(text, 10);
    var summary = extractSummary(text, 5);
    return {
      meta: meta || { name: '文档', type: 'text' },
      charCount: text.length,
      paragraphCount: text.split('\n').filter(function (l) { return l.trim().length > 0; }).length,
      keywords: keywords,
      outline: outline,
      summary: summary,
      fullText: text
    };
  }

  /* ---------- 文件解析 ---------- */
  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (e) { resolve(String(e.target.result || '')); };
      reader.onerror = function () { reject(new Error('读取文件失败')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  /* PDF：使用 PDF.js 本地解析 */
  function parsePDF(file) {
    return new Promise(function (resolve, reject) {
      if (!window.pdfjsLib) {
        reject(new Error('PDF 解析库未加载'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var data = new Uint8Array(e.target.result);
        var task = window.pdfjsLib.getDocument({ data: data });
        task.promise.then(function (pdf) {
          var pages = [];
          var total = pdf.numPages;
          var i = 1;
          function nextPage() {
            if (i > total) {
              var text = pages.join('\n');
              resolve(text);
              return;
            }
            pdf.getPage(i).then(function (page) {
              page.getTextContent().then(function (tc) {
                var lines = [];
                var lastY = null;
                var buf = '';
                tc.items.forEach(function (item) {
                  var str = item.str || '';
                  var y = Math.round(item.transform ? item.transform[5] : 0);
                  if (lastY !== null && Math.abs(y - lastY) > 3) {
                    lines.push(buf);
                    buf = '';
                  }
                  buf += str;
                  lastY = y;
                });
                if (buf) lines.push(buf);
                pages.push(lines.join('\n'));
                i++;
                nextPage();
              });
            });
          }
          nextPage();
        }).catch(function (err) {
          reject(new Error('PDF 解析失败：' + (err && err.message ? err.message : err)));
        });
      };
      reader.onerror = function () { reject(new Error('读取 PDF 失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /* Word (.docx)：使用 Mammoth 本地解析 */
  function parseDocx(file) {
    return new Promise(function (resolve, reject) {
      if (!window.mammoth) {
        reject(new Error('Word 解析库未加载'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var arrayBuffer = e.target.result;
        window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then(function (result) {
            resolve(result.value || '');
          })
          .catch(function (err) {
            reject(new Error('Word 解析失败：' + (err && err.message ? err.message : err)));
          });
      };
      reader.onerror = function () { reject(new Error('读取 Word 失败')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /* 统一入口：按扩展名解析 */
  function parseFile(file) {
    var name = (file && file.name) || '';
    var ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return parsePDF(file);
    if (ext === 'docx' || ext === 'doc') return parseDocx(file);
    // txt / md / 其他文本
    return readAsText(file);
  }

  function getFileType(file) {
    var name = (file && file.name) || '';
    var ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'PDF 文档';
    if (ext === 'docx' || ext === 'doc') return 'Word 文档';
    return '文本文件';
  }

  return {
    analyze: analyze,
    parseFile: parseFile,
    getFileType: getFileType,
    normalizeText: normalizeText,
    extractKeywords: extractKeywords,
    extractSummary: extractSummary,
    extractOutline: extractOutline
  };
})();

if (typeof window !== 'undefined') {
  window.Reader = Reader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Reader: Reader };
}
