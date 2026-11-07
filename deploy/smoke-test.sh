#!/usr/bin/env bash
# Sampada end-to-end smoke test.
#
# Auth note (2026-10-11): sampada moved to Better-Auth on 2026-09-05 and its
# Rails `POST /api/v1/auth/login` route no longer exists — `bin/rails routes`
# has no login/session route at all. Sessions are issued by Better-Auth at
# /api/auth/sign-in/email and passed to Rails as `Authorization: Bearer <token>`,
# which Api::ApplicationController verifies against better-auth's
# /api/auth/verify (see app/controllers/concerns/better_auth_verification.rb).
# This test is self-healing: if the account does not exist yet it signs up once,
# after which every run just signs in.
set +H 2>/dev/null  # disable bash ! history expansion
API="${API:-https://api.vayalabs.in}"
FRONTEND="${FRONTEND:-https://sampada.vayalabs.in}"
EMAIL="${EMAIL:-smoke@sampada.app}"
PASS="${PASS:-smoketest-Pass1!}"
TMP=$(mktemp)
P=0 F=0

pass() { echo "  PASS  $1"; ((P++)) || true; }
fail() { echo "  FAIL  $1"; ((F++)) || true; }

echo "=== Sampada Smoke Test ==="
echo "API:  $API  FE:   $FRONTEND  ACCT: $EMAIL"
echo ""

# --- health -------------------------------------------------------------
curl -sf "$API/up" > "$TMP" && pass "/up" || fail "/up"
python3 -c "import json; d=json.load(open('$TMP')); assert d.get('status')=='ok'" && pass "  health=ok" || fail "  health=ok"

# --- auth (Better-Auth) --------------------------------------------------
# `website` is the honeypot: always sent, empty for humans, filled by bots.
signin() {
  printf '{"email":"%s","password":"%s","website":""}\n' "$EMAIL" "$PASS" > "$TMP.body"
  curl -s -X POST "$API/api/auth/sign-in/email" \
    -H 'Content-Type: application/json' -d "@$TMP.body"
}
token_of() { python3 -c "import json,sys; print(json.load(sys.stdin).get('token') or '')" 2>/dev/null; }

TOKEN=$(signin | token_of)

if [ -n "$TOKEN" ]; then
  pass "login (better-auth)"
else
  # First run: no account yet. Create it; later runs will sign in.
  printf '{"email":"%s","password":"%s","name":"Smoke Test","app":"sampada","website":""}\n' "$EMAIL" "$PASS" > "$TMP.body"
  RESP=$(curl -s -X POST "$API/api/auth/sign-up/email" \
    -H 'Content-Type: application/json' -d "@$TMP.body")
  TOKEN=$(printf '%s' "$RESP" | token_of)
  if [ -n "$TOKEN" ]; then
    pass "sign-up (created $EMAIL)"
  else
    fail "sign-up ($EMAIL)"
    echo "        response: $(printf '%s' "$RESP" | head -c 200)"
    echo "        -> set EMAIL/PASS to an existing sampada account if this one is already taken."
  fi
fi

[ -n "$TOKEN" ] && pass "  token issued" || fail "  token issued"
AUTH="Authorization: Bearer $TOKEN"

# --- API surface (Rails proxies every session to better-auth /verify) -----
curl -sf "$API/api/v1/auth/me" -H "$AUTH" > "$TMP" && pass "auth/me" || fail "auth/me"

curl -sf "$API/api/v1/dashboard" -H "$AUTH" > "$TMP" && pass "dashboard" || fail "dashboard"
python3 -c "import json; d=json.load(open('$TMP')); assert d.get('net_worth') is not None" && pass "  net_worth" || fail "  net_worth"

for ep in debts portfolios investments dividend_sips recurring_expenses budgets transactions notifications; do
  curl -sf "$API/api/v1/$ep" -H "$AUTH" > /dev/null && pass "  GET /$ep" || fail "  GET /$ep"
done

for ep in annual cash_flow_forecast anomalies goal_charts net_worth; do
  curl -sf "$API/api/v1/reports/$ep" -H "$AUTH" > /dev/null && pass "  GET /reports/$ep" || fail "  GET /reports/$ep"
done

curl -sfL "$FRONTEND" > /dev/null && pass "frontend loads" || fail "frontend"

rm -f "$TMP" "$TMP.body"
echo ""
echo "=== Results: $P passed, $F failed ==="
exit $F
