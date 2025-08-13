from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile
from typing import List
import json
import uuid
from datetime import datetime
from models import Location, Asset, AssetTransfer, AssetTransferItem

class AssetTransferService:
    def __init__(self, db: Session):
        self.db = db

    async def create_transfer(
        self,
        requester_id: str,
        source_location_id: str,
        destination_location_id: str,
        barcodes_json: str,
        photos: List[UploadFile],
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

        # Same-branch auto-approval check
        source_branch_id = self._get_branch_id_for_location(source_location_id)
        dest_branch_id = self._get_branch_id_for_location(destination_location_id)
        if not source_branch_id or not dest_branch_id:
            raise HTTPException(status_code=422, detail='Invalid source or destination location')

        is_same_branch = source_branch_id == dest_branch_id

        # Resolve assets by barcode
        assets: List[Asset] = []
        for bc in barcodes:
            asset = self.db.query(Asset).filter(Asset.barcode == bc).first()
            if not asset:
                raise HTTPException(status_code=404, detail=f'Asset with barcode {bc} not found')
            assets.append(asset)

        # Create transfer
        transfer = AssetTransfer(
            id=str(uuid.uuid4()),
            transfer_number=self._generate_transfer_number(),
            source_location_id=source_location_id,
            destination_location_id=destination_location_id,
            created_by=requester_id,
            status='approved' if is_same_branch else 'pending',
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

    def _get_branch_id_for_location(self, location_id: str) -> str | None:
        loc = self.db.query(Location).filter(Location.id == location_id).first()
        if not loc:
            return None
        return loc.branch_id

    def _generate_transfer_number(self) -> str:
        now = datetime.utcnow()
        return f"AT-{now.strftime('%y%m%d%H%M%S')}-{str(uuid.uuid4())[:6].upper()}"