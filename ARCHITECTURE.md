# System Architecture Document
# Asset Management System

## 1. Overview

### 1.1 Architecture Pattern
The Asset Management System follows a **Microservices-inspired Monolithic Architecture** with clear separation of concerns, modular design, and scalable components. The system is built using modern web technologies with a focus on performance, security, and maintainability.

### 1.2 High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Background    │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   Tasks         │
│                 │    │                 │    │   (Celery)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (MySQL)       │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Oracle ERP    │
                       │   Database      │
                       └─────────────────┘
```

## 2. System Components

### 2.1 Frontend Layer (React + TypeScript)

#### 2.1.1 Technology Stack
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **UI Components**: Custom components with shadcn/ui
- **HTTP Client**: Custom FastAPI client

#### 2.1.2 Architecture Principles
- **Component-Based**: Modular, reusable components
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Mobile-first approach
- **Progressive Web App**: PWA capabilities
- **Configurable Deployment**: Environment-based configuration

#### 2.1.3 Key Components
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── admin/          # Admin-specific components
│   └── forms/          # Form components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── integrations/       # API integrations
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

### 2.2 Backend Layer (FastAPI + Python)

#### 2.2.1 Technology Stack
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: MySQL/PostgreSQL
- **Authentication**: JWT + OAuth2
- **Background Tasks**: Celery + Redis
- **Validation**: Pydantic
- **Documentation**: OpenAPI/Swagger

#### 2.2.2 Architecture Principles
- **RESTful API**: Standard REST endpoints
- **Service Layer**: Business logic separation
- **Dependency Injection**: FastAPI dependency system
- **Async Support**: Non-blocking operations
- **Type Safety**: Pydantic models

#### 2.2.3 Key Components
```
backend/
├── routes/             # API route handlers
├── services/           # Business logic layer
├── models/             # Database models
├── schemas/            # Pydantic schemas
├── auth/               # Authentication logic
├── tasks/              # Background tasks
├── utils/              # Utility functions
└── config/             # Configuration management
```

### 2.3 Database Layer

#### 2.3.1 Primary Database (MySQL/PostgreSQL)
- **Purpose**: Application data storage
- **Schema**: Normalized relational design
- **Migrations**: Alembic for schema management
- **Backup**: Automated backup strategies

#### 2.3.2 Key Database Tables
```sql
-- Core Entities
users                    # User accounts and profiles
user_roles              # Role-based access control
countries               # Geographic hierarchy
regions                 # Geographic hierarchy
branches                # Geographic hierarchy
locations               # Physical locations
assets                  # Asset inventory
categories              # Asset categorization

-- Operational Tables
cycle_count_tasks       # Cycle counting tasks
cycle_count_items       # Individual count items
temp_assets             # Temporary asset data
asset_transfers         # Asset transfer requests
asset_transfer_items    # Transfer line items
asset_transfer_approvals # Transfer approvals

-- System Tables
sync_logs               # ERP synchronization logs
erp_sync_configs        # Sync configuration
audit_logs              # System audit trail
oauth_providers         # OAuth configuration
system_settings         # Application settings
user_sessions           # Session management
rate_limits             # API rate limiting
```

#### 2.3.3 External Database (Oracle ERP)
- **Purpose**: Source of truth for asset data
- **Integration**: Direct database connection
- **Synchronization**: Background task processing
- **Data Mapping**: Custom mapping logic

### 2.4 Background Processing Layer

#### 2.4.1 Technology Stack
- **Task Queue**: Celery
- **Message Broker**: Redis
- **Task Monitoring**: Celery Flower (optional)
- **Error Handling**: Comprehensive error tracking

#### 2.4.2 Background Tasks
- **ERP Asset Sync**: Synchronize assets from Oracle
- **ERP Location Sync**: Synchronize locations from Oracle
- **Data Processing**: Large dataset operations
- **Report Generation**: Complex report calculations

## 3. Data Architecture

### 3.1 Data Flow

#### 3.1.1 Asset Synchronization Flow
```
Oracle ERP → ERP Integration Service → Asset Processing → Database
     ↓              ↓                        ↓              ↓
  Raw Data    →  Data Mapping    →    Validation    →   Storage
```

#### 3.1.2 User Authentication Flow
```
User Login → OAuth/Password → JWT Token → API Access
     ↓           ↓              ↓           ↓
  Frontend  →  Backend    →  Token Gen  →  Protected Routes
```

#### 3.1.3 Cycle Count Flow
```
Task Creation → Assignment → Execution → Review → Completion
      ↓           ↓           ↓         ↓         ↓
   Admin UI   →  User UI  →  Mobile   →  Review  →  Reports
```

### 3.2 Data Models

#### 3.2.1 Core Entity Relationships
```
User (1) ←→ (N) UserRole
User (1) ←→ (N) UserAssignment
Country (1) ←→ (N) Region
Region (1) ←→ (N) Branch
Branch (1) ←→ (N) Location
Location (1) ←→ (N) Asset
Asset (1) ←→ (N) CycleCountItem
```

#### 3.2.2 Asset Lifecycle
```
ERP Import → Asset Creation → Location Assignment → Cycle Count → Transfer → Disposal
     ↓           ↓                ↓                ↓           ↓         ↓
  Oracle DB  →  Asset Table  →  Location Link  →  Count Task → Transfer → Status Update
```

## 4. Security Architecture

### 4.1 Authentication & Authorization

#### 4.1.1 Authentication Methods
- **OAuth2**: Google, Microsoft, custom providers
- **Email/Password**: Traditional authentication
- **JWT Tokens**: Stateless session management
- **Session Management**: Automatic timeout handling

#### 4.1.2 Authorization Model
- **Role-Based Access Control (RBAC)**: Admin, Manager, User roles
- **Location-Based Access**: Geographic data access control
- **Resource-Level Permissions**: Granular permission system
- **API Rate Limiting**: Protection against abuse

### 4.2 Data Security

#### 4.2.1 Data Protection
- **Encryption**: HTTPS/TLS for data in transit
- **Password Hashing**: bcrypt for password storage
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries

#### 4.2.2 Audit & Compliance
- **Audit Logging**: Comprehensive activity tracking
- **Data Retention**: Configurable retention policies
- **Access Monitoring**: Real-time access tracking
- **Compliance Reporting**: Automated compliance reports

## 5. Integration Architecture

### 5.1 ERP Integration

#### 5.1.1 Oracle Database Integration
- **Connection**: Direct database connection using python-oracledb
- **Data Mapping**: Custom mapping between ERP and application schemas
- **Synchronization**: Incremental and full sync capabilities
- **Error Handling**: Robust error handling and recovery

#### 5.1.2 Integration Patterns
```
Oracle ERP → Data Extraction → Transformation → Loading → Application DB
     ↓           ↓                ↓            ↓           ↓
  Source Data → Query Engine → Data Mapper → Validator → Target DB
```

### 5.2 OAuth Integration

#### 5.2.1 OAuth2 Flow
```
User → Frontend → Backend → OAuth Provider → Backend → Frontend → User
 ↓       ↓         ↓           ↓            ↓         ↓         ↓
Login → Redirect → Auth Code → Token → User Info → Session → Dashboard
```

#### 5.2.2 Provider Configuration
- **Dynamic Configuration**: Database-stored OAuth settings
- **Multiple Providers**: Support for multiple OAuth providers
- **Token Management**: Secure token storage and refresh
- **User Mapping**: OAuth user to application user mapping

## 6. Deployment Architecture

### 6.1 Development Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (localhost)   │◄──►│   (localhost)   │◄──►│   (localhost)   │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 6.2 Production Environment
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │   Database      │
│   (Nginx)       │◄──►│   (FastAPI)     │◄──►│   (MySQL)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Background    │
                       │   (Celery)      │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Message Queue │
                       │   (Redis)       │
                       └─────────────────┘
```

### 6.3 Container Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Frontend      │   Backend       │   Infrastructure        │
│   Container     │   Container     │   Containers            │
│                 │                 │                         │
│   - React App   │   - FastAPI     │   - MySQL               │
│   - Nginx       │   - Celery      │   - Redis               │
│   - Static      │   - Workers     │   - Monitoring          │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## 7. Performance Architecture

### 7.1 Caching Strategy
- **Application Cache**: Redis for session and temporary data
- **Database Cache**: Query result caching
- **Static Assets**: CDN for frontend assets
- **API Response**: Response caching for frequently accessed data

### 7.2 Scalability Patterns
- **Horizontal Scaling**: Multiple backend instances
- **Load Balancing**: Nginx load balancer
- **Database Scaling**: Read replicas and connection pooling
- **Background Processing**: Distributed task processing

### 7.3 Performance Optimization
- **Database Indexing**: Optimized database indexes
- **Query Optimization**: Efficient SQL queries
- **Pagination**: Large dataset pagination
- **Lazy Loading**: On-demand data loading

## 8. Monitoring & Observability

### 8.1 Logging Strategy
- **Application Logs**: Structured logging with levels
- **Access Logs**: API access and performance metrics
- **Error Logs**: Comprehensive error tracking
- **Audit Logs**: User activity and system changes

### 8.2 Monitoring Components
- **Health Checks**: Application health monitoring
- **Performance Metrics**: Response time and throughput
- **Resource Monitoring**: CPU, memory, disk usage
- **Business Metrics**: User activity and system usage

### 8.3 Alerting
- **System Alerts**: Critical system failures
- **Performance Alerts**: Performance degradation
- **Security Alerts**: Security incidents
- **Business Alerts**: Business rule violations

## 9. Disaster Recovery

### 9.1 Backup Strategy
- **Database Backups**: Automated daily backups
- **Configuration Backups**: System configuration backups
- **Code Backups**: Version control and deployment backups
- **Data Recovery**: Point-in-time recovery capabilities

### 9.2 High Availability
- **Redundancy**: Multiple server instances
- **Failover**: Automatic failover mechanisms
- **Data Replication**: Database replication
- **Geographic Distribution**: Multi-region deployment

## 10. Technology Decisions

### 10.1 Framework Choices
- **FastAPI**: High performance, automatic documentation, type safety
- **React**: Component-based, large ecosystem, TypeScript support
- **SQLAlchemy**: Mature ORM, database agnostic, migration support
- **Celery**: Robust task queue, Redis integration, monitoring

### 10.2 Database Choices
- **MySQL/PostgreSQL**: Reliable, well-supported, ACID compliance
- **Redis**: Fast in-memory storage, pub/sub capabilities
- **Oracle**: Enterprise ERP integration requirements

### 10.3 Deployment Choices
- **Docker**: Containerization, consistent environments
- **Nginx**: High-performance web server, load balancing
- **Vite**: Fast build tool, modern development experience

## 11. Future Architecture Considerations

### 11.1 Microservices Migration
- **Service Decomposition**: Breaking monolith into services
- **API Gateway**: Centralized API management
- **Service Discovery**: Dynamic service registration
- **Distributed Tracing**: Cross-service request tracking

### 11.2 Cloud Migration
- **Cloud Providers**: AWS, Azure, or GCP deployment
- **Serverless**: Function-as-a-Service for specific components
- **Managed Services**: Database and message queue services
- **Auto-scaling**: Cloud-native scaling capabilities

### 11.3 Advanced Features
- **Real-time Updates**: WebSocket integration
- **Mobile API**: Dedicated mobile application API
- **Analytics Platform**: Advanced reporting and analytics
- **AI/ML Integration**: Predictive analytics and automation 