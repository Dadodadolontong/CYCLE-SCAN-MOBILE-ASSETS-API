#!/usr/bin/env python3
"""
Script to create an admin user in the FastAPI system.
Run this script to create a user with admin role.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from db import SessionLocal
from models import User, UserRole
from auth import get_password_hash
import uuid

def create_admin_user(email: str, password: str):
    """Create a user with admin role"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists!")
            return
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(password)
        
        user = User(
            id=user_id,
            email=email,
            password_hash=hashed_password,
            is_active=True
        )
        db.add(user)
        
        # Create admin role
        admin_role = UserRole(
            user_id=user_id,
            role="admin"
        )
        db.add(admin_role)
        
        db.commit()
        print(f"Admin user created successfully!")
        print(f"Email: {email}")
        print(f"User ID: {user_id}")
        print(f"Role: admin")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python create_admin_user.py <email> <password>")
        print("Example: python create_admin_user.py admin@example.com password123")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    create_admin_user(email, password) 