# TelemetryDeck Expo Plugin

**An extension plugin for [TelemetryDeck React SDK](https://github.com/typedigital/telemetrydeck-react) that automatically enriches every signal with rich Expo/React Native environment data — with a single line of code.**

[![npm version](https://badge.fury.io/js/telemetrydeck-expo-plugin.svg)](https://badge.fury.io/js/telemetrydeck-expo-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Plug-and-play extension** for TelemetryDeck React SDK — just add to `plugins` array
- **Zero native code**: fully implemented in TypeScript, built on top of Expo SDK modules (`expo-application`, `expo-device`, `expo-localization`, etc.)
- **40+ automatic parameters** added to every TelemetryDeck signal:
  - **AppInfo**: version, build number, version + build
  - **Device**: model, OS, architecture, brand, orientation, screen resolution/density, timezone, …
  - **SDK**: name, version, build type (debug / release)
  - **RunContext**: locale, target environment, marketplace source, side-loaded flag
  - **Accessibility & UserPreferences**: font scale, RTL / LTR, color scheme, bold text, reduce motion, …
  - **Calendar**: day/week/month/quarter/year breakdown, hour of day, weekend flag
  - **Session**: session start timestamp (extendable for retention / acquisition metrics)
- **Universal** — works on iOS, Android, Web (Expo Router, bare React Native\*)  
  \*Device‐specific metrics gracefully degrade on unsupported platforms
- **MIT-licensed**, open-source

---

## Installation

```bash
npm install telemetrydeck-expo-plugin
# or
yarn add telemetrydeck-expo-plugin
```

### Required Dependencies

This plugin extends the [TelemetryDeck React SDK](https://github.com/typedigital/telemetrydeck-react) and requires the following dependencies:

```json
{
  "@typedigital/telemetrydeck-react": "^0.4.1",
  "expo": ">=49.0.0",
  "expo-application": ">=5.0.0",
  "expo-device": ">=5.0.0",
  "expo-localization": ">=14.0.0",
  "react-native": ">=0.70.0"
}
```

Install them if not already present:

```bash
npm install @typedigital/telemetrydeck-react
npx expo install expo-application expo-device expo-localization
```

---

## Usage

This plugin extends the TelemetryDeck React SDK by automatically adding Expo/React Native environment data to every signal. Simply add it to the `plugins` array when creating your TelemetryDeck instance:

```typescript
import { createTelemetryDeck } from "@typedigital/telemetrydeck-react";
import { expoPlugin } from "telemetrydeck-expo-plugin";

const td = createTelemetryDeck({
  app: "YOUR-APP-ID",
  user: "anonymous",
  plugins: [expoPlugin], // ← Add the Expo plugin here
});

// Use TelemetryDeck as usual - all signals now include rich Expo context
const { signal } = useTelemetryDeck();
signal("app_launched");
```

For complete TelemetryDeck React SDK documentation, see: https://github.com/typedigital/telemetrydeck-react

Every signal sent through TelemetryDeck will now automatically include rich context about the user's device, environment, and preferences — no extra work required.

---

## What Data is Collected

This plugin automatically enhances every TelemetryDeck signal with the following parameters:

### App Information

- `TelemetryDeck.AppInfo.version` - App version (e.g., "1.0.0")
- `TelemetryDeck.AppInfo.buildNumber` - Build number (e.g., "123")
- `TelemetryDeck.AppInfo.versionAndBuildNumber` - Combined version and build

### Device Information

- `TelemetryDeck.Device.architecture` - CPU architecture (e.g., "arm64")
- `TelemetryDeck.Device.modelName` - Device model (e.g., "iPhone 14 Pro")
- `TelemetryDeck.Device.operatingSystem` - OS name (e.g., "iOS")
- `TelemetryDeck.Device.platform` - Platform (e.g., "ios", "android")
- `TelemetryDeck.Device.systemVersion` - OS version (e.g., "17.0")
- `TelemetryDeck.Device.brand` - Device brand (e.g., "Apple")
- `TelemetryDeck.Device.orientation` - Screen orientation
- `TelemetryDeck.Device.screenResolution*` - Screen dimensions
- `TelemetryDeck.Device.screenDensity` - Pixel density
- `TelemetryDeck.Device.timeZone` - User's timezone

### SDK Information

- `TelemetryDeck.SDK.name` - SDK name
- `TelemetryDeck.SDK.version` - SDK version
- `TelemetryDeck.SDK.buildType` - "debug" or "release"

### Runtime Context

- `TelemetryDeck.RunContext.locale` - User's locale (e.g., "en-US")
- `TelemetryDeck.RunContext.targetEnvironment` - Target platform
- `TelemetryDeck.RunContext.isSideLoaded` - Whether app is side-loaded
- `TelemetryDeck.RunContext.sourceMarketplace` - App store source

### User Preferences & Accessibility

- `TelemetryDeck.UserPreference.colorScheme` - "Light" or "Dark"
- `TelemetryDeck.UserPreference.layoutDirection` - "leftToRight" or "rightToLeft"
- `TelemetryDeck.UserPreference.language` - User's language
- `TelemetryDeck.UserPreference.region` - User's region
- `TelemetryDeck.Accessibility.fontScale` - Font scaling factor
- `TelemetryDeck.Accessibility.isBoldTextEnabled` - Bold text preference
- `TelemetryDeck.Accessibility.isReduceMotionEnabled` - Reduce motion preference
- And more accessibility settings...

### Calendar Information

- `TelemetryDeck.Calendar.dayOfMonth` - Day of month (1-31)
- `TelemetryDeck.Calendar.dayOfWeek` - Day of week (1-7, Monday=1)
- `TelemetryDeck.Calendar.monthOfYear` - Month (1-12)
- `TelemetryDeck.Calendar.quarterOfYear` - Quarter (1-4)
- `TelemetryDeck.Calendar.isWeekend` - Weekend flag
- `TelemetryDeck.Calendar.hourOfDay` - Hour of day (0-23)

### Session Information

- `TelemetryDeck.Session.started` - Session start timestamp

---

## Development

### Build & Test

To build the TypeScript sources:

```bash
npm run build
```

To run tests:

```bash
npm test
```

To clean build artifacts:

```bash
npm run clean
```

Test files are located in `src/__tests__/` and use Jest with babel-jest.

### Making a Release

This project uses automated releases via GitHub Actions. To create a new release:

1. **Update the version** in `package.json`:

   ```bash
   npm version patch   # for bug fixes (1.0.0 → 1.0.1)
   npm version minor   # for new features (1.0.0 → 1.1.0)
   npm version major   # for breaking changes (1.0.0 → 2.0.0)
   ```

2. **Push the version tag**:

   ```bash
   git push origin v1.0.1  # replace with your version
   ```

3. **Automated workflow will**:
   - Run tests and build the project
   - Publish to npm with provenance
   - **Auto-generate changelog** from commits and merged PRs
   - Create a GitHub Release with release notes
   - Update package badges and links

**Note**: The changelog is automatically generated from:

- All commits since the last release (with author names)
- Merged pull requests (with PR numbers and titles)

### Manual Publishing

If you need to publish manually (not recommended):

```bash
npm run build
npm test
npm publish
```

The `prepublishOnly` script will automatically run build and tests before publishing.

---

## Why Use This Plugin?

Understanding _who_, _where_ and _how_ users run your app is crucial for actionable analytics. This plugin eliminates boilerplate and keeps your telemetry clean, consistent and privacy-respectful while giving you deep insights for product decisions.

---

## Contributing

PRs and issues are welcome! Please follow conventional-commits and respect the project's code of conduct.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Enjoy effortless telemetry!** 🚀
