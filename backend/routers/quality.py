from fastapi import APIRouter, HTTPException, Query

from services import quality_service

router = APIRouter(prefix="/api/quality", tags=["quality"])


@router.get("/ping")
async def quality_ping():
    """배포 확인용 — Jira 호출 없음."""
    return {"ok": True, "service": "quality"}


@router.get("/filters")
async def quality_filters():
    """이벤트 그룹 · 차수 필터 옵션."""
    return quality_service.get_quality_filters()


@router.get("/dashboard")
async def quality_dashboard(
    event: str = Query("DEV", description="DEV | FC | PV | AUTO"),
    phase: str = Query("1", description="차수 (1~4)"),
    category: str | None = Query(None, description="all | bug | function | auto"),
):
    """품질 이슈 KPI · 차트 · 미결 목록."""
    try:
        return await quality_service.get_quality_dashboard(
            event=event,
            phase=phase,
            category=category,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira API 오류: {e}")


@router.post("/ai-analysis")
async def quality_ai_analysis(
    event: str = Query("DEV", description="DEV | FC | PV | AUTO"),
    phase: str = Query("1", description="차수 (1~4)"),
    category: str | None = Query(None, description="all | bug | function | auto"),
):
    """품질 이슈 LLM AI 분석 — 이슈 패턴·편중·개선 권고를 LLM으로 생성."""
    try:
        return await quality_service.get_quality_ai_analysis(
            event=event,
            phase=phase,
            category=category,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 분석 오류: {e}")
