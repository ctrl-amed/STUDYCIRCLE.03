"""Shared extension instances. Created WITHOUT an app, then bound with init_app() in app.py.
Every other module imports from here, which is what avoids circular imports."""
import google.generativeai as genai
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail
from flask_socketio import SocketIO
from itsdangerous import URLSafeTimedSerializer
from supabase import create_client, Client

import config

bcrypt = Bcrypt()
mail = Mail()
socketio = SocketIO(cors_allowed_origins="*", async_mode="threading")
limiter = Limiter(
    get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

genai.configure(api_key=config.GEMINI_API_KEY)

supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

token_serializer = URLSafeTimedSerializer(config.SECRET_KEY)
