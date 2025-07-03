#!/usr/bin/env python3
"""
Database migration script to add release and platform columns
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app import app, db
from sqlalchemy import text

def run_migration():
    """Run the database migration to add release and platform columns"""
    
    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text("SHOW COLUMNS FROM issues LIKE 'release'"))
            release_exists = result.fetchone() is not None
            
            result = db.session.execute(text("SHOW COLUMNS FROM issues LIKE 'platform'"))
            platform_exists = result.fetchone() is not None
            
            if not release_exists:
                print("Adding 'release' column...")
                db.session.execute(text("ALTER TABLE issues ADD COLUMN `release` VARCHAR(10) NULL"))
                print("✅ 'release' column added successfully")
            else:
                print("ℹ️  'release' column already exists")
            
            if not platform_exists:
                print("Adding 'platform' column...")
                db.session.execute(text("ALTER TABLE issues ADD COLUMN platform VARCHAR(20) NULL"))
                print("✅ 'platform' column added successfully")
            else:
                print("ℹ️  'platform' column already exists")
            
            # Create indexes if they don't exist
            try:
                db.session.execute(text("CREATE INDEX idx_issues_release ON issues(`release`)"))
                print("✅ Index on 'release' column created")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("ℹ️  Index on 'release' column already exists")
                else:
                    print(f"⚠️  Could not create index on 'release': {e}")
            
            try:
                db.session.execute(text("CREATE INDEX idx_issues_platform ON issues(platform)"))
                print("✅ Index on 'platform' column created")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("ℹ️  Index on 'platform' column already exists")
                else:
                    print(f"⚠️  Could not create index on 'platform': {e}")
            
            try:
                db.session.execute(text("CREATE INDEX idx_issues_release_platform ON issues(`release`, platform)"))
                print("✅ Composite index on 'release, platform' created")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("ℹ️  Composite index on 'release, platform' already exists")
                else:
                    print(f"⚠️  Could not create composite index: {e}")
            
            db.session.commit()
            print("\n🎉 Database migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            db.session.rollback()
            return False
    
    return True

if __name__ == "__main__":
    print("Running database migration for release and platform columns...")
    print("=" * 60)
    
    success = run_migration()
    
    if success:
        print("\n✅ Migration completed! You can now restart your backend server.")
    else:
        print("\n❌ Migration failed! Please check the error messages above.") 