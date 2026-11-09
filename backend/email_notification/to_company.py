import os
from flask import Flask
from flask_mail import Mail, Message
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Bind environment variables to Flask config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

mail = Mail(app)

@app.route('/send-welcome')
def send_welcome():
    msg = Message(
        subject="Welcome to Our Web App!",
        sender=app.config['MAIL_USERNAME'],
        recipients=["ericnzayiseng1@gmail.com"]
    )
    msg.body = "Thank you for signing up!"
    msg.html = "<h1>Thank you for signing up!</h1>"
    
    try:
        mail.send(msg)
        return "Email sent successfully!"
    except Exception as e:
        return f"Failed to send email: {str(e)}", 500
