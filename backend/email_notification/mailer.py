from html import escape

from flask import current_app
from flask_mail import Mail, Message

mail = Mail()


def _cfg(key):
    return current_app.config[key]


def _sender():
    return (_cfg("MAIL_FROM_NAME"), _cfg("MAIL_FROM"))


def notify_company(project_id, owner_name, budget, service=""):
    """Short heads-up only: name, service, budget and a link. Everything else lives in the dashboard."""
    link = f"{_cfg('DASHBOARD_URL')}#project-{project_id}"
    msg = Message(
        subject=f"New project: {owner_name}",
        sender=_sender(),
        recipients=[_cfg("COMPANY_EMAIL")],
    )
    msg.body = (
        f"New project from {owner_name}\n"
        + (f"Service: {service}\n" if service else "")
        + f"Budget: {budget:,.0f} RWF\n\n"
        f"See the full details in the dashboard:\n{link}\n\n"
        f"Sent by the {_cfg('COMPANY_NAME')} website."
    )
    mail.send(msg)


def thank_client(client_email, owner_name, service="", paid=False, location=""):
    """A friendly, plain confirmation with real links and who we are, in text and HTML."""
    site = _cfg("SITE_URL")
    contact = _cfg("PUBLIC_EMAIL")
    company, address, tin = _cfg("COMPANY_NAME"), _cfg("COMPANY_ADDRESS"), _cfg("COMPANY_TIN")
    gallery, services = f"{site}/gallery", f"{site}/#services"

    about = ""
    if service and location:
        about = f" for {service} ({location})"
    elif service:
        about = f" for {service}"
    paid_note = (
        "This is a paid service. We will contact you with the fee and how to pay. "
        "Payment is not made on our website."
    )

    # ---- plain text
    text = [
        f"Hello {owner_name},",
        "",
        f"Thank you for contacting {company}. We have received your project request{about}.",
        "",
        "What happens next:",
        "- Our team will read your project details and contact you by phone or email.",
    ]
    if paid:
        text.append(f"- {paid_note}")
    text += [
        f"- If you want to add something, reply to this email or write to {contact}.",
        "",
        f"See some of our work: {gallery}",
        f"Our services: {services}",
        f"Our website: {site}",
        "",
        "Kind regards,",
        company,
        "Architectural study and construction",
        address,
        f"TIN {tin}",
        contact,
        "",
        f"You received this email because a project request was submitted with your address on {site}.",
    ]

    # ---- HTML (every value that came from the client is escaped)
    e = escape
    link = "color:#0f5c55;"
    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif;color:#14302c;line-height:1.55;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;padding:28px;border:1px solid #d5dfdc;">
<p style="margin:0 0 16px;">Hello {e(owner_name)},</p>
<p style="margin:0 0 16px;">Thank you for contacting {e(company)}. We have received your project request{e(about)}.</p>
<p style="margin:0 0 6px;"><strong>What happens next</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;">
<li>Our team will read your project details and contact you by phone or email.</li>
{f'<li>{e(paid_note)}</li>' if paid else ''}
<li>If you want to add something, reply to this email or write to <a href="mailto:{e(contact)}" style="{link}">{e(contact)}</a>.</li>
</ul>
<p style="margin:0 0 16px;">
See <a href="{e(gallery)}" style="{link}">some of our work</a>,
read about <a href="{e(services)}" style="{link}">our services</a>,
or visit <a href="{e(site)}" style="{link}">{e(site)}</a>.
</p>
<p style="margin:0 0 16px;">Kind regards,<br>
<strong>{e(company)}</strong><br>
Architectural study and construction<br>
{e(address)}<br>
TIN {e(tin)}<br>
<a href="mailto:{e(contact)}" style="{link}">{e(contact)}</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#5d716d;">You received this email because a project request was submitted with your address on {e(site)}.</p>
</div></body></html>"""

    msg = Message(
        subject=f"We received your project request - {company}",
        sender=_sender(),
        recipients=[client_email],
        reply_to=contact,  # replies go to the public address, not to the sending account
    )
    msg.body = "\n".join(text)
    msg.html = html
    mail.send(msg)
