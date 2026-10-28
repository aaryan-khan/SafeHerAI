#!/usr/bin/env bash
# Milestone 1 verification. Run from the repo root:
#   bash scripts/verify-m1.sh 2>&1 | tee ~/Desktop/m1-verify.txt
# Prints no secrets: the password check only reports file NAMES.

cd "$(dirname "$0")/.." || exit 1
LOG_DIR=$(mktemp -d)

section() { echo; echo "==================== $1 ===================="; }

section "1. Tools"
java -version 2>&1 | head -2
(cd backend && ./mvnw -v 2>&1 | grep -E "Apache Maven|Java version")
echo "--- wrapper properties ---"
cat backend/.mvn/wrapper/maven-wrapper.properties

section "2. Backend files"
find backend -type f -not -path "*/target/*" | sort

section "3. Config placeholders (expect 1 and 1)"
grep -c 'username: ${POSTGRES_USER}' backend/src/main/resources/application.yml
grep -c 'password: ${POSTGRES_PASSWORD}' backend/src/main/resources/application.yml

section "4. Password leak check (expect no file names)"
PW=$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)
if [ -z "$PW" ]; then
  echo "WARNING: POSTGRES_PASSWORD is empty or missing in .env"
elif [ "$PW" = "change-me-local-only" ]; then
  echo "WARNING: .env still uses the placeholder password"
else
  grep -rlF --exclude=.env --exclude-dir=.git --exclude-dir=target -e "$PW" .
  echo "leak-check done"
fi
echo "DB_PORT in .env: $(grep '^DB_PORT=' .env | cut -d= -f2)"

section "5. Git safety"
git check-ignore -v .env || echo "WARNING: .env is NOT ignored"
git status --short
git log --oneline -5

section "6. Docker database"
docker compose ps
docker exec safeherai-db psql -U safeherai -d safeherai -tAc "SELECT 'PostGIS ' || postgis_lib_version();"

section "7. Automated tests (takes 1-3 minutes)"
(cd backend && ./mvnw -B verify > "$LOG_DIR/verify.log" 2>&1)
grep -E "Tests run:|BUILD (SUCCESS|FAILURE)|\[ERROR\]" "$LOG_DIR/verify.log" | head -20

section "8. Running app"
if lsof -ti tcp:8080 > /dev/null 2>&1; then
  echo "WARNING: something is already using port 8080; stop it and re-run"
else
  (cd backend && ./mvnw -q spring-boot:run > "$LOG_DIR/run.log" 2>&1) &
  for i in $(seq 1 90); do
    curl -s localhost:8080/actuator/health > /dev/null 2>&1 && break
    sleep 1
  done
  echo "health:       $(curl -s localhost:8080/actuator/health)"
  echo "/actuator/env HTTP status (expect 404): $(curl -s -o /dev/null -w '%{http_code}' localhost:8080/actuator/env)"
  docker exec safeherai-db psql -U safeherai -d safeherai -c "SELECT version, description, success FROM flyway_schema_history;"
  if [ -n "$PW" ]; then
    echo "password lines in app log (expect 0): $(grep -cF -- "$PW" "$LOG_DIR/run.log")"
  fi
  grep -E "Started SafeHerAiApplication|APPLICATION FAILED|Caused by" "$LOG_DIR/run.log" | head -5
  lsof -ti tcp:8080 | xargs kill 2>/dev/null
  wait 2>/dev/null
  echo "app stopped"
fi

section "9. GitHub Actions (latest runs)"
gh run list --limit 5 2>&1

unset PW
rm -rf "$LOG_DIR"
section "DONE"