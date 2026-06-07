# Shennell AI Agent Platform

Shennell is an AI agent platform with a FastAPI + MongoDB backend and an Expo-based frontend targeting mobile and web.

## Repository Structure

- `backend/` — FastAPI API server and data layer
- `frontend/` — Expo React Native app for Android, iOS, and web
- `.emergent/` — environment metadata for the cloud build job

## Current Status

Implemented in this repository:
- Backend API in `backend/` using FastAPI and MongoDB
- Frontend app in `frontend/` using Expo React Native
- EAS build configuration for Android and iOS
- Web export support through Expo static output

Not yet implemented in this repository:
- Native Windows desktop packaging to `.exe`
- Electron, Tauri, .NET, or Qt desktop wrapper project
- CI/CD pipeline for release artifacts

## Build and Release

For full multi-platform build analysis and setup steps for Android, iOS, and Windows strategy, see:

- `BUILD_SETUP_GUIDE.md`

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo account
- EAS CLI
- MongoDB instance
- Production backend URL over HTTPS for deployed builds

### Frontend Setup

```bash
cd frontend
npm install
npx expo --version
npx eas --version
npx eas login
npx eas build:configure
```

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create the required environment configuration for backend runtime before launching the API.

## Platform Build Summary

| Platform | Status |
|---|---|
| Android | Configured via EAS |
| iOS | Configured via EAS |
| Web | Supported via Expo export |
| Windows `.exe` | Strategy only, not configured |

## Security Notes

Before production rollout:

1. Set `AUTH_REQUIRED=true`
2. Set a strong `AUTH_SECRET`
3. Use production MongoDB credentials and network restrictions
4. Set `EXPO_PUBLIC_BACKEND_URL` to an HTTPS backend URL

## Next Steps

1. Install dependencies and run lint/type checks
2. Execute the first Android preview build
3. Execute the first iOS production build and TestFlight upload
4. Choose a Windows desktop packaging strategy
5. Add CI/CD for repeatable builds and artifact retention
