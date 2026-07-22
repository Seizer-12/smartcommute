import asyncio
from html import escape
import logging
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_account_email(
    recipient: str,
    subject: str,
    recipient_name: str,
    heading: str,
    intro: str,
    action_url: str,
    action_label: str,
    expiry: str,
) -> bool:
    """Send a branded multipart account email through the configured SMTP server."""
    if not settings.SMTP_HOST:
        logger.warning("SMTP is not configured; account email to %s was not sent.", recipient)
        return False

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = formataddr(("SmartCommute", settings.EMAIL_FROM))
    message["To"] = recipient
    plain_text = (
        f"Hello {recipient_name},\n\n{intro}\n\n"
        f"{action_label}: {action_url}\n\n"
        f"This link expires in {expiry}. If you did not request this, you can safely ignore this email.\n\n"
        "SmartCommute"
    )
    message.set_content(plain_text)
    message.add_alternative(
        f"""\
<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
    <div style="padding:24px 32px;background:#0f4c81;color:#ffffff;font-size:22px;font-weight:700">SmartCommute</div>
    <div style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:24px">{escape(heading)}</h1>
      <p style="line-height:1.6">Hello {escape(recipient_name)},</p>
      <p style="line-height:1.6">{escape(intro)}</p>
      <p style="margin:28px 0"><a href="{escape(action_url, quote=True)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700">{escape(action_label)}</a></p>
      <p style="line-height:1.6;color:#475569;font-size:14px">This link expires in {escape(expiry)}. If you did not request this, you can safely ignore this email.</p>
    </div>
  </div>
</body></html>""",
        subtype="html",
    )

    def send() -> None:
        smtp_client = smtplib.SMTP_SSL if settings.SMTP_USE_SSL else smtplib.SMTP
        with smtp_client(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS and not settings.SMTP_USE_SSL:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)

    try:
        await asyncio.to_thread(send)
        return True
    except Exception:
        logger.exception("Could not send account email to %s", recipient)
        return False
