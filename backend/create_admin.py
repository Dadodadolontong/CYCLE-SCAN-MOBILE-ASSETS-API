import uuid
from db import SessionLocal
from models import User, UserRole
from auth import get_password_hash

def create_admin_user(email: str, password: str):
    """Create an admin user with the specified email and password"""
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            print(f"User with email {email} already exists!")
            return existing_user
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = get_password_hash(password)
        
        db_user = User(
            id=user_id,
            email=email,
            password_hash=hashed_password,
            is_active=True
        )
        db.add(db_user)
        
        # Create admin role
        admin_role = UserRole(
            user_id=user_id,
            role="admin"
        )
        db.add(admin_role)
        
        db.commit()
        db.refresh(db_user)
        
        print(f"✅ Admin user created successfully!")
        print(f"   Email: {email}")
        print(f"   User ID: {user_id}")
        print(f"   Role: admin")
        
        return db_user
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating admin user: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    email = input("Enter admin email: ")
    password = input("Enter admin password: ")
    
    if not email or not password:
        print("Email and password are required!")
    else:
        create_admin_user(email, password) 