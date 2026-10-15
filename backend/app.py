"""Main entry point. Run with:  python app.py

This file only wires things together: it creates the Flask app, binds the shared
extensions, registers every Blueprint and the Socket.IO handlers, and starts the
background jobs. All real logic lives in routes/, services/, sockets/ and utils/.
"""
import os

from flask import Flask
from flask_cors import CORS

import config
from extensions import bcrypt, limiter, mail, socketio, supabase

# Blueprints (HTTP routes)
from routes.admin import admin_bp
from routes.admin_dashboard import admin_dashboard_bp
from routes.ai_tools import ai_bp
from routes.auth import auth_bp
from routes.feedback import feedback_bp
from routes.friends import friends_bp
from routes.messages import messages_bp
from routes.profile import profile_bp
from routes.reminders import reminders_bp
from routes.reports import reports_bp
from routes.rooms import rooms_bp
from routes.study import study_bp
from routes.system import system_bp

# Socket.IO handlers register themselves on import
import sockets.presence_socket  # noqa: F401
import sockets.rooms_socket  # noqa: F401

from services.scheduler import start_scheduler
from services.suspension import preload_suspended_emails

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = config.DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Mail setup using environment variables
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv(
    'DEFAULT_MAIL_SENDER',
    f"StudyCircle <{os.getenv('MAIL_USERNAME')}>"
)

# Bind the shared extensions to the app
bcrypt.init_app(app)
mail.init_app(app)
limiter.init_app(app)
socketio.init_app(app)

# Register every Blueprint
for bp in (system_bp, auth_bp, profile_bp, reminders_bp, friends_bp, messages_bp,
           study_bp, ai_bp, rooms_bp, feedback_bp, reports_bp, admin_bp, admin_dashboard_bp):
    app.register_blueprint(bp)

# ---- Startup tasks ----
preload_suspended_emails()

# Server just started, so nobody is inside any room yet
try:
    supabase.table('rooms').update({'current_members': 0}).neq('id', 0).execute()
except Exception as e:
    print("Could not reset room counts:", e)

start_scheduler(app)


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
