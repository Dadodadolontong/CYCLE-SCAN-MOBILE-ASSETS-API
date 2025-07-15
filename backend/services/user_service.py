from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import List, Optional, Dict, Any
from models import User, UserRole, Profile
from auth import get_password_hash
import uuid

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_all_users_with_roles(self) -> List[Dict[str, Any]]:
        """Get all users with their roles and display names"""
        users = self.db.query(User).all()
        roles = self.db.query(UserRole).all()
        
        # Get profiles for display names
        try:
            profiles = {p.id: p.display_name for p in self.db.query(Profile).all()}
        except Exception:
            profiles = {}
        
        result = []
        for user in users:
            role = next((r.role for r in roles if r.user_id == user.id), 'guest')
            display_name = profiles.get(user.id, None)
            result.append({
                "id": user.id,
                "email": user.email,
                "display_name": display_name,
                "created_at": user.created_at,
                "is_active": user.is_active,
                "role": role
            })
        return result

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific user with role and profile"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None
        
        role = self.db.query(UserRole).filter(UserRole.user_id == user_id).first()
        profile = self.db.query(Profile).filter(Profile.id == user_id).first()
        
        return {
            "id": user.id,
            "email": user.email,
            "display_name": profile.display_name if profile else None,
            "created_at": user.created_at,
            "is_active": user.is_active,
            "role": role.role if role else 'guest'
        }

    def create_user(self, email: str, password: str, display_name: Optional[str] = None, role: str = 'user') -> Dict[str, Any]:
        """Create a new user with profile and role"""
        # Check if user exists
        if self.db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="User already exists")
        
        # Create user
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=email, 
            password_hash=get_password_hash(password), 
            is_active=True
        )
        self.db.add(user)
        
        # Create profile if display_name provided
        if display_name:
            profile = Profile(id=user_id, display_name=display_name)
            self.db.add(profile)
        
        # Create role
        user_role = UserRole(user_id=user_id, role=role)
        self.db.add(user_role)
        
        try:
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        return {
            "id": user.id,
            "email": user.email,
            "display_name": display_name,
            "role": role,
            "is_active": True,
            "created_at": user.created_at
        }

    def update_user(self, user_id: str, **kwargs) -> Dict[str, Any]:
        """Update user information (email, display_name, role, is_active, password)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user fields
        if 'email' in kwargs and kwargs['email'] is not None:
            user.email = kwargs['email']
        
        if 'is_active' in kwargs and kwargs['is_active'] is not None:
            user.is_active = kwargs['is_active']
        
        # Update password if provided
        if 'password' in kwargs and kwargs['password'] is not None:
            user.password_hash = get_password_hash(kwargs['password'])
        
        # Update profile
        if 'display_name' in kwargs and kwargs['display_name'] is not None:
            profile = self.db.query(Profile).filter(Profile.id == user_id).first()
            if profile:
                profile.display_name = kwargs['display_name']
            else:
                profile = Profile(id=user_id, display_name=kwargs['display_name'])
                self.db.add(profile)
        
        # Update role
        if 'role' in kwargs and kwargs['role'] is not None:
            # Remove existing role
            self.db.query(UserRole).filter(UserRole.user_id == user_id).delete()
            # Add new role
            user_role = UserRole(user_id=user_id, role=kwargs['role'])
            self.db.add(user_role)
        
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Failed to update user")
        
        return {"ok": True, "user_id": user_id}

    def delete_user(self, user_id: str) -> Dict[str, Any]:
        """Delete a user and all associated data"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete associated data (cascade should handle this, but explicit for clarity)
        self.db.query(UserRole).filter(UserRole.user_id == user_id).delete()
        self.db.query(Profile).filter(Profile.id == user_id).delete()
        self.db.delete(user)
        
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail="Failed to delete user")
        
        return {"ok": True, "user_id": user_id}

    def lock_user(self, user_id: str) -> Dict[str, Any]:
        """Lock a user (set is_active to False)"""
        return self.update_user(user_id, is_active=False)

    def unlock_user(self, user_id: str) -> Dict[str, Any]:
        """Unlock a user (set is_active to True)"""
        return self.update_user(user_id, is_active=True)

    def update_user_role(self, user_id: str, new_role: str) -> Dict[str, Any]:
        """Update only the user's role"""
        return self.update_user(user_id, role=new_role)

    def get_user_stats(self) -> Dict[str, int]:
        """Get user statistics by role (dynamic, not hardcoded)"""
        from sqlalchemy import func
        total_users = self.db.query(User).count()
        role_counts = self.db.query(
            UserRole.role,
            func.count(UserRole.user_id)
        ).group_by(UserRole.role).all()
        stats = {f"{role}_count": count for role, count in role_counts}
        stats["total_users"] = total_users
        return stats

    def get_all_roles(self) -> List[str]:
        """Get all unique user roles from the database"""
        roles = self.db.query(UserRole.role).distinct().all()
        return [r[0] for r in roles] 