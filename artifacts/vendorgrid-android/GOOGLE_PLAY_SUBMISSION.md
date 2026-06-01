# VendorGrid — Google Play Store Submission Guide

Everything you need, in order, to get VendorGrid live on the Google Play Store.

---

## Step 1 — Accounts you need (do this first)

### Expo account (free)
1. Go to https://expo.dev and create a free account.
2. Install the EAS CLI on your computer:
   ```bash
   npm install -g eas-cli
   ```
3. Log in:
   ```bash
   eas login
   ```

### Google Play Developer account ($25 one-time fee)
1. Go to https://play.google.com/console
2. Sign in with a Google account.
3. Pay the $25 registration fee (credit or debit card).
4. Fill in your developer name — this appears publicly on the store listing.
   - Suggested: **XoticArmory** or your legal business name
5. Account verification can take up to **48 hours**. Start this early.

---

## Step 2 — Build the app

Run these commands from the `artifacts/vendorgrid-android/` folder.

### First time only — link to EAS
```bash
eas build:configure
```
This adds your `projectId` to `app.json`. Commit that file afterward.

### Build the production App Bundle (what Google Play requires)
```bash
eas build --platform android --profile production
```

- EAS builds in the cloud — you do **not** need Android Studio.
- First time: EAS will ask about a **keystore**. Choose **"Generate new keystore"**
  and let EAS manage it. This is your app's signing key — EAS stores it safely.
  **Never lose this keystore. You cannot update your app without it.**
- Build takes ~10–20 minutes. EAS emails you when it's done.
- Download the `.aab` file from https://expo.dev/accounts/[your-username]/builds

### Optional — test APK before submitting
```bash
eas build --platform android --profile preview
```
This builds an installable `.apk` you can sideload on any Android phone to test
before going live.

---

## Step 3 — Create the app in Google Play Console

1. Go to https://play.google.com/console
2. Click **Create app**
3. Fill in:
   - **App name:** VendorGrid
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
4. Check both policy declarations and click **Create app**

---

## Step 4 — Store listing copy

Paste this directly into Play Console → **Store presence** → **Main store listing**.

### App name
```
VendorGrid
```

### Short description (80 chars max)
```
Discover local artisan markets, connect with vendors & find nearby events.
```

### Full description (paste as-is, 4000 chars max)
```
VendorGrid is the community hub for artisans, vendors, and market-goers.

Whether you're a small business owner looking for your next market opportunity or a shopper wanting to discover handmade goods and local events near you, VendorGrid brings the artisan community together in one place.

DISCOVER LOCAL MARKETS
Browse upcoming markets and vendor events in your area. Filter by state or zip code to find events near you. See event dates, locations, vendor lineups, and available booth spaces at a glance.

FOR VENDORS & ARTISANS
- Find and apply for booth spaces at local markets
- List your products so shoppers know what to expect
- Connect with event organizers directly
- Track attendance and manage your event presence
- Upgrade to VendorGrid Pro for advanced tools including COGS & profit tracking and secure file storage

COMMUNITY CHAT
Join the community chat board to ask questions, share tips, and connect with fellow artisans and market organizers in your region.

STAY IN THE LOOP
Get notifications when events are updated, new markets are posted in your area, or event organizers reach out to you.

BUILT FOR THE ARTISAN COMMUNITY
VendorGrid was created specifically for the handmade and small business market community. We understand the hustle of market season — VendorGrid helps you spend less time searching and more time creating.

Download VendorGrid and join your local artisan community today.
```

---

## Step 5 — Graphic assets required

You must upload all of these in Play Console → **Store presence** → **Main store listing** → **Graphics**.

| Asset | Size | Notes |
|-------|------|-------|
| **App icon** | 512 × 512 px PNG | Use your existing icon at `assets/images/icon.png` — export at 512×512 |
| **Feature graphic** | 1024 × 500 px JPG or PNG | Banner shown at top of your store page. Use brand colors: orange `#F97016` + cream `#FAF9F6` |
| **Phone screenshots** | Min 2, max 8 | See tips below |

### Screenshot tips
- Take screenshots on a real Android phone running the VendorGrid app.
- Recommended screens to capture:
  1. Home / Community Board (shows market listings)
  2. An individual market event page
  3. Community Chat
  4. The navigation sidebar open
  5. Sign-in screen
- Screenshots must be between 320px and 3840px on any side.
- Portrait orientation preferred.

---

## Step 6 — App content & policy setup

Complete these sections in Play Console before submitting:

### Content rating
1. Go to **Policy** → **App content** → **Content rating**
2. Click **Start questionnaire**
3. Category: **Utility** or **Business**
4. Answer all questions (VendorGrid has no violence, mature content, or user-generated images — answer "No" to all sensitive categories)
5. Submit — you'll receive a rating (likely **Everyone**)

### Target audience
1. Go to **Policy** → **App content** → **Target audience**
2. Select age group: **18 and over** (since this is a business/vendor platform)

### Privacy policy
1. Go to **Policy** → **App content** → **Privacy policy**
2. Enter your privacy policy URL:
   ```
   https://www.vendorgrid.net/privacy
   ```

### Ads declaration
- Select **No, my app does not contain ads**

### Data safety
1. Go to **Policy** → **App content** → **Data safety**
2. Fill out what data the app collects. For VendorGrid:
   - **Email address** — collected, required for account creation
   - **Name** — collected, optional, for profile display
   - **Location (approximate)** — not collected
   - **No data is sold to third parties**
   - Data is encrypted in transit (HTTPS)

---

## Step 7 — App configuration summary

| Field | Value |
|-------|-------|
| Package name | `com.vendorgrid.app` |
| App version | `1.0.0` |
| Version code | `1` (auto-incremented by EAS on future builds) |
| Min Android version | 7.0+ (API level 24) |
| Build format | App Bundle (`.aab`) |
| Signing | Managed by EAS |
| Architecture | 64-bit (arm64-v8a) + 32-bit (armeabi-v7a) |

---

## Step 8 — Submit for review

1. In Play Console → **Release** → **Production** → **Create new release**
2. Upload the `.aab` file you downloaded from EAS
3. Enter release notes:
   ```
   Initial release of VendorGrid — discover local artisan markets, connect with vendors, and join your community.
   ```
4. Click **Review release**
5. Fix any warnings shown (most are informational)
6. Click **Start rollout to Production**

Google typically reviews and approves new apps within **1–3 days**.
You'll receive an email when it goes live.

---

## Step 9 — Future updates

### Bump the version number
Edit `artifacts/vendorgrid-android/app.json`:
```json
"version": "1.1.0"
```
The `versionCode` increments automatically on each EAS production build.

### Build & submit
```bash
eas build --platform android --profile production
```
Then upload the new `.aab` in Play Console → **Production** → **Create new release**.

---

## Quick reference — links

| Resource | URL |
|----------|-----|
| Google Play Console | https://play.google.com/console |
| Expo account | https://expo.dev |
| EAS Build docs | https://docs.expo.dev/build/introduction/ |
| Your privacy policy | https://www.vendorgrid.net/privacy |

---

## Common issues

**"You uploaded an APK or Android App Bundle that was signed with a different certificate"**
→ You're using a different keystore than the original. Always use the keystore EAS generated and stored for your project.

**Build fails with "Missing credentials"**
→ Run `eas credentials` to check and regenerate your keystore.

**"This app has not been published on Google Play"**
→ Normal — new apps show this until Google approves the first submission.

**App crashes on launch after install from Play Store**
→ Test with the `preview` APK profile first. If that works, the issue may be related to signed release builds — check your `app.json` for any debug-only config.
