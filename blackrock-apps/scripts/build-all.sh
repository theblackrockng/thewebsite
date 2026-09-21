#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
APPS_DIR="$ROOT/../APPs"
APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"

bash "$SCRIPT_DIR/build-kitchen.sh"
cp "$APK" "$APPS_DIR/BLACKROCK-Kitchen.apk"
echo "==> Copied BLACKROCK-Kitchen.apk to APPs/"

bash "$SCRIPT_DIR/build-bar.sh"
cp "$APK" "$APPS_DIR/BLACKROCK-Bar.apk"
echo "==> Copied BLACKROCK-Bar.apk to APPs/"

bash "$SCRIPT_DIR/build-waiter.sh"
cp "$APK" "$APPS_DIR/BLACKROCK-Waiter.apk"
echo "==> Copied BLACKROCK-Waiter.apk to APPs/"

echo ""
echo "==> build:all complete. APKs in APPs/:"
ls -lh "$APPS_DIR/"*.apk
