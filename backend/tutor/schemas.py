"""Structured outputs: the UI never parses a prose response as a rubric."""
from typing import Literal
from pydantic import BaseModel, Field


class KeyPoint(BaseModel):
    point: str
    why_it_matters: str
    evidence_ids: list[str]


class Lesson(BaseModel):
    topic: str
    overview: str
    key_points: list[KeyPoint] = Field(min_length=2, max_length=8)
    explanation: str
    worked_example: str
    check_question: str
    uncertainties: list[str]


class RubricItem(BaseModel):
    name: str
    requirement: str
    points: int = Field(ge=1, le=10)
    evidence_ids: list[str]


class ChoiceOption(BaseModel):
    id: str
    text: str


class Question(BaseModel):
    id: str = ""
    subject: str = "申论"
    skill: str = "材料提炼"
    question_type: Literal["short_answer", "single_choice"] = "short_answer"
    options: list[ChoiceOption] = Field(default_factory=list)
    correct_option_id: str | None = None
    explanation: str = ""
    difficulty: Literal["基础", "提高", "挑战"]
    material: str
    stem: str
    word_limit: int = Field(ge=1, le=1500)
    reference_answer: str
    rubric: list[RubricItem] = Field(min_length=1, max_length=12)
    hint: str = ""


class CriterionGrade(BaseModel):
    name: str
    awarded: float = Field(ge=0, le=10)
    feedback: str
    evidence_ids: list[str] | None = None
    student_span: str | None = None
    error_type: str | None = None


class Grade(BaseModel):
    criteria: list[CriterionGrade]
    strengths: list[str]
    omissions: list[str]
    unsupported_claims: list[str]
    organization_feedback: str
    improved_answer: str
    next_skill: str
    next_exercise_instruction: str


class TutorReply(BaseModel):
    explanation: str
    example: str
    guiding_question: str
    evidence_ids: list[str]
