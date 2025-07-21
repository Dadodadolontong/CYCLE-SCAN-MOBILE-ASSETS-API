from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from routes_locations import router as locations_router
from routes_countries import router as countries_router
from routes_regions import router as regions_router
from routes_assets import router as assets_router
from routes_users import router as users_router
from routes_user_roles import router as user_roles_router
from routes_user_assignments import router as user_assignments_router
from routes_data_management import router as data_management_router
from db import engine, SessionLocal
from routes_auth import router as auth_router
from auth import get_current_user, require_role, authenticate_user
from routes_categories import router as categories_router
from routes_temp_assets import router as temp_assets_router
from routes_cycle_count_tasks import router as cycle_count_tasks_router
from routes_cycle_count_items import router as cycle_count_items_router
from routes_admin import router as admin_router

load_dotenv()

app = FastAPI(docs_url=None, redoc_url=None)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080", 
        "http://127.0.0.1:8080",  # <--- Add this line
        "http://localhost:3000", 
        "http://127.0.0.1:3000",  # <--- Add this if you use 3000
        "http://localhost:5173",
        "http://127.0.0.1:5173",  # <--- Add this if you use 5173
        "http://192.168.93.123:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Basic auth for Swagger UI
security = HTTPBasic()

def get_swagger_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    # You can store these in environment variables for production
    correct_username = "admin"
    correct_password = "admin123"
    
    if credentials.username != correct_username or credentials.password != correct_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html(credentials: HTTPBasicCredentials = Depends(get_swagger_credentials)):
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html(credentials: HTTPBasicCredentials = Depends(get_swagger_credentials)):
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js",
    )

# Include routers
app.include_router(locations_router)
app.include_router(countries_router)
app.include_router(regions_router)
app.include_router(assets_router)
app.include_router(users_router)
app.include_router(user_roles_router)
app.include_router(user_assignments_router)
app.include_router(data_management_router)
app.include_router(categories_router)
app.include_router(temp_assets_router)
app.include_router(cycle_count_tasks_router)
app.include_router(cycle_count_items_router)
app.include_router(auth_router)
app.include_router(admin_router)

@app.get("/")
def read_root():
    return {"message": "FastAPI backend is running!"}

@app.get("/health")
def health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/protected")
async def protected_route(current_user = Depends(get_current_user)):
    return {"message": f"Hello {current_user.email}, this is a protected route!"}

@app.get("/admin-only")
async def admin_only_route(current_user = Depends(require_role("admin"))):
    return {"message": "This is admin only content!"} 