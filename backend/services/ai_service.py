import openai
import os
import json
from datetime import datetime
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


def _get_client() -> openai.AsyncOpenAI:
    base_url = os.getenv("OPENAI_BASE_URL") or None
    api_key = os.getenv("OPENAI_API_KEY", "")
    return openai.AsyncOpenAI(api_key=api_key, base_url=base_url)


async def check_connection() -> dict:
    """LLM 연결 상태 확인"""
    api_key = os.getenv("OPENAI_API_KEY", "")
    base_url = os.getenv("OPENAI_BASE_URL") or None
    if not api_key or api_key.startswith("sk-your-"):
        return {
            "connected": False,
            "model": MODEL,
            "base_url": base_url or "https://api.openai.com/v1",
            "error": "API key not configured",
        }
    try:
        client = _get_client()
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return {
            "connected": True,
            "model": MODEL,
            "base_url": base_url or "https://api.openai.com/v1",
            "response_model": response.model,
        }
    except Exception as e:
        return {
            "connected": False,
            "model": MODEL,
            "base_url": base_url or "https://api.openai.com/v1",
            "error": str(e),
        }


def _build_sprint_analysis_prompt(sprint_stats: dict, issues: list) -> str:
    total = sprint_stats["total_issues"]
    done = sprint_stats["done_count"]
    in_progress = sprint_stats["in_progress_count"]
    todo = sprint_stats["todo_count"]
    total_sp = sprint_stats["total_story_points"]
    done_sp = sprint_stats["done_story_points"]
    comp_rate = sprint_stats["completion_rate"]
    sp_comp_rate = sprint_stats["sp_completion_rate"]
    bugs = sprint_stats["bugs_count"]
    unassigned = sprint_stats["unassigned_count"]
    sprint = sprint_stats["sprint"]

    sample = issues[:30]
    issue_list = "\n".join(
        f"- [{i['issue_type']}] {i['key']}: {i['summary']} | "
        f"상태:{i['status']} | 담당:{i['assignee']} | SP:{i['story_points']} | "
        f"우선순위:{i['priority']}"
        for i in sample
    )

    return f"""
당신은 애자일 프로젝트 관리 전문가입니다. 아래 Jira 스프린트 데이터를 분석하여 JSON 형식으로 리포트를 생성하세요.

=== 스프린트 정보 ===
스프린트명: {sprint.get('name', 'N/A')}
상태: {sprint.get('state', 'N/A')}
시작일: {sprint.get('start_date', 'N/A')}
종료일: {sprint.get('end_date', 'N/A')}

=== 현황 통계 ===
전체 이슈: {total}개
완료: {done}개 / 진행중: {in_progress}개 / 미시작: {todo}개
완료율: {comp_rate}%
스토리포인트 총계: {total_sp} / 완료: {done_sp} ({sp_comp_rate}%)
버그: {bugs}개 | 미배정 이슈: {unassigned}개

타입별: {sprint_stats['issues_by_type']}
우선순위별: {sprint_stats['issues_by_priority']}
담당자별: {sprint_stats['issues_by_assignee']}

=== 이슈 목록 (최대 30개) ===
{issue_list}

=== 분석 요청 ===
다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{{
  "summary": {{
    "health_score": 0에서 100 사이 정수,
    "overall_health": "Green 또는 Yellow 또는 Red",
    "key_insight": "핵심 인사이트 한 문장 (한국어)"
  }},
  "risks": [
    {{
      "id": "R1",
      "severity": "Critical 또는 High 또는 Medium 또는 Low",
      "category": "Schedule 또는 Resource 또는 Quality 또는 Scope 또는 Technical",
      "title": "리스크 제목 (한국어, 20자 이내)",
      "description": "리스크 상세 설명 (한국어, 100자 이내)",
      "probability": "70%",
      "affected_issues": ["ISSUE-KEY"],
      "mitigation": "완화 방안 (한국어, 80자 이내)"
    }}
  ],
  "recommendations": [
    {{
      "priority": 1,
      "impact": "High 또는 Medium 또는 Low",
      "action": "권장 조치 (한국어)",
      "rationale": "근거 설명 (한국어)"
    }}
  ],
  "sprint_forecast": {{
    "completion_probability": 0에서 100 사이 정수,
    "expected_velocity": 예상 완료 SP (숫자),
    "concern_areas": ["우려 영역 1 (한국어)", "우려 영역 2"]
  }},
  "team_insights": {{
    "bottlenecks": ["병목 1 (한국어)", "병목 2"]
  }}
}}
리스크는 최대 5개, 심각도 높은 순으로 정렬하세요.
권장사항은 최대 4개, 우선순위 순으로 정렬하세요.
"""


async def analyze_sprint(sprint_stats: dict, issues: list) -> dict:
    prompt = _build_sprint_analysis_prompt(sprint_stats, issues)

    client = _get_client()
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "당신은 애자일 스프린트 분석 전문가입니다. 항상 유효한 JSON만 반환합니다."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=2500,
        response_format={"type": "json_object"}
    )

    content = response.choices[0].message.content or "{}"
    result = json.loads(content)
    result["generated_at"] = datetime.utcnow().isoformat()
    return result


async def analyze_risks_only(issues: list) -> List[dict]:
    """빠른 리스크만 분석"""
    client = _get_client()
    sample = issues[:20]
    issue_text = "\n".join(
        f"{i['key']}: {i['summary']} [{i['status']}] 담당:{i['assignee']} 우선순위:{i['priority']}"
        for i in sample
    )

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": "Agile risk analyst. Return JSON only."},
            {"role": "user", "content": f"다음 이슈들에서 리스크를 도출하세요:\n{issue_text}\n\n"
             '{"risks": [{"id":"R1","severity":"Critical|High|Medium|Low","category":"Schedule|Resource|Quality|Scope|Technical","title":"제목","description":"설명","probability":"70%","affected_issues":[],"mitigation":"완화방안"}]}'}
        ],
        temperature=0.2,
        max_tokens=800,
        response_format={"type": "json_object"}
    )
    content = response.choices[0].message.content or '{"risks":[]}'
    return json.loads(content).get("risks", [])


def _build_quality_prompt(issues: list, sprint_stats: dict) -> str:
    bug_issues = [i for i in issues if i.get("issue_type") == "Bug"]
    high_priority = [i for i in issues if i.get("priority") in ("Highest", "High")]

    components_map: dict = {}
    assignee_bugs: dict = {}
    for i in bug_issues:
        for comp in (i.get("components") or []):
            components_map[comp] = components_map.get(comp, 0) + 1
        assignee = i.get("assignee", "Unassigned")
        assignee_bugs[assignee] = assignee_bugs.get(assignee, 0) + 1

    issue_list = "\n".join(
        f"- [{i['issue_type']}] {i['key']}: {i['summary']} | "
        f"상태:{i['status']} | 담당:{i['assignee']} | 우선순위:{i['priority']} | "
        f"컴포넌트:{','.join(i.get('components') or ['없음'])} | 라벨:{','.join(i.get('labels') or ['없음'])}"
        for i in issues[:40]
    )

    return f"""
당신은 소프트웨어 품질 관리 전문가입니다. 아래 Jira 스프린트 이슈 데이터를 분석하여 품질 인사이트를 JSON으로 제공하세요.

=== 품질 현황 ===
전체 이슈: {len(issues)}개
버그 이슈: {len(bug_issues)}개
고우선순위 이슈: {len(high_priority)}개
버그 비율: {round(len(bug_issues) / len(issues) * 100, 1) if issues else 0}%
컴포넌트별 버그: {components_map or '없음'}
담당자별 버그: {assignee_bugs or '없음'}

=== 이슈 목록 ===
{issue_list}

=== 분석 요청 ===
다음 JSON 형식으로만 응답하세요:
{{
  "quality_score": 0에서 100 사이 정수 (품질 점수),
  "quality_grade": "A 또는 B 또는 C 또는 D 또는 F",
  "executive_summary": "품질 현황 요약 2-3문장 (한국어)",
  "issue_distribution": {{
    "description": "이슈가 어디에 치우쳐 있는지 분석 (한국어, 2-3문장)",
    "hotspots": [
      {{
        "area": "영역명 (컴포넌트/모듈/카테고리)",
        "issue_count": 숫자,
        "severity": "Critical 또는 High 또는 Medium 또는 Low",
        "description": "해당 영역의 문제점 설명 (한국어)"
      }}
    ]
  }},
  "root_cause_patterns": [
    {{
      "pattern": "패턴명 (한국어)",
      "description": "패턴 상세 설명 (한국어)",
      "affected_issues": ["ISSUE-KEY"],
      "frequency": "High 또는 Medium 또는 Low"
    }}
  ],
  "improvement_actions": [
    {{
      "priority": 1,
      "action": "개선 조치 (한국어)",
      "expected_impact": "예상 효과 (한국어)",
      "effort": "High 또는 Medium 또는 Low",
      "category": "Process 또는 Testing 또는 Code Review 또는 Architecture 또는 Monitoring"
    }}
  ],
  "testing_gaps": [
    {{
      "area": "테스트 부족 영역 (한국어)",
      "recommendation": "권장 테스트 방안 (한국어)"
    }}
  ],
  "trend_analysis": "전반적인 품질 추세와 향후 예측 (한국어, 3-4문장)"
}}
hotspots은 최대 5개, improvement_actions는 최대 5개, root_cause_patterns는 최대 4개, testing_gaps는 최대 3개로 제한하세요.
"""


async def analyze_quality(issues: list, sprint_stats: dict) -> dict:
    """품질 이슈 분석"""
    prompt = _build_quality_prompt(issues, sprint_stats)

    client = _get_client()
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "당신은 소프트웨어 품질 분석 전문가입니다. 항상 유효한 JSON만 반환합니다."
            },
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=2500,
        response_format={"type": "json_object"}
    )

    content = response.choices[0].message.content or "{}"
    result = json.loads(content)
    result["generated_at"] = datetime.utcnow().isoformat()
    return result
