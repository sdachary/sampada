#!/usr/bin/env bash
set +H 2>/dev/null  # disable bash ! history expansion
API="${API:-http://acharylab.140.245.227.176.nip.io}"
FRONTEND="${FRONTEND:-https://kubera-d4k.pages.dev}"
EMAIL="${EMAIL:-demo@kubera.app}"
PASS="${PASS:-demo123!}"
TMP=$(mktemp)
P=0 F=0

pass() { echo "  PASS  $1"; ((P++)) || true; }
fail() { echo "  FAIL  $1"; ((F++)) || true; }

echo "=== Kubera Smoke Test ==="
echo "API:  $API  FE:   $FRONTEND"
echo ""

# /up
curl -sf "$API/up" > "$TMP" && pass "/up" || fail "/up"
python3 -c "import json; d=json.load(open('$TMP')); assert d.get('status')=='ok'" && pass "  health=ok" || fail "  health=ok"

# login — write JSON body the safe way
printf '{"email":"%s","password":"%s"}\n' "$EMAIL" "$PASS" > "$TMP.body"
curl -sf -X POST "$API/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "@$TMP.body" > "$TMP" && pass "login" || fail "login"

TOKEN=$(python3 -c "import json; print(json.load(open('$TMP'))['token'])") && pass "  token ok" || fail "  token"

AUTH="Authorization: Bearer $TOKEN"

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
