# EIER-SJEKKLISTE — butikk-apper (task #59)

Alt under krever eier (kontoer, penger eller signering). Ingenting av dette
er gjort av agenten, og ingen hemmeligheter ligger i repoet.

## 1. Kontoer (engangs-oppsett, koster penger)

- [ ] **Google Play Console**: opprett utviklerkonto — $25 engangsavgift.
      https://play.google.com/console/signup
- [ ] **Apple Developer Program**: meld inn — $99/år.
      https://developer.apple.com/programs/enroll/
      (Vurder organisasjonskonto når AS er på plass; personlig konto virker
      også, men org-konto viser firmanavn i butikken.)

## 2. Signering — eier genererer, ALDRI inn i repo

### Android (upload-keystore)

- [ ] Generer keystore lokalt (én gang, ta VARIG backup — mistes den, mistes
      muligheten til å oppdatere appen med samme nøkkel):
      ```
      keytool -genkey -v -keystore supergeni-upload.keystore \
        -alias supergeni -keyalg RSA -keysize 2048 -validity 10000
      ```
- [ ] Aktiver «Play App Signing» i Play Console (Google holder app-nøkkelen,
      keystoren over er kun upload-nøkkel — anbefalt).
- [ ] Legg keystore + passord som GitHub Actions-secrets når workflowen
      aktiveres: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
      `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. ALDRI i repo/kommits.

### iOS (sertifikater + provisjonering)

- [ ] I Apple Developer-portalen: opprett App ID `ai.mmir.supergeni`.
- [ ] Distribution certificate + App Store provisioning profile (Xcode kan
      håndtere dette automatisk med «Automatically manage signing» når du er
      logget inn med utviklerkontoen).

## 3. Byggmiljø (maskinen mangler dette i dag — verifisert 26.07)

- [ ] **Xcode**: full Xcode fra App Store (kun CommandLineTools er installert
      nå — `xcodebuild` virker ikke). Etter installasjon:
      `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`
- [ ] **Android Studio** (eller bare SDK + JDK 21): gir `sdkmanager`,
      plattform-SDK og emulator. Sett `ANDROID_HOME`.
      Alternativ uten lokal SDK: aktiver CI-workflowen (punkt 5).

## 4. Førstegangs bygg og innsending

### Android

- [ ] `cd apps/store-wrapper && npm ci && npx cap sync android`
- [ ] `cd android && ./gradlew bundleRelease` → `.aab` i
      `android/app/build/outputs/bundle/release/`
- [ ] Play Console: opprett app «Supergeni», last opp `.aab` til intern
      testing først, fyll Data safety-skjema (utkast i
      `store-metadata/google-play.md`), innholdsklassifisering, last opp
      grafikk/skjermbilder, send til gjennomgang.

### iOS

- [ ] `cd apps/store-wrapper && npm ci && npx cap sync ios`
- [ ] `npx cap open ios` → velg team under Signing & Capabilities →
      Product → Archive → Distribute App → App Store Connect.
- [ ] App Store Connect: opprett appen, fyll metadata (utkast i
      `store-metadata/app-store.md`), App Privacy-svar, skjermbilder,
      Review-notat (viktig pga. remote-content/4.2 — se app-store.md),
      send til review.

## 5. CI-bygg (valgfritt, i stedet for lokal Android SDK)

- [ ] Workflowen ligger som `.github/workflows/butikk-android.yml.disabled`
      (deaktivert pga. billing containment på Actions, #944).
      Aktivering = gi filen navnet uten `.disabled` — MEN først: bekreft at
      Actions-kostnads-stoppen er opphevet, og legg inn secrets fra punkt 2.
      Workflowen er skrevet for self-hosted runner (null-kost CI).

## 6. Etterpå

- [ ] Bytt ikon hvis ønsket: kildene ligger i `apps/store-wrapper/assets/`
      (generert fra brand-SVG-ene i `public/assets/`). Regenerer alle
      størrelser med:
      `npx capacitor-assets generate --ios --android`
- [ ] Feature graphic 1024×500 for Play (gjenstår — se google-play.md).
- [ ] Vurder bundlet build i stedet for remote-URL hvis Apple avviser på 4.2
      (bytteoppskrift i `store-metadata/app-store.md` og
      `capacitor.config.ts`-kommentaren).
