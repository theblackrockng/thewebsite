#!/usr/bin/env bash
set -e

export JAVA_HOME="$(/usr/libexec/java_home -v 21)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
JAVA_SRC="$ROOT/android/app/src/main/java/ng/blackrockrestaurantng/app"

echo "==> [Bar] Merging Capacitor config (base + bar)..."
jq -s '.[0] * .[1]' "$ROOT/capacitor.config.base.json" "$ROOT/capacitor.config.bar.json" > "$ROOT/capacitor.config.json"

echo "==> [Bar] Setting applicationId in build.gradle..."
sed -i '' 's/applicationId "ng\.blackrockrestaurantng\.[^"]*"/applicationId "ng.blackrockrestaurantng.bar"/' \
  "$ROOT/android/app/build.gradle"

echo "==> [Bar] Restoring standard MainActivity (no kiosk mode)..."
cp "$ROOT/native/default/MainActivity.java" "$JAVA_SRC/MainActivity.java"
rm -f "$JAVA_SRC/BootReceiver.java"

echo "==> [Bar] Restoring standard AndroidManifest..."
cp "$ROOT/native/default/AndroidManifest.xml" \
   "$ROOT/android/app/src/main/AndroidManifest.xml"

echo "==> [Bar] Placing google-services.json (bar)..."
if [ -f "$ROOT/google-services/Bar/google-services.json" ]; then
  cp "$ROOT/google-services/Bar/google-services.json" \
     "$ROOT/android/app/google-services.json"
else
  echo "  [warn] google-services/Bar/google-services.json not found — skipping Firebase config"
fi

echo "==> [Bar] Running cap sync..."
cd "$ROOT" && npx cap sync android

echo "==> [Bar] Building APK..."
cd "$ROOT/android" && ./gradlew assembleDebug

echo ""
echo "==> [Bar] APK ready at:"
echo "    android/app/build/outputs/apk/debug/app-debug.apk"
echo "    Transfer this to the bar attendant phone and sideload it."
