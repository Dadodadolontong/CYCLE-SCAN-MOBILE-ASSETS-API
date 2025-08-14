from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from db import SessionLocal
from auth import require_role, require_any_role, require_n8n, get_current_user
from services.workflow_service import WorkflowService
from schemas import WorkflowScenarioCreate, WorkflowScenarioOut, WorkflowTriggerIn, WorkflowTriggerOut, WorkflowResolveNextIn, WorkflowResolveNextOut, WorkflowDecisionIn

router = APIRouter(prefix="/workflows", tags=["workflows"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/scenarios", response_model=WorkflowScenarioOut)
def create_scenario(body: WorkflowScenarioCreate, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    return WorkflowService(db).create_scenario(body.dict())

@router.post("/trigger", response_model=WorkflowTriggerOut)
def trigger(body: WorkflowTriggerIn, db: Session = Depends(get_db)):
    inst = WorkflowService(db).trigger(body.scenario_name, body.business_ref, body.requester_email, body.current_step or 0, body.callback_url)
    return inst

@router.post("/resolve-next", dependencies=[Depends(require_n8n)], response_model=WorkflowResolveNextOut)
def resolve_next(body: WorkflowResolveNextIn, db: Session = Depends(get_db)):
    return WorkflowService(db).resolve_next(body.scenario_name, body.business_ref, body.current_step, body.context)

@router.post("/instances/{instance_id}/decision")
def decision(instance_id: str, body: WorkflowDecisionIn, db: Session = Depends(get_db)):
    # If step_token is provided, workflow service will validate it and infer actor
    return WorkflowService(db).decide(
        instance_id,
        body.step_index,
        body.actor_id or '',
        body.action,
        body.comment,
        body.step_token,
        getattr(body, 'destination_location_id', None)
    )

@router.get("/inbox")
def inbox(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return WorkflowService(db).inbox(current_user.id)

@router.get("/instances/{instance_id}")
def get_instance(instance_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return WorkflowService(db).get_instance_details(instance_id)

