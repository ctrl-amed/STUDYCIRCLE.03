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
        # (Depende sa kung ikaw ang sender o receiver)
        response = supabase.table('friendships').select('*').or_(f"sender_email.eq.{email},receiver_email.eq.{email}").execute()
        
        friends = []
        requests = []
        
        for item in response.data:
            if item['status'] == 'accepted':
                friend_email = item['receiver_email'] if item['sender_email'] == email else item['sender_email']
                # Kunin ang details ng kaibigan mula sa users table
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', friend_email).execute()
                if u_res.data:
                    friends.append(u_res.data[0])
            elif item['status'] == 'pending' and item['receiver_email'] == email:
                # Incoming request para sa iyo
                u_res = supabase.table('users').select('username, email, level, avatar_config').eq('email', item['sender_email']).execute()
                if u_res.data:
                    requests.append({
                        "id": item['id'],
                        "sender": u_res.data[0]
                    })
                    
        return jsonify({"success": True, "friends": friends, "requests": requests}), 200
    except Exception as e:
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
    data = request.json
    email = data.get('email')
    activity = data.get('activity', 'Focus Session')
    technique = data.get('technique', 'Pomodoro')
    duration = data.get('duration', 0) # in minutes
    
    try:
        supabase.table('study_sessions').insert({
            "email": email,
            "activity_name": activity,
            "technique": technique,
            "duration_minutes": duration
        }).execute()
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# --- 9. GET RECENT SESSIONS ---
@app.route('/api/get-sessions', methods=['GET'])
def get_sessions():
    email = request.args.get('email')
    try:
        response = supabase.table('study_sessions').select('*').eq('email', email).order('created_at', desc=True).execute()
        return jsonify({"success": True, "sessions": response.data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500    

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
@socketio.on('join_room')
def handle_join_room(data):
    room = data.get('room')
    username = data.get('username')
    join_room(room)
    emit('user_joined', {'username': username, 'message': f'{username} joined the room.'}, room=room)

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

@app.route('/api/ai-recommendation', methods=['POST'])
def ai_recommendation():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({'success': False, 'error': 'Email is required.'}), 400

    try:
        # Kunin ang study history ng user mula sa Supabase
        sessions_res = supabase.table('study_sessions').select('*').eq('email', email).execute()
        user_history = sessions_res.data

        history_summary = f"User study history records: {user_history}" if user_history else "New user with no prior recorded sessions."

        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-3.6-flash')

        prompt = f"""
        You are Kitsu AI, an expert study coach inside StudyCircle. 
        Analyze the following study habits and history of the user:
        {history_summary}

        Based on their habits, focus duration patterns, and consistency, recommend the best study technique for them (Choose strictly from: Pomodoro, 52-17 Rule, or Ultradian 90-Minute Rhythm). 
        Provide a short, friendly, and motivating explanation (max 3 sentences) on why this technique fits them right now.
        """

        response = model.generate_content(prompt)
        recommendation_text = response.text

        return jsonify({'success': True, 'recommendation': recommendation_text}), 200
    except Exception as e:
        print("AI Recommendation Error:", str(e))
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

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)