/* ==========================================================================
   Golfapp - poengberegning i Match

   Reglene, slik de er avtalt:
   - Laveste antall slag på hullet vinner hullet og får 1 poeng.
   - Alle andre får 0.
   - Ved likhet får alle med laveste antall slag 0,5 hver. De øvrige får 0.
     Et hull kan derfor dele ut mer enn ett poeng. Det er bevisst: bare
     utfallet av matchen teller inn i all time-tabellen.
   - Et hull teller først når alle spillerne har fått registrert slag.

   Funksjonene her er rene: de tar tall inn og gir tall ut, uten å røre
   lagring eller grensesnitt. Fase 5 bruker de samme funksjonene.
   ========================================================================== */

(function (global) {
  'use strict';

  function erFerdig(strokes, playerIds) {
    return playerIds.every(function (id) {
      return typeof strokes[id] === 'number' && strokes[id] > 0;
    });
  }

  // Poeng for ett hull.
  function hullPoeng(strokes, playerIds) {
    var ut = {};
    playerIds.forEach(function (id) { ut[id] = 0; });
    if (!erFerdig(strokes, playerIds) || playerIds.length < 2) return ut;

    var lavest = Math.min.apply(null, playerIds.map(function (id) { return strokes[id]; }));
    var vinnere = playerIds.filter(function (id) { return strokes[id] === lavest; });
    var poeng = vinnere.length === 1 ? 1 : 0.5;
    vinnere.forEach(function (id) { ut[id] = poeng; });
    return ut;
  }

  // Poeng per spiller per hull, for hele runden.
  function poengPerHull(hullRader, playerIds) {
    var ut = {};
    hullRader.forEach(function (rad) {
      ut[rad.hole] = hullPoeng(rad.strokes || {}, playerIds);
    });
    return ut;
  }

  function totaler(hullRader, playerIds) {
    var ut = {};
    playerIds.forEach(function (id) { ut[id] = 0; });
    var perHull = poengPerHull(hullRader, playerIds);
    Object.keys(perHull).forEach(function (hull) {
      playerIds.forEach(function (id) { ut[id] += perHull[hull][id] || 0; });
    });
    return ut;
  }

  // Sluttstilling med plassering. Spillere som står likt deler plassering,
  // og neste plassering hopper over de delte, som i vanlig resultatliste.
  function stilling(hullRader, playerIds) {
    var sum = totaler(hullRader, playerIds);
    var rader = playerIds.map(function (id) {
      return { playerId: id, points: sum[id] };
    }).sort(function (a, b) { return b.points - a.points; });

    var plass = 0;
    var forrigePoeng = null;
    rader.forEach(function (rad, i) {
      if (forrigePoeng === null || rad.points !== forrigePoeng) plass = i + 1;
      rad.place = plass;
      forrigePoeng = rad.points;
    });

    rader.forEach(function (rad) {
      rad.shared = rader.filter(function (r) { return r.place === rad.place; }).length > 1;
    });
    return rader;
  }

  // Hvor mange hull er ferdig registrert.
  function ferdigeHull(hullRader, playerIds) {
    return hullRader.filter(function (rad) {
      return erFerdig(rad.strokes || {}, playerIds);
    }).length;
  }

  // Kort tekst om hvem som vant hullet, til visning rett etter registrering.
  function hullTekst(strokes, playerIds, navnFor) {
    if (!erFerdig(strokes, playerIds)) return null;
    var lavest = Math.min.apply(null, playerIds.map(function (id) { return strokes[id]; }));
    var vinnere = playerIds.filter(function (id) { return strokes[id] === lavest; });
    var navn = vinnere.map(navnFor);
    if (vinnere.length === playerIds.length) {
      return 'Alle delte hullet på ' + lavest + ' slag';
    }
    if (vinnere.length === 1) {
      return navn[0] + ' vant hullet på ' + lavest + ' slag';
    }
    return 'Delt hull mellom ' + navn.slice(0, -1).join(', ') + ' og ' +
           navn[navn.length - 1] + ' på ' + lavest + ' slag';
  }

  // Poeng til all time-tabellen for én ferdigspilt runde.
  // 'skalerende': poeng = antall spillere du slår, halvt for hver du deler med.
  // 'fast': 3 for seier, deretter 2, 1, 0 nedover, tilpasset antall spillere.
  function allTimePoeng(rader, modell) {
    var n = rader.length;
    var ut = {};
    rader.forEach(function (rad) {
      if (modell === 'fast') {
        var faste = n === 2 ? [3, 0] : n === 3 ? [3, 1, 0] : [3, 2, 1, 0];
        // Deler man plassering, deles poengsummen for plassene man deler på.
        var delte = rader.filter(function (r) { return r.place === rad.place; });
        var sum = 0;
        for (var i = 0; i < delte.length; i++) {
          sum += faste[rad.place - 1 + i] !== undefined ? faste[rad.place - 1 + i] : 0;
        }
        ut[rad.playerId] = sum / delte.length;
      } else {
        var slaatt = rader.filter(function (r) { return r.points < rad.points; }).length;
        var delt = rader.filter(function (r) {
          return r.points === rad.points && r.playerId !== rad.playerId;
        }).length;
        ut[rad.playerId] = slaatt + delt * 0.5;
      }
    });
    return ut;
  }

  global.GolfMatch = {
    erFerdig: erFerdig,
    hullPoeng: hullPoeng,
    poengPerHull: poengPerHull,
    totaler: totaler,
    stilling: stilling,
    ferdigeHull: ferdigeHull,
    hullTekst: hullTekst,
    allTimePoeng: allTimePoeng
  };
})(window);
