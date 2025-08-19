import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { isEnabled } from '../../lib/flags';
import { telemetry } from '../../lib/telemetry';
import { Wifi, WifiOff, Download, Upload, FolderSync as Sync } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface OfflineAction {
  id: string;
  type: 'post' | 'comment' | 'like' | 'health_record';
  data: any;
  timestamp: string;
  retryCount: number;
}

const OfflineManager: React.FC = () => {
  const { profile } = useAuth();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (profile) {
      checkFeatureFlag();
      loadPendingActions();
    }
  }, [profile]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isFeatureEnabled) {
        toast.success('Back online! Syncing pending actions...');
        syncPendingActions();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (isFeatureEnabled) {
        toast.error('You\'re offline. Actions will be saved and synced when you reconnect.');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isFeatureEnabled]);

  const checkFeatureFlag = async () => {
    if (!profile) return;
    
    const enabled = await isEnabled("offline_mode", profile.id);
    setIsFeatureEnabled(enabled);
  };

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem('pawpilot_offline_actions');
      if (stored) {
        const actions = JSON.parse(stored);
        setPendingActions(actions);
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem('pawpilot_offline_actions', JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addOfflineAction = (type: OfflineAction['type'], data: any) => {
    if (!isFeatureEnabled || isOnline) return;

    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    const newActions = [...pendingActions, action];
    savePendingActions(newActions);
    
    toast.success('Action saved for when you\'re back online');
  };

  const syncPendingActions = async () => {
    if (!isFeatureEnabled || !isOnline || pendingActions.length === 0) return;

    setSyncing(true);

    try {
      const successfulActions: string[] = [];
      const failedActions: OfflineAction[] = [];

      for (const action of pendingActions) {
        try {
          await executeOfflineAction(action);
          successfulActions.push(action.id);
          
          await telemetry.notifications.push({
            offline_action_synced: true,
            action_type: action.type,
            retry_count: action.retryCount
          });
        } catch (error) {
          console.error('Error syncing action:', error);
          
          if (action.retryCount < 3) {
            failedActions.push({
              ...action,
              retryCount: action.retryCount + 1
            });
          }
        }
      }

      // Update pending actions
      savePendingActions(failedActions);

      if (successfulActions.length > 0) {
        toast.success(`Synced ${successfulActions.length} offline action${successfulActions.length !== 1 ? 's' : ''}`);
      }

      if (failedActions.length > 0) {
        toast.error(`${failedActions.length} action${failedActions.length !== 1 ? 's' : ''} failed to sync`);
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
      toast.error('Failed to sync offline actions');
    } finally {
      setSyncing(false);
    }
  };

  const executeOfflineAction = async (action: OfflineAction) => {
    const { supabase } = await import('../../lib/supabase');

    switch (action.type) {
      case 'post':
        await supabase.from('posts').insert(action.data);
        break;
      case 'comment':
        await supabase.from('post_comments').insert(action.data);
        break;
      case 'like':
        await supabase.from('post_likes').insert(action.data);
        break;
      case 'health_record':
        await supabase.from('health_records').insert(action.data);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  };

  const clearPendingActions = () => {
    savePendingActions([]);
    toast.success('Cleared all pending actions');
  };

  if (!isFeatureEnabled) {
    return null;
  }

  return (
    <>
      {/* Offline Status Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-16 left-0 right-0 z-40 bg-yellow-500 text-white px-4 py-2 text-center"
          >
            <div className="flex items-center justify-center space-x-2">
              <WifiOff className="h-4 w-4" />
              <span>You're offline. Actions will be saved and synced when you reconnect.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Status */}
      {pendingActions.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sync className={`h-4 w-4 text-blue-600 ${syncing ? 'animate-spin' : ''}`} />
                <span className="font-medium text-gray-900">
                  {syncing ? 'Syncing...' : 'Pending Actions'}
                </span>
              </div>
              <span className="text-sm text-gray-600">{pendingActions.length}</span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {syncing 
                ? 'Syncing your offline actions...'
                : `${pendingActions.length} action${pendingActions.length !== 1 ? 's' : ''} waiting to sync`
              }
            </p>
            
            <div className="flex space-x-2">
              {isOnline && !syncing && (
                <button
                  onClick={syncPendingActions}
                  className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Sync Now
                </button>
              )}
              <button
                onClick={clearPendingActions}
                className="flex-1 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default OfflineManager;

// Hook for offline functionality
export const useOfflineActions = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile) {
      checkFeatureFlag();
    }
  }, [profile]);

  const checkFeatureFlag = async () => {
    if (!profile) return;
    
    const enabled = await isEnabled("offline_mode", profile.id);
    setIsFeatureEnabled(enabled);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const queueOfflineAction = (type: OfflineAction['type'], data: any) => {
    if (!isFeatureEnabled || isOnline) return false;

    try {
      const stored = localStorage.getItem('pawpilot_offline_actions');
      const actions = stored ? JSON.parse(stored) : [];
      
      const newAction: OfflineAction = {
        id: crypto.randomUUID(),
        type,
        data,
        timestamp: new Date().toISOString(),
        retryCount: 0
      };

      actions.push(newAction);
      localStorage.setItem('pawpilot_offline_actions', JSON.stringify(actions));
      
      return true;
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return false;
    }
  };

  return {
    isOnline,
    isOfflineEnabled: isFeatureEnabled,
    queueOfflineAction
  };
};