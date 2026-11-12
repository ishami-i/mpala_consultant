from flask import current_app
from flask_mail import Mail, Message

mail = Mail()


def notify_company(project_id, owner_name, budget):
    """Short heads-up only: name + budget + link. Everything else lives in the dashboard."""
    link = f"{current_app.config['DASHBOARD_URL']}#project-{project_id}"
    msg = Message(
        subject=f"New project: {owner_name}",
        sender=current_app.config["MAIL_USERNAME"],
        recipients=[current_app.config["COMPANY_EMAIL"]],
    )
    msg.body = (
        f"New project from {owner_name}\n"
        f"Budget: {budget:,.0f} RWF\n\n"
        f"See the full details in the dashboard:\n{link}"
    )
    mail.send(msg)


def thank_client(client_email, owner_name):
    msg = Message(
        subject="We received your project",
        sender=current_app.config["MAIL_USERNAME"],
        recipients=[client_email],
    )
    msg.body = (
        f"Hello {owner_name},\n\n"
        "Thank you for trusting us with your project. "
        "We have received it and will get back to you as soon as possible."
    )
    mail.send(msg)
