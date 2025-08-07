# Setup and Installation Guide
# Asset Management System

## Quick Start

### 1. Prerequisites
- Python 3.8+, Node.js 18+, MySQL/PostgreSQL, Redis
- Git, Docker (optional)

### 2. Clone and Setup
```bash
git clone <repository-url>
cd asset-management-system

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration

# Frontend setup
cd ../frontend
npm install
cp env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE asset_management;

# Run migrations
cd backend
alembic upgrade head

# Create admin user
python create_admin_user.py
```

### 4. Start Services
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Background tasks
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=1 --queues=erp_sync

# Terminal 4: Redis (if not running as service)
redis-server
```

## Detailed Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/asset_management
SECRET_KEY=your-secret-key

# Frontend
FRONTEND_URL=http://localhost:3000
FRONTEND_HOST=localhost
FRONTEND_PORT=3000

# OAuth
OAUTH2_CLIENT_ID=your-oauth-client-id
OAUTH2_CLIENT_SECRET=your-oauth-client-secret
OAUTH2_AUTHORIZE_URL=https://accounts.google.com/o/oauth2/auth
OAUTH2_TOKEN_URL=https://oauth2.googleapis.com/token
OAUTH2_USER_INFO_URL=https://www.googleapis.com/oauth2/v2/userinfo
OAUTH_REDIRECT_URI=http://localhost:8000/auth/callback
OAUTH_SCOPES=openid email profile

# Oracle ERP
ORACLE_HOST=your-oracle-host
ORACLE_PORT=1521
ORACLE_SERVICE=your-service-name
ORACLE_USERNAME=your-username
ORACLE_PASSWORD=your-password
ORACLE_SCHEMA=your-schema
ORACLE_CLIENT_PATH=/path/to/oracle/client

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# Security
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:8080"]
SWAGGER_USERNAME=admin
SWAGGER_PASSWORD=admin123
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_APP_TITLE=Asset Management System
VITE_APP_SHORT_NAME=AssetMgmt
VITE_APP_DESCRIPTION=Comprehensive asset management solution
VITE_BASE_PATH=/
VITE_FRONTEND_HOST=localhost
VITE_FRONTEND_PORT=3000
```

### Database Setup

#### MySQL
```bash
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation

mysql -u root -p
CREATE DATABASE asset_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'asset_user'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON asset_management.* TO 'asset_user'@'localhost';
FLUSH PRIVILEGES;
```

#### PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

sudo -u postgres psql
CREATE DATABASE asset_management;
CREATE USER asset_user WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE asset_management TO asset_user;
```

### Redis Setup
```bash
sudo apt install redis-server
sudo systemctl start redis
redis-cli ping  # Should return PONG
```

### Oracle ERP Integration

#### Install Oracle Client
```bash
# Download Oracle Instant Client from Oracle website
# Linux
sudo apt install libaio1
sudo unzip instantclient-basic-linux.x64-21.1.0.0.0.zip -d /opt/oracle
export LD_LIBRARY_PATH=/opt/oracle/instantclient_21_1:$LD_LIBRARY_PATH

# Install Python driver
pip install oracledb
```

#### Test Oracle Connection
```python
import oracledb
connection = oracledb.connect(
    user='your-username',
    password='your-password',
    host='your-host',
    port=1521,
    service_name='your-service'
)
print('Oracle connection successful')
connection.close()
```

### OAuth Configuration

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project and enable Google+ API
3. Create OAuth 2.0 credentials
4. Configure redirect URI: `http://localhost:8000/auth/callback`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register new application
3. Configure redirect URIs
4. Get client ID and secret

## Development Workflow

### Start Development Environment
```bash
# Terminal 1: Backend API
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend Development
cd frontend
npm run dev

# Terminal 3: Background Tasks
cd backend
source venv/bin/activate
celery -A celery_app worker --loglevel=info --concurrency=1 --queues=erp_sync

# Terminal 4: Redis (if not running as service)
redis-server
```

### Testing
```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# API testing
curl -X GET "http://localhost:8000/api/assets" \
  -H "Authorization: Bearer your-token"
```

### Code Quality
```bash
# Backend
cd backend
black .  # Format code
flake8 .  # Lint code
mypy .   # Type checking

# Frontend
cd frontend
npm run format  # Format code
npm run lint    # Lint code
npm run type-check  # Type checking
```

## Production Deployment

### Docker Deployment
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment
```bash
# Backend
sudo mkdir -p /opt/asset-management
sudo cp -r backend /opt/asset-management/
cd /opt/asset-management/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm run build
sudo cp -r dist/* /var/www/html/
```

### Systemd Services
```ini
# /etc/systemd/system/asset-management.service
[Unit]
Description=Asset Management Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/asset-management/backend
Environment=PATH=/opt/asset-management/backend/venv/bin
ExecStart=/opt/asset-management/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check database service
sudo systemctl status mysql

# Test connection
mysql -u username -p -h localhost
```

#### Redis Connection
```bash
# Check Redis service
sudo systemctl status redis

# Test connection
redis-cli ping
```

#### Celery Issues
```bash
# Check worker status
ps aux | grep celery

# Restart worker
pkill -f celery
celery -A celery_app worker --loglevel=info
```

#### Frontend Build Issues
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version
```

### Performance Monitoring
```bash
# Check system resources
htop
iostat

# Monitor API performance
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8000/api/assets"

# Check database performance
mysql -u root -p -e "SHOW PROCESSLIST;"
```

### Log Analysis
```bash
# Backend logs
tail -f /var/log/asset-management/app.log

# Frontend logs (browser console)
# Open Developer Tools (F12) → Console tab

# Nginx logs
tail -f /var/log/nginx/access.log
```

## Security Checklist

- [ ] Change default passwords
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up backup strategy
- [ ] Enable audit logging
- [ ] Regular security updates

## Support Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Redis Documentation](https://redis.io/documentation) 