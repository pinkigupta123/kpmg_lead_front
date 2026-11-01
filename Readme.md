# KPMG Lead App (Expo / React Native)

Lead management app for sales executives and super admins.

## 1. Run the project

```bash
# 1. Install dependencies
npm install

# 2. Set the backend URL in .env (pick ONE)
#    Android emulator : EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api
#    Physical phone   : EXPO_PUBLIC_API_URL=http://<your-pc-ip>:8000/api
#    Production       : EXPO_PUBLIC_API_URL=https://kpmgbackend-production-8d42.up.railway.app/api

# 3. Start the app
npm start            # Expo dev server (scan QR with Expo Go)
npm run android      # open on Android emulator/device
npm run web          # open in browser
```

> Restart with `npx expo start -c` after changing `.env`.

## 2. Build a shareable APK (Android)

```bash
# One-time setup
npm install -g eas-cli
eas login

# Build the APK (uses the "preview" profile in eas.json, production API URL)
eas build --platform android --profile preview
```

- When the build finishes, EAS prints a download link (also on https://expo.dev under your project's Builds).
- Share that link, or download the `.apk` and send it. Users install it directly on Android.
- This APK is **standalone**: no Expo Go, no Metro, no PC needed. The client just installs it
  (allow "Install unknown apps") and opens it. It only needs internet to reach the backend.
- Do NOT use the `development` profile for clients, because that build needs Metro running.
- To update the client's app, run the build command again and share the new link.
- No global install? Use: `npx eas-cli build -p android --profile preview`

## 3. Build for the Play Store (AAB)

```bash
eas build --platform android --profile production
```
