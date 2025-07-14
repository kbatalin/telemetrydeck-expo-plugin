import {
    TelemetryDeckReactSDKPlugin,
    PayloadEnhancer,
} from "@typedigital/telemetrydeck-react/dist/create-telemetrydeck";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Localization from "expo-localization";
import {
    Appearance,
    Dimensions,
    I18nManager,
    PixelRatio,
    Platform,
    AccessibilityInfo,
} from "react-native";

/**
 * Gathers parameters provided by the *EnvironmentParameterProvider* group.
 */
const getEnvironmentParameters = () => {
    const appVersion = Application.nativeApplicationVersion ?? "unknown";
    const buildNumber = Application.nativeBuildVersion ?? "unknown";

    const sdkName = "telemetrydeck-react";
    // The version is read from package.json when Metro bundles the app. If that fails, fallback to constant.
    const sdkVersion: string = (() => {
        try {
            return require("@typedigital/telemetrydeck-react/package.json").version as string;
        } catch {
            return "unknown";
        }
    })();

    return {
        // App info
        "TelemetryDeck.AppInfo.buildNumber": buildNumber,
        "TelemetryDeck.AppInfo.version": appVersion,
        "TelemetryDeck.AppInfo.versionAndBuildNumber": `${appVersion} (${buildNumber})`,

        // Device info
        "TelemetryDeck.Device.architecture": Device.supportedCpuArchitectures?.[0] ?? "unknown",
        "TelemetryDeck.Device.modelName": Device.modelName ?? "unknown",
        "TelemetryDeck.Device.operatingSystem": Device.osName ?? Platform.OS,
        "TelemetryDeck.Device.platform": Platform.OS,
        "TelemetryDeck.Device.systemVersion": Device.osVersion ?? "unknown",
        "TelemetryDeck.Device.systemMajorVersion": (Device.osVersion ?? "0").split(".")[0],
        "TelemetryDeck.Device.systemMajorMinorVersion": (Device.osVersion ?? "0").split(".").slice(0, 2).join("."),
        "TelemetryDeck.Device.brand": Device.brand ?? "unknown",

        // SDK info
        "TelemetryDeck.SDK.name": sdkName,
        "TelemetryDeck.SDK.version": sdkVersion,
        "TelemetryDeck.SDK.nameAndVersion": `${sdkName}/${sdkVersion}`,
        "TelemetryDeck.SDK.buildType": __DEV__ ? "debug" : "release",
    } as Record<string, unknown>;
};

/**
 * Gathers parameters provided by the *PlatformContextProvider* group.
 */
const getPlatformContextParameters = () => {
    const { width, height } = Dimensions.get("window");
    const orientation = height >= width ? "portrait" : "landscape";

    const localeFull = Localization.getLocales()[0]?.languageTag ?? "en-US";
    const timeZone = Localization.getCalendars()[0]?.timeZone ?? "unknown";

    return {
        "TelemetryDeck.Device.orientation": orientation,
        "TelemetryDeck.Device.screenDensity": PixelRatio.get(),
        "TelemetryDeck.Device.screenResolutionHeight": height,
        "TelemetryDeck.Device.screenResolutionWidth": width,
        "TelemetryDeck.Device.timeZone": timeZone,

        "TelemetryDeck.RunContext.locale": localeFull,
        "TelemetryDeck.RunContext.targetEnvironment": Platform.OS,
        "TelemetryDeck.RunContext.isSideLoaded": __DEV__,
        "TelemetryDeck.RunContext.sourceMarketplace":
            Platform.OS === "ios" ? "appStore" : Platform.OS === "android" ? "googlePlay" : "unknown",
    } as Record<string, unknown>;
};

/**
 * Synchronously available accessibility & user-preference parameters.
 * Many accessibility parameters are *only* available asynchronously.
 * We only include those that can be queried synchronously in the JS runtime.
 */
const getAccessibilityAndPreferenceParameters = () => {
    const localeFull = Localization.getLocales()[0]?.languageTag ?? "en-US";
    const regionCode = Localization.getLocales()[0]?.regionCode ?? localeFull.split("-")[1] ?? "unknown";
    return {
        // Accessibility – only parameters that are synchronously available
        "TelemetryDeck.Accessibility.fontScale": PixelRatio.getFontScale(),

        // User preference
        "TelemetryDeck.UserPreference.layoutDirection": I18nManager.isRTL ? "rightToLeft" : "leftToRight",
        "TelemetryDeck.UserPreference.region": regionCode,
        "TelemetryDeck.UserPreference.language": localeFull.split("-")[0],
        "TelemetryDeck.UserPreference.colorScheme": Appearance.getColorScheme() === "dark" ? "Dark" : "Light",
    } as Record<string, unknown>;
};

/**
 * Calendar-related parameters.
 */
const getCalendarParameters = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sunday) – 6 (Saturday)
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    return {
        "TelemetryDeck.Calendar.dayOfMonth": now.getDate(),
        "TelemetryDeck.Calendar.dayOfWeek": dayOfWeek === 0 ? 7 : dayOfWeek, // ISO 8601 (Monday=1 … Sunday=7)
        "TelemetryDeck.Calendar.dayOfYear": dayOfYear,
        "TelemetryDeck.Calendar.weekOfYear": Math.ceil((dayOfYear + 6) / 7),
        "TelemetryDeck.Calendar.isWeekend": dayOfWeek === 0 || dayOfWeek === 6,
        "TelemetryDeck.Calendar.monthOfYear": now.getMonth() + 1,
        "TelemetryDeck.Calendar.quarterOfYear": Math.floor(now.getMonth() / 3) + 1,
        "TelemetryDeck.Calendar.hourOfDay": now.getHours(),
    } as Record<string, unknown>;
};

/**
 * Simple, synchronous session parameters.
 * For a full-featured implementation these values should persist
 * between launches and gather usage statistics – here we only
 * include the *started* flag for the current session.
 */
const getSessionParameters = () => {
    return {
        "TelemetryDeck.Session.started": new Date().toISOString(),
    } as Record<string, unknown>;
};

// Pre-fetch async accessibility information once and cache it for later use.
const accessibilityCache: Record<string, unknown> = {};
AccessibilityInfo.isBoldTextEnabled?.().then((enabled) => {
    accessibilityCache["TelemetryDeck.Accessibility.isBoldTextEnabled"] = enabled;
});
AccessibilityInfo.isInvertColorsEnabled?.().then((enabled) => {
    accessibilityCache["TelemetryDeck.Accessibility.isInvertColorsEnabled"] = enabled;
});
AccessibilityInfo.isReduceMotionEnabled?.().then((enabled) => {
    accessibilityCache["TelemetryDeck.Accessibility.isReduceMotionEnabled"] = enabled;
});
AccessibilityInfo.isReduceTransparencyEnabled?.().then((enabled) => {
    accessibilityCache["TelemetryDeck.Accessibility.isReduceTransparencyEnabled"] = enabled;
});
// fontWeightAdjustment & shouldDifferentiateWithoutColor are Android/iOS-specific and
// are not exposed synchronously in React-Native – they remain undefined.

/**
 * Combines all parameter groups into a single payload object.
 */
const getExpoParameters = (): Record<string, unknown> => {
    return {
        ...getEnvironmentParameters(),
        ...getPlatformContextParameters(),
        ...getAccessibilityAndPreferenceParameters(),
        ...getCalendarParameters(),
        ...getSessionParameters(),
        ...accessibilityCache,
    };
};

/**
 * A TelemetryDeck plugin that augments every signal with rich
 * environment information sourced from Expo APIs.
 */
const expoPlugin: TelemetryDeckReactSDKPlugin =
    (next: PayloadEnhancer) => (payload: Record<string, unknown>) => {
        const enhancedPayload = next(payload);
        return {
            ...enhancedPayload,
            ...getExpoParameters(),
        };
    };

export { expoPlugin };
