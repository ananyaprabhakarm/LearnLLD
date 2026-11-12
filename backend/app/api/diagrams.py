from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiagramRecord, utc_now
from app.schemas import DiagramPayload, DiagramResponse, DiagramSummary

router = APIRouter(prefix="/api/diagrams", tags=["diagrams"])


def _utc_datetime(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _to_response(record: DiagramRecord) -> DiagramResponse:
    return DiagramResponse(
        id=record.id,
        title=record.title,
        classes=record.diagram_data["classes"],
        relationships=record.diagram_data["relationships"],
        createdAt=_utc_datetime(record.created_at),
        updatedAt=_utc_datetime(record.updated_at),
    )


def _get_record(db: Session, diagram_id: str) -> DiagramRecord:
    record = db.get(DiagramRecord, diagram_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Diagram '{diagram_id}' was not found",
        )
    return record


@router.post("", response_model=DiagramResponse, status_code=status.HTTP_201_CREATED)
def create_diagram(payload: DiagramPayload, db: Session = Depends(get_db)) -> DiagramResponse:
    data = payload.model_dump(mode="json", by_alias=True, exclude={"title"})
    record = DiagramRecord(
        id=str(uuid4()),
        title=payload.title,
        diagram_data=data,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.get("", response_model=list[DiagramSummary])
def list_diagrams(db: Session = Depends(get_db)) -> list[DiagramSummary]:
    records = db.scalars(
        select(DiagramRecord).order_by(DiagramRecord.updated_at.desc(), DiagramRecord.id)
    ).all()
    return [
        DiagramSummary(
            id=record.id,
            title=record.title,
            createdAt=_utc_datetime(record.created_at),
            updatedAt=_utc_datetime(record.updated_at),
        )
        for record in records
    ]


@router.get("/{diagram_id}", response_model=DiagramResponse)
def get_diagram(diagram_id: str, db: Session = Depends(get_db)) -> DiagramResponse:
    return _to_response(_get_record(db, diagram_id))


@router.put("/{diagram_id}", response_model=DiagramResponse)
def update_diagram(
    diagram_id: str,
    payload: DiagramPayload,
    db: Session = Depends(get_db),
) -> DiagramResponse:
    record = _get_record(db, diagram_id)
    record.title = payload.title
    record.diagram_data = payload.model_dump(mode="json", by_alias=True, exclude={"title"})
    record.updated_at = utc_now()
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.delete("/{diagram_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagram(diagram_id: str, db: Session = Depends(get_db)) -> Response:
    record = _get_record(db, diagram_id)
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
