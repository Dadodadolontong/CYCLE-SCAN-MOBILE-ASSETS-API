from sqlalchemy import text, inspect
from db import engine

def table_exists(table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    return any(col['name'] == column_name for col in columns)

def add_column_if_not_exists(table_name, column_name, column_definition):
    """Add a column to a table if it doesn't exist"""
    if not column_exists(table_name, column_name):
        print(f"Adding column {column_name} to table {table_name}")
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"))
            conn.commit()
        print(f"✓ Added column {column_name} to {table_name}")
    else:
        print(f"✓ Column {column_name} already exists in {table_name}")

def migrate_users_table():
    """Migrate the users table to add missing columns"""
    if table_exists('users'):
        print("Migrating users table...")
        add_column_if_not_exists('users', 'password_hash', 'VARCHAR(255) NOT NULL DEFAULT ""')
        add_column_if_not_exists('users', 'is_active', 'BOOLEAN DEFAULT TRUE')
        add_column_if_not_exists('users', 'created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        add_column_if_not_exists('users', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    else:
        print("Users table does not exist, creating it...")
        from models import Base
        Base.metadata.create_all(bind=engine, tables=[Base.metadata.tables['users']])

def migrate_all_tables():
    """Migrate all tables that need updates"""
    print("Starting table migration...")
    
    # Migrate users table
    migrate_users_table()
    
    # Add any other table migrations here as needed
    
    print("Migration completed!")

if __name__ == "__main__":
    migrate_all_tables() 