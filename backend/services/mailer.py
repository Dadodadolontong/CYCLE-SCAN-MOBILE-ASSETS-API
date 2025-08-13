from email.message import EmailMessage
import smtplib
import ssl
from config import config

def send_email(to: str, subject: str, html: str):
    if not config.SMTP_HOST or not config.SMTP_FROM:
        return
    msg = EmailMessage()
    msg['From'] = config.SMTP_FROM
    msg['To'] = to
    msg['Subject'] = subject
    msg.set_content(html, subtype='html')
    context = ssl.create_default_context()
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
        if config.SMTP_TLS:
            server.starttls(context=context)
        if config.SMTP_USER:
            server.login(config.SMTP_USER, config.SMTP_PASSWORD)
        server.send_message(msg)

