import { PayloadEnhancer, TelemetryDeckReactSDKPlugin } from "@typedigital/telemetrydeck-react/dist/create-telemetrydeck";
import { sessionManager } from "./session";

/**
 * A TelemetryDeck plugin that enriches every signal with session metrics.
 * This plugin reads the current session state and adds retention/acquisition metrics
 * to each signal sent through TelemetryDeck.
 */
export const sessionEnhancementPlugin: TelemetryDeckReactSDKPlugin =
  (next: PayloadEnhancer) => (payload: Record<string, unknown>) => {
    const enhancedPayload = next(payload);
    const sessionMetrics = sessionManager.getMetrics();
    
    return {
      ...enhancedPayload,
      ...sessionMetrics,
    };
  }; 