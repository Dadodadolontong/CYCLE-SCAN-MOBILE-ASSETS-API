#!/usr/bin/env python3
"""
Test script to verify pagination is working correctly for branches and locations
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8200"
TEST_TOKEN = "your-test-token-here"  # Replace with actual token

def test_branches_pagination():
    """Test branches pagination"""
    print("Testing branches pagination...")
    
    # Test first page
    response = requests.get(f"{BASE_URL}/locations/branches?skip=0&limit=5")
    print(f"First page status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total items: {data.get('total', 'N/A')}")
        print(f"Items returned: {len(data.get('items', []))}")
        print(f"Skip: {data.get('skip', 'N/A')}")
        print(f"Limit: {data.get('limit', 'N/A')}")
        
        # Test second page if there are more items
        if data.get('total', 0) > 5:
            response2 = requests.get(f"{BASE_URL}/locations/branches?skip=5&limit=5")
            print(f"Second page status: {response2.status_code}")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"Second page items: {len(data2.get('items', []))}")
    else:
        print(f"Error: {response.text}")

def test_locations_pagination():
    """Test locations pagination"""
    print("\nTesting locations pagination...")
    
    # Test first page
    response = requests.get(f"{BASE_URL}/locations?skip=0&limit=5")
    print(f"First page status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total items: {data.get('total', 'N/A')}")
        print(f"Items returned: {len(data.get('items', []))}")
        print(f"Skip: {data.get('skip', 'N/A')}")
        print(f"Limit: {data.get('limit', 'N/A')}")
        
        # Test second page if there are more items
        if data.get('total', 0) > 5:
            response2 = requests.get(f"{BASE_URL}/locations?skip=5&limit=5")
            print(f"Second page status: {response2.status_code}")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"Second page items: {len(data2.get('items', []))}")
    else:
        print(f"Error: {response.text}")

def test_locations_filtered_pagination():
    """Test locations pagination with branch filter"""
    print("\nTesting locations pagination with branch filter...")
    
    # First get a branch ID
    response = requests.get(f"{BASE_URL}/locations/branches?skip=0&limit=1")
    if response.status_code == 200:
        data = response.json()
        if data.get('items'):
            branch_id = data['items'][0]['id']
            print(f"Testing with branch ID: {branch_id}")
            
            # Test filtered pagination
            response2 = requests.get(f"{BASE_URL}/locations?branch_id={branch_id}&skip=0&limit=5")
            print(f"Filtered first page status: {response2.status_code}")
            if response2.status_code == 200:
                data2 = response2.json()
                print(f"Total items: {data2.get('total', 'N/A')}")
                print(f"Items returned: {len(data2.get('items', []))}")
    else:
        print("Could not get branch ID for testing")

if __name__ == "__main__":
    print("Pagination Test Script")
    print("=" * 50)
    
    test_branches_pagination()
    test_locations_pagination()
    test_locations_filtered_pagination()
    
    print("\nTest completed!") 