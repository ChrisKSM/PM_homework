"""모델 현황 일정 저장/로드 API — MongoDB 연동."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from services import mongo_helper

router = APIRouter(prefix="/api/model-schedule", tags=["model-schedule"])

COLLECTION = "model_schedule_data"


class ScheduleSaveRequest(BaseModel):
    rows: list[dict[str, Any]]


@router.get("/load")
async def load_schedule():
    """MongoDB에서 일정 데이터 로드."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION):
            raise HTTPException(status_code=502, detail="MongoDB collection 준비 실패")

        docs = mongo_helper.get_all_documents(COLLECTION, use_cache=False)
        for doc in docs:
            doc.pop("_id", None)
        return {"rows": docs, "count": len(docs)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MongoDB 오류: {e}")


@router.post("/save")
async def save_schedule(req: ScheduleSaveRequest):
    """MongoDB에 일정 데이터 저장 (전체 교체)."""
    try:
        if not mongo_helper.ensure_collection(COLLECTION):
            raise HTTPException(status_code=502, detail="MongoDB collection 준비 실패")

        if not mongo_helper.delete_all_documents(COLLECTION):
            raise HTTPException(status_code=502, detail="기존 데이터 삭제 실패")

        if req.rows and not mongo_helper.insert_documents(COLLECTION, req.rows):
            raise HTTPException(status_code=502, detail="MongoDB 저장 실패")

        return {"saved": len(req.rows), "message": "저장 완료"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"MongoDB 저장 오류: {e}")
