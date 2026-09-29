/* ==========================================================================
   Golfapp - statistikk

   Alt regnes ut fra rundene ved visning. Ingen totaler lagres, så en rettet
   eller slettet runde slår rett gjennom overalt.

   Bare fullførte runder teller. Avbrutte runder blir liggende i historikken,
   men holdes utenfor alle tall her.

   hullKart er et oppslag fra runde-id til listen med hullrader for runden.
   ========================================================================== */

(function (global) {
  'use strict';

  // En runde teller når den er fullført og minst ett hull er ferdig
  // registrert. En match må ha minst to spillere for å kunne ha en vinner.
  function fullforte(runder) {
    return runder.filter(function (r) {
      if (r.status !== 'fullfort') return false;
      if (!(r.holesPlayed > 0)) return false;
      if (r.mode === 'match' && (!r.playerIds || r.playerIds.length < 2)) return false;
      return true;
    });
  }

  /* Beste runde og snitt gir bare mening mellom runder med like mange hull.
     Vi sammenligner derfor runder på 18 hull hvis det finnes noen, ellers
     runder på 9. Runder som er kortet ned til et annet antall hull telles
     med i antall runder, men ikke i beste og snitt. */
  function sammenlignbare(liste, hullFor) {
    var har18 = liste.some(function (x) { return hullFor(x) === 18; });
    var har9 = liste.some(function (x) { return hullFor(x) === 9; });
    var hull = har18 ? 18 : har9 ? 9 : null;
    if (hull === null) {
      // Ingen hele runder. Bruk det vanligste antallet hull.
      var telling = {};
      liste.forEach(function (x) { telling[hullFor(x)] = (telling[hullFor(x)] || 0) + 1; });
      Object.keys(telling).forEach(function (k) {
        if (hull === null || telling[k] > telling[hull]) hull = Number(k);
      });
    }
    return {
      hull: hull,
      liste: liste.filter(function (x) { return hullFor(x) === hull; })
    };
  }

  function snittAv(tall) {
    return tall.length ? tall.reduce(function (a, b) { return a + b; }, 0) / tall.length : null;
  }

  function aarFor(runde) {
    return new Date(runde.startedAt).getFullYear();
  }

  function aarene(runder) {
    var sett = {};
    fullforte(runder).forEach(function (r) { sett[aarFor(r)] = true; });
    return Object.keys(sett).map(Number).sort(function (a, b) { return b - a; });
  }

  function filtrer(runder, filter) {
    filter = filter || {};
    return fullforte(runder).filter(function (r) {
      if (filter.modus && r.mode !== filter.modus) return false;
      if (filter.aar && aarFor(r) !== filter.aar) return false;
      if (filter.baneId && r.courseId !== filter.baneId) return false;
      // Oppsett: bare runder der akkurat disse spillerne var med.
      if (filter.oppsett && nokkel(r.playerIds) !== filter.oppsett) return false;
      return true;
    });
  }

  function lagFor(runde) {
    return runde.teams && runde.teams.length
      ? runde.teams
      : [{ name: 'Laget', playerIds: runde.playerIds.slice() }];
  }

  /* ---- Oppsett: hvem som faktisk spilte sammen ------------------------
     Gjengen er ikke den samme hver gang. Et «oppsett» er det eksakte settet
     spillere som var med, uavhengig av rekkefølge. Kim og Ola er samme
     oppsett som Ola og Kim, men et annet oppsett enn Kim, Ola og Per.
     -------------------------------------------------------------------- */

  function nokkel(ids) {
    return ids.slice().sort().join('|');
  }

  function navnListe(ids, navnFor) {
    return ids.map(navnFor).sort(function (a, b) {
      return a.localeCompare(b, 'nb');
    }).join(' + ');
  }

  // Alle oppsett som har spilt match, med antall runder og hvem som leder.
  function matchOppsett(runder, hullKart, modell) {
    var acc = {};
    runder.forEach(function (r) {
      if (r.mode !== 'match') return;
      var k = nokkel(r.playerIds);
      if (!acc[k]) {
        acc[k] = { key: k, playerIds: r.playerIds.slice().sort(), runder: 0, poeng: {} };
      }
      acc[k].runder += 1;
      var stilling = GolfMatch.stilling(hullKart[r.id] || [], r.playerIds);
      var poeng = GolfMatch.allTimePoeng(stilling, modell);
      Object.keys(poeng).forEach(function (id) {
        acc[k].poeng[id] = (acc[k].poeng[id] || 0) + poeng[id];
      });
    });

    return Object.keys(acc).map(function (k) {
      var o = acc[k];
      var leder = null;
      Object.keys(o.poeng).forEach(function (id) {
        if (!leder || o.poeng[id] > leder.poeng) leder = { playerId: id, poeng: o.poeng[id] };
      });
      // Deler flere førsteplassen, er det ingen entydig leder.
      if (leder) {
        var delt = Object.keys(o.poeng).filter(function (id) {
          return o.poeng[id] === leder.poeng;
        });
        leder.delt = delt.length > 1;
        leder.delteMed = delt;
      }
      o.leder = leder;
      return o;
    }).sort(function (a, b) {
      if (b.runder !== a.runder) return b.runder - a.runder;
      return a.playerIds.length - b.playerIds.length;
    });
  }

  /* ---- Scramble: hvem som var på lag sammen ---------------------------- */

  function lagIRunde(runde, hullKart, baneKart) {
    var hull = hullKart[runde.id] || [];
    var lag = lagFor(runde);
    var bane = baneKart && runde.courseId ? baneKart[runde.courseId] : null;
    var ferdige = GolfScramble.ferdigeHull(hull, lag.length);
    return lag.map(function (l, i) {
      return {
        runde: runde, lagIndex: i, navn: l.name,
        playerIds: l.playerIds.slice(),
        key: nokkel(l.playerIds),
        hull: ferdige,
        total: GolfScramble.total(hull, i, lag.length),
        motPar: GolfScramble.motPar(hull, i, bane && bane.pars, lag.length)
      };
    }).filter(function (x) { return x.hull > 0; });
  }

  // Alle lagsammensetninger som har spilt scramble.
  function scrambleLag(runder, hullKart, baneKart) {
    var acc = {};
    runder.forEach(function (r) {
      if (r.mode !== 'scramble') return;
      lagIRunde(r, hullKart, baneKart).forEach(function (x) {
        if (!acc[x.key]) {
          acc[x.key] = {
            key: x.key, playerIds: x.playerIds.slice().sort(),
            runder: 0, rader: []
          };
        }
        acc[x.key].runder += 1;
        acc[x.key].rader.push(x);
      });
    });

    return Object.keys(acc).map(function (k) {
      var o = acc[k];
      var sml = sammenlignbare(o.rader, function (x) { return x.hull; });
      var totaler = sml.liste.map(function (x) { return x.total; });
      var motPar = sml.liste.map(function (x) { return x.motPar; })
        .filter(function (v) { return v !== null; });
      o.hullISnitt = sml.hull;
      o.beste = totaler.length ? Math.min.apply(null, totaler) : null;
      o.snitt = snittAv(totaler);
      o.motParSnitt = snittAv(motPar);
      delete o.rader;
      return o;
    }).sort(function (a, b) {
      if (b.runder !== a.runder) return b.runder - a.runder;
      return a.snitt - b.snitt;
    });
  }

  // Alt om ett bestemt lag: rundene deres, og hva hver spiller bidro med
  // i nettopp dette laget.
  function lagDetalj(key, runder, hullKart, baneKart) {
    var rader = [];
    var perSpiller = {};

    function spiller(id) {
      if (!perSpiller[id]) {
        perSpiller[id] = { playerId: id, hull: 0, utslag: 0, soloBirdie: 0, soloEagle: 0, hio: 0 };
      }
      return perSpiller[id];
    }

    runder.forEach(function (r) {
      if (r.mode !== 'scramble') return;
      lagIRunde(r, hullKart, baneKart).forEach(function (x) {
        if (x.key !== key) return;
        rader.push(x);

        var hull = hullKart[r.id] || [];
        hull.forEach(function (h) {
          var d = GolfScramble.lagData(h, x.lagIndex);
          if (!d) return;
          if (d.driveBy) spiller(d.driveBy).utslag += 1;
          if (d.mark && d.solo) {
            var s = spiller(d.solo);
            if (d.mark === 'birdie') s.soloBirdie += 1;
            else if (d.mark === 'eagle') s.soloEagle += 1;
            else if (d.mark === 'hio') s.hio += 1;
          }
        });
        x.playerIds.forEach(function (id) { spiller(id).hull += x.hull; });
      });
    });

    var sml = sammenlignbare(rader, function (x) { return x.hull; });
    var totaler = sml.liste.map(function (x) { return x.total; });
    var motPar = sml.liste.map(function (x) { return x.motPar; })
      .filter(function (v) { return v !== null; });

    return {
      key: key,
      playerIds: rader.length ? rader[0].playerIds.slice().sort() : [],
      rader: rader.sort(function (a, b) { return b.runde.startedAt - a.runde.startedAt; }),
      runder: rader.length,
      hullISnitt: sml.hull,
      beste: totaler.length ? Math.min.apply(null, totaler) : null,
      snitt: snittAv(totaler),
      motParSnitt: snittAv(motPar),
      spillere: Object.keys(perSpiller).map(function (id) {
        var s = perSpiller[id];
        s.utslagAndel = s.hull ? s.utslag / s.hull : 0;
        return s;
      }).sort(function (a, b) { return b.utslag - a.utslag; })
    };
  }

  /* ---- Match: all time-tabellen -------------------------------------- */

  function matchTabell(runder, hullKart, modell) {
    var acc = {};

    function rad(id) {
      if (!acc[id]) {
        acc[id] = { playerId: id, runder: 0, plasseringer: [0, 0, 0, 0], poeng: 0 };
      }
      return acc[id];
    }

    runder.forEach(function (r) {
      if (r.mode !== 'match') return;
      var hull = hullKart[r.id] || [];
      var stilling = GolfMatch.stilling(hull, r.playerIds);
      var poeng = GolfMatch.allTimePoeng(stilling, modell);
      stilling.forEach(function (s) {
        var rd = rad(s.playerId);
        rd.runder += 1;
        if (s.place >= 1 && s.place <= 4) rd.plasseringer[s.place - 1] += 1;
        rd.poeng += poeng[s.playerId] || 0;
      });
    });

    return Object.keys(acc).map(function (id) {
      var rd = acc[id];
      rd.poengPerRunde = rd.runder ? rd.poeng / rd.runder : 0;
      return rd;
    }).sort(function (a, b) {
      if (b.poeng !== a.poeng) return b.poeng - a.poeng;
      if (b.plasseringer[0] !== a.plasseringer[0]) return b.plasseringer[0] - a.plasseringer[0];
      return b.runder - a.runder;
    });
  }

  /* ---- Scramble: per spiller ----------------------------------------- */

  function scrambleSpillere(runder, hullKart) {
    var acc = {};

    function rad(id) {
      if (!acc[id]) {
        acc[id] = {
          playerId: id, runder: 0, hull: 0, utslag: 0,
          soloBirdie: 0, soloEagle: 0, hio: 0
        };
      }
      return acc[id];
    }

    runder.forEach(function (r) {
      if (r.mode !== 'scramble') return;
      var hull = hullKart[r.id] || [];
      var lag = lagFor(r);
      var utslag = GolfScramble.utslagTelling(hull, lag.length);
      var merker = GolfScramble.merkeTelling(hull, lag.length);
      var ferdige = GolfScramble.ferdigeHull(hull, lag.length);

      r.playerIds.forEach(function (pid) {
        var rd = rad(pid);
        rd.runder += 1;
        rd.hull += ferdige;
        rd.utslag += utslag[pid] || 0;
        var s = merker.solo[pid];
        if (s) {
          rd.soloBirdie += s.birdie || 0;
          rd.soloEagle += s.eagle || 0;
          rd.hio += s.hio || 0;
        }
      });
    });

    return Object.keys(acc).map(function (id) {
      var rd = acc[id];
      rd.utslagAndel = rd.hull ? rd.utslag / rd.hull : 0;
      return rd;
    }).sort(function (a, b) {
      if (b.utslag !== a.utslag) return b.utslag - a.utslag;
      return b.runder - a.runder;
    });
  }

  /* ---- Scramble: rundekort ------------------------------------------- */

  function scrambleRunder(runder, hullKart, sortering) {
    var kort = runder.filter(function (r) { return r.mode === 'scramble'; })
      .map(function (r) {
        var hull = hullKart[r.id] || [];
        var lag = lagFor(r);
        var bane = global.GolfStore && r.courseId ? GolfStore.course(r.courseId) : null;
        var totaler = lag.map(function (l, i) {
          return {
            navn: l.name,
            total: GolfScramble.total(hull, i, lag.length),
            motPar: GolfScramble.motPar(hull, i, bane && bane.pars, lag.length)
          };
        });
        var best = null;
        totaler.forEach(function (t) { if (best === null || t.total < best.total) best = t; });
        return {
          runde: r, lag: lag, totaler: totaler,
          beste: best ? best.total : 0,
          besteMotPar: best ? best.motPar : null,
          hull: GolfScramble.ferdigeHull(hull, lag.length)
        };
      });

    if (sortering === 'score') {
      // Flest hull først, slik at en 9-hullsrunde aldri havner foran en
      // 18-hullsrunde bare fordi den har færre slag.
      kort.sort(function (a, b) {
        if (a.hull !== b.hull) return b.hull - a.hull;
        if (a.beste !== b.beste) return a.beste - b.beste;
        return b.runde.startedAt - a.runde.startedAt;
      });
    } else {
      kort.sort(function (a, b) { return b.runde.startedAt - a.runde.startedAt; });
    }
    return kort;
  }

  /* ---- Baner ---------------------------------------------------------- */

  function baneOversikt(runder, baner) {
    var acc = {};
    runder.forEach(function (r) {
      if (!r.courseId) return;
      if (!acc[r.courseId]) {
        acc[r.courseId] = { courseId: r.courseId, navn: r.courseName, match: 0, scramble: 0 };
      }
      acc[r.courseId][r.mode] += 1;
    });
    // Ta med navnet fra banebiblioteket hvis banen er gitt nytt navn senere.
    (baner || []).forEach(function (b) {
      if (acc[b.id]) acc[b.id].navn = b.name;
    });
    return Object.keys(acc).map(function (id) { return acc[id]; })
      .sort(function (a, b) {
        return (b.match + b.scramble) - (a.match + a.scramble);
      });
  }

  // Alt om én bane. Snitt per hull er det mest interessante i scramble:
  // det viser hvilke hull som faktisk koster dere slag.
  function baneDetalj(bane, runder, hullKart) {
    var scramble = runder.filter(function (r) {
      return r.mode === 'scramble' && r.courseId === bane.id;
    });
    var match = runder.filter(function (r) {
      return r.mode === 'match' && r.courseId === bane.id;
    });

    /* --- scramble --- */
    var lagRunder = [];      // én rad per lag per runde
    scramble.forEach(function (r) {
      var hull = hullKart[r.id] || [];
      var lag = lagFor(r);
      lag.forEach(function (l, i) {
        var ferdige = GolfScramble.ferdigeHull(hull, lag.length);
        if (!ferdige) return;
        lagRunder.push({
          runde: r, lagNavn: l.name, hull: ferdige,
          total: GolfScramble.total(hull, i, lag.length),
          motPar: GolfScramble.motPar(hull, i, bane.pars, lag.length)
        });
      });
    });

    var sml = sammenlignbare(lagRunder, function (lr) { return lr.hull; });
    var beste = null;
    sml.liste.forEach(function (lr) {
      if (beste === null || lr.total < beste.total) beste = lr;
    });
    var snitt = snittAv(sml.liste.map(function (lr) { return lr.total; }));

    // Snitt per hull, over alle lag i alle scramble-runder på banen.
    var perHull = [];
    var antallHull = bane.holes || 18;
    for (var h = 1; h <= antallHull; h++) {
      var verdier = [];
      scramble.forEach(function (r) {
        var hull = hullKart[r.id] || [];
        var lag = lagFor(r);
        // På en 9-hullsbane som er spilt to ganger er hull 10 samme hull som 1.
        for (var i = 0; i < hull.length; i++) {
          var nr = hull[i].hole;
          if (nr !== h && !(antallHull === 9 && nr - 9 === h)) continue;
          for (var t = 0; t < lag.length; t++) {
            var s = GolfScramble.slagPaaHull(hull[i], t);
            if (s !== null) verdier.push(s);
          }
        }
      });
      var par = GolfStore.parFor(bane.pars, h);
      var sn = verdier.length
        ? verdier.reduce(function (a, b) { return a + b; }, 0) / verdier.length
        : null;
      perHull.push({
        hole: h, par: par, snitt: sn, antall: verdier.length,
        motPar: sn !== null && par !== null ? sn - par : null
      });
    }

    /* --- match --- */
    var vinnere = {};
    match.forEach(function (r) {
      var hull = hullKart[r.id] || [];
      var stilling = GolfMatch.stilling(hull, r.playerIds);
      stilling.filter(function (s) { return s.place === 1; }).forEach(function (s) {
        vinnere[s.playerId] = (vinnere[s.playerId] || 0) + 1;
      });
    });
    var vinnerliste = Object.keys(vinnere).map(function (id) {
      return { playerId: id, seire: vinnere[id] };
    }).sort(function (a, b) { return b.seire - a.seire; });

    return {
      bane: bane,
      scrambleRunder: scramble.length,
      lagRunder: lagRunder.length,
      hullISnitt: sml.hull,
      beste: beste,
      snitt: snitt,
      perHull: perHull,
      matchRunder: match.length,
      matchVinnere: vinnerliste
    };
  }

  global.GolfStats = {
    fullforte: fullforte,
    aarFor: aarFor,
    aarene: aarene,
    filtrer: filtrer,
    lagFor: lagFor,
    nokkel: nokkel,
    navnListe: navnListe,
    matchOppsett: matchOppsett,
    scrambleLag: scrambleLag,
    lagIRunde: lagIRunde,
    lagDetalj: lagDetalj,
    matchTabell: matchTabell,
    scrambleSpillere: scrambleSpillere,
    scrambleRunder: scrambleRunder,
    baneOversikt: baneOversikt,
    baneDetalj: baneDetalj
  };
})(window);
