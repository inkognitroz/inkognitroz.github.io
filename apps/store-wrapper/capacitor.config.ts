import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Supergeni butikk-app-wrapper (task #59).
 *
 * Strategi v1 (pragmatisk): appen laster den LIVE PWA-en fra https://mmir.ai
 * via server.url i stedet for aa bundle en lokal kopi av web-koden.
 *
 * Avveining (dokumentert for eier):
 * - Fordel: null build-drift — appen viser alltid siste deployede versjon av
 *   PWA-en (GitHub Pages, repo Inkognitroz/inkognitroz.github.io/public/).
 *   Ingen dobbel release-pipeline.
 * - Ulempe / Apple-retningslinjer (App Review Guideline 4.2 "Minimum
 *   Functionality"): apper som bare er et nettsted i en WebView kan avvises.
 *   Motargument som maa fremmes ved innsending: PWA-en har reell app-verdi —
 *   installerbarhet, offline-shell + offline.html (task #58), shortcuts,
 *   statusbar/splash-integrasjon via Capacitor-broen. Hvis Apple likevel
 *   avviser: bytt til bundlet build (kopier public/ inn i webDir og fjern
 *   server.url) — arkitekturen her stoetter begge uten kodeendring utover
 *   denne configen.
 * - Google Play: remote-content-wrappere er tillatt (jf. Trusted Web
 *   Activity-praksis), saa Android-risikoen er lav.
 *
 * webDir (www/) inneholder kun en minimal lokal fallback-side; med server.url
 * satt lastes alltid mmir.ai. errorPath viser fallback ved nettverksfeil.
 */
const config: CapacitorConfig = {
  appId: 'ai.mmir.supergeni',
  appName: 'Supergeni',
  webDir: 'www',
  server: {
    url: 'https://mmir.ai',
    // Tillat navigasjon innen egne domener; alt annet aapnes eksternt.
    allowNavigation: ['mmir.ai', 'www.mmir.ai', 'api.mmir.ai'],
    errorPath: 'index.html',
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'Supergeni',
  },
  plugins: {
    StatusBar: {
      // Moerk brandflate (#0f172a fra manifestets theme_color) → lys tekst.
      style: 'DARK',
      backgroundColor: '#0f172a',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
  },
};

export default config;
