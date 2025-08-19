import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { telemetry } from "../lib/telemetry";

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

export async function currentCoords(): Promise<Coordinates> {
  try {
    await telemetry.mobile.gpsAccess({ action: 'get_current_position' });

    const position: Position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    });

    const coords: Coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude || undefined,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed || undefined
    };

    await telemetry.mobile.gpsAccess({ 
      success: true,
      accuracy: coords.accuracy,
      platform: Capacitor.getPlatform()
    });

    return coords;
  } catch (error) {
    console.error('Error getting current coordinates:', error);
    
    await telemetry.mobile.gpsAccess({ 
      success: false,
      error: error.message,
      platform: Capacitor.getPlatform()
    });
    
    throw error;
  }
}

export async function watchPosition(
  callback: (coords: Coordinates) => void,
  errorCallback?: (error: any) => void
): Promise<string> {
  try {
    const watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 30000
    }, (position, err) => {
      if (err) {
        console.error('Watch position error:', err);
        errorCallback?.(err);
        return;
      }

      if (position) {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        };

        callback(coords);
      }
    });

    await telemetry.mobile.gpsAccess({ 
      action: 'watch_position_start',
      watch_id: watchId
    });

    return watchId;
  } catch (error) {
    console.error('Error watching position:', error);
    
    await telemetry.mobile.gpsAccess({ 
      success: false,
      action: 'watch_position_start',
      error: error.message
    });
    
    throw error;
  }
}

export async function clearWatch(watchId: string): Promise<void> {
  try {
    await Geolocation.clearWatch({ id: watchId });
    
    await telemetry.mobile.gpsAccess({ 
      action: 'watch_position_stop',
      watch_id: watchId
    });
  } catch (error) {
    console.error('Error clearing watch:', error);
  }
}

export async function checkGPSPermissions(): Promise<PermissionStatus> {
  try {
    const permissions = await Geolocation.checkPermissions();
    
    await telemetry.mobile.gpsAccess({ 
      action: 'check_permissions',
      status: permissions.location
    });
    
    return permissions;
  } catch (error) {
    console.error('Error checking GPS permissions:', error);
    throw error;
  }
}

export async function requestGPSPermissions(): Promise<PermissionStatus> {
  try {
    const permissions = await Geolocation.requestPermissions();
    
    await telemetry.mobile.gpsAccess({ 
      action: 'request_permissions',
      status: permissions.location,
      granted: permissions.location === 'granted'
    });
    
    return permissions;
  } catch (error) {
    console.error('Error requesting GPS permissions:', error);
    
    await telemetry.mobile.gpsAccess({ 
      action: 'request_permissions',
      success: false,
      error: error.message
    });
    
    throw error;
  }
}

// Web fallback for GPS functionality
export async function getCurrentPositionWeb(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        };
        resolve(coords);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// Universal function that works on both mobile and web
export async function getLocation(): Promise<Coordinates> {
  if (Capacitor.isNativePlatform()) {
    return currentCoords();
  } else {
    return getCurrentPositionWeb();
  }
}