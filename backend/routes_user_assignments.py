from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from db import SessionLocal
from services.user_assignment_service import UserAssignmentService
from auth import require_role, require_any_role

router = APIRouter(prefix="/user-assignments", tags=["user-assignments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Get all users with roles (excluding admins)
@router.get("/users-with-roles")
def get_users_with_roles(db: Session = Depends(get_db)):
    return UserAssignmentService(db).get_users_with_roles()

# Country assignments
@router.get("/country-assignments")
def list_country_assignments(db: Session = Depends(get_db), current_user = Depends(require_any_role(["admin", "manager"]))):
    return UserAssignmentService(db).list_country_assignments()

@router.post("/country-assignments")
def assign_user_to_country(
    user_id: str = Body(...),
    country_id: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).assign_user_to_country(user_id, country_id)

@router.delete("/country-assignments/{assignment_id}")
def remove_country_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).remove_country_assignment(assignment_id)

# Region assignments
@router.get("/region-assignments")
def list_region_assignments(db: Session = Depends(get_db), current_user = Depends(require_any_role(["admin", "manager"]))):
    return UserAssignmentService(db).list_region_assignments()

@router.post("/region-assignments")
def assign_user_to_region(
    user_id: str = Body(...),
    region_id: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).assign_user_to_region(user_id, region_id)

@router.delete("/region-assignments/{assignment_id}")
def remove_region_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).remove_region_assignment(assignment_id)

# Branch assignments
@router.get("/branch-assignments")
def list_branch_assignments(db: Session = Depends(get_db), current_user = Depends(require_any_role(["admin", "manager"]))):
    return UserAssignmentService(db).list_branch_assignments()

@router.post("/branch-assignments")
def assign_user_to_branch(
    user_id: str = Body(...),
    branch_id: str = Body(...),
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).assign_user_to_branch(user_id, branch_id)

@router.delete("/branch-assignments/{assignment_id}")
def remove_branch_assignment(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role("admin"))
):
    return UserAssignmentService(db).remove_branch_assignment(assignment_id) 