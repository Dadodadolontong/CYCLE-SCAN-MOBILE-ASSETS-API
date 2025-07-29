import os
from dotenv import load_dotenv
import requests

load_dotenv()

OAUTH2_CLIENT_ID = os.getenv("OAUTH2_CLIENT_ID")
OAUTH2_CLIENT_SECRET = os.getenv("OAUTH2_CLIENT_SECRET")
OAUTH2_AUTH_URL = os.getenv("OAUTH2_AUTH_URL")
OAUTH2_TOKEN_URL = os.getenv("OAUTH2_TOKEN_URL")
OAUTH2_USERINFO_URL = os.getenv("OAUTH2_USERINFO_URL")
OAUTH2_SCOPES = os.getenv("OAUTH2_SCOPES", "openid email profile")
OAUTH2_REDIRECT_URI = os.getenv("OAUTH2_REDIRECT_URI")
OAUTH2_API_KEY = os.getenv("OAUTH2_API_KEY")
CUSTOM_LOAD = os.getenv("CUSTOM_LOAD") 
