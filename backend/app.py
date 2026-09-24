from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_bcrypt import Bcrypt
import os
from supabase import create_client, Client
from dotenv import load_dotenv
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask_mail import Mail, Message
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import json
import google.generativeai as genai
from flask_socketio import SocketIO, join_room, leave_room, emit
from pypdf import PdfReader
import uuid
from datetime import datetime

load_dotenv()

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")
CORS(app)
bcrypt = Bcrypt(app)

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# Kukunin nito ang URL galing sa Render/Environment, o gagamit ng default
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://your_local_fallback')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "YOUR_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "YOUR_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Email Configuration (Replace with your actual mail server credentials)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your_email@gmail.com'
app.config['MAIL_PASSWORD'] = 'your_email_app_password'
app.config['DEFAULT_MAIL_SENDER'] = 'StudyCircle <your_email@gmail.com>'

mail = Mail(app)

@app.route('/')
def home():
    return jsonify({"status": "success", "message": "StudyCircle Backend is live and running!"}), 200

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not username or not email or not password:
        return jsonify({'error': 'Please provide all required fields.'}), 400

    try:
        # 1. I-check muna kung existing na ang email
        existing_email = supabase.table('users').select('*').eq('email', email).execute()
        if existing_email.data:
            return jsonify({'error': 'This email is already registered.', 'field': 'email'}), 400

        # 2. I-check muna kung existing na ang username
        existing_username = supabase.table('users').select('*').eq('username', username).execute()
        if existing_username.data:
            return jsonify({'error': 'Username is already taken.', 'field': 'username'}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        response = supabase.table('users').insert({
            "username": username,
            "email": email,
            "password": hashed_password,
            "coins": 100,
            "streak": 0,
            "inventory": []
        }).execute()

        created_user = response.data[0] if response.data else {}
        inv_data = created_user.get('inventory')
        if isinstance(inv_data, str):
            inv_data = json.loads(inv_data)

        return jsonify({
            'message': 'User created successfully!',
            'user': {
                'username': created_user.get('username', username),
                'email': created_user.get('email', email),
                'coins': created_user.get('coins', 100),
                'streak': created_user.get('streak', 0),
                'currentXP': created_user.get('current_xp', 0),
                'maxXP': created_user.get('max_xp', 1250),
                'level': created_user.get('level', 1),
                'inventory': inv_data or []
            }
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/google-signup', methods=['POST'])
def google_signup():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    google_id = data.get('google_id')

    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    try:
        # I-check muna kung nag-e-exist na ang email
        existing_user = supabase.table('users').select('*').eq('email', email).execute()
        
        if existing_user.data:
            user = existing_user.data[0]
            raw_inv = user.get('inventory')
            if isinstance(raw_inv, str):
                raw_inv = json.loads(raw_inv)

            return jsonify({
                'message': 'Login successful!',
                'user': {
                    'username': user['username'],
                    'email': user['email'],
                    'coins': user.get('coins', 100),
                    'streak': user.get('streak', 0),
                    'currentXP': user.get('current_xp', 0),    
                    'maxXP': user.get('max_xp', 1250),      
                    'level': user.get('level', 1),
                    'inventory': raw_inv or [],
                    'avatarConfig': json.loads(user['avatar_config']) if user.get('avatar_config') else None,
                    'roomConfig': json.loads(user['room_config']) if user.get('room_config') else None,
                    'unlockedItems': json.loads(user['unlocked_items']) if user.get('unlocked_items') else None            
                }
            }), 200

        # Kung wala pa at walang username na pinasa, sabihin sa frontend na kailangan ng username (buksan ang modal)
        if not username:
            return jsonify({'needs_username': True}), 200

        dummy_password = bcrypt.generate_password_hash(google_id or 'google_secure_pass').decode('utf-8')
        
        response = supabase.table('users').insert({
            "username": username,
            "email": email,
            "password": dummy_password,
            "coins": 100,
            "streak": 0,
            "inventory": []
        }).execute()

        created_user = response.data[0] if response.data else {}
        raw_inv = created_user.get('inventory')
        if isinstance(raw_inv, str):
            raw_inv = json.loads(raw_inv)

        return jsonify({
            'message': 'Google account registered successfully!',
            'user': {
                'username': created_user.get('username', username),
                'email': created_user.get('email', email),
                'coins': created_user.get('coins', 100),
                'streak': created_user.get('streak', 0),
                'inventory': raw_inv or []
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Please provide email and password.'}), 400

    try:
        response = supabase.table('users').select('*').eq('email', email).execute()
        users = response.data

        if not users:
            return jsonify({'error': 'Invalid email or password.'}), 401

        user = users[0]
        if not bcrypt.check_password_hash(user['password'], password):
            return jsonify({'error': 'Invalid email or password.'}), 401

        raw_inv = user.get('inventory')
        if isinstance(raw_inv, str):
            raw_inv = json.loads(raw_inv)

        return jsonify({
            'message': 'Login successful!',
            'user': {
                'username': user['username'],
                'email': user['email'],
                'coins': user.get('coins', 100),
                'streak': user.get('streak', 0),
                'currentXP': user.get('current_xp', 0),    
                'maxXP': user.get('max_xp', 1250),      
                'level': user.get('level', 1),
                'inventory': raw_inv or [],
                'avatarConfig': json.loads(user['avatar_config']) if user.get('avatar_config') else None,
                'roomConfig': json.loads(user['room_config']) if user.get('room_config') else None,
                'unlockedItems': json.loads(user['unlocked_items']) if user.get('unlocked_items') else None            
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    # Validate if email is provided in the request
    if not email:
        return jsonify({'error': 'Please provide an email address.'}), 400

    try:
        # Check if the email exists in the Supabase database
        response = supabase.table('users').select('*').eq('email', email).execute()
        
        if not response.data:
            return jsonify({'error': 'Email address not found in our system.'}), 404

        user = response.data[0]
        username = user.get('username', 'User')

        # Generate a secure random token for the password reset and SAVE to Supabase
        reset_token = secrets.token_urlsafe(32)
        supabase.table('users').update({'reset_token': reset_token}).eq('email', email).execute()
        
        reset_link = f"http://localhost:5173/changepassword?token={reset_token}"

        # Email Configuration using Gmail SMTP
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")

        # Create the email message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = email
        msg['Subject'] = "Password Reset Request - StudyCircle"

        email_body = f"""
Hello {username},

We received a request to reset your StudyCircle password.

Click the link below to reset your password:
{reset_link}

This link expires in 15 minutes.

If you didn't request this, simply ignore this email.

- StudyCircle Team
        """
        msg.attach(MIMEText(email_body, 'plain'))

        # Send the email via Gmail SMTP
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, email, msg.as_string())
        server.quit()

        return jsonify({
            'message': 'Password reset link sent successfully to your email!',
            'reset_link': reset_link  
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('new_password')

    # Validate inputs
    if not token or not new_password:
        return jsonify({'error': 'Token and new password are required.'}), 400

    try:
        # Patahin kung tama ang token sa database
        response = supabase.table('users').select('*').eq('reset_token', token).execute()
        
        if not response.data:
            return jsonify({'error': 'Invalid or expired reset token.'}), 400

        user_email = response.data[0]['email']

        # Hash the new password securely
        hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')
        
        # Update ang password at i-clear ang reset token
        supabase.table('users').update({
            'password': hashed_password,
            'reset_token': None
        }).eq('email', user_email).execute()

        return jsonify({'message': 'Password successfully updated!'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Background function that runs periodically to send reminders
def send_study_reminder():
    with app.app_context():
        current_time_str = datetime.now().strftime("%H:%M")
        
        # TODO: Query your database for users who have reminders enabled 
        # and whose reminder_time matches the current hour/minute.
        # Example using SQLAlchemy:
        # users_to_remind = User.query.filter_by(reminder_enabled=True, reminder_time=current_time_str).all()
        users_to_remind = [] 
        
        for user in users_to_remind:
            msg = Message(
                subject="⏰ StudyCircle Daily Reminder: Time to Focus!",
                recipients=[user.email],
                body=f"Hi {user.username},\n\nThis is your daily reminder to open StudyCircle and complete your focus sessions today! Keep your streak going! 🔥\n\n- StudyCircle Team"
            )
            try:
                mail.send(msg)
                print(f"Reminder email sent successfully to {user.email}")
            except Exception as e:
                print(f"Error sending email to {user.email}: {e}")

# Setup Background Scheduler to check every minute for scheduled reminders
scheduler = BackgroundScheduler()
scheduler.add_job(func=send_study_reminder, trigger="interval", minutes=1)
scheduler.start()

# API endpoint to update and save reminder settings
@app.route('/api/update-reminder', methods=['POST'])
def update_reminder():
    data = request.json
    email = data.get('email')
    enabled = data.get('enabled')
    reminder_time = data.get('time')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        print(f"Saved reminder for {email}: Enabled={enabled}, Time={reminder_time}")
        
        # Kung naka-enable, magpadala agad ng confirmation/test reminder email para makita natin
        if enabled:
            msg = Message(
                subject="⏰ StudyCircle Reminder Set Successfully!",
                recipients=[email],
                body=f"Hello!\n\nYour daily study reminder has been successfully set to {reminder_time}. We will keep you focused!\n\n- StudyCircle Team"
            )
            mail.send(msg)
            print(f"Confirmation email sent to {email}")

        return jsonify({"success": True, "message": "Reminder settings saved and email sent!"}), 200
    except Exception as e:
        print(f"Error sending email: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
@app.route('/api/test-email', methods=['POST'])
def test_email():
    data = request.json
    recipient_email = data.get('email')
    
    if not recipient_email:
        return jsonify({"success": False, "message": "No email provided"}), 400

    try:
        msg = Message(
            subject="🧪 StudyCircle Test Email",
            recipients=[recipient_email],
            body="Hello! This is a test email from your StudyCircle app to verify that email reminders are working perfectly."
        )
        mail.send(msg)
        return jsonify({"success": True, "message": "Test email sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    data = request.get_json()
    old_email = data.get('old_email')
    new_username = data.get('new_username')
    new_email = data.get('new_email')

    if not old_email:
        return jsonify({'error': 'Original email is required.'}), 400

    update_data = {}
    if new_username:
        update_data['username'] = new_username
    if new_email:
        update_data['email'] = new_email

    try:
        response = supabase.table('users').update(update_data).eq('email', old_email).execute()
        return jsonify({'success': True, 'message': 'Profile updated successfully!'}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500      
    
@app.route('/api/update-customization', methods=['POST'])
def update_customization():
    data = request.json
    email = data.get('email')
    avatar_config = data.get('avatarConfig')
    room_config = data.get('roomConfig')
    unlocked_items = data.get('unlockedItems')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        # Isinusulat na nito nang totoo sa Supabase table base sa email ng user
        supabase.table('users').update({
            "avatar_config": json.dumps(avatar_config) if avatar_config else None,
            "room_config": json.dumps(room_config) if room_config else None,
            "unlocked_items": json.dumps(unlocked_items) if unlocked_items else None
        }).eq('email', email).execute()
        
        return jsonify({"success": True, "message": "Customization saved to database successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- 1. SEARCH USERS TO ADD ---
@app.route('/api/search-users', methods=['GET'])
def search_users():
    query = request.args.get('query', '').strip()
    current_email = request.args.get('email', '')
    
    if not query:
        return jsonify({"success": True, "users": []}), 200

    try:
        # 1. Kunin muna ang lahat ng email ng kaibigan at may pending request para hindi na lumabas
        friendships_res = supabase.table('friendships').select('*').or_(f"sender_email.eq.{current_email},receiver_email.eq.{current_email}").execute()
        
        excluded_emails = {current_email}
        for item in friendships_res.data:
            if item['status'] in ['accepted', 'pending']:
                other_email = item['receiver_email'] if item['sender_email'] == current_email else item['sender_email']
                excluded_emails.add(other_email)

        # 2. Mag-search ng users na hindi kasama sa excluded list
        response = supabase.table('users').select('username, email, level, avatar_config').ilike('username', f"%{query}%").execute()
        
        filtered_users = [u for u in response.data if u['email'] not in excluded_emails]

        return jsonify({"success": True, "users": filtered_users}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- 2. SEND FRIEND REQUEST ---
@app.route('/api/send-friend-request', methods=['POST'])
def send_friend_request():
    data = request.get_json()
    sender_email = data.get('senderEmail')
    receiver_email = data.get('receiverEmail')
    
    if not sender_email or not receiver_email:
        return jsonify({"success": False, "message": "Sender and receiver emails are required."}), 400

    try:
        # I-save ang request sa Supabase friendships table
        supabase.table('friendships').insert({
            "sender_email": sender_email,
            "receiver_email": receiver_email,
            "status": "pending"
        }).execute()
        
        return jsonify({"success": True, "message": "Friend request sent successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- 3. GET FRIENDS & PENDING REQUESTS ---
@app.route('/api/get-friends-data', methods=['GET'])
def get_friends_data():
    email = request.args.get('email')
    
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400

    try:
        # Kunin ang mga accepted friends at incoming requests
        response = supabase.table('friendships').select('*').or_(f"sender_email.eq.{email},receiver_email.eq.{email}").execute()
        
        # Safe check kung null o walang laman ang response data
        if not response.data:
            return jsonify({"success": True, "friends": [], "requests": []}), 200
        
        friends = []
        requests = []
        
        for item in response.data:
            status = item.get('status')
            sender = item.get('sender_email')
            receiver = item.get('receiver_email')
            
            if status == 'accepted':
                friend_email = receiver if sender == email else sender
                # Kunin ang details ng kaibigan mula sa users table
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', friend_email).execute()
                if u_res.data:
                    friends.append(u_res.data[0])
                    
            elif status == 'pending' and receiver == email:
                # Incoming request para sa iyo
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', sender).execute()
                if u_res.data:
                    requests.append({
                        "id": item.get('id'),
                        "sender": u_res.data[0]
                    })
                    
        return jsonify({"success": True, "friends": friends, "requests": requests}), 200
        
    except Exception as e:
        print(f"Error in get_friends_data: {str(e)}") # Magpapakita sa Flask terminal para madaling i-debug
        return jsonify({"success": False, "message": str(e)}), 500

# --- 4. ACCEPT OR REJECT FRIEND REQUEST ---
@app.route('/api/handle-friend-request', methods=['POST'])
def handle_friend_request():
    data = request.get_json()
    request_id = data.get('requestId')
    action = data.get('action') # 'accept' or 'reject'
    
    try:
        if action == 'accept':
            supabase.table('friendships').update({"status": "accepted"}).eq('id', request_id).execute()
        else:
            supabase.table('friendships').delete().eq('id', request_id).execute()
            
        return jsonify({"success": True, "message": f"Request {action}ed successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500    


# --- 5. GET LEADERBOARD DATA ---
@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        # Kunin ang top 10 users base sa XP para sa All Time
        all_time_res = supabase.table('users').select('username, avatar_url, avatar_config, current_xp').order('current_xp', desc=True).limit(10).execute()
        
        # Kunin ang top 10 users base sa Streak
        streaks_res = supabase.table('users').select('username, avatar_url, avatar_config, streak').order('streak', desc=True).limit(10).execute()

        def format_avatar(url, username):
            return url if url else f"https://api.dicebear.com/7.x/pixel-art/svg?seed={username}"

        all_time = []
        for i, user in enumerate(all_time_res.data):
            all_time.append({
                "rank": i + 1,
                "username": user.get('username'),
                "pfp": format_avatar(user.get('avatar_url'), user.get('username')),
                "avatar_config": user.get('avatar_config'),
                "score": f"{user.get('current_xp', 0):,} XP"
            })

        streaks = []
        for i, user in enumerate(streaks_res.data):
            streaks.append({
                "rank": i + 1,
                "username": user.get('username'),
                "pfp": format_avatar(user.get('avatar_url'), user.get('username')),
                "avatar_config": user.get('avatar_config'),
                "streak": f"{user.get('streak', 0)} d"
            })

        return jsonify({
            "success": True, 
            "leaderboard": {
                "all-time": all_time,
                "this-month": all_time, # Placeholder kung wala ka pang monthly tracking table
                "streaks": streaks
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500    

# --- 6. GET CHAT MESSAGES ---
@app.route('/api/messages', methods=['GET'])
def get_messages():
    user1 = request.args.get('user1')
    user2 = request.args.get('user2')
    
    if not user1 or not user2:
        return jsonify({"success": False, "message": "Missing user emails"}), 400
        
    try:
        # Kunin ang lahat ng mensahe sa pagitan ng dalawang user
        response = supabase.table('messages').select('*') \
            .in_('sender_email', [user1, user2]) \
            .in_('receiver_email', [user1, user2]) \
            .order('created_at').execute()
        
        return jsonify({"success": True, "messages": response.data}), 200
    except Exception as e:
        print("Error fetching messages:", e)
        return jsonify({"success": False, "message": str(e)}), 500


# --- 7. SEND CHAT MESSAGE ---
@app.route('/api/send-message', methods=['POST'])
def send_message():
    data = request.json
    sender = data.get('sender_email')
    receiver = data.get('receiver_email')
    message = data.get('message')
    
    if not sender or not receiver or not message:
        return jsonify({"success": False, "message": "Incomplete data"}), 400
        
    try:
        # I-save ang mensahe sa database
        supabase.table('messages').insert({
            "sender_email": sender,
            "receiver_email": receiver,
            "message": message
        }).execute()
        
        return jsonify({"success": True}), 200
    except Exception as e:
        print("Error sending message:", e)
        return jsonify({"success": False, "message": str(e)}), 500

# --- 8. SAVE STUDY SESSION ---
@app.route('/api/save-session', methods=['POST'])
def save_session():
    data = request.json or {}
    email = data.get('email')
    activity = data.get('activity', 'Focus Session')
    technique = data.get('technique', 'Pomodoro')
    duration = int(data.get('duration', 0))
    total_tasks = int(data.get('totalTasks', 0))
    completed_tasks = int(data.get('completedTasks', 0))
    
    try:
        supabase.table('study_sessions').insert({
            "email": email,
            "activity_name": activity,
            "technique": technique,
            "duration_minutes": duration,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks
        }).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# --- 9. v2.1 EXP ENGINE & API SPECIFICATION CONTROLLER ---
@app.route('/api/v1/sessions/complete', methods=['POST'])
def complete_focus_session():
    data = request.json or {}
    raw_email = data.get('email', '').strip()
    duration_minutes = int(data.get('durationMinutes', 25))
    technique = data.get('technique', 'Pomodoro').strip()
    tasks_completed = max(0, int(data.get('tasksCompleted', 0)))
    total_tasks = max(tasks_completed, int(data.get('totalTasks', tasks_completed)))
    tasks_list = data.get('tasksList', [])
    activity_name = data.get('activity', 'Focus Session')
    
    # --- Feedback Fields galing sa Feedback Modal ---
    task_status = data.get('taskStatus', 'Completed').strip()
    productivity_level = int(data.get('productivityLevel', 3))
    accomplished_text = data.get('accomplishedText', '').strip()

    is_multiplayer = data.get('isMultiplayer', False)
    is_host = data.get('isHost', False)
    room_size = int(data.get('roomSize', 1))

    if not raw_email:
        return jsonify({"success": False, "error": "Email is required. Please check login state."}), 400

    try:
        if room_size > 6:
            return jsonify({"success": False, "error": f"Group room size exceeds strict limit: N = {room_size}. Max N = 6."}), 400

        user_res = supabase.table('users').select('*').ilike('email', raw_email).execute()
        if not user_res.data:
            return jsonify({"success": False, "error": f"User record not found for {raw_email}"}), 404

        user = user_res.data[0]
        user_id = user['id']
        current_xp = float(user.get('current_xp') or 0.0)
        current_coins = int(user.get('coins') or 0)
        current_level = int(user.get('level') or 1)
        current_streak = int(user.get('streak') or 0)

        # v2.1 Master EXP Formula
        R_base = 0.4
        tech_upper = technique.upper()
        if '52' in tech_upper:
            mu_tech = 1.1
        elif '90' in tech_upper or 'ULTRADIAN' in tech_upper:
            mu_tech = 1.2
        else:
            mu_tech = 1.0

        mu_checklist = 1.0 + min(tasks_completed * 0.05, 0.25)

        if not is_multiplayer or room_size <= 1:
            session_type = 'SOLO'
            SessMult = 1.00
        elif is_host:
            session_type = 'HOST'
            SessMult = 1.15
        else:
            session_type = 'MEMBER'
            SessMult = 1.05

        if room_size <= 1:
            CapMult = 1.00
        elif room_size == 2:
            CapMult = 1.05
        elif room_size <= 5:
            CapMult = 1.10
        elif room_size == 6:
            CapMult = 1.15
        else:
            CapMult = 1.00

        bonus_exp = 4.0 if ('ULTRADIAN' in tech_upper and duration_minutes >= 90) else 0.0

        base_calc = duration_minutes * R_base * mu_tech * mu_checklist
        calculated_exp = (base_calc * SessMult * CapMult) + bonus_exp
        rounded_exp_gained = round(calculated_exp, 4)

        # Ensure at least 1 coin is gained even for short test durations
        base_coins_gained = max(1, int(round(duration_minutes * 0.2)))

        new_xp = current_xp + rounded_exp_gained
        new_coins = current_coins + base_coins_gained

        # --- TULOY-TULOY NA PAGKAKALKULA NG LEVEL (Sequential Leveling) ---
        new_level = 1
        cum_exp = 0
        for l in range(1, 51):
            cost = int(100 * (l ** 1.5))
            if new_xp >= cum_exp:
                new_level = l
            cum_exp += cost

        next_level = new_level + 1
        new_max_xp = 0
        temp_cum = 0
        for l in range(1, next_level):
            temp_cum += int(100 * (l ** 1.5))
        new_max_xp = temp_cum

        # --- STREAK CHECK: Isang beses lang kada araw ---
        today_str = datetime.now().strftime('%Y-%m-%d')
        sessions_today_res = supabase.table('study_sessions').select('created_at').ilike('email', raw_email).execute()
        
        already_studied_today = False
        if sessions_today_res.data:
            for s in sessions_today_res.data:
                created_at = s.get('created_at', '')
                if created_at and created_at.startswith(today_str):
                    already_studied_today = True
                    break

        if already_studied_today:
            # Kung nakapag-aral na kanina ngayong araw, panatilihin ang kasalukuyang streak
            new_streak = current_streak if current_streak > 0 else 1
        else:
            # Kung ito ang unang sesyon ngayong araw, dagdagan ng 1 ang streak
            new_streak = current_streak + 1

        # 1. Update users table (isinama na rin ang streak)
        supabase.table('users').update({
            "current_xp": int(round(new_xp)),
            "coins": new_coins,
            "level": new_level,
            "max_xp": new_max_xp,
            "streak": new_streak
        }).eq('id', user_id).execute()

        # 2. Insert study_sessions table kasama ang feedback fields
        supabase.table('study_sessions').insert({
            "email": user['email'],
            "activity_name": activity_name,
            "technique": technique,
            "duration_minutes": duration_minutes,
            "total_tasks": total_tasks,
            "completed_tasks": tasks_completed,
            "tasks_list": tasks_list,
            "task_status": task_status,
            "productivity_level": productivity_level,
            "accomplished_text": accomplished_text,
            "exp_gained": rounded_exp_gained, 
            "coins_gained": base_coins_gained
        }).execute()

        print(f"[v2.1 EXP SUCCESS] {user['email']}: +{rounded_exp_gained} EXP, +{base_coins_gained} Coins, Level: {new_level}, Streak: {new_streak}")

        return jsonify({
            "success": True,
            "expGained": rounded_exp_gained,
            "currentXP": int(round(new_xp)),
            "totalExp": new_xp,
            "coins": new_coins,
            "level": new_level,
            "maxXP": new_max_xp,
            "streak": new_streak,
            "didLevelUp": new_level > current_level
        }), 200

    except Exception as e:
        print("[v2.1 EXP ERROR]:", str(e))
        return jsonify({"success": False, "error": str(e)}), 500
    
# 1. Endpoint para sa AI Chat (Kitsu AI Chat)
@app.route('/api/kitsu-chat', methods=['POST'])
def kitsu_chat():
    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'Message is required.'}), 400

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            return jsonify({'success': False, 'error': 'GEMINI_API_KEY is missing.'}), 500

        # Direktang ipasa ang client configuration gamit ang bagong genai client setup kung maaari,
        # o i-clear ang anumang vertex environment variables na nagdudulot ng 401.
        os.environ["GEMINI_API_KEY"] = api_key
        
        genai.configure(api_key=api_key)
        
        # Subukan nating gamitin ang gemini-1.5-flash
        model = genai.GenerativeModel('gemini-3.6-flash')
        
        prompt = f"You are Kitsu, a cozy, friendly, and helpful anime-style study fox assistant for a study app called StudyCircle. Keep your answers encouraging, concise, and study-focused. User says: {user_message}"
        
        response = model.generate_content(prompt)
        ai_reply = response.text

        return jsonify({'success': True, 'reply': ai_reply}), 200
    except Exception as e:
        print("EXACT GEMINI ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

# 2. Endpoint para sa pag-generate ng Flashcards / Quizzes / Notes mula sa Real Files
import json

@app.route('/api/generate-ai-tool', methods=['POST'])
def generate_ai_tool():
    tool_type = request.form.get('toolType', 'Notes')
    file = request.files.get('file')

    if not file:
        return jsonify({'error': 'No file uploaded.'}), 400

    file_path = None
    try:
        upload_dir = 'temp_uploads'
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file.filename)
        file.save(file_path)

        reader = PdfReader(file_path)
        extracted_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        if not extracted_text.strip():
            extracted_text = "Sample study material content."

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-3.6-flash')

        if tool_type in ['Pre-quiz', 'Post-quiz']:
            prompt = f"""
            Analyze the following text and generate exactly 5 multiple-choice questions based strictly on its content.
            Return the output strictly as a valid JSON object in this exact format, with no markdown code blocks or extra text:
            {{
              "questions": [
                {{
                  "question": "Question text here?",
                  "options": ["Option A", "Option B", "Option C", "Option D"],
                  "correctAnswer": 0
                }}
              ]
            }}
            Text: {extracted_text[:6000]}
            """
        elif tool_type == 'Flashcards':
            prompt = f"""
            Analyze the following text and generate 4 flashcards containing a key term and definition based strictly on the text.
            Return the output strictly as a valid JSON array of objects in this exact format, with no markdown code blocks:
            [
              {{ "term": "Term 1", "definition": "Definition 1" }}
            ]
            Text: {extracted_text[:6000]}
            """
        else: # Notes
            prompt = f"""
            Analyze the following document text and provide comprehensive, structured study notes with clear headings and bullet points based strictly on the text content:
            Text: {extracted_text[:6000]}
            """

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        if result_text.startswith("```json"):
            result_text = result_text[7:]
        if result_text.endswith("```"):
            result_text = result_text[:-3]

        return jsonify({'success': True, 'data': result_text.strip()}), 200

    except Exception as e:
        print("EXACT GENERATE TOOL ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500
    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

# --- REAL-TIME MULTIPLAYER SOCKET EVENTS ---
room_members = {}

@socketio.on('join_room')
def on_join_room(data):
    room = data.get('room')
    username = data.get('username')
    avatar_config = data.get('avatar_config')
    status = data.get('status', 'ONLINE')
    level = data.get('level', 1)
    
    join_room(room)
    
    if room not in room_members:
        room_members[room] = []
    
    user_email = ""
    db_avatar = avatar_config
    total_focus_formatted = "0h 00m"  # FIX: Default focus time kung wala pang history
    
    try:
        u_res = supabase.table('users').select('email, avatar_config, level').eq('username', username).execute()
        if u_res.data:
            user_email = u_res.data[0].get('email', '')
            db_avatar = u_res.data[0].get('avatar_config')
            level = u_res.data[0].get('level', level)
            
            # FIX: Kalkulahin ang totoong total focus time galing sa 'study_sessions'
            sessions_res = supabase.table('study_sessions').select('duration_minutes').eq('email', user_email).execute()
            if sessions_res.data:
                total_minutes = sum(int(s.get('duration_minutes', 0)) for s in sessions_res.data)
                hours = total_minutes // 60
                mins = total_minutes % 60
                total_focus_formatted = f"{hours}h {mins:02d}m"
                
    except Exception as e:
        print("Error fetching user info:", e)

    is_host = False
    room_cfg = None  
    try:
        room_res = supabase.table('rooms').select('host').eq('name', room).execute()
        if room_res.data:
            host_username = room_res.data[0].get('host')
            if host_username == username:
                is_host = True
            
            host_user_res = supabase.table('users').select('room_config').eq('username', host_username).execute()
            if host_user_res.data:
                room_cfg = host_user_res.data[0].get('room_config')
    except Exception as e:
        print("Error verifying host status:", e)

    if isinstance(room_cfg, str):
        try:
            room_cfg = json.loads(room_cfg)
        except:
            pass

    existing_user = next((m for m in room_members[room] if m['username'] == username), None)
    if existing_user:
        existing_user['status'] = status
        if db_avatar:
            existing_user['avatar_config'] = db_avatar
        existing_user['level'] = level
        existing_user['isHost'] = is_host
        existing_user['email'] = user_email
        existing_user['totalFocusTime'] = total_focus_formatted  # FIX: i-update ang focus time
    else:
        room_members[room].append({
            'id': username,
            'username': username,
            'email': user_email,
            'status': status,
            'avatar_config': db_avatar,
            'level': level,
            'isHost': is_host,
            'totalFocusTime': total_focus_formatted  # FIX: i-set ang focus time
        })
    
    emit('room_update', {
        'members': room_members[room],
        'room_config': room_cfg,  
        'logs': [{'id': 'log_' + username, 'user': username, 'action': 'joined the room', 'time': 'Just now'}]
    }, room=room)

@socketio.on('request_join_private_room')
def handle_private_join_request(data):
    room_name = data.get('room')
    # I-broadcast ang incoming request patungo lamang sa host ng room na iyon
    emit('incoming_join_request', data, room=room_name)

@socketio.on('leave_room')
def handle_leave_room(data):
    room = data.get('room')
    username = data.get('username')
    leave_room(room)
    emit('user_left', {'username': username, 'message': f'{username} left the room.'}, room=room)

@socketio.on('send_room_message')
def handle_room_message(data):
    room = data.get('room')
    username = data.get('sender')
    message = data.get('text')
    emit('receive_room_message', {'sender': username, 'text': message, 'time': data.get('time')}, room=room)

@socketio.on('sync_timer')
def handle_sync_timer(data):
    room = data.get('room')
    emit('timer_update', data, room=room, include_self=False)

# WSM Constants mula sa Architecture Spec
TASK_WEIGHTS = {
    "Creation": {"df": 0.8, "fm": 0.1, "cs": 0.1},
    "Writing": {"df": 0.7, "fm": 0.2, "cs": 0.1},
    "Practicing": {"df": 0.6, "fm": 0.3, "cs": 0.1},
    "Reading": {"df": 0.5, "fm": 0.4, "cs": 0.1},
    "Review": {"df": 0.2, "fm": 0.4, "cs": 0.4},
    "Memorize": {"df": 0.1, "fm": 0.5, "cs": 0.4}
}

FRAMEWORK_SCORES = {
    "Pomodoro": {"df": 2, "fm": 10, "cs": 9},
    "52-17 Method": {"df": 6, "fm": 6, "cs": 5},
    "90m Deep Work": {"df": 10, "fm": 2, "cs": 2}
}

# --- TASK VALIDATION DICTIONARY & ENDPOINT ---
TASK_DICTIONARIES = {
    "reading": [
        "read", "reading", "reread", "re-read", "go through", "go over", "look through", "scan", "skim",
        "browse", "examine", "inspect", "study", "read through", "read over", "read up on", "work through",
        "peruse", "consult", "refer to", "look up", "read chapter", "read article", "read book", "read notes",
        "read handout", "read module", "read lesson", "read paper", "read research paper", "read journal",
        "read documentation", "go through documentation", "read instructions", "read textbook", "read slides",
        "read lecture", "read source", "read reference", "read material", "read resources", "read literature",
        "read case study", "read essay", "read report", "read paragraph", "read passage", "read pages",
        "finish reading", "complete reading", "understand the chapter", "understand the article",
        "study the material", "examine the material", "review the text", "annotate while reading", "highlight",
        "mark important parts", "identify key points", "find main ideas", "extract information", "take notes while reading"
    ],
    "writing": [
        "write", "writing", "draft", "drafting", "compose", "composing", "create text", "produce text",
        "prepare a draft", "make a draft", "write up", "write down", "rewrite", "re-write", "revise", "revision",
        "edit", "editing", "proofread", "proofreading", "polish", "improve wording", "rephrase", "paraphrase",
        "outline", "create an outline", "write an outline", "develop an outline", "journal", "journal writing",
        "freewrite", "free writing", "essay", "write essay", "report", "write report", "research paper",
        "write research paper", "paper", "write paper", "paragraph", "write paragraph", "reflection",
        "write reflection", "documentation", "write documentation", "letter", "write letter", "response",
        "write response", "discussion post", "write discussion post", "article", "write article",
        "reflection paper", "document", "email", "write email", "blog", "write blog", "script", "write script",
        "story", "write story", "poem", "write poem", "caption", "write caption", "introduction",
        "write introduction", "conclusion", "write conclusion", "thesis statement", "write thesis statement",
        "proposal", "write proposal", "case study", "write case study", "lab report", "write lab report",
        "answer questions in writing", "complete written activity"
    ],
    "review": [
        "review", "reviewing", "revise", "revision", "go over", "go through", "look back", "revisit", "recheck",
        "check again", "check", "recap", "recap notes", "recap lesson", "refresh", "refresh memory",
        "refresh knowledge", "brush up", "brush up on", "reinforce", "reinforce learning", "consolidate",
        "consolidate knowledge", "relearn", "revisit lesson", "revisit chapter", "revisit notes", "review notes",
        "review chapter", "review lesson", "review module", "review material", "review lecture", "review slides",
        "review textbook", "review article", "review assignment", "review answers", "review mistakes",
        "check notes", "check previous work", "check previous lesson", "look at notes again", "study again",
        "study previous material", "study past lessons", "refresh concepts", "summarize", "make a summary",
        "review summary", "review key points", "review important points", "review highlights", "review before exam",
        "exam review", "test review", "quiz review", "final review", "pre-exam review", "review for exam",
        "review for quiz", "review for test", "review flashcards", "check understanding", "revisit difficult topics",
        "review weak areas", "correct mistakes", "go over mistakes", "analyze mistakes", "review feedback"
    ],
    "practice": [
        "practice", "practise", "practicing", "practising", "exercise", "exercises", "drill", "drills", "train",
        "training", "rehearse", "rehearsal", "work on", "work through", "try", "attempt", "solve", "solving",
        "answer", "answering", "complete problems", "do problems", "solve problems", "practice problems",
        "practice questions", "answer questions", "answer exercises", "do exercises", "workbook",
        "workbook exercises", "worksheet", "complete worksheet", "problem set", "complete problem set",
        "sample problems", "sample questions", "mock test", "mock exam", "practice test", "practice exam",
        "quiz practice", "test practice", "exam practice", "take a quiz", "take a test", "take an exam",
        "simulate exam", "exam simulation", "hands-on practice", "hands on", "apply", "apply concepts",
        "apply knowledge", "application", "implement", "code practice", "coding exercise", "programming exercise",
        "debug practice", "debug code", "solve equations", "solve math problems", "calculate", "calculations",
        "compute", "perform calculations", "work out", "practice speaking", "practice pronunciation",
        "practice writing", "practice grammar", "practice vocabulary", "practice presentation",
        "rehearse presentation", "practice skills", "skill practice", "repeat exercises", "repeat problems",
        "practice technique", "practice method", "practice procedure", "practice steps", "practice application"
    ],
    "memorize": [
        "memorize", "memorise", "memorizing", "memorising", "learn by heart", "commit to memory", "remember",
        "remembering", "retain", "retention", "recall", "recalling", "memorization", "memorisation",
        "rote learning", "rote memorization", "learn", "master", "mastering", "internalize", "internalise",
        "ingrain", "fix in memory", "store in memory", "flashcards", "flash card", "make flashcards",
        "review flashcards", "active recall", "recall practice", "selftest", "self testing", "retrieval practice",
        "retrieval", "spaced repetition", "spaced review", "repeat", "repetition", "repeat until remembered",
        "repeat information", "repeat terms", "repeat definitions", "learn terms", "learn definitions",
        "memorize terms", "memorize definitions", "memorize formulas", "memorize equations", "memorize facts",
        "memorize dates", "memorize names", "memorize vocabulary", "memorize concepts", "memorize keywords",
        "memorize rules", "memorize steps", "memorize procedures", "memorize sequence", "memorize lists",
        "memorize code", "memorize syntax", "memorize commands", "learn vocabulary", "vocabulary memorization",
        "learn formulas", "learn facts", "learn dates", "learn names", "recall facts", "recall terms",
        "recall definitions", "recall formulas", "recall concepts", "recall information", "test my memory",
        "memory drill", "memorization drill", "mnemonics", "mnemonic", "use mnemonic", "acronym",
        "make an acronym", "association", "associate concepts", "remember key points"
    ],
    "creation": [
        "create", "creating", "creation", "make", "making", "build", "building", "develop", "developing",
        "design", "designing", "produce", "producing", "construct", "constructing", "develop a project",
        "make a project", "create a project", "project", "prototype", "prototyping", "design a prototype",
        "create prototype", "develop prototype", "plan", "planning", "brainstorm", "brainstorming",
        "conceptualize", "conceptualise", "ideate", "ideation", "generate ideas", "come up with ideas",
        "create ideas", "design layout", "create layout", "design interface", "create interface",
        "design UI", "create UI", "design UX", "create UX", "wireframe", "wireframing", "mockup", "mock-up",
        "create mockup", "design mockup", "draw", "drawing", "illustrate", "illustration", "create illustration",
        "make diagram", "create diagram", "create chart", "create infographic", "create presentation",
        "make presentation", "design presentation", "create poster", "make poster", "design poster",
        "create graphic", "design graphic", "create logo", "design logo", "create website", "build website",
        "develop website", "create application", "build application", "develop application", "create app",
        "build app", "develop app", "create system", "build system", "develop system", "implement feature",
        "develop feature", "build feature", "create database", "design database", "build database",
        "create model", "build model", "develop model", "create content", "produce content", "create video",
        "edit video", "create animation", "create artwork", "make artwork", "creative project", "creative work",
        "make something", "create something", "develop concept", "design solution", "create solution", "build solution"
    ]
}

@app.route('/api/validate-task', methods=['POST'])
def validate_task():
    data = request.get_json() or {}
    category = data.get('category', '').lower()
    tasks = data.get('tasks', [])

    if not category or not tasks:
        return jsonify({'success': False, 'error': 'Category and tasks are required.'}), 400

    keywords = TASK_DICTIONARIES.get(category, [])
    results = []
    overall_score = 0

    for task in tasks:
        t_lower = task.lower()
        matched_count = sum(1 for kw in keywords if kw in t_lower)
        
        # Simple scoring formula based on matched signals
        score = min(1.0, (matched_count * 0.4) + (0.3 if len(t_lower) > 3 else 0.1))
        
        if score >= 0.70:
            status = "Aligned"
        elif score >= 0.40:
            status = "Needs Review"
        else:
            status = "Not Aligned"
            
        results.append({'task': task, 'score': score, 'status': status})
        overall_score += score

    avg_score = overall_score / len(tasks) if tasks else 0
    final_status = "Aligned" if avg_score >= 0.70 else ("Needs Review" if avg_score >= 0.40 else "Not Aligned")

    return jsonify({
        'success': True,
        'averageScore': avg_score,
        'status': final_status,
        'taskBreakdown': results
    }), 200

@app.route('/api/ai-recommendation', methods=['POST'])
def ai_recommendation():
    data = request.get_json() or {}
    email = data.get('email')
    work_type = data.get('workType', 'Reading')
    tasks = data.get('tasks', [])

    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    try:
        # 1. Kunin ang history mula sa Supabase para sa Historical Modifier ($H_f$)
        sessions_res = supabase.table('study_sessions').select('*').eq('email', email).order('created_at', desc=True).limit(20).execute()
        user_history = sessions_res.data or []

        perf_tracking = {
            "Pomodoro": {"attempts": 0, "successes": 0},
            "52-17 Method": {"attempts": 0, "successes": 0},
            "90m Deep Work": {"attempts": 0, "successes": 0}
        }
        for s in user_history:
            tech = s.get('technique', 'Pomodoro')
            if tech in perf_tracking:
                perf_tracking[tech]["attempts"] += 1
                if s.get('status') in ['early', 'on-time', 'completed']:
                    perf_tracking[tech]["successes"] += 1

        def get_historical_modifier(fw_name):
            rec = perf_tracking[fw_name]
            if rec["attempts"] < 3:
                return 1.0
            return max(0.5, rec["successes"] / rec["attempts"])

        # 2. WSM Session Weight Calculation (Averaging weights across tasks)
        matched_categories = []
        for t in tasks:
            t_lower = str(t).lower()
            matched = "Reading"
            for cat in TASK_WEIGHTS.keys():
                if cat.lower() in t_lower or cat.lower() in work_type.lower():
                    matched = cat
                    break
            matched_categories.append(matched)
        
        if not matched_categories:
            matched_categories = ["Reading"]

        num_tasks = len(matched_categories)
        total_df = sum(TASK_WEIGHTS[cat]["df"] for cat in matched_categories)
        total_fm = sum(TASK_WEIGHTS[cat]["fm"] for cat in matched_categories)
        total_cs = sum(TASK_WEIGHTS[cat]["cs"] for cat in matched_categories)

        session_weights = {
            "df": total_df / num_tasks,
            "fm": total_fm / num_tasks,
            "cs": total_cs / num_tasks
        }

        # 3. WSM Framework Scoring & Selection
        best_framework = "Pomodoro"
        highest_score = -1
        framework_details = {
            "Pomodoro": {"focus": 25, "break": 5, "sessions": 4},
            "52-17 Method": {"focus": 52, "break": 17, "sessions": 3},
            "90m Deep Work": {"focus": 90, "break": 20, "sessions": 2}
        }

        for fw, scores in FRAMEWORK_SCORES.items():
            base_score = (
                (session_weights["df"] * scores["df"]) +
                (session_weights["fm"] * scores["fm"]) +
                (session_weights["cs"] * scores["cs"])
            )
            h_mod = get_historical_modifier(fw)
            final_score = base_score * h_mod

            if final_score > highest_score:
                highest_score = final_score
                best_framework = fw

        config = framework_details[best_framework]

        # 4. Gamitin ang Gemini 1.5 Flash para sa user-facing explanation rationale
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-3.6-flash')

        prompt = f"""
        You are Kitsu AI, an expert adaptive study coach inside StudyCircle. 
        A Weighted Sum Model algorithm determined that the user should use the '{best_framework}' technique ({config['focus']}m focus / {config['break']}m break) based on their tasks: {tasks}.
        Write a short, friendly, and motivating explanation (max 3 sentences) acknowledging their specific tasks and why this technique matches their cognitive profile.
        Return ONLY the explanation text.
        """

        response = model.generate_content(prompt)
        rationale = response.text.strip()

        return jsonify({
            'success': True,
            'techniqueName': best_framework,
            'focus': config['focus'],
            'break': config['break'],
            'sessions': config['sessions'],
            'recommendation': rationale
        }), 200

    except Exception as e:
        print("WSM AI Recommendation Error:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500
    
@app.route('/api/update-coins', methods=['POST'])
def update_coins_db():
    data = request.json
    email = data.get('email')
    coins = data.get('coins')
    
    if not email or coins is None:
        return jsonify({"success": False, "message": "Email and coins are required"}), 400

    try:
        response = supabase.table('users').update({
            "coins": coins
        }).eq('email', email).execute()
        
        return jsonify({"success": True, "message": "Coins updated in database successfully!"}), 200
    except Exception as e:
        print("Error updating coins:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

# --- GET ALL STUDY SESSIONS FOR STATISTICS ---
@app.route('/api/get-all-sessions', methods=['GET'])
def get_all_sessions():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required."}), 400
    try:
        response = supabase.table('study_sessions').select('*').eq('email', email).order('created_at', desc=True).execute()
        return jsonify({"success": True, "sessions": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/update-progress', methods=['POST'])
def update_progress():
    data = request.json
    email = data.get('email')
    earned_xp = data.get('earnedXP', 0)

    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        # 1. Kunin ang kasalukuyang data ng user mula sa Supabase
        user_res = supabase.table('users').select('id, current_xp, level').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_user = user_res.data[0]
        current_xp = current_user.get('current_xp', 0)
        new_xp = current_xp + earned_xp

        # 2. LEVEL MATRIX CUMULATIVE XP THRESHOLDS (Mula sa iyong spec)
        LEVEL_MATRIX = [
            {"level": 1, "cumulativeXP": 0, "nextXP": 1701},
            {"level": 5, "cumulativeXP": 1701, "nextXP": 11102},
            {"level": 10, "cumulativeXP": 11102, "nextXP": 31993},
            {"level": 15, "cumulativeXP": 31993, "nextXP": 67128},
            {"level": 20, "cumulativeXP": 67128, "nextXP": 118800},
            {"level": 25, "cumulativeXP": 118800, "nextXP": 189018},
            {"level": 30, "cumulativeXP": 189018, "nextXP": 392183},
            {"level": 40, "cumulativeXP": 392183, "nextXP": 689494},
            {"level": 50, "cumulativeXP": 689494, "nextXP": 689494}
        ]

        # 3. Kalkulahin ang bagong Level at hanapin ang tamang nextXP (max_xp)
        new_level = 1
        new_max_xp = 1701

        for item in LEVEL_MATRIX:
            if new_xp >= item["cumulativeXP"]:
                new_level = item["level"]
                new_max_xp = item["nextXP"]

        # 4. I-update ang Supabase database
        supabase.table('users').update({
            "current_xp": new_xp,
            "level": new_level,
            "max_xp": new_max_xp
        }).eq('email', email).execute()

        # 5. Kung umabot na sa Level 20 pataas, i-update ang streak freeze max_slots
        if new_level >= 20:
            user_id = current_user.get('id')
            if user_id:
                supabase.table('streak_freezes_inventory').update({
                    "max_slots": 3
                }).eq('user_id', user_id).execute()

        return jsonify({
            "success": True,
            "currentXP": new_xp,
            "level": new_level,
            "maxXP": new_max_xp
        }), 200

    except Exception as e:
        print("Error updating progress:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/claim-reward', methods=['POST'])
def claim_reward():
    data = request.json
    email = data.get('email')
    level = data.get('level')

    if not email or level is None:
        return jsonify({"success": False, "message": "Email and level are required"}), 400

    try:
        # Kunin muna ang kasalukuyang inventory o claimed rewards ng user
        user_res = supabase.table('users').select('id, inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_inventory = user_res.data[0].get('inventory') or []
        if isinstance(current_inventory, str):
            try:
                current_inventory = json.loads(current_inventory)
            except:
                current_inventory = []
        
        # Kung hindi pa naka-claim, idagdag sa inventory list
        reward_key = f"level_{level}_reward"
        if reward_key not in current_inventory:
            current_inventory.append(reward_key)

            # Kung Level 20 ang clinaim, i-update din ang streak freezes max slots to 3 base sa spec
            if level >= 20:
                user_id = user_res.data[0].get('id')
                if user_id:
                    try:
                        supabase.table('streak_freezes_inventory').update({
                            "max_slots": 3
                        }).eq('user_id', user_id).execute()
                    except Exception as sf_err:
                        print("Note on streak freeze update:", sf_err)

            # I-update ang database gamit ang list/json object para sa jsonb column
            supabase.table('users').update({
                "inventory": current_inventory
            }).eq('email', email).execute()

        return jsonify({"success": True, "inventory": current_inventory}), 200

    except Exception as e:
        print("Error claiming reward:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/claim-streak-reward', methods=['POST'])
def claim_streak_reward():
    data = request.json
    email = data.get('email')
    days = data.get('days')

    if not email or days is None:
        return jsonify({"success": False, "message": "Email and days are required"}), 400

    try:
        # 1. Kunin ang user data (inventory, coins, current_xp) mula sa database
        user_res = supabase.table('users').select('inventory, coins, current_xp, max_xp, level').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        user = user_res.data[0]
        current_inventory = user.get('inventory') or []
        if isinstance(current_inventory, str):
            try:
                current_inventory = json.loads(current_inventory)
            except:
                current_inventory = []
        
        reward_key = f"streak_{days}_reward"
        if reward_key in current_inventory:
            return jsonify({"success": False, "message": "Reward already claimed."}), 400

        # 2. Tukuyin ang kaukulang gantimpala batay sa araw (days)
        # Halimbawa: 1 day = 5 coins, 3 days = 10 coins, 7 days = 20 coins, 14 days = 75 XP, 21 days = 100 XP
        coins_to_add = 0
        xp_to_add = 0

        if days == 1:
            coins_to_add = 5
        elif days == 3:
            coins_to_add = 10
        elif days == 7:
            coins_to_add = 20
        elif days == 14:
            xp_to_add = 75
        elif days == 21:
            xp_to_add = 100

        current_coins = user.get('coins', 100)
        current_xp = user.get('current_xp', 0)

        new_coins = current_coins + coins_to_add
        new_xp = current_xp + xp_to_add

        # Idagdag ang reward key sa inventory
        current_inventory.append(reward_key)

        update_payload = {
            "inventory": current_inventory,
            "coins": new_coins,
            "current_xp": new_xp
        }

        # Kung may XP na nadagdag, i-recalculate din ang level kung kinakailangan
        if xp_to_add > 0:
            LEVEL_MATRIX = [
                {"level": 1, "cumulativeXP": 0, "nextXP": 1701},
                {"level": 5, "cumulativeXP": 1701, "nextXP": 11102},
                {"level": 10, "cumulativeXP": 11102, "nextXP": 31993},
                {"level": 15, "cumulativeXP": 31993, "nextXP": 67128},
                {"level": 20, "cumulativeXP": 67128, "nextXP": 118800},
                {"level": 25, "cumulativeXP": 118800, "nextXP": 189018},
                {"level": 30, "cumulativeXP": 189018, "nextXP": 392183},
                {"level": 40, "cumulativeXP": 392183, "nextXP": 689494},
                {"level": 50, "cumulativeXP": 689494, "nextXP": 689494}
            ]
            new_level = user.get('level', 1)
            new_max_xp = user.get('max_xp', 1701)
            for item in LEVEL_MATRIX:
                if new_xp >= item["cumulativeXP"]:
                    new_level = item["level"]
                    new_max_xp = item["nextXP"]
            update_payload["level"] = new_level
            update_payload["max_xp"] = new_max_xp

        # 3. I-update ang Supabase database
        supabase.table('users').update(update_payload).eq('email', email).execute()

        return jsonify({
            "success": True, 
            "inventory": current_inventory,
            "coins": new_coins,
            "currentXP": new_xp
        }), 200

    except Exception as e:
        print("Error claiming streak reward:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/remove-friend', methods=['POST'])
def remove_friend():
    data = request.get_json()
    user_email = data.get('userEmail')
    friend_email = data.get('friendEmail')

    if not user_email or not friend_email:
        return jsonify({"success": False, "message": "Both emails are required."}), 400

    try:
        # Burahin ang friendship record kahit anong posisyon nila sa sender o receiver
        supabase.table('friendships').delete().or_(
            f"and(sender_email.eq.{user_email},receiver_email.eq.{friend_email}),and(sender_email.eq.{friend_email},receiver_email.eq.{user_email})"
        ).execute()

        return jsonify({"success": True, "message": "Friend removed successfully!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/save-user-tool', methods=['POST'])
def save_user_tool():
    data = request.json
    email = data.get('email')
    new_tool = data.get('tool')

    if not email or not new_tool:
        return jsonify({"success": False, "message": "Email and tool data required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        current_inventory = user_res.data[0].get('inventory') or []
        if isinstance(current_inventory, str):
            try:
                current_inventory = json.loads(current_inventory)
            except:
                current_inventory = []

        # I-update o idagdag ang tool sa inventory list
        tool_id = new_tool.get('id')
        current_inventory = [t for t in current_inventory if isinstance(t, dict) and t.get('id') != tool_id]
        current_inventory.insert(0, new_tool)

        supabase.table('users').update({
            "inventory": current_inventory
        }).eq('email', email).execute()

        return jsonify({"success": True, "inventory": current_inventory}), 200

    except Exception as e:
        print("Error saving user tool:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/get-user-tools', methods=['GET'])
def get_user_tools():
    email = request.args.get('email')
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    try:
        user_res = supabase.table('users').select('inventory').eq('email', email).execute()
        if not user_res.data:
            return jsonify({"success": False, "message": "User not found"}), 404

        inventory = user_res.data[0].get('inventory') or []
        if isinstance(inventory, str):
            try:
                inventory = json.loads(inventory)
            except:
                inventory = []

        return jsonify({"success": True, "inventory": inventory}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/send-feedback', methods=['POST'])
def send_feedback():
    data = request.json
    email = data.get('email', 'Anonymous User')
    rating = data.get('rating')
    feedback_text = data.get('feedbackText')

    if not rating or not feedback_text:
        return jsonify({"success": False, "message": "Rating and feedback text are required."}), 400

    try:
        sender_email = os.getenv("MAIL_USERNAME")
        sender_password = os.getenv("MAIL_PASSWORD")

        if not sender_email or not sender_password:
            return jsonify({"success": False, "message": "Email credentials are not configured in environment."}), 500

        # Gumawa ng email message gamit ang MIMEMultipart (tulad ng forgot-password)
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = "supportstudycircle@gmail.com"  # Ang email kung saan matatanggap ang feedback
        msg['Subject'] = f"New Feedback Received: {rating} Experience - StudyCircle"

        email_body = f"""
Hello StudyCircle Team,

You have received a new feedback and feature idea from a user:

- User Email: {email}
- Rating: {rating}
- Feedback / Ideas: 
{feedback_text}

- StudyCircle Automated System
        """
        msg.attach(MIMEText(email_body, 'plain'))

        # Ipadala ang email sa pamamagitan ng Gmail SMTP (parehong setup sa forgot password)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, "supportstudycircle@gmail.com", msg.as_string())
        server.quit()

        return jsonify({"success": True, "message": "Feedback sent successfully!"}), 200

    except Exception as e:
        print("Error sending feedback email:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    try:
        res = supabase.table('rooms').select('*').order('created_at', desc=True).execute()
        return jsonify({'success': True, 'rooms': res.data}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/rooms', methods=['POST'])
def create_room():
    data = request.get_json() or {}
    host = data.get('host')
    max_members = int(data.get('max_members', 4))
    
    try:
        # Enforce 3-room limit only if it's a group room (max_members > 1)
        if max_members > 1:
            today_str = datetime.now().strftime('%Y-%m-%d')
            existing = supabase.table('rooms').select('*').eq('host', host).execute()
            today_rooms = [r for r in existing.data if r.get('created_at', '').startswith(today_str) and r.get('max_members', 4) > 1]
            
            if len(today_rooms) >= 3:
                return jsonify({'success': False, 'error': 'Room limit reached! You can only host a maximum of 3 group rooms per day.'}), 400

        # WALA NA ANG room_config DITO PARA HINDI NA MAG-ERROR ANG SUPABASE.
        # Ang custom design ng room ay kukunin na lang dynamic galing sa 'users' profile table ng host kapag may nag-join.
        room_payload = {
            "name": data.get('name'),
            "course": data.get('course', 'General Studies'),
            "host": host,
            "privacy": data.get('privacy', 'public'),
            "code": data.get('code'),
            "current_members": data.get('current_members', 1),
            "max_members": max_members,
            "technique": data.get('technique', 'Pomodoro'),
            "focus": data.get('focus', '1h 00m'),
            "break_time": data.get('breakTime', '0h 15m'),
            "sessions": data.get('sessions', 1),
            "tasks": data.get('tasks', []),
            "xp": data.get('xp', 0),
            "coins": data.get('coins', 0)
        }
        
        res = supabase.table('rooms').insert(room_payload).execute()
        return jsonify({'success': True, 'room': res.data[0]}), 201
        
    except Exception as e:
        print("ROOM CREATION ERROR:", str(e))
        return jsonify({'success': False, 'error': str(e)}), 500

# Halimbawa ng in-memory room members tracker para sa real-time sync
room_members = {}

@socketio.on('join_room')
def on_join_room(data):
    room = data.get('room')
    username = data.get('username')
    avatar_config = data.get('avatar_config')
    status = data.get('status', 'ONLINE')
    level = data.get('level', 1)
    
    join_room(room)
    
    if room not in room_members:
        room_members[room] = []
    
    # Issue 3 Fix: Get real user email and specific avatar config directly from DB
    user_email = ""
    db_avatar = avatar_config
    try:
        u_res = supabase.table('users').select('email, avatar_config, level').eq('username', username).execute()
        if u_res.data:
            user_email = u_res.data[0].get('email', '')
            db_avatar = u_res.data[0].get('avatar_config')
            level = u_res.data[0].get('level', level)
    except Exception as e:
        print("Error fetching user info:", e)

    # Issue 7 Fix: Verify exactly who the host is
    is_host = False
    try:
        room_res = supabase.table('rooms').select('host').eq('name', room).execute()
        if room_res.data and room_res.data[0].get('host') == username:
            is_host = True
    except Exception as e:
        print("Error verifying host status:", e)

    existing_user = next((m for m in room_members[room] if m['username'] == username), None)
    if existing_user:
        existing_user['status'] = status
        if db_avatar:
            existing_user['avatar_config'] = db_avatar
        existing_user['level'] = level
        existing_user['isHost'] = is_host
        existing_user['email'] = user_email
    else:
        room_members[room].append({
            'id': username,
            'username': username,
            'email': user_email,
            'status': status,
            'avatar_config': db_avatar,
            'level': level,
            'isHost': is_host
        })
    
    emit('room_update', {
        'members': room_members[room],
        'logs': [{'id': 'log_' + username, 'user': username, 'action': 'joined the room', 'time': 'Just now'}]
    }, room=room)

@socketio.on('update_status')
def on_update_status(data):
    room = data.get('room')
    username = data.get('username')
    status = data.get('status')
    
    if room in room_members:
        for m in room_members[room]:
            if m['username'] == username:
                m['status'] = status
        emit('room_update', {'members': room_members[room], 'logs': []}, room=room)

@socketio.on('leave_room')
def on_leave_room(data):
    room = data.get('room')
    username = data.get('username')
    
    leave_room(room)
    
    if room in room_members:
        room_members[room] = [m for m in room_members[room] if m['username'] != username]
        emit('room_update', {
            'members': room_members[room],
            'logs': [{'id': 'leave_' + username, 'user': username, 'action': 'left the room', 'time': 'Just now'}]
        }, room=room)

@socketio.on('send_room_message')
def on_send_room_message(data):
    room = data.get('room')
    # I-broadcast sa lahat ng nasa room kasama ang nag-send
    emit('receive_room_message', data, room=room)

# --- TRACK PENDING JOIN REQUESTS ---
# Stores { room_name: { guest_username: socket_id } } or maps rooms to hosts
room_hosts = {}

@socketio.on('request_join_room')
def handle_request_join_room(data):
    room_name = data.get('room')
    guest_username = data.get('username')
    
    # Broadcast specifically to the room so only members/host of that room receive it
    emit('incoming_join_request', {
        'username': guest_username,
        'room': room_name
    }, room=room_name)

@socketio.on('host_room_response')
def handle_host_response(data):
    room_name = data.get('room')
    username = data.get('username') # Ito si 'hell'
    approved = data.get('approved')
    
    # I-broadcast pabalik sa room o sa user na nag-request
    emit('join_request_decision', {
        'username': username,
        'approved': approved,
        'room': room_name
    }, broadcast=True)

@socketio.on('webrtc_offer')
def handle_webrtc_offer(data):
    # I-forward ang offer sa partikular na target peer
    socketio.emit('webrtc_offer', data, room=data.get('target'))

@socketio.on('webrtc_answer')
def handle_webrtc_answer(data):
    socketio.emit('webrtc_answer', data, room=data.get('target'))

@socketio.on('webrtc_ice_candidate')
def handle_ice_candidate(data):
    socketio.emit('webrtc_ice_candidate', data, room=data.get('target'))

@socketio.on('update_speaking_status')
def handle_speaking_status(data):
    room = data.get('room')
    username = data.get('username')
    is_speaking = data.get('isSpeaking')
    # I-broadcast sa iba pang nasa loob ng room maliban sa nag-trigger
    emit('member_speaking_update', {'username': username, 'isSpeaking': is_speaking}, room=room, include_self=False)    

@socketio.on('kick_room_member')
def handle_kick_room_member(data):
    room = data.get('room')
    target_username = data.get('username')
    
    # I-broadcast sa buong room (o sa partikular na user) na sila ay na-kick
    emit('kicked_from_room', {'username': target_username}, room=room)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)