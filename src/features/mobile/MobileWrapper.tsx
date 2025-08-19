import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapacitorApp } from '@capacitor/app';
import { registerMobilePush } from '../../mobile/push';
import { checkCameraPermissions } from '../../mobile/camera';
import { checkGPSPermissions } from '../../mobile/gps';
import { useAuth } from '../../lib/auth';
import { telemetry } from '../../lib/telemetry';
import toast from 'react-hot-toast';

interface MobileWrapperProps {
  children: React.ReactNode;
}

const MobileWrapper: React.FC<MobileWrapperProps> = ({ children }) => {
  const { profile } = useAuth();
  const [isNative, setIsNative] = useState(false);
  const [permissions, setPermissions] = useState({
    camera: false,
    location: false,
    notifications: false
  });

  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      initializeMobileApp();
    }
  }, []);

  useEffect(() => {
    if (isNative && profile) {
      setupMobileFeatures();
    }
  }, [isNative, profile]);

  const initializeMobileApp = async () => {
    try {
      // Configure status bar
      if (Capacitor.getPlatform() !== 'web') {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#2563eb' });
      }

      // Hide splash screen
      await SplashScreen.hide();

      // Set up app state listeners
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
        
        if (profile) {
          telemetry.mobile.pushRegister({ 
            app_state_change: true, 
            is_active: isActive 
          });
        }
      });

      // Handle back button
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });

      console.log('Mobile app initialized successfully');
    } catch (error) {
      console.error('Error initializing mobile app:', error);
    }
  };

  const setupMobileFeatures = async () => {
    try {
      // Check and request permissions
      const [cameraPerms, gpsPerms] = await Promise.all([
        checkCameraPermissions(),
        checkGPSPermissions()
      ]);

      setPermissions({
        camera: cameraPerms,
        location: gpsPerms.location === 'granted',
        notifications: false // Will be updated by push registration
      });

      // Register for push notifications
      const pushSuccess = await registerMobilePush();
      setPermissions(prev => ({ ...prev, notifications: pushSuccess }));

      // Log mobile setup completion
      await telemetry.mobile.pushRegister({
        setup_complete: true,
        camera_permission: cameraPerms,
        location_permission: gpsPerms.location === 'granted',
        push_permission: pushSuccess
      });

    } catch (error) {
      console.error('Error setting up mobile features:', error);
      toast.error('Some mobile features may not be available');
    }
  };

  // Show permission prompts for missing permissions
  const showPermissionPrompts = () => {
    if (!isNative) return null;

    const missingPermissions = [];
    if (!permissions.camera) missingPermissions.push('Camera');
    if (!permissions.location) missingPermissions.push('Location');
    if (!permissions.notifications) missingPermissions.push('Notifications');

    if (missingPermissions.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">
              Enable Mobile Features
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Grant {missingPermissions.join(', ')} permissions to unlock the full mobile experience.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {showPermissionPrompts()}
      {children}
    </div>
  );
};

export default MobileWrapper;