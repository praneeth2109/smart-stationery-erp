import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rrstationery.erp',
  appName: 'RR Stationery ERP',
  webDir: 'out',
  server: {
    // Use https scheme so HttpOnly cookies and fetch() work inside the Capacitor WebView.
    // Replace the androidScheme URL with your Render deployment URL if loading remote assets.
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,          // ms before auto-hide
      launchAutoHide: true,
      backgroundColor: '#0d0b09',        // matches ERP dark charcoal theme
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
  android: {
    allowMixedContent: false,            // enforce HTTPS — no plain HTTP in production
    captureInput: true,                  // improves keyboard UX on Android
    webContentsDebuggingEnabled: false,  // set to true during development
  },
};

export default config;
