#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
JAVA_SRC="$ROOT/android/app/src/main/java/ng/blackrockrestaurantng/app"

echo "==> [Waiter] Swapping Capacitor config..."
cp "$ROOT/capacitor.config.waiter.json" "$ROOT/capacitor.config.json"

echo "==> [Waiter] Setting applicationId in build.gradle..."
sed -i '' 's/applicationId "ng\.blackrockrestaurantng\.[^"]*"/applicationId "ng.blackrockrestaurantng.waiter"/' \
  "$ROOT/android/app/build.gradle"

echo "==> [Waiter] Restoring standard MainActivity (no kiosk mode)..."
cp "$ROOT/native/default/MainActivity.java" "$JAVA_SRC/MainActivity.java"
# Remove BootReceiver if it was left from a kitchen build
rm -f "$JAVA_SRC/BootReceiver.java"

echo "==> [Waiter] Restoring standard AndroidManifest..."
cp "$ROOT/native/default/AndroidManifest.xml" \
   "$ROOT/android/app/src/main/AndroidManifest.xml"

echo "==> [Waiter] Placing google-services.json (waiter)..."
if [ -f "$ROOT/google-services/Waiters/google-services.json" ]; then
  cp "$ROOT/google-services/Waiters/google-services.json" \
     "$ROOT/android/app/google-services.json"
else
  echo "  [warn] google-services/Waiters/google-services.json not found — skipping Firebase config"
fi

echo "==> [Waiter] Running cap sync..."
cd "$ROOT" && npx cap sync android

echo "==> [Waiter] Building APK..."
cd "$ROOT/android" && ./gradlew assembleDebug

echo ""
echo "==> [Waiter] APK ready at:"
echo "    android/app/build/outputs/apk/debug/app-debug.apk"
echo "    Transfer this to waiter phones and sideload it."
