from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from models import Country, Region, Branch
import uuid
from utils import get_access_scope_for_user

class LocationService:
    def __init__(self, db: Session):
        self.db = db

    # Country CRUD
    def list_countries(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if user_id:
            scope = get_access_scope_for_user(self.db, user_id)
            if not scope['is_admin']:
                allowed_ids = set(scope['country_ids'])
                return [
                    {
                        'id': c.id,
                        'name': c.name,
                        'code': c.code,
                        'accounting_manager_id': c.accounting_manager_id,
                        'created_at': c.created_at,
                        'updated_at': c.updated_at,
                    }
                    for c in self.db.query(Country).filter(Country.id.in_(allowed_ids)).order_by(Country.name).all()
                ]
        # Default: return all
        return [
            {
                'id': c.id,
                'name': c.name,
                'code': c.code,
                'accounting_manager_id': c.accounting_manager_id,
                'created_at': c.created_at,
                'updated_at': c.updated_at,
            }
            for c in self.db.query(Country).order_by(Country.name).all()
        ]

    def create_country(self, name: str, code: str) -> Dict[str, Any]:
        if self.db.query(Country).filter(Country.code == code).first():
            raise HTTPException(status_code=400, detail='Country code already exists')
        country = Country(name=name, code=code.upper())
        self.db.add(country)
        try:
            self.db.commit()
            self.db.refresh(country)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create country')
        return {
            'id': country.id,
            'name': country.name,
            'code': country.code,
            'created_at': country.created_at,
            'updated_at': country.updated_at,
        }

    def update_country(self, country_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        country = self.db.query(Country).filter(Country.id == country_id).first()
        if not country:
            raise HTTPException(status_code=404, detail='Country not found')
        for k, v in updates.items():
            setattr(country, k, v)
        try:
            self.db.commit()
            self.db.refresh(country)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to update country')
        return {
            'id': country.id,
            'name': country.name,
            'code': country.code,
            'created_at': country.created_at,
            'updated_at': country.updated_at,
        }

    def delete_country(self, country_id: str) -> Dict[str, Any]:
        country = self.db.query(Country).filter(Country.id == country_id).first()
        if not country:
            raise HTTPException(status_code=404, detail='Country not found')
        self.db.delete(country)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to delete country')
        return {'ok': True, 'id': country_id}

    # Region CRUD
    def list_regions(self, user_id: Optional[str] = None, country_id: Optional[str] = None) -> List[Dict[str, Any]]:
        q = self.db.query(Region).join(Country, Region.country_id == Country.id)
        if country_id:
            q = q.filter(Region.country_id == country_id)
        if user_id:
            scope = get_access_scope_for_user(self.db, user_id)
            if not scope['is_admin']:
                allowed_ids = set(scope['region_ids'])
                q = q.filter(Region.id.in_(allowed_ids))
        return [
            {
                'id': r.id,
                'name': r.name,
                'country_id': r.country_id,
                'country': {
                    'id': r.country.id,
                    'name': r.country.name,
                    'code': r.country.code,
                },
                'created_at': r.created_at,
                'updated_at': r.updated_at,
            }
            for r in q.order_by(Region.name).all()
        ]

    def create_region(self, name: str, country_id: str) -> Dict[str, Any]:
        region = Region(name=name, country_id=country_id)
        self.db.add(region)
        try:
            self.db.commit()
            self.db.refresh(region)
            # Get the country information
            country = self.db.query(Country).filter(Country.id == country_id).first()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create region')
        return {
            'id': region.id,
            'name': region.name,
            'country_id': region.country_id,
            'country': {
                'id': country.id,
                'name': country.name,
                'code': country.code,
            } if country else None,
            'created_at': region.created_at,
            'updated_at': region.updated_at,
        }

    def update_region(self, region_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=404, detail='Region not found')
        for k, v in updates.items():
            setattr(region, k, v)
        try:
            self.db.commit()
            self.db.refresh(region)
            # Get the country information
            country = self.db.query(Country).filter(Country.id == region.country_id).first()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to update region')
        return {
            'id': region.id,
            'name': region.name,
            'country_id': region.country_id,
            'country': {
                'id': country.id,
                'name': country.name,
                'code': country.code,
            } if country else None,
            'created_at': region.created_at,
            'updated_at': region.updated_at,
        }

    def delete_region(self, region_id: str) -> Dict[str, Any]:
        region = self.db.query(Region).filter(Region.id == region_id).first()
        if not region:
            raise HTTPException(status_code=404, detail='Region not found')
        self.db.delete(region)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to delete region')
        return {'ok': True, 'id': region_id}

    # Branch CRUD
    def list_branches(self, user_id: Optional[str] = None, region_id: Optional[str] = None) -> List[Dict[str, Any]]:
        q = self.db.query(Branch).join(Region, Branch.region_id == Region.id).join(Country, Region.country_id == Country.id)
        if region_id:
            q = q.filter(Branch.region_id == region_id)
        if user_id:
            scope = get_access_scope_for_user(self.db, user_id)
            if not scope['is_admin']:
                allowed_ids = set(scope['branch_ids'])
                q = q.filter(Branch.id.in_(allowed_ids))
        return [
            {
                'id': b.id,
                'name': b.name,
                'region_id': b.region_id,
                'region': {
                    'id': b.region.id,
                    'name': b.region.name,
                },
                'country': {
                    'id': b.region.country.id,
                    'name': b.region.country.name,
                    'code': b.region.country.code,
                },
                'created_at': b.created_at,
                'updated_at': b.updated_at,
            }
            for b in q.order_by(Branch.name).all()
        ]

    def create_branch(self, name: str, region_id: str) -> Dict[str, Any]:
        branch = Branch(name=name, region_id=region_id)
        self.db.add(branch)
        try:
            self.db.commit()
            self.db.refresh(branch)
            # Get the region and country information
            region = self.db.query(Region).filter(Region.id == region_id).first()
            country = self.db.query(Country).filter(Country.id == region.country_id).first() if region else None
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to create branch')
        return {
            'id': branch.id,
            'name': branch.name,
            'region_id': branch.region_id,
            'region': {
                'id': region.id,
                'name': region.name,
            } if region else None,
            'country': {
                'id': country.id,
                'name': country.name,
                'code': country.code,
            } if country else None,
            'created_at': branch.created_at,
            'updated_at': branch.updated_at,
        }

    def update_branch(self, branch_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        branch = self.db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail='Branch not found')
        for k, v in updates.items():
            setattr(branch, k, v)
        try:
            self.db.commit()
            self.db.refresh(branch)
            # Get the region and country information
            region = self.db.query(Region).filter(Region.id == branch.region_id).first()
            country = self.db.query(Country).filter(Country.id == region.country_id).first() if region else None
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to update branch')
        return {
            'id': branch.id,
            'name': branch.name,
            'region_id': branch.region_id,
            'region': {
                'id': region.id,
                'name': region.name,
            } if region else None,
            'country': {
                'id': country.id,
                'name': country.name,
                'code': country.code,
            } if country else None,
            'created_at': branch.created_at,
            'updated_at': branch.updated_at,
        }

    def delete_branch(self, branch_id: str) -> Dict[str, Any]:
        branch = self.db.query(Branch).filter(Branch.id == branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail='Branch not found')
        self.db.delete(branch)
        try:
            self.db.commit()
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(status_code=400, detail='Failed to delete branch')
        return {'ok': True, 'id': branch_id}

    def list_locations(self, user_id: Optional[str] = None, branch_id: Optional[str] = None) -> List[Dict[str, Any]]:
        from models import Location
        q = self.db.query(Location)
        if branch_id:
            q = q.filter(Location.branch_id == branch_id)
        if user_id:
            scope = get_access_scope_for_user(self.db, user_id)
            if not scope['is_admin']:
                allowed_ids = set(scope['location_ids'])
                q = q.filter(Location.id.in_(allowed_ids))
        return [
            {
                'id': l.id,
                'name': l.name,
                'description': l.description,
                'erp_location_id': l.erp_location_id,
                'branch_id': l.branch_id,
                'created_at': l.created_at,
                'updated_at': l.updated_at,
            }
            for l in q.order_by(Location.name).all()
        ] 