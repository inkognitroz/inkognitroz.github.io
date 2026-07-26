# Google Play — butikkoppføring (utkast, norsk)

> Status: UTKAST til eier-godkjenning. Bygget på den godkjente lanseringsteksten:
> «KI-en som viser kvitteringen» — beviselig riktig der fasit finnes, ærlig ellers.

## Tittel (maks 30 tegn)

Supergeni – KI med kvittering

*(29 tegn. Alternativ: «Supergeni» alene, 9 tegn.)*

## Kort beskrivelse (maks 80 tegn)

KI-en som viser kvitteringen: etterprøvbare svar med kilder der fasit finnes.

*(78 tegn)*

## Lang beskrivelse (maks 4000 tegn)

Supergeni er KI-en som viser kvitteringen.

De fleste KI-assistenter ber deg stole på dem. Supergeni gjør det motsatte:
der det finnes en fasit — værdata, valutakurser, styringsrente, helligdager,
enhetskonvertering og mer — henter Supergeni svaret fra ekte kilder og viser
deg hvor det kommer fra. Du får ikke bare et svar, du får kvitteringen.

Og der det ikke finnes noen fasit? Da er Supergeni ærlig om det. Ingen
oppdiktede kilder, ingen skråsikkerhet uten dekning.

SLIK VIRKER DET
• Still spørsmålet ditt på norsk (eller et annet språk).
• Supergeni ruter det til riktig verktøy eller modell: live-data der fasit
  finnes, sterke språkmodeller ellers.
• Svar med kildehenvisning der det er mulig — etterprøvbart, ikke bare
  overbevisende.

HVA DU FÅR
• Etterprøvbare svar: live vær, valutakurser og andre faktaruter hentes fra
  ekte kilder, ikke fra modellens hukommelse.
• Ærlighet som prinsipp: når svaret ikke kan verifiseres, sier appen det.
• Norsk først: bygget og kvalitetsmålt på norsk.
• Flere modeller i samspill: Supergeni velger og kombinerer modeller for deg —
  du trenger ikke velge selv.

PERSONVERN
Supergeni er bygget i Norge med personvern som utgangspunkt. Spørsmålene dine
behandles for å gi deg svar — ikke for å bygge annonseprofiler. Se full
personvernerklæring: https://mmir.ai/personvern/

Appen krever nettilkobling for å hente ferske, etterprøvbare svar.

## Kategori

Primær: Produktivitet
(Alternativ: Verktøy)

## Tagger/nøkkelord (internt)

KI, AI, assistent, chat, norsk, kilder, faktasjekk, vær, valuta

## Innholdsklassifisering (IARC-skjema — eiers svar)

- Ingen brukergenerert delt innhold offentlig
- Ingen kjøp i app (v1)
- Ingen pengespill, vold, seksuelt innhold
- Forventet: PEGI 3 / Everyone (bekreftes i skjema)

## Data safety-seksjonen (Googles skjema — utkast til svar)

- Data som samles inn: chat-tekst (spørsmål) sendes til api.mmir.ai for å
  produsere svar. PII-håndtering finnes i api-laget (maskering før
  tredjeparts modellkall).
- Data som deles: spørsmålstekst kan rutes til tredjeparts modell-leverandører
  som underleverandører for å generere svar (dokumentert i
  personvernerklæringen).
- Kryptering under transport: ja (HTTPS/TLS overalt).
- Sletting: se personvernerklæringen på https://mmir.ai/personvern/
- Eier MÅ verifisere disse svarene mot faktisk drift før innsending.

## Grafiske krav (må produseres før innsending)

- App-ikon: 512×512 PNG (32-bit, generert — se `assets/icon-only.png`,
  nedskaleres av Play fra opplastet 512)
- Feature graphic: 1024×500 PNG/JPG (GJENSTÅR — lag fra brand: navy #0f172a,
  monogram + «KI-en som viser kvitteringen»)
- Skjermbilder: minst 2, anbefalt 4–8 per formfaktor — se `skjermbilder.md`
