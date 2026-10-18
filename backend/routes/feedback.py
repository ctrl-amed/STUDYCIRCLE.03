"""User feedback (emailed to the support inbox)."""
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from flask import Blueprint, jsonify, request

feedback_bp = Blueprint('feedback', __name__)


@feedback_bp.route('/api/send-feedback', methods=['POST'])
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

        # Build the email message using MIMEMultipart (same as forgot-password)
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = "supportstudycircle@gmail.com"  # Where feedback will be received
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

        # Send the email via Gmail SMTP (same setup as forgot password)
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, "supportstudycircle@gmail.com", msg.as_string())
        server.quit()

        return jsonify({"success": True, "message": "Feedback sent successfully!"}), 200

    except Exception as e:
        print("Error sending feedback email:", str(e))
        return jsonify({"success": False, "message": str(e)}), 500
