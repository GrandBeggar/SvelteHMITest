#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/sveltehmi}"
PORT="${PORT:-3001}"
MODE="${HMI_MODE:-mock}"

cd "$APP_DIR"

echo "== SvelteHMI CX first run =="
echo "Directory: $APP_DIR"
echo "Mode: $MODE"
echo "Port: $PORT"
echo

echo "Node:"
node --version
echo "npm:"
npm --version
echo

echo "Installing Linux/ARM dependencies..."
npm ci

echo "Building Svelte app..."
npm run build

echo "Smoke check..."
npm run smoke

echo
echo "Starting server. Press Ctrl+C to stop."
HMI_MODE="$MODE" PORT="$PORT" node server.js
