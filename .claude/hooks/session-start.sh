#!/bin/bash
set -euo pipefail

# Only run in remote cloud sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 60000}'

# Authenticate with service account (stored at setup time)
gcloud auth activate-service-account \
  --key-file=/root/.config/gcloud/service_account.json \
  --quiet 2>/dev/null || true

# Unset the proxy-injected token so gcloud uses the service account
unset CLOUDSDK_AUTH_ACCESS_TOKEN

# Persist the unset for the session
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'unset CLOUDSDK_AUTH_ACCESS_TOKEN' >> "$CLAUDE_ENV_FILE"
fi

# Open IAP tunnel to hormone-agent VM in background
pkill -f "start-iap-tunnel hormone-agent" 2>/dev/null || true
nohup gcloud compute start-iap-tunnel hormone-agent 22 \
  --local-host-port=localhost:2222 \
  --zone=us-central1-f \
  --project=pelagic-hope-342518 \
  --quiet \
  > /tmp/iap-tunnel.log 2>&1 &

# Wait for tunnel to be ready
sleep 8

echo "IAP tunnel to hormone-agent ready on localhost:2222"
