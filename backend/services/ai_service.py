import openai
import os
import json
from datetime import datetime
from typing import List
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY", "")
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


def _build_prompt(sprint_stats: dict, issues: list) -> str:
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

    # 이슈 샘플 (최대 30개)
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
  "summary": "스프린트 전반적인 현황을 3-4문장으로 한국어 요약",
  "health_score": 0에서 100 사이의 정수 (스프린트 건강도),
  "risks": [
    {{
      "level": "HIGH|MEDIUM|LOW",
      "category": "SCHEDULE|RESOURCE|QUALITY|SCOPE",
      "title": "리스크 제목 (한국어, 20자 이내)",
      "description": "리스크 상세 설명 (한국어, 100자 이내)",
      "affected_issues": ["ISSUE-KEY", ...],
      "recommendation": "권장 조치사항 (한국어, 80자 이내)"
    }}
  ],
  "predictions": [
    "예측 문장 1 (한국어)",
    "예측 문장 2 (한국어)",
    "예측 문장 3 (한국어)"
  ],
  "recommendations": [
    "권장사항 1 (한국어)",
    "권장사항 2 (한국어)",
    "권장사항 3 (한국어)"
  ]
}}
리스크는 최대 5개, 심각도 높은 순으로 정렬하세요.
"""


async def analyze_sprint(sprint_stats: dict, issues: list) -> dict:
    prompt = _build_prompt(sprint_stats, issues)

    client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
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
        max_tokens=2000,
        response_format={"type": "json_object"}
    )

    content = response.choices[0].message.content or "{}"
    result = json.loads(content)
    result["generated_at"] = datetime.utcnow().isoformat()
    return result


async def analyze_risks_only(issues: list) -> List[dict]:
    """빠른 리스크만 분석"""
    client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))
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
             '{"risks": [{"level":"HIGH|MEDIUM|LOW","category":"SCHEDULE|RESOURCE|QUALITY|SCOPE","title":"제목","description":"설명","affected_issues":[],"recommendation":"권장사항"}]}'}
        ],
        temperature=0.2,
        max_tokens=800,
        response_format={"type": "json_object"}
    )
    content = response.choices[0].message.content or '{"risks":[]}'
    return json.loads(content).get("risks", [])
