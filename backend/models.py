from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint, Boolean, Integer, JSON, text
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

class UserRole(Base):
    __tablename__ = 'user_roles'
    user_id = Column(String(36), primary_key=True)
    role = Column(String(32), nullable=False)
    reports_to = Column(String(36), ForeignKey('user_roles.user_id'), nullable=True)
    # Add other fields as needed

class Country(Base):
    __tablename__ = 'countries'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=text('uuid()'))
    name = Column(String(255), nullable=False)
    code = Column(String(16), unique=True, nullable=False)
    accounting_manager_id = Column(String(36), ForeignKey('user_roles.user_id'), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    regions = relationship("Region", back_populates="country", cascade="all, delete-orphan")

class Region(Base):
    __tablename__ = 'regions'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=text('uuid()'))
    name = Column(String(255), nullable=False)
    country_id = Column(String(36), ForeignKey('countries.id', ondelete='CASCADE'), nullable=False)
    controller_id = Column(String(36), ForeignKey('user_roles.user_id'), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    country = relationship("Country", back_populates="regions")
    branches = relationship("Branch", back_populates="region", cascade="all, delete-orphan")

class Branch(Base):
    __tablename__ = 'branches'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=text('uuid()'))
    name = Column(String(255), nullable=False)
    region_id = Column(String(36), ForeignKey('regions.id', ondelete='CASCADE'), nullable=False)
    country_id = Column(String(36), ForeignKey('countries.id', ondelete='CASCADE'), nullable=True)  # New field
    manager_id = Column(String(36), ForeignKey('user_roles.user_id'), unique=True, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    region = relationship("Region", back_populates="branches")

class UserCountryAssignment(Base):
    __tablename__ = 'user_country_assignments'
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('user_roles.user_id', ondelete='CASCADE'), nullable=False)
    country_id = Column(String(36), ForeignKey('countries.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'country_id', name='uq_user_country'),)

class UserRegionAssignment(Base):
    __tablename__ = 'user_region_assignments'
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('user_roles.user_id', ondelete='CASCADE'), nullable=False)
    region_id = Column(String(36), ForeignKey('regions.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'region_id', name='uq_user_region'),)

class UserBranchAssignment(Base):
    __tablename__ = 'user_branch_assignments'
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey('user_roles.user_id', ondelete='CASCADE'), nullable=False)
    branch_id = Column(String(36), ForeignKey('branches.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('user_id', 'branch_id', name='uq_user_branch'),) 

class Location(Base):
    __tablename__ = 'locations'
    id = Column(String(36), primary_key=True)
    name = Column(String(255), unique=True, nullable=False)
    description = Column(String(255))
    erp_location_id = Column(String(64), index=True)
    branch_id = Column(String(36), ForeignKey('branches.id'), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class Asset(Base):
    __tablename__ = 'assets'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=text('uuid()'))
    erp_asset_id = Column(String(64), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    barcode = Column(String(64), index=True)
    model = Column(String(128))
    build = Column(String(128))
    category = Column(String(64))
    location = Column(String(36), ForeignKey('locations.id'), index=True)
    status = Column(String(32), default='active')
    last_seen = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    synced_at = Column(DateTime, server_default=func.now())

class Category(Base):
    __tablename__ = 'categories'
    id = Column(String(36), primary_key=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class Profile(Base):
    __tablename__ = 'profiles'
    id = Column(String(36), primary_key=True)
    display_name = Column(String(128))
    avatar_url = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class TempAsset(Base):
    __tablename__ = 'temp_assets'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), server_default=text("gen_random_uuid()"))
    description = Column(String(255), nullable=False)
    model = Column(String(128))
    build = Column(String(128))
    location = Column(String(36), ForeignKey('locations.id'))
    barcode = Column(String(64), unique=True, nullable=False)
    created_by = Column(String(36), nullable=False)  # FK to users
    converted = Column(String(5), default='FALSE')  # MySQL: use String for boolean
    conversion_date = Column(DateTime)
    converted_by = Column(String(36))  # FK to users
    cycle_count_task_id = Column(String(36), ForeignKey('cycle_count_tasks.id'))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class CycleCountTask(Base):
    __tablename__ = 'cycle_count_tasks'
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()"))
    name = Column(String(255), nullable=False)
    description = Column(String(255))
    location_filter = Column(String(255))
    category_filter = Column(String(255))
    status = Column(String(32), default='draft')
    assigned_to = Column(String(36))  # FK to users
    created_by = Column(String(36), nullable=False)  # FK to users
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class CycleCountItem(Base):
    __tablename__ = 'cycle_count_items'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(36), ForeignKey('cycle_count_tasks.id'), nullable=False)
    asset_id = Column(String(36), ForeignKey('assets.id'), nullable=False)
    expected_location = Column(String(255))
    status = Column(String(32), default='pending')
    actual_location = Column(String(255))
    counted_at = Column(DateTime)
    counted_by = Column(String(36))  # FK to users
    notes = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    __table_args__ = (UniqueConstraint('task_id', 'asset_id', name='uq_task_asset'),)
    asset = relationship('Asset', backref='cycle_count_items')

# Placeholder for users (since Supabase handled auth.users)
class User(Base):
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class SyncLog(Base):
    __tablename__ = 'sync_logs'
    id = Column(String(36), primary_key=True)
    sync_type = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False)
    started_at = Column(DateTime, server_default=func.now(), nullable=False)
    completed_at = Column(DateTime)
    assets_synced = Column(Integer, default=0)
    errors_count = Column(Integer, default=0)
    error_details = Column(JSON)
    initiated_by = Column(String(36))  # FK to users
    file_name = Column(String(255))
    records_processed = Column(Integer, default=0)
    scheduled_at = Column(DateTime)
    schedule_type = Column(String(32))
    next_run_at = Column(DateTime)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36))  # FK to users
    action = Column(String(128), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64))
    details = Column(JSON)
    ip_address = Column(String(64))
    user_agent = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class OAuthProvider(Base):
    __tablename__ = 'oauth_providers'
    id = Column(String(36), primary_key=True)
    name = Column(String(64), unique=True, nullable=False)
    client_id = Column(String(255), nullable=False)
    auth_url = Column(String(255), nullable=False)
    token_url = Column(String(255), nullable=False)
    user_info_url = Column(String(255), nullable=False)
    scopes = Column(String(255), default='')
    is_active = Column(Boolean, default=True)
    created_by = Column(String(36))  # FK to users
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class SystemSetting(Base):
    __tablename__ = 'system_settings'
    id = Column(String(36), primary_key=True)
    setting_key = Column(String(128), unique=True, nullable=False)
    setting_value = Column(JSON, nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

class UserSession(Base):
    __tablename__ = 'user_sessions'
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36))  # FK to users
    session_start = Column(DateTime, server_default=func.now(), nullable=False)
    session_end = Column(DateTime)
    ip_address = Column(String(64))
    user_agent = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class RateLimit(Base):
    __tablename__ = 'rate_limits'
    id = Column(String(36), primary_key=True)
    identifier = Column(String(128), nullable=False)
    action = Column(String(64), nullable=False)
    attempts = Column(Integer, default=1)
    window_start = Column(DateTime, server_default=func.now(), nullable=False)
    blocked_until = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class OAuthSession(Base):
    __tablename__ = 'oauth_sessions'
    id = Column(String(36), primary_key=True)
    config = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime) 