#!/bin/zsh
cd "$(dirname "$0")" || exit 1

NODE_BIN="/private/tmp/resillience-node-runtime/node-v24.14.0-darwin-arm64/bin/node"
NEXT_BIN="./node_modules/.bin/next"
SITE_URL="http://localhost:3000"

if [ -x "$NODE_BIN" ] && [ -f "$NEXT_BIN" ]; then
  if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    kill -9 $(lsof -tiTCP:3000 -sTCP:LISTEN) >/dev/null 2>&1
    sleep 1
  fi

  echo "Starting the full Next.js app..."
  "$NODE_BIN" "$NEXT_BIN" dev -p 3000 >/tmp/resillience-dev.log 2>&1 &
  DEV_PID=$!

  for _ in {1..45}; do
    if curl -sf "$SITE_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  open "$SITE_URL"
  wait $DEV_PID
else
  echo "Unable to find the bundled Node runtime or Next binary."
  echo "Open the project in a terminal and start it with the installed dependencies."
fi
