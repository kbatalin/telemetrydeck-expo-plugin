import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const STORAGE_KEY = 'telemetrydeck_tracking_state';
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_RETENTION_DAYS = 90;

export interface StoredSession {
  /** Identifier of the session */
  id: string;
  firstStart: Date;
  ended?: Date;
  /** The duration of the session covering the time when the user was actively interacting with the app */
  durationMillis: number;
}

export interface TrackingState {
  sessions: StoredSession[];
  /** A list of dates on which we have seen the user */
  distinctDays: string[];
  lifetimeSessionsCount: number;
  lastEnteredBackground?: Date;
}

/**
 * Manages session tracking and persistence for TelemetryDeck.
 * Tracks app state changes and maintains session data.
 */
class SessionManager {
  private currentState: TrackingState | null = null;
  private currentSessionId: string | null = null;
  private telemetryDeckInstance: any = null;
  private appStateSubscription: any = null;
  private isInitialized = false;

  /**
   * Initialize the session manager with TelemetryDeck instance
   */
  async init(telemetryDeckInstance: any): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.telemetryDeckInstance = telemetryDeckInstance;
    
    // Load state from storage
    await this.loadState();
    
    // Setup app state listener
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Handle initial foreground
    if (AppState.currentState === 'active') {
      await this.handleForeground();
    }
    
    this.isInitialized = true;
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    if (nextAppState === 'active') {
      await this.handleForeground();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      await this.handleBackground();
    }
  };

  /**
   * Handle app coming to foreground
   */
  private async handleForeground(): Promise<void> {
    if (!this.currentState) {
      await this.loadState();
    }

    const now = new Date();
    const currentState = this.currentState!;

    // Update distinct days
    const today = this.formatDate(now);
    if (!currentState.distinctDays.includes(today)) {
      currentState.distinctDays.push(today);
      currentState.distinctDays.sort();
    }

    // Check if we need to create a new session
    const shouldStartNewSession = this.shouldStartNewSession(now);
    
    if (shouldStartNewSession) {
      await this.startNewSession(now);
    }

    await this.saveState();
  }

  /**
   * Handle app going to background
   */
  private async handleBackground(): Promise<void> {
    if (!this.currentState) {
      return;
    }

    const now = new Date();
    this.currentState.lastEnteredBackground = now;

    // Update current session duration
    if (this.currentSessionId) {
      const currentSession = this.currentState.sessions.find(s => s.id === this.currentSessionId);
      if (currentSession && !currentSession.ended) {
        currentSession.durationMillis = now.getTime() - currentSession.firstStart.getTime();
      }
    }

    await this.saveState();
  }

  /**
   * Determine if a new session should be started
   */
  private shouldStartNewSession(now: Date): boolean {
    const currentState = this.currentState!;
    
    // No sessions yet (first launch)
    if (currentState.sessions.length === 0) {
      return true;
    }

    // More than 5 minutes since last background
    if (currentState.lastEnteredBackground) {
      const timeSinceBackground = now.getTime() - currentState.lastEnteredBackground.getTime();
      return timeSinceBackground > SESSION_TIMEOUT_MS;
    }

    return false;
  }

  /**
   * Start a new session
   */
  private async startNewSession(now: Date): Promise<void> {
    const currentState = this.currentState!;
    const isFirstSession = currentState.sessions.length === 0;

    // End previous session if exists
    if (this.currentSessionId) {
      const previousSession = currentState.sessions.find(s => s.id === this.currentSessionId);
      if (previousSession && !previousSession.ended) {
        previousSession.ended = now;
      }
    }

    // Create new session
    const newSessionId = this.generateSessionId();
    const newSession: StoredSession = {
      id: newSessionId,
      firstStart: now,
      durationMillis: 0,
    };

    currentState.sessions.push(newSession);
    currentState.lifetimeSessionsCount++;
    this.currentSessionId = newSessionId;

    // Clean up old sessions (older than 90 days)
    this.cleanupOldSessions(now);

    // Send session started signal
    if (this.telemetryDeckInstance) {
      this.telemetryDeckInstance.signal('TelemetryDeck.Session.started');

      // Send new install signal for first session
      if (isFirstSession) {
        this.telemetryDeckInstance.signal('TelemetryDeck.Acquisition.newInstallDetected');
      }
    }
  }

  /**
   * Clean up sessions older than retention period
   */
  private cleanupOldSessions(now: Date): void {
    if (!this.currentState) return;

    const retentionCutoff = new Date(now.getTime() - (SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000));
    this.currentState.sessions = this.currentState.sessions.filter(
      session => session.firstStart >= retentionCutoff
    );
  }

  /**
   * Load state from AsyncStorage
   */
  private async loadState(): Promise<void> {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        // Convert date strings back to Date objects
        this.currentState = {
          ...parsed,
          sessions: parsed.sessions.map((session: any) => ({
            ...session,
            firstStart: new Date(session.firstStart),
            ended: session.ended ? new Date(session.ended) : undefined,
          })),
          lastEnteredBackground: parsed.lastEnteredBackground 
            ? new Date(parsed.lastEnteredBackground) 
            : undefined,
        };
      } else {
        // Initialize empty state
        this.currentState = {
          sessions: [],
          distinctDays: [],
          lifetimeSessionsCount: 0,
        };
      }
    } catch (error) {
      console.warn('Failed to load TelemetryDeck session state:', error);
      // Fallback to empty state
      this.currentState = {
        sessions: [],
        distinctDays: [],
        lifetimeSessionsCount: 0,
      };
    }
  }

  /**
   * Save current state to AsyncStorage
   */
  private async saveState(): Promise<void> {
    if (!this.currentState) return;

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentState));
    } catch (error) {
      console.warn('Failed to save TelemetryDeck session state:', error);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format date as YYYY-MM-DD string
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] || '';
  }

  /**
   * Get current session metrics for signal enhancement
   */
  getMetrics(): Record<string, unknown> {
    if (!this.currentState) {
      return {};
    }

    const currentState = this.currentState;
    const now = new Date();
    
    // Calculate days used in last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const daysLastMonth = currentState.distinctDays.filter(dayString => {
      const day = new Date(dayString + 'T00:00:00.000Z');
      return day > lastMonth && day < now;
    });

    const attributes: Record<string, unknown> = {
      'TelemetryDeck.Acquisition.FirstSessionDate': (currentState.distinctDays[0] || '') as string,
      'TelemetryDeck.Retention.DistinctDaysUsed': currentState.distinctDays.length,
      'TelemetryDeck.Retention.DistinctDaysUsedLastMonth': daysLastMonth.length,
      'TelemetryDeck.Retention.TotalSessionsCount': currentState.lifetimeSessionsCount,
    };

    // Calculate average and previous session metrics
    if (currentState.sessions.length > 0) {
      const completedSessions = currentState.sessions.filter(s => s.ended !== undefined);
      
      if (completedSessions.length > 0) {
        const averageSeconds = completedSessions
          .map(s => s.durationMillis / 1000)
          .reduce((sum, duration) => sum + duration, 0) / completedSessions.length;
        
        attributes['TelemetryDeck.Retention.AverageSessionSeconds'] = Math.round(averageSeconds);

        // Find last completed session
        const lastCompletedSession = completedSessions
          .filter(s => s.ended)
          .sort((a, b) => (b.ended?.getTime() || 0) - (a.ended?.getTime() || 0))[0];
        
        if (lastCompletedSession) {
          attributes['TelemetryDeck.Retention.PreviousSessionSeconds'] = 
            (lastCompletedSession.durationMillis / 1000).toFixed(3);
        }
      }
    }

    return attributes;
  }

  /**
   * Get current state (for testing)
   */
  getCurrentState(): TrackingState | null {
    return this.currentState;
  }

  /**
   * Reset state (for testing)
   */
  async resetState(): Promise<void> {
    this.currentState = {
      sessions: [],
      distinctDays: [],
      lifetimeSessionsCount: 0,
    };
    await this.saveState();
  }
}

// Global singleton instance
export const sessionManager = new SessionManager(); 