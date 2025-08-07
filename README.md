# Asset Management System

A comprehensive web-based asset management solution with real-time tracking, cycle counting, ERP integration, and role-based access control.

## 📋 Overview

The Asset Management System is a modern, scalable solution designed to manage physical assets across multiple locations, countries, and regions. It provides complete visibility of assets, streamlines cycle counting processes, and integrates seamlessly with Oracle ERP systems.

### 🎯 Key Features

- **Asset Management**: Complete CRUD operations with barcode support
- **Location Hierarchy**: Multi-level location management (Country → Region → Branch → Location)
- **Cycle Counting**: Automated task creation and execution with mobile support
- **ERP Integration**: Real-time synchronization with Oracle ERP database
- **User Management**: Role-based access control with OAuth2 authentication
- **Asset Transfers**: Inter-location transfers with approval workflows
- **Background Processing**: Asynchronous task processing for large operations
- **Reporting**: Comprehensive audit logs and system reports

### 🏗️ Architecture

- **Backend**: FastAPI (Python) with SQLAlchemy ORM
- **Frontend**: React with TypeScript and Tailwind CSS
- **Database**: MySQL/PostgreSQL with Alembic migrations
- **Background Tasks**: Celery with Redis message broker
- **Authentication**: JWT + OAuth2 (Google, Microsoft)
- **ERP Integration**: Direct Oracle database connection

## 🚀 Quick Start

### Prerequisites
- Python 3.8+, Node.js 18+, MySQL/PostgreSQL, Redis
- Git, Docker (optional)

### Installation

1. **Clone Repository**
```bash
git clone <repository-url>
cd asset-management-system
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Edit .env with your configuration
```

3. **Frontend Setup**
```bash
cd ../frontend
npm install
cp env.example .env
# Edit .env with your configuration
```

4. **Database Setup**
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

5. **Start Services**
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

## 📚 Documentation

### Core Documentation
- **[Product Requirements Document (PRD)](PRD.md)** - Comprehensive product specifications and requirements
- **[System Architecture](ARCHITECTURE.md)** - Detailed technical architecture and design decisions
- **[Setup Guide](SETUP.md)** - Complete installation and configuration instructions
- **[API Documentation](API_DOCUMENTATION.md)** - REST API reference and examples

### Specialized Documentation
- **[Background Tasks Setup](BACKGROUND_TASKS_SETUP.md)** - Celery and Redis configuration
- **[ERP Integration](ORACLE_ERP_INTEGRATION.md)** - Oracle database integration guide
- **[OAuth Architecture](OAUTH_ARCHITECTURE.md)** - Authentication system design
- **[Deployment Configuration](DEPLOYMENT_CONFIGURATION.md)** - Production deployment guide

## 🔧 Configuration

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

## 🗄️ Database Schema

### Core Entities
- **Users**: User accounts and profiles
- **UserRoles**: Role-based access control
- **Countries**: Geographic hierarchy
- **Regions**: Geographic hierarchy  
- **Branches**: Geographic hierarchy
- **Locations**: Physical locations
- **Assets**: Asset inventory
- **Categories**: Asset categorization

### Operational Tables
- **CycleCountTasks**: Cycle counting tasks
- **CycleCountItems**: Individual count items
- **TempAssets**: Temporary asset data
- **AssetTransfers**: Asset transfer requests
- **AssetTransferItems**: Transfer line items
- **AssetTransferApprovals**: Transfer approvals

### System Tables
- **SyncLogs**: ERP synchronization logs
- **ERPSyncConfigs**: Sync configuration
- **AuditLogs**: System audit trail
- **OAuthProviders**: OAuth configuration
- **SystemSettings**: Application settings
- **UserSessions**: Session management
- **RateLimits**: API rate limiting

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Email/password authentication
- `GET /auth/oauth-providers` - Get OAuth providers
- `GET /auth/authorize/{provider}` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback handler

### Core APIs
- `GET/POST /assets` - Asset management
- `GET/POST /locations` - Location management
- `GET/POST /countries` - Country management
- `GET/POST /regions` - Region management
- `GET/POST /branches` - Branch management
- `GET/POST /users` - User management
- `GET/POST /user-roles` - Role management
- `GET/POST /user-assignments` - User assignments

### Cycle Counting
- `GET/POST /cycle-count-tasks` - Task management
- `GET/POST/PUT /cycle-count-items` - Item management
- `GET/POST /categories` - Category management
- `GET/POST /temp-assets` - Temporary assets

### ERP Integration
- `POST /erp/test-connection` - Test Oracle connection
- `POST /erp/sync-assets` - Sync assets from ERP
- `POST /erp/sync-locations` - Sync locations from ERP
- `GET /erp/sync-history` - Sync history
- `GET /erp/sync-config` - Sync configuration
- `GET /erp/locations-mapping` - Location mapping

### Background Tasks
- `GET /task-status/{task_id}` - Get task status
- `GET /tasks/history` - Task history

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

### API Testing
```bash
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

## 🚀 Deployment

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

## 🔒 Security

### Security Features
- JWT token-based authentication
- OAuth2 integration (Google, Microsoft)
- Role-based access control (RBAC)
- Location-based data access control
- API rate limiting
- Input validation and sanitization
- SQL injection prevention
- Comprehensive audit logging

### Security Checklist
- [ ] Change default passwords
- [ ] Configure HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Set up backup strategy
- [ ] Enable audit logging
- [ ] Regular security updates

## 📊 Performance

### Performance Metrics
- **Concurrent Users**: 1000+
- **Page Load Time**: < 3 seconds
- **ERP Sync Time**: < 30 minutes for 10,000+ assets
- **Search Response**: < 2 seconds
- **System Uptime**: 99.9%

### Optimization Features
- Database query optimization
- Pagination for large datasets
- Background task processing
- Redis caching
- CDN for static assets
- Horizontal scaling support

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
sudo systemctl status mysql
mysql -u username -p -h localhost
```

#### Redis Connection
```bash
sudo systemctl status redis
redis-cli ping
```

#### Celery Issues
```bash
ps aux | grep celery
pkill -f celery
celery -A celery_app worker --loglevel=info
```

#### Frontend Build Issues
```bash
rm -rf node_modules package-lock.json
npm install
node --version
```

### Performance Monitoring
```bash
# System resources
htop
iostat

# API performance
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:8000/api/assets"

# Database performance
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

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and code quality checks
5. Submit a pull request

### Code Standards
- Follow PEP 8 for Python code
- Use TypeScript for frontend code
- Write comprehensive tests
- Update documentation
- Follow commit message conventions

## 📞 Support

### Documentation Resources
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Redis Documentation](https://redis.io/documentation)

### Community Support
- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord/Slack Channels](https://your-community-link)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

### Phase 2 Features
- Mobile application for field operations
- Advanced analytics and reporting
- Barcode scanning integration
- Asset maintenance tracking
- Integration with additional ERP systems

### Phase 3 Features
- AI-powered asset optimization
- Predictive maintenance
- Advanced workflow automation
- Multi-language support
- Advanced security features

## 📈 Success Metrics

### Technical Success
- All functional requirements implemented and tested
- Performance benchmarks met
- Security requirements satisfied
- Integration with ERP system successful

### Business Success
- 80% user adoption within 3 months
- 50% reduction in cycle counting time
- 95% asset tracking accuracy
- Positive user feedback (>4.0/5.0 rating)

---

**Asset Management System** - Comprehensive asset tracking and management solution for modern enterprises.
