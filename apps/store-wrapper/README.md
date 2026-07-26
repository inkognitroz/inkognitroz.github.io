# Supergeni butikk-app-wrapper (task #59)

Capacitor-wrapper som pakker den live Supergeni-PWA-en for Google Play og
App Store. **Ikke sendt inn** — innsending krever eier-kontoer og signering,
se `owner-checklist.md`.

## Hvor PWA-en bor (oppdaget 26.07.2026)

- Live: https://mmir.ai — servert fra **GitHub Pages** (repo
  `Inkognitroz/inkognitroz.github.io`, katalog `public/`) bak Cloudflare.
- Manifest: https://mmir.ai/manifest.webmanifest (`/manifest.json` finnes
  ikke — 404).
- Service worker: https://mmir.ai/sw.js (offline-shell fra task #58).
- `Supergeni-Web`-repoet er et Open WebUI-evidensrepo og er IKKE kilden til
  PWA-en.

## Arkitektur v1: remote-URL-wrapper

`capacitor.config.ts` setter `server.url = https://mmir.ai`, så appen laster
alltid siste deployede PWA. Avveiningen (inkl. Apple Guideline 4.2 og
bytteoppskrift til bundlet build) er dokumentert i kommentaren øverst i
`capacitor.config.ts` og i `store-metadata/app-store.md`.

`www/` inneholder kun en lokal fallback-side som vises ved nettverksfeil
(`server.errorPath`).

## Struktur

```
apps/store-wrapper/
├── capacitor.config.ts   # appId ai.mmir.supergeni, appName Supergeni
├── www/                  # lokal fallback (offline/feil)
├── assets/               # kilde-bilder for ikon/splash (fra brand-SVG-ene)
├── android/              # generert av `npx cap add android` (sjekkes inn)
├── ios/                  # generert av `npx cap add ios` (SPM, ingen Pods)
├── store-metadata/       # butikktekster (norsk, utkast) + skjermbildeliste
└── owner-checklist.md    # alt som krever eier (kontoer/penger/signering)
```

## Kommandoer

```bash
npm ci                                   # installer avhengigheter
npx cap sync                             # kopier webDir + oppdater plugins
npx capacitor-assets generate --ios --android   # regenerer ikoner/splash
npx cap open android                     # Android Studio (krever SDK)
npx cap open ios                         # Xcode (krever full Xcode)
```

Merk: `typescript` er pinnet til 5.x — Capacitor-CLI-en (8.4.2) kan ikke
parse `capacitor.config.ts` med TypeScript 7 (native-kompilatoren mangler
`ModuleKind`-APIet CLI-en bruker).

## Ikoner og splash

Generert fra eksisterende brand-logo (`public/assets/mmir-icon.svg` og
`mmir-maskable-icon.svg` — navy `#0f172a`, teal `#14b8a6`, hvit M-monogram).
Eier kan bytte: legg nye 1024×1024 `assets/icon-*.png` + 2732×2732
`assets/splash*.png` og kjør `npx capacitor-assets generate --ios --android`.

## Byggstatus på denne maskinen (26.07.2026, ærlig)

| Steg | Status |
|---|---|
| `npx cap add android` + `npx cap sync android` | ✅ rent |
| `npx cap add ios` (SPM) + `npx cap sync ios` | ✅ rent |
| Ikon/splash generert (74 Android + 7 iOS-filer) | ✅ |
| Gradle-build (.aab) | ⛔ Android SDK/JDK mangler lokalt — bruk CI-workflow eller installer SDK (sjekkliste pkt. 3/5) |
| Xcode simulator-build | ⛔ Full Xcode ikke installert (kun CommandLineTools); `xcodebuild` utilgjengelig |
| Butikk-innsending | ⛔ Krever eier-kontoer — bevisst ikke gjort |

CI-workflow for `.aab`-bygg ligger som
`.github/workflows/butikk-android.yml.disabled` (deaktivert pga. billing
containment på Actions, #944 — aktiveres av eier når stoppen er opphevet).
