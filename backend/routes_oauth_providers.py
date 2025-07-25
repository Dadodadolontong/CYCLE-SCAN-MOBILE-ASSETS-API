from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from db import SessionLocal
from models import OAuthProvider
from schemas import OAuthProviderCreate, OAuthProviderUpdate, OAuthProviderOut
from auth import get_current_user, require_role
from uuid import uuid4

router = APIRouter(prefix="/oauth-providers", tags=["oauth-providers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[OAuthProviderOut])
def list_oauth_providers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(OAuthProvider).all()

@router.get("/{provider_id}", response_model=OAuthProviderOut)
def get_oauth_provider(provider_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    provider = db.query(OAuthProvider).filter(OAuthProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    return provider

@router.post("", response_model=OAuthProviderOut, status_code=status.HTTP_201_CREATED)
def create_oauth_provider(
    provider: OAuthProviderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    new_provider = OAuthProvider(
        id=str(uuid4()),
        name=provider.name,
        client_id=provider.client_id,
        auth_url=provider.auth_url,
        token_url=provider.token_url,
        user_info_url=provider.user_info_url,
        scopes=provider.scopes,
        is_active=provider.is_active,
        created_by=current_user.id
    )
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    return new_provider

@router.put("/{provider_id}", response_model=OAuthProviderOut)
def update_oauth_provider(
    provider_id: str,
    updates: OAuthProviderUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    provider = db.query(OAuthProvider).filter(OAuthProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(provider, field, value)
    db.commit()
    db.refresh(provider)
    return provider

@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_oauth_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    provider = db.query(OAuthProvider).filter(OAuthProvider.id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    db.delete(provider)
    db.commit()
    return None 