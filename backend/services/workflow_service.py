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
    AssetLocationUpdate,
)
from config import config
from services.mailer import send_email
import logging

logger = logging.getLogger("uvicorn")

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
        self.db.refresh(instance)

        # Build context from business ref (asset transfer)
        at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == business_ref).first()
        ctx = {
            'source_branch_id': getattr(at, 'source_branch_id', None),
            'destination_branch_id': getattr(at, 'destination_branch_id', None),
        }

        # Pre-create planned steps with assigned actors
        steps = (scenario.rules or {}).get('steps', [])
        steps_def = [step for step in steps if not step.get("notify_only", False)]
        for idx, s in enumerate(steps_def):
            actors = self._resolve_actors(s.get('actor'), s.get('scope', 'receiving'), ctx)
            assigned_ids = [a['id'] for a in actors if a.get('id')]
            step_row = WorkflowStep(
                id=str(uuid.uuid4()),
                instance_id=instance.id,
                step_index=idx,
                actor_type=s.get('actor', ''),
                scope=s.get('scope', 'receiving'),
                assigned_actor_ids=assigned_ids,
                status='pending',
                is_current=(idx == (current_step or 0)),
            )
            self.db.add(step_row)
        self.db.commit()

        # Enter current step: create inbox and notify
        self._enter_step(instance, instance.current_step)
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

    def decide(self, instance_id: str, step_index: int, actor_id: str, action: str, comment: Optional[str], step_token: Optional[str] = None, item_details: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
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

        # Enforce turn-taking and assignment
        if (instance.current_step or 0) != int(step_index):
            raise HTTPException(status_code=409, detail='Not current step')
        step_row = self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == instance.id, WorkflowStep.step_index == step_index).first()
        if not step_row:
            raise HTTPException(status_code=404, detail='Step not found')
        assigned_ids = set(step_row.assigned_actor_ids or [])
        if actor_id not in assigned_ids:
            raise HTTPException(status_code=403, detail='Not your turn')

        # Persist destination location when receiving approval includes a location
        scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == instance.scenario_name).first()
        all_steps = (scenario.rules or {}).get('steps', []) if scenario else []
        steps_def = [step for step in all_steps if not step.get("notify_only", False)]
        step_def = steps_def[step_index] if step_index < len(steps_def) else {}
        if action == 'approve' and item_details and step_row.actor_type in ('finance_manager') and step_def.get('scope') == 'receiving':
            at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == instance.business_ref).first()
            if at:
                for d in item_details:
                    logger.info(f"Destination: {d}")
                    item = self.db.query(AssetTransferItem).filter(AssetTransferItem.id == d.get('id')).first()
                    if item:
                        setattr(item, 'destination_location_id', d.get('destination_location_id'))
                        setattr(item, 'destination_ou', d.get('destination_ou'))
                        setattr(item, 'destination_cc', d.get('destination_cc'))
                        self.db.add(item)

                        current_asset = self.db.query(Asset).filter(Asset.id == item.asset_id).first()

                        asset_location_update = AssetLocationUpdate(
                            id=str(uuid.uuid4()),
                            asset_id=item.asset_id,
                            old_location_id=getattr(current_asset, 'location_id', None),
                            new_location_id=d.get('destination_location_id')
                        )
                        self.db.add(asset_location_update)

                        setattr(current_asset, 'location_id', d.get('destination_location_id'))
                        self.db.add(current_asset)            

        # Record decision on the planned step row
        step_row.status = 'approved' if action == 'approve' else 'rejected'
        step_row.decided_by = actor_id
        step_row.decided_at = datetime.utcnow()
        step_row.is_current = False
        self.db.add(step_row)

        # Close inbox entries for this step
        from models import WorkflowInbox
        self.db.query(WorkflowInbox).filter(
            WorkflowInbox.instance_id == instance.id,
            WorkflowInbox.step_index == step_index
        ).update({ 'is_active': False, 'read_at': datetime.utcnow() })

        # Advance or finalize
        total_steps = len(steps_def)
        if action == 'reject':
            instance.status = 'rejected'
        else:
            next_step = (instance.current_step or 0) + 1
            if next_step >= total_steps:
                instance.status = 'approved'
                try:
                    from tasks.erp_tasks import sync_asset_transfer_to_oracle_task
                    sync_asset_transfer_to_oracle_task.delay(instance.business_ref)
                except Exception as e:
                    logger.error(f"Error syncing asset transfer to Oracle: {e}")
            else:
                instance.current_step = next_step
                self._enter_step(instance, next_step)
        self.db.commit()

        # Build response
        next_payload: Dict[str, Any] = { 'status': instance.status, 'current_step': instance.current_step }
        if instance.status == 'pending':
            next_def = steps_def[instance.current_step]
            next_step_row = self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == instance.id, WorkflowStep.step_index == instance.current_step).first()
            next_payload['next_step'] = {
                'step_index': instance.current_step,
                'actors': [{'id': uid} for uid in (getattr(next_step_row, 'assigned_actor_ids', []) or [])],
                'notify_only': bool(next_def.get('notify_only')),
            }
        else:
            next_payload['notifications'] = self._final_notifications(instance)
        return next_payload

    def _final_notifications(self, instance: WorkflowInstance) -> List[Dict[str, str]]:
        notifs: List[Dict[str, str]] = []
        if instance.requester_email:
            notifs.append({ 'id': 'requester', 'email': instance.requester_email })
        return notifs

    def inbox(self, user_id: str) -> List[Dict[str, Any]]:
        # Inbox is built from WorkflowInbox rows
        from models import WorkflowInbox
        rows = self.db.query(WorkflowInbox).filter(WorkflowInbox.user_id == user_id, WorkflowInbox.is_active == True).all()
        results: List[Dict[str, Any]] = []
        for r in rows:
            inst = self.db.query(WorkflowInstance).filter(WorkflowInstance.id == r.instance_id, WorkflowInstance.status == 'pending').first()
            if not inst:
                continue
            at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == inst.business_ref).first()
            source_branch_name = None
            destination_branch_name = None
            created_at = getattr(at, 'created_at', None) if at else None
            if at and getattr(at, 'source_branch_id', None):
                sb = self.db.query(Branch).filter(Branch.id == at.source_branch_id).first()
                source_branch_name = getattr(sb, 'name', None)
            if at and getattr(at, 'destination_branch_id', None):
                dbb = self.db.query(Branch).filter(Branch.id == at.destination_branch_id).first()
                destination_branch_name = getattr(dbb, 'name', None)
            step_row = self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == inst.id, WorkflowStep.step_index == r.step_index).first()
            # scope lookup from scenario
            scenario = self.db.query(WorkflowScenario).filter(WorkflowScenario.name == inst.scenario_name).first()
            scope = (scenario.rules or {}).get('steps', [])[r.step_index].get('scope', 'receiving') if scenario else 'receiving'
            results.append({
                'instance_id': inst.id,
                'scenario_name': inst.scenario_name,
                'business_ref': inst.business_ref,
                'current_step': r.step_index,
                'actor': getattr(step_row, 'actor_type', None),
                'scope': scope,
                'created_at': created_at,
                'workflow_status': inst.status,
                'source_branch_name': source_branch_name,
                'destination_branch_name': destination_branch_name,
            })
        return results

    def get_instance_details(self, instance_id: str) -> Dict[str, Any]:
        inst = self.db.query(WorkflowInstance).filter(WorkflowInstance.id == instance_id).first()
        if not inst:
            raise HTTPException(status_code=404, detail='Instance not found')
        data: Dict[str, Any] = {
            'instance_id': inst.id,
            'scenario_name': inst.scenario_name,
            'business_ref': inst.business_ref,
            'current_step': inst.current_step,
            'status': inst.status,
        }
        # If this is an asset transfer workflow, include transfer context
        at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == inst.business_ref).first()
        if at:
            # Resolve branches and requester
            src_branch = self.db.query(Branch).filter(Branch.id == getattr(at, 'source_branch_id', None)).first() if getattr(at, 'source_branch_id', None) else None
            dst_branch = self.db.query(Branch).filter(Branch.id == getattr(at, 'destination_branch_id', None)).first() if getattr(at, 'destination_branch_id', None) else None
            requester = self.db.query(User).filter(User.id == at.created_by).first() if getattr(at, 'created_by', None) else None
            # Resolve items with asset names
            items = self.db.query(AssetTransferItem).filter(AssetTransferItem.transfer_id == at.id).all()
            detailed_items: List[Dict[str, Any]] = []
            for itm in items:
                asset = self.db.query(Asset).filter(Asset.id == itm.asset_id).first()
                detailed_items.append({
                    'id': getattr(itm, 'id', ''),
                    'asset_id': getattr(itm, 'asset_id', ''),
                    'barcode': getattr(itm, 'barcode', ''),
                    'name': getattr(asset, 'name', ''),
                    'destination_location_id': getattr(itm, 'destination_location_id', None),
                })
            data['transfer'] = {
                'id': at.id,
                'transfer_number': at.transfer_number,
                'source_branch_id': getattr(at, 'source_branch_id', None),
                'destination_branch_id': getattr(at, 'destination_branch_id', None),
                'created_at': at.created_at,
                'source_branch_name': getattr(src_branch, 'name', None),
                'destination_branch_name': getattr(dst_branch, 'name', None),
                'requester': {
                    'id': getattr(requester, 'id', None),
                    'email': getattr(requester, 'email', None),
                    'display_name': getattr(requester, 'display_name', None),
                },
                'items': detailed_items,
            }
        # Planned step history and expected actors
       
        history = self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == inst.id).order_by(WorkflowStep.step_index.asc()).all()
        history_out: List[Dict[str, Any]] = []
        for h in history:
            actor_id= h.decided_by if h.decided_by else h.assigned_actor_ids[0] if h.assigned_actor_ids else None
            logger.info(f"Actor ID: {actor_id}")
            logger.info(f"Assigned Actor IDs: {h.assigned_actor_ids}")
            user = self.db.query(User).filter(User.id == actor_id).first()
            history_out.append({
                'step_index': h.step_index,
                'actor_type': h.actor_type,
                'status': h.status,
                'scope': h.scope,
                'decided_by': getattr(user, 'email', None),
                'decided_by_name': getattr(user, 'display_name', None),
                'decided_at': h.decided_at,
            })
        # Expected remains same as planned with assigned actors
        expected: List[Dict[str, Any]] = []
        """ for idx, s in enumerate(steps_def):
            step_row = next((x for x in history if x.step_index == idx), None)
            actor_ids = (getattr(step_row, 'assigned_actor_ids', []) or [])
            actors_out: List[Dict[str, Any]] = []
            for uid in actor_ids:
                u = self.db.query(User).filter(User.id == uid).first()
                actors_out.append({'id': uid, 'email': getattr(u, 'email', None)})
            expected.append({
                'step_index': idx,
                'actor_type': s.get('actor'),
                'scope': s.get('scope', 'receiving'),
                'actors': actors_out,
                'is_current': bool(getattr(step_row, 'is_current', False)),
                'status': getattr(step_row, 'status', 'pending'),
            }) """
        data['history'] = history_out
        data['expected'] = expected
        return data

    def _enter_step(self, instance: WorkflowInstance, step_index: int) -> None:
        # Mark only this step as current
        self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == instance.id).update({'is_current': False})
        self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == instance.id, WorkflowStep.step_index == step_index).update({'is_current': True})
        self.db.commit()
        # Create inbox entries and notify assigned actors
        step_row = self.db.query(WorkflowStep).filter(WorkflowStep.instance_id == instance.id, WorkflowStep.step_index == step_index).first()
        assigned = list(step_row.assigned_actor_ids or [])
        from models import WorkflowInbox
        # Deactivate previous inbox rows for this step (idempotency)
        self.db.query(WorkflowInbox).filter(WorkflowInbox.instance_id == instance.id, WorkflowInbox.step_index == step_index).update({'is_active': False})
        self.db.commit()
        for uid in assigned:
            inbox = WorkflowInbox(
                id=str(uuid.uuid4()),
                instance_id=instance.id,
                step_index=step_index,
                user_id=uid,
                is_active=True,
            )
            self.db.add(inbox)
        self.db.commit()
        self._notify_step_assigned(instance, step_index, assigned)

    def _notify_step_assigned(self, instance: WorkflowInstance, step_index: int, assigned_user_ids: List[str]) -> None:
        # Build transfer context
        at = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number == instance.business_ref).first()
        if not at:
            return
        src_branch = self.db.query(Branch).filter(Branch.id == at.source_branch_id).first() if at.source_branch_id else None
        dst_branch = self.db.query(Branch).filter(Branch.id == at.destination_branch_id).first() if at.destination_branch_id else None
        requester = self.db.query(User).filter(User.id == at.created_by).first()
        items = self.db.query(AssetTransferItem).filter(AssetTransferItem.transfer_id == at.id).all()
        for uid in assigned_user_ids:
            try:
                token = jwt.encode({ 'inst': instance.id, 'step': step_index, 'actor': uid, 'exp': datetime.utcnow() + timedelta(minutes=60) }, config.SECRET_KEY, algorithm=config.ALGORITHM)
                link = f"{config.FRONTEND_URL}/approvals/{instance.id}?step={step_index}&step_token={token}"
                html = self._build_email_html(instance.business_ref, requester, src_branch, dst_branch, items, link)
                user = self.db.query(User).filter(User.id == uid).first()
                if user and user.email:
                    send_email(user.email, f"Approval required: {instance.business_ref}", html)
            except Exception as e:
                error_msg = f"Failed to send approval email for {instance.business_ref} to actor {uid}: {e}"
                raise Exception(error_msg)

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
            branch_id = ctx.get('source_branch_id') if scope == 'initiating' else ctx.get('destination_branch_id')
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
            branch_id = ctx.get('destination_branch_id')
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

