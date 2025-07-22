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
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
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
  };
});

import { sessionManager } from '../session';

// Helper functions for tests
const clearMockStorage = () => {
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
};

const clearAppStateListeners = () => {
  mockAppStateListeners.length = 0;
};

const emitAppStateChange = (newState: string) => {
  (global as any).mockAppState.currentState = newState;
  mockAppStateListeners.forEach(listener => listener(newState));
};

const setAppState = (state: string) => {
  (global as any).mockAppState.currentState = state;
};

describe('SessionManager', () => {
  let mockTelemetryDeck: any;

  beforeEach(async () => {
    // Reset mocks
    clearMockStorage();
    clearAppStateListeners();
    setAppState('background'); // Start with background state
    
    // Create mock TelemetryDeck instance
    mockTelemetryDeck = {
      signal: jest.fn(),
    };
    
    // Reset session manager state
    await sessionManager.resetState();
    sessionManager.cleanup();
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await sessionManager.init(mockTelemetryDeck);
      
      // Should set up AppState listener
      const AppState = (await import('react-native')).AppState;
      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle initial foreground state', async () => {
      setAppState('active');
      
      await sessionManager.init(mockTelemetryDeck);
      
      // Should start first session and send signals
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Acquisition.newInstallDetected');
    });
  });

  describe('session creation', () => {
    beforeEach(async () => {
      setAppState('background'); // Start in background
      await sessionManager.init(mockTelemetryDeck);
      jest.clearAllMocks();
    });

    it('should create first session on foreground', async () => {
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0)); // Allow async operations
      
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Acquisition.newInstallDetected');
      
      const state = sessionManager.getCurrentState();
      expect(state?.sessions).toHaveLength(1);
      expect(state?.lifetimeSessionsCount).toBe(1);
    });

    it('should create new session after timeout', async () => {
      // Create first session
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Verify first session was created
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      
      // Go to background
      emitAppStateChange('background');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Manually set lastEnteredBackground to 6 minutes ago to simulate timeout
      const state = sessionManager.getCurrentState();
      if (state) {
        state.lastEnteredBackground = new Date(Date.now() - 6 * 60 * 1000);
      }
      
      jest.clearAllMocks();
      
      // Come back to foreground
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockTelemetryDeck.signal).toHaveBeenCalledWith('TelemetryDeck.Session.started');
      expect(mockTelemetryDeck.signal).not.toHaveBeenCalledWith('TelemetryDeck.Acquisition.newInstallDetected');
      
      const finalState = sessionManager.getCurrentState();
      expect(finalState?.sessions).toHaveLength(2);
      expect(finalState?.lifetimeSessionsCount).toBe(2);
    });
  });

  describe('metrics calculation', () => {
    beforeEach(async () => {
      await sessionManager.init(mockTelemetryDeck);
    });

    it('should return empty metrics when no state', () => {
      // Create a new session manager without initialization
      const newSessionManager = new (sessionManager.constructor as any)();
      const metrics = newSessionManager.getMetrics();
      expect(metrics).toEqual({});
    });

    it('should calculate basic metrics', async () => {
      // Trigger session creation
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const metrics = sessionManager.getMetrics();
      
      expect(metrics).toMatchObject({
        'TelemetryDeck.Retention.DistinctDaysUsed': expect.any(Number),
        'TelemetryDeck.Retention.TotalSessionsCount': 1,
      });
    });
  });

  describe('persistence', () => {
    it('should save and load state from AsyncStorage', async () => {
      await sessionManager.init(mockTelemetryDeck);
      
      // Create a session
      emitAppStateChange('active');
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Check that data was saved
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      
      // Verify storage content
      const savedData = JSON.parse(mockStorage['telemetrydeck_tracking_state']);
      expect(savedData.sessions).toHaveLength(1);
      expect(savedData.lifetimeSessionsCount).toBe(1);
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to throw error
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      (AsyncStorage.getItem as any).mockRejectedValueOnce(new Error('Storage error'));
      
      // Ensure we start in background to prevent automatic session creation
      setAppState('background');
      
      // Should not throw
      await expect(sessionManager.init(mockTelemetryDeck)).resolves.not.toThrow();
      
      // Should initialize with empty state (no session created yet)
      const state = sessionManager.getCurrentState();
      expect(state?.sessions).toEqual([]);
      expect(state?.lifetimeSessionsCount).toBe(0);
    });
  });
}); 