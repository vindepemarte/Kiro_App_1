import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface NetworkStatusHook {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSlowConnection: boolean;
  retryWhenOnline: (operation: () => Promise<any>) => Promise<any>;
}

export function useNetworkStatus(): NetworkStatusHook {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        isOnline: true, // Assume online during SSR
        isSlowConnection: false,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0,
      };
    }

    // Initialize with current status
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      isOnline: navigator.onLine,
      isSlowConnection: connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    };
  });

  const updateNetworkStatus = useCallback(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    setStatus({
      isOnline: navigator.onLine,
      isSlowConnection: connection ? connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g' : false,
      connectionType: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return;
    }

    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  const retryWhenOnline = useCallback(async (operation: () => Promise<any>): Promise<any> => {
    if (status.isOnline) {
      return operation();
    }

    // Wait for online status
    return new Promise((resolve, reject) => {
      const handleOnline = async () => {
        window.removeEventListener('online', handleOnline);
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      window.addEventListener('online', handleOnline);

      // Set a timeout to avoid waiting forever
      setTimeout(() => {
        window.removeEventListener('online', handleOnline);
        reject(new Error('Network timeout: Still offline after waiting'));
      }, 30000); // 30 seconds timeout
    });
  }, [status.isOnline]);

  return {
    status,
    isOnline: status.isOnline,
    isOffline: !status.isOnline,
    isSlowConnection: status.isSlowConnection,
    retryWhenOnline,
  };
}

// Hook for detecting when the user comes back online after being offline
export function useOnlineRecovery(onRecovery?: () => void) {
  const [wasOffline, setWasOffline] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // User came back online
      setWasOffline(false);
      if (onRecovery) {
        onRecovery();
      }
    }
  }, [isOnline, wasOffline, onRecovery]);

  return { wasOffline, isRecovering: wasOffline && isOnline };
}