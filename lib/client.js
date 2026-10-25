window.__ModuleLoader__.load({id:"dsh-tutorloop",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  ConversationTutorLoop: () => ConversationTutorLoop,
  TutorLoopPanel: () => TutorLoopPanel,
  apply: () => apply,
  gradingRequest: () => gradingRequest,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react3 = __toESM(require("react"), 1);

// src/client/api.js
var STUDENT_ACTIONS = /* @__PURE__ */ new Set(["overview", "student_state", "set_profile", "language_settings", "method_cards", "list_sources", "import_file", "import_folder", "search_materials", "fetch_material", "start_practice", "submit_answer", "reveal", "zhenti_papers", "zhenti_paper", "zhenti_start_quiz", "zhenti_quiz_state", "zhenti_next", "zhenti_quit", "zhenti_report"]);
async function studentAction(cwd, action, payload = {}, signal) {
  if (!cwd) throw new Error("\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5E26\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\u3002");
  if (!STUDENT_ACTIONS.has(action)) throw new Error("\u9762\u677F\u4E0D\u652F\u6301\u6B64\u64CD\u4F5C\u3002");
  let response;
  try {
    response = await fetch("/api/dsh-tutorloop/action", {
      method: "POST",
      credentials: "same-origin",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd, action, payload })
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5 TutorLoop\uFF0C\u8BF7\u786E\u8BA4 DSH \u670D\u52A1\u6B63\u5728\u8FD0\u884C\u540E\u91CD\u8BD5\u3002");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("TutorLoop \u5C1A\u672A\u5C31\u7EEA\u3002\u8BF7\u542F\u7528\u63D2\u4EF6\uFF0C\u8FD0\u884C dsh-tutorloop setup \u540E\u5237\u65B0 DSH\u3002");
  }
  if (!response.ok || !result.ok) {
    const message = typeof result.error === "string" ? result.error : result.error?.message;
    throw new Error(message || "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u63D2\u4EF6\u914D\u7F6E\u540E\u91CD\u8BD5\u3002");
  }
  return result.data;
}
function items(data) {
  return Array.isArray(data) ? data : data?.items || data?.sources || [];
}
function value(data) {
  return data && Object.hasOwn(data, "value") ? data.value : data;
}

// src/client/styles.js
var PANEL_CSS = `
.tutorloop-rich{white-space:pre-wrap;overflow-wrap:anywhere}.tutorloop-figure{display:block;margin:10px 0}.tutorloop-figure img{display:block;max-width:100%;height:auto;background:#fff;border:1px solid var(--tl-line);border-radius:6px}.tutorloop-table-scroll{overflow-x:auto}.tutorloop-panel input[type="checkbox"]{width:auto!important;display:inline!important;accent-color:var(--tl-accent);margin:5px 0!important;flex-shrink:0}.tutorloop-option>span{min-width:0}
.tutorloop-panel { --tl-bg:var(--dsw-alias-bg-base,var(--bg-panel,#fafaf8)); --tl-card:var(--dsw-alias-bg-layer-2,var(--bg-card,#ffffff)); --tl-text:var(--dsw-alias-label-primary,var(--text-primary,#202822)); --tl-muted:var(--dsw-alias-label-secondary,var(--text-secondary,#57635b)); --tl-line:var(--dsw-alias-border-l1,var(--border,#d5ddd7)); --tl-accent:var(--dsw-alias-interactive-primary,var(--accent,#287854)); color:var(--tl-text); background:var(--tl-bg); font-family:var(--dsw-font-family,inherit); padding:24px; overflow:auto; height:100%; box-sizing:border-box; line-height:1.6; }
@media(prefers-color-scheme:dark){.tutorloop-panel { --tl-bg:var(--dsw-alias-bg-base,var(--bg-panel,#171c19)); --tl-card:var(--dsw-alias-bg-layer-2,var(--bg-card,#232b26)); --tl-text:var(--dsw-alias-label-primary,var(--text-primary,#eef2ef)); --tl-muted:var(--dsw-alias-label-secondary,var(--text-secondary,#b7c3bb)); --tl-line:var(--dsw-alias-border-l1,var(--border,#425047)); --tl-accent:var(--dsw-alias-interactive-primary,var(--accent,#87cfa7)); }}
[data-theme="dark"] .tutorloop-panel,.dark .tutorloop-panel { --tl-bg:var(--dsw-alias-bg-base,var(--bg-panel,#171c19)); --tl-card:var(--dsw-alias-bg-layer-2,var(--bg-card,#232b26)); --tl-text:var(--dsw-alias-label-primary,var(--text-primary,#eef2ef)); --tl-muted:var(--dsw-alias-label-secondary,var(--text-secondary,#b7c3bb)); --tl-line:var(--dsw-alias-border-l1,var(--border,#425047)); --tl-accent:var(--dsw-alias-interactive-primary,var(--accent,#87cfa7)); }
.tutorloop-panel *{box-sizing:border-box}.tutorloop-content{max-width:960px;margin:auto}.tutorloop-header,.tutorloop-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.tutorloop-header{justify-content:space-between;margin-bottom:20px}.tutorloop-panel h1{font-size:24px;margin:0;letter-spacing:-.03em}.tutorloop-panel h2{font-size:17px;margin:0 0 12px}.tutorloop-panel h3{font-size:15px;margin:0 0 8px}.tutorloop-panel p{margin:8px 0}.tutorloop-muted,.tutorloop-panel small{color:var(--tl-muted)}.tutorloop-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}.tutorloop-panel button,.tutorloop-panel input,.tutorloop-panel select,.tutorloop-panel textarea{font:inherit;color:var(--tl-text);background:var(--tl-card);border:1px solid var(--tl-line);border-radius:8px;padding:8px 12px}.tutorloop-panel button{cursor:pointer}.tutorloop-panel button[aria-selected="true"],.tutorloop-primary{border-color:var(--tl-accent)!important;font-weight:600}.tutorloop-panel button:focus-visible,.tutorloop-panel input:focus-visible,.tutorloop-panel textarea:focus-visible,.tutorloop-panel select:focus-visible{outline:2px solid var(--tl-accent);outline-offset:2px}.tutorloop-panel button:disabled{opacity:.55;cursor:wait}.tutorloop-panel label{display:block;margin:10px 0}.tutorloop-panel label>input:not([type="radio"]),.tutorloop-panel label>textarea,.tutorloop-panel label>select{display:block;width:100%;margin-top:4px}.tutorloop-panel input[type="radio"]{accent-color:var(--tl-accent);margin-right:8px}.tutorloop-panel textarea{min-height:110px;resize:vertical}.tutorloop-card{background:var(--tl-card);color:var(--tl-text);border:1px solid var(--tl-line);border-radius:12px;padding:18px;margin:12px 0}.tutorloop-material{white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid var(--tl-accent);padding-left:14px;margin:14px 0}.tutorloop-notice{border-left:3px solid var(--tl-accent);padding:10px 14px;margin:12px 0;color:var(--tl-text);background:var(--tl-card)}.tutorloop-error{border:1px solid var(--tl-line);padding:12px;border-radius:8px;color:var(--tl-text);background:var(--tl-card)}.tutorloop-panel a{color:var(--tl-accent)}.tutorloop-panel ul,.tutorloop-panel ol{padding-left:24px}.tutorloop-panel summary{cursor:pointer}.tutorloop-option{display:flex!important;gap:8px;align-items:flex-start}.tutorloop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.tutorloop-panel code{white-space:pre-wrap;overflow-wrap:anywhere}.tutorloop-badge{font-size:12px;color:var(--tl-muted);border:1px solid var(--tl-line);border-radius:20px;padding:2px 8px}.tutorloop-table{width:100%;border-collapse:collapse;margin:10px 0;font-size:14px}.tutorloop-table th,.tutorloop-table td{border:1px solid var(--tl-line);padding:8px 10px;text-align:left;vertical-align:top}.tutorloop-table thead th{background:var(--tl-bg)}.tutorloop-warning{border:1px solid var(--tl-line);border-left:3px solid #c77700;background:var(--tl-card);padding:10px 14px;margin:10px 0;border-radius:8px}.tutorloop-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}@media(max-width:600px){.tutorloop-panel{padding:14px}.tutorloop-card{padding:14px}}
`;
function mountStyles(target = document) {
  if (target.querySelector("style[data-tutorloop-style]")) return () => {
  };
  const style = target.createElement("style");
  style.dataset.tutorloopStyle = "";
  style.textContent = PANEL_CSS;
  target.head.appendChild(style);
  return () => style.remove();
}

// src/client/i18n.js
var import_react = __toESM(require("react"), 1);
function detectLanguage(doc = globalThis.document) {
  const language = doc?.documentElement?.lang || "zh";
  return /^zh/i.test(language) ? "zh" : "en";
}
var english = {
  "\u5B9A\u6027\u53CD\u9988\uFF1A\u672C\u9898\u5C1A\u65E0\u786E\u8BA4\u7684\u5206\u9879\u91CF\u8868\uFF0C\u4E0D\u8BA1\u6570\u503C\u6210\u7EE9\u3002": "Qualitative feedback: no confirmed rubric yet, so no numerical score is assigned.",
  "\u5B9A\u6027\u53CD\u9988": "Qualitative feedback",
  "\u6750\u6599\u4F9D\u636E\uFF1A": "Source evidence: ",
  "\u8FD9\u91CC\u4EC5\u5C55\u793A\u5DF2\u6307\u5B9A\u7684\u5B66\u751F\u6750\u6599\uFF0C\u6559\u5E08\u53C2\u8003\u8D44\u6599\u5355\u72EC\u4FDD\u5B58\u3002": "Only designated student materials are shown here. Teacher references are kept separately.",
  "\u8FD9\u4EFD\u8D44\u6599\u7ECF\u8FC7\u6587\u5B57\u63D0\u53D6\uFF0C\u56FE\u5F62\u3001\u8868\u683C\u4E0E\u6BB5\u843D\u987A\u5E8F\u8BF7\u5BF9\u7167\u539F\u4EF6\u6838\u5BF9\u3002": "This material was extracted as text. Check figures, tables, and paragraph order against the original.",
  "\u5DF2\u63D0\u4EA4 ": "Submitted ",
  " \xB7 \u5DF2\u8BC4\u5206 ": " \xB7 Scored ",
  " \xB7 \u6B63\u786E ": " \xB7 Correct ",
  " \xB7 \u6B63\u786E\u7387 ": " \xB7 Accuracy ",
  " \xB7 \u5F85\u6279\u6539 ": " \xB7 Pending ",
  "\u56DE\u770B": "Review",
  "\u56DE\u770B\u8FD9\u9898": "Review this item",
  "\u4EC5\u7EDF\u8BA1\u672C\u8F6E\u4F5C\u7B54\uFF1B\u6B63\u786E\u7387\u53EA\u8BA1\u6709\u6570\u503C\u8BC4\u5206\u7684\u9898\u76EE\uFF0C\u5B9A\u6027\u53CD\u9988\u4E0E\u5F85\u6279\u6539\u4E0D\u8BA1\u5165\u3002": "Only this round is counted. Accuracy includes numerically scored items; qualitative and pending feedback are excluded.",
  "\u672C\u9898\u5C1A\u65E0\u786E\u8BA4\u7684\u5206\u9879\u91CF\u8868\uFF0C\u53EF\u5148\u7EC3\u4E60\u5E76\u83B7\u5F97\u5B9A\u6027\u53CD\u9988\u3002": "This item has no confirmed rubric yet. You can practice and receive qualitative feedback.",
  "\u8BF7\u5BFC\u5E08\u51C6\u5907\u8BC4\u5206\u6807\u51C6": "Ask tutor to prepare the rubric",
  "\u672C\u9898\u542B\u6682\u4E0D\u652F\u6301\u7684\u56FE\u50CF\uFF0C\u8BF7\u56DE\u770B\u539F\u4EF6\uFF1B\u5F53\u524D\u4E0D\u80FD\u6B63\u5E38\u4EA4\u5377\u3002": "This item contains unsupported images. Review the original; submission is currently unavailable.",
  "\u56FE\u7247\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u5E76\u91CD\u65B0\u6253\u5F00\u7EC3\u4E60\u3002\u56FE\u7247\u4E0D\u5B8C\u6574\u65F6\u4E0D\u80FD\u4EA4\u5377\u3002": "An image failed to load. Check your connection and reopen the practice. Submission requires complete images.",
  "\u6B63\u5728\u52A0\u8F7D\u9898\u76EE\u56FE\u50CF\uFF0C\u5B8C\u6210\u540E\u8BF7\u786E\u8BA4\u5185\u5BB9\u5B8C\u6574\u3002": "Loading question images. Confirm they are complete once loaded.",
  "\u6211\u5DF2\u770B\u6E05\u9898\u5E72\u3001\u6750\u6599\u548C\u9009\u9879\u4E2D\u7684\u5168\u90E8\u56FE\u50CF": "I can clearly see every image in the question, materials, and options",
  " \u4E2A\u8BCD": " words",
  "\u8BF7\u5BFC\u5E08\u6279\u6539\uFF08\u590D\u5236\u8BF7\u6C42\uFF09": "Ask tutor to review (copy request)",
  "\u8BF7\u6C42\u5DF2\u590D\u5236\u3002\u5DF2\u5207\u56DE\u804A\u5929\uFF0C\u7C98\u8D34\u5E76\u53D1\u9001\u5373\u53EF\u3002": "Request copied. Paste and send it in chat.",
  "\u7B54\u6848\u5DF2\u4FDD\u5B58\u3002\u70B9\u51FB\u201C\u8BF7\u5BFC\u5E08\u6279\u6539\u201D\u590D\u5236\u8BF7\u6C42\uFF0C\u518D\u56DE\u804A\u5929\u7C98\u8D34\u53D1\u9001\u3002": "Answer saved. Use \u201CAsk tutor to review\u201D to copy the request, then paste and send it in chat.",
  "\u5DF2\u5B8C\u6210": "Finished",
  "\u6574\u5377\u9010\u9898\u4F5C\u7B54\uFF0C\u884C\u6D4B\u5355\u9009\u81EA\u52A8\u5224\u5206\u3002": "Work through the paper one item at a time. Valid multiple-choice items are graded on submission.",
  "\u8DDF\u968F DSH": "Follow DSH",
  "\u4E00\u6B21\u89E3\u51B3\u4E00\u4E2A\u95EE\u9898\uFF0C\u7EC3\u4E60\u540E\u518D\u9A8C\u8BC1\u3002": "One question at a time. Practice, then check your understanding.",
  "\u5237\u65B0\u8BB0\u5F55": "Refresh",
  "\u7EC3\u4E60": "Practice",
  "\u8D44\u6599": "Materials",
  "\u65B9\u6CD5": "Methods",
  "\u76EE\u6807": "Goals",
  "\u6BCF\u5929 ": "Daily ",
  " \u5206\u949F": " min",
  " \u6B21\u8BB0\u5F55 \xB7 ": " attempts \xB7 ",
  " \u4E2A\u8D44\u6599\u7247\u6BB5": " source excerpts",
  "\u6B63\u5728\u5904\u7406\u2026": "Working\u2026",
  "\u5F00\u59CB\u4E00\u4E2A\u5C0F\u4EFB\u52A1": "Start a small task",
  "\u8BF7\u9009\u62E9\u4E00\u9898": "Choose a practice question",
  "\u65B9\u5F0F": "Mode",
  "\u966A\u7EC3\uFF1A\u53EF\u63D0\u793A\u4E0E\u793A\u8303": "Coaching: hints and examples",
  "\u81EA\u6D4B\uFF1A\u4EA4\u5377\u540E\u8BB2\u89E3": "Self-test: explanations after submission",
  "\u5F00\u59CB\u7EC3\u4E60": "Start practice",
  "\u8FD8\u6CA1\u6709\u7EC3\u4E60\u3002\u53EF\u4EE5\u56DE\u5230\u804A\u5929\uFF0C\u8BA9 DSH \u6839\u636E\u4F60\u7684\u5B66\u4E60\u76EE\u6807\u4E0E\u5DF2\u6709\u8D44\u6599\u521B\u5EFA\u4E00\u9898\u3002": "No practice yet. Ask DSH in chat to create a question using your goal and materials.",
  "\u5185\u7F6E\u7EC3\u4E60\u4EE5\u56FD\u8003\u4E3A\u4E3B\uFF1B\u5176\u4ED6\u4E3B\u9898\u53EF\u5728\u804A\u5929\u4E2D\u8BF7\u5F53\u524D\u6A21\u578B\u521B\u5EFA\u3002\u81EA\u7F16\u4E0E AI \u7EC3\u4E60\u5747\u9700\u6838\u5BF9\u3002": "Included examples focus on Chinese civil-service exams. Ask your current model in chat for other subjects. Review authored and AI-generated questions.",
  "\u5F53\u524D\u7EC3\u4E60": "Current practice",
  "\u81EA\u6D4B": "Self-test",
  "\u966A\u7EC3": "Coaching",
  "\u4E0D\u8D85\u8FC7 ": "Limit: ",
  " \u5B57": " characters",
  "\u8BF7\u9009\u62E9\u4E00\u4E2A\u9009\u9879": "Choose one option",
  "\u4F60\u7684\u7B54\u6848": "Your answer",
  "\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u51FA\u601D\u8DEF\u2026": "Explain your reasoning in your own words\u2026",
  "\u4FDD\u5B58\u5E76\u63D0\u4EA4": "Save and submit",
  "\u7ED9\u4E00\u4E2A\u63D0\u793A": "Get a hint",
  "\u770B\u793A\u8303": "Show an example",
  "\u672C\u6B21\u5DF2\u767B\u8BB0\u4F7F\u7528\u8F85\u52A9\uFF1B\u4E0B\u4E00\u9898\u518D\u9A8C\u8BC1\u72EC\u7ACB\u5B8C\u6210\u3002": "Assistance is recorded for this attempt. Check independent performance on another question.",
  "\u8FD9\u4EFD\u4E3B\u89C2\u7B54\u6848\u5F85\u6279\u6539\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u540E\uFF0C\u5728\u804A\u5929\u91CC\u7C98\u8D34\u53D1\u9001\u5373\u53EF\u6279\u6539\u3002": "This written answer is awaiting feedback. Use the button below, then paste and send the copied request in chat.",
  "\u8BF7\u5BFC\u5E08\u6279\u6539\uFF08\u5DF2\u590D\u5236\u8BF7\u6C42\uFF09": "Ask tutor to review (request copied)",
  "\u6211\u5DF2\u53D1\u9001\uFF0C\u5237\u65B0\u6279\u6539": "Sent. Refresh feedback",
  "\u9762\u677F\u4E0D\u4F1A\u53E6\u5F00\u6A21\u578B\u8C03\u7528\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u5F85\u6279\u6539\u8BB0\u4E3A\u96F6\u5206\u3002\u6279\u6539\u5B8C\u6210\u540E\u8FD9\u91CC\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002": "The panel makes no separate model call and never scores a pending answer as zero. This view updates itself once the review lands.",
  "\u6279\u6539\u8BF7\u6C42\u5DF2\u590D\u5236\u3002\u5DF2\u5207\u56DE\u804A\u5929\uFF0C\u7C98\u8D34\u5E76\u53D1\u9001\u5373\u53EF\u3002": "Review request copied. Chat is now open \u2014 paste and send it.",
  "\u6279\u6539\u5DF2\u5B8C\u6210\uFF0C\u53CD\u9988\u5DF2\u66F4\u65B0\u3002": "Review finished. Feedback updated.",
  "\u7B54\u6848\u5DF2\u4FDD\u5B58\u3002\u70B9\u51FB\u201C\u8BF7\u5BFC\u5E08\u6279\u6539\u201D\uFF0C\u8BF7\u6C42\u5DF2\u81EA\u52A8\u590D\u5236\uFF0C\u56DE\u804A\u5929\u7C98\u8D34\u53D1\u9001\u5373\u53EF\u3002": "Answer saved. Use \u201CAsk tutor to review\u201D; the request is copied \u2014 paste and send it in chat.",
  "\u6750\u6599\u539F\u6587 \xB7 ": "Materials \xB7 ",
  " \u6BB5 \xB7 \u7EA6 ": " passages \xB7 about ",
  "\u6750\u6599\u539F\u6587\u4EC5\u4F5C\u9898\u9762\u4F9D\u636E\uFF1B\u7B54\u6848\u4E0E\u8BC4\u5206\u70B9\u4E0D\u4F1A\u5728\u6B64\u5C55\u793A\u3002": "Passages are shown for reading only. Answers and grading points are never displayed here.",
  "\u7EF4\u5EA6": "Dimension",
  "\u5F97\u5206": "Score",
  "\u53CD\u9988": "Feedback",
  "\u5206\u9879\u5F97\u5206": "Criteria scores",
  "\u9057\u6F0F\u8981\u70B9": "Missed points",
  "\u6750\u6599\u5916\u63A8\u65AD": "Claims beyond the material",
  "\u771F\u9898\u4E0E\u6574\u5377": "Real exams & papers",
  "\u8F7D\u5165\u771F\u9898\u5217\u8868": "Load exam list",
  " \u5957\u5377\u53EF\u9009": " papers available",
  "\u8BD5\u5377": "Paper",
  "\u8BF7\u9009\u62E9\u8BD5\u5377": "Choose a paper",
  "\u5F00\u59CB\u6574\u5377": "Start full paper",
  "\u9898\u76EE": "Question",
  "\u8BF7\u9009\u62E9\u4E00\u9898\uFF08\u5171 ": "Choose one (",
  " \u9898\uFF09": " items)",
  "\u7EC3\u4E60\u8FD9\u9898": "Practice this one",
  "\u7EC4\u5377\u79D1\u76EE": "Mix subject",
  "\u7EC4\u5377\u8003\u70B9": "Mix topic",
  "\u62BD\u9898\u6570\u91CF": "Count",
  "\u968F\u673A\u5F00\u7EC3": "Random practice",
  "\u5168\u90E8\u8003\u70B9": "All topics",
  "\u5355\u9009": "choice",
  "\u4E3B\u89C2": "written",
  "\u6574\u5377\u8FDB\u884C\u4E2D": "Paper in progress",
  "\u4E0B\u4E00\u9898 \u2192": "Next \u2192",
  "\u7ED3\u675F\u5E76\u4FDD\u7559\u8BB0\u5F55": "End and keep records",
  "\u67E5\u770B\u62A5\u544A": "View report",
  "\u9010\u9898\u4F5C\u7B54\u540E\u70B9\u201C\u4E0B\u4E00\u9898\u201D\uFF1B\u5355\u9009\u9898\u63D0\u4EA4\u5373\u81EA\u52A8\u5224\u5206\uFF0C\u4E3B\u89C2\u9898\u6309\u4E00\u952E\u6279\u6539\u6D41\u7A0B\u3002\u5B8C\u6210\u540E\u62A5\u544A\u7ED9\u51FA\u6B63\u786E\u7387\u4E0E\u9519\u9898\u6E05\u5355\u3002": "Answer each item then press Next. Choice questions are graded on submit; written answers follow the one-click review flow. A report with accuracy follows.",
  "\u6574\u5377\u62A5\u544A": "Paper report",
  "\u9010\u9898\u7ED3\u679C": "Per-item results",
  "\u9898\u53F7": "No.",
  "\u8003\u70B9": "Topic",
  "\u7ED3\u679C": "Result",
  "\u4F60\u7684\u4F5C\u7B54": "Your answer",
  "\u672A\u4F5C\u7B54": "Unanswered",
  "\u5F85\u6279\u6539": "Awaiting feedback",
  "\u9898\u76EE\u6765\u81EA\u5DE5\u4F5C\u533A\u5DF2\u5BFC\u5165\u7684\u771F\u9898\u89E3\u6790\u6587\u4EF6\uFF1B\u9009\u9879\u4E0E\u7B54\u6848\u5DF2\u6838\u9A8C\u5BF9\u9F50\uFF0C\u673A\u6784\u89E3\u6790\u4EC5\u4F9B\u53C2\u8003\u3002": "Items come from locally verified exam solution files. Options and answers are aligned; publisher explanations are for reference only.",
  "\u672C\u5DE5\u4F5C\u533A\uFF08\u5BFC\u5E08\u521B\u5EFA\uFF09": "This workspace (tutor-created)",
  "\u5185\u7F6E\u793A\u4F8B": "Built-in examples",
  "\u6B64\u5DE5\u4F5C\u533A\u6CA1\u6709\u517C\u5BB9\u7684\u672C\u5730\u9898\u5E93\u3002\u4F60\u53EF\u4EE5\u4F7F\u7528\u5DF2\u6709\u8D44\u6599\uFF0C\u8BF7\u5BFC\u5E08\u6309\u5F53\u524D\u5B66\u4E60\u76EE\u6807\u521B\u5EFA\u7EC3\u4E60\u3002": "No compatible local question bank in this workspace. Ask your tutor to create exercises from your materials and learning goals.",
  "\u4EC5\u663E\u793A\u4E0E\u6863\u6848\u79D1\u76EE\u5339\u914D\u7684\u5185\u7F6E\u793A\u4F8B\uFF1B\u5F53\u524D\u4E3B\u9898\u7684\u7EC3\u4E60\u8BF7\u5BFC\u5E08\u57FA\u4E8E\u8D44\u6599\u521B\u5EFA\uFF0C\u968F\u540E\u51FA\u73B0\u5728\u201C\u672C\u5DE5\u4F5C\u533A\u201D\u5206\u7EC4\u3002\u81EA\u7F16\u4E0E AI \u7EC3\u4E60\u5747\u9700\u6838\u5BF9\u3002": "Built-in examples are filtered by your profile subjects. Ask your tutor to create exercises from your materials; they then appear under \u201CThis workspace\u201D. Review authored and AI-generated questions.",
  "\u7ED3\u679C\u4E3A\u6559\u5B66\u53C2\u8003\uFF1B\u771F\u9898\u7B54\u6848\u4E0E\u89E3\u6790\u6765\u81EA\u672C\u5730\u5DF2\u6838\u9A8C\u7684\u673A\u6784\u89E3\u6790\u6587\u4EF6\uFF0C\u4E0D\u4EE3\u8868\u5B98\u65B9\u8BC4\u5206\u3002": "Results are instructional. Answers and explanations come from locally verified publisher files, not official grading.",
  "\u56DE\u5230\u804A\u5929": "Return to chat",
  "\u9762\u677F\u4E0D\u4F1A\u53E6\u5F00\u6A21\u578B\u8C03\u7528\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u5F85\u6279\u6539\u8BB0\u4E3A\u96F6\u5206\u3002\u804A\u5929\u6279\u6539\u5B8C\u6210\u540E\u5237\u65B0\u8BB0\u5F55\u3002": "The panel does not make a separate model call or score a pending answer as zero. Refresh after your chat model finishes the review.",
  "\u7B54\u6848\u5DF2\u4FDD\u5B58\u3002\u8BF7\u56DE\u5230\u804A\u5929\uFF0C\u8BA9 DSH \u7684\u5F53\u524D\u6A21\u578B\u6309\u672C\u9898\u6750\u6599\u6279\u6539\u3002": "Answer saved. Return to chat for feedback from your current DSH model using this question\u2019s materials.",
  "\u4F5C\u7B54\u5DF2\u8BB0\u5F55\uFF0C\u4E0B\u9762\u53EF\u67E5\u770B\u53CD\u9988\u3002": "Answer recorded. Review your feedback below.",
  "\u4F5C\u7B54\u8BB0\u5F55": "Your attempts",
  "\u7B2C ": "Attempt ",
  " \u6B21\u4F5C\u7B54 \xB7 ": " \xB7 ",
  "\u5DF2\u53CD\u9988": "Reviewed",
  "\u4F7F\u7528\u8FC7\u63D0\u793A\u3001\u793A\u8303\u6216\u4FEE\u6539": "Used hints, examples, or revisions",
  "\u5230\u671F\u590D\u4E60": "Due for review",
  "\u590D\u4E60\u8FD9\u9898": "Review this question",
  "\u6682\u65E0\u5230\u671F\u4EFB\u52A1\u3002\u505A\u5B8C\u5E76\u590D\u76D8\u540E\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u590D\u4E60\u5B89\u6392\u3002": "Nothing due yet. Review schedules appear here after practice and feedback.",
  "\u672C\u6B21\u53CD\u9988": "Feedback",
  "\u6559\u5B66\u53C2\u8003\u5206\uFF1A": "Practice score: ",
  " / ": " / ",
  " \xB7 \u975E\u5B98\u65B9\u8BC4\u5206": " \xB7 not an official grade",
  "\u4F60\u7684\u539F\u53E5\uFF1A": "Your words: ",
  "\u6539\u5199\u793A\u8303": "Example revision",
  "\u4F60\u7684\u5B66\u4E60\u76EE\u6807": "Your learning goal",
  "\u5B66\u4E60\u540D\u79F0": "Learning title",
  "\u5177\u4F53\u76EE\u6807": "Specific goal",
  "\u6BCF\u5929\u53EF\u5B66\u4E60\u7684\u5206\u949F\u6570": "Available minutes per day",
  "\u5DF2\u6709\u57FA\u7840": "Starting point",
  "\u4FDD\u5B58\u901A\u7528\u76EE\u6807": "Save learning goal",
  "\u4F7F\u7528\u56FD\u8003\u526F\u7701\u7EA7\u9884\u8BBE": "Use Chinese civil-service exam preset",
  "\u5982\uFF1A\u82F1\u8BED\u9605\u8BFB\u3001\u56FD\u8003\u3001\u7F16\u7A0B\u57FA\u7840": "e.g. English reading, exam preparation, programming",
  "TutorLoop \u6309\u4F60\u63D0\u4F9B\u7684\u57FA\u7840\u548C\u5B9E\u9645\u4F5C\u7B54\u8C03\u6574\u6559\u5B66\uFF0C\u4E0D\u9ED8\u8BA4\u5E74\u7EA7\u6216\u80FD\u529B\u3002": "TutorLoop adapts to your starting point and actual answers, without assuming a grade level or ability.",
  "\u5B66\u4E60\u76EE\u6807\u5DF2\u4FDD\u5B58\uFF1B\u5DF2\u5F00\u59CB\u7684\u7EC3\u4E60\u4FDD\u7559\u539F\u6765\u7684\u5B66\u4E60\u6863\u6848\u3002": "Goal saved. Existing practice keeps its original learning profile.",
  "\u5BFC\u5165\u672C\u5730\u8D44\u6599": "Import local materials",
  "\u5F53\u524D\u5DE5\u4F5C\u533A\u5185\u7684\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u8DEF\u5F84": "File or folder path inside this workspace",
  "\u5982\uFF1Amaterials/lesson.pdf": "e.g. materials/lesson.pdf",
  "\u5BFC\u5165\u6587\u4EF6": "Import file",
  "\u5BFC\u5165\u6587\u4EF6\u5939": "Import folder",
  "\u652F\u6301\u7684\u6587\u4EF6\u7531\u672C\u5730\u5BFC\u5165\u5668\u68C0\u67E5\u3002\u626B\u63CF\u4EF6\u3001\u56FE\u5F62\u4E0E\u590D\u6742\u8868\u683C\u9700\u8981\u56DE\u770B\u539F\u4EF6\uFF0C\u673A\u6784\u89E3\u6790\u4E0D\u662F\u5B98\u65B9\u7B54\u6848\u3002": "The local importer checks supported files. Scans, figures, and complex tables need review against the original. Publisher explanations are not official answers.",
  "\u67E5\u627E\u516C\u5F00\u8D44\u6599": "Find public materials",
  "\u641C\u7D22\u8BCD": "Search terms",
  "\u641C\u7D22\u5E76\u6536\u5F55": "Search and collect",
  "\u539F\u6587 URL": "Source URL",
  "\u8BFB\u53D6\u7F51\u9875": "Read webpage",
  "\u641C\u7D22\u6458\u8981\u4E0E\u7F51\u9875\u5168\u6587\u4F1A\u5206\u522B\u6807\u8BB0\uFF0C\u65E0\u6CD5\u6293\u53D6\u65F6\u4E0D\u8865\u9020\u6B63\u6587\u3002": "Search snippets and full webpages are labeled separately. Missing text is never invented.",
  "\u672C\u6B21\u5904\u7406": "Import results",
  "\u90E8\u5206\u8D44\u6599\u672A\u5BFC\u5165\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u3002": "Some materials could not be imported. Check the files.",
  "\u5DF2\u6536\u5F55\u6765\u6E90 \xB7 ": "Collected sources \xB7 ",
  "\u672A\u547D\u540D\u6765\u6E90": "Untitled source",
  "\u641C\u7D22\u6458\u8981\uFF0C\u975E\u5168\u6587": "Search snippet, not full text",
  "\u81EA\u7F16\u6750\u6599": "Authored example",
  "\u7F51\u9875\u5168\u6587": "Full webpage",
  "\u672C\u5730\u6750\u6599": "Local material",
  "\u67E5\u770B\u539F\u59CB\u6765\u6E90": "Open original source",
  "\u8FD8\u6CA1\u6709\u6536\u5F55\u8D44\u6599\u3002\u5BFC\u5165\u4E00\u4EFD\u4E0E\u4F60\u7684\u76EE\u6807\u76F8\u5173\u7684\u6750\u6599\uFF0C\u518D\u56DE\u804A\u5929\u5F00\u59CB\u5B66\u4E60\u3002": "No materials collected yet. Import something relevant to your goal, then return to chat to start learning.",
  "\u628A\u65B9\u6CD5\u62C6\u6210\u4E00\u4E2A\u52A8\u4F5C": "Turn a method into one action",
  "\u4EE5\u4E0B\u662F\u6559\u5B66\u6574\u7406\uFF0C\u4EE5\u56FD\u8003\u793A\u4F8B\u4E3A\u4E3B\uFF0C\u4E0D\u662F\u5B98\u65B9\u8BC4\u5206\u6807\u51C6\u3002": "These teaching notes mainly use Chinese exam examples. They are not official grading standards.",
  "\u4F8B\u5B50\uFF1A": "Example: ",
  "\u5BB9\u6613\u8BEF\u5224\uFF1A": "Common pitfall: ",
  "\u4E0B\u4E00\u6B65\uFF1A": "Next action: ",
  "\u5B66\u4E60\u9762\u677F": "Learning panel",
  "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5E26\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\uFF0CTutorLoop \u4F1A\u5728\u8BE5\u5DE5\u4F5C\u533A\u4FDD\u5B58\u5B66\u4E60\u8BB0\u5F55\u3002": "Open a conversation with a workspace first. TutorLoop saves learning records in that workspace.",
  "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5E26\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\u3002": "Open a conversation with a workspace first.",
  "\u9762\u677F\u4E0D\u652F\u6301\u6B64\u64CD\u4F5C\u3002": "This action is not available in the student panel.",
  "\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5 TutorLoop\uFF0C\u8BF7\u786E\u8BA4 DSH \u670D\u52A1\u6B63\u5728\u8FD0\u884C\u540E\u91CD\u8BD5\u3002": "Cannot connect to TutorLoop. Check that DSH is running, then retry.",
  "TutorLoop \u5C1A\u672A\u5C31\u7EEA\u3002\u8BF7\u542F\u7528\u63D2\u4EF6\uFF0C\u8FD0\u884C dsh-tutorloop setup \u540E\u5237\u65B0 DSH\u3002": "TutorLoop is not ready. Enable the plugin, run dsh-tutorloop setup once, then reload DSH.",
  "\u64CD\u4F5C\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u63D2\u4EF6\u914D\u7F6E\u540E\u91CD\u8BD5\u3002": "The action did not complete. Check plugin settings and retry.",
  "\u9996\u6B21\u4F7F\u7528\u4E0E\u8FD0\u884C\u5E2E\u52A9": "First-time setup and help",
  "\u53EA\u9700\u521D\u59CB\u5316\u4E00\u6B21\u8FD0\u884C\u73AF\u5883\uFF0C\u7136\u540E\u5237\u65B0\u6216\u91CD\u542F DSH\u3002\u65E0\u9700\u542F\u52A8 Streamlit\uFF0C\u4E5F\u4E0D\u5FC5\u53E6\u914D\u6A21\u578B\u5BC6\u94A5\u6216\u5F3A\u5236\u586B\u5199 Python \u8DEF\u5F84\u3002": "Run setup once, then reload DSH. No Streamlit, extra model key, or manual Python path is required.",
  "\u521D\u59CB\u5316\uFF1A": "Setup: ",
  "\u6E90\u7801\u76EE\u5F55\u4E5F\u53EF\u8FD0\u884C\uFF1A": "From the source directory: ",
  "\u5982\u679C\u5DE5\u4F5C\u533A\u5C1A\u672A\u786E\u8BA4\uFF0C\u8BF7\u5148\u5728\u5F53\u524D\u4F1A\u8BDD\u53D1\u9001\u4E00\u6761\u804A\u5929\u6D88\u606F\uFF0C\u518D\u5237\u65B0\u9762\u677F\u3002": "If this workspace is not confirmed yet, send one chat message in this conversation, then refresh the panel."
};
function translate(text, language) {
  if (language !== "en" || typeof text !== "string") return text;
  if (Object.hasOwn(english, text)) return english[text];
  const collected = /^资料处理完成，新增 (\d+) 个片段。请核对来源和完整性。$/.exec(text);
  if (collected) return `Materials processed: ${collected[1]} new excerpts. Check sources and completeness.`;
  const copyFailed = /^复制失败，请手动复制：“(.+)”$/.exec(text);
  return copyFailed ? `Copy failed. Copy this manually: \u201C${copyFailed[1]}\u201D` : text;
}
function localize(node, language) {
  if (typeof node === "string") return translate(node, language);
  if (Array.isArray(node)) return import_react.default.Children.map(node, (child) => localize(child, language));
  if (!import_react.default.isValidElement(node)) return node;
  if (node.props["data-tutorloop-content"] || node.props.className?.split(" ").includes("tutorloop-material")) return node;
  const props = {};
  for (const name of ["placeholder", "aria-label", "title"]) {
    if (typeof node.props[name] === "string") props[name] = translate(node.props[name], language);
  }
  if (Object.hasOwn(node.props, "children")) props.children = localize(node.props.children, language);
  return import_react.default.cloneElement(node, props);
}

// src/client/rich-content.jsx
var import_react2 = __toESM(require("react"), 1);
var import_jsx_runtime = require("react/jsx-runtime");
var IMAGE_HOSTS = /* @__PURE__ */ new Set(["fb.fbstatic.cn", "fb.fenbike.cn"]);
function safeImageUrl(value2) {
  try {
    if (typeof value2 !== "string" || value2.length > 4096 || /[\u0000-\u0020\\]/.test(value2)) return null;
    const url = new URL(value2);
    if (url.pathname === "/" || /\.(svg|html?|js)$/i.test(url.pathname)) return null;
    url.hash = "";
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && IMAGE_HOSTS.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}
function imageRequirements(question, materials = []) {
  const blocks = [
    ...question?.stem_blocks || [],
    ...materials.length ? [] : question?.material_blocks || [],
    ...(question?.options || []).flatMap((option) => option.blocks || []),
    ...materials.flatMap((material) => material.blocks || [])
  ];
  const images = blocks.filter((block) => block.type === "image");
  return {
    urls: [...new Set(images.map((block) => safeImageUrl(block.url)).filter(Boolean))],
    unsupported: images.some((block) => block.supported === false || !safeImageUrl(block.url))
  };
}
function RichContent({ blocks, text = "", onAssetState, language = "zh" }) {
  if (!blocks?.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tutorloop-rich", "data-tutorloop-content": true, children: text });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tutorloop-rich", "data-tutorloop-content": true, children: blocks.map((block, index) => {
    if (block.type === "text") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: block.text }, index);
    if (block.type !== "image") return null;
    const url = block.supported === false ? null : safeImageUrl(block.url);
    if (!url) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tutorloop-warning", role: "alert", children: language === "en" ? "This image is unavailable. Check the original before practicing." : "\u8FD9\u5F20\u56FE\u6682\u65E0\u6CD5\u663E\u793A\uFF0C\u8BF7\u56DE\u770B\u539F\u4EF6\uFF1B\u5F53\u524D\u4E0D\u80FD\u6B63\u5E38\u4EA4\u5377\u3002" }, index);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "tutorloop-figure", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: url, target: "_blank", rel: "noopener noreferrer", title: language === "en" ? "Open full-size image" : "\u6253\u5F00\u5B8C\u6574\u56FE\u7247", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        src: url,
        alt: block.alt || (language === "en" ? "Question illustration" : "\u9898\u76EE\u56FE\u50CF"),
        referrerPolicy: "no-referrer",
        onLoad: (event) => onAssetState?.(url, event.currentTarget.naturalWidth > 0 ? "loaded" : "error"),
        onError: () => onAssetState?.(url, "error")
      }
    ) }) }, index);
  }) });
}

// src/client/index.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var inject = ["slots"];
function ConversationTutorLoop({ sessionId, useSessions, viewRequest, completeViewRequest, openView }) {
  const cwd = useSessions((snapshot) => snapshot.byId[sessionId]?.cwd ?? "");
  (0, import_react3.useEffect)(() => {
    if (viewRequest?.view === "tutorloop") completeViewRequest?.();
  }, [viewRequest, completeViewRequest]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TutorLoopPanel, { cwd, openChat: () => openView?.("chat", "") }, cwd);
}
function Feedback({ feedback, language }) {
  if (!feedback) return null;
  const scored = typeof feedback.score === "number" && feedback.grading_status !== "qualitative";
  return localize(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "\u672C\u6B21\u53CD\u9988" }),
    scored ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u6559\u5B66\u53C2\u8003\u5206\uFF1A",
      feedback.score,
      " / ",
      feedback.max_score,
      " \xB7 \u975E\u5B98\u65B9\u8BC4\u5206"
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u5B9A\u6027\u53CD\u9988\uFF1A\u672C\u9898\u5C1A\u65E0\u786E\u8BA4\u7684\u5206\u9879\u91CF\u8868\uFF0C\u4E0D\u8BA1\u6570\u503C\u6210\u7EE9\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      feedback.next_skill,
      "\uFF1A",
      feedback.next_exercise_instruction
    ] }),
    Boolean(feedback.criteria?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "tutorloop-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("caption", { className: "tutorloop-sr-only", children: "\u5206\u9879\u5F97\u5206" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u7EF4\u5EA6" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u5F97\u5206" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u53CD\u9988" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: feedback.criteria.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "row", "data-tutorloop-content": true, children: item.name }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: scored ? `${item.awarded}/${item.max_points}` : "\u2014" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-tutorloop-content": true, children: item.feedback }),
          item.student_span && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { children: [
              "\u4F60\u7684\u539F\u53E5\uFF1A",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-tutorloop-content": true, children: item.student_span })
            ] })
          ] }),
          Boolean(item.evidence_ids?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { children: [
              "\u6750\u6599\u4F9D\u636E\uFF1A",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-tutorloop-content": true, children: item.evidence_ids.join("\u3001") })
            ] })
          ] })
        ] })
      ] }, item.name)) })
    ] }),
    Boolean(feedback.omissions?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-warning", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u9057\u6F0F\u8981\u70B9" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { children: feedback.omissions.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: item }, index)) })
    ] }),
    Boolean(feedback.unsupported_claims?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-warning", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u6750\u6599\u5916\u63A8\u65AD" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { children: feedback.unsupported_claims.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: item }, index)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: feedback.organization_feedback }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("summary", { children: "\u6539\u5199\u793A\u8303" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: feedback.improved_answer })
    ] })
  ] }), language);
}
function MaterialPassages({ materials, language, onAssetState }) {
  const list = materials || [];
  if (!list.length) return null;
  const totalChars = list.reduce((sum, m) => sum + (m.text?.length || 0), 0);
  const hasImages = list.some((material) => material.blocks?.some((block) => block.type === "image"));
  return localize(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { className: "tutorloop-card", open: totalChars <= 400 || hasImages, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("summary", { children: [
      "\u6750\u6599\u539F\u6587 \xB7 ",
      list.length,
      " \u6BB5 \xB7 \u7EA6 ",
      totalChars,
      " \u5B57"
    ] }),
    list.map((m, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h4", { "data-tutorloop-content": true, children: [
        m.id,
        " \xB7 ",
        m.title || m.locator || `\u6750\u6599 ${index + 1}`
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-material", "data-tutorloop-content": true, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RichContent, { blocks: m.blocks, text: m.text, onAssetState, language }) }),
      m.url && /^https?:\/\//i.test(m.url) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: m.url, target: "_blank", rel: "noreferrer", children: "\u67E5\u770B\u539F\u59CB\u6765\u6E90" })
    ] }, m.id || index)),
    list.some((material) => material.needs_visual_review) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-warning", children: "\u8FD9\u4EFD\u8D44\u6599\u7ECF\u8FC7\u6587\u5B57\u63D0\u53D6\uFF0C\u56FE\u5F62\u3001\u8868\u683C\u4E0E\u6BB5\u843D\u987A\u5E8F\u8BF7\u5BF9\u7167\u539F\u4EF6\u6838\u5BF9\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "\u8FD9\u91CC\u4EC5\u5C55\u793A\u5DF2\u6307\u5B9A\u7684\u5B66\u751F\u6750\u6599\uFF0C\u6559\u5E08\u53C2\u8003\u8D44\u6599\u5355\u72EC\u4FDD\u5B58\u3002" }) })
  ] }), language);
}
function gradingRequest(exerciseId, attemptId, language = "zh") {
  return language === "en" ? `Please call tutor_get_context with exercise_id="${exerciseId}" and review my submitted attempt_id="${attemptId}" using its frozen materials and rubric. Verify the exercise/attempt match internally. Do not use a different current exercise or submit another answer for me. If the rubric is uncalibrated, give qualitative feedback only. Explain the result in plain English without repeating IDs, versions, JSON or internal states; focus on one useful next step and do not add requirements beyond the question.` : `\u8BF7\u8C03\u7528 tutor_get_context\uFF0C\u6307\u5B9A exercise_id="${exerciseId}"\uFF0C\u6279\u6539\u6211\u5DF2\u63D0\u4EA4\u7684 attempt_id="${attemptId}"\u3002\u5728\u5185\u90E8\u6838\u5BF9\u4F5C\u7B54\u5C5E\u4E8E\u8FD9\u9053\u9898\uFF0C\u518D\u4F9D\u636E\u51BB\u7ED3\u6750\u6599\u4E0E\u91CF\u8868\u53CD\u9988\uFF1B\u4E0D\u8981\u6539\u8BFB\u5176\u4ED6\u201C\u5F53\u524D\u7EC3\u4E60\u201D\uFF0C\u4E0D\u8981\u4EE3\u6211\u91CD\u65B0\u63D0\u4EA4\u3002\u91CF\u8868\u5C1A\u672A\u786E\u8BA4\u65F6\u53EA\u7ED9\u5B9A\u6027\u53CD\u9988\u3002\u7ED9\u6211\u7684\u89E3\u91CA\u53EA\u7528\u81EA\u7136\u8BED\u8A00\uFF0C\u4E0D\u590D\u8FF0ID\u3001\u7248\u672C\u3001JSON\u6216\u5185\u90E8\u72B6\u6001\uFF1B\u53EA\u5C55\u5F00\u4E00\u4E2A\u6709\u5E2E\u52A9\u7684\u4E0B\u4E00\u6B65\uFF0C\u4E0D\u589E\u52A0\u9898\u76EE\u4E4B\u5916\u7684\u8981\u6C42\u3002`;
}
function PaperReport({ report, language, busy, onOpenExercise }) {
  return localize(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", "aria-label": "\u6574\u5377\u62A5\u544A", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { "data-tutorloop-content": true, children: report.title }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
      "\u5DF2\u63D0\u4EA4 ",
      report.answered,
      "/",
      report.total,
      " \xB7 \u5DF2\u8BC4\u5206 ",
      report.scored ?? report.graded ?? 0,
      " \xB7 \u6B63\u786E ",
      report.correct,
      report.accuracy != null && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        " \xB7 \u6B63\u786E\u7387 ",
        Math.round(report.accuracy * 100),
        "%"
      ] }),
      Boolean(report.pending) && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        " \xB7 \u5F85\u6279\u6539 ",
        report.pending
      ] })
    ] }),
    Boolean(report.items?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-table-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { className: "tutorloop-table", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("caption", { className: "tutorloop-sr-only", children: "\u9010\u9898\u7ED3\u679C" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u9898\u53F7" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u8003\u70B9" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u7ED3\u679C" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u4F60\u7684\u4F5C\u7B54" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { scope: "col", children: "\u56DE\u770B" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: report.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: item.no }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { "data-tutorloop-content": true, children: item.skill }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: item.status === "graded" ? typeof item.score === "number" ? `${item.score}/10` : "\u5B9A\u6027\u53CD\u9988" : item.status === "pending" ? "\u5F85\u6279\u6539" : "\u672A\u4F5C\u7B54" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { "data-tutorloop-content": true, children: String(item.answer ?? "").slice(0, 80) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { children: item.exercise_id && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: () => onOpenExercise(item.exercise_id), children: "\u56DE\u770B\u8FD9\u9898" }) })
      ] }, `${item.no}:${item.seed}`)) })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "\u4EC5\u7EDF\u8BA1\u672C\u8F6E\u4F5C\u7B54\uFF1B\u6B63\u786E\u7387\u53EA\u8BA1\u6709\u6570\u503C\u8BC4\u5206\u7684\u9898\u76EE\uFF0C\u5B9A\u6027\u53CD\u9988\u4E0E\u5F85\u6279\u6539\u4E0D\u8BA1\u5165\u3002" }) })
  ] }), language);
}
function TutorLoopPanel({ cwd, openChat }) {
  const [languageMode, setLanguageMode] = (0, import_react3.useState)("zh");
  const [hostLanguage, setHostLanguage] = (0, import_react3.useState)(detectLanguage);
  const [languageReady, setLanguageReady] = (0, import_react3.useState)(false);
  const language = languageMode === "auto" ? hostLanguage : languageMode;
  const [tab, setTab] = (0, import_react3.useState)("\u7EC3\u4E60");
  const [overview, setOverview] = (0, import_react3.useState)(null);
  const [student, setStudent] = (0, import_react3.useState)(null);
  const [sources, setSources] = (0, import_react3.useState)([]);
  const [cards, setCards] = (0, import_react3.useState)([]);
  const [busy, setBusy] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)("");
  const [notice, setNotice] = (0, import_react3.useState)("");
  const [answer, setAnswer] = (0, import_react3.useState)("");
  const [seed, setSeed] = (0, import_react3.useState)("");
  const [mode, setMode] = (0, import_react3.useState)("coach");
  const [revealText, setRevealText] = (0, import_react3.useState)("");
  const [imageStates, setImageStates] = (0, import_react3.useState)({});
  const [visualConfirmed, setVisualConfirmed] = (0, import_react3.useState)(false);
  const [profileDraft, setProfileDraft] = (0, import_react3.useState)({ name: "", goal: "", daily_minutes: 30, baseline: "" });
  const [path, setPath] = (0, import_react3.useState)("");
  const [query, setQuery] = (0, import_react3.useState)("");
  const [url, setUrl] = (0, import_react3.useState)("");
  const [materialResult, setMaterialResult] = (0, import_react3.useState)(null);
  const [zhenti, setZhenti] = (0, import_react3.useState)(null);
  const [paperQ, setPaperQ] = (0, import_react3.useState)(null);
  const [quiz, setQuiz] = (0, import_react3.useState)(null);
  const [quizReport, setQuizReport] = (0, import_react3.useState)(null);
  const [mixSubject, setMixSubject] = (0, import_react3.useState)("\u884C\u6D4B");
  const [mixSkill, setMixSkill] = (0, import_react3.useState)("");
  const [mixCount, setMixCount] = (0, import_react3.useState)(10);
  const active = (0, import_react3.useRef)(true);
  const controller = (0, import_react3.useRef)(null);
  const running = (0, import_react3.useRef)(false);
  const submission = (0, import_react3.useRef)(null);
  const languageSave = (0, import_react3.useRef)(Promise.resolve());
  const languageAbort = (0, import_react3.useRef)(null);
  (0, import_react3.useEffect)(() => {
    const Observer = globalThis.MutationObserver || document.defaultView?.MutationObserver;
    if (!Observer) return;
    const observer = new Observer(() => setHostLanguage(detectLanguage()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
  (0, import_react3.useEffect)(() => {
    if (!languageReady || !cwd) return;
    const aborter = languageAbort.current || new AbortController();
    languageAbort.current = aborter;
    languageSave.current = languageSave.current.catch(() => {
    }).then(() => {
      if (!active.current || aborter.signal.aborted) return;
      return studentAction(cwd, "language_settings", { language: languageMode, resolved_language: language }, aborter.signal);
    }).catch((e) => {
      if (active.current && e.name !== "AbortError") setError(e.message);
    });
  }, [languageMode, language, languageReady, cwd]);
  async function refresh(signal, exerciseId) {
    const [nextOverview, nextStudent, nextSources, nextQuiz] = await Promise.all([
      studentAction(cwd, "overview", {}, signal),
      studentAction(cwd, "student_state", exerciseId ? { exercise_id: exerciseId } : {}, signal),
      studentAction(cwd, "list_sources", {}, signal),
      studentAction(cwd, "zhenti_quiz_state", {}, signal)
    ]);
    if (!active.current) return;
    setOverview(nextOverview);
    setStudent(nextStudent);
    setSources(items(nextSources));
    setQuiz(nextQuiz);
    return { nextOverview, nextStudent };
  }
  (0, import_react3.useEffect)(() => {
    active.current = true;
    if (!cwd) return () => {
      active.current = false;
    };
    const aborter = new AbortController();
    controller.current = aborter;
    setBusy(true);
    Promise.all([refresh(aborter.signal), studentAction(cwd, "language_settings", {}, aborter.signal)]).then(([result, settings]) => {
      if (!active.current || !result) return;
      const profile2 = result.nextOverview.learning_profile || result.nextStudent.learning_profile;
      if (profile2) setProfileDraft(profile2);
      setLanguageMode(["zh", "en", "auto"].includes(settings.language) ? settings.language : "zh");
      setHostLanguage(detectLanguage());
      setLanguageReady(true);
    }).catch((e) => {
      if (e.name !== "AbortError" && active.current) setError(e.message);
    }).finally(() => {
      if (active.current) setBusy(false);
    });
    return () => {
      active.current = false;
      aborter.abort();
      controller.current?.abort();
      languageAbort.current?.abort();
    };
  }, [cwd]);
  async function run(task) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const aborter = new AbortController();
    controller.current = aborter;
    try {
      await task(aborter.signal);
    } catch (e) {
      if (e.name !== "AbortError" && active.current) setError(e.message);
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }
  const exercise = student?.exercise || overview?.current_exercise;
  const attempts = student?.attempts || [];
  const question = exercise?.question;
  const pending = attempts.some((a) => a.status === "pending");
  const profile = overview?.learning_profile || student?.learning_profile;
  const subjects = new Set((profile?.subjects || []).map((subject) => subject.normalize("NFKC").trim().toLowerCase()));
  const choices = (overview?.seed_choices || []).filter((item) => subjects.has(String(item.subject || "").normalize("NFKC").trim().toLowerCase()));
  (0, import_react3.useEffect)(() => {
    setSeed("");
  }, [profile?.id]);
  const imageInfo = imageRequirements(question, exercise?.materials);
  const visualRequired = Boolean(question?.visual_required || imageInfo.urls.length || imageInfo.unsupported);
  const visualsLoaded = !imageInfo.unsupported && question?.visual_supported !== false && imageInfo.urls.length > 0 && imageInfo.urls.every((url2) => imageStates[url2] === "loaded");
  const visualBlocked = visualRequired && (!visualsLoaded || !visualConfirmed);
  const onAssetState = (0, import_react3.useCallback)((url2, state) => setImageStates((previous) => previous[url2] === state ? previous : { ...previous, [url2]: state }), []);
  (0, import_react3.useEffect)(() => {
    setAnswer("");
    setRevealText("");
    setVisualConfirmed(false);
    submission.current = null;
  }, [exercise?.id]);
  const pendingRef = (0, import_react3.useRef)(false);
  (0, import_react3.useEffect)(() => {
    pendingRef.current = pending;
  }, [pending]);
  (0, import_react3.useEffect)(() => {
    if (!cwd || !pending || !exercise?.id) return;
    const aborter = new AbortController();
    const exerciseId = exercise.id;
    let inFlight = false;
    const timer = setInterval(() => {
      if (!active.current || document.hidden || inFlight || running.current) return;
      inFlight = true;
      studentAction(cwd, "student_state", { exercise_id: exerciseId }, aborter.signal).then((state) => {
        if (!active.current || aborter.signal.aborted || state.attempts?.some((attempt) => attempt.status === "pending")) return;
        setStudent(state);
        setNotice("\u6279\u6539\u5DF2\u5B8C\u6210\uFF0C\u53CD\u9988\u5DF2\u66F4\u65B0\u3002");
      }).catch(() => {
      }).finally(() => {
        inFlight = false;
      });
    }, 15e3);
    return () => {
      clearInterval(timer);
      aborter.abort();
    };
  }, [cwd, pending, exercise?.id]);
  (0, import_react3.useEffect)(() => {
    const onVisible = () => {
      if (!document.hidden && active.current && cwd && pendingRef.current) run((signal) => refresh(signal));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [cwd]);
  async function startPractice(id) {
    await run(async (signal) => {
      await studentAction(cwd, "start_practice", { seed_id: id, mode }, signal);
      if (!active.current) return;
      setAnswer("");
      setRevealText("");
      submission.current = null;
      await refresh(signal);
    });
  }
  async function submit(event) {
    event.preventDefault();
    if (!answer.trim() || !exercise || visualBlocked) return;
    await run(async (signal) => {
      const signature = `${exercise.id}:${answer}`;
      if (submission.current?.signature !== signature) submission.current = { signature, id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}` };
      const result = await studentAction(cwd, "submit_answer", { exercise_id: exercise.id, answer, submission_id: submission.current.id, expected_version: exercise.version, visual_confirmed: visualRequired && visualsLoaded && visualConfirmed }, signal);
      await refresh(signal, exercise.id);
      if (active.current) setNotice(result.status === "pending" ? "\u7B54\u6848\u5DF2\u4FDD\u5B58\u3002\u70B9\u51FB\u201C\u8BF7\u5BFC\u5E08\u6279\u6539\u201D\u590D\u5236\u8BF7\u6C42\uFF0C\u518D\u56DE\u804A\u5929\u7C98\u8D34\u53D1\u9001\u3002" : "\u4F5C\u7B54\u5DF2\u8BB0\u5F55\uFF0C\u4E0B\u9762\u53EF\u67E5\u770B\u53CD\u9988\u3002");
    });
  }
  async function copyToChat(request) {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(request);
        copied = true;
      }
    } catch {
    }
    setNotice(copied ? "\u8BF7\u6C42\u5DF2\u590D\u5236\u3002\u5DF2\u5207\u56DE\u804A\u5929\uFF0C\u7C98\u8D34\u5E76\u53D1\u9001\u5373\u53EF\u3002" : `\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236\uFF1A\u201C${request}\u201D`);
    if (copied) openChat?.();
  }
  async function requestGrading() {
    const attempt = [...attempts].reverse().find((item) => item.status === "pending");
    if (exercise && attempt) await copyToChat(gradingRequest(exercise.id, attempt.id, language));
  }
  async function requestRubric() {
    if (!exercise || attempts.length) return;
    const request = language === "en" ? `Please get TutorLoop exercise_id="${exercise.id}" with tutor_get_context. Before I answer, prepare a question-specific rubric using the source evidence and teacher reference. Save it with tutor_prepare_rubric and the latest expected_version. Do not reveal the reference answer or rubric points to me. If evidence is insufficient, keep qualitative feedback.` : `\u8BF7\u7528 tutor_get_context \u8BFB\u53D6 exercise_id="${exercise.id}"\u3002\u5728\u6211\u4F5C\u7B54\u524D\uFF0C\u6839\u636E\u9898\u76EE\u3001\u6750\u6599\u548C\u6559\u5E08\u53C2\u8003\u5236\u5B9A\u9898\u76EE\u7279\u5B9A\u7684\u5206\u9879\u91CF\u8868\uFF0C\u7528 tutor_prepare_rubric \u548C\u6700\u65B0 expected_version \u4FDD\u5B58\u3002\u4E0D\u8981\u5411\u6211\u900F\u9732\u53C2\u8003\u7B54\u6848\u6216\u8BC4\u5206\u8981\u70B9\uFF1B\u4F9D\u636E\u4E0D\u8DB3\u5C31\u4FDD\u7559\u5B9A\u6027\u53CD\u9988\u3002`;
    await copyToChat(request);
  }
  async function reveal(kind) {
    await run(async (signal) => {
      const result = await studentAction(cwd, "reveal", { exercise_id: exercise.id, kind }, signal);
      if (active.current) setRevealText(String(value(result) ?? ""));
      await refresh(signal);
    });
  }
  async function loadCards() {
    setTab("\u65B9\u6CD5");
    if (!cards.length) await run(async (signal) => {
      const result = await studentAction(cwd, "method_cards", {}, signal);
      if (active.current) setCards(result.cards || items(result));
    });
  }
  async function saveProfile(event, preset) {
    event?.preventDefault();
    await run(async (signal) => {
      const payload = preset ? { preset } : { name: profileDraft.name, goal: profileDraft.goal, daily_minutes: Number(profileDraft.daily_minutes), baseline: profileDraft.baseline };
      const result = await studentAction(cwd, "set_profile", payload, signal);
      if (active.current && result.learning_profile) setProfileDraft(result.learning_profile);
      await refresh(signal);
      if (active.current) setNotice("\u5B66\u4E60\u76EE\u6807\u5DF2\u4FDD\u5B58\uFF1B\u5DF2\u5F00\u59CB\u7684\u7EC3\u4E60\u4FDD\u7559\u539F\u6765\u7684\u5B66\u4E60\u6863\u6848\u3002");
    });
  }
  async function materialAction(action, payload) {
    await run(async (signal) => {
      const result = await studentAction(cwd, action, payload, signal);
      if (active.current) {
        setMaterialResult(result);
        setNotice(`\u8D44\u6599\u5904\u7406\u5B8C\u6210\uFF0C\u65B0\u589E ${result.added_chunks ?? 0} \u4E2A\u7247\u6BB5\u3002\u8BF7\u6838\u5BF9\u6765\u6E90\u548C\u5B8C\u6574\u6027\u3002`);
      }
      await refresh(signal);
    });
  }
  const [zhentiPaperId, setZhentiPaperId] = (0, import_react3.useState)("");
  const [zhentiQSeed, setZhentiQSeed] = (0, import_react3.useState)("");
  async function loadZhenti() {
    if (zhenti) return;
    await run(async (signal) => {
      const result = await studentAction(cwd, "zhenti_papers", {}, signal);
      if (active.current) setZhenti(result);
    });
  }
  async function openPaperQuestions(paperId) {
    setZhentiQSeed("");
    if (!paperId) {
      setPaperQ(null);
      return;
    }
    await run(async (signal) => {
      const result = await studentAction(cwd, "zhenti_paper", { paper_id: Number(paperId) }, signal);
      if (active.current) setPaperQ(result);
    });
  }
  async function quizAction(action, payload = {}, done) {
    await run(async (signal) => {
      const result = await studentAction(cwd, action, payload, signal);
      if (!active.current) return;
      setQuiz(result.finished && result.report ? { ...result, report: result.report } : result);
      if (result.finished) setQuizReport(result.report || null);
      if (result.finished && !result.report) {
        const report = await studentAction(cwd, "zhenti_report", {}, signal);
        if (active.current) setQuizReport(report);
      }
      done?.(result);
      await refresh(signal);
    });
  }
  async function openExercise(exerciseId) {
    await run((signal) => refresh(signal, exerciseId));
  }
  return localize(/* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-panel", "data-dsh-plugin": "tutorloop", "data-dsh-part": "conversation-view", lang: language === "zh" ? "zh-CN" : "en", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-content", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "tutorloop-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { children: "TutorLoop" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u4E00\u6B21\u89E3\u51B3\u4E00\u4E2A\u95EE\u9898\uFF0C\u7EC3\u4E60\u540E\u518D\u9A8C\u8BC1\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { "aria-label": "Language / \u8BED\u8A00", disabled: !languageReady || !cwd, value: languageMode, onChange: (e) => setLanguageMode(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "zh", children: "\u4E2D\u6587" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "en", children: "English" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "auto", children: "\u8DDF\u968F DSH" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !cwd, onClick: () => run((signal) => refresh(signal)), children: "\u5237\u65B0\u8BB0\u5F55" })
      ] })
    ] }),
    !cwd ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-notice", children: "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5E26\u5DE5\u4F5C\u76EE\u5F55\u7684\u4F1A\u8BDD\uFF0CTutorLoop \u4F1A\u5728\u8BE5\u5DE5\u4F5C\u533A\u4FDD\u5B58\u5B66\u4E60\u8BB0\u5F55\u3002" }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      profile && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { "data-tutorloop-content": true, children: profile.name }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-tutorloop-content": true, children: profile.goal }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "tutorloop-badge", children: [
          "\u6BCF\u5929 ",
          profile.daily_minutes,
          " \u5206\u949F"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "tutorloop-badge", children: [
          overview?.attempts ?? 0,
          " \u6B21\u8BB0\u5F55 \xB7 ",
          overview?.sources ?? 0,
          " \u4E2A\u8D44\u6599\u7247\u6BB5"
        ] })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { role: "alert", className: "tutorloop-error", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: error }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("summary", { children: "\u9996\u6B21\u4F7F\u7528\u4E0E\u8FD0\u884C\u5E2E\u52A9" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u53EA\u9700\u521D\u59CB\u5316\u4E00\u6B21\u8FD0\u884C\u73AF\u5883\uFF0C\u7136\u540E\u5237\u65B0\u6216\u91CD\u542F DSH\u3002\u65E0\u9700\u542F\u52A8 Streamlit\uFF0C\u4E5F\u4E0D\u5FC5\u53E6\u914D\u6A21\u578B\u5BC6\u94A5\u6216\u5F3A\u5236\u586B\u5199 Python \u8DEF\u5F84\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            "\u521D\u59CB\u5316\uFF1A",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "dsh-tutorloop setup" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            "\u6E90\u7801\u76EE\u5F55\u4E5F\u53EF\u8FD0\u884C\uFF1A",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { children: "node scripts/cli.mjs setup" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u5982\u679C\u5DE5\u4F5C\u533A\u5C1A\u672A\u786E\u8BA4\uFF0C\u8BF7\u5148\u5728\u5F53\u524D\u4F1A\u8BDD\u53D1\u9001\u4E00\u6761\u804A\u5929\u6D88\u606F\uFF0C\u518D\u5237\u65B0\u9762\u677F\u3002" })
        ] })
      ] }),
      notice && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "status", className: "tutorloop-notice", children: notice }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("nav", { className: "tutorloop-tabs", "aria-label": "\u5B66\u4E60\u9762\u677F", children: ["\u7EC3\u4E60", "\u8D44\u6599", "\u65B9\u6CD5", "\u76EE\u6807"].map((name) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { "aria-selected": tab === name, disabled: busy, onClick: () => name === "\u65B9\u6CD5" ? loadCards() : setTab(name), children: name }, name)) }),
      busy && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "status", className: "tutorloop-muted", children: "\u6B63\u5728\u5904\u7406\u2026" }),
      tab === "\u7EC3\u4E60" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u5F00\u59CB\u4E00\u4E2A\u5C0F\u4EFB\u52A1" }),
          choices.length || overview?.workspace_choices?.length ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u7EC3\u4E60",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { value: seed, onChange: (e) => setSeed(e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: "\u8BF7\u9009\u62E9\u4E00\u9898" }),
                Boolean(overview?.workspace_choices?.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("optgroup", { label: "\u672C\u5DE5\u4F5C\u533A\uFF08\u5BFC\u5E08\u521B\u5EFA\uFF09", children: overview.workspace_choices.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: item.id, children: [
                  item.skill,
                  " \xB7 ",
                  String(item.stem || "").slice(0, 24)
                ] }, item.id)) }),
                Boolean(choices.length) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("optgroup", { label: "\u5185\u7F6E\u793A\u4F8B", children: choices.map((item) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: item.id, children: [
                  item.subject,
                  " \xB7 ",
                  item.skill
                ] }, item.id)) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u65B9\u5F0F",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { value: mode, onChange: (e) => setMode(e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "coach", children: "\u966A\u7EC3\uFF1A\u53EF\u63D0\u793A\u4E0E\u793A\u8303" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "exam", children: "\u81EA\u6D4B\uFF1A\u4EA4\u5377\u540E\u8BB2\u89E3" })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "tutorloop-primary", disabled: busy || !seed || pending, onClick: () => startPractice(seed), children: "\u5F00\u59CB\u7EC3\u4E60" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u8FD8\u6CA1\u6709\u7EC3\u4E60\u3002\u53EF\u4EE5\u56DE\u5230\u804A\u5929\uFF0C\u8BA9 DSH \u6839\u636E\u4F60\u7684\u5B66\u4E60\u76EE\u6807\u4E0E\u5DF2\u6709\u8D44\u6599\u521B\u5EFA\u4E00\u9898\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u4EC5\u663E\u793A\u4E0E\u6863\u6848\u79D1\u76EE\u5339\u914D\u7684\u5185\u7F6E\u793A\u4F8B\uFF1B\u5F53\u524D\u4E3B\u9898\u7684\u7EC3\u4E60\u8BF7\u5BFC\u5E08\u57FA\u4E8E\u8D44\u6599\u521B\u5EFA\uFF0C\u968F\u540E\u51FA\u73B0\u5728\u201C\u672C\u5DE5\u4F5C\u533A\u201D\u5206\u7EC4\u3002\u81EA\u7F16\u4E0E AI \u7EC3\u4E60\u5747\u9700\u6838\u5BF9\u3002" })
        ] }),
        quiz?.active && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", "aria-label": "\u6574\u5377\u8FDB\u884C\u4E2D", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: quiz.title || "\u6574\u5377\u8FDB\u884C\u4E2D" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "tutorloop-badge", children: [
              "\u7B2C ",
              Math.min((quiz.index ?? 0) + 1, quiz.total ?? 0),
              " / ",
              quiz.total,
              " \u9898"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "tutorloop-primary", disabled: busy || quiz.finished, onClick: () => quizAction("zhenti_next"), children: quiz.finished ? "\u5DF2\u5B8C\u6210" : "\u4E0B\u4E00\u9898 \u2192" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: () => quizAction("zhenti_quit", {}, () => setQuiz(null)), children: "\u7ED3\u675F\u5E76\u4FDD\u7559\u8BB0\u5F55" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: () => quizAction("zhenti_report", {}, (r) => setQuizReport(r)), children: "\u67E5\u770B\u62A5\u544A" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u9010\u9898\u4F5C\u7B54\u540E\u70B9\u201C\u4E0B\u4E00\u9898\u201D\uFF1B\u5355\u9009\u9898\u63D0\u4EA4\u5373\u81EA\u52A8\u5224\u5206\uFF0C\u4E3B\u89C2\u9898\u6309\u4E00\u952E\u6279\u6539\u6D41\u7A0B\u3002\u5B8C\u6210\u540E\u62A5\u544A\u7ED9\u51FA\u6B63\u786E\u7387\u4E0E\u9519\u9898\u6E05\u5355\u3002" })
        ] }),
        quizReport && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PaperReport, { report: quizReport, language, busy, onOpenExercise: openExercise }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", "aria-label": "\u771F\u9898\u4E0E\u6574\u5377", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u771F\u9898\u4E0E\u6574\u5377" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !cwd, onClick: loadZhenti, children: "\u8F7D\u5165\u771F\u9898\u5217\u8868" }),
            zhenti && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "tutorloop-muted", children: [
              zhenti.papers?.length ?? 0,
              " \u5957\u5377\u53EF\u9009"
            ] })
          ] }),
          zhenti && (zhenti.papers?.length ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u8BD5\u5377",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { value: zhentiPaperId, disabled: busy, onChange: (e) => {
                setZhentiPaperId(e.target.value);
                openPaperQuestions(e.target.value);
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: "\u8BF7\u9009\u62E9\u8BD5\u5377" }),
                (zhenti.papers || []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: p.paper_id, children: [
                  p.subject,
                  "\xB7",
                  p.kind === "\u771F\u9898\u5377" ? "\u771F\u9898" : "\u6A21\u8003",
                  "\xB7",
                  p.year || "",
                  " ",
                  p.name.slice(0, 26),
                  "\uFF08",
                  p.count,
                  "\u9898\uFF09"
                ] }, p.paper_id))
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "tutorloop-primary", disabled: busy || !zhentiPaperId, onClick: () => {
                setQuizReport(null);
                quizAction("zhenti_start_quiz", { paper_id: Number(zhentiPaperId), mode });
              }, children: "\u5F00\u59CB\u6574\u5377" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "tutorloop-muted", children: "\u6574\u5377\u9010\u9898\u4F5C\u7B54\uFF0C\u884C\u6D4B\u5355\u9009\u81EA\u52A8\u5224\u5206\u3002" })
            ] }),
            paperQ && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u9898\u76EE",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { value: zhentiQSeed, disabled: busy, onChange: (e) => setZhentiQSeed(e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: "", children: [
                  "\u8BF7\u9009\u62E9\u4E00\u9898\uFF08\u5171 ",
                  paperQ.questions.length,
                  " \u9898\uFF09"
                ] }),
                paperQ.questions.map((q) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: q.seed, disabled: !q.ok, children: [
                  q.no,
                  ". ",
                  q.skill,
                  "\uFF08",
                  q.t === "single" ? "\u5355\u9009" : "\u4E3B\u89C2",
                  "\uFF09"
                ] }, q.seed))
              ] })
            ] }),
            zhentiQSeed && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-row", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || pending, onClick: () => startPractice(zhentiQSeed), children: "\u7EC3\u4E60\u8FD9\u9898" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { "aria-label": "\u7EC4\u5377\u79D1\u76EE", value: mixSubject, onChange: (e) => {
                setMixSubject(e.target.value);
                setMixSkill("");
              }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "\u884C\u6D4B", children: "\u884C\u6D4B" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "\u7533\u8BBA", children: "\u7533\u8BBA" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("select", { "aria-label": "\u7EC4\u5377\u8003\u70B9", value: mixSkill, onChange: (e) => setMixSkill(e.target.value), children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "", children: "\u5168\u90E8\u8003\u70B9" }),
                (zhenti.skills?.[mixSubject] || []).map((s) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: s, children: s }, s))
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { "aria-label": "\u62BD\u9898\u6570\u91CF", type: "number", min: "1", max: "50", value: mixCount, onChange: (e) => setMixCount(e.target.value), style: { width: 72 } }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: () => {
                setQuizReport(null);
                quizAction("zhenti_start_quiz", { subject: mixSubject, skill: mixSkill || null, count: Number(mixCount) || 10, mode });
              }, children: "\u968F\u673A\u5F00\u7EC3" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u9898\u76EE\u6765\u81EA\u5DE5\u4F5C\u533A\u5DF2\u5BFC\u5165\u7684\u771F\u9898\u89E3\u6790\u6587\u4EF6\uFF1B\u9009\u9879\u4E0E\u7B54\u6848\u5DF2\u6838\u9A8C\u5BF9\u9F50\uFF0C\u673A\u6784\u89E3\u6790\u4EC5\u4F9B\u53C2\u8003\u3002" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u6B64\u5DE5\u4F5C\u533A\u6CA1\u6709\u517C\u5BB9\u7684\u672C\u5730\u9898\u5E93\u3002\u4F60\u53EF\u4EE5\u4F7F\u7528\u5DF2\u6709\u8D44\u6599\uFF0C\u8BF7\u5BFC\u5E08\u6309\u5F53\u524D\u5B66\u4E60\u76EE\u6807\u521B\u5EFA\u7EC3\u4E60\u3002" }))
        ] }),
        question && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", "aria-label": "\u5F53\u524D\u7EC3\u4E60", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: question.skill || question.subject || "\u5F53\u524D\u7EC3\u4E60" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "tutorloop-badge", children: exercise.mode === "exam" ? "\u81EA\u6D4B" : "\u966A\u7EC3" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(MaterialPassages, { materials: exercise.materials, language, onAssetState }),
          !exercise.materials?.length && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "tutorloop-material", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RichContent, { blocks: question.material_blocks, text: question.material, onAssetState, language }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RichContent, { blocks: question.stem_blocks, text: question.stem, onAssetState, language }) }) }),
          question.question_type !== "single_choice" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { children: [
            "\u4E0D\u8D85\u8FC7 ",
            question.word_limit,
            question.length_unit === "words" ? " \u4E2A\u8BCD" : " \u5B57"
          ] }),
          question.rubric_status === "uncalibrated" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-notice", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u672C\u9898\u5C1A\u65E0\u786E\u8BA4\u7684\u5206\u9879\u91CF\u8868\uFF0C\u53EF\u5148\u7EC3\u4E60\u5E76\u83B7\u5F97\u5B9A\u6027\u53CD\u9988\u3002" }),
            !attempts.length && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: requestRubric, children: "\u8BF7\u5BFC\u5E08\u51C6\u5907\u8BC4\u5206\u6807\u51C6" })
          ] }),
          visualRequired && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-notice", children: [
            imageInfo.unsupported || question.visual_supported === false ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "alert", children: "\u672C\u9898\u542B\u6682\u4E0D\u652F\u6301\u7684\u56FE\u50CF\uFF0C\u8BF7\u56DE\u770B\u539F\u4EF6\uFF1B\u5F53\u524D\u4E0D\u80FD\u6B63\u5E38\u4EA4\u5377\u3002" }) : imageInfo.urls.some((url2) => imageStates[url2] === "error") ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { role: "alert", children: "\u56FE\u7247\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u5E76\u91CD\u65B0\u6253\u5F00\u7EC3\u4E60\u3002\u56FE\u7247\u4E0D\u5B8C\u6574\u65F6\u4E0D\u80FD\u4EA4\u5377\u3002" }) : !visualsLoaded ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u6B63\u5728\u52A0\u8F7D\u9898\u76EE\u56FE\u50CF\uFF0C\u5B8C\u6210\u540E\u8BF7\u786E\u8BA4\u5185\u5BB9\u5B8C\u6574\u3002" }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "tutorloop-option", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "checkbox", checked: visualConfirmed, disabled: !visualsLoaded || busy || pending, onChange: (event) => setVisualConfirmed(event.target.checked) }),
              "\u6211\u5DF2\u770B\u6E05\u9898\u5E72\u3001\u6750\u6599\u548C\u9009\u9879\u4E2D\u7684\u5168\u90E8\u56FE\u50CF"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: submit, children: [
            question.question_type === "single_choice" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("fieldset", { disabled: busy || pending, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("legend", { children: "\u8BF7\u9009\u62E9\u4E00\u4E2A\u9009\u9879" }),
              (question.options || []).map((option) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "tutorloop-option", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "radio", name: `answer-${exercise.id}`, value: option.id, checked: answer === option.id, onChange: (e) => setAnswer(e.target.value) }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
                  option.id,
                  " \xB7 ",
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RichContent, { blocks: option.blocks, text: option.text, onAssetState, language })
                ] })
              ] }, option.id))
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u4F60\u7684\u7B54\u6848",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { value: answer, disabled: busy || pending, onChange: (e) => setAnswer(e.target.value), placeholder: "\u7528\u81EA\u5DF1\u7684\u8BDD\u5199\u51FA\u601D\u8DEF\u2026" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "submit", className: "tutorloop-primary", disabled: busy || pending || !answer.trim() || visualBlocked, children: "\u4FDD\u5B58\u5E76\u63D0\u4EA4" }),
              exercise.mode !== "exam" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", disabled: busy || pending, onClick: () => reveal("hint"), children: "\u7ED9\u4E00\u4E2A\u63D0\u793A" }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", disabled: busy || pending, onClick: () => reveal("answer"), children: "\u770B\u793A\u8303" })
              ] })
            ] })
          ] }),
          revealText && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-notice", children: [
            revealText,
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "\u672C\u6B21\u5DF2\u767B\u8BB0\u4F7F\u7528\u8F85\u52A9\uFF1B\u4E0B\u4E00\u9898\u518D\u9A8C\u8BC1\u72EC\u7ACB\u5B8C\u6210\u3002" }) })
          ] }),
          pending && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-notice", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: "\u8FD9\u4EFD\u4E3B\u89C2\u7B54\u6848\u5F85\u6279\u6539\u3002\u70B9\u51FB\u4E0B\u65B9\u6309\u94AE\u540E\uFF0C\u5728\u804A\u5929\u91CC\u7C98\u8D34\u53D1\u9001\u5373\u53EF\u6279\u6539\u3002" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { className: "tutorloop-primary", disabled: busy, onClick: requestGrading, children: "\u8BF7\u5BFC\u5E08\u6279\u6539\uFF08\u590D\u5236\u8BF7\u6C42\uFF09" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, onClick: () => run((signal) => refresh(signal, exercise.id)), children: "\u6211\u5DF2\u53D1\u9001\uFF0C\u5237\u65B0\u6279\u6539" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "\u9762\u677F\u4E0D\u4F1A\u53E6\u5F00\u6A21\u578B\u8C03\u7528\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u5F85\u6279\u6539\u8BB0\u4E3A\u96F6\u5206\u3002\u6279\u6539\u5B8C\u6210\u540E\u8FD9\u91CC\u4F1A\u81EA\u52A8\u66F4\u65B0\u3002" }) })
          ] })
        ] }, exercise.id),
        attempts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u4F5C\u7B54\u8BB0\u5F55" }),
          attempts.map((attempt, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { className: "tutorloop-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h3", { children: [
              "\u7B2C ",
              index + 1,
              " \u6B21\u4F5C\u7B54 \xB7 ",
              attempt.status === "graded" ? "\u5DF2\u53CD\u9988" : "\u5F85\u6279\u6539"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-material", children: attempt.answer }),
            Boolean(attempt.assisted) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: "\u4F7F\u7528\u8FC7\u63D0\u793A\u3001\u793A\u8303\u6216\u4FEE\u6539" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Feedback, { feedback: attempt.feedback, language })
          ] }, attempt.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u5230\u671F\u590D\u4E60" }),
          overview?.due?.length ? overview.due.map((review) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: review.skill }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || pending, onClick: () => startPractice(review.seed_id), children: "\u590D\u4E60\u8FD9\u9898" })
          ] }, review.seed_id)) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u6682\u65E0\u5230\u671F\u4EFB\u52A1\u3002\u505A\u5B8C\u5E76\u590D\u76D8\u540E\uFF0C\u8FD9\u91CC\u4F1A\u51FA\u73B0\u590D\u4E60\u5B89\u6392\u3002" })
        ] })
      ] }),
      tab === "\u76EE\u6807" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u4F60\u7684\u5B66\u4E60\u76EE\u6807" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: saveProfile, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
            "\u5B66\u4E60\u540D\u79F0",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { required: true, value: profileDraft.name, onChange: (e) => setProfileDraft({ ...profileDraft, name: e.target.value }), placeholder: "\u5982\uFF1A\u82F1\u8BED\u9605\u8BFB\u3001\u56FD\u8003\u3001\u7F16\u7A0B\u57FA\u7840" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
            "\u5177\u4F53\u76EE\u6807",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { required: true, value: profileDraft.goal, onChange: (e) => setProfileDraft({ ...profileDraft, goal: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
            "\u6BCF\u5929\u53EF\u5B66\u4E60\u7684\u5206\u949F\u6570",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "number", min: "1", max: "1440", required: true, value: profileDraft.daily_minutes, onChange: (e) => setProfileDraft({ ...profileDraft, daily_minutes: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
            "\u5DF2\u6709\u57FA\u7840",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { value: profileDraft.baseline || "", onChange: (e) => setProfileDraft({ ...profileDraft, baseline: e.target.value }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, type: "submit", children: "\u4FDD\u5B58\u901A\u7528\u76EE\u6807" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy, type: "button", onClick: () => saveProfile(null, "gongkao"), children: "\u4F7F\u7528\u56FD\u8003\u526F\u7701\u7EA7\u9884\u8BBE" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "TutorLoop \u6309\u4F60\u63D0\u4F9B\u7684\u57FA\u7840\u548C\u5B9E\u9645\u4F5C\u7B54\u8C03\u6574\u6559\u5B66\uFF0C\u4E0D\u9ED8\u8BA4\u5E74\u7EA7\u6216\u80FD\u529B\u3002" })
      ] }),
      tab === "\u8D44\u6599" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u5BFC\u5165\u672C\u5730\u8D44\u6599" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
            "\u5F53\u524D\u5DE5\u4F5C\u533A\u5185\u7684\u6587\u4EF6\u6216\u6587\u4EF6\u5939\u8DEF\u5F84",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { value: path, onChange: (e) => setPath(e.target.value), placeholder: "\u5982\uFF1Amaterials/lesson.pdf" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "tutorloop-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !path.trim(), onClick: () => materialAction("import_file", { path }), children: "\u5BFC\u5165\u6587\u4EF6" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !path.trim(), onClick: () => materialAction("import_folder", { path }), children: "\u5BFC\u5165\u6587\u4EF6\u5939" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u652F\u6301\u7684\u6587\u4EF6\u7531\u672C\u5730\u5BFC\u5165\u5668\u68C0\u67E5\u3002\u626B\u63CF\u4EF6\u3001\u56FE\u5F62\u4E0E\u590D\u6742\u8868\u683C\u9700\u8981\u56DE\u770B\u539F\u4EF6\uFF0C\u673A\u6784\u89E3\u6790\u4E0D\u662F\u5B98\u65B9\u7B54\u6848\u3002" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u67E5\u627E\u516C\u5F00\u8D44\u6599" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: (e) => {
            e.preventDefault();
            materialAction("search_materials", { query, limit: 3 });
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u641C\u7D22\u8BCD",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { value: query, onChange: (e) => setQuery(e.target.value) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !query.trim(), children: "\u641C\u7D22\u5E76\u6536\u5F55" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: (e) => {
            e.preventDefault();
            materialAction("fetch_material", { url });
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { children: [
              "\u539F\u6587 URL",
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "url", value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://\u2026" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: busy || !url.trim(), children: "\u8BFB\u53D6\u7F51\u9875" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u641C\u7D22\u6458\u8981\u4E0E\u7F51\u9875\u5168\u6587\u4F1A\u5206\u522B\u6807\u8BB0\uFF0C\u65E0\u6CD5\u6293\u53D6\u65F6\u4E0D\u8865\u9020\u6B63\u6587\u3002" })
        ] }),
        materialResult && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: "\u672C\u6B21\u5904\u7406" }),
          (materialResult.errors || []).map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: typeof item === "string" ? item : item.message || item.error || "\u90E8\u5206\u8D44\u6599\u672A\u5BFC\u5165\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u3002" }, `error-${i}`)),
          (materialResult.statuses || []).map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: typeof item === "string" ? item : item.message || item.status }, `status-${i}`))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { children: [
            "\u5DF2\u6536\u5F55\u6765\u6E90 \xB7 ",
            overview?.sources ?? sources.length
          ] }),
          sources.length ? sources.map((source, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("article", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { children: source.title || "\u672A\u547D\u540D\u6765\u6E90" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("small", { children: [
              source.locator,
              " \xB7 ",
              source.kind === "web_snippet_only" ? "\u641C\u7D22\u6458\u8981\uFF0C\u975E\u5168\u6587" : source.kind === "synthetic_case" ? "\u81EA\u7F16\u6750\u6599" : source.kind === "web_fulltext" ? "\u7F51\u9875\u5168\u6587" : "\u672C\u5730\u6750\u6599"
            ] }) }),
            source.url && /^https?:\/\//i.test(source.url) && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("a", { href: source.url, target: "_blank", rel: "noreferrer", children: "\u67E5\u770B\u539F\u59CB\u6765\u6E90" })
          ] }, `${source.id}-${index}`)) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u8FD8\u6CA1\u6709\u6536\u5F55\u8D44\u6599\u3002\u5BFC\u5165\u4E00\u4EFD\u4E0E\u4F60\u7684\u76EE\u6807\u76F8\u5173\u7684\u6750\u6599\uFF0C\u518D\u56DE\u804A\u5929\u5F00\u59CB\u5B66\u4E60\u3002" })
        ] })
      ] }),
      tab === "\u65B9\u6CD5" && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { children: "\u628A\u65B9\u6CD5\u62C6\u6210\u4E00\u4E2A\u52A8\u4F5C" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "tutorloop-muted", children: "\u4EE5\u4E0B\u662F\u6559\u5B66\u6574\u7406\uFF0C\u4EE5\u56FD\u8003\u793A\u4F8B\u4E3A\u4E3B\uFF0C\u4E0D\u662F\u5B98\u65B9\u8BC4\u5206\u6807\u51C6\u3002" }),
        cards.map((card) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("details", { className: "tutorloop-card", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("summary", { children: [
            card.subject,
            " \xB7 ",
            card.title
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ol", { children: (card.steps || []).map((step, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("li", { children: step }, index)) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u4F8B\u5B50\uFF1A" }),
            card.example
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u5BB9\u6613\u8BEF\u5224\uFF1A" }),
            card.pitfall
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: "\u4E0B\u4E00\u6B65\uFF1A" }),
            card.next_action
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("small", { children: card.source_note })
        ] }, card.id))
      ] })
    ] })
  ] }) }), language);
}
function apply(ctx) {
  ctx.effect(() => mountStyles(), "dsh-tutorloop: native styles");
  ctx.effect(() => {
    const dispose = ctx.slots.inject("conversation.view", () => ctx.slots.register({ name: "conversation.view", id: "tutorloop", order: 30, label: () => "TutorLoop" }, (props) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ConversationTutorLoop, { ...props })));
    return () => dispose?.();
  }, "dsh-tutorloop: conversation view");
}
return module.exports;}});
