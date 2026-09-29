# Golfmatch 2 – UI-redesign av Golfapp (testrevisjon)

Dette er en testrevisjon av utseendet i Golfapp. I denne versjonen heter appen
**Golfmatch 2** og har nytt ikon. Den ligger i sin egen mappe,
`Golfapp-UI-redesign`, ved siden av `Golfapp`. Ingen filer i `Golfapp` er
endret eller overskrevet.

Mappen er en komplett kopi av appen med nytt utseende. Den kan åpnes og
testes for seg selv.

**Laget:** 29. september 2026

---

## Hvor redesignen ligger

| Fil | Hva som er gjort |
| --- | --- |
| `app/styles/redesign.css` | **Hele det nye utseendet**, med temaene Fairway, Klubbhus og Links, og kveldsfarger bak avatarene i Klubbhus. Ny fil, lastet etter `tokens.css` og `app.css`. Overstyrer bare utseende |
| `index.html` | Navnet Golfmatch 2, lenke til `redesign.css`, nye ikoner i bunnmenyen (SVG) og statuslinjefarge for lys og mørk modus |
| `manifest.webmanifest` | Navnet Golfmatch 2 og farger som passer de nye temaene |
| `icons/` | Nytt appikon i alle fire størrelser. Kildene ligger i `ikon-kilde/` |
| `app/assets/avatars.js` | Alle tolv dyr tegnet på nytt i samme stil som ikonet. Samme id-er og navn. Kildene ligger i `avatar-kilde/` |
| `app/js/backup.js` | Navnet i delingen og i feilmeldingen, og filnavnet `golfmatch2-…json`. Formatet er det samme |
| `app/js/screens-round.js` | Merker rundt slagene i scorekortet og forklaringen under. Valget av utseende i Innstillinger |
| `app/js/app.js` | Setter tema ut fra valget i Innstillinger, og skjuler bunnmenyen mens tastaturet er oppe |
| `app/js/store.js` | Ny innstilling `tema`: `auto`, `lys`, `mork` eller `links`. `auto` er standard |
| `app/js/rapport.js` | Samme merker i rapportbildet til Discord, navnet Golfmatch 2, gult flagg nederst og kveldsfarger bak avatarene. Bare visning |
| `sw.js` | Ny versjon (`golfapp-v8-redesign-7`) og `redesign.css` i listen over filer som lagres for offline bruk |

Alle endringer i eksisterende filer er merket med kommentaren `UI-REDESIGN`.
Søk etter den for å se nøyaktig hva som er lagt til. Ingen regler for
poeng, statistikk eller navigasjon er endret. Den eneste nye funksjonen er
valget av utseende.

Tas lenken til `redesign.css` ut av `index.html`, er appen tilbake til det
gamle utseendet, bortsett fra merkene i scorekortet.

---

## Navn og ikon

**Navnet** er Golfmatch 2 overalt der det vises: på Hjem-skjermen, i
topplinjen på hjemskjermen, i fanen i nettleseren, nederst i rapportbildet og
når en sikkerhetskopi deles. Filnavnene begynner nå med `golfmatch2-`.

Interne navn er ikke endret: databasen heter fortsatt `golfapp`, og
sikkerhetskopiene har samme format som før. Kopier kan derfor flyttes begge
veier mellom Golfapp og Golfmatch 2. Det er testet: en kopi fra Golfapp ble
gjenopprettet i Golfmatch 2, og en kopi fra Golfmatch 2 i Golfapp, med alle
spillere, baner, runder og hull i behold.

**Ikonet** bygger på Links: himmel øverst, sanddyne, teal fairway og en lys
green med hull. Flaggstangen er hvit, og flagget er gult. Det er tre
iterasjoner:

| Iterasjon | Resultat |
| --- | --- |
| 1 | Tre retninger: Links-landskap, teal bakgrunn med sandgreen, og landskap med ball. Landskapet var best, men flagget ble for lite til å leses på Hjem-skjermen |
| 2 | Tykkere flaggstang og større flagg med «2». Teal fairway valgt fremfor naturgrønn, så ikonet henger sammen med appen |
| 3 | «2» fjernet etter Kims godkjenning. Ikonet skiller seg likevel tydelig fra Golfapp, fordi fargene og landskapet er helt andre |

Ikonet er testet i 60 px, som er størrelsen på Hjem-skjermen, mot lys, mørk og
fargerik bakgrunn. Ikonet for Android (maskable) har samme landskap helt ut i
kanten, med flagget krympet inn i den sikre sonen, så ingenting kuttes når
telefonen gir ikonet rund form.

## Avatarer

Alle tolv dyr er tegnet på nytt i samme stil som ikonet og godkjent av Kim.
Id-ene, navnene og rekkefølgen er de samme, så spillere som allerede har valgt
et dyr, får den nye tegningen av samme dyr uten å gjøre noe.

- Hvert dyr står foran et lite Links-landskap med himmel, sanddyne og gress.
- Felles øyne, runde flate former og én skygge per dyr. Nebb og tenner er gule
  som flagget i ikonet.
- I Klubbhus, og i rapportbildet, får landskapet kveldsfarger, så de lyse
  sirklene ikke lyser mot den mørke bakgrunnen.
- Ingen gradienter. De trenger id-er, og id-er kolliderer når samme avatar
  står flere ganger på en side.

Tre godkjenningsrunder før Kim fikk se dem: to bakgrunner prøvd på tre dyr,
deretter alle tolv i tre størrelser og tre temaer, og til slutt rettet
albatross (nebbet), kondor (hodet) og grevling (øynene). Testet i velgeren,
registreringen, seierspallen, resultatet og rapportbildet. Kildene ligger i
`avatar-kilde/`: `dyr.py` tegner dyrene og `bygg.py` lager `avatars.js`.

`Golfapp-designsystem.html` i Golfapp-mappen viser fortsatt de gamle dyrene.

## Bunnmenyen

Bunnmenyen er forankret nederst på skjermen hele tiden. Den ligger fast 10 px
over bunnkanten, pluss telefonens egen sikre sone nederst på iPhone med
hjemlinje, og flytter seg ikke når man ruller. Det er målt øverst, midt i og
nederst på lange og korte skjermer i tre skjermstørrelser. Nederst på lange
sider er det 30 px luft mellom den siste knappen og menyen, så ingenting
skjules bak den.

**Mens man skriver, skjules menyen.** Trykker man i et felt man skriver i, som
slagfeltet, navnet eller banenavnet, glir menyen ned og blir usynlig. Den
kommer tilbake når feltet slippes, for eksempel med «Ferdig» på tastaturet
eller et trykk på en knapp. Da slipper menyen å sveve midt på skjermen når
iPhone ruller fram feltet, og det blir mer plass over tastaturet.

- Flytter man fokus rett fra ett felt til et annet, blir menyen borte hele
  tiden. Den blinker ikke fram mellom feltene.
- Knapper, kort og valg som ikke åpner tastaturet, påvirker ikke menyen.
- Lukkes tastaturet uten at feltet slippes, som med tilbakeknappen på Android,
  merker appen at skjermbildet blir høyt igjen og viser menyen. Fokus og verdien
  i feltet røres ikke.
- Gjelder bare telefoner og nettbrett. På maskin er det ikke noe skjermtastatur.
- Ønsker telefonen mindre bevegelse, forsvinner menyen uten å gli.
- Skjult meny kan ikke trykkes på ved et uhell.

Testet i Chromium som telefon: trykk i slagfelt, bytte mellom slagfelt, «+»,
«Ferdig», navnefeltet, navigering bort med fokus i et felt, spillerkort og
maskin med mus. Slag tastet inn i feltene lagres likt som i originalen. Selve
tastaturet, og tilbakeknappen på Android, kan ikke testes her. Det må prøves på
telefonen.

---

## Designretning

**Liquid glass på navigasjonen.** Topplinjen, bunnmenyen, stillingen under
registrering, dialoger og meldinger er laget som glass som ligger over
innholdet. Bunnmenyen er en svevende kapsel, og valgt fane har en tonet
bakgrunn og fylt ikon, slik som i iOS 26. Innholdet selv står på rolige, tette
flater. Det er samme prinsipp som Apple bruker, og det gjør tall og tekst lett
å lese ute på banen.

**Farger fra golfbanen.** Fairwaygrønn er hovedfarge. Bakgrunnen går fra himmel
øverst til gress nederst. Par-merket er sand, hullet du står på er flaggrødt,
og eagle bruker messing. Spillerfargene er de samme som før, fordi de er
kontrollert for fargeblindhet.

**Tre temaer.** «Fairway» er lyst og grønt. «Klubbhus» er mørkt, skogsgrønt og
med messing. «Links» er lyst, med sand og himmel og glass også på kortene. Ber
telefonen om mindre gjennomsiktighet, blir glasset tett i alle tre.

**Pågående runde** på hjemskjermen er løftet fram som et grønt kort med et
flagg på green i hjørnet.

---

## Velge utseende

Under **Innstillinger → Utseende** er det fire valg, hvert med en liten prøve
av temaet:

| Valg | Virkning |
| --- | --- |
| Automatisk | Fairway når telefonen står på lys, Klubbhus når den står på mørk. Standard |
| Fairway | Alltid lyst og grønt |
| Klubbhus | Alltid mørkt |
| Links | Alltid lyst, med sand og himmel |

Valget tas i bruk med én gang og huskes når appen lukkes. Fargen på
statuslinjen øverst følger med. Valgt tema har ring og hake, så det ikke bare
er fargen som viser hva som er valgt.

Valget lagres i innstillingene i appens database, slik som poengmodellen. Det
blir derfor med i sikkerhetskopien og hentes tilbake ved gjenoppretting.
«Slett all data» setter det tilbake til Automatisk. En kopi av valget ligger
også i nettleserens enkle lager (`localStorage`), slik at riktig tema settes
før databasen er åpnet. Uten den ville skjermen blinket i feil tema et
øyeblikk ved oppstart.

## Links

Links bygger på iterasjon C. Fargene, bakgrunnen med himmel, sand og gress,
det teal-grønne og det gule flagget er beholdt. Endringene er små:

- Kortene er varmere hvite, som papiret i et scorekort, og litt tettere. De
  ble grumsete og gråaktige i første versjon fordi sanden skinte gjennom.
- Felt som «Fyll inn slag …» har en svak sandtone i stedet for grått.
- Svak grå tekst er gjort mørkere. Kontrasten mot kortene er nå 5,6:1, mot
  3,6:1 før. Det flaggrøde og det grønne for under par er gjort litt mørkere
  av samme grunn.
- Tabellrader og faste kolonner er nesten tette, så ingenting skinner gjennom
  navnekolonnen når en tabell rulles sidelengs.
- Vinner og leder er markert med en lys grønn flate som står klart mot sanden.

Links er alltid lyst. Det finnes ingen mørk Links-variant. Temaet definerer
alle fargene selv, så ingenting fra mørk modus lekker inn når telefonen står
på mørk. Det er kontrollert med skjermbilder som er piksel for piksel like
med telefonen på lys og på mørk.

Glass på alle kortene krever litt mer regnekraft enn de andre temaene. Kjennes
det tregt på en eldre iPhone, er Fairway det lette alternativet.

**Testet:** alle fire valgene, valget husket etter omstart, Fairway, Klubbhus
og Links overstyrer telefonens innstilling, Automatisk følger telefonen igjen,
og «Slett all data» nullstiller. Alle 17 skjermene i Links har ingen tekst
utenfor rammene på 390 og 430 px. På 320 px kuttes lange navn i hodet på
scorekortet med «…», som i de andre temaene. Match- og Scramble-testen gir
fortsatt samme resultat som originalen, og appen starter uten nett.

---

## Scorekortet

**«Poeng» går ikke lenger over streken.** Hullkolonnen er gjort bredere, og
etikettene i summeradene brekker bare mellom ord. «Mot par» står derfor på to
linjer på smale telefoner i stedet for å gå inn i par-kolonnen.

**Merker rundt slagene**, slik golfapper og papirkort gjør:

| Resultat på hullet | Merke |
| --- | --- |
| Eagle eller bedre (par minus 2 eller mer) | Dobbel sirkel |
| Birdie (par minus 1) | Sirkel |
| Par | Ingen merke |
| Bogey (par pluss 1) | Firkant |
| Dobbeltbogey eller verre (par pluss 2 eller mer) | Dobbel firkant |

Merkene vises bare når banen har par. Formen bærer betydningen. Fargen, grønn
under par og nøytral over par, er bare en ekstra hjelp. Under scorekortet
står en forklaring. Merkene er også med i rapportbildet.

Dobbel sirkel for eagle, og dobbel firkant også for trippelbogey og verre, er
lagt til fordi det er vanlig skrivemåte. Det kan endres hvis dere vil noe annet.

Navn i hodet på scorekortet får nå to linjer før de kuttes, så
«Ola Nordmann» vises helt på vanlige telefoner.

---

## Slik ble det testet

Appen ble kjørt i Chromium med testdata: fire spillere, tre baner, fullførte
runder i Match og Scramble, en 9-hullsrunde og pågående runder i begge
moduser. Skjermbilder ble tatt av 17 skjermer for hver versjon.

**Tre iterasjoner** ble laget og sammenlignet før forbedringene:

| Iterasjon | Retning | Vurdering |
| --- | --- | --- |
| A «Fairway» | Lys, grønn, glass bare på navigasjonen | Best lesbarhet. Valgt som lys modus |
| B «Klubbhus» | Mørk skogsgrønn med messing | Godt uttrykk og god kontrast. Valgt som mørk modus |
| C «Links» | Sand og himmel, glass også på kortene | Mest stemning, men kortene ble grumsete og kontrasten svakere. Forkastet. Himmelen i bakgrunnen er tatt med videre i A |

Deretter ble A og B forbedret i tre runder, med ny test og nye skjermbilder
hver gang. Det som ble rettet underveis:

- «Poeng» var fortsatt 1 px over streken i første forsøk, og «POENG» brakk
  midt i ordet i et annet. Løst med bredere kolonne og brekk bare mellom ord.
- Flagget i kortet for pågående runde dekket datoen. Gjort mindre.
- Tekst under bunnmenyen var for synlig gjennom glasset. Glasset er gjort
  tettere.
- Lange navn ble kuttet i hodet på scorekortet. Får nå to linjer.

**Tekst innenfor rammene.** Et testskript går gjennom all synlig tekst og sjekker
at den ligger innenfor cellen, knappen eller kortet sitt, at ingen ord brekkes
midt i, og at ingen side er bredere enn skjermen. Resultat for den endelige
versjonen:

| Bredde | Lys | Mørk |
| --- | --- | --- |
| 320 px | 0 feil. Lange navn kuttes med «…» i scorekorthodet | – |
| 360 px | 0 feil | – |
| 390 px | 0 feil | 0 feil |
| 430 px | 0 feil | – |

Originalen hadde sju steder med tekst over streken på 390 px: «Poeng» i fire
scorekort, «Mot par» i to og plasstallet i seierspallen.

**Funksjonen er uendret.** Et skript spilte en hel Match-runde og en hel
Scramble-runde på ni hull gjennom knappene, i både originalen og redesignen.
Lagrede runder, slag, utslag, merker, all time-tabell, lagstatistikk,
resultatskjermer og statistikkskjermen ble sammenlignet. Alt var likt. Den
eneste forskjellen i teksten på skjermen er forklaringen til merkene.

**Offline.** Service workeren lagrer alle 25 filene, også `redesign.css`, og appen
starter med nytt utseende uten nett.

---

## Skjermbilder

Mappen `skjermbilder` har:

- `0-for-redesign`: originalen
- `1-iterasjon-A-fairway`, `2-iterasjon-B-klubbhus`, `3-iterasjon-C-links`: de tre første retningene
- `4-endelig-lys` og `5-endelig-mork`: alle skjermer i den endelige versjonen, med `oversikt.png` øverst
- `7-valg-av-utseende`: valget av utseende i Innstillinger, med Automatisk, Links og Klubbhus valgt
- `8-links`: alle skjermer i Links, og `for-og-etter-forbedring.png` med iterasjon C og Links side om side
- `6-rapportbilde`: rapporten til Discord før og etter
- `9-ikon-og-navn`: ikonet på Hjem-skjermen ved siden av det gamle, med og uten «2», iterasjonene og rapportens bunntekst
- `10-avatarer`: de nye dyrene før og etter, i velgeren og i appen i alle temaer
- `scorekort-for-og-etter.png`: scorekortet i original, lys og mørk

---

## Slik tester du på telefonen

1. Lag et nytt kodelager på GitHub, for eksempel `golfapp-redesign`, og last opp
   **innholdet** i denne mappen på samme måte som i `PUBLISERING.md` i
   Golfapp-mappen. Mappene `skjermbilder`, `test`, `ikon-kilde`, `avatar-kilde` og `forslag-til-godkjenning` trenger ikke være med.
2. Åpne adressen i Safari og legg den til på Hjem-skjermen.

Golfmatch 2 dukker opp med eget navn og ikon, så den er lett å skille fra
Golfapp.

**Data:** lagt på Hjem-skjermen starter Golfmatch 2 uten spillere og runder.
Den skal ikke se dataene i Golfapp, men det er ikke prøvd på iPhone. Vil du
teste med ekte data, ta sikkerhetskopi i Golfapp og gjenopprett den i
Golfmatch 2. Åpnes begge i Safari i stedet for fra Hjem-skjermen, deler de
data, fordi alle kodelagre under samme GitHub-bruker har samme nettadresse
(`brukernavn.github.io`).

Skal redesignen tas i bruk i den vanlige appen, lastes disse filene opp til
det vanlige kodelageret: `index.html`, `sw.js`, `manifest.webmanifest`,
`app/styles/redesign.css`, `app/js/app.js`, `app/js/store.js`,
`app/js/screens-round.js`, `app/js/rapport.js`, `app/js/backup.js`,
`app/assets/avatars.js` og mappen `icons`.

---

## Ikke prøvd ennå

- **Glasset på iPhone.** Uskarpheten bak glasset er testet i Chromium. Safari
  tegner den litt annerledes. Bør sjekkes på telefonen, særlig bunnmenyen.
- **Ytelse.** Glass koster litt regnekraft. Det er derfor bare brukt på
  navigasjonen, ikke på listene. Bør kjennes på en eldre iPhone.
- **Skriften.** Skjermbildene er tatt med en bredere skrift enn iPhone bruker.
  På telefonen blir teksten litt smalere, så det blir mer luft, ikke mindre.

## Forslag som ikke er gjort

- Egen stor tittel øverst på hovedskjermene som krymper inn i topplinjen når
  man ruller, slik som i iOS. Krever litt kode i `app.js`.
- Tomme slagfelt kunne vist en strek i stedet for å stå blanke.
- Designsystemsiden `Golfapp-designsystem.html` er ikke oppdatert med det nye
  utseendet.

## Testskriptene

Mappen `test` har skriptene som ble brukt: `shoot.js` tar skjermbilder og
sjekker tekst, `func.js` spiller runder gjennom knappene, `rapport.js` lager
rapportbildene, `tema.js` tester valget av utseende, `backup-test.js` flytter
sikkerhetskopier mellom Golfapp og Golfmatch 2, `kontrast.py` regner
kontrast, og `seed.js` legger inn testdata. Ikonet lages med skriptene i
`ikon-kilde`. De krever Node og Playwright
og er ikke en del av appen.
