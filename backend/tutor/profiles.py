"""Learning context only; persistence belongs to the application."""
from uuid import uuid4


def default_profile():
    return {"id": "generic_unconfigured", "name": "我的学习", "goal": "根据本轮资料确定学习目标",
            "daily_minutes": 30, "baseline": "尚未诊断，请依据当前任务和作答了解基础",
            "subjects": []}


def exam_profile():
    return {"id": "gongkao", "name": "国考副省级", "goal": "国考副省级备考",
            "daily_minutes": 30, "baseline": "尚未诊断，请依据当前任务和作答了解基础",
            "subjects": ["行测", "申论"]}


def generic_profile(name, goal, daily_minutes):
    if not isinstance(name, str) or not isinstance(goal, str) or not name.strip() or not goal.strip():
        raise ValueError("学习名称和目标不能为空")
    if len(name) > 200 or len(goal) > 2000:
        raise ValueError("学习名称限200字，目标限2000字")
    if isinstance(daily_minutes, bool) or not isinstance(daily_minutes, int) or not 1 <= daily_minutes <= 1440:
        raise ValueError("每日分钟数须为1至1440的整数")
    return {"id": "generic_" + uuid4().hex, "name": str(name).strip(),
            "goal": str(goal).strip(), "daily_minutes": daily_minutes,
            "baseline": "尚未诊断，请依据当前任务和作答了解基础", "subjects": []}
