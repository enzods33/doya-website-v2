#!/usr/bin/env python3
"""Idempotent Uptime Kuma setup for Doya. Run inside the Kuma container."""
import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB = "/app/data/kuma.db"
TOKENS_FILE = "/tmp/doya-push-tokens.json"
SLUG = "doya"

PUSH_MONITORS = (
    (
        "KUMA_PUSH_DOYA_PUBLIC",
        "Doya — Site public & back-office (Playwright)",
        1200,
        20,
        "Lecture seule: rendu du site, medias principaux et porte Google du back-office. Aucun clic OAuth.",
    ),
    (
        "KUMA_PUSH_DOYA_COMMERCE",
        "Doya — Panier & paiement (Playwright)",
        1200,
        30,
        "Panier reel, CGV, affichage Stripe et fallbacks. Stripe/Brevo simules dans le navigateur; aucune commande ni reservation de stock.",
    ),
    (
        "KUMA_PUSH_DOYA_INTEGRATIONS",
        "Doya — Écoute, réseaux & Brevo (Playwright)",
        1200,
        40,
        "Verifie les liens officiels, menus d'ecoute et messages newsletter. Brevo simule; aucun contact cree et aucun lien externe ouvert.",
    ),
    (
        "KUMA_PUSH_DOYA_API",
        "Doya — API catalogue & fonctions",
        1200,
        50,
        "GET uniquement sur le catalogue public et OPTIONS sur Stripe, Brevo et Auth admin. Aucune ecriture base ou stockage.",
    ),
)


def clone_row(cur, table, source, updates):
    columns = [r["name"] for r in cur.execute(f"PRAGMA table_info('{table}')")]
    values = {column: source[column] for column in columns if column != "id"}
    values.update(updates)
    keys = list(values)
    cur.execute(
        f"INSERT INTO '{table}' ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})",
        [values[key] for key in keys],
    )
    return cur.lastrowid


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    backup_dir = Path("/app/data/backups")
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"kuma-before-doya-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}.db"
    backup = sqlite3.connect(backup_path)
    con.backup(backup)
    backup.close()
    cur = con.cursor()

    page = cur.execute("SELECT id FROM status_page WHERE slug=?", (SLUG,)).fetchone()
    if page:
        page_id = page["id"]
        cur.execute(
            "UPDATE status_page SET title='Doya', description=?, published=1 WHERE id=?",
            ("Statut du site Doya, du panier, du paiement et des integrations publiques.", page_id),
        )
    else:
        sample = cur.execute("SELECT * FROM status_page WHERE slug='dojokai'").fetchone()
        if not sample:
            raise SystemExit("refus: page modele dojokai absente")
        page_id = clone_row(cur, "status_page", sample, {
            "slug": SLUG,
            "title": "Doya",
            "description": "Statut du site Doya, du panier, du paiement et des integrations publiques.",
            "published": 1,
            "password": None,
        })

    group = cur.execute(
        "SELECT id FROM 'group' WHERE status_page_id=? AND name='Doya'", (page_id,)
    ).fetchone()
    if group:
        group_id = group["id"]
        cur.execute("UPDATE 'group' SET public=1, active=1, weight=1 WHERE id=?", (group_id,))
    else:
        cur.execute(
            "INSERT INTO 'group' (name, public, active, weight, status_page_id) VALUES ('Doya',1,1,1,?)",
            (page_id,),
        )
        group_id = cur.lastrowid

    site_id = 11
    site = cur.execute("SELECT id FROM monitor WHERE id=?", (site_id,)).fetchone()
    if not site:
        raise SystemExit("refus: sonde HTTP Doya id=11 absente")
    cur.execute(
        """UPDATE monitor SET name=?, active=1, interval=300, retry_interval=60,
           maxretries=2, expiry_notification=1, description=? WHERE id=?""",
        (
            "Doya — Site public (HTTP)",
            "Disponibilite HTTP et certificat TLS du site Doya. Aucun parcours utilisateur ni appel API.",
            site_id,
        ),
    )

    template = cur.execute("SELECT * FROM monitor WHERE id=14 AND type='push'").fetchone()
    if not template:
        raise SystemExit("refus: sonde push modele id=14 absente")

    monitor_ids = [(site_id, 10)]
    secrets_out = {}
    for env_key, name, interval, weight, description in PUSH_MONITORS:
        existing = cur.execute("SELECT * FROM monitor WHERE name=?", (name,)).fetchone()
        if existing:
            monitor_id = existing["id"]
            token = existing["push_token"] or secrets.token_hex(24)
            cur.execute(
                """UPDATE monitor SET active=1, type='push', interval=?, retry_interval=300,
                   maxretries=1, weight=?, description=?, push_token=? WHERE id=?""",
                (interval, weight, description, token, monitor_id),
            )
        else:
            token = secrets.token_hex(24)
            monitor_id = clone_row(cur, "monitor", template, {
                "name": name,
                "active": 1,
                "type": "push",
                "url": None,
                "push_token": token,
                "interval": interval,
                "retry_interval": 300,
                "maxretries": 1,
                "weight": weight,
                "description": description,
            })
        monitor_ids.append((monitor_id, weight))
        secrets_out[env_key] = f"https://monitoring.guzzler-bot.cloud/api/push/{token}"

    for monitor_id, weight in monitor_ids:
        cur.execute("DELETE FROM monitor_group WHERE monitor_id=?", (monitor_id,))
        cur.execute(
            "INSERT INTO monitor_group (monitor_id, group_id, weight) VALUES (?,?,?)",
            (monitor_id, group_id, weight),
        )
        # Telegram is emitted once per incident by the Doya digest.
        cur.execute("DELETE FROM monitor_notification WHERE monitor_id=?", (monitor_id,))

    con.commit()
    con.close()
    with open(TOKENS_FILE, "w", encoding="utf-8") as stream:
        json.dump(secrets_out, stream)
    print(f"Backup: {backup_path}")
    print(f"Doya configured: page={page_id} group={group_id} monitors={[m for m, _ in monitor_ids]}")


if __name__ == "__main__":
    main()
