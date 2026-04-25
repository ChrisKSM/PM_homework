from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import jira, analysis, sprint
import uvicorn

app = FastAPI(
    title="Jira WBS Dashboard API",
    description="Jira Sprint WBS Visualization & AI Risk Analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jira.router, prefix="/api/jira", tags=["Jira"])
app.include_router(sprint.router, prefix="/api/sprint", tags=["Sprint"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "Jira WBS Dashboard API"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
