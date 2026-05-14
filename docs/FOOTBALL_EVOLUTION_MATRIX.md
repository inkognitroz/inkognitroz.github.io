# Football Evolution Matrix

## Hva appen er
Football Evolution Matrix er den første praktiske appen i SaaS Fabric. Den er en statisk, GitHub Pages-kompatibel matrise for å sammenligne fotballutvikling på tvers av perioder, kategorier, indikatorer og datakvalitet.

## Hvordan redigere lokalt
1. Åpne `public/apps/football-evolution-matrix/index.html` i nettleseren.
2. Velg seksjon (Oversikt, Perioder, Datadefinisjoner, Matrise, Langdata, Kilder).
3. Klikk i en celle og skriv direkte i tabellen.
4. Bruk **Legg til rad** eller **Legg til kolonne** ved behov.

## Hvordan lagre lokalt
- Klikk **Lagre lokalt** for å lagre appdata i nettleserens `localStorage`.
- Data lagres kun lokalt på enheten/nettleseren du bruker.

## Hvordan eksportere og importere JSON
- **Eksporter JSON** laster ned hele datasettet som en JSON-fil.
- **Importer JSON** leser en tidligere eksportert JSON-fil og laster den inn i appen.

## Hvordan eksportere CSV
- **Eksporter CSV** eksporterer den aktive seksjonen som CSV.
- Bytt seksjon først hvis du vil eksportere en annen tabell.

## Veien videre mot SaaS
I en senere versjon kan appen utvides til en ekte SaaS-løsning med Supabase-lagring, brukerinnlogging, delte arbeidsområder og revisjonshistorikk. v1 holder alt statisk, sikkert og uten backend.
