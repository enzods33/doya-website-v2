#!/usr/bin/env python3
"""Quiet Telegram alert/recovery digest for the Doya Kuma group."""
import json
import sqlite3
import urllib.parse
import urllib.request
from pathlib import Path

DB = "/app/data/kuma.db"
STATE = Path("/app/data/doya-alert-digest.state")
STATUS_URL = "https://monitoring.guzzler-bot.cloud/status/doya"


def send(token, chat, message):
    body = urllib.parse.urlencode({
        "chat_id": str(chat),
        "text": message[:3900],
        "disable_web_page_preview": "true",
    }).encode()
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendMessage", data=body, method="POST"
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        response.read()


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    group = con.execute("SELECT id FROM 'group' WHERE name='Doya'").fetchone()
    if not group:
        raise SystemExit("Doya group missing")
    rows = [dict(row) for row in con.execute(
        """SELECT m.id, m.name, h.status, h.msg
           FROM monitor m JOIN monitor_group mg ON mg.monitor_id=m.id
           LEFT JOIN heartbeat h ON h.id=(SELECT id FROM heartbeat WHERE monitor_id=m.id ORDER BY id DESC LIMIT 1)
           WHERE mg.group_id=? AND m.active=1 ORDER BY mg.weight,m.id""",
        (group["id"],),
    )]
    config = json.loads(con.execute("SELECT config FROM notification WHERE id=1").fetchone()[0])
    con.close()
    token = config.get("telegramBotToken")
    chat = config.get("telegramChatID")
    if not token or not chat:
        raise SystemExit("Telegram config missing")

    previous = {}
    if STATE.exists():
        try:
            previous = json.loads(STATE.read_text(encoding="utf-8"))
        except Exception:
            pass

    downs = [row for row in rows if row["status"] == 0]
    pending = [row for row in rows if row["status"] != 1]
    if not downs:
        if pending:
            print("pending, quiet")
            return
        if previous.get("down"):
            send(token, chat, f"✅ Doya — rétabli\nToutes les sondes Doya sont UP.\n{STATUS_URL}")
            STATE.write_text(json.dumps({"down": False}), encoding="utf-8")
            print("recovered")
        else:
            print("ok quiet")
        return

    fingerprint = "|".join(f"{row['id']}:{(row['msg'] or '')[:120]}" for row in downs)
    if previous.get("down") and previous.get("fingerprint") == fingerprint:
        print("same incident, quiet")
        return
    lines = ["🔴 Doya — ALERTE"]
    for row in downs[:6]:
        detail = (row["msg"] or "aucun résultat reçu").strip()[:180]
        lines.append(f"• {row['name']} — {detail}")
    if len(downs) > 6:
        lines.append(f"• … +{len(downs) - 6} autre(s)")
    lines.extend(["", f"📊 {STATUS_URL}"])
    send(token, chat, "\n".join(lines))
    STATE.write_text(json.dumps({"down": True, "fingerprint": fingerprint}), encoding="utf-8")
    print(f"alerted {len(downs)}")


if __name__ == "__main__":
    main()
