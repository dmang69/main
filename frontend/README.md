# Shennell Frontend

Expo React Native client for the Shennell AI Agent Platform.

## Overview

This app targets:

- iOS
- Android
- Web

The frontend is responsible for the chat experience, agent flows, and client-side UI for the Shennell platform.

## Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI tooling
- EAS CLI for cloud builds

## Install Dependencies

```bash
npm install
```

## Run in Development

Start the Expo development server:

```bash
npx expo start
```

Run on specific platforms:

```bash
npx expo start --web
npx expo start --android
npx expo start --ios
```

## Build

Check installed tool versions:

```bash
npx expo --version
npx eas --version
```

Login and configure EAS:

```bash
npx eas login
npx eas build:configure
```

Build examples:

```bash
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
npx eas build --platform ios --profile production
```

## Notes

- Web export is supported through Expo static output
- Android and iOS builds are configured through EAS
- Native Windows desktop packaging is not configured in this frontend project

## Related Docs

- `../BUILD_SETUP_GUIDE.md`
- `../README.md`
