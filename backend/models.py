from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.sql import func

db = SQLAlchemy()

# Association table for Friendships
friendships = db.Table('friendships',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('friend_id', db.Integer, db.ForeignKey('users.id'), primary_key=True)
)

class User(db.Model):
    __tablename__ = 'users'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False) # Kailangan para sa login
    password_hash = db.Column(db.String(128), nullable=False)      # Bcrypt hash para sa seguridad
    
    # Game Stats & Dashboard Fields
    level = db.Column(db.Integer, default=1)
    current_xp = db.Column(db.Integer, default=0)
    max_xp = db.Column(db.Integer, default=100)
    coins = db.Column(db.Integer, default=100)
    streak = db.Column(db.Integer, default=0)
    study_sparks = db.Column(db.Integer, nullable=False, default=0)
    
    # Profile & Customization
    avatar_url = db.Column(db.Text, nullable=True, default="")
    inventory = db.Column(db.JSON, default=list)
    badges = db.Column(db.Text, nullable=True, default="")
    
    # Detailed Statistics
    total_study_hours = db.Column(db.Float, default=0.0)
    rooms_created = db.Column(db.Integer, default=0)
    avg_quiz_score = db.Column(db.Integer, default=0)
    best_streak = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, server_default=func.now())

    # Self-referential relationship for friends
    friends = db.relationship(
        'User',
        secondary=friendships,
        primaryjoin=(friendships.c.user_id == id),
        secondaryjoin=(friendships.c.friend_id == id),
        lazy='subquery'
    )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "level": self.level,
            "currentXP": self.current_xp,
            "maxXP": self.max_xp,
            "coins": self.coins,
            "streak": self.streak,
            "studySparks": self.study_sparks,
            "avatarUrl": self.avatar_url or "",
            "inventory": self.inventory if self.inventory else [],
            "badges": self.badges.split(",") if self.badges else [],
            "totalStudyHours": self.total_study_hours,
            "roomsCreated": self.rooms_created,
            "avgQuizScore": self.avg_quiz_score,
            "bestStreak": self.best_streak
        }

class Message(db.Model):
    __tablename__ = "messages"
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "receiver_id": self.receiver_id,
            "text": self.text,
            "created_at": self.created_at.isoformat()
        }

class StudySession(db.Model):
    __tablename__ = "study_sessions"
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    duration_minutes = db.Column(db.Integer, default=0)
    completed_tasks = db.Column(db.Integer, default=0)
    xp_earned = db.Column(db.Integer, default=0)
    coins_earned = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())