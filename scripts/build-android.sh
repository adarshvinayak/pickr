#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
export PICKR_BACKEND_URL="$(node scripts/android-backend.mjs)"
if [ -n "$PICKR_BACKEND_URL" ]; then
 echo "APK default backend: $PICKR_BACKEND_URL"
else
 echo "No default backend available. Set PICKR_BACKEND_URL in .env.local or use Backend connection in the apps."
fi
npm run native:bundle
if [ -z "${JAVA_HOME:-}" ] && [ -d /tmp/lorry-android-tools/jdk-17.0.20.1+1/Contents/Home ]; then
 export JAVA_HOME=/tmp/lorry-android-tools/jdk-17.0.20.1+1/Contents/Home
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d /tmp/lorry-android-tools/sdk ]; then
 export ANDROID_HOME=/tmp/lorry-android-tools/sdk
fi
if [ -x /tmp/lorry-android-tools/gradle-8.11.1/bin/gradle ]; then
 /tmp/lorry-android-tools/gradle-8.11.1/bin/gradle -p native/android assembleCustomerDebug assembleDriverDebug
else
 ./native/android/gradlew -p native/android assembleCustomerDebug assembleDriverDebug
fi
mkdir -p artifacts
cp native/android/app/build/outputs/apk/customer/debug/app-customer-debug.apk artifacts/pickr-customer-debug.apk
cp native/android/app/build/outputs/apk/driver/debug/app-driver-debug.apk artifacts/pickr-driver-debug.apk
ls -lh artifacts/*.apk
