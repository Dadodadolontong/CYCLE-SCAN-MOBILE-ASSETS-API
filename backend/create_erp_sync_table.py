#!/usr/bin/env python3
"""
Script to create the ERPSyncConfig table for tracking ERP sync dates
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from models import Base, ERPSyncConfig
from config import config
from datetime import datetime
import uuid

def create_erp_sync_table():
    """Create the ERPSyncConfig table"""
    try:
        # Create database engine
        engine = create_engine(config.get_database_url())
        
        # Create the table
        ERPSyncConfig.__table__.create(engine, checkfirst=True)
        
        print("✅ ERPSyncConfig table created successfully!")
        
        # Insert default sync config if it doesn't exist
        with engine.connect() as connection:
            # Check if default config exists
            result = connection.execute(text(
                "SELECT COUNT(*) FROM erp_sync_configs WHERE sync_type = 'asset_sync'"
            ))
            count = result.scalar()
            
            if count == 0:
                # Insert default config
                connection.execute(text("""
                    INSERT INTO erp_sync_configs (id, sync_type, last_sync_date, created_at, updated_at)
                    VALUES (:id, :sync_type, :last_sync_date, :created_at, :updated_at)
                """), {
                    'id': str(uuid.uuid4()),
                    'sync_type': 'asset_sync',
                    'last_sync_date': datetime(2020, 1, 1),
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                })
                connection.commit()
                print("✅ Default ERP sync configuration created!")
            else:
                print("ℹ️  ERP sync configuration already exists")
        
    except Exception as e:
        print(f"❌ Error creating ERPSyncConfig table: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Creating ERPSyncConfig table...")
    create_erp_sync_table()
    print("✅ Done!") 