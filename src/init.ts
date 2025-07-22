import { sessionManager } from "./session";

/**
 * Initialize session tracking with TelemetryDeck instance.
 * This function sets up AppState listeners and connects the session manager
 * to the TelemetryDeck instance for automatic signal sending.
 * 
 * @param telemetryDeckInstance - The TelemetryDeck instance to use for sending signals
 * @returns Promise that resolves when initialization is complete
 * 
 * @example
 * ```typescript
 * import { createTelemetryDeck } from "@typedigital/telemetrydeck-react";
 * import { expoPlugin, sessionEnhancementPlugin, initSessionTracking } from "telemetrydeck-expo-plugin";
 * 
 * const td = createTelemetryDeck({
 *   app: "YOUR-APP-ID",
 *   user: "anonymous",
 *   plugins: [expoPlugin, sessionEnhancementPlugin],
 * });
 * 
 * // Initialize session tracking
 * await initSessionTracking(td);
 * ```
 */
export async function initSessionTracking(telemetryDeckInstance: any): Promise<void> {
  return sessionManager.init(telemetryDeckInstance);
}

/**
 * Cleanup session tracking listeners.
 * Call this when your app is being unmounted or destroyed.
 */
export function cleanupSessionTracking(): void {
  sessionManager.cleanup();
} 