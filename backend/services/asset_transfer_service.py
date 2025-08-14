from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from typing import List
import json
import uuid
from datetime import datetime
from models import Location, Asset, AssetTransfer, AssetTransferItem, Branch, UserRole

class AssetTransferService:
    def __init__(self, db: Session):
        self.db = db

    async def create_transfer(
        self,
        requester_id: str,
        source_branch_id: str,
        destination_branch_id: str,
        barcodes_json: str,
        photos: List[UploadFile],
        remarks: str | None = None,
    ):
        # Validate photos (max 3 enforced by route)
        if len(photos) > 3:
            raise HTTPException(status_code=422, detail='Maximum 3 photos allowed')

        # Parse barcodes
        try:
            barcodes = json.loads(barcodes_json)
            if not isinstance(barcodes, list):
                raise ValueError()
        except Exception:
            raise HTTPException(status_code=422, detail='barcodes must be a JSON array of strings')

        if not barcodes:
            raise HTTPException(status_code=422, detail='At least one asset barcode is required')

        # Role/ownership checks: requester must be finance manager of source branch
        role = self.db.query(UserRole).filter(UserRole.user_id == requester_id).first()
        if not role or role.role != 'manager':
            raise HTTPException(status_code=403, detail='Only finance manager can initiate transfers')
        branch = self.db.query(Branch).filter(Branch.id == source_branch_id).first()
        if not branch or branch.manager_id != requester_id:
            raise HTTPException(status_code=403, detail='You are not the finance manager of the selected source branch')

        # Validate same country
        dst_branch = self.db.query(Branch).filter(Branch.id == destination_branch_id).first()
        if not dst_branch or not branch:
            raise HTTPException(status_code=422, detail='Invalid branches')
        if branch.region is None or dst_branch.region is None:
            raise HTTPException(status_code=422, detail='Branches missing region/country')
        if branch.region.country_id != dst_branch.region.country_id:
            raise HTTPException(status_code=422, detail='Destination must be within the same country')

        is_same_branch = source_branch_id == destination_branch_id

        # Resolve assets by barcode; validate they belong to source branch
        assets: List[Asset] = []
        for bc in barcodes:
            asset = self.db.query(Asset).filter(Asset.barcode == bc).first()
            if not asset:
                raise HTTPException(status_code=404, detail=f'Asset with barcode {bc} not found')
            if asset.location:
                loc = self.db.query(Location).filter(Location.id == asset.location).first()
                if not loc or loc.branch_id != source_branch_id:
                    raise HTTPException(status_code=422, detail=f'Asset {bc} is not in the source branch')
            assets.append(asset)

        # Create transfer
        transfer = AssetTransfer(
            id=str(uuid.uuid4()),
            transfer_number=self._generate_transfer_number(),
            source_branch_id=source_branch_id,
            destination_branch_id=destination_branch_id,
            created_by=requester_id,
            status='approved' if is_same_branch else 'pending',
            remarks=remarks or None,
        )
        self.db.add(transfer)
        self.db.flush()

        # Create items
        for asset in assets:
            item = AssetTransferItem(
                id=str(uuid.uuid4()),
                transfer_id=transfer.id,
                asset_id=asset.id,
                barcode=asset.barcode or '',
            )
            self.db.add(item)

        # TODO: store photos to storage and persist their references

        self.db.commit()
        self.db.refresh(transfer)

        # If same-branch, trigger ERP update (background)
        if is_same_branch:
            # TODO: enqueue Celery task for ERP update
            pass
        else:
            # TODO: trigger n8n workflow via webhook with transfer info
            pass

        return {
            'id': transfer.id,
            'transfer_number': transfer.transfer_number,
            'status': transfer.status,
            'created_at': transfer.created_at,
        }

    def list_transfers(self, user_id: str, skip: int = 0, limit: int = 50):
        # List transfers created by the user or where the user is an approver (basic inbox)
        from models import AssetTransfer, AssetTransferApproval
        q_created = self.db.query(AssetTransfer).filter(AssetTransfer.created_by == user_id)
        q_approver = (
            self.db.query(AssetTransfer)
            .join(AssetTransferApproval, AssetTransferApproval.transfer_id == AssetTransfer.id)
            .filter(AssetTransferApproval.approver_id == user_id)
        )
        transfers = q_created.union(q_approver).order_by(AssetTransfer.created_at.desc()).offset(skip).limit(limit).all()
        # Attempt to join workflow instance to expose latest instance_id for navigation
        from models import WorkflowInstance
        results = []
        for t in transfers:
            inst = self.db.query(WorkflowInstance).filter(WorkflowInstance.business_ref == t.transfer_number).order_by(WorkflowInstance.created_at.desc()).first()
            results.append({
                'id': t.id,
                'transfer_number': t.transfer_number,
                'status': t.status,
                'created_at': t.created_at,
                'source_location_id': t.source_location_id,
                'destination_location_id': t.destination_location_id,
                'instance_id': getattr(inst, 'id', None),
            })
        return results

    def get_transfer_details(self, transfer_id: str):
        t = self.db.query(AssetTransfer).filter(AssetTransfer.id == transfer_id).first()
        if not t:
            raise HTTPException(status_code=404, detail='Asset transfer not found')
        src_branch = self.db.query(Branch).filter(Branch.id == t.source_branch_id).first() if getattr(t, 'source_branch_id', None) else None
        dst_branch = self.db.query(Branch).filter(Branch.id == t.destination_branch_id).first() if getattr(t, 'destination_branch_id', None) else None
        items = self.db.query(AssetTransferItem).filter(AssetTransferItem.transfer_id == t.id).all()
        detailed_items = []
        for itm in items:
            asset = self.db.query(Asset).filter(Asset.id == itm.asset_id).first()
            detailed_items.append({
                'barcode': getattr(itm, 'barcode', ''),
                'name': getattr(asset, 'name', ''),
            })
        return {
            'id': t.id,
            'transfer_number': t.transfer_number,
            'status': t.status,
            'created_at': t.created_at,
            'source_branch_name': getattr(src_branch, 'name', None),
            'destination_branch_name': getattr(dst_branch, 'name', None),
            'destination_location_id': getattr(t, 'destination_location_id', None),
            'items': detailed_items,
        }

    def _get_branch_id_for_location(self, location_id: str) -> str | None:
        loc = self.db.query(Location).filter(Location.id == location_id).first()
        if not loc:
            return None
        return loc.branch_id

    def _generate_transfer_number(self) -> str:
        now = datetime.utcnow()
        return f"AT-{now.strftime('%y%m%d%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"