#!/usr/bin/env python3
"""
Test script for Oracle ERP Integration
This script demonstrates how to use the Oracle ERP integration API endpoints
"""

import requests
import json
from typing import List, Dict, Any

# Configuration
BASE_URL = "http://localhost:8002"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

def get_auth_token(email: str, password: str) -> str:
    """Get authentication token"""
    url = f"{BASE_URL}/auth/token"
    data = {
        "username": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    response = requests.post(url, data=data, headers=headers)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Authentication failed: {response.text}")

def test_oracle_connection(token: str):
    """Test connection to Oracle ERP database"""
    url = f"{BASE_URL}/erp/test-connection"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Test Oracle Connection Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def sync_assets_from_oracle(token: str, force_full_sync: bool = False):
    """Sync assets from Oracle ERP database"""
    url = f"{BASE_URL}/erp/sync-assets"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    params = {"force_full_sync": force_full_sync}
    
    response = requests.post(url, headers=headers, params=params)
    print(f"Sync Assets Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def get_sync_history(token: str, limit: int = 10):
    """Get Oracle ERP sync history"""
    url = f"{BASE_URL}/erp/sync-history"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    params = {"limit": limit}
    
    response = requests.get(url, headers=headers, params=params)
    print(f"Sync History Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def get_sync_config(token: str):
    """Get current sync configuration"""
    url = f"{BASE_URL}/erp/sync-config"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Sync Config Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def get_locations_mapping(token: str):
    """Get locations mapping"""
    url = f"{BASE_URL}/erp/locations-mapping"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    print(f"Locations Mapping Response: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

def main():
    """Main test function"""
    print("=== Oracle ERP Integration Test Script ===\n")
    
    try:
        # Get authentication token
        print("1. Authenticating...")
        token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        print(f"Authentication successful! Token: {token[:20]}...\n")
        
        # Test Oracle connection
        print("2. Testing Oracle ERP connection...")
        test_oracle_connection(token)
        print()
        
        # Get sync configuration
        print("3. Getting sync configuration...")
        get_sync_config(token)
        print()
        
        # Get locations mapping
        print("4. Getting locations mapping...")
        get_locations_mapping(token)
        print()
        
        # Get sync history
        print("5. Getting sync history...")
        get_sync_history(token, 5)
        print()
        
        # Note: Uncomment the following to test actual Oracle sync
        # print("6. Syncing assets from Oracle ERP...")
        # sync_assets_from_oracle(token, force_full_sync=False)
        # print()
        
        print("=== Test completed successfully! ===")
        print("\n📋 Next Steps:")
        print("1. Configure Oracle database connection in .env file")
        print("2. Ensure locations are mapped with ERP location IDs")
        print("3. Run the sync to import assets from Oracle ERP")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        print("Make sure the backend server is running and accessible.")

if __name__ == "__main__":
    main() 