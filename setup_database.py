#!/usr/bin/env python3
"""
Database setup script for the testing platform
"""

import pymysql
import sys
import os

def create_database():
    """Create the database and tables"""
    print("🚀 Setting up Database...")
    print("=" * 50)
    
    try:
        # Connect to MySQL (without specifying database)
        connection = pymysql.connect(
            host='127.0.0.1',
            port=3306,
            user='root',
            password='Sprayer#1122',
            charset='utf8mb4'
        )
        
        print("✅ Connected to MySQL successfully!")
        
        with connection.cursor() as cursor:
            # Create database if it doesn't exist
            print("📝 Creating database 'testing_platform'...")
            cursor.execute("CREATE DATABASE IF NOT EXISTS testing_platform")
            print("✅ Database created successfully!")
            
            # Use the database
            cursor.execute("USE testing_platform")
            
            # Read and execute schema
            print("📝 Creating tables...")
            schema_file = os.path.join('database', 'schema.sql')
            
            if os.path.exists(schema_file):
                with open(schema_file, 'r') as f:
                    schema = f.read()
                
                # Split by semicolon and execute each statement
                statements = schema.split(';')
                for statement in statements:
                    statement = statement.strip()
                    if statement and not statement.startswith('--') and not statement.startswith('USE'):
                        try:
                            cursor.execute(statement)
                            if statement.startswith('CREATE TABLE'):
                                table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip()
                                print(f"   ✅ Created table: {table_name}")
                            elif statement.startswith('INSERT INTO'):
                                table_name = statement.split('INSERT INTO')[1].split('(')[0].strip()
                                print(f"   ✅ Inserted data into: {table_name}")
                        except Exception as e:
                            print(f"   ⚠️  Skipped statement: {statement[:50]}... (Error: {e})")
                            continue
                
                print("✅ Database setup completed!")
                
                # Show created tables
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"\n📊 Created {len(tables)} tables:")
                for table in tables:
                    print(f"   - {table[0]}")
                    
            else:
                print(f"❌ Schema file not found: {schema_file}")
                return False
        
        connection.commit()
        connection.close()
        
        print("\n🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Make sure MySQL is running")
        print("2. Verify the password is correct")
        print("3. Check if you have CREATE DATABASE privileges")
        return False

def create_env_file():
    """Create the .env file for the backend"""
    print("\n📝 Creating .env file...")
    
    env_content = """# Flask Configuration
SECRET_KEY=your-super-secret-key-change-this-in-production-2024

# MySQL Database Configuration
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=Sprayer#1122
MYSQL_DATABASE=testing_platform

# Application Configuration
DEBUG=True
FLASK_ENV=development
"""
    
    try:
        # Create backend directory if it doesn't exist
        os.makedirs('backend', exist_ok=True)
        
        # Write .env file
        with open('backend/.env', 'w') as f:
            f.write(env_content)
        
        print("✅ .env file created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def main():
    """Main setup function"""
    print("🔧 Testing Platform Database Setup")
    print("=" * 50)
    
    # Create database and tables
    db_success = create_database()
    
    # Create .env file
    env_success = create_env_file()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Setup Summary")
    print("=" * 50)
    print(f"Database Setup: {'✅ SUCCESS' if db_success else '❌ FAILED'}")
    print(f"Environment File: {'✅ SUCCESS' if env_success else '❌ FAILED'}")
    
    if db_success and env_success:
        print("\n🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Start the backend: cd backend && python app.py")
        print("2. Start the frontend: cd frontend && npm start")
        print("3. Open http://localhost:3000 in your browser")
    else:
        print("\n⚠️  Setup failed. Please fix the issues above.")
    
    return db_success and env_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 