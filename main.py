"""
Jira Dashboard Backend — FastAPI 메인 애플리케이션
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cache import clear_cache
from routers import manager, devteam

app = FastAPI(
    title="Jira Dashboard API",
    description="LGE Jira Server 기반 프로젝트 관리 대시보드 백엔드",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — React 개발 서버 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(manager.router)
app.include_router(devteam.router)


@app.get("/health", tags=["system"])
async def health_check():
    """서버 상태 확인."""
    return {"status": "ok", "service": "jira-dashboard-backend"}


@app.post("/api/cache/clear", tags=["system"])
async def invalidate_cache():
    """캐시 전체 초기화 (Frontend 새로고침 버튼 연동)."""
    await clear_cache()
    return {"message": "캐시가 초기화되었습니다."}
