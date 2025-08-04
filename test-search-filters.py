#!/usr/bin/env python3
"""
Test script to verify search filters with wildcards for branches and locations
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8200"

def test_branch_search():
    """Test branch search functionality"""
    print("Testing branch search functionality...")
    
    # Test search for branches containing "main"
    response = requests.get(f"{BASE_URL}/locations/branches?search=main&skip=0&limit=10")
    print(f"Search 'main' status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total items found: {data.get('total', 'N/A')}")
        print(f"Items returned: {len(data.get('items', []))}")
        for item in data.get('items', []):
            print(f"  - {item.get('name', 'N/A')}")
    
    # Test search for branches containing "office"
    response2 = requests.get(f"{BASE_URL}/locations/branches?search=office&skip=0&limit=10")
    print(f"\nSearch 'office' status: {response2.status_code}")
    if response2.status_code == 200:
        data2 = response2.json()
        print(f"Total items found: {data2.get('total', 'N/A')}")
        print(f"Items returned: {len(data2.get('items', []))}")
        for item in data2.get('items', []):
            print(f"  - {item.get('name', 'N/A')}")
    
    # Test search with region filter
    response3 = requests.get(f"{BASE_URL}/locations/branches?search=main&region_id=test-region-id&skip=0&limit=10")
    print(f"\nSearch 'main' with region filter status: {response3.status_code}")
    if response3.status_code == 200:
        data3 = response3.json()
        print(f"Total items found: {data3.get('total', 'N/A')}")

def test_location_search():
    """Test location search functionality"""
    print("\nTesting location search functionality...")
    
    # Test search for locations containing "warehouse"
    response = requests.get(f"{BASE_URL}/locations?search=warehouse&skip=0&limit=10")
    print(f"Search 'warehouse' status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total items found: {data.get('total', 'N/A')}")
        print(f"Items returned: {len(data.get('items', []))}")
        for item in data.get('items', []):
            print(f"  - {item.get('name', 'N/A')}")
    
    # Test search for locations containing "room"
    response2 = requests.get(f"{BASE_URL}/locations?search=room&skip=0&limit=10")
    print(f"\nSearch 'room' status: {response2.status_code}")
    if response2.status_code == 200:
        data2 = response2.json()
        print(f"Total items found: {data2.get('total', 'N/A')}")
        print(f"Items returned: {len(data2.get('items', []))}")
        for item in data2.get('items', []):
            print(f"  - {item.get('name', 'N/A')}")
    
    # Test search with branch filter
    response3 = requests.get(f"{BASE_URL}/locations?search=warehouse&branch_id=test-branch-id&skip=0&limit=10")
    print(f"\nSearch 'warehouse' with branch filter status: {response3.status_code}")
    if response3.status_code == 200:
        data3 = response3.json()
        print(f"Total items found: {data3.get('total', 'N/A')}")

def test_wildcard_search():
    """Test wildcard search patterns"""
    print("\nTesting wildcard search patterns...")
    
    # Test partial word search (should work like wildcard)
    response = requests.get(f"{BASE_URL}/locations/branches?search=off&skip=0&limit=5")
    print(f"Partial search 'off' status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total items found: {data.get('total', 'N/A')}")
        for item in data.get('items', []):
            print(f"  - {item.get('name', 'N/A')}")
    
    # Test case insensitive search
    response2 = requests.get(f"{BASE_URL}/locations/branches?search=MAIN&skip=0&limit=5")
    print(f"\nCase insensitive search 'MAIN' status: {response2.status_code}")
    if response2.status_code == 200:
        data2 = response2.json()
        print(f"Total items found: {data2.get('total', 'N/A')}")

if __name__ == "__main__":
    print("Search Filters Test Script")
    print("=" * 50)
    
    test_branch_search()
    test_location_search()
    test_wildcard_search()
    
    print("\nTest completed!") 