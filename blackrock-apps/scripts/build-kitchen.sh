#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
JAVA_SRC="$ROOT/android/app/src/main/java/ng/blackrockrestaurantng/app"

echo "==> [Kitchen] Swapping Capacitor config..."
cp "$ROOT/capacitor.config.kitchen.json" "$ROOT/capacitor.config.json"

echo "==> [Kitchen] Setting applicationId in build.gradle..."
sed -i '' 's/applicationId "ng\.blackrockrestaurantng\.[^"]*"/applicationId "ng.blackrockrestaurantng.kitchen"/' \
  "$ROOT/android/app/build.gradle"

echo "==> [Kitchen] Copying kiosk MainActivity + BootReceiver..."
cp "$ROOT/native/kitchen/MainActivity.java"  "$JAVA_SRC/MainActivity.java"
cp "$ROOT/native/kitchen/BootReceiver.java"  "$JAVA_SRC/BootReceiver.java"

echo "==> [Kitchen] Copying kiosk AndroidManifest..."
cp "$ROOT/native/kitchen/AndroidManifest.xml" \
   "$ROOT/android/app/src/main/AndroidManifest.xml"

echo "==> [Kitchen] Placing google-services.json (kitchen)..."
if [ -f "$ROOT/google-services/Kitchen/google-services.json" ]; then
  cp "$ROOT/google-services/Kitchen/google-services.json" \
     "$ROOT/android/app/google-services.json"
else
  echo "  [warn] google-services/Kitchen/google-services.json not found — skipping Firebase config"
fi

echo "==> [Kitchen] Running cap sync..."
cd "$ROOT" && npx cap sync android

echo "==> [Kitchen] Building APK..."
cd "$ROOT/android" && ./gradlew assembleDebug

echo ""
echo "==> [Kitchen] APK ready at:"
echo "    android/app/build/outputs/apk/debug/app-debug.apk"
echo "    Transfer this to the kitchen tablet and sideload it."
