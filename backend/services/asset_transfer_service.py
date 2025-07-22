from sqlalchemy.orm import Session
from models import AssetTransfer, AssetTransferItem, AssetTransferApproval, Location, User, UserRole, UserBranchAssignment, UserRegionAssignment, Branch, Region, Asset
from schemas import AssetTransferCreate
from datetime import datetime
import uuid

class AssetTransferService:
    def __init__(self, db: Session):
        self.db = db

    def generate_transfer_number(self, branch_code: str) -> str:
        today = datetime.now().strftime('%y%m%d')
        prefix = f"{branch_code}-{today}-"
        count = self.db.query(AssetTransfer).filter(AssetTransfer.transfer_number.like(f"{prefix}%")).count()
        running_number = f"{prefix}{str(count + 1).zfill(4)}"
        return running_number

    def create_transfer(self, transfer_data: AssetTransferCreate, created_by: str) -> AssetTransfer:
        # Only allow managers to create transfers
        creator_role = self.db.query(UserRole).filter(UserRole.user_id == created_by, UserRole.role == 'manager').first()
        if not creator_role:
            raise Exception("Only managers can create asset transfers.")
        # Check for duplicate assets in transfer
        asset_ids = [item.asset_id for item in transfer_data.items]
        if len(asset_ids) != len(set(asset_ids)):
            raise Exception("Duplicate assets in transfer.")
        # Check assets are available (not already in transfer)
        for asset_id in asset_ids:
            in_transfer = self.db.query(AssetTransferItem).filter(AssetTransferItem.asset_id == asset_id).first()
            if in_transfer:
                raise Exception(f"Asset {asset_id} is already in another transfer.")
        source_location = self.db.query(Location).filter(Location.id == transfer_data.source_location_id).first()
        dest_location = self.db.query(Location).filter(Location.id == transfer_data.destination_location_id).first()
        branch_code = source_location.name.split('-')[1] if source_location and '-' in source_location.name else 'BR'
        transfer_number = self.generate_transfer_number(branch_code)
        transfer = AssetTransfer(
            id=str(uuid.uuid4()),
            transfer_number=transfer_number,
            source_location_id=transfer_data.source_location_id,
            destination_location_id=transfer_data.destination_location_id,
            created_by=created_by,
            status='pending',
        )
        self.db.add(transfer)
        self.db.flush()  # Get transfer.id
        # Add items
        for item in transfer_data.items:
            transfer_item = AssetTransferItem(
                id=str(uuid.uuid4()),
                transfer_id=transfer.id,
                asset_id=item.asset_id,
                barcode=item.barcode
            )
            self.db.add(transfer_item)
        # Create approval steps
        self._create_approval_steps(transfer, source_location, dest_location)
        self.db.commit()
        self.db.refresh(transfer)
        return transfer

    def _create_approval_steps(self, transfer, source_location, dest_location):
        # Always require source controller approval
        source_controller = self._get_controller_for_location(source_location)
        if source_controller:
            self._add_approval(transfer.id, source_controller.id, 'controller')
        # If different region, require receiving region controller
        if source_location and dest_location and source_location.branch_id != dest_location.branch_id:
            dest_controller = self._get_controller_for_location(dest_location)
            if dest_controller:
                self._add_approval(transfer.id, dest_controller.id, 'receiving_controller')
        # Always require receiving manager approval
        dest_manager = self._get_manager_for_location(dest_location)
        if dest_manager:
            self._add_approval(transfer.id, dest_manager.id, 'receiving_manager')

    def _get_controller_for_location(self, location):
        # Find the controller for the region of the location's branch
        if not location or not location.branch_id:
            return None
        branch = self.db.query(Branch).filter(Branch.id == location.branch_id).first()
        if not branch:
            return None
        region = self.db.query(Region).filter(Region.id == branch.region_id).first()
        if not region:
            return None
        region_assignment = self.db.query(UserRegionAssignment).filter(
            UserRegionAssignment.region_id == region.id
        ).first()
        if region_assignment:
            user_role = self.db.query(UserRole).filter(
                UserRole.user_id == region_assignment.user_id,
                UserRole.role == 'controller'
            ).first()
            if user_role:
                return self.db.query(User).filter(User.id == user_role.user_id).first()
        return None

    def _get_manager_for_location(self, location):
        # Find the manager for the branch of the location
        if not location or not location.branch_id:
            return None
        branch_assignment = self.db.query(UserBranchAssignment).filter(
            UserBranchAssignment.branch_id == location.branch_id
        ).first()
        if branch_assignment:
            user_role = self.db.query(UserRole).filter(
                UserRole.user_id == branch_assignment.user_id,
                UserRole.role == 'manager'
            ).first()
            if user_role:
                return self.db.query(User).filter(User.id == user_role.user_id).first()
        return None

    def _add_approval(self, transfer_id, approver_id, role):
        approval = AssetTransferApproval(
            id=str(uuid.uuid4()),
            transfer_id=transfer_id,
            approver_id=approver_id,
            role=role,
            status='pending'
        )
        self.db.add(approval)

    def get_transfer(self, transfer_id: str) -> AssetTransfer:
        return self.db.query(AssetTransfer).filter(AssetTransfer.id == transfer_id).first()

    def list_transfers(self, user_id: str = None, role: str = None):
        query = self.db.query(AssetTransfer)
        if user_id and role == 'manager':
            query = query.filter(AssetTransfer.created_by == user_id)
        return query.order_by(AssetTransfer.created_at.desc()).all()

    def add_approval(self, transfer_id: str, approver_id: str, role: str):
        approval = AssetTransferApproval(
            id=str(uuid.uuid4()),
            transfer_id=transfer_id,
            approver_id=approver_id,
            role=role,
            status='pending'
        )
        self.db.add(approval)
        self.db.commit()
        return approval

    def update_approval(self, approval_id: str, status: str, current_user_id: str):
        approval = self.db.query(AssetTransferApproval).filter(AssetTransferApproval.id == approval_id).first()
        if not approval:
            raise Exception("Approval not found.")
        # Only the assigned approver can approve/reject
        if approval.approver_id != current_user_id:
            raise Exception("You are not authorized to approve this transfer.")
        approval.status = status
        approval.approved_at = datetime.now()
        self.db.commit()
        self.db.refresh(approval)
        self._update_transfer_status(approval.transfer_id)
        return approval

    def _update_transfer_status(self, transfer_id: str):
        transfer = self.db.query(AssetTransfer).filter(AssetTransfer.id == transfer_id).first()
        if not transfer:
            return
        approvals = self.db.query(AssetTransferApproval).filter(AssetTransferApproval.transfer_id == transfer_id).all()
        if any(a.status == 'rejected' for a in approvals):
            transfer.status = 'rejected'
        elif all(a.status == 'approved' for a in approvals):
            transfer.status = 'approved'
            # Update asset locations
            for item in transfer.items:
                asset = self.db.query(Asset).filter(Asset.id == item.asset_id).first()
                if asset:
                    asset.location = transfer.destination_location_id
            self.db.commit()
        else:
            transfer.status = 'pending'
        self.db.commit()

    def get_pending_approvals(self, user_id: str):
        return self.db.query(AssetTransferApproval).filter(
            AssetTransferApproval.approver_id == user_id,
            AssetTransferApproval.status == 'pending'
        ).all() 