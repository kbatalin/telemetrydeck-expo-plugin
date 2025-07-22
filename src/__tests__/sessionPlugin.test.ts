import { sessionEnhancementPlugin } from '../sessionPlugin';
import { sessionManager } from '../session';

// Mock the session manager
jest.mock('../session', () => ({
  sessionManager: {
    getMetrics: jest.fn(),
  },
}));

const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;

describe('sessionEnhancementPlugin', () => {
  let mockEnhancer: jest.Mock;

  beforeEach(() => {
    mockEnhancer = jest.fn((payload) => ({ ...payload, enhanced: true }));
    jest.clearAllMocks();
  });

  it('should be a function', () => {
    expect(typeof sessionEnhancementPlugin).toBe('function');
  });

  it('should return a function when called with enhancer', () => {
    const plugin = sessionEnhancementPlugin(mockEnhancer);
    expect(typeof plugin).toBe('function');
  });

  it('should enhance payload with session metrics', () => {
    const mockMetrics = {
      'TelemetryDeck.Retention.DistinctDaysUsed': 5,
      'TelemetryDeck.Retention.TotalSessionsCount': 10,
      'TelemetryDeck.Acquisition.FirstSessionDate': '2024-01-01',
    };

    mockSessionManager.getMetrics.mockReturnValue(mockMetrics);

    const plugin = sessionEnhancementPlugin(mockEnhancer);
    const originalPayload = { customData: 'test' };
    const result = plugin(originalPayload);

    // Check that enhancer was called with original payload
    expect(mockEnhancer).toHaveBeenCalledWith(originalPayload);

    // Check that result includes enhanced payload and session metrics
    expect(result).toEqual({
      customData: 'test',
      enhanced: true,
      'TelemetryDeck.Retention.DistinctDaysUsed': 5,
      'TelemetryDeck.Retention.TotalSessionsCount': 10,
      'TelemetryDeck.Acquisition.FirstSessionDate': '2024-01-01',
    });
  });

  it('should handle empty metrics from session manager', () => {
    mockSessionManager.getMetrics.mockReturnValue({});

    const plugin = sessionEnhancementPlugin(mockEnhancer);
    const originalPayload = { customData: 'test' };
    const result = plugin(originalPayload);

    expect(result).toEqual({
      customData: 'test',
      enhanced: true,
    });
  });

  it('should preserve all original payload properties', () => {
    const mockMetrics = {
      'TelemetryDeck.Retention.DistinctDaysUsed': 3,
    };

    mockSessionManager.getMetrics.mockReturnValue(mockMetrics);

    const plugin = sessionEnhancementPlugin(mockEnhancer);
    const originalPayload = {
      customData: 'test',
      userId: '123',
      eventType: 'click',
      nested: {
        property: 'value',
      },
    };
    const result = plugin(originalPayload);

    expect(result).toMatchObject({
      customData: 'test',
      userId: '123',
      eventType: 'click',
      nested: {
        property: 'value',
      },
      enhanced: true,
      'TelemetryDeck.Retention.DistinctDaysUsed': 3,
    });
  });

  it('should call session manager getMetrics on each invocation', () => {
    const plugin = sessionEnhancementPlugin(mockEnhancer);

    plugin({ event: 'first' });
    plugin({ event: 'second' });
    plugin({ event: 'third' });

    expect(mockSessionManager.getMetrics).toHaveBeenCalledTimes(3);
  });

  it('should handle session metrics overriding payload properties', () => {
    const mockMetrics = {
      'customData': 'overridden by session',
      'TelemetryDeck.Retention.DistinctDaysUsed': 7,
    };

    mockSessionManager.getMetrics.mockReturnValue(mockMetrics);

    const plugin = sessionEnhancementPlugin(mockEnhancer);
    const originalPayload = { customData: 'original' };
    const result = plugin(originalPayload);

    // Session metrics should override payload properties
    expect(result).toMatchObject({
      customData: 'overridden by session',
      enhanced: true,
      'TelemetryDeck.Retention.DistinctDaysUsed': 7,
    });
  });

  it('should work with complex metric values', () => {
    const mockMetrics = {
      'TelemetryDeck.Retention.AverageSessionSeconds': 145.5,
      'TelemetryDeck.Retention.PreviousSessionSeconds': '60.123',
      'TelemetryDeck.Retention.DistinctDaysUsed': 0,
      'TelemetryDeck.Acquisition.FirstSessionDate': '',
    };

    mockSessionManager.getMetrics.mockReturnValue(mockMetrics);

    const plugin = sessionEnhancementPlugin(mockEnhancer);
    const result = plugin({});

    expect(result).toMatchObject({
      enhanced: true,
      'TelemetryDeck.Retention.AverageSessionSeconds': 145.5,
      'TelemetryDeck.Retention.PreviousSessionSeconds': '60.123',
      'TelemetryDeck.Retention.DistinctDaysUsed': 0,
      'TelemetryDeck.Acquisition.FirstSessionDate': '',
    });
  });
}); 