from pydantic import BaseModel
from typing import Optional, List, Any


class IssueModel(BaseModel):
    key: str
    id: str
    summary: str
    status: str
    status_category: str
    status_color: str
    assignee: str
    assignee_avatar: str
    priority: str
    issue_type: str
    issue_type_icon: str
    story_points: Optional[float] = 0
    parent_key: Optional[str] = None
    parent_summary: Optional[str] = None
    subtasks: List[str] = []
    created: Optional[str] = None
    updated: Optional[str] = None
    due_date: Optional[str] = None
    labels: List[str] = []
    components: List[str] = []
    time_spent: Optional[int] = None
    time_estimate: Optional[int] = None
    time_original_estimate: Optional[int] = None


class SprintModel(BaseModel):
    id: int
    name: str
    state: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    complete_date: Optional[str] = None
    board_id: Optional[int] = None


class SprintStatsModel(BaseModel):
    sprint: SprintModel
    total_issues: int
    done_count: int
    in_progress_count: int
    todo_count: int
    total_story_points: float
    done_story_points: float
    completion_rate: float
    sp_completion_rate: float
    issues_by_type: dict
    issues_by_priority: dict
    issues_by_assignee: dict
    bugs_count: int
    unassigned_count: int


class RiskItem(BaseModel):
    level: str           # HIGH / MEDIUM / LOW
    category: str        # SCHEDULE / RESOURCE / QUALITY / SCOPE
    title: str
    description: str
    affected_issues: List[str]
    recommendation: str


class AIAnalysisResult(BaseModel):
    summary: str
    health_score: int    # 0-100
    risks: List[RiskItem]
    predictions: List[str]
    recommendations: List[str]
    generated_at: str


class WBSNode(BaseModel):
    id: str
    key: str
    summary: str
    issue_type: str
    status: str
    status_category: str
    assignee: str
    story_points: Optional[float] = 0
    priority: str
    children: List[Any] = []
    depth: int = 0
    progress: float = 0.0
