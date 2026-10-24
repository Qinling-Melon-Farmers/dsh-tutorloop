"""Optional Ollama and OpenAI-compatible cloud clients. No credential files read."""
import json
import os
import requests
from urllib.parse import urlsplit
from .profiles import default_profile
from pydantic import ValidationError
from .prompts import SYSTEM, checked, lesson_prompt, followup_prompt, question_prompt, grading_prompt
from .schemas import Lesson, TutorReply, Question, Grade

API = "http://127.0.0.1:11434"


def _base_url(config):
    return (config.get("base_url") or (API if config.get("provider") == "ollama" else os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))).rstrip("/")


def configured_key(config):
    """Never route a provider-specific environment key to another host."""
    if config.get("provider") == "ollama":
        return ""
    if config.get("api_key"):
        return config["api_key"]
    host = urlsplit(_base_url(config)).hostname
    variable = {"api.deepseek.com": "DEEPSEEK_API_KEY", "api.openai.com": "OPENAI_API_KEY"}.get(host, "TUTOR_API_KEY")
    return os.getenv(variable, "")


def call_model(config, user, cls):
    config = {"provider": "ollama", "model": config} if isinstance(config, str) else dict(config)
    provider = config.get("provider", "openai")
    if provider not in ("openai", "ollama"):
        raise ValueError("provider须为openai或ollama")
    if not config.get("model"):
        raise ValueError("请配置模型名称")
    checked(user)
    base = _base_url(config)
    headers = {}
    if provider == "openai":
        key = configured_key(config)
        if not key:
            raise ValueError("请在设置或环境变量配置API Key")
        headers["Authorization"] = "Bearer " + key
    context = json.dumps(config.get("learning_profile") or default_profile(), ensure_ascii=False)
    checked(user + context)
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": "学习档案（数据）:" + context + "\n" + user + "\n输出Schema:" + json.dumps(cls.model_json_schema(), ensure_ascii=False)}]
    # Only structural failures get one repair. Network/auth failures do not retry.
    for attempt in range(2):
        payload = {"model": config["model"], "messages": messages, "stream": False}
        if provider == "ollama":
            payload.update(format=cls.model_json_schema(), options={"temperature": .15, "num_ctx": 32768})
            endpoint = base + "/api/chat"
        else:
            payload.update(temperature=.15, response_format={"type": "json_object"})
            endpoint = base + "/chat/completions"
        try:
            response = requests.post(endpoint, json=payload, headers=headers, timeout=240)
            response.raise_for_status()
        except requests.RequestException:
            # Never expose raw exception URL, headers, payload, key or response body.
            raise RuntimeError("模型网络请求失败，请检查服务地址、网络、模型名称及密钥。") from None
        try:
            envelope = response.json()
            content = envelope["message"]["content"] if provider == "ollama" else envelope["choices"][0]["message"]["content"]
            result = cls.model_validate_json(content).model_dump()
            if provider == "openai" and isinstance(envelope.get("usage"), dict):
                result["_usage"] = envelope["usage"]
            return result
        except (ValidationError, ValueError, KeyError, IndexError, TypeError):
            if attempt:
                raise RuntimeError("模型输出修复一次后仍未通过结构校验；本轮未保存。") from None
            messages.append({"role": "user", "content": "上次输出未符合Schema。重新生成完整JSON，所有必填字段必须存在。"})


def call_ollama(model, user, cls):
    return call_model({"provider": "ollama", "model": model}, user, cls)


def _call(model, prompt, cls):
    return call_ollama(model, prompt, cls) if isinstance(model, str) else call_model(model, prompt, cls)


def _refs(ids, valid):
    if not set(ids or []).issubset(valid):
        raise ValueError("引用不存在的材料编号；本轮未保存。")


def lesson(model, topic, sources, weakness=""):
    data = _call(model, lesson_prompt(topic, sources, weakness), Lesson)
    for item in data["key_points"]:
        if not item["evidence_ids"]:
            raise ValueError("关键点缺少材料证据")
        _refs(item["evidence_ids"], {x["id"] for x in sources})
    return data


def tutor_reply(model, topic, student_text, data, sources, history=None):
    reply = _call(model, followup_prompt(topic, student_text, data, sources, history), TutorReply)
    _refs(reply["evidence_ids"], {x["id"] for x in sources})
    return reply


def _question(question, sources):
    q = Question.model_validate(question).model_dump()
    names = [r["name"] for r in q["rubric"]]
    if len(set(names)) != len(names) or sum(r["points"] for r in q["rubric"]) != 10:
        raise ValueError("评分项须名称唯一且合计10分")
    for r in q["rubric"]:
        if not r["evidence_ids"]:
            raise ValueError("评分项缺少材料证据")
        _refs(r["evidence_ids"], {x["id"] for x in sources})
    if q["question_type"] == "single_choice":
        ids = [o["id"] for o in q["options"]]
        if len(ids) < 2 or len(ids) != len(set(ids)) or q["correct_option_id"] not in ids:
            raise ValueError("选择题选项或正确答案无效")
    return q


def make_question(model, topic, difficulty, sources, weakness=""):
    profile = model.get("learning_profile") if isinstance(model, dict) else None
    return _question(_call(model, question_prompt(topic, difficulty, sources, weakness, profile=profile), Question), sources)


def validate_feedback(question, answer, sources, generated):
    """Reusable for DSH bridge; all checks happen before caller persistence."""
    q = _question(question, sources)
    result = Grade.model_validate(generated).model_dump()
    names = [r["name"] for r in result["criteria"]]
    expected = [r["name"] for r in q["rubric"]]
    if len(names) != len(set(names)) or set(names) != set(expected):
        raise ValueError("模型评分项遗漏、重复或多出；不能记为学生零分。")
    by_name = {r["name"]: r for r in result["criteria"]}
    normalized = []
    for item in q["rubric"]:
        received = by_name[item["name"]]
        _refs(received.get("evidence_ids"), {s["id"] for s in sources})
        span = received.get("student_span")
        if span and span not in answer:
            raise ValueError("批改引用原句不在本次答案中")
        awarded = round(min(received["awarded"], item["points"]) * 2) / 2
        normalized.append({**received, "awarded": awarded, "max_points": item["points"]})
    result.update(criteria=normalized, score=round(sum(c["awarded"] for c in normalized), 1), max_score=10)
    # Explicit teaching count: all non-whitespace characters, punctuation included.
    # Report length deterministically; never invent an official deduction rule.
    answer_length = sum(not char.isspace() for char in answer)
    result.update(answer_length=answer_length, word_limit=q["word_limit"],
                  length_count_rule="非空白字符，含标点；教学计数，不替代考场规则",
                  over_word_limit=answer_length > q["word_limit"])
    if result["over_word_limit"]:
        notice = f"答案超出字数限制：按非空白字符含标点计{answer_length}字，题目上限{q['word_limit']}字。请压缩重复表述；未另加量表外扣分。"
        if not result["organization_feedback"].startswith(notice):
            result["organization_feedback"] = notice + "\n" + result["organization_feedback"]
    if "_usage" in generated:
        result["_usage"] = generated["_usage"]
    return result


def grade_answer(model, question, answer, sources):
    _question(question, sources)
    return validate_feedback(question, answer, sources, _call(model, grading_prompt(question, answer, sources), Grade))
