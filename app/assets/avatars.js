/* ==========================================================================
   Golfmatch 2 - avatarer (UI-REDESIGN)

   Tolv dyreavatarer tegnet på nytt i samme stil som appikonet og temaene.
   Id-ene, navnene og rekkefølgen er de samme som før, så spillere som
   allerede har valgt et dyr, får den nye tegningen av samme dyr.

   Stil
   - Bakgrunnen er et lite Links-landskap: himmel, sanddyne og gress, som i
     ikonet. Flatene har klassene av-himmel, av-sand og av-gress, slik at
     Klubbhus-temaet gir dem kveldsfarger i redesign.css.
   - Flate, runde former. Én skygge og ett lys per dyr, laget med
     halvgjennomsiktige flater. Ingen gradienter, fordi gradienter trenger
     id-er, og id-er kolliderer når samme avatar står flere ganger på en side.
   - Felles øyne: mørk teal-sort pupill med lysprikk øverst til høyre.
   - Nebb og tenner i samme gule som flagget i ikonet.
   - Silhuettene skiller seg fra hverandre også på 28 px, så fargen aldri er
     eneste kjennetegn.

   Tegningene lages med avatar-kilde/dyr.py og bygges hit med avatar-kilde/bygg.py.

   Brukes slik:
     GolfAvatars.list                 -> [{ id, name, article, svg }, ...]
     GolfAvatars.get('rev')           -> ett objekt
     GolfAvatars.render('rev', 56)    -> HTML-streng med riktig størrelse
   ========================================================================== */

(function (global) {
  'use strict';

  function svg(label, body) {
    return (
      '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" ' +
      'role="img" aria-label="' + label + '" focusable="false">' + body + '</svg>'
    );
  }

  var AVATARS = [
    {
      id: "orn",
      name: "Ørna",
      article: "Ørn",
      note: "To under par",
      svg: svg("Ørn",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M20 96 C20 80 32 71 48 71 C64 71 76 80 76 96 Z\" fill=\"#6b4a32\"/><path d=\"M48 71 C64 71 76 80 76 96 H58 C60 85 56 76 48 71 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M48 14 C65 14 77 28 77 45 C77 61 68 72 56 77 L40 77 C28 72 19 61 19 45 C19 28 31 14 48 14 Z\" fill=\"#fffdf7\"/><path d=\"M60 17 C71 22 77 32 77 45 C77 61 68 72 56 77 L53 77 C63 69 68 58 68 45 C68 33 65 24 60 17 Z\" fill=\"rgba(16,35,26,0.07)\"/><path d=\"M24 41 C29 37.5 36 37.5 42 40.5 L41.5 44.5 C36 42 30 42 25 44 Z\" fill=\"#5a4a3c\"/><path d=\"M72 41 C67 37.5 60 37.5 54 40.5 L54.5 44.5 C60 42 66 42 71 44 Z\" fill=\"#5a4a3c\"/><circle cx=\"34\" cy=\"50\" r=\"6.4\" fill=\"#ffcf4a\"/><circle cx=\"34\" cy=\"50.5\" r=\"3.5\" fill=\"#10231a\"/><circle cx=\"35.26\" cy=\"49.17\" r=\"1.19\" fill=\"#ffffff\"/><circle cx=\"62\" cy=\"50\" r=\"6.4\" fill=\"#ffcf4a\"/><circle cx=\"62\" cy=\"50.5\" r=\"3.5\" fill=\"#10231a\"/><circle cx=\"63.26\" cy=\"49.17\" r=\"1.19\" fill=\"#ffffff\"/><path d=\"M39 56 C41 54 55 54 57 56 C58 64 56 72 51 77 C49 79 46 79 45 76 C47 76 48 74 47 72 C42 68 39 62 39 56 Z\" fill=\"#ffcf4a\"/><path d=\"M57 56 C58 64 56 72 51 77 C49 79 46 79 45 76 C47 76 48 74 49 71 C53 67 55 61 55 55.5 Z\" fill=\"#e8a820\"/>")
    },
    {
      id: "albatross",
      name: "Albatrossen",
      article: "Albatross",
      note: "Tre under par",
      svg: svg("Albatross",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M8 96 C10 78 26 68 48 68 C70 68 86 78 88 96 Z\" fill=\"#8a9aa6\"/><path d=\"M48 68 C70 68 86 78 88 96 H62 C62 84 57 74 48 68 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M48 18 C64 18 75 30 75 45 C75 60 64 72 48 72 C32 72 21 60 21 45 C21 30 32 18 48 18 Z\" fill=\"#fffdf7\"/><path d=\"M59 21 C69 26 75 35 75 45 C75 60 64 72 48 72 C58 66 65 57 65 45 C65 35 63 27 59 21 Z\" fill=\"rgba(16,35,26,0.07)\"/><path d=\"M26 42 C30 36 39 36 43 41 C39 40 31 40 26 42 Z\" fill=\"#7f8b94\"/><path d=\"M70 42 C66 36 57 36 53 41 C57 40 65 40 70 42 Z\" fill=\"#7f8b94\"/><circle cx=\"35.5\" cy=\"45.5\" r=\"3.9\" fill=\"#10231a\"/><circle cx=\"36.90\" cy=\"44.02\" r=\"1.33\" fill=\"#ffffff\"/><circle cx=\"60.5\" cy=\"45.5\" r=\"3.9\" fill=\"#10231a\"/><circle cx=\"61.90\" cy=\"44.02\" r=\"1.33\" fill=\"#ffffff\"/><path d=\"M40 52 C42 50 54 50 56 52 C57 58 56 64 53 68 C51 70 47 70 45 68 C42 64 39 58 40 52 Z\" fill=\"#f6d9a8\"/><path d=\"M56 52 C57 58 56 64 53 68 C52 69 51 69.6 50 69.8 C52 64 53 58 52.5 51 Z\" fill=\"#e7bd7e\"/><path d=\"M45 68 C47 71 51 71 53 68 C53 72 51 75 49 75 C47.5 75 46 73 45 68 Z\" fill=\"#e79a86\"/><path d=\"M43.5 54 C44 59 45.5 63 47.5 66\" stroke=\"#d6a868\" stroke-width=\"1.4\" fill=\"none\" stroke-linecap=\"round\"/>")
    },
    {
      id: "ugle",
      name: "Ugla",
      article: "Ugle",
      note: "Ser linjen alle andre bommer på",
      svg: svg("Ugle",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M16 96 C16 76 30 66 48 66 C66 66 80 76 80 96 Z\" fill=\"#8a6446\"/><path d=\"M34 96 C34 82 40 72 48 70 C56 72 62 82 62 96 Z\" fill=\"#d9b77e\"/><path d=\"M40 82 l3 3 l3-3 M50 82 l3 3 l3-3 M44 90 l3 3 l3-3\" stroke=\"#a88352\" stroke-width=\"1.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M20 34 L24 12 L38 26 Z\" fill=\"#7a5a41\"/><path d=\"M76 34 L72 12 L58 26 Z\" fill=\"#7a5a41\"/><path d=\"M48 20 C66 20 78 32 78 48 C78 62 66 72 48 72 C30 72 18 62 18 48 C18 32 30 20 48 20 Z\" fill=\"#9a7250\"/><path d=\"M64 25 C73 31 78 39 78 48 C78 62 66 72 48 72 C62 66 70 56 70 46 C70 38 68 31 64 25 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"35\" cy=\"47\" r=\"12.5\" fill=\"#f3e3c3\"/><circle cx=\"61\" cy=\"47\" r=\"12.5\" fill=\"#f3e3c3\"/><circle cx=\"35\" cy=\"47\" r=\"7.6\" fill=\"#ffcf4a\"/><circle cx=\"35\" cy=\"47.5\" r=\"4.6\" fill=\"#10231a\"/><circle cx=\"36.66\" cy=\"45.75\" r=\"1.56\" fill=\"#ffffff\"/><circle cx=\"61\" cy=\"47\" r=\"7.6\" fill=\"#ffcf4a\"/><circle cx=\"61\" cy=\"47.5\" r=\"4.6\" fill=\"#10231a\"/><circle cx=\"62.66\" cy=\"45.75\" r=\"1.56\" fill=\"#ffffff\"/><path d=\"M44 54 H52 L48 63 Z\" fill=\"#e8a820\"/>")
    },
    {
      id: "kondor",
      name: "Kondoren",
      article: "Kondor",
      note: "Fire under par",
      svg: svg("Kondor",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M12 96 C14 80 28 70 48 70 C68 70 82 80 84 96 Z\" fill=\"#2c302e\"/><path d=\"M48 70 C68 70 82 80 84 96 H62 C62 85 57 76 48 70 Z\" fill=\"rgba(0,0,0,0.25)\"/><path d=\"M20 80 C24 68 35 63 48 63 C61 63 72 68 76 80 C70 76 62 74 48 74 C34 74 26 76 20 80 Z\" fill=\"#fffdf7\"/><path d=\"M24 76 C29 70 37 67 48 67 C59 67 67 70 72 76 C64 72.5 57 71.5 48 71.5 C39 71.5 32 72.5 24 76 Z\" fill=\"rgba(16,35,26,0.08)\"/><path d=\"M48 24 C61 24 70 33 70 45 C70 56 62 66 48 66 C34 66 26 56 26 45 C26 33 35 24 48 24 Z\" fill=\"#cf9682\"/><path d=\"M58 27 C66 31 70 38 70 45 C70 56 62 66 48 66 C57 60 62 53 62 45 C62 37 61 31 58 27 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M38 27 C38 18 43 12 48 12 C53 12 58 18 58 27 C55 23 52 22 48 22 C44 22 41 23 38 27 Z\" fill=\"#a85f55\"/><path d=\"M48 12 C53 12 58 18 58 27 C56 24.5 54 23.2 52 22.6 C52.5 18 51 14.5 48 12 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"38.5\" cy=\"42\" r=\"3.8\" fill=\"#10231a\"/><circle cx=\"39.87\" cy=\"40.56\" r=\"1.29\" fill=\"#ffffff\"/><circle cx=\"57.5\" cy=\"42\" r=\"3.8\" fill=\"#10231a\"/><circle cx=\"58.87\" cy=\"40.56\" r=\"1.29\" fill=\"#ffffff\"/><path d=\"M42 49 C44 47 52 47 54 49 C55 56 53 62 49 66 C47 68 44 68 44 65 C46 65 46 63 45.5 61 C43 58 42 54 42 49 Z\" fill=\"#ece2c8\"/><path d=\"M54 49 C55 56 53 62 49 66 C47 68 44 68 44 65 C46 65 46 63 47 60 C50 57 51 53 51 48.5 Z\" fill=\"#cdbd98\"/>")
    },
    {
      id: "rev",
      name: "Reven",
      article: "Rev",
      note: "Lur i ruffen",
      svg: svg("Rev",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M20 96 C20 81 32 73 48 73 C64 73 76 81 76 96 Z\" fill=\"#e0692a\"/><path d=\"M37 96 C37 85 42 77 48 75 C54 77 59 85 59 96 Z\" fill=\"#fffdf7\"/><path d=\"M18 46 L22 13 L45 31 Z\" fill=\"#e0692a\"/><path d=\"M78 46 L74 13 L51 31 Z\" fill=\"#e0692a\"/><path d=\"M24 40 L26.5 22 L39 32.5 Z\" fill=\"#5b2a1c\"/><path d=\"M72 40 L69.5 22 L57 32.5 Z\" fill=\"#5b2a1c\"/><path d=\"M48 25 C65 25 77 37 77 51 C77 66 63 77 48 77 C33 77 19 66 19 51 C19 37 31 25 48 25 Z\" fill=\"#f07b34\"/><path d=\"M65 30 C73 36 77 43 77 51 C77 66 63 77 48 77 C59 71 67 62 67 50 C67 42 66 35 65 30 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M48 45 C39 52 31 57 23 57 C27 69 36 77 48 77 C60 77 69 69 73 57 C65 57 57 52 48 45 Z\" fill=\"#fffdf7\"/><circle cx=\"36.5\" cy=\"48\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"38.08\" cy=\"46.33\" r=\"1.50\" fill=\"#ffffff\"/><circle cx=\"59.5\" cy=\"48\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"61.08\" cy=\"46.33\" r=\"1.50\" fill=\"#ffffff\"/><ellipse cx=\"48\" cy=\"63.5\" rx=\"5.8\" ry=\"4.3\" fill=\"#10231a\"/><circle cx=\"46.3\" cy=\"62.2\" r=\"1.3\" fill=\"rgba(255,255,255,0.6)\"/><path d=\"M44.5 70.5 C46.5 72.5 49.5 72.5 51.5 70.5\" stroke=\"#10231a\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/>")
    },
    {
      id: "grevling",
      name: "Grevlingen",
      article: "Grevling",
      note: "Graver seg ut av bunkeren",
      svg: svg("Grevling",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M18 96 C18 80 31 72 48 72 C65 72 78 80 78 96 Z\" fill=\"#6f7479\"/><path d=\"M48 72 C65 72 78 80 78 96 H60 C61 85 56 76 48 72 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"24\" cy=\"31\" r=\"8.5\" fill=\"#3a3f45\"/><circle cx=\"72\" cy=\"31\" r=\"8.5\" fill=\"#3a3f45\"/><circle cx=\"24\" cy=\"31\" r=\"4\" fill=\"#b9bec4\"/><circle cx=\"72\" cy=\"31\" r=\"4\" fill=\"#b9bec4\"/><path d=\"M48 22 C65 22 77 36 77 53 C77 70 63 81 48 81 C33 81 19 70 19 53 C19 36 31 22 48 22 Z\" fill=\"#fffdf7\"/><path d=\"M35 24 C29 37 28 54 33 69 L42 66 C39 53 40 38 44 23.5 Z\" fill=\"#2f3439\"/><path d=\"M61 24 C67 37 68 54 63 69 L54 66 C57 53 56 38 52 23.5 Z\" fill=\"#2f3439\"/><path d=\"M66 29 C73 36 77 44 77 53 C77 70 63 81 48 81 C60 74 68 64 68 52 C68 43 67 35 66 29 Z\" fill=\"rgba(16,35,26,0.07)\"/><circle cx=\"37.5\" cy=\"50\" r=\"4.6\" fill=\"#fffdf7\"/><circle cx=\"58.5\" cy=\"50\" r=\"4.6\" fill=\"#fffdf7\"/><circle cx=\"37.5\" cy=\"50.3\" r=\"3.4\" fill=\"#10231a\"/><circle cx=\"38.72\" cy=\"49.01\" r=\"1.16\" fill=\"#ffffff\"/><circle cx=\"58.5\" cy=\"50.3\" r=\"3.4\" fill=\"#10231a\"/><circle cx=\"59.72\" cy=\"49.01\" r=\"1.16\" fill=\"#ffffff\"/><ellipse cx=\"48\" cy=\"70\" rx=\"6.2\" ry=\"4.6\" fill=\"#2f3439\"/><circle cx=\"46.2\" cy=\"68.6\" r=\"1.3\" fill=\"rgba(255,255,255,0.55)\"/>")
    },
    {
      id: "elg",
      name: "Elgen",
      article: "Elg",
      note: "Eier fairwayen",
      svg: svg("Elg",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M22 96 C22 83 33 77 48 77 C63 77 74 83 74 96 Z\" fill=\"#5c4230\"/><path d=\"M37 31 C27 31 15 27 10 17 C13 15 16 15 19 17 C18 12 21 9 25 10 C25 14 27 16 29 17 C29 12 32 9 36 10 C35 15 36 19 38 22 C39 18 42 16 45 17 C43 21 42 26 43 30 Z\" fill=\"#dcbd85\"/><path d=\"M59 31 C69 31 81 27 86 17 C83 15 80 15 77 17 C78 12 75 9 71 10 C71 14 69 16 67 17 C67 12 64 9 60 10 C61 15 60 19 58 22 C57 18 54 16 51 17 C53 21 54 26 53 30 Z\" fill=\"#dcbd85\"/><path d=\"M59 31 C69 31 81 27 86 17 C82 24 72 28 60 28 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M37 31 C27 31 15 27 10 17 C14 24 24 28 36 28 Z\" fill=\"rgba(16,35,26,0.14)\"/><ellipse cx=\"23\" cy=\"43\" rx=\"10\" ry=\"5.8\" transform=\"rotate(-22 23 43)\" fill=\"#7a5a41\"/><ellipse cx=\"73\" cy=\"43\" rx=\"10\" ry=\"5.8\" transform=\"rotate(22 73 43)\" fill=\"#7a5a41\"/><path d=\"M48 25 C60 25 68 34 68 46 L66 61 C64 77 58 87 48 87 C38 87 32 77 30 61 L28 46 C28 34 36 25 48 25 Z\" fill=\"#8a6446\"/><path d=\"M58 28 C64 32 68 38 68 46 L66 61 C64 77 58 87 48 87 C55 79 58 67 58 55 Z\" fill=\"rgba(16,35,26,0.14)\"/><ellipse cx=\"48\" cy=\"72\" rx=\"14\" ry=\"12.5\" fill=\"#b08a64\"/><ellipse cx=\"43\" cy=\"71\" rx=\"2.6\" ry=\"3.4\" fill=\"#10231a\"/><ellipse cx=\"53\" cy=\"71\" rx=\"2.6\" ry=\"3.4\" fill=\"#10231a\"/><circle cx=\"39\" cy=\"47.5\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"40.58\" cy=\"45.83\" r=\"1.50\" fill=\"#ffffff\"/><circle cx=\"57\" cy=\"47.5\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"58.58\" cy=\"45.83\" r=\"1.50\" fill=\"#ffffff\"/>")
    },
    {
      id: "hare",
      name: "Haren",
      article: "Hare",
      note: "Raskest rundt",
      svg: svg("Hare",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M20 96 C20 81 32 73 48 73 C64 73 76 81 76 96 Z\" fill=\"#a8927a\"/><path d=\"M48 73 C64 73 76 81 76 96 H58 C59 85 55 77 48 73 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M31 36 C24 26 22 10 27 5 C33 1 40 14 41 32 Z\" fill=\"#b8a189\"/><path d=\"M32 31 C28 23 27 13 29.5 10 C33 8 37 18 37.5 30 Z\" fill=\"#f2c9bd\"/><path d=\"M65 36 C72 26 74 10 69 5 C63 1 56 14 55 32 Z\" fill=\"#b8a189\"/><path d=\"M64 31 C68 23 69 13 66.5 10 C63 8 59 18 58.5 30 Z\" fill=\"#f2c9bd\"/><path d=\"M48 28 C63 28 73 40 73 54 C73 68 62 78 48 78 C34 78 23 68 23 54 C23 40 33 28 48 28 Z\" fill=\"#c2ab92\"/><path d=\"M62 33 C69 39 73 46 73 54 C73 68 62 78 48 78 C58 72 64 63 64 53 C64 45 63 38 62 33 Z\" fill=\"rgba(16,35,26,0.14)\"/><ellipse cx=\"48\" cy=\"66\" rx=\"12\" ry=\"9.5\" fill=\"#fffdf7\"/><circle cx=\"38\" cy=\"51\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"39.58\" cy=\"49.33\" r=\"1.50\" fill=\"#ffffff\"/><circle cx=\"58\" cy=\"51\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"59.58\" cy=\"49.33\" r=\"1.50\" fill=\"#ffffff\"/><path d=\"M44.5 60 H51.5 L48 64 Z\" fill=\"#d9828a\"/><path d=\"M48 64 V67 M44.5 69 C46 70.5 47 70 48 67 C49 70 50 70.5 51.5 69\" stroke=\"#10231a\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\"/>")
    },
    {
      id: "pinnsvin",
      name: "Pinnsvinet",
      article: "Pinnsvin",
      note: "Trives i ruffen",
      svg: svg("Pinnsvin",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M14 96 C14 80 28 72 48 72 C68 72 82 80 82 96 Z\" fill=\"#7a5a41\"/><path d=\"M48 22 C67 22 80 35 80 52 C80 60 78 66 74 70 L22 70 C18 66 16 60 16 52 C16 35 29 22 48 22 Z\" fill=\"#8a6446\"/><path d=\"M23.9 63.7 L11.2 63.5 L22.2 57.1 Z\" fill=\"#6b4a32\"/><path d=\"M22.2 57.1 L10.0 53.7 L22.3 50.4 Z\" fill=\"#6b4a32\"/><path d=\"M22.3 50.4 L11.4 43.9 L24.0 43.9 Z\" fill=\"#6b4a32\"/><path d=\"M24.0 43.9 L15.2 34.8 L27.5 38.1 Z\" fill=\"#6b4a32\"/><path d=\"M27.5 38.1 L21.3 27.0 L32.2 33.3 Z\" fill=\"#6b4a32\"/><path d=\"M32.3 33.3 L29.1 21.0 L38.1 30.0 Z\" fill=\"#6b4a32\"/><path d=\"M38.1 30.0 L38.2 17.3 L44.6 28.2 Z\" fill=\"#6b4a32\"/><path d=\"M44.6 28.2 L48.0 16.0 L51.4 28.2 Z\" fill=\"#6b4a32\"/><path d=\"M51.4 28.2 L57.8 17.3 L57.9 30.0 Z\" fill=\"#6b4a32\"/><path d=\"M57.9 30.0 L66.9 21.0 L63.7 33.3 Z\" fill=\"#6b4a32\"/><path d=\"M63.8 33.3 L74.7 27.0 L68.5 38.1 Z\" fill=\"#6b4a32\"/><path d=\"M68.5 38.1 L80.8 34.8 L72.0 43.9 Z\" fill=\"#6b4a32\"/><path d=\"M72.0 43.9 L84.6 43.9 L73.7 50.4 Z\" fill=\"#6b4a32\"/><path d=\"M73.7 50.4 L86.0 53.7 L73.8 57.1 Z\" fill=\"#6b4a32\"/><path d=\"M73.8 57.1 L84.8 63.5 L72.1 63.7 Z\" fill=\"#6b4a32\"/><path d=\"M66 28 C75 34 80 42 80 52 C80 60 78 66 74 70 L66 70 C70 64 72 58 72 51 C72 42 70 34 66 28 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M48 36 C61 36 69 46 69 57 C69 68 60 78 48 78 C36 78 27 68 27 57 C27 46 35 36 48 36 Z\" fill=\"#f3e3c3\"/><path d=\"M60 40 C66 44 69 50 69 57 C69 68 60 78 48 78 C56 72 61 65 61 56 C61 50 61 45 60 40 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"39.5\" cy=\"54\" r=\"3.8\" fill=\"#10231a\"/><circle cx=\"40.87\" cy=\"52.56\" r=\"1.29\" fill=\"#ffffff\"/><circle cx=\"56.5\" cy=\"54\" r=\"3.8\" fill=\"#10231a\"/><circle cx=\"57.87\" cy=\"52.56\" r=\"1.29\" fill=\"#ffffff\"/><ellipse cx=\"48\" cy=\"66\" rx=\"5.6\" ry=\"4.4\" fill=\"#10231a\"/><circle cx=\"46.4\" cy=\"64.7\" r=\"1.3\" fill=\"rgba(255,255,255,0.6)\"/><ellipse cx=\"33\" cy=\"62\" rx=\"3.6\" ry=\"2.2\" fill=\"rgba(232,110,100,0.30)\"/><ellipse cx=\"63\" cy=\"62\" rx=\"3.6\" ry=\"2.2\" fill=\"rgba(232,110,100,0.30)\"/>")
    },
    {
      id: "slange",
      name: "Slangen",
      article: "Slange",
      note: "Den lange putten som går inn",
      svg: svg("Slange",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M10 96 C10 82 26 76 48 76 C70 76 86 82 86 96 Z\" fill=\"#3f9a5c\"/><path d=\"M20 90 C24 84 36 82 48 82 C60 82 72 84 76 90\" stroke=\"#2e7a47\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M40 80 C38 70 40 62 44 56 L54 56 C58 62 60 70 58 80 Z\" fill=\"#4caf6a\"/><path d=\"M48 26 C64 26 74 36 74 47 C74 58 63 64 48 64 C33 64 22 58 22 47 C22 36 32 26 48 26 Z\" fill=\"#4caf6a\"/><path d=\"M63 29 C70 33 74 40 74 47 C74 58 63 64 48 64 C58 60 65 54 65 46 C65 39 64 33 63 29 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M44 58 C44 66 44 74 46 80 H52 C54 74 54 66 54 58 Z\" fill=\"#dcebb0\"/><circle cx=\"36\" cy=\"33\" r=\"3\" fill=\"#2e7a47\"/><circle cx=\"48\" cy=\"30\" r=\"3\" fill=\"#2e7a47\"/><circle cx=\"60\" cy=\"33\" r=\"3\" fill=\"#2e7a47\"/><circle cx=\"34\" cy=\"44\" r=\"7\" fill=\"#fffdf7\"/><circle cx=\"62\" cy=\"44\" r=\"7\" fill=\"#fffdf7\"/><circle cx=\"34.8\" cy=\"44.6\" r=\"4.2\" fill=\"#10231a\"/><circle cx=\"36.31\" cy=\"43.00\" r=\"1.43\" fill=\"#ffffff\"/><circle cx=\"61.2\" cy=\"44.6\" r=\"4.2\" fill=\"#10231a\"/><circle cx=\"62.71\" cy=\"43.00\" r=\"1.43\" fill=\"#ffffff\"/><path d=\"M36 55 C42 59 54 59 60 55\" stroke=\"#10231a\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M48 58 V67 M48 67 L45 70 M48 67 L51 70\" stroke=\"#e0544a\" stroke-width=\"2\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>")
    },
    {
      id: "rotte",
      name: "Rotta",
      article: "Rotte",
      note: "Finner ballen din i krattet",
      svg: svg("Rotte",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M20 96 C20 81 32 73 48 73 C64 73 76 81 76 96 Z\" fill=\"#8c9197\"/><path d=\"M48 73 C64 73 76 81 76 96 H58 C59 85 55 77 48 73 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"24\" cy=\"30\" r=\"13\" fill=\"#9ea3a9\"/><circle cx=\"24\" cy=\"30\" r=\"8\" fill=\"#f0bcb4\"/><circle cx=\"72\" cy=\"30\" r=\"13\" fill=\"#9ea3a9\"/><circle cx=\"72\" cy=\"30\" r=\"8\" fill=\"#f0bcb4\"/><path d=\"M48 26 C63 26 72 37 72 50 C72 62 60 76 48 82 C36 76 24 62 24 50 C24 37 33 26 48 26 Z\" fill=\"#aeb3b8\"/><path d=\"M62 30 C68 36 72 43 72 50 C72 62 60 76 48 82 C56 74 63 62 63 50 C63 42 63 35 62 30 Z\" fill=\"rgba(16,35,26,0.14)\"/><path d=\"M48 58 C55 58 60 64 58 72 C56 77 52 80 48 82 C44 80 40 77 38 72 C36 64 41 58 48 58 Z\" fill=\"#dfe2e5\"/><circle cx=\"39\" cy=\"48\" r=\"4\" fill=\"#10231a\"/><circle cx=\"40.44\" cy=\"46.48\" r=\"1.36\" fill=\"#ffffff\"/><circle cx=\"57\" cy=\"48\" r=\"4\" fill=\"#10231a\"/><circle cx=\"58.44\" cy=\"46.48\" r=\"1.36\" fill=\"#ffffff\"/><ellipse cx=\"48\" cy=\"75\" rx=\"4.4\" ry=\"3.4\" fill=\"#e39a9a\"/><path d=\"M40 70 L28 67 M40 73 L28 74 M56 70 L68 67 M56 73 L68 74\" stroke=\"#6f757b\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>")
    },
    {
      id: "bever",
      name: "Beveren",
      article: "Bever",
      note: "Bygger demning i vannhinderet",
      svg: svg("Bever",
        "<rect class=\"av-himmel\" width=\"96\" height=\"96\" fill=\"#d3e8f1\"/><path class=\"av-sand\" d=\"M0 60 C 20 54, 40 57, 56 61 S 84 56, 96 59 V96 H0Z\" fill=\"#f1e2bd\"/><path class=\"av-gress\" d=\"M0 72 C 24 66, 48 68, 66 71 S 88 68, 96 70 V96 H0Z\" fill=\"#8fd0a0\"/><path d=\"M18 96 C18 80 31 72 48 72 C65 72 78 80 78 96 Z\" fill=\"#6b4a32\"/><path d=\"M48 72 C65 72 78 80 78 96 H60 C61 85 56 76 48 72 Z\" fill=\"rgba(16,35,26,0.14)\"/><circle cx=\"24\" cy=\"32\" r=\"8\" fill=\"#5c3f2a\"/><circle cx=\"72\" cy=\"32\" r=\"8\" fill=\"#5c3f2a\"/><circle cx=\"24\" cy=\"32\" r=\"3.8\" fill=\"#a07a58\"/><circle cx=\"72\" cy=\"32\" r=\"3.8\" fill=\"#a07a58\"/><path d=\"M48 24 C65 24 77 37 77 53 C77 69 64 80 48 80 C32 80 19 69 19 53 C19 37 31 24 48 24 Z\" fill=\"#8a5f3e\"/><path d=\"M65 29 C73 36 77 44 77 53 C77 69 64 80 48 80 C60 73 68 64 68 52 C68 43 67 35 65 29 Z\" fill=\"rgba(16,35,26,0.14)\"/><ellipse cx=\"48\" cy=\"65\" rx=\"16\" ry=\"12\" fill=\"#b58c66\"/><ellipse cx=\"48\" cy=\"59\" rx=\"5.4\" ry=\"3.9\" fill=\"#10231a\"/><circle cx=\"46.4\" cy=\"57.9\" r=\"1.2\" fill=\"rgba(255,255,255,0.6)\"/><rect x=\"43.4\" y=\"66\" width=\"4.4\" height=\"10\" rx=\"1.4\" fill=\"#ffcf4a\"/><rect x=\"48.2\" y=\"66\" width=\"4.4\" height=\"10\" rx=\"1.4\" fill=\"#ffcf4a\"/><path d=\"M48 66 V76\" stroke=\"#e8a820\" stroke-width=\"0.8\"/><circle cx=\"36.5\" cy=\"46.5\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"38.08\" cy=\"44.83\" r=\"1.50\" fill=\"#ffffff\"/><circle cx=\"59.5\" cy=\"46.5\" r=\"4.4\" fill=\"#10231a\"/><circle cx=\"61.08\" cy=\"44.83\" r=\"1.50\" fill=\"#ffffff\"/>")
    }
  ];

  var SIZES = { xs: 32, sm: 40, md: 56, lg: 88, xl: 112 };

  var byId = {};
  for (var i = 0; i < AVATARS.length; i++) byId[AVATARS[i].id] = AVATARS[i];

  function get(id) { return byId[id] || null; }

  function render(id, size) {
    var a = get(id);
    if (!a) return '';
    var px = typeof size === 'number' ? size : (SIZES[size] || SIZES.md);
    return '<span class="avatar" style="width:' + px + 'px;height:' + px + 'px">' +
           a.svg + '</span>';
  }

  global.GolfAvatars = {
    list: AVATARS,
    sizes: SIZES,
    get: get,
    render: render
  };
})(typeof window !== 'undefined' ? window : this);
