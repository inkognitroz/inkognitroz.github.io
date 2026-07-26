# Apple App Store — butikkoppføring (utkast, norsk)

> Status: UTKAST til eier-godkjenning. Bygget på den godkjente lanseringsteksten:
> «KI-en som viser kvitteringen» — beviselig riktig der fasit finnes, ærlig ellers.

## Navn (maks 30 tegn)

Supergeni – KI med kvittering

*(29 tegn)*

## Undertittel (maks 30 tegn)

Etterprøvbare svar med kilder

*(29 tegn)*

## Kampanjetekst (maks 170 tegn, kan endres uten ny innsending)

KI-en som viser kvitteringen: der det finnes fasit henter Supergeni svaret
fra ekte kilder — og er ærlig når det ikke gjør det.

## Beskrivelse

Supergeni er KI-en som viser kvitteringen.

De fleste KI-assistenter ber deg stole på dem. Supergeni gjør det motsatte:
der det finnes en fasit — værdata, valutakurser, styringsrente, helligdager,
enhetskonvertering og mer — henter Supergeni svaret fra ekte kilder og viser
deg hvor det kommer fra.

Og der det ikke finnes noen fasit? Da er Supergeni ærlig om det. Ingen
oppdiktede kilder, ingen skråsikkerhet uten dekning.

SLIK VIRKER DET
• Still spørsmålet ditt på norsk (eller et annet språk).
• Supergeni ruter det til riktig verktøy eller modell: live-data der fasit
  finnes, sterke språkmodeller ellers.
• Svar med kildehenvisning der det er mulig — etterprøvbart, ikke bare
  overbevisende.

HVA DU FÅR
• Etterprøvbare svar fra ekte kilder på faktarutene.
• Ærlighet som prinsipp når svaret ikke kan verifiseres.
• Norsk først: bygget og kvalitetsmålt på norsk.
• Flere modeller i samspill — Supergeni velger for deg.

Appen krever nettilkobling for å hente ferske, etterprøvbare svar.
Personvern: https://mmir.ai/personvern/

## Nøkkelord (maks 100 tegn, kommaseparert)

KI,AI,assistent,chat,norsk,kilder,faktasjekk,vær,valuta,svar

*(59 tegn — rom for flere etter eiers vurdering)*

## Kategori

Primær: Produktivitet
Sekundær: Verktøy

## Aldersgrense

4+ (forventet; bekreftes i skjema)

## App Privacy («privacy nutrition labels» — utkast til svar)

- «Data Linked to You»: ingen (ingen konto i v1 — VERIFISER mot faktisk drift)
- «Data Not Linked to You»: chat-tekst (spørsmål) behandles av api.mmir.ai
  for å produsere svar; PII-maskering finnes i api-laget før tredjeparts
  modellkall.
- Sporing («Tracking»): nei — ingen annonse-SDK, ingen tredjeparts sporing.
- Full erklæring: https://mmir.ai/personvern/
- Eier MÅ verifisere disse svarene mot faktisk drift før innsending.

## Viktig for App Review (Guideline 4.2 – Minimum Functionality)

Appen laster live-PWA-en fra https://mmir.ai (remote content). For å redusere
avvisningsrisiko bør Review-notatet fremheve reell app-verdi:
- offline-shell og feilside (lokal fallback),
- statusbar/splash-integrasjon via Capacitor,
- snarveier og installert opplevelse utover Safari.
Hvis Apple likevel avviser på 4.2: bytt til bundlet build (kopier `public/`
inn i `www/` og fjern `server.url` i `capacitor.config.ts`) og send inn på
nytt. Arkitekturen støtter begge uten andre kodeendringer.

## Review-notater (utkast)

«Supergeni er en norsk KI-assistent. Appen krever ingen konto. Test-spørsmål
som demonstrerer kjernefunksjonen: 'Hva er været i Oslo?' (live-kilde),
'Hva er 100 EUR i NOK?' (live valutakurs). Svar viser kildehenvisning der
fasit finnes.»
