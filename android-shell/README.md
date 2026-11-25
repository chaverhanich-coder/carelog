# Rabbi's Care Log - Android shell

Thin WebView wrapper around https://als-aide-care-log.pally.site for Android phones.

- App name: Rabbi's Care Log
- Package: com.chaverhanich.rabbiscarelog
- minSdk 24 (Android 7.0), targetSdk 34
- No native libraries, so it installs on both 32-bit and 64-bit phones.

The page lives on the web, so changes made there show up without rebuilding the APK.

Build: the workflow in .github/workflows/build-apk.yml runs gradle assembleDebug and copies
the debug APK to dist/rabbis-care-log.apk on main.

Debug signing is used, which is fine for sideloading.
