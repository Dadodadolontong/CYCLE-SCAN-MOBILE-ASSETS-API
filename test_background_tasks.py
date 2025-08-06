#!/usr/bin/env python3
"""
Test script for background task system
This script tests the ERP sync background tasks without requiring the full application.
"""

import os
import sys
import time
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_celery_connection():
    """Test if Celery can connect to Redis"""
    try:
        from celery_app import celery_app
        
        # Test connection
        i = celery_app.control.inspect()
        stats = i.stats()
        
        if stats:
            print("✅ Celery connected to Redis successfully")
            print(f"Active workers: {len(stats)}")
            return True
        else:
            print("⚠️  No active Celery workers found")
            print("Make sure to start the Celery worker with:")
            print("cd backend && python start_celery_worker.py")
            return False
            
    except Exception as e:
        print(f"❌ Failed to connect to Celery/Redis: {e}")
        print("Make sure Redis is running and Celery is configured correctly")
        return False

def test_task_queuing():
    """Test if tasks can be queued"""
    try:
        from celery_app import celery_app
        from tasks.erp_tasks import sync_assets_from_oracle_task
        
        # Queue a test task
        task = sync_assets_from_oracle_task.delay(
            user_id="test-user",
            force_full_sync=False
        )
        
        print(f"✅ Task queued successfully")
        print(f"Task ID: {task.id}")
        print(f"Task Status: {task.status}")
        
        # Wait a moment and check status
        time.sleep(2)
        result = task.result
        print(f"Task Result: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to queue task: {e}")
        return False

def test_redis_connection():
    """Test direct Redis connection"""
    try:
        import redis
        from config import config
        
        r = redis.Redis(
            host=config.REDIS_HOST,
            port=config.REDIS_PORT,
            db=config.REDIS_DB,
            password=config.REDIS_PASSWORD,
            decode_responses=True
        )
        
        # Test connection
        r.ping()
        print("✅ Redis connection successful")
        
        # Test basic operations
        r.set("test_key", "test_value")
        value = r.get("test_key")
        r.delete("test_key")
        
        if value == "test_value":
            print("✅ Redis read/write operations successful")
            return True
        else:
            print("❌ Redis read/write operations failed")
            return False
            
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Background Task System")
    print("=" * 50)
    
    # Test Redis connection
    print("\n1. Testing Redis connection...")
    redis_ok = test_redis_connection()
    
    # Test Celery connection
    print("\n2. Testing Celery connection...")
    celery_ok = test_celery_connection()
    
    # Test task queuing
    print("\n3. Testing task queuing...")
    task_ok = test_task_queuing()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"Redis Connection: {'✅ PASS' if redis_ok else '❌ FAIL'}")
    print(f"Celery Connection: {'✅ PASS' if celery_ok else '❌ FAIL'}")
    print(f"Task Queuing: {'✅ PASS' if task_ok else '❌ FAIL'}")
    
    if all([redis_ok, celery_ok, task_ok]):
        print("\n🎉 All tests passed! Background task system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the setup instructions.")
        print("See BACKGROUND_TASKS_SETUP.md for detailed setup instructions.")

if __name__ == "__main__":
    main() 