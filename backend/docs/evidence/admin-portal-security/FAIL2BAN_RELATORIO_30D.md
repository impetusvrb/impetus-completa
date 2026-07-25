# Relatório fail2ban / UFW — IMPETUS

Gerado: 2026-07-06T20:16:05Z

## Jails activas
```
Status
|- Number of jail:	4
`- Jail list:	impetus-auth-fail, impetus-nginx-scan, nginx-limit-req, sshd
--- impetus-auth-fail ---
|  `- Journal matches:	
`- Actions
   |- Currently banned:	0
   |- Total banned:	0
   `- Banned IP list:	
--- impetus-nginx-scan ---
|  `- Journal matches:	
`- Actions
   |- Currently banned:	4
   |- Total banned:	4
   `- Banned IP list:	34.174.144.217 35.236.156.112 52.234.3.19 91.92.241.196
--- nginx-limit-req ---
|  `- Journal matches:	
`- Actions
   |- Currently banned:	0
   |- Total banned:	0
   `- Banned IP list:	
--- sshd ---
|  `- Journal matches:	_SYSTEMD_UNIT=sshd.service + _COMM=sshd
`- Actions
   |- Currently banned:	0
   |- Total banned:	0
   `- Banned IP list:	
```

## IPs banidos (UFW DENY IMPETUS)
```
[ 9] Anywhere                   DENY IN     3.19.29.56                 # IMPETUS blocked attacker
[10] Anywhere                   DENY IN     216.238.69.243             # IMPETUS blocked attacker
[11] Anywhere                   DENY IN     35.153.53.215              # IMPETUS blocked attacker
[12] Anywhere                   DENY IN     27.79.3.161                # IMPETUS blocked attacker
[13] Anywhere                   DENY IN     171.231.186.160            # IMPETUS blocked attacker
[14] Anywhere                   DENY IN     134.122.102.174            # IMPETUS blocked attacker
[15] Anywhere                   DENY IN     170.64.137.227             # IMPETUS scanner blocked 2026-07-04
[16] Anywhere                   DENY IN     195.178.110.199            # IMPETUS scanner blocked 2026-07-04
[17] Anywhere                   DENY IN     35.236.156.112             # IMPETUS scanner historical
[18] Anywhere                   DENY IN     91.92.241.196              # IMPETUS scanner historical
[19] Anywhere                   DENY IN     52.234.3.19                # IMPETUS scanner historical
[20] Anywhere                   DENY IN     34.174.144.217             # IMPETUS scanner historical
[21] Anywhere                   DENY IN     116.110.214.207            # IMPETUS auto-ban: SSH_BRUTE_FORCE
[22] Anywhere                   DENY IN     171.231.181.160            # IMPETUS auto-ban: SSH_BRUTE_FORCE
[23] Anywhere                   DENY IN     27.79.41.141               # IMPETUS auto-ban: SSH_BRUTE_FORCE
[24] Anywhere                   DENY IN     27.79.5.235                # IMPETUS auto-ban: SSH_BRUTE_FORCE
[25] Anywhere                   DENY IN     49.49.240.250              # IMPETUS auto-ban: SSH_BRUTE_FORCE
[26] Anywhere                   DENY IN     94.154.43.56               # IMPETUS auto-ban: SSH_BRUTE_FORCE
[27] Anywhere                   DENY IN     203.0.113.77               # IMPETUS auto-ban: HTTP_CREDENTIAL_PROBE
[56] Anywhere                   DENY IN     20.48.255.163              # IMPETUS auto-ban: HTTP_404_FLOOD
[57] Anywhere                   DENY IN     178.16.54.137              # IMPETUS auto-ban: HTTP_404_FLOOD
[58] Anywhere                   DENY IN     206.123.156.179            # IMPETUS auto-ban: HTTP_CREDENTIAL_PROBE
[59] Anywhere                   DENY IN     20.198.90.154              # IMPETUS auto-ban: HTTP_CREDENTIAL_PROBE
[60] Anywhere                   DENY IN     147.182.149.75             # IMPETUS auto-ban: HTTP_CREDENTIAL_PROBE
[61] Anywhere                   DENY IN     68.183.9.16                # IMPETUS auto-ban: HTTP_CREDENTIAL_PROBE
[82] Anywhere (v6)              DENY IN     2604:a880:400:d1:0:4:9c79:9001 # IMPETUS auto-ban: SCANNER_UA
```

## Eventos threat-watch (últimas 48h amostra)
```
[2026-07-06T20:06:04Z] ALERT HIGH HTTP_CREDENTIAL_PROBE 68.183.9.16 — GET /.DS_Store status 301
[2026-07-06T20:06:05Z] ALERT MEDIUM HTTP_WRITE_ATTEMPT 147.182.149.75 — POST /graphql status 301
[2026-07-06T20:06:05Z] ALERT MEDIUM HTTP_WRITE_ATTEMPT 147.182.149.75 — POST /graphql status 301
[2026-07-06T20:06:06Z] ALERT MEDIUM HTTP_WRITE_ATTEMPT 68.183.9.16 — POST /graphql status 301
[2026-07-06T20:06:06Z] ALERT MEDIUM HTTP_WRITE_ATTEMPT 68.183.9.16 — POST /graphql status 301
[2026-07-06T20:06:08Z] ALERT MEDIUM HTTP_404_FLOOD 147.182.149.75 — 31 x404 nginx
[2026-07-06T20:06:08Z] ALERT MEDIUM HTTP_404_FLOOD 147.182.149.75 — 31 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 20.198.90.154 — 141 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 20.198.90.154 — 141 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 178.16.54.137 — 28 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 178.16.54.137 — 28 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 68.183.9.16 — 31 x404 nginx
[2026-07-06T20:06:09Z] ALERT MEDIUM HTTP_404_FLOOD 68.183.9.16 — 31 x404 nginx
[2026-07-06T20:08:02Z] ALERT MEDIUM HTTP_404_FLOOD 20.48.255.163 — 18 x404 nginx
[2026-07-06T20:08:02Z] ALERT MEDIUM HTTP_404_FLOOD 20.48.255.163 — 18 x404 nginx
[2026-07-06T20:10:02Z] UFW DENY 2604:a880:400:d1:0:4:9c79:9001 (SCANNER_UA)
[2026-07-06T20:10:02Z] UFW DENY 2604:a880:400:d1:0:4:9c79:9001 (SCANNER_UA)
[2026-07-06T20:10:02Z] ALERT HIGH SCANNER_UA 2604:a880:400:d1:0:4:9c79:9001 — GET / status 301
[2026-07-06T20:10:02Z] ALERT HIGH SCANNER_UA 2604:a880:400:d1:0:4:9c79:9001 — GET / status 301
[2026-07-06T20:12:02Z] ALERT MEDIUM HTTP_404_FLOOD 206.123.156.179 — 44 x404 nginx
[2026-07-06T20:12:02Z] ALERT MEDIUM HTTP_404_FLOOD 206.123.156.179 — 44 x404 nginx
```
