import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface GuestSessionManager {
  startSession: () => void;
  cleanup: () => void;
}

class GuestSessionManagerImpl implements GuestSessionManager {
  private cleanupCallbacks: (() => void)[] = [];
  private sessionStartTime: number | null = null;
  private warningShown = false;

  startSession() {
    this.sessionStartTime = Date.now();
    this.warningShown = false;
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || !user.isAnonymous) {
        // User is no longer anonymous, cleanup guest data
        this.cleanup();
      }
    });

    // Cleanup on page unload
    const handleBeforeUnload = () => {
      if (auth.currentUser?.isAnonymous) {
        this.cleanup();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Return cleanup function
    return () => {
      unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  cleanup() {
    // Clear any guest-specific data from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('guest_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Run any registered cleanup callbacks
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error during guest cleanup:', error);
      }
    });

    // Clear the callbacks
    this.cleanupCallbacks = [];
  }

  addCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }

  getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Date.now() - this.sessionStartTime;
  }

  shouldShowWarning(): boolean {
    const duration = this.getSessionDuration();
    return duration > 5 * 60 * 1000 && !this.warningShown; // 5 minutes
  }

  markWarningShown() {
    this.warningShown = true;
  }
}

export const guestSessionManager = new GuestSessionManagerImpl();

// Utility functions for guest data management
export const guestStorage = {
  setItem: (key: string, value: string) => {
    if (auth.currentUser?.isAnonymous) {
      localStorage.setItem(`guest_${key}`, value);
    }
  },
  
  getItem: (key: string): string | null => {
    if (auth.currentUser?.isAnonymous) {
      return localStorage.getItem(`guest_${key}`);
    }
    return null;
  },
  
  removeItem: (key: string) => {
    if (auth.currentUser?.isAnonymous) {
      localStorage.removeItem(`guest_${key}`);
    }
  }
};
