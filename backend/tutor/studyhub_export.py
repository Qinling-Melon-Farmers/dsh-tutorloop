"""Pure StudyHub deck conversion; never writes into a StudyHub library.

Example::

    deck = export_studyhub_deck([{
        "stem": "概括材料中的问题", "material": "某企业忽视质量导致投诉。",
        "reference_answer": "质量管控不足。", "hint": "观察因果关系",
        "rubric": [{"name": "质量问题", "points": 10, "requirement": "指出质量管控不足"}]
    }], "申论概括练习")
    # json.dumps(deck, ensure_ascii=False, indent=2) -> import as a draft.
    # export_sources_markdown(questions, title) -> provenance sidecar.
"""
from __future__ import annotations


DISCLAIMER = "本题用于训练；自编题、参考答案与训练评分均非官方结论。引用材料的来源声明不等于官方试题认证。"


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _rubric(value) -> str:
    if isinstance(value, str):
        return value.strip()
    if not isinstance(value, list):
        return ""
    rows = []
    for criterion in value:
        if isinstance(criterion, dict):
            rows.append(f"{criterion.get('name', '评分要点')}（{criterion.get('points', '?')}分）：{criterion.get('requirement', criterion.get('description', ''))}")
        elif isinstance(criterion, str):
            rows.append(criterion)
    return "\n".join(rows)


def _profile(record, explicit=None):
    value = explicit if explicit is not None else record.get('learning_profile', record.get('profile', {}))
    return value if isinstance(value, dict) else {}


def _convert(question: dict, index: int, profile=None) -> dict:
    if not isinstance(question, dict):
        raise ValueError(f"第{index}题必须为对象")
    # Practice records may wrap the original question.
    q = question.get("question", question)
    if not isinstance(q, dict):
        raise ValueError(f"第{index}题缺少有效题目对象")
    # The generic StudyHub importer cannot preserve structured image blocks.
    # Reject even inconsistent old flags rather than producing a text-only exam.
    block_lists = [q.get(field) for field in ('stem_blocks', 'material_blocks', 'reference_blocks')]
    options = q.get('options') if isinstance(q.get('options'), list) else []
    materials = question.get('materials') if isinstance(question.get('materials'), list) else []
    block_lists += [option.get('blocks') for option in options if isinstance(option, dict)]
    block_lists += [material.get('blocks') for material in materials if isinstance(material, dict)]
    if q.get('visual_required') or any(isinstance(blocks, list) and any(isinstance(b, dict) and b.get('type') == 'image' for b in blocks) for blocks in block_lists):
        raise ValueError(f'第{index}题包含必要图像，StudyHub文本导出不支持图文，不能丢弃图片')
    kind = q.get("kind", q.get("question_type", q.get("type", "open")))
    aliases = {"single": "quiz", "single_choice": "quiz", "multiple_choice": "multi", "short_answer": "open", "essay": "open", "shenlun": "open"}
    kind = aliases.get(kind, kind)
    if kind == 'open' and q.get('rubric_status') == 'uncalibrated':
        raise ValueError(f'第{index}题量表尚未标定，不能导出为有分项分值的开放题')
    if kind not in {"quiz", "multi", "flashcard", "open", "cloze"}:
        raise ValueError(f"第{index}题题型不受StudyHub支持：{kind}")
    stem = _text(q.get("stem")) or _text(q.get("prompt"))
    answer = _text(q.get("reference_answer")) or _text(q.get("answer"))
    correct_id = _text(q.get("correct_option_id"))
    if not answer and kind == "quiz" and correct_id:
        matches = [option for option in q.get("options", []) if isinstance(option, dict) and str(option.get("id", "")) == correct_id]
        if len(matches) == 1:
            answer = f"{correct_id}：{_text(matches[0].get('text'))}"
    if not stem or not answer:
        raise ValueError(f"第{index}题缺少题干或已核对参考答案，不能自动补造")
    material = _text(q.get("material"))
    limit = q.get("word_limit")
    unit = q.get('length_unit', 'characters')
    if unit not in ('characters', 'words'):
        raise ValueError(f'第{index}题的长度计量单位无效')
    length_label = f'\n词数要求：{limit}词以内' if unit == 'words' else f'\n字数要求：{limit}字以内'
    selected_profile = _profile(question, profile)
    card = {"kind": kind, "topic": _text(q.get("topic")) or _text(q.get("skill")) or _text(q.get("subject")) or _text(selected_profile.get('goal')) or _text(selected_profile.get('name')) or "学习练习",
            "objective": _text(q.get("objective")) or f"完成第{index}题并按参考标准复盘",
            "prompt": (f"材料：\n{material}\n\n" if material else "") + stem + (length_label if limit else ""),
            "answer": answer,
            "hint": _text(q.get("hint")) or "先识别题目任务，再定位材料依据。",
            "explanation": (_text(q.get("explanation")) or "请结合参考答案、评分要点与材料复盘。") + "\n" + DISCLAIMER,
            "misconception": _text(q.get("misconception")) or "避免脱离材料作答或将训练评价视为官方评分。"}
    if kind == "open":
        rubric = _rubric(q.get("rubric"))
        if not rubric:
            raise ValueError(f"第{index}题缺少评分细则，不能导出开放题")
        card["rubric"] = rubric + "\n训练评分标准，非官方评分。"
    if kind in {"quiz", "multi"}:
        options = q.get("options")
        if not isinstance(options, list) or not 3 <= len(options) <= 6:
            raise ValueError(f"第{index}题必须有3–6个选项")
        clean = []
        for option in options:
            if not isinstance(option, dict):
                raise ValueError(f"第{index}题选项格式错误")
            correct = option.get("correct")
            if not isinstance(correct, bool) and kind == "quiz" and correct_id:
                correct = str(option.get("id", "")) == correct_id
            if not isinstance(correct, bool):
                raise ValueError(f"第{index}题选项必须有明确的correct布尔值")
            oid, text = str(option.get("id", "")).strip(), _text(option.get("text"))
            if not oid or not text:
                raise ValueError(f"第{index}题选项缺少id或text")
            if correct_id and kind == "quiz" and correct != (oid == correct_id):
                raise ValueError(f"第{index}题correct标记与correct_option_id冲突")
            clean.append({"id": oid, "text": text, "correct": correct,
                          "explanation": _text(option.get("explanation")) or ("参考正确选项；请核对题目来源。" if correct else "与参考答案不符；请结合材料辨析。")})
        count = sum(option["correct"] for option in clean)
        if len({o["id"] for o in clean}) != len(clean) or len({o["text"] for o in clean}) != len(clean):
            raise ValueError(f"第{index}题选项id或内容重复")
        if (kind == "quiz" and count != 1) or (kind == "multi" and not 1 <= count < len(clean)):
            raise ValueError(f"第{index}题正确选项数量不符合题型")
        card["options"] = clean
    if kind == "cloze":
        cloze = q.get("cloze")
        if not isinstance(cloze, dict) or not _text(cloze.get("text")) or not isinstance(cloze.get("answers"), list):
            raise ValueError(f"第{index}题缺少有效填空结构")
        import re
        markers = set(re.findall(r"\{\{([^{}]+)\}\}", cloze["text"]))
        answers = []
        for item in cloze["answers"]:
            if not isinstance(item, dict) or not _text(item.get("id")) or not _text(item.get("value")):
                raise ValueError(f"第{index}题填空答案格式无效")
            entry = {"id": item["id"], "value": item["value"]}
            if "accept" in item:
                if not isinstance(item["accept"], list) or not all(isinstance(s, str) for s in item["accept"]):
                    raise ValueError(f"第{index}题填空备选答案无效")
                entry["accept"] = list(item["accept"])
            answers.append(entry)
        if not markers or markers != {a["id"] for a in answers} or len(answers) != len(markers):
            raise ValueError(f"第{index}题填空标记与答案不匹配")
        card["cloze"] = {"text": cloze["text"], "answers": answers}
    # Never copy source IDs as citations: they belong to another StudyHub library.
    return card


def export_studyhub_deck(questions: list[dict], title: str, *, profile: dict | None = None) -> dict:
    """Return only fields supported by StudyHub's actual generic JSON importer.

    Raises ValueError for missing answers/rubrics instead of fabricating them.
    Import this as a draft; generic JSON does not preserve external IDs/history.
    """
    if not isinstance(questions, list) or not questions:
        raise ValueError("请至少选择一道题")
    if not _text(title):
        raise ValueError("题组标题不能为空")
    cards = [_convert(question, index, profile) for index, question in enumerate(questions, 1)]
    names = []
    for record in questions:
        q = record.get('question', record)
        selected_profile = _profile(record, profile)
        names.append(_text(selected_profile.get('name')) or _text(q.get('subject')) or '学习练习')
    course = names[0] if len(set(names)) == 1 else '学习练习'
    return {"title": title.strip(), "course": course, "folder": f'{course}（练习草稿）', "cards": cards}


def export_sources_markdown(questions: list[dict], title: str = "学习练习来源说明") -> str:
    """Provenance sidecar to download beside the deck, not a verified citation."""
    rows = [f"# {title}", "", DISCLAIMER, "",
            "题库JSON应作为草稿导入StudyHub检查；此说明不是已核验引文。请先导入原始资料，再在StudyHub中匹配原文引用。通用JSON不会保存外部ID、作答历史与自定义评分字段。", ""]
    for index, record in enumerate(questions, 1):
        q = record.get("question", record)
        origin = record.get('provenance', record.get('origin', q.get('provenance', q.get('origin', '自编/来源未提供'))))
        rows += [f"## 第{index}题", "", f"题干：{q.get('stem', q.get('prompt', ''))}", "",
                 f"来源声明（未核验）：{origin}", ""]
        if q.get("material"):
            rows += ["### 题目材料", "", str(q["material"]), ""]
        sources = record.get("sources", q.get("sources", []))
        if not isinstance(sources, list):
            sources = [sources]
        if not sources:
            rows += ["未附原始来源；不能据此认定为官方真题或官方答案。", ""]
        for source in sources:
            if isinstance(source, dict):
                rows += [f"- 来源：{source.get('title', '未命名')}；位置：{source.get('locator', '')}",
                         f"  URL：{source.get('url', '')}",
                         f"  获取时间：{source.get('fetched_at', '未记录')}；类型：{source.get('kind', '未记录')}",
                         f"  原始来源标识：{source.get('id', '')}", "", str(source.get("text", "")), ""]
            else:
                rows += [str(source), ""]
    return "\n".join(rows)
