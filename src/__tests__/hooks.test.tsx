// import React from "react"; // Not needed for this test
import { renderHook } from "@testing-library/react-native";
import { useSessionTracking } from "../hooks";
import { initSessionTracking, cleanupSessionTracking } from "../init";

// Mock the dependencies
jest.mock("../init", () => ({
  initSessionTracking: jest.fn(),
  cleanupSessionTracking: jest.fn(),
}));

jest.mock("@typedigital/telemetrydeck-react", () => ({
  useTelemetryDeck: jest.fn(),
}));

const mockInitSessionTracking = initSessionTracking as jest.Mock;
const mockCleanupSessionTracking = cleanupSessionTracking as jest.Mock;

import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";
const mockUseTelemetryDeck = useTelemetryDeck as jest.Mock;

describe("useSessionTracking", () => {
  let mockTelemetryDeck: any;

  beforeEach(() => {
    mockTelemetryDeck = {
      signal: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should initialize session tracking when telemetryDeck is available", async () => {
    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck);
    mockInitSessionTracking.mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).toHaveBeenCalledWith(mockTelemetryDeck);
    expect(mockInitSessionTracking).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("should not initialize when telemetryDeck is not available", async () => {
    mockUseTelemetryDeck.mockReturnValue(null);

    renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).not.toHaveBeenCalled();
  });

  it("should cleanup on unmount", async () => {
    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck);
    mockInitSessionTracking.mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).toHaveBeenCalled();

    unmount();

    expect(mockCleanupSessionTracking).toHaveBeenCalled();
  });

  it("should not cleanup if not initialized", () => {
    mockUseTelemetryDeck.mockReturnValue(null);

    const { unmount } = renderHook(() => useSessionTracking());

    unmount();

    expect(mockCleanupSessionTracking).not.toHaveBeenCalled();
  });

  it("should handle initialization errors gracefully", async () => {
    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck);
    mockInitSessionTracking.mockRejectedValue(new Error("Init failed"));

    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    const { unmount } = renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).toHaveBeenCalledWith(mockTelemetryDeck);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to initialize TelemetryDeck session tracking:",
      expect.any(Error)
    );

    unmount();
    consoleSpy.mockRestore();
  });

  it("should not initialize multiple times with same telemetryDeck", async () => {
    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck);
    mockInitSessionTracking.mockResolvedValue(undefined);

    const { rerender, unmount } = renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).toHaveBeenCalledTimes(1);

    // Re-render with same telemetryDeck
    rerender({});

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should not initialize again
    expect(mockInitSessionTracking).toHaveBeenCalledTimes(1);

    unmount();
  });

  it("should reinitialize when telemetryDeck changes", async () => {
    const mockTelemetryDeck2 = { signal: jest.fn() };

    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck);
    mockInitSessionTracking.mockResolvedValue(undefined);

    const { rerender, unmount } = renderHook(() => useSessionTracking());

    // Wait for async effect
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockInitSessionTracking).toHaveBeenCalledWith(mockTelemetryDeck);
    expect(mockInitSessionTracking).toHaveBeenCalledTimes(1);

    // Change telemetryDeck instance
    mockUseTelemetryDeck.mockReturnValue(mockTelemetryDeck2);
    rerender({});

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should cleanup old and initialize new
    expect(mockCleanupSessionTracking).toHaveBeenCalledTimes(1);
    expect(mockInitSessionTracking).toHaveBeenCalledWith(mockTelemetryDeck2);
    expect(mockInitSessionTracking).toHaveBeenCalledTimes(2);

    unmount();
  });
});
