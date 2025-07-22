// Mock AsyncStorage inline
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  },
}));

// Mock AppState inline
const mockAppStateListeners: Array<(state: string) => void> = [];

jest.mock('react-native', () => {
  const mockAppState = {
    currentState: 'background',
    addEventListener: jest.fn((type: string, handler: (state: string) => void) => {
      if (type === 'change') {
        mockAppStateListeners.push(handler);
      }
      return {
        remove: jest.fn(() => {
          const index = mockAppStateListeners.indexOf(handler);
          if (index > -1) {
            mockAppStateListeners.splice(index, 1);
          }
        })
      };
    }),
  };
  
  // Store mockAppState globally so we can access it in tests
  (global as any).mockAppState = mockAppState;
  
  return {
    AppState: mockAppState,
  AccessibilityInfo: {
    isBoldTextEnabled: jest.fn(() => Promise.resolve(false)),
    isInvertColorsEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    isReduceTransparencyEnabled: jest.fn(() => Promise.resolve(false)),
  },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  I18nManager: {
    isRTL: false,
  },
  PixelRatio: {
    get: jest.fn(() => 2),
    getFontScale: jest.fn(() => 1),
  },
  Platform: {
    OS: 'ios',
  },
  };
});

import { expoPlugin } from '../index';
import { sessionEnhancementPlugin, initSessionTracking } from '../index';

const emitAppStateChange = (newState: string) => {
  (global as any).mockAppState.currentState = newState;
  mockAppStateListeners.forEach(listener => listener(newState));
};

describe('Integration Tests', () => {
  let mockTelemetryDeck: any;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    mockAppStateListeners.length = 0;
    (global as any).mockAppState.currentState = 'background';
    
    // Reset session manager
    const { sessionManager } = await import('../session');
    await sessionManager.resetState();
    sessionManager.cleanup();
    
    // Create mock TelemetryDeck instance
    mockTelemetryDeck = {
      signal: jest.fn(),
    };
  });

  describe('Combined plugins', () => {
    it('should work together - expoPlugin and sessionEnhancementPlugin', async () => {
      // Initialize session tracking
      await initSessionTracking(mockTelemetryDeck);
      
      // Trigger session creation
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Create a pipeline with both plugins
      const mockNext = jest.fn((payload) => ({ ...payload, processed: true }));
      
      // Apply expo plugin first
      const expoEnhanced = expoPlugin(mockNext);
      const originalPayload = { eventName: 'test_event' };
      const expoResult = expoEnhanced(originalPayload);
      
      // Apply session enhancement plugin
      const sessionEnhanced = sessionEnhancementPlugin(mockNext);
      const finalResult = sessionEnhanced(expoResult);
      
      // Should contain both expo and session data
      expect(finalResult).toMatchObject({
        eventName: 'test_event',
        processed: true,
        // Expo data
        'TelemetryDeck.Device.platform': expect.any(String),
        'TelemetryDeck.SDK.name': 'telemetrydeck-react',
        // Session data
        'TelemetryDeck.Retention.TotalSessionsCount': 1,
        'TelemetryDeck.Retention.DistinctDaysUsed': 1,
      });
    });

    it('should handle app lifecycle correctly', async () => {
      // Step 1: Initialize session tracking
      await initSessionTracking(mockTelemetryDeck);
      
      // Step 2: App becomes active (first session)
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Acquisition.newInstallDetected');
      
      // Step 3: Create plugin pipeline
      const enhancePayload = (payload: any) => {
        const mockNext = (p: any) => p;
        const withExpo = expoPlugin(mockNext)(payload);
        const withSession = sessionEnhancementPlugin(mockNext)(withExpo);
        return withSession;
      };
      
      // Step 4: Send some signals
      const result = enhancePayload({ event: 'app_launch' });
      expect(result).toMatchObject({
        event: 'app_launch',
        'TelemetryDeck.Retention.TotalSessionsCount': 1,
        'TelemetryDeck.Session.started': expect.any(String),
      });
    });
  });

  describe('Error handling', () => {
    it('should handle AsyncStorage failures gracefully', async () => {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      (AsyncStorage.getItem as any).mockRejectedValueOnce(new Error('Storage failed'));
      
      // Should not throw
      await expect(initSessionTracking(mockTelemetryDeck)).resolves.not.toThrow();
      
      // Should still work with in-memory state
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      
      const enhancePayload = (payload: any) => {
        const mockNext = (p: any) => p;
        return sessionEnhancementPlugin(mockNext)(payload);
      };
      
      const result = enhancePayload({ event: 'test' });
      expect(result['TelemetryDeck.Retention.TotalSessionsCount']).toBe(1);
    });
  });
}); 