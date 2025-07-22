import { useEffect } from "react";
import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";
import { initSessionTracking, cleanupSessionTracking } from "./init";

/**
 * React hook for automatic session tracking initialization.
 * This hook automatically initializes session tracking when the component mounts
 * and cleans up when it unmounts.
 * 
 * @example
 * ```typescript
 * import { useSessionTracking } from "telemetrydeck-expo-plugin";
 * 
 * function App() {
 *   useSessionTracking(); // Automatically handles session tracking
 *   
 *   return <YourApp />;
 * }
 * ```
 */
export function useSessionTracking(): void {
  const telemetryDeck = useTelemetryDeck();

  useEffect(() => {
    let initialized = false;

    const setupSessionTracking = async () => {
      if (!initialized && telemetryDeck) {
        initialized = true;
        try {
          await initSessionTracking(telemetryDeck);
        } catch (error) {
          console.warn('Failed to initialize TelemetryDeck session tracking:', error);
        }
      }
    };

    setupSessionTracking();

    // Cleanup on unmount
    return () => {
      if (initialized) {
        cleanupSessionTracking();
      }
    };
  }, [telemetryDeck]);
} 