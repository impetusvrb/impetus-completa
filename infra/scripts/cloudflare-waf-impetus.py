#!/usr/bin/env python3
"""IMPETUS — Cloudflare WAF helper (scanner block + IP ban)."""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

API = "https://api.cloudflare.com/client/v4"
RULE_DESC = "IMPETUS block scanner paths (.env .git wp-admin)"


def scanner_expression() -> str:
    return """(
  http.request.uri.path contains "/.env" or
  http.request.uri.path contains "/.git" or
  http.request.uri.path contains "/wp-admin" or
  http.request.uri.path contains "/wp-login" or
  http.request.uri.path contains "/phpmyadmin" or
  http.request.uri.path contains "/.aws/" or
  http.request.uri.path contains "/actuator/" or
  http.request.uri.path contains "/.vscode/" or
  http.request.uri.path contains "/vendor/phpunit" or
  http.request.uri.path contains "/xmlrpc.php" or
  http.request.uri.path contains "/.DS_Store" or
  http.request.uri.path contains "/admin.php" or
  http.request.uri.path contains "/cgi-bin/" or
  http.request.uri.path eq "/env" or
  http.request.uri.path contains "/shell" or
  http.request.uri.path contains "/cmd" or
  http.request.uri.path contains "wp-config.php"
)""".replace("\n", " ").strip()


class CfClient:
    def __init__(self, token: str):
        self.token = token

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        data = None
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode()
        req = urllib.request.Request(f"{API}{path}", data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            payload = e.read().decode()
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                raise RuntimeError(f"HTTP {e.code}: {payload}") from e

    def zone_id(self, name: str) -> str:
        zid = os.environ.get("CLOUDFLARE_ZONE_ID", "").strip()
        if zid:
            return zid
        out = self.request("GET", f"/zones?name={name}")
        if not out.get("success"):
            raise RuntimeError(out.get("errors"))
        rows = out.get("result") or []
        if not rows:
            raise RuntimeError(f"Zone not found: {name}")
        return rows[0]["id"]

    def apply_scanner_rule(self, zone_id: str) -> None:
        entry = self.request("GET", f"/zones/{zone_id}/rulesets/phases/http_request_firewall_custom/entrypoint")
        expr = scanner_expression()
        rule_body = {
            "description": RULE_DESC,
            "expression": expr,
            "action": "block",
            "enabled": True,
        }
        if entry.get("success"):
            rsid = entry["result"]["id"]
            rules = entry["result"].get("rules") or []
            existing = next((r for r in rules if r.get("description") == RULE_DESC), None)
            if existing:
                rid = existing["id"]
                out = self.request("PATCH", f"/zones/{zone_id}/rulesets/{rsid}/rules/{rid}", rule_body)
            else:
                out = self.request("POST", f"/zones/{zone_id}/rulesets/{rsid}/rules", rule_body)
        else:
            out = self.request(
                "POST",
                f"/zones/{zone_id}/rulesets",
                {
                    "name": "IMPETUS custom firewall",
                    "description": "IMPETUS scanner block",
                    "kind": "zone",
                    "phase": "http_request_firewall_custom",
                    "rules": [rule_body],
                },
            )
        if not out.get("success"):
            raise RuntimeError(out.get("errors"))

    def blocked_ips(self, zone_id: str) -> set[str]:
        blocked: set[str] = set()
        page = 1
        while True:
            out = self.request("GET", f"/zones/{zone_id}/firewall/access_rules/rules?page={page}&per_page=100")
            if not out.get("success"):
                break
            for r in out.get("result") or []:
                if r.get("mode") == "block":
                    v = (r.get("configuration") or {}).get("value")
                    if v:
                        blocked.add(v)
            info = out.get("result_info") or {}
            if page >= info.get("total_pages", 1):
                break
            page += 1
        return blocked

    def ban_ip(self, zone_id: str, ip: str, note: str) -> bool:
        if ip in self.blocked_ips(zone_id):
            return False
        out = self.request(
            "POST",
            f"/zones/{zone_id}/firewall/access_rules/rules",
            {
                "mode": "block",
                "notes": f"IMPETUS auto-ban: {note}",
                "configuration": {"target": "ip", "value": ip},
            },
        )
        return bool(out.get("success"))


def load_env_file(path: str) -> None:
    if not os.path.isfile(path):
        raise SystemExit(f"Missing config: {path}")
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    cfg = os.environ.get("IMPETUS_CF_CONFIG", "/etc/impetus/cloudflare-waf.env")
    load_env_file(cfg)
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    if not token or token == "PASTE_TOKEN_HERE":
        raise SystemExit("Set CLOUDFLARE_API_TOKEN in /etc/impetus/cloudflare-waf.env")
    zone_name = os.environ.get("CLOUDFLARE_ZONE_NAME", "plataformaimpetus.com")
    client = CfClient(token)
    zid = client.zone_id(zone_name)

    if cmd == "apply-scanner":
        client.apply_scanner_rule(zid)
        print(f"OK scanner WAF rule on {zone_name}")
    elif cmd == "ban-ip":
        ip = sys.argv[2]
        note = sys.argv[3] if len(sys.argv) > 3 else "scanner"
        if client.ban_ip(zid, ip, note):
            print(f"OK CF block {ip}")
        else:
            print(f"SKIP already blocked {ip}")
    elif cmd == "sync-blocklist":
        bl = os.environ.get(
            "IMPETUS_BLOCKLIST",
            "/var/www/impetus-completa/infra/security/permanent-blocklist.txt",
        )
        max_n = int(os.environ.get("IMPETUS_CF_MAX_IP_RULES", "200"))
        ips = []
        with open(bl) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                ips.append(line.split()[0])
        n = 0
        for ip in ips[:max_n]:
            if client.ban_ip(zid, ip, "permanent-blocklist"):
                n += 1
            time.sleep(0.12)
        print(f"OK synced {len(ips[:max_n])} ips ({n} new)")
    elif cmd == "status":
        entry = client.request("GET", f"/zones/{zid}/rulesets/phases/http_request_firewall_custom/entrypoint")
        active = False
        if entry.get("success"):
            for r in entry["result"].get("rules") or []:
                if r.get("description") == RULE_DESC and r.get("enabled"):
                    active = True
        print(f"zone={zone_name} id={zid}")
        print(f"scanner_waf={'ACTIVE' if active else 'INACTIVE'}")
        print(f"blocked_ips={len(client.blocked_ips(zid))}")
    else:
        raise SystemExit("usage: apply-scanner | ban-ip <ip> [note] | sync-blocklist | status")


if __name__ == "__main__":
    main()
