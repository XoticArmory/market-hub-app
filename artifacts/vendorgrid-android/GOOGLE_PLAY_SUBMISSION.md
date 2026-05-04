# VendorGrid — Google Play Submission Guide

This guide covers everything needed to build a signed Android App Bundle (AAB)
and submit it to the Google Play Store.

---

## Prerequisites

### 1. Expo Account
Create a free account at [expo.dev](https://expo.dev) if you don't have one.

### 2. EAS CLI
Install the Expo Application Services CLI globally:

```bash
npm install -g eas-cli
```

Log in with your Expo account:

```bash
eas login
```

### 3. Google Play Developer Account
- Sign up at [play.google.com/console](https://play.google.com/console)
- One-time registration fee: **$25 USD**
- Account verification can take up to 48 hours
- You will need a valid Google account and a credit/debit card for the fee

---

## Building the App

All commands below should be run from the `artifacts/vendorgrid-android/` directory.

### Link the project to EAS (first time only)

```bash
eas build:configure
```

This writes your `projectId` into `app.json`. Commit that change.

### Production AAB (for Google Play)

```bash
eas build --platform android --profile production
```

- EAS will prompt you to create or reuse a **keystore** the first time.
  Choose **"Generate new keystore"** and let EAS manage it — it stores it
  securely on their servers.
- The build runs in the cloud; you don't need Android Studio installed.
- When complete, EAS prints a download URL for the `.aab` file.

### Internal test APK (optional — install directly on a device)

```bash
eas build --platform android --profile preview
```

Use this to test on a physical device before submitting to Google Play.

---

## Submitting to Google Play

### Manual upload (recommended for first submission)

1. Download the `.aab` from the EAS build dashboard.
2. In Google Play Console → **Your app** → **Production** → **Create new release**.
3. Upload the `.aab` file.
4. Fill in the release notes (what's new in this version).
5. Click **Review release** then **Start rollout to Production**.

### Automated submit via EAS (optional, after first manual submission)

For the automated path you need a Google Play service account key:

1. In Google Play Console → **Setup** → **API access** → link to a Google Cloud project.
2. Create a service account with the **Release manager** role.
3. Download the JSON key and save it as
   `artifacts/vendorgrid-android/google-play-service-account.json`
   (this file is gitignored — never commit it).
4. Run:

```bash
eas submit --platform android --profile production
```

---

## App Configuration Summary

| Field            | Value                        |
|-----------------|------------------------------|
| Package name    | `com.vendorgrid.app`         |
| App version     | `1.0.0`                      |
| Version code    | `1` (auto-incremented by EAS)|
| Min SDK         | Android 7.0+ (API 24)        |
| Build type      | App Bundle (`.aab`)          |

---

## Google Play Store Listing Requirements

Before your app can go live you must provide the following in Play Console:

| Asset | Spec |
|-------|------|
| App icon | 512×512 px PNG |
| Feature graphic | 1024×500 px JPG or PNG |
| Screenshots | At least 2 phone screenshots (min 320px, max 3840px on any side) |
| Short description | Up to 80 characters |
| Full description | Up to 4000 characters |
| Privacy policy URL | Required for all apps |
| Content rating | Complete the rating questionnaire in Play Console |
| Category | Pick a relevant category (e.g. "Business") |

---

## Version Bumping for Future Releases

The `eas.json` production profile has `"autoIncrement": true`, so EAS
automatically increments `versionCode` on every build.

To bump the user-visible version number, edit `artifacts/vendorgrid-android/app.json`:

```json
"version": "1.1.0"
```

---

## Useful Links

- EAS Build docs: https://docs.expo.dev/build/introduction/
- EAS Submit docs: https://docs.expo.dev/submit/introduction/
- Google Play Console: https://play.google.com/console
- Expo account: https://expo.dev
