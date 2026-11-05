
import os
import ssl
import json
import certifi
import resend
import ipaddress
import urllib.request
from pathlib import Path
from html import escape
from datetime import datetime, timezone
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

def approximate_location(ip):
    try:
        address = ipaddress.ip_address(ip)
        if not address.is_global:
            return "Local or private network"

        context = ssl.create_default_context(cafile=certifi.where())
        request = urllib.request.Request(
            f"https://ipwho.is/{ip}",
            headers={"User-Agent": "RussellWealth/1.0"}
        )
        with urllib.request.urlopen(
            request, context=context, timeout=4
        ) as response:
            data = json.load(response)

        if data.get("success"):
            return ", ".join(
                str(data[k]) for k in ("city", "region", "country")
                if data.get(k)
            )
    except Exception:
        pass
    return "Location unavailable"


def send_login_notification(email, source_ip):
    api_key = os.getenv("RW_RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RW_RESEND_API_KEY missing")

    os.environ["SSL_CERT_FILE"] = certifi.where()
    resend.api_key = api_key

    recipient = os.getenv(
        "RW_ALERT_EMAIL", "edoneyrussell@gmail.com"
    )

    timestamp = datetime.now(timezone.utc).strftime(
        "%B %d, %Y · %I:%M:%S %p UTC"
    )
    location = approximate_location(source_ip)

    def row(label, value):
        return f"""
        <tr>
          <td style="padding:17px 12px 17px 0;
                     border-bottom:1px solid #30343b;
                     color:#8c929c;font-size:12px;
                     vertical-align:top;width:35%">
            {label}
          </td>
          <td style="padding:17px 0;
                     border-bottom:1px solid #30343b;
                     color:#f5f5f5;font-size:13px;
                     text-align:right;overflow-wrap:anywhere">
            {escape(str(value))}
          </td>
        </tr>
        """

    rows = (
        row("ACCOUNT", email)
        + row("DATE & TIME", timestamp)
        + row("IP ADDRESS", source_ip)
        + row("LOCATION", location)
        + row("STATUS", "SUCCESSFUL")
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport"
            content="width=device-width,initial-scale=1">
      <meta name="color-scheme" content="dark">
    </head>
    <body style="margin:0;background:#080b0e;
                 font-family:Inter,Arial,sans-serif;
                 color:#f5f5f5">

      <table role="presentation" width="100%"
             cellpadding="0" cellspacing="0"
             bgcolor="#080b0e"
             style="background:#080b0e;padding:35px 12px">
        <tr><td align="center">

          <table role="presentation" width="100%"
                 cellpadding="0" cellspacing="0"
                 bgcolor="#14171c"
                 style="max-width:560px;background:#14171c;
                        border:1px solid #30343b;
                        border-radius:14px">

            <tr><td style="padding:30px 32px;
                           border-bottom:1px solid #30343b">

              <img src="cid:russell-wealth-logo"
                   alt="RUSSELL WEALTH"
                   width="220"
                   style="display:block;width:220px;
                          max-width:100%;height:auto">

              <p style="color:#8c929c;font-size:10px;
                        letter-spacing:2px;margin:15px 0 0">
                ACCOUNT SECURITY
              </p>
            </td></tr>

            <tr><td style="padding:36px 32px">

              <p style="color:#8c929c;font-size:11px;
                        letter-spacing:2px;margin:0 0 14px">
                SECURITY NOTIFICATION / 001
              </p>

              <h1 style="font-family:Lora,Georgia,serif;
                         font-weight:400;font-size:30px;
                         color:#f5f5f5;margin:0 0 16px">
                Successful Sign-In
              </h1>

              <p style="font-size:14px;line-height:1.8;
                        color:#b4b8c0;margin:0 0 27px">
                A successful login was recorded on your
                Russell Wealth account. Review the
                session details below.
              </p>

              <table role="presentation" width="100%"
                     cellpadding="0" cellspacing="0"
                     bgcolor="#1a1d22"
                     style="background:#1a1d22;
                            border:1px solid #30343b;
                            border-radius:10px">
                <tr><td style="padding:22px">

                  <p style="font-size:12px;font-weight:600;
                            color:#25e487;margin:0 0 12px;
                            letter-spacing:1px">
                    &#9679; AUTHENTICATION SUCCESSFUL
                  </p>

                  <table role="presentation" width="100%"
                         cellpadding="0" cellspacing="0"
                         style="border-collapse:collapse">
                    {rows}
                  </table>

                </td></tr>
              </table>

              <p style="font-size:12px;line-height:1.8;
                        color:#b4b8c0;margin:26px 0 0">
                If you recognize this activity, no action
                is required. Otherwise, secure your
                account immediately.
              </p>

            </td></tr>

            <tr><td style="padding:24px 32px;
                           border-top:1px solid #30343b;
                           background:#101216">

              <p style="color:#f5f5f5;font-size:12px;
                        font-weight:600;letter-spacing:2px;
                        margin:0 0 9px">
                RUSSELL WEALTH
              </p>

              <p style="color:#8c929c;font-size:11px;
                        line-height:1.8;margin:0">
                Where wealth meets innovation.<br>
                Fictional fintech & cybersecurity
                portfolio project.<br>
                Automated account security notification.
              </p>

            </td></tr>
          </table>

        </td></tr>
      </table>
    </body>
    </html>
    """

    import base64
    logo = ROOT / "frontend/public/assets/c8aca.png"

    result = resend.Emails.send({
        "from": "Russell Wealth Security <onboarding@resend.dev>",
        "to": [recipient],
        "subject": "Russell Wealth | Successful Login Detected",
        "html": html,
        "attachments": [{
            "filename": "russell-wealth-logo.png",
            "content": list(logo.read_bytes()),
            "content_id": "russell-wealth-logo"
        }]
    })

    return result
