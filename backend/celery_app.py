import os
from celery import Celery
from config import config

# Create Celery instance
celery_app = Celery(
    "asset_management",
    broker=f"redis://{config.REDIS_HOST}:{config.REDIS_PORT}/{config.REDIS_DB}",
    backend=f"redis://{config.REDIS_HOST}:{config.REDIS_PORT}/{config.REDIS_DB}",
    include=["tasks.erp_tasks"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    broker_connection_retry=True,
    broker_connection_retry_on_startup=True,
)

# Optional: Configure task routing
celery_app.conf.task_routes = {
    "tasks.erp_tasks.*": {"queue": "erp_sync"},
}

if __name__ == "__main__":
    celery_app.start() 