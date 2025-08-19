import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pawpilothq.app',
  appName: 'PawPilot HQ',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563eb",
      showSpinner: true,
      spinnerColor: "#ffffff"
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#2563eb'
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Camera: {
      permissions: {
        camera: "Camera access is required to take photos of your pets",
        photos: "Photo library access is required to select existing photos"
      }
    },
    Geolocation: {
      permissions: {
        location: "Location access is required for lost pet alerts and nearby events"
      }
    }
  }
};

export default config;