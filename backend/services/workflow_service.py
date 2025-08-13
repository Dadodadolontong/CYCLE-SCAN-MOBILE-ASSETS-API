from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timedelta
from jose import jwt
from models import (
    WorkflowScenario,
    WorkflowInstance,
    WorkflowStep,
    Location,
    User,
    AssetTransfer,
    Asset,
    Branch,
    AssetTransferItem,
)
from config import config
from services.mailer import send_email

class WorkflowService:
    def __init__(self, db: Session):
        self.db = db

    def create_scenario(self, data: Dict[str, Any]) -> WorkflowScenario:
        existing = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == data['name']).first()
        if existing:
            raise HTTPException(status_code=400, detail='Scenario name already exists')
        scenario = WorkflowScenario(
            id=str(uuid.uuid4()),
            name=data['name'],
            description=data.get('description'),
            rules=data['rules'],
            is_active=data.get('is_active', True)
        )
        self.db.add(scenario)
        self.db.commit()
        self.db.refresh(scenario)
        return scenario

    def trigger(self, scenario_name: str, business_ref: str, requester_email: Optional[str], current_step: int, callback_url: Optional[str]) -> WorkflowInstance:
        scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == scenario_name, WorkflowScenario.is_active == True).first()
        if not scenario:
            raise HTTPException(status_code=404, detail='Scenario not found')
        
        instance = WorkflowInstance(
            id=str(uuid.uuid4()),
            scenario_name=scenario.name,
            business_ref=business_ref,
            requester_email=requester_email,
            current_step=current_step or 0,
            status='pending',
            callback_url=callback_url,
        )
        self.db.add(instance)
        self.db.commit()
        # Internal email-driven workflow: notify first step actors
        self._notify_next_actors(instance, scenario, business_ref)
        return { 'instance_id': instance.id, 'status': instance.status }

    def resolve_next(self, scenario_name: str, business_ref: str, current_step: int, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == scenario_name, WorkflowScenario.is_active == True).first()
        if not scenario:
            raise HTTPException(status_code=404, detail='Scenario not found')
        steps: List[Dict[str, Any]] = scenario.rules.get('steps', [])
        if current_step >= len(steps):
            return { 'step_index': current_step, 'actors': [], 'end': True }
        step = steps[current_step]
        actor_type = step.get('actor')
        scope = step.get('scope', 'receiving')  # 'initiating' | 'receiving' (default receiving)
        actors = self._resolve_actors(actor_type, scope, context or {})
        return { 'step_index': current_step, 'actors': actors, 'end': False }

    def decide(self, instance_id: str, step_index: int, actor_id: str, action: str, comment: Optional[str], step_token: Optional[str] = None) -> Dict[str, Any]:
        instance = self.db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
        if not instance:
            raise HTTPException(status_code=404, detail='Instance not found')
        # If step_token provided, validate and infer actor id
        if step_token:
            try:
                payload = jwt.decode(step_token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
                token_inst = payload.get('inst')
                token_step = payload.get('step')
                token_actor = payload.get('actor')
                if token_inst != instance_id or int(token_step) != int(step_index):
                    raise HTTPException(status_code=400, detail='Invalid step token')
                actor_id = token_actor or actor_id
            except Exception:
                raise HTTPException(status_code=400, detail='Invalid step token')
        # Record step
        wf_step = WorkflowStep(
            id=str(uuid.uuid4()),
            instance_id=instance.id,
            step_index=step_index,
            actor_type='',
            assigned_actor_ids=None,
            status='approved' if action == 'approve' else 'rejected',
            decided_by=actor_id,
        )
        self.db.add(wf_step)
        # Advance or finalize
        scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == instance.scenario_name).first()
        total_steps = len((scenario.rules or {}).get('steps', []))
        if action == 'reject':
            instance.status = 'rejected'
        else:
            next_step = (instance.current_step or 0) + 1
            if next_step >= total_steps:
                instance.status = 'approved'
            else:
                instance.current_step = next_step
        self.db.commit()
        # Advance emails if pending, include next_step / final notifications
        next_payload: Dict[str, Any] = { 'status': instance.status, 'current_step': instance.current_step }
        if instance.status == 'pending':
            scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == instance.scenario_name).first()
            # Email next actors
            self._notify_next_actors(instance, scenario, instance.business_ref)
            steps = (scenario.rules or {}).get('steps', [])
            next_idx = instance.current_step or 0
            if next_idx < len(steps):
                step = steps[next_idx]
                scope = step.get('scope', 'receiving')
                actors = self._resolve_actors(step.get('actor'), scope, {
                    'source_location_id': None,
                    'destination_location_id': None,
                })
                next_payload['next_step'] = {
                    'step_index': next_idx,
                    'actors': actors,
                    'notify_only': bool(step.get('notify_only')),
                }
        else:
            next_payload['notifications'] = self._final_notifications(instance)
        return next_payload

    def _final_notifications(self, instance: WorkflowInstance) -> List[Dict[str, str]]:
        notifs: List[Dict[str, str]] = []
        if instance.requester_email:
            notifs.append({ 'id': 'requester', 'email': instance.requester_email })
        return notifs

    def _notify_next_actors(self, instance: WorkflowInstance, scenario: WorkflowScenario, business_ref: str) -> None:
        steps = (scenario.rules or {}).get('steps', [])
        idx = instance.current_step or 0
        if idx >= len(steps):
            return
        step = steps[idx]
        scope = step.get('scope', 'receiving')
        # Build transfer context
        at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == business_ref).first()
        if not at:
            return
        src_branch_id = self._get_branch_id_for_location(at.source_location_id)
        dst_branch_id = self._get_branch_id_for_location(at.destination_location_id)
        src_branch = self.db.query(Branch).filter(Branch.id == src_branch_id).first() if src_branch_id else None
        dst_branch = self.db.query(Branch).filter(Branch.id == dst_branch_id).first() if dst_branch_id else None
        requester = self.db.query(User).filter(User.id == at.created_by).first()
        items = self.db.query(AssetTransferItem).filter(AssetTransferItem.transfer_id == at.id).all()
        actors = self._resolve_actors(step.get('actor'), scope, {
            'source_location_id': at.source_location_id,
            'destination_location_id': at.destination_location_id,
        })
        for a in actors:
            token = jwt.encode({ 'inst': instance.id, 'step': idx, 'actor': a['id'], 'exp': datetime.utcnow() + timedelta(minutes=60) }, config.SECRET_KEY, algorithm=config.ALGORITHM)
            link = f"{config.FRONTEND_URL}/approvals/{instance.id}?step={idx}&step_token={token}"
            html = self._build_email_html(business_ref, requester, src_branch, dst_branch, items, link)
            email = a.get('email')
            if not email:
                user = self.db.query(User).filter(User.id == a['id']).first()
                email = user.email if user else None
            if email:
                send_email(email, f"Approval required: {business_ref}", html)

    def _build_email_html(self, business_ref: str, requester: Any, src_branch: Any, dst_branch: Any, items: List[Any], link: str) -> str:
        header_rows = f"""
        <tr><td>Requester</td><td>{getattr(requester,'display_name', getattr(requester,'email',''))}</td></tr>
        <tr><td>Requester Branch</td><td>{getattr(src_branch,'name','-')}</td></tr>
        <tr><td>Date</td><td>{datetime.utcnow().strftime('%Y-%m-%d %H:%M')}</td></tr>
        <tr><td>Destination Branch</td><td>{getattr(dst_branch,'name','-')}</td></tr>
        """
        rows = []
        for itm in items[:20]:
            asset = self.db.query(Asset).filter(Asset.id == itm.asset_id).first()
            rows.append(f"<tr><td>{getattr(itm,'barcode','')}</td><td>{asset.name if asset else ''}</td></tr>")
        more = '' if len(items) <= 20 else f"<tr><td colspan='2'>+{len(items)-20} more…</td></tr>"
        items_html = ''.join(rows)
        return f"""
        <h3>Approval required: {business_ref}</h3>
        <table border='1' cellpadding='4' cellspacing='0'>{header_rows}</table>
        <p>Assets:</p>
        <table border='1' cellpadding='4' cellspacing='0'><tr><th>Barcode</th><th>Name</th></tr>{items_html}{more}</table>
        <p><a href='{link}'>Review and Respond</a></p>
        """

    def _resolve_actors(self, actor_type: str, scope: str, ctx: Dict[str, Any]) -> List[Dict[str, str]]:
        # Only three roles in this workflow scope: finance_manager, branch_manager, accounting_manager
        # Scope for branch/finance managers: 'initiating' (source branch) or 'receiving' (destination branch)
        if actor_type in ('branch_manager', 'finance_manager'):
            loc_id = ctx.get('source_location_id') if scope == 'initiating' else ctx.get('destination_location_id')
            if not loc_id:
                return []
            branch_id = self._get_branch_id_for_location(loc_id)
            if not branch_id:
                return []
            branch = self.db.query(Branch).filter(Branch.id == branch_id).first()
            if not branch:
                return []
            user_id = getattr(branch, 'branch_manager_id' if actor_type == 'branch_manager' else 'manager_id', None)
            if not user_id:
                return []
            user = self.db.query(User).filter(User.id == user_id).first()
            return [{ 'id': user_id, 'email': user.email if user else None }]
        if actor_type == 'accounting_manager':
            loc_id = ctx.get('destination_location_id')
            if not loc_id:
                return []
            branch_id = self._get_branch_id_for_location(loc_id)
            if not branch_id:
                return []
            branch = self.db.query(Branch).filter(Branch.id == branch_id).first()
            if not branch:
                return []
            from models import Country
            country = self.db.query(Country).filter(Country.id == branch.country_id).first()
            user_id = getattr(country, 'accounting_manager_id', None) if country else None
            if not user_id:
                return []
            user = self.db.query(User).filter(User.id == user_id).first()
            return [{ 'id': user_id, 'email': user.email if user else None }]
        return []
        

    def _get_branch_id_for_location(self, location_id: Optional[str]) -> Optional[str]:
        if not location_id:
            return None
        loc = self.db.query(Location).filter(Location.id == location_id).first()
        return loc.branch_id if loc else None

