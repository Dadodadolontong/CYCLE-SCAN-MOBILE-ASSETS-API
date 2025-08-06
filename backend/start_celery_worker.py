#!/usr/bin/env python3
"""
Celery Worker Startup Script
Run this script to start the Celery worker for background ERP sync tasks.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from celery_app import celery_app

if __name__ == "__main__":
    # Start the Celery worker
    celery_app.worker_main([
        "worker",
        "--loglevel=info",
        "--concurrency=1",  # Single worker process for ERP tasks
        "--queues=erp_sync",  # Only process ERP sync tasks
        "--hostname=erp_worker@%h"  # Unique worker name
    ]) 