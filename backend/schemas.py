from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class LocationBase(BaseModel):
    name: str
    description: Optional[str] = None
    erp_location_id: Optional[int] = None
    branch_id: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(LocationBase):
    pass

class LocationOut(LocationBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Country schemas
class CountryBase(BaseModel):
    name: str
    code: str
    accounting_manager_id: Optional[str] = None

class CountryCreate(CountryBase):
    pass

class CountryUpdate(CountryBase):
    pass

class CountryOut(CountryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Region schemas
class RegionBase(BaseModel):
    name: str
    country_id: str
    controller_id: Optional[str] = None

class RegionCreate(RegionBase):
    pass

class RegionUpdate(RegionBase):
    pass

class RegionOut(RegionBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Asset schemas
class AssetBase(BaseModel):
    erp_asset_id: int
    name: str
    barcode: Optional[str] = None
    model: Optional[str] = None
    build: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "active"
    last_seen: Optional[datetime] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(AssetBase):
    pass

class AssetOut(AssetBase):
    id: str
    created_at: datetime
    updated_at: datetime
    synced_at: datetime

    class Config:
        from_attributes = True

# User schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    pass

class UserUpdate(UserBase):
    pass

class UserOut(UserBase):
    id: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True

# UserRole schemas
class UserRoleBase(BaseModel):
    user_id: str
    role: str
    reports_to: Optional[str] = None

class UserRoleCreate(UserRoleBase):
    pass

class UserRoleUpdate(UserRoleBase):
    pass

class UserRoleOut(UserRoleBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class UserCreateWithPassword(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserOutWithRoles(UserOut):
    roles: List[str] = []

    class Config:
        from_attributes = True 

# Category schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# TempAsset schemas
class TempAssetBase(BaseModel):
    description: str
    model: Optional[str] = None
    build: Optional[str] = None
    location: Optional[str] = None
    barcode: str
    converted: Optional[str] = "FALSE"
    conversion_date: Optional[datetime] = None
    converted_by: Optional[str] = None
    cycle_count_task_id: Optional[str] = None

class TempAssetCreate(TempAssetBase):
    pass

class TempAssetUpdate(TempAssetBase):
    pass

class TempAssetOut(TempAssetBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# CycleCountTask schemas
class CycleCountTaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    location_filter: Optional[str] = None
    category_filter: Optional[str] = None
    status: Optional[str] = "draft"
    assigned_to: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CycleCountTaskCreate(CycleCountTaskBase):
    pass

class CycleCountTaskUpdate(CycleCountTaskBase):
    pass

class CycleCountTaskOut(CycleCountTaskBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# CycleCountItem schemas
class CycleCountItemBase(BaseModel):
    task_id: str
    asset_id: str
    expected_location: Optional[str] = None
    status: Optional[str] = "pending"
    actual_location: Optional[str] = None
    counted_at: Optional[datetime] = None
    counted_by: Optional[str] = None
    notes: Optional[str] = None

class CycleCountItemCreate(CycleCountItemBase):
    pass

class CycleCountItemUpdate(CycleCountItemBase):
    pass

class CycleCountItemOut(BaseModel):
    id: str
    task_id: str
    asset_id: str
    expected_location: Optional[str]
    status: str
    actual_location: Optional[str]
    counted_at: Optional[datetime]
    counted_by: Optional[str]
    notes: Optional[str]
    created_at: datetime
    asset: Optional[AssetOut] = None 

class AssetTransferItemBase(BaseModel):
    asset_id: str
    barcode: str

class AssetTransferItemCreate(AssetTransferItemBase):
    pass

class AssetTransferItemOut(AssetTransferItemBase):
    id: str
    class Config:
        from_attributes = True

class AssetTransferApprovalBase(BaseModel):
    approver_id: str
    role: str
    status: str = 'pending'
    approved_at: Optional[datetime] = None

class AssetTransferApprovalCreate(AssetTransferApprovalBase):
    pass

class AssetTransferApprovalOut(AssetTransferApprovalBase):
    id: str
    class Config:
        from_attributes = True

class AssetTransferBase(BaseModel):
    source_location_id: str
    destination_location_id: str
    items: List[AssetTransferItemCreate]

class AssetTransferCreate(AssetTransferBase):
    pass

class AssetTransferOut(AssetTransferBase):
    id: str
    transfer_number: str
    created_by: str
    created_at: datetime
    status: str
    items: List[AssetTransferItemOut]
    approvals: List[AssetTransferApprovalOut]
    class Config:
        from_attributes = True 

class OAuthProviderBase(BaseModel):
    name: str
    client_id: str
    auth_url: str
    token_url: str
    user_info_url: str
    scopes: str = ''
    is_active: bool = True

class OAuthProviderCreate(OAuthProviderBase):
    pass

class OAuthProviderUpdate(OAuthProviderBase):
    pass

class OAuthProviderOut(OAuthProviderBase):
    id: str
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 

# ERP Integration schemas
class ERPAssetPayload(BaseModel):
    barcode: str  # Maps to barcode
    name: str  # Maps to description/name
    model: Optional[str] = None  # Maps to model
    build: Optional[str] = None  # Maps to build
    erp_asset_id: int # Maps to asset_id
    category: Optional[str] = None  # Maps to attribute_category_code
    location_id: str  # ERP location ID, must lookup to location table

class ERPAssetResponse(BaseModel):
    success: bool
    message: str
    assets_processed: int = 0
    assets_created: int = 0
    assets_updated: int = 0
    locations_synced: int = 0
    errors: List[str] = []
    details: Optional[Dict[str, Any]] = None 