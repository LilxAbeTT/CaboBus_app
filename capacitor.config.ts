import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'mx.cabobus.app',
  appName: 'CaboBus Conductor',
  webDir: 'dist',
  android: {
    useLegacyBridge: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_tracking',
      iconColor: '#0f766e',
    },
  },
}

export default config
