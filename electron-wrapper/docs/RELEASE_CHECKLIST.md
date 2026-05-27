# Release Checklist

## Preflight

- [ ] `backend` deployed with production `AUTH_SECRET`
- [ ] `AUTH_REQUIRED=true` configured server-side
- [ ] `EXPO_PUBLIC_BACKEND_URL` points to HTTPS endpoint
- [ ] Secrets configured in GitHub Actions

Required secrets:
- `EXPO_TOKEN`
- `CSC_LINK` (base64 or URL for signing cert)
- `CSC_KEY_PASSWORD`

## Android

- [ ] Build preview APK via CI workflow
- [ ] Build production AAB via CI workflow
- [ ] Install test APK on physical device
- [ ] Verify login/session persistence, chat, agent creation, image generation
- [ ] Verify app size and cold start budget

## iOS

- [ ] Build production IPA via CI workflow
- [ ] Upload to TestFlight
- [ ] Validate iOS 15+ compatibility
- [ ] Validate notifications and network behavior

## Windows Electron

- [ ] Confirm `ELECTRON_START_URL` or packaged web bundle
- [ ] Replace placeholder icons in `build/icons`
- [ ] Build NSIS installer via workflow
- [ ] Verify install, launch, upgrade, uninstall behavior
- [ ] Verify code-signing and SmartScreen reputation

## Go-Live

- [ ] Tag release in git
- [ ] Publish release notes
- [ ] Attach build artifacts
- [ ] Confirm rollback procedure
