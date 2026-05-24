"""
Jira Dashboard Backend — FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from cache import clear_cache
from routers import manager, devteam, planning, quality, procurement

app = FastAPI(
    title="Jira Dashboard API",
    description="LGE Jira Server 기반 프로젝트 관리 대시보드 백엔드",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — React FE 도메인 허용 (config.CORS_ORIGINS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(manager.router)
app.include_router(devteam.router)
app.include_router(planning.router)
app.include_router(quality.router)
app.include_router(procurement.router)

# daily report — jinja2 미설치 환경(prod 이미지 등)에서는 건너뜀
try:
    from routers import report

    app.include_router(report.router)
except ImportError:
    pass


@app.get("/health", tags=["system"])
async def health_check():
    """서버 상태 확인."""
    return {"status": "ok", "service": "jira-dashboard-backend"}


@app.get("/api/health", tags=["system"])
async def api_health_check():
    """FE workspace proxy 호환 (/api prefix)."""
    return {"status": "ok", "service": "jira-dashboard-backend"}


@app.post("/api/cache/clear", tags=["system"])
async def invalidate_cache():
    """캐시 전체 초기화 (Frontend 새로고침 버튼 연동)."""
    await clear_cache()
    return {"message": "캐시가 초기화되었습니다."}
