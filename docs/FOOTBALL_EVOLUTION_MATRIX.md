# Football Evolution Matrix

## Hva appen er
Football Evolution Matrix er den første praktiske appen i MMIR. Den er en statisk, GitHub Pages-kompatibel matrise for å sammenligne fotballutvikling på tvers av perioder, kategorier, indikatorer og datakvalitet.

## Hvordan komme i gang
1. Velg en mal (Spillerutvikling, Kampanalyse, Scouting eller Historisk sammenligning), eller behold standarddatasettet.
2. Fyll inn metadata (tittel, eier, versjon, notater).
3. Velg seksjon (Oversikt, Perioder, Datadefinisjoner, Matrise, Langdata, Kilder) og rediger tabellen.
4. Klikk **Lagre lokalt**.

## Hvordan redigere lokalt
1. Åpne `public/apps/football-evolution-matrix/index.html` i nettleseren.
2. Klikk i en celle og skriv direkte i tabellen.
3. Bruk **Legg til rad** eller **Legg til kolonne** ved behov.
4. Hvis en seksjon er tom, vises en tydelig tom-tilstand med neste steg.

## Hvordan lagre lokalt
- Klikk **Lagre lokalt** for å lagre appdata i nettleserens `localStorage`.
- Data lagres kun lokalt på enheten/nettleseren du bruker.

## Hvordan eksportere og importere JSON
- **Eksporter JSON** laster ned hele datasettet som en JSON-fil.
- **Importer JSON** validerer seksjonsnavn, obligatoriske kolonner og radlengder før import.
- Import ber om bekreftelse og oppretter backup som kan gjenopprettes med **Gjenopprett backup**.

## Hvordan eksportere CSV
- **Eksporter CSV** eksporterer den aktive seksjonen som CSV.
- Bytt seksjon først hvis du vil eksportere en annen tabell.

## Hvordan eksportere pakke (lanseringsklar backup)
- **Eksporter pakke** laster ned:
  - JSON (hele datasettet),
  - CSV-bundle (alle seksjoner),
  - utskriftsvennlig HTML for print/PDF.

## Veien videre mot SaaS
I en senere versjon kan appen utvides til en ekte SaaS-løsning med Supabase-lagring, brukerinnlogging, delte arbeidsområder og revisjonshistorikk. v1 holder alt statisk, sikkert og uten backend.
