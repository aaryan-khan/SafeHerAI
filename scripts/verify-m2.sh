#!/usr/bin/env bash
# Milestone 2 verification. Run from the repo root (Docker must be running):
#   bash scripts/verify-m2.sh 2>&1 | tee ~/Desktop/m2-verify.txt
# Prints no secrets: tokens are shortened and secret checks report file NAMES only.
# Note: section 5 deliberately triggers the login rate limit for localhost for ~1 minute.

cd "$(dirname "$0")/.." || exit 1
LOG_DIR=$(mktemp -d)
API=localhost:8080
JSON='Content-Type: application/json'

section() { echo; echo "==================== $1 ===================="; }
field() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

section "1. Secret checks (expect no file names)"
for KEY in POSTGRES_PASSWORD JWT_SECRET; do
  VALUE=$(grep "^$KEY=" .env | cut -d= -f2-)
  if [ -z "$VALUE" ]; then
    echo "WARNING: $KEY is empty or missing in .env"
  else
    grep -rlF --exclude=.env --exclude-dir=.git --exclude-dir=target -e "$VALUE" .
    echo "$KEY leak-check done"
  fi
done
echo "JWT_SECRET lines in .env (expect 1): $(grep -c '^JWT_SECRET=' .env)"
git check-ignore -v .env || echo "WARNING: .env is NOT ignored"

section "2. Automated tests (1-3 minutes)"
(cd backend && ./mvnw -B verify > "$LOG_DIR/verify.log" 2>&1)
grep -E "Tests run:|BUILD (SUCCESS|FAILURE)|\[ERROR\]" "$LOG_DIR/verify.log" | head -20

section "3. Start app"
if lsof -ti tcp:8080 > /dev/null 2>&1; then
  echo "WARNING: port 8080 is already in use; stop the other app and re-run"; exit 1
fi
(cd backend && ./mvnw -q spring-boot:run > "$LOG_DIR/run.log" 2>&1) &
for i in $(seq 1 90); do curl -s $API/actuator/health > /dev/null 2>&1 && break; sleep 1; done
echo "health: $(curl -s $API/actuator/health)"

section "4. Account flow"
# JSON bodies are built with printf first; this avoids quoting bugs in macOS's old Bash 3.2.
post()      { curl -s -X POST "$API$1" -H "$JSON" -d "$2"; }
post_code() { curl -s -o /dev/null -w '%{http_code}' -X POST "$API$1" -H "$JSON" -d "$2"; }
EMAIL="verify-$(date +%s)@example.com"
PW="verify-script-password-123"
REG_BODY=$(printf '{"email":"%s","password":"%s","displayName":"Verify Script"}' "$EMAIL" "$PW")
LOGIN_BODY=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "$PW")
WRONG_BODY=$(printf '{"email":"%s","password":"%s"}' "$EMAIL" "not-the-password")

REG=$(post /api/v1/auth/register "$REG_BODY")
ACCESS=$(echo "$REG" | field '["accessToken"]')
REFRESH=$(echo "$REG" | field '["refreshToken"]')
ROLE=$(echo "$REG" | field '["user"]["role"]')
echo "register:             role=$ROLE, access token ${ACCESS:0:12}..."

DUP=$(post_code /api/v1/auth/register "$REG_BODY")
echo "duplicate register:   $DUP (expect 409)"

ME=$(curl -s "$API/api/v1/users/me" -H "Authorization: Bearer $ACCESS" | field '["email"]')
echo "me:                   $ME"
NO_TOKEN=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/users/me")
echo "me without token:     $NO_TOKEN (expect 401)"

RENAMED=$(curl -s -X PATCH "$API/api/v1/users/me" -H "Authorization: Bearer $ACCESS" -H "$JSON" \
  -d '{"displayName":"Renamed User"}' | field '["displayName"]')
echo "update name:          $RENAMED"
ADMIN=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/admin/users" -H "Authorization: Bearer $ACCESS")
echo "admin as user:        $ADMIN (expect 403)"

NEW=$(post /api/v1/auth/refresh "$(printf '{"refreshToken":"%s"}' "$REFRESH")")
NEW_REFRESH=$(echo "$NEW" | field '["refreshToken"]')
if [ "$NEW_REFRESH" != "$REFRESH" ]; then DIFFERS=yes; else DIFFERS=NO; fi
echo "refresh:              new token differs: $DIFFERS"
REUSE=$(post_code /api/v1/auth/refresh "$(printf '{"refreshToken":"%s"}' "$REFRESH")")
echo "reuse old refresh:    $REUSE (expect 401)"
AFTER_REUSE=$(post_code /api/v1/auth/refresh "$(printf '{"refreshToken":"%s"}' "$NEW_REFRESH")")
echo "newest after reuse:   $AFTER_REUSE (expect 401, session ended)"

LOGIN=$(post /api/v1/auth/login "$LOGIN_BODY")
LOGIN_REFRESH=$(echo "$LOGIN" | field '["refreshToken"]')
LOGIN_NAME=$(echo "$LOGIN" | field '["user"]["displayName"]')
echo "login:                $LOGIN_NAME"
LOGOUT=$(post_code /api/v1/auth/logout "$(printf '{"refreshToken":"%s"}' "$LOGIN_REFRESH")")
echo "logout:               $LOGOUT (expect 204)"
AFTER_LOGOUT=$(post_code /api/v1/auth/refresh "$(printf '{"refreshToken":"%s"}' "$LOGIN_REFRESH")")
echo "refresh after logout: $AFTER_LOGOUT (expect 401)"
WRONG=$(post /api/v1/auth/login "$WRONG_BODY" | field '["detail"]')
echo "wrong password:       $WRONG"

section "5. Login rate limit (limit is 10/min; earlier logins count too)"
CODES=""
NOBODY='{"email":"nobody@example.com","password":"wrong-password-123"}'
for i in $(seq 1 10); do
  CODE=$(post_code /api/v1/auth/login "$NOBODY")
  CODES="$CODES $CODE"
done
echo "status codes:$CODES"
echo "(expect some 401s, then 429s)"

section "6. Logs"
echo "test password in log (expect 0):  $(grep -cF -- "$PW" "$LOG_DIR/run.log")"
echo "access token in log (expect 0):   $(grep -cF -- "$ACCESS" "$LOG_DIR/run.log")"
echo "generated password warning (expect 0): $(grep -c 'generated security password' "$LOG_DIR/run.log")"
echo "--- warnings/errors ---"
grep -E " (WARN|ERROR) " "$LOG_DIR/run.log" | cut -c1-200 | head -5

lsof -ti tcp:8080 | xargs kill 2>/dev/null
wait 2>/dev/null
echo "app stopped"

section "7. Database"
docker exec safeherai-db psql -U safeherai -d safeherai -tAc \
  "SELECT 'users: ' || count(*) FROM users; SELECT 'refresh tokens: ' || count(*) || ' (revoked: ' || count(revoked_at) || ')' FROM refresh_tokens;"

section "8. GitHub Actions"
gh run list --limit 2 2>&1

rm -rf "$LOG_DIR"
section "DONE"
