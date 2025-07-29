from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import List, Dict, Any
from models import UserCountryAssignment, UserRegionAssignment, UserBranchAssignment, Country, Region, Branch, UserRole, Profile
import uuid

class UserAssignmentService:
    def __init__(self, db: Session):
        self.db = db

    # Get all users with roles (excluding admins)
    def get_users_with_roles(self) -> List[Dict[str, Any]]:
        profiles = self.db.query(Profile).all()
        roles = self.db.query(UserRole).all()
        
        users_with_roles = []
        for profile in profiles:
            role = next((r for r in roles if r.user_id == profile.id), None)
            if role and role.role != 'admin':  # Exclude admins
                users_with_roles.append({
                    'id': profile.id,
                    'display_name': profile.display_name,
                    'role': role.role
                })
        
        return users_with_roles

    # Country assignments
    def list_country_assignments(self) -> List[Dict[str, Any]]:
        assignments = self.db.query(UserCountryAssignment).all()
        result = []
        
        for assignment in assignments:
            country = self.db.query(Country).filter(Country.id == assignment.country_id).first()
            user_role = self.db.query(UserRole).filter(UserRole.user_id == assignment.user_id).first()
            profile = self.db.query(Profile).filter(Profile.id == assignment.user_id).first()
            
            result.append({
                'id': assignment.id,
                'user_id': assignment.user_id,
                'country_id': assignment.country_id,
                'created_at': assignment.created_at,
                'country': {
                    'id': country.id,
                    'name': country.name,
                    'code': country.code,
                } if country else None,
                'user_role': {
                    'user_id': user_role.user_id,
                    'role': user_role.role,
                    'display_name': profile.display_name if profile else None,
                } if user_role else None,
            })
        
        return result

    def assign_user_to_country(self, user_id: str, country_id: str) -> Dict[str, Any]:
        # Check if assignment already exists
        existing = self.db.query(UserCountryAssignment).filter(
            UserCountryAssignment.user_id == user_id,
            UserCountryAssignment.country_id == country_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail='User already assigned to this country')
        
        assignment = UserCountryAssignment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            country_id=country_id
        )
        
        self.db.add(assignment)
        try:
            self.db.commit()
            self.db.refresh(assignment)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create assignment')
        
        return {
            'id': assignment.id,
            'user_id': assignment.user_id,
            'country_id': assignment.country_id,
            'created_at': assignment.created_at,
        }

    def remove_country_assignment(self, assignment_id: str) -> Dict[str, Any]:
        assignment = self.db.query(UserCountryAssignment).filter(UserCountryAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail='Assignment not found')
        
        self.db.delete(assignment)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to remove assignment')
        
        return {'ok': True, 'id': assignment_id}

    # Region assignments
    def list_region_assignments(self) -> List[Dict[str, Any]]:
        assignments = self.db.query(UserRegionAssignment).all()
        result = []
        
        for assignment in assignments:
            region = self.db.query(Region).filter(Region.id == assignment.region_id).first()
            country = self.db.query(Country).filter(Country.id == region.country_id).first() if region else None
            user_role = self.db.query(UserRole).filter(UserRole.user_id == assignment.user_id).first()
            profile = self.db.query(Profile).filter(Profile.id == assignment.user_id).first()
            
            result.append({
                'id': assignment.id,
                'user_id': assignment.user_id,
                'region_id': assignment.region_id,
                'created_at': assignment.created_at,
                'region': {
                    'id': region.id,
                    'name': region.name,
                    'country': {
                        'id': country.id,
                        'name': country.name,
                        'code': country.code,
                    } if country else None,
                } if region else None,
                'user_role': {
                    'user_id': user_role.user_id,
                    'role': user_role.role,
                    'display_name': profile.display_name if profile else None,
                } if user_role else None,
            })
        
        return result

    def assign_user_to_region(self, user_id: str, region_id: str) -> Dict[str, Any]:
        # Check if assignment already exists
        existing = self.db.query(UserRegionAssignment).filter(
            UserRegionAssignment.user_id == user_id,
            UserRegionAssignment.region_id == region_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail='User already assigned to this region')
        
        assignment = UserRegionAssignment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            region_id=region_id
        )
        
        self.db.add(assignment)
        try:
            self.db.commit()
            self.db.refresh(assignment)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create assignment')
        
        return {
            'id': assignment.id,
            'user_id': assignment.user_id,
            'region_id': assignment.region_id,
            'created_at': assignment.created_at,
        }

    def remove_region_assignment(self, assignment_id: str) -> Dict[str, Any]:
        assignment = self.db.query(UserRegionAssignment).filter(UserRegionAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail='Assignment not found')
        
        self.db.delete(assignment)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to remove assignment')
        
        return {'ok': True, 'id': assignment_id}

    # Branch assignments
    def list_branch_assignments(self) -> List[Dict[str, Any]]:
        assignments = self.db.query(UserBranchAssignment).all()
        result = []
        
        for assignment in assignments:
            branch = self.db.query(Branch).filter(Branch.id == assignment.branch_id).first()
            region = self.db.query(Region).filter(Region.id == branch.region_id).first() if branch else None
            country = self.db.query(Country).filter(Country.id == region.country_id).first() if region else None
            user_role = self.db.query(UserRole).filter(UserRole.user_id == assignment.user_id).first()
            profile = self.db.query(Profile).filter(Profile.id == assignment.user_id).first()
            
            result.append({
                'id': assignment.id,
                'user_id': assignment.user_id,
                'branch_id': assignment.branch_id,
                'created_at': assignment.created_at,
                'branch': {
                    'id': branch.id,
                    'name': branch.name,
                    'region': {
                        'id': region.id,
                        'name': region.name,
                        'country': {
                            'id': country.id,
                            'name': country.name,
                            'code': country.code,
                        } if country else None,
                    } if region else None,
                } if branch else None,
                'user_role': {
                    'user_id': user_role.user_id,
                    'role': user_role.role,
                    'display_name': profile.display_name if profile else None,
                } if user_role else None,
            })
        
        return result

    def assign_user_to_branch(self, user_id: str, branch_id: str) -> Dict[str, Any]:
        # Check if assignment already exists
        existing = self.db.query(UserBranchAssignment).filter(
            UserBranchAssignment.user_id == user_id,
            UserBranchAssignment.branch_id == branch_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail='User already assigned to this branch')
        
        assignment = UserBranchAssignment(
            id=str(uuid.uuid4()),
            user_id=user_id,
            branch_id=branch_id
        )
        
        self.db.add(assignment)
        try:
            self.db.commit()
            self.db.refresh(assignment)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create assignment')
        
        return {
            'id': assignment.id,
            'user_id': assignment.user_id,
            'branch_id': assignment.branch_id,
            'created_at': assignment.created_at,
        }

    def remove_branch_assignment(self, assignment_id: str) -> Dict[str, Any]:
        assignment = self.db.query(UserBranchAssignment).filter(UserBranchAssignment.id == assignment_id).first()
        if not assignment:
            raise HTTPException(status_code=404, detail='Assignment not found')
        
        self.db.delete(assignment)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to remove assignment')
        
        return {'ok': True, 'id': assignment_id} 