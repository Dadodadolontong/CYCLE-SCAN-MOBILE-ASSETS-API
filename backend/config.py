import os
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    DATABASE_HOST: str = os.getenv("DATABASE_HOST")
    DATABASE_PORT: int = int(os.getenv("DATABASE_PORT", "3306"))
    DATABASE_NAME: str = os.getenv("DATABASE_NAME")
    DATABASE_USER: str = os.getenv("DATABASE_USER")
    DATABASE_PASSWORD: str = os.getenv("DATABASE_PASSWORD")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8002"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # CORS Configuration
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []

    # OAuth Configuration
    OAUTH_CLIENT_ID: str = os.getenv("OAUTH_CLIENT_ID", "")
    OAUTH_CLIENT_SECRET: str = os.getenv("OAUTH_CLIENT_SECRET", "")
    OAUTH_AUTH_URL: str = os.getenv("OAUTH_AUTH_URL", "")
    OAUTH_TOKEN_URL: str = os.getenv("OAUTH_TOKEN_URL", "")
    OAUTH_USER_INFO_URL: str = os.getenv("OAUTH_USER_INFO_URL", "")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Swagger UI Configuration
    SWAGGER_USERNAME: str = os.getenv("SWAGGER_USERNAME", "")
    SWAGGER_PASSWORD: str = os.getenv("SWAGGER_PASSWORD", "")

    # Testing Configuration
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

    # Environment
    NODE_ENV: str = os.getenv("NODE_ENV", "development")

    @classmethod
    def is_development(cls) -> bool:
        return cls.NODE_ENV.lower() == "development"

    @classmethod
    def is_production(cls) -> bool:
        return cls.NODE_ENV.lower() == "production"

    @classmethod
    def get_database_url(cls) -> str:
        """Construct database URL from components if not provided directly"""
        if cls.DATABASE_URL:
            return cls.DATABASE_URL
        
        # Validate required database components
        if not all([cls.DATABASE_HOST, cls.DATABASE_NAME, cls.DATABASE_USER, cls.DATABASE_PASSWORD]):
            raise ValueError("Missing required database configuration. Set DATABASE_URL or all of DATABASE_HOST, DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD")
        
        return f"mysql+pymysql://{cls.DATABASE_USER}:{cls.DATABASE_PASSWORD}@{cls.DATABASE_HOST}:{cls.DATABASE_PORT}/{cls.DATABASE_NAME}"

    @classmethod
    def validate_required_config(cls):
        """Validate that all required configuration is present"""
        errors = []
        
        # Check database configuration
        if not cls.DATABASE_URL and not all([cls.DATABASE_HOST, cls.DATABASE_NAME, cls.DATABASE_USER, cls.DATABASE_PASSWORD]):
            errors.append("Database configuration is incomplete")
        
        # Check security configuration
        if not cls.SECRET_KEY:
            errors.append("SECRET_KEY is required")
        
        # Check CORS configuration
        if not cls.ALLOWED_ORIGINS:
            errors.append("ALLOWED_ORIGINS is required")
        
        # Check Swagger configuration
        if not cls.SWAGGER_USERNAME or not cls.SWAGGER_PASSWORD:
            errors.append("SWAGGER_USERNAME and SWAGGER_PASSWORD are required")
        
        if errors:
            raise ValueError(f"Configuration validation failed: {'; '.join(errors)}")

# Create config instance
config = Config()

# Validate configuration on import
config.validate_required_config() 