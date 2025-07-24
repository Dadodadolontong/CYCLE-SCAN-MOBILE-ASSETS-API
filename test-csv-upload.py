#!/usr/bin/env python3
"""
Test script for CSV upload functionality
"""
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get base URL from environment variable
BASE_URL = os.getenv("API_BASE_URL")
if not BASE_URL:
    raise ValueError("API_BASE_URL environment variable is required")

# Get admin credentials from environment variables
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    raise ValueError("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required")

def login():
    """Login and get access token"""
    login_data = {
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/token", data=login_data)
    if response.status_code == 200:
        token_data = response.json()
        return token_data["access_token"]
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_data_stats(token):
    """Test data statistics endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/data-management/stats", headers=headers)
    
    print(f"Data Stats Response: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(f"Stats: {json.dumps(stats, indent=2)}")
    else:
        print(f"Error: {response.text}")

def test_sync_logs(token):
    """Test sync logs endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/data-management/sync-logs", headers=headers)
    
    print(f"Sync Logs Response: {response.status_code}")
    if response.status_code == 200:
        logs = response.json()
        print(f"Found {len(logs)} sync logs")
        for log in logs[:3]:  # Show first 3 logs
            print(f"  - {log['sync_type']}: {log['status']} ({log['records_processed']} records)")
    else:
        print(f"Error: {response.text}")

def test_csv_upload(token, file_path, upload_type):
    """Test CSV upload endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f, 'text/csv')}
        response = requests.post(f"{BASE_URL}/data-management/upload/{upload_type}", 
                               headers=headers, files=files)
    
    print(f"{upload_type.capitalize()} Upload Response: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Result: {json.dumps(result, indent=2)}")
    else:
        print(f"Error: {response.text}")

def main():
    print("=== Testing CSV Upload Functionality ===\n")
    
    # Login
    print("1. Logging in...")
    token = login()
    if not token:
        print("Failed to login. Exiting.")
        return
    
    print("Login successful!\n")
    
    # Test data stats
    print("2. Testing data statistics...")
    test_data_stats(token)
    print()
    
    # Test sync logs
    print("3. Testing sync logs...")
    test_sync_logs(token)
    print()
    
    # Test CSV uploads
    print("4. Testing CSV uploads...")
    
    # Test regions upload
    if os.path.exists("test-data/sample-regions.csv"):
        print("Testing regions upload...")
        test_csv_upload(token, "test-data/sample-regions.csv", "regions")
        print()
    
    # Test locations upload
    if os.path.exists("test-data/sample-locations.csv"):
        print("Testing locations upload...")
        test_csv_upload(token, "test-data/sample-locations.csv", "locations")
        print()
    
    # Test assets upload
    if os.path.exists("test-data/sample-assets.csv"):
        print("Testing assets upload...")
        test_csv_upload(token, "test-data/sample-assets.csv", "assets")
        print()
    
    # Test sync logs again to see new entries
    print("5. Testing sync logs after uploads...")
    test_sync_logs(token)
    print()
    
    print("=== Test Complete ===")

if __name__ == "__main__":
    main() 