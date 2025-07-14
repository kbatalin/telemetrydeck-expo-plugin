import { expoPlugin } from '../index';

describe('expoPlugin', () => {
  it('should be a function', () => {
    expect(typeof expoPlugin).toBe('function');
  });

  it('should return a function when called with enhancer', () => {
    const mockEnhancer = jest.fn((payload) => payload);
    const plugin = expoPlugin(mockEnhancer);
    
    expect(typeof plugin).toBe('function');
  });

  it('should enhance payload with TelemetryDeck parameters', () => {
    const mockEnhancer = jest.fn((payload) => ({ ...payload, enhanced: true }));
    const plugin = expoPlugin(mockEnhancer);
    
    const originalPayload = { customData: 'test' };
    const result = plugin(originalPayload);
    
    // Check that original payload is preserved
    expect(result).toHaveProperty('customData', 'test');
    expect(result).toHaveProperty('enhanced', true);
    
    // Check that TelemetryDeck parameters are added
    const telemetryDeckKeys = Object.keys(result).filter(key => key.startsWith('TelemetryDeck.'));
    expect(telemetryDeckKeys.length).toBeGreaterThan(0);
    
    // Check for some expected parameter categories
    expect(telemetryDeckKeys.some(key => key.includes('Device'))).toBe(true);
    expect(telemetryDeckKeys.some(key => key.includes('AppInfo'))).toBe(true);
    expect(telemetryDeckKeys.some(key => key.includes('SDK'))).toBe(true);
  });

  it('should call the enhancer with original payload', () => {
    const mockEnhancer = jest.fn((payload) => payload);
    const plugin = expoPlugin(mockEnhancer);
    
    const originalPayload = { test: 'data' };
    plugin(originalPayload);
    
    expect(mockEnhancer).toHaveBeenCalledWith(originalPayload);
  });
}); 