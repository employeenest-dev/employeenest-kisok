# Attendance Kiosk

React Native tablet kiosk plus Express backend for office attendance with:

- Admin-first employee directory, editing, and onboarding
- Front-camera kiosk mode using Vision Camera
- Automatic recognition from enrolled face features with manual fallback
- Local offline queue persisted in MMKV with in-memory fallback in tests
- Employee onboarding, profile editing, and attendance sync against a deployable backend
- Backend persistence via local JSON by default, with optional MongoDB and Cloudflare R2

## What is implemented

### App

- App opens into an employee directory with editable profiles
- Employee onboarding and profile edit flow with enrollment photo capture
- Kiosk mode switch for automatic recognition and attendance
- Manual attendance flow with employee search and proof photo capture
- Local persistence for employees, queue, recent attendance, and API base URL
- Sync to backend for employees and attendance
- Local face-feature extraction from onboarding photos and live kiosk detections
- Local cosine matching utilities for automatic recognition

### Backend

- `GET /health`
- `GET /employees`
- `GET /employees/embeddings`
- `POST /employees`
- `PUT /employees/:id`
- `GET /attendance`
- `POST /attendance`
- Local file storage for uploads by default
- Optional MongoDB store when `MONGODB_URI` is set
- Optional Cloudflare R2 object storage when `R2_*` vars are set

## Run locally

### Install

```sh
npm install
```

### Start backend

```sh
cp backend/.env.example .env
npm run server
```

### Start React Native

```sh
npm run start
npm run android
```

By default the tablet app points to:

- Android emulator: `http://10.0.2.2:4000`
- iOS simulator: `http://localhost:4000`

You can override the backend URL from the in-app Settings panel.

## Verification

```sh
npm run typecheck
npm run lint
npm test
```

## Backend environment

Copy [backend/.env.example](/Users/pranav/Documents/GitHub/native/backend/.env.example) and set:

- `PORT`
- `PUBLIC_BASE_URL`
- `DATA_FILE`
- `UPLOAD_DIR`

Optional:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`

## Android release notes

Release signing can be provided through environment variables consumed by [android/app/build.gradle](/Users/pranav/Documents/GitHub/native/android/app/build.gradle):

- `ANDROID_KEYSTORE_FILE`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Then build a release with your normal Gradle flow, for example:

```sh
cd android
./gradlew assembleRelease
```

## What still requires device validation

These are outside what can be proven in this workspace because Java/Android SDK/device access is not installed here:

- Native Android/iOS build success with Vision Camera and MMKV linked
- Real tablet camera permissions and preview behavior
- Face detection and automatic recognition performance on the target hardware
- Release APK/AAB generation and signing verification
- Lock task / device-owner kiosk provisioning on the physical tablet

The codebase is now substantially closer to deployment, but final production readiness still depends on running those device-side checks.
# employeenest-kisok
