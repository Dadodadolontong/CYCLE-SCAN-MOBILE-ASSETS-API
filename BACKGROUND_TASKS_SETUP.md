# Background Tasks Setup for ERP Sync

This document explains how to set up and run the background task system for ERP synchronization operations.

## Overview

The ERP sync operations have been moved to background tasks using Celery with Redis as the message broker. This allows long-running sync operations to be processed asynchronously without blocking the web interface.

## Architecture

- **Celery**: Task queue system for background job processing
- **Redis**: Message broker for task queuing and result storage
- **FastAPI**: Web API that queues tasks and provides status updates
- **Frontend**: React interface that monitors task progress

## Prerequisites

1. **Redis Server**: Required for task queuing and result storage
2. **Python Dependencies**: Celery and Redis Python packages
3. **Environment Configuration**: Redis connection settings

## Installation

### 1. Install Redis

**Windows:**
```bash
# Download Redis for Windows from https://github.com/microsoftarchive/redis/releases
# Or use WSL2 with Ubuntu and install Redis there
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
```

### 2. Install Python Dependencies

```bash
cd backend
pip install celery==5.3.4 redis==5.0.1
```

### 3. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Redis Configuration for Background Tasks
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

## Running the System

### 1. Start Redis Server

**Windows:**
```bash
redis-server
```

**Linux/macOS:**
```bash
sudo systemctl start redis-server
# or
redis-server
```

### 2. Start Celery Worker

In a new terminal, navigate to the backend directory and run:

```bash
cd backend
python start_celery_worker.py
```

Or use the Celery command directly:

```bash
cd backend
celery -A celery_app worker --loglevel=info --concurrency=1 --queues=erp_sync
```

### 3. Start FastAPI Server

In another terminal:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8002
```

### 4. Start Frontend

In another terminal:

```bash
cd frontend
npm run dev
```

## Usage

### Starting ERP Sync Tasks

1. Navigate to the Admin Panel → ERP Sync Management
2. Click "Start Asset Sync" or "Start Location Sync"
3. The system will queue the task and return a task ID
4. The frontend will automatically monitor the task progress

### Monitoring Task Progress

- **Real-time Updates**: The frontend polls the task status every 2 seconds
- **Progress Information**: Shows current step, assets processed, and any errors
- **Task History**: All completed tasks are stored in the database

### Task States

- **PENDING**: Task is queued and waiting to be processed
- **PROGRESS**: Task is currently running
- **SUCCESS**: Task completed successfully
- **FAILURE**: Task failed with an error

## API Endpoints

### Start Background Tasks

```http
POST /erp/sync-assets?force_full_sync=false
POST /erp/sync-locations
```

Response:
```json
{
  "success": true,
  "message": "Asset sync started in background",
  "task_id": "abc123-def456-ghi789",
  "status": "PENDING"
}
```

### Check Task Status

```http
GET /erp/task-status/{task_id}
```

Response:
```json
{
  "task_id": "abc123-def456-ghi789",
  "status": "PROGRESS",
  "progress": {
    "message": "Processing 1500 assets...",
    "progress": "1500/3000",
    "assets_processed": 1500,
    "assets_created": 1200,
    "assets_updated": 300
  }
}
```

## Configuration Options

### Celery Configuration

The Celery configuration is in `backend/celery_app.py`:

- **Task Time Limit**: 30 minutes maximum
- **Soft Time Limit**: 25 minutes (graceful shutdown)
- **Concurrency**: 1 worker process (configurable)
- **Queue**: Dedicated `erp_sync` queue

### Redis Configuration

- **Host**: Configurable via `REDIS_HOST` environment variable
- **Port**: Configurable via `REDIS_PORT` environment variable
- **Database**: Configurable via `REDIS_DB` environment variable
- **Password**: Optional, configurable via `REDIS_PASSWORD` environment variable

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis server is running
   - Check Redis host/port configuration
   - Verify Redis is accessible from the application

2. **Celery Worker Not Starting**
   - Check Python path and dependencies
   - Ensure Redis is running
   - Verify Celery configuration

3. **Tasks Not Processing**
   - Check worker is running and connected to Redis
   - Verify queue configuration
   - Check worker logs for errors

4. **Task Timeout**
   - Increase task time limits in Celery configuration
   - Check for long-running database queries
   - Monitor system resources

### Logs

**Celery Worker Logs:**
```bash
# Check worker logs for task processing details
tail -f celery.log
```

**FastAPI Logs:**
```bash
# Check API logs for task queuing
tail -f uvicorn.log
```

**Redis Logs:**
```bash
# Check Redis logs for connection issues
tail -f /var/log/redis/redis-server.log
```

## Production Deployment

### Docker Setup

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  celery_worker:
    build: ./backend
    command: python start_celery_worker.py
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  fastapi:
    build: ./backend
    command: uvicorn main:app --host 0.0.0.0 --port 8002
    ports:
      - "8002:8002"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

volumes:
  redis_data:
```

### Systemd Service (Linux)

Create `/etc/systemd/system/celery-worker.service`:

```ini
[Unit]
Description=Celery Worker for ERP Sync
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/path/to/venv/bin/python start_celery_worker.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable celery-worker
sudo systemctl start celery-worker
```

## Monitoring and Maintenance

### Health Checks

- Monitor Redis memory usage
- Check Celery worker status
- Monitor task queue length
- Track task completion rates

### Performance Tuning

- Adjust Celery concurrency based on system resources
- Configure Redis memory limits
- Optimize database queries in sync operations
- Monitor and adjust task timeouts

### Backup and Recovery

- Backup Redis data regularly
- Monitor task results and error logs
- Implement task retry mechanisms
- Set up alerting for failed tasks 