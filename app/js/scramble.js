/* ==========================================================================
   Golfapp - beregninger i Scramble

   I scramble spiller laget én ball. Vi registrerer derfor per lag:
     - antall slag på hullet
     - hvem sitt utslag laget brukte
     - om hullet ga birdie, eagle eller hole in one
     - om det var en solo, altså at én spiller sto for det alene

   Funksjonene her er rene: tall inn, tall ut. Statistikken bruker de samme.
   ========================================================================== */

(function (global) {
  'use strict';

  var MERKER = [
    { id: 'birdie', navn: 'Birdie', underPar: 1 },
    { id: 'eagle',  navn: 'Eagle',  underPar: 2 },
    { id: 'hio',    navn: 'Hole in one', underPar: null }
  ];

  function lagData(rad, lagIndex) {
    if (!rad || !rad.teams) return null;
    return rad.teams[lagIndex] || null;
  }

  function slagPaaHull(rad, lagIndex) {
    var d = lagData(rad, lagIndex);
    return d && typeof d.strokes === 'number' && d.strokes > 0 ? d.strokes : null;
  }

  // Et hull teller først når alle lagene har registrert slag.
  function hullFerdig(rad, antallLag) {
    for (var i = 0; i < antallLag; i++) {
      if (slagPaaHull(rad, i) === null) return false;
    }
    return true;
  }

  function ferdigeHull(hullRader, antallLag) {
    return hullRader.filter(function (rad) { return hullFerdig(rad, antallLag); }).length;
  }

  function parFor(pars, hull) {
    return global.GolfStore ? GolfStore.parFor(pars, hull) : (pars && pars[hull - 1]) || null;
  }

  // Totalen teller bare hull der alle lagene har levert slag. Ellers ville
  // laget som ligger ett hull bak se ut som det leder.
  function total(hullRader, lagIndex, antallLag) {
    return hullRader.reduce(function (sum, rad) {
      if (antallLag && !hullFerdig(rad, antallLag)) return sum;
      var s = slagPaaHull(rad, lagIndex);
      return sum + (s || 0);
    }, 0);
  }

  // Mot par regnes bare på hull som har par, og bare på hull som teller i
  // totalen. Da stemmer det midt i runden, og når en 9-hullsbane spilles
  // to ganger.
  function motPar(hullRader, lagIndex, pars, antallLag) {
    if (!pars) return null;
    var slag = 0;
    var parSum = 0;
    var noen = false;
    hullRader.forEach(function (rad) {
      if (antallLag && !hullFerdig(rad, antallLag)) return;
      var s = slagPaaHull(rad, lagIndex);
      var p = parFor(pars, rad.hole);
      if (s === null || typeof p !== 'number') return;
      slag += s;
      parSum += p;
      noen = true;
    });
    return noen ? slag - parSum : null;
  }

  // Laveste totalscore vinner. Lag som står likt deler plassering.
  function stilling(hullRader, antallLag) {
    var rader = [];
    for (var i = 0; i < antallLag; i++) {
      rader.push({ teamIndex: i, strokes: total(hullRader, i, antallLag) });
    }
    rader.sort(function (a, b) { return a.strokes - b.strokes; });

    var plass = 0;
    var forrige = null;
    rader.forEach(function (rad, i) {
      if (forrige === null || rad.strokes !== forrige) plass = i + 1;
      rad.place = plass;
      forrige = rad.strokes;
    });
    rader.forEach(function (rad) {
      rad.shared = rader.filter(function (r) { return r.place === rad.place; }).length > 1;
    });
    return rader;
  }

  /* ---- tellinger til statistikken ------------------------------------ */

  // Hvor mange ganger hver spillers utslag ble brukt.
  function utslagTelling(hullRader, antallLag) {
    var ut = {};
    hullRader.forEach(function (rad) {
      for (var i = 0; i < antallLag; i++) {
        var d = lagData(rad, i);
        if (d && d.driveBy) ut[d.driveBy] = (ut[d.driveBy] || 0) + 1;
      }
    });
    return ut;
  }

  // Antall birdie, eagle og hole in one, og hvem som eventuelt tok dem solo.
  function merkeTelling(hullRader, antallLag) {
    var ut = { birdie: 0, eagle: 0, hio: 0, solo: {} };
    hullRader.forEach(function (rad) {
      for (var i = 0; i < antallLag; i++) {
        var d = lagData(rad, i);
        if (!d || !d.mark) continue;
        ut[d.mark] = (ut[d.mark] || 0) + 1;
        if (d.solo) {
          if (!ut.solo[d.solo]) ut.solo[d.solo] = { birdie: 0, eagle: 0, hio: 0 };
          ut.solo[d.solo][d.mark] += 1;
        }
      }
    });
    return ut;
  }

  /* ---- merker ut fra par ----------------------------------------------
     Med par på hullet setter appen merket selv:
       par minus 1 er birdie, par minus 2 (eller bedre) er eagle,
       par eller mer gir ingen merke.
     Ett slag er alltid hole in one. Det settes som standard, men kan tas
     bort, og da faller hullet tilbake på merket par gir.
     -------------------------------------------------------------------- */

  function merkeFraPar(slag, par) {
    if (typeof slag !== 'number' || typeof par !== 'number') return null;
    if (slag === par - 1) return 'birdie';
    if (slag <= par - 2) return 'eagle';
    return null;
  }

  // Merket et hull får når slagene registreres eller endres.
  // Uten par beholdes et manuelt valgt birdie eller eagle.
  function merkeForSlag(slag, par, forrigeMerke) {
    if (typeof slag !== 'number') return null;
    if (slag === 1) return 'hio';
    if (typeof par === 'number') return merkeFraPar(slag, par);
    return forrigeMerke === 'birdie' || forrigeMerke === 'eagle' ? forrigeMerke : null;
  }

  // Beholdt for bakoverkompatibilitet.
  function foreslaaMerke(slag, par) {
    return merkeForSlag(slag, par, null);
  }

  function merkeNavn(id) {
    for (var i = 0; i < MERKER.length; i++) {
      if (MERKER[i].id === id) return MERKER[i].navn;
    }
    return null;
  }

  function motParTekst(diff) {
    if (diff === null || diff === undefined) return null;
    if (diff === 0) return 'Par';
    return (diff > 0 ? '+' : '') + diff;
  }

  global.GolfScramble = {
    MERKER: MERKER,
    lagData: lagData,
    slagPaaHull: slagPaaHull,
    hullFerdig: hullFerdig,
    ferdigeHull: ferdigeHull,
    total: total,
    motPar: motPar,
    stilling: stilling,
    utslagTelling: utslagTelling,
    merkeTelling: merkeTelling,
    foreslaaMerke: foreslaaMerke,
    merkeFraPar: merkeFraPar,
    merkeForSlag: merkeForSlag,
    merkeNavn: merkeNavn,
    motParTekst: motParTekst
  };
})(window);
