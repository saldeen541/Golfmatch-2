/* ==========================================================================
   Golfapp - Match: registrering hull for hull, scoreboard og resultat
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;
  var Screens = global.Screens;

  /* ======================================================================
     Registrering
     ====================================================================== */

  Screens['match-runde'] = function (nav, params, runde) {
    var wrap = el('div', { class: 'stack' });
    var spillere = runde.playerIds.map(function (id) {
      return GolfStore.player(id) || { id: id, name: 'Ukjent', avatarId: 'rev' };
    });
    var bane = runde.courseId ? GolfStore.course(runde.courseId) : null;

    var hullRader = [];          // alle lagrede hull
    var hullNr = 1;              // hullet vi står på
    var laster = el('p', { class: 'muted', text: 'Henter runden …' });
    wrap.appendChild(laster);

    GolfStore.holes(runde.id).then(function (rader) {
      hullRader = rader;
      hullNr = forsteUferdigeHull();
      laster.remove();
      bygg();
    });

    function rad(hull) {
      for (var i = 0; i < hullRader.length; i++) {
        if (hullRader[i].hole === hull) return hullRader[i];
      }
      return null;
    }

    function slag(hull) {
      var r = rad(hull);
      return r && r.strokes ? r.strokes : {};
    }

    function forsteUferdigeHull() {
      for (var h = 1; h <= runde.holes; h++) {
        if (!GolfMatch.erFerdig(slag(h), runde.playerIds)) return h;
      }
      return runde.holes;
    }

    function par(hull) {
      return GolfStore.parFor(bane && bane.pars, hull);
    }

    function navnFor(id) {
      var p = GolfStore.player(id);
      return p ? p.name : 'Ukjent';
    }

    /* ---- lagring --------------------------------------------------- */

    // Raden i minnet oppdateres før den skrives. Da tar neste endring,
    // som kan komme før lagringen er ferdig, alltid med seg denne.
    function settSlag(hull, playerId, verdi) {
      var s = Object.assign({}, slag(hull));
      if (verdi === null) delete s[playerId];
      else s[playerId] = verdi;
      var ny = GolfStore.holeRow(runde.id, hull, s);
      var fantes = false;
      for (var i = 0; i < hullRader.length; i++) {
        if (hullRader[i].hole === hull) { hullRader[i] = ny; fantes = true; break; }
      }
      if (!fantes) hullRader.push(ny);
      hullRader.sort(function (a, b) { return a.hole - b.hole; });
      runde.holesPlayed = GolfMatch.ferdigeHull(hullRader, runde.playerIds);
      return GolfStore.putHole(ny).then(function () {
        return GolfStore.saveRound(runde);
      });
    }

    /* ---- bygg skjermen --------------------------------------------- */

    var stillingStripe, hullBoks, resultatLinje, navKnapper, avsluttBoks, scoreboardBoks;

    function bygg() {
      stillingStripe = el('div', { class: 'standing' });
      hullBoks = el('section', { class: 'card stack' });
      resultatLinje = el('p', { class: 'hole-result' });
      navKnapper = el('div', { class: 'hole-nav' });
      avsluttBoks = el('div', { class: 'stack' });
      scoreboardBoks = el('section', { class: 'stack' });

      wrap.appendChild(stillingStripe);
      wrap.appendChild(hullBoks);
      wrap.appendChild(resultatLinje);
      wrap.appendChild(navKnapper);
      wrap.appendChild(avsluttBoks);
      wrap.appendChild(scoreboardBoks);

      tegnAlt();
    }

    function tegnAlt() {
      tegnStilling();
      tegnHull();
      tegnNav();
      tegnAvslutt();
      tegnScoreboard();
    }

    // Stillingen ligger alltid øverst, klistret under topplinjen.
    function tegnStilling() {
      UI.clear(stillingStripe);
      var sum = GolfMatch.totaler(hullRader, runde.playerIds);
      var best = Math.max.apply(null, runde.playerIds.map(function (id) { return sum[id]; }));
      spillere.forEach(function (p, i) {
        var leder = sum[p.id] === best && best > 0;
        stillingStripe.appendChild(el('div', {
          class: 'standing-item' + (leder ? ' is-leader' : '')
        }, [
          UI.avatar(p.avatarId, 32, UI.playerColorVar(i)),
          el('span', { class: 'standing-name', text: p.name }),
          el('span', { class: 'standing-points num', text: poengTekst(sum[p.id]) })
        ]));
      });
    }

    function poengTekst(n) {
      if (n === 0) return '0';
      var hel = Math.floor(n);
      var halv = n % 1 !== 0;
      if (hel === 0) return '½';
      return hel + (halv ? '½' : '');
    }

    function tegnHull() {
      UI.clear(hullBoks);
      var p = par(hullNr);

      hullBoks.appendChild(el('div', { class: 'hole-head' }, [
        el('span', { class: 'hole-title', text: 'Hull ' + hullNr }),
        el('span', { class: 'hole-of muted', text: 'av ' + runde.holes }),
        p ? el('span', { class: 'badge badge-solo', text: 'Par ' + p }) : null
      ]));

      spillere.forEach(function (sp, i) {
        hullBoks.appendChild(spillerRad(sp, i));
      });

      oppdaterResultatlinje();
    }

    function spillerRad(sp, i) {
      var verdi = slag(hullNr)[sp.id];
      var felt = el('input', {
        type: 'number', class: 'stroke-input num', min: '1', max: '20',
        inputmode: 'numeric', 'aria-label': 'Slag for ' + sp.name,
        value: verdi === undefined ? '' : String(verdi),
        onfocus: function () { felt.select(); },
        onchange: function () {
          var n = parseInt(felt.value, 10);
          if (isNaN(n) || n < 1) { skriv(null); return; }
          skriv(Math.min(n, 20));
        }
      });

      function skriv(n) {
        felt.value = n === null ? '' : String(n);
        settSlag(hullNr, sp.id, n).then(function () {
          tegnStilling();
          oppdaterResultatlinje();
          tegnAvslutt();
          tegnScoreboard();
        });
      }

      function juster(retning) {
        var naa = slag(hullNr)[sp.id];
        // Første trykk lander på par når banen har par, ellers på 4.
        if (naa === undefined) { skriv(par(hullNr) || 4); return; }
        skriv(Math.max(1, Math.min(20, naa + retning)));
      }

      return el('div', { class: 'stroke-row' }, [
        UI.avatar(sp.avatarId, 40, UI.playerColorVar(i)),
        el('span', { class: 'stroke-name', text: sp.name }),
        el('div', { class: 'stepper' }, [
          el('button', {
            type: 'button', 'aria-label': 'Ett slag mindre for ' + sp.name,
            text: '−', onclick: function () { juster(-1); }
          }),
          felt,
          el('button', {
            type: 'button', 'aria-label': 'Ett slag mer for ' + sp.name,
            text: '+', onclick: function () { juster(1); }
          })
        ])
      ]);
    }

    function oppdaterResultatlinje() {
      var tekst = GolfMatch.hullTekst(slag(hullNr), runde.playerIds, navnFor);
      if (tekst) {
        resultatLinje.textContent = tekst;
        resultatLinje.className = 'hole-result is-done';
      } else {
        resultatLinje.textContent = 'Fyll inn slag for alle spillerne, så regnes poengene ut.';
        resultatLinje.className = 'hole-result';
      }
    }

    function tegnNav() {
      UI.clear(navKnapper);
      navKnapper.appendChild(el('button', {
        class: 'btn btn-secondary', text: '‹ Forrige',
        disabled: hullNr <= 1,
        onclick: function () { gaaTilHull(hullNr - 1); }
      }));
      navKnapper.appendChild(el('button', {
        class: 'btn btn-primary', text: 'Neste ›',
        disabled: hullNr >= runde.holes,
        onclick: function () { gaaTilHull(hullNr + 1); }
      }));
    }

    function tegnAvslutt() {
      UI.clear(avsluttBoks);
      var ferdige = GolfMatch.ferdigeHull(hullRader, runde.playerIds);

      avsluttBoks.appendChild(el('p', { class: 'muted center', text:
        ferdige + ' av ' + runde.holes + ' hull er ferdig registrert.' }));

      avsluttBoks.appendChild(el('button', {
        class: 'btn btn-primary btn-lg btn-block',
        text: 'Avslutt runden',
        onclick: avsluttRunden
      }));

      avsluttBoks.appendChild(el('button', {
        class: 'btn btn-ghost btn-block',
        text: runde.holes === 18 ? 'Endre til 9 hull' : 'Utvid til 18 hull',
        onclick: endreAntallHull
      }));
    }

    function avsluttRunden() {
      var ferdige = GolfMatch.ferdigeHull(hullRader, runde.playerIds);
      if (ferdige === 0) { Screens.ingenHullDialog(runde, nav); return; }
      var melding = ferdige === runde.holes
        ? 'Resultatet lagres og oppdaterer all time-statistikken.'
        : 'Bare ' + ferdige + ' av ' + runde.holes + ' hull er ferdig registrert. ' +
          'Hull uten fullstendig registrering teller ikke.';
      UI.confirm({
        title: 'Avslutte runden?',
        body: melding,
        confirmText: 'Avslutt og lagre'
      }).then(function (ok) {
        if (!ok) return;
        runde.holesPlayed = ferdige;
        return GolfStore.saveRound(runde)
          .then(function () { return GolfStore.setRoundStatus(runde.id, 'fullfort'); })
          .then(function () { nav.erstatt('resultat', { id: runde.id }); });
      });
    }

    function endreAntallHull() {
      if (runde.holes === 9) {
        runde.holes = 18;
        GolfStore.saveRound(runde).then(function () {
          UI.toast('Scorekortet er utvidet til 18 hull');
          tegnAlt();
        });
        return;
      }
      var ferdige = GolfMatch.ferdigeHull(hullRader, runde.playerIds);
      if (ferdige === 0) { Screens.ingenHullDialog(runde, nav); return; }
      // Runden kuttes etter det siste hullet som er ferdig registrert, slik
      // at ingen ferdige hull blir slettet selv om et hull er hoppet over.
      var sisteFerdige = 0;
      for (var h = 1; h <= runde.holes; h++) {
        if (GolfMatch.erFerdig(slag(h), runde.playerIds)) sisteFerdige = h;
      }
      UI.confirm({
        title: 'Gå fra 18 til 9 hull?',
        body: 'Runden avsluttes etter hull ' + sisteFerdige + ', og merkes med faktisk ' +
              'antall hull. ' + UI.plural(ferdige, 'hull er', 'hull er') + ' ferdig registrert. ' +
              'Dette kan ikke angres.',
        confirmText: 'Avslutt etter hull ' + sisteFerdige,
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        runde.holes = sisteFerdige;
        runde.holesPlayed = ferdige;
        return GolfStore.removeHolesAbove(runde.id, runde.holes)
          .then(function () { return GolfStore.saveRound(runde); })
          .then(function () { return GolfStore.setRoundStatus(runde.id, 'fullfort'); })
          .then(function () { nav.erstatt('resultat', { id: runde.id }); });
      });
    }

    /* ---- scoreboard, alltid tilgjengelig ---------------------------- */

    function tegnScoreboard() {
      UI.clear(scoreboardBoks);
      scoreboardBoks.appendChild(el('h2', { text: 'Scorekort' }));
      scoreboardBoks.appendChild(el('p', { class: 'muted small', text:
        'Øverste tall er slag, nederste er poeng. Trykk på et hullnummer for å gå dit.' }));
      scoreboardBoks.appendChild(el('div', { class: 'card card-flush scroll' },
        Screens.scorekortTabell(runde, hullRader, bane, {
          aktivtHull: hullNr,
          velgHull: function (hull) { gaaTilHull(hull); }
        })));
    }

    function gaaTilHull(hull) {
      hullNr = hull;
      tegnHull(); tegnNav(); tegnScoreboard();
      window.scrollTo(0, 0);
    }

    return wrap;
  };

  /* ======================================================================
     Resultat
     ====================================================================== */

  Screens['match-resultat'] = function (nav, params, runde) {

    var wrap = el('div', { class: 'stack' });
    wrap.appendChild(el('p', { class: 'muted', text: 'Henter resultatet …' }));

    GolfStore.holes(runde.id).then(function (hullRader) {
      UI.clear(wrap);
      var stilling = GolfMatch.stilling(hullRader, runde.playerIds);
      var modell = GolfStore.settings().poengmodell;
      var allTime = GolfMatch.allTimePoeng(stilling, modell);

      wrap.appendChild(el('section', { class: 'card stack center' }, [
        el('p', { class: 'label', text: statusTekst(runde.status) }),
        el('h2', { text: runde.courseName }),
        el('p', { class: 'muted', text:
          'Match · ' + runde.holes + ' hull · ' + UI.formatDate(runde.startedAt) })
      ]));

      var liste = el('section', { class: 'list' });
      stilling.forEach(function (rad) {
        var p = GolfStore.player(rad.playerId);
        var i = runde.playerIds.indexOf(rad.playerId);
        liste.appendChild(el('div', {
          class: 'result-row' + (rad.place === 1 ? ' is-winner' : '')
        }, [
          el('span', { class: 'result-place num', text: rad.place + '.' }),
          UI.avatar(p ? p.avatarId : 'rev', 40, UI.playerColorVar(i)),
          el('span', { class: 'result-name' }, [
            el('span', { text: p ? p.name : 'Ukjent' }),
            rad.shared ? el('span', { class: 'result-shared muted', text: 'delt plassering' }) : null
          ]),
          el('span', { class: 'result-points num', text: poengTekst(rad.points) + ' p' })
        ]));
      });
      wrap.appendChild(el('section', { class: 'stack' }, [
        el('h2', { text: 'Sluttstilling' }),
        el('p', { class: 'muted', text: 'Poeng vunnet på hullene i denne runden.' }),
        liste
      ]));

      var allTimeListe = el('div', { class: 'list' });
      stilling.forEach(function (rad) {
        var p = GolfStore.player(rad.playerId);
        allTimeListe.appendChild(el('div', { class: 'list-row' }, [
          el('span', { class: 'list-row-main', text: p ? p.name : 'Ukjent' }),
          el('span', { class: 'num', text: '+' + poengTekst(allTime[rad.playerId]) })
        ]));
      });
      wrap.appendChild(el('section', { class: 'stack' }, [
        el('h2', { text: 'Til all time-tabellen' }),
        el('p', { class: 'muted', text: modell === 'fast'
          ? 'Fast modell: seier gir 3 poeng.'
          : 'Skalerende modell: poeng er antall spillere du slår, et halvt for hver du deler med.' }),
        allTimeListe
      ]));

      var bane = runde.courseId ? GolfStore.course(runde.courseId) : null;
      wrap.appendChild(Screens.scorekort(runde, hullRader, bane));

      wrap.appendChild(Screens.delRapportKnapp(runde, hullRader, bane));

      wrap.appendChild(el('button', {
        class: 'btn btn-secondary btn-block', text: 'Ferdig',
        onclick: function () { nav.rot('hjem'); }
      }));

      wrap.appendChild(Screens.slettRundeKnapp(runde, nav));
    });

    return wrap;
  };

  function poengTekst(n) {
    if (n === 0) return '0';
    var hel = Math.floor(n);
    if (hel === 0) return '½';
    return hel + (n % 1 !== 0 ? '½' : '');
  }

  function statusTekst(s) {
    return s === 'fullfort' ? 'Fullført runde'
         : s === 'avbrutt' ? 'Avbrutt runde' : 'Pågående runde';
  }
})(window);
