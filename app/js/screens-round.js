/* ==========================================================================
   Golfapp - oppsett av runde, rundevisning og innstillinger
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;
  var Screens = global.Screens;

  /* ======================================================================
     Ny runde
     ====================================================================== */

  Screens['ny-runde'] = function (nav) {
    var valgteSpillere = [];
    var valgtBaneId = null;
    var nyttBanenavn = '';
    var antallHull = 18;
    var modus = 'match';
    var lagoppsett = 'tilfeldig';   // brukes ved fire spillere i scramble
    var manuelleLag = null;

    var spillere = GolfStore.players();
    var baner = GolfStore.courses();

    var wrap = el('div', { class: 'stack' });

    /* ---- 1. spillere -------------------------------------------------- */

    var spillerBoks = el('div', { class: 'pick-grid' });
    var spillerTeller = el('p', { class: 'muted', text: 'Ingen valgt. Maks fire.' });

    // Tomtilstanden får hele bredden, ikke én rute i rutenettet.
    var ingenSpillere = !spillere.length ? UI.emptyState(
      'Ingen spillere ennå',
      'Legg til spillerne først, så kan du starte runden.',
      el('button', {
        class: 'btn btn-secondary', text: 'Gå til spillere',
        onclick: function () { nav('spillere'); }
      })) : null;

    if (spillere.length) {
      spillere.forEach(function (p) {
        var knapp = el('button', {
          type: 'button', class: 'pick-card', 'aria-pressed': 'false',
          dataset: { id: p.id },
          onclick: function () { velgSpiller(p, knapp); }
        }, [
          el('span', { class: 'pick-avatar' }, UI.avatar(p.avatarId, 56)),
          el('span', { class: 'pick-name', text: p.name })
        ]);
        spillerBoks.appendChild(knapp);
      });
    }

    function velgSpiller(p, knapp) {
      var i = valgteSpillere.indexOf(p.id);
      if (i >= 0) {
        valgteSpillere.splice(i, 1);
      } else {
        if (valgteSpillere.length >= 4) { UI.toast('Maks fire spillere i en runde'); return; }
        valgteSpillere.push(p.id);
      }
      knapp.setAttribute('aria-pressed', String(valgteSpillere.indexOf(p.id) >= 0));
      oppdaterSpillerFarger();
      oppdaterTeller();
      oppdaterLagValg();
      oppdaterStartKnapp();
    }

    function oppdaterSpillerFarger() {
      Array.prototype.forEach.call(spillerBoks.children, function (knapp) {
        if (!knapp.dataset || !knapp.dataset.id) return;
        var pos = valgteSpillere.indexOf(knapp.dataset.id);
        knapp.style.setProperty('--player-color',
          pos >= 0 ? 'var(' + UI.playerColorVar(pos) + ')' : 'transparent');
      });
    }

    function oppdaterTeller() {
      spillerTeller.textContent = valgteSpillere.length === 0
        ? 'Ingen valgt. Maks fire.'
        : UI.plural(valgteSpillere.length, 'spiller valgt', 'spillere valgt') + '. Maks fire.';
    }

    /* ---- 2. bane ------------------------------------------------------ */

    var nyBaneFelt = el('input', {
      type: 'text', class: 'field', maxlength: '40', autocomplete: 'off',
      placeholder: 'Skriv banenavn',
      oninput: function () {
        nyttBanenavn = nyBaneFelt.value.trim();
        if (nyttBanenavn) { valgtBaneId = null; merkBane(); }
        oppdaterStartKnapp();
      }
    });

    var baneListe = el('div', { class: 'chip-row' });
    baner.forEach(function (c) {
      baneListe.appendChild(el('button', {
        type: 'button', class: 'chip', 'aria-pressed': 'false',
        dataset: { id: c.id },
        text: c.name + ' (' + c.holes + ')',
        onclick: function () {
          valgtBaneId = valgtBaneId === c.id ? null : c.id;
          if (valgtBaneId) {
            nyBaneFelt.value = '';
            nyttBanenavn = '';
            antallHull = c.holes;
            merkHull();
          }
          merkBane();
          oppdaterStartKnapp();
        }
      }));
    });

    function merkBane() {
      Array.prototype.forEach.call(baneListe.children, function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.id === valgtBaneId));
      });
    }

    /* ---- 3. hull ------------------------------------------------------ */

    var hullValg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Antall hull' }, [
      hullKnapp(9), hullKnapp(18)
    ]);

    function hullKnapp(n) {
      return el('button', {
        type: 'button', 'aria-pressed': String(antallHull === n), text: n + ' hull',
        dataset: { n: String(n) },
        onclick: function () { antallHull = n; merkHull(); }
      });
    }

    function merkHull() {
      Array.prototype.forEach.call(hullValg.children, function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.n) === antallHull));
      });
    }

    /* ---- 4. modus ----------------------------------------------------- */

    var modusValg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Spillmodus' }, [
      modusKnapp('match', 'Match'), modusKnapp('scramble', 'Scramble')
    ]);

    function modusKnapp(verdi, tekst) {
      return el('button', {
        type: 'button', 'aria-pressed': String(modus === verdi), text: tekst,
        dataset: { modus: verdi },
        onclick: function () {
          modus = verdi;
          Array.prototype.forEach.call(modusValg.children, function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.modus === modus));
          });
          oppdaterLagValg();
          oppdaterStartKnapp();
        }
      });
    }

    /* ---- 5. lag i scramble -------------------------------------------- */

    var lagBoks = el('section', { class: 'card stack', hidden: true });

    function oppdaterLagValg() {
      UI.clear(lagBoks);
      var n = valgteSpillere.length;
      if (modus !== 'scramble' || n < 2) { lagBoks.hidden = true; return; }
      lagBoks.hidden = false;

      lagBoks.appendChild(el('p', { class: 'label', text: 'Lag' }));

      if (n === 2 || n === 3) {
        manuelleLag = null;
        lagBoks.appendChild(el('p', { class: 'muted', text:
          'Med ' + n + ' spillere spiller dere på ett lag sammen.' }));
        return;
      }

      // Fire spillere: to lag på to.
      lagBoks.appendChild(el('p', { class: 'muted', text:
        'Med fire spillere blir det to lag på to. Velg hvordan lagene settes.' }));

      var valg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Lagoppsett' }, [
        lagKnapp('tilfeldig', 'Tilfeldig'), lagKnapp('manuelt', 'Jeg velger')
      ]);
      lagBoks.appendChild(valg);

      var manuellBoks = el('div', { class: 'stack', hidden: lagoppsett !== 'manuelt' });
      lagBoks.appendChild(manuellBoks);

      function lagKnapp(verdi, tekst) {
        return el('button', {
          type: 'button', 'aria-pressed': String(lagoppsett === verdi), text: tekst,
          dataset: { v: verdi },
          onclick: function () {
            lagoppsett = verdi;
            Array.prototype.forEach.call(valg.children, function (b) {
              b.setAttribute('aria-pressed', String(b.dataset.v === lagoppsett));
            });
            manuellBoks.hidden = lagoppsett !== 'manuelt';
            if (lagoppsett === 'manuelt') byggManuell(manuellBoks);
            else manuelleLag = null;
            oppdaterStartKnapp();
          }
        });
      }

      if (lagoppsett === 'manuelt') byggManuell(manuellBoks);
    }

    function byggManuell(boks) {
      UI.clear(boks);
      if (!manuelleLag) manuelleLag = [[], []];
      // Rydd bort spillere som er tatt ut av runden igjen.
      manuelleLag = manuelleLag.map(function (lag) {
        return lag.filter(function (id) { return valgteSpillere.indexOf(id) >= 0; });
      });

      boks.appendChild(el('p', { class: 'muted', text: 'Trykk på en spiller for å flytte mellom lagene.' }));

      valgteSpillere.forEach(function (id) {
        var p = GolfStore.player(id);
        if (!p) return;
        var lagNr = manuelleLag[0].indexOf(id) >= 0 ? 0
                  : manuelleLag[1].indexOf(id) >= 0 ? 1 : null;
        if (lagNr === null) {
          lagNr = manuelleLag[0].length <= manuelleLag[1].length ? 0 : 1;
          manuelleLag[lagNr].push(id);
        }
        var rad = el('button', { class: 'list-row', onclick: function () {
          var fra = manuelleLag[0].indexOf(id) >= 0 ? 0 : 1;
          var til = fra === 0 ? 1 : 0;
          if (manuelleLag[til].length >= 2) { UI.toast('Laget er fullt'); return; }
          manuelleLag[fra].splice(manuelleLag[fra].indexOf(id), 1);
          manuelleLag[til].push(id);
          byggManuell(boks);
          oppdaterStartKnapp();
        } }, [
          UI.avatar(p.avatarId, 40),
          el('span', { class: 'list-row-main', text: p.name }),
          el('span', { class: 'badge badge-solo', text: 'Lag ' + (lagNr + 1) })
        ]);
        boks.appendChild(rad);
      });
    }

    /* ---- start -------------------------------------------------------- */

    var startKnapp = el('button', {
      class: 'btn btn-primary btn-lg btn-block',
      text: 'Start runde',
      disabled: true,
      onclick: start
    });

    var startHjelp = el('p', { class: 'muted center' });

    function mangler() {
      if (valgteSpillere.length < 2) return 'Velg minst to spillere.';
      if (!valgtBaneId && !nyttBanenavn) return 'Velg eller skriv inn en bane.';
      if (modus === 'scramble' && valgteSpillere.length === 4 && lagoppsett === 'manuelt') {
        if (!manuelleLag || manuelleLag[0].length !== 2 || manuelleLag[1].length !== 2) {
          return 'Fordel spillerne to og to.';
        }
      }
      return null;
    }

    function oppdaterStartKnapp() {
      var problem = mangler();
      startKnapp.disabled = !!problem;
      startHjelp.textContent = problem || '';
    }

    function lagLag() {
      if (modus !== 'scramble') return null;
      var n = valgteSpillere.length;
      if (n === 2 || n === 3) return [{ name: 'Laget', playerIds: valgteSpillere.slice() }];
      var par;
      if (lagoppsett === 'manuelt') {
        par = [manuelleLag[0].slice(), manuelleLag[1].slice()];
      } else {
        var stokket = valgteSpillere.slice();
        for (var i = stokket.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = stokket[i]; stokket[i] = stokket[j]; stokket[j] = t;
        }
        par = [stokket.slice(0, 2), stokket.slice(2, 4)];
      }
      return par.map(function (ids) {
        return {
          name: ids.map(function (id) {
            var p = GolfStore.player(id);
            return p ? p.name.split(' ')[0] : '?';
          }).join(' og '),
          playerIds: ids
        };
      });
    }

    var starter = false;

    function start() {
      var problem = mangler();
      if (problem) { UI.toast(problem); return; }
      // Ett trykk gir én runde, også om knappen trykkes to ganger raskt.
      if (starter) return;
      var paagaar = GolfStore.activeRound();
      if (paagaar) { nav.erstatt('runde', { id: paagaar.id }); return; }
      starter = true;
      startKnapp.disabled = true;

      var forberedelse;
      if (valgtBaneId) {
        forberedelse = Promise.resolve(GolfStore.course(valgtBaneId));
      } else {
        // Ny bane skrevet inn her lagres i biblioteket med én gang.
        forberedelse = GolfStore.saveCourse({ name: nyttBanenavn, holes: antallHull, pars: null });
      }

      forberedelse.then(function (bane) {
        return GolfStore.createRound({
          mode: modus,
          holes: antallHull,
          courseId: bane ? bane.id : null,
          courseName: bane ? bane.name : nyttBanenavn,
          playerIds: valgteSpillere,
          teams: lagLag()
        });
      }).then(function (runde) {
        UI.toast('Runden er startet');
        nav.erstatt('runde', { id: runde.id });
      }).catch(function (e) {
        console.error(e);
        starter = false;
        oppdaterStartKnapp();
        UI.toast('Klarte ikke å starte runden');
      });
    }

    /* ---- sett sammen skjermen ------------------------------------------ */

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('p', { class: 'label', text: 'Hvem spiller?' }),
      ingenSpillere ? null : spillerTeller,
      ingenSpillere || spillerBoks
    ]));

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('p', { class: 'label', text: 'Bane' }),
      baner.length ? el('p', { class: 'muted', text: 'Velg en lagret bane, eller skriv inn en ny.' })
                   : el('p', { class: 'muted', text: 'Skriv inn banenavnet. Den lagres til neste gang.' }),
      baner.length ? baneListe : null,
      nyBaneFelt,
      el('p', { class: 'label', style: 'margin-top:12px', text: 'Antall hull' }),
      hullValg,
      el('p', { class: 'muted', text: 'Du kan endre antall hull underveis i runden.' })
    ]));

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('p', { class: 'label', text: 'Spillmodus' }),
      modusValg
    ]));

    wrap.appendChild(lagBoks);
    wrap.appendChild(startKnapp);
    wrap.appendChild(startHjelp);

    oppdaterLagValg();
    oppdaterStartKnapp();
    return wrap;
  };

  /* ======================================================================
     Rundevisning
     ====================================================================== */

  Screens.runde = function (nav, params) {
    var r = GolfStore.round(params.id);
    if (!r) return UI.emptyState('Fant ikke runden', 'Den kan ha blitt slettet.');

    // Ferdige runder vises som resultat, ikke som registrering.
    if (r.status === 'avbrutt') return Screens['runde-detaljer'](nav, params);
    if (r.status !== 'pagar') return Screens.resultat(nav, params);

    return r.mode === 'match'
      ? Screens['match-runde'](nav, params, r)
      : Screens['scramble-runde'](nav, params, r);
  };

  /* En runde uten ett eneste ferdig hull gir ikke noe resultat. I stedet
     for å lagre den som fullført, med vinnere og poeng, tilbys avbryt. */
  Screens.ingenHullDialog = function (runde, nav) {
    UI.confirm({
      title: 'Ingen hull er ferdig registrert',
      body: 'En runde uten ferdige hull gir ikke noe resultat. Du kan avbryte runden i stedet. ' +
            'Den blir liggende i historikken merket som avbrutt, men teller ikke i statistikken.',
      confirmText: 'Avbryt runden',
      cancelText: 'Fortsett å spille',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      GolfStore.setRoundStatus(runde.id, 'avbrutt').then(function () {
        UI.toast('Runden er avbrutt');
        nav.rot('hjem');
      });
    });
  };

  /* Sletteknappen er den samme overalt: bekreftelse først, og teksten sier
     hva som faktisk skjer. Statistikken regnes ut fra rundene ved visning,
     så tabeller, seierspall og banestatistikk oppdaterer seg av seg selv
     når runden er borte. */
  Screens.slettRundeKnapp = function (runde, nav) {
    return el('button', {
      class: 'btn btn-danger btn-block',
      text: 'Slett runden',
      onclick: function () {
        var navn = runde.playerIds.map(function (id) {
          var p = GolfStore.player(id);
          return p ? p.name : 'Ukjent';
        }).join(', ');
        UI.confirm({
          title: 'Slette runden?',
          body: (runde.mode === 'match' ? 'Match' : 'Scramble') + ' på ' +
                runde.courseName + ' ' + UI.formatDate(runde.startedAt) +
                ', med ' + navn + '. Runden fjernes fra historikken, og ' +
                'poeng og statistikk regnes om uten den. Dette kan ikke angres.',
          confirmText: 'Slett runden',
          cancelText: 'Behold',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          GolfStore.removeRound(runde.id).then(function () {
            UI.toast('Runden er slettet');
            nav.rot('hjem');
          });
        });
      }
    });
  };

  /* Del rapporten som bilde. Samme knapp i begge resultatskjermene. */
  Screens.delRapportKnapp = function (runde, hullRader, bane) {
    var knapp = el('button', {
      class: 'btn btn-primary btn-block',
      text: 'Del rapport som bilde',
      onclick: function () {
        knapp.disabled = true;
        var opprinnelig = knapp.textContent;
        knapp.textContent = 'Lager bildet …';
        GolfRapport.del(runde, hullRader, bane).then(function (hvordan) {
          if (hvordan !== 'avbrutt') UI.toast('Rapporten er ' + hvordan);
        }).catch(function (e) {
          console.error(e);
          UI.toast('Klarte ikke å lage bildet');
        }).then(function () {
          knapp.disabled = false;
          knapp.textContent = opprinnelig;
        });
      }
    });
    return knapp;
  };

  /* Scorekortet hull for hull. Hullene står nedover og spillerne (eller
     lagene) bortover. Da er det aldri flere enn fire kolonner med score,
     og tabellen får plass i bredden på alle telefoner, også med 18 hull.

     opts.aktivtHull   markerer hullet man står på
     opts.velgHull     gjør hullnumrene trykkbare, fn(hull) */
  Screens.scorekortTabell = function (runde, hullRader, bane, opts) {
    opts = opts || {};
    var erMatch = runde.mode === 'match';
    var lag = erMatch ? null : GolfStats.lagFor(runde);
    var pars = bane && bane.pars;
    var harPar = !!(pars && pars.length);
    var kolonner = erMatch ? runde.playerIds : lag;

    function rad(hull) {
      for (var i = 0; i < hullRader.length; i++) {
        if (hullRader[i].hole === hull) return hullRader[i];
      }
      return null;
    }

    var tabell = el('table', { class: 'scoreboard scorecard' });
    tabell.style.setProperty('--kolonner', String(kolonner.length));

    /* --- hode: én kolonne per spiller eller lag --- */
    var hode = el('tr', null, [el('th', { scope: 'col', class: 'sc-hull', text: 'Hull' })]);
    if (harPar) hode.appendChild(el('th', { scope: 'col', class: 'sc-par', text: 'Par' }));

    var perHull = erMatch ? GolfMatch.poengPerHull(hullRader, runde.playerIds) : null;
    var poengSum = erMatch ? GolfMatch.totaler(hullRader, runde.playerIds) : null;
    var lederIndex = {};
    if (erMatch) {
      var best = Math.max.apply(null, runde.playerIds.map(function (id) { return poengSum[id]; }));
      runde.playerIds.forEach(function (id, i) { if (best > 0 && poengSum[id] === best) lederIndex[i] = true; });
    } else if (lag.length > 1) {
      GolfScramble.stilling(hullRader, lag.length).forEach(function (x) {
        if (x.place === 1 && x.strokes > 0) lederIndex[x.teamIndex] = true;
      });
    }

    kolonner.forEach(function (k, i) {
      var innhold;
      if (erMatch) {
        var p = GolfStore.player(k);
        var navn = p ? p.name : 'Ukjent';
        innhold = el('span', { class: 'sc-head', title: navn }, [
          UI.avatar(p ? p.avatarId : 'rev', 28, UI.playerColorVar(i)),
          el('span', { class: 'sc-name', text: navn })
        ]);
      } else {
        innhold = el('span', { class: 'sc-head', title: k.name }, [
          el('span', { class: 'sc-name', text: lag.length > 1 ? k.name : 'Slag' })
        ]);
      }
      hode.appendChild(el('th', { scope: 'col', class: lederIndex[i] ? 'is-leader' : null }, innhold));
    });
    tabell.appendChild(el('thead', null, hode));

    /* --- ett hull per rad --- */
    var kropp = el('tbody');
    for (var h = 1; h <= runde.holes; h++) {
      (function (hull) {
        var r = rad(hull);
        var tr = el('tr', { class: hull === opts.aktivtHull ? 'is-now' : null });
        var nr = opts.velgHull
          ? el('button', {
              type: 'button', class: 'hole-link' + (hull === opts.aktivtHull ? ' is-now' : ''),
              'aria-label': 'Gå til hull ' + hull, text: String(hull),
              onclick: function () { opts.velgHull(hull); }
            })
          : String(hull);
        tr.appendChild(el('th', { scope: 'row', class: 'sc-hull' }, nr));
        if (harPar) {
          var pv = GolfStore.parFor(pars, hull);
          tr.appendChild(el('td', { class: 'sc-par num', text: pv ? String(pv) : '–' }));
        }

        kolonner.forEach(function (k, i) {
          var slag, under = '', vant = false;
          if (erMatch) {
            slag = r && r.strokes ? r.strokes[k] : undefined;
            if (perHull[hull]) {
              var poeng = perHull[hull][k];
              under = halv(poeng);
              vant = poeng === 1;
            }
          } else {
            var d = GolfScramble.lagData(r, i);
            slag = d && d.strokes ? d.strokes : undefined;
            if (d && d.mark) { under = merkeKort(d.mark); vant = true; }
          }
          // UI-REDESIGN: merke rundt slagene ut fra par på hullet. Bare visning.
          var merke = harPar && typeof slag === 'number' ? slagMerke(slag, GolfStore.parFor(pars, hull)) : '';
          tr.appendChild(el('td', { class: 'num' }, [
            el('span', {
              class: 'sb-strokes' + (merke ? ' sc-mark sc-' + merke : ''),
              title: merke ? MERKENAVN[merke] : null,
              text: slag === undefined ? '–' : String(slag)
            }),
            el('span', { class: 'sb-points' + (vant ? ' is-win' : ''), text: under })
          ]));
        });
        kropp.appendChild(tr);
      })(h);
    }
    tabell.appendChild(kropp);

    /* --- summer nederst --- */
    var fot = el('tfoot');
    function sumRad(tittel, parTekst, verdier, visLeder) {
      var tr = el('tr', null, [el('th', { scope: 'row', class: 'sc-hull', text: tittel })]);
      if (harPar) tr.appendChild(el('td', { class: 'sc-par num', text: parTekst || '' }));
      verdier.forEach(function (v, i) {
        tr.appendChild(el('td', { class: 'total num' + (visLeder && lederIndex[i] ? ' is-leader' : ''), text: v }));
      });
      fot.appendChild(tr);
    }

    var parTotal = '';
    if (harPar) {
      var ps = 0;
      for (var h2 = 1; h2 <= runde.holes; h2++) ps += GolfStore.parFor(pars, h2) || 0;
      parTotal = String(ps);
    }

    if (erMatch) {
      sumRad('Slag', parTotal, runde.playerIds.map(function (id) {
        var sum = 0, noen = false;
        hullRader.forEach(function (r) {
          var v = r.strokes ? r.strokes[id] : undefined;
          if (typeof v === 'number') { sum += v; noen = true; }
        });
        return noen ? String(sum) : '–';
      }));
      sumRad('Poeng', '', runde.playerIds.map(function (id) { return halv(poengSum[id]); }), true);
    } else {
      sumRad('Sum', parTotal, lag.map(function (l, i) {
        return String(GolfScramble.total(hullRader, i, lag.length));
      }), true);
      if (harPar) {
        sumRad('Mot par', '', lag.map(function (l, i) {
          var diff = GolfScramble.motPar(hullRader, i, pars, lag.length);
          return diff === null ? '–' : GolfScramble.motParTekst(diff);
        }));
      }
    }
    tabell.appendChild(fot);

    // UI-REDESIGN: forklaring til merkene, som bildetekst under tabellen.
    if (harPar) {
      tabell.appendChild(el('caption', { class: 'scorecard-caption' },
        el('ul', { class: 'scorecard-legend', 'aria-label': 'Forklaring' },
          ['eagle', 'birdie', 'bogey', 'dobbel'].map(function (m) {
            return el('li', null, [
              el('span', { class: 'sc-mark sc-' + m, 'aria-hidden': 'true', text: MERKEEKSEMPEL[m] }),
              MERKENAVN[m]
            ]);
          }))));
    }
    return tabell;
  };

  /* UI-REDESIGN: vanlig skrivemåte på scorekort. Sirkel for birdie, dobbel
     sirkel for eagle eller bedre, firkant for bogey og dobbel firkant for
     dobbeltbogey eller verre. Par og hull uten par får ingen merke. */
  var MERKENAVN = { eagle: 'Eagle eller bedre', birdie: 'Birdie', bogey: 'Bogey', dobbel: 'Dobbeltbogey eller verre' };
  var MERKEEKSEMPEL = { eagle: '3', birdie: '4', bogey: '6', dobbel: '7' };
  function slagMerke(slag, par) {
    if (!par) return '';
    var diff = slag - par;
    if (diff <= -2) return 'eagle';
    if (diff === -1) return 'birdie';
    if (diff === 1) return 'bogey';
    if (diff >= 2) return 'dobbel';
    return '';
  }

  function merkeKort(mark) {
    return mark === 'birdie' ? 'B' : mark === 'eagle' ? 'E' : 'HIO';
  }

  /* Scorekortet slik det vises på resultatskjermene. */
  Screens.scorekort = function (runde, hullRader, bane) {
    var erMatch = runde.mode === 'match';
    return el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Scorekort' }),
      el('p', { class: 'muted small', text: erMatch
        ? 'Øverste tall er slag, nederste er poeng på hullet.'
        : 'Slag per hull. B, E og HIO er birdie, eagle og hole in one.' }),
      el('div', { class: 'card card-flush scroll' },
        Screens.scorekortTabell(runde, hullRader, bane))
    ]);
  };

  function halv(n) {
    if (n === 0) return '0';
    var hel = Math.floor(n);
    if (hel === 0) return '½';
    return hel + (n % 1 !== 0 ? '½' : '');
  }

  /* ======================================================================
     Historikk: alle runder
     ====================================================================== */

  Screens.historikk = function (nav) {
    var wrap = el('div', { class: 'stack' });
    var alle = GolfStore.rounds().filter(function (r) { return r.status !== 'pagar'; });

    if (!alle.length) {
      wrap.appendChild(UI.emptyState('Ingen runder ennå',
        'Når dere har spilt ferdig en runde, dukker den opp her.'));
      return wrap;
    }

    var filter = 'alle';
    var listeBoks = el('div', { class: 'stack' });

    var filterRad = el('div', { class: 'chip-row' }, [
      filterKnapp('alle', 'Alle'),
      filterKnapp('match', 'Match'),
      filterKnapp('scramble', 'Scramble'),
      filterKnapp('avbrutt', 'Avbrutte')
    ]);

    function filterKnapp(id, tekst) {
      return el('button', {
        type: 'button', class: 'chip chip-sm', text: tekst,
        dataset: { f: id }, 'aria-pressed': String(filter === id),
        onclick: function () {
          filter = id;
          Array.prototype.forEach.call(filterRad.children, function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.f === filter));
          });
          tegnListe();
        }
      });
    }

    function tegnListe() {
      UI.clear(listeBoks);
      var vist = alle.filter(function (r) {
        if (filter === 'alle') return true;
        if (filter === 'avbrutt') return r.status === 'avbrutt';
        return r.mode === filter && r.status === 'fullfort';
      });
      if (!vist.length) {
        listeBoks.appendChild(UI.emptyState('Ingen runder i utvalget', ''));
        return;
      }
      listeBoks.appendChild(el('p', { class: 'muted small', text:
        UI.plural(vist.length, 'runde', 'runder') + '. Åpne en runde for å se den eller slette den.' }));
      vist.forEach(function (r) { listeBoks.appendChild(rundeKort(r, nav)); });
    }

    wrap.appendChild(filterRad);
    wrap.appendChild(listeBoks);
    tegnListe();
    return wrap;
  };

  function rundeKort(r, nav) {
    var navn = r.playerIds.map(function (id) {
      var p = GolfStore.player(id);
      return p ? p.name : 'Ukjent';
    }).join(', ');
    return el('button', {
      class: 'round-card', onclick: function () { nav('runde', { id: r.id }); }
    }, [
      el('div', { class: 'round-card-top' }, [
        el('span', { class: 'round-card-date', text: UI.formatDate(r.startedAt) }),
        r.status === 'avbrutt'
          ? el('span', { class: 'badge badge-avbrutt', text: 'Avbrutt' })
          : el('span', { class: 'badge badge-solo', text: r.mode === 'match' ? 'Match' : 'Scramble' }),
        el('span', { class: 'badge badge-solo', text: r.holes + ' hull' })
      ]),
      el('span', { class: 'round-card-course', text: r.courseName }),
      el('span', { class: 'round-card-players muted', text: navn })
    ]);
  }

  // Resultatskjermen velger visning ut fra spillmodus.
  Screens.resultat = function (nav, params) {
    var r = GolfStore.round(params.id);
    if (!r) return UI.emptyState('Fant ikke runden', 'Den kan ha blitt slettet.');
    return r.mode === 'match'
      ? Screens['match-resultat'](nav, params, r)
      : Screens['scramble-resultat'](nav, params, r);
  };

  // Avbrutte runder: hvem som var med, og det som rakk å bli registrert.
  Screens['runde-detaljer'] = function (nav, params) {
    var r = GolfStore.round(params.id);
    if (!r) return UI.emptyState('Fant ikke runden', 'Den kan ha blitt slettet.');

    var wrap = el('div', { class: 'stack' });

    var deltakere = el('div', { class: 'list' });
    r.playerIds.forEach(function (id, i) {
      var p = GolfStore.player(id);
      deltakere.appendChild(el('div', { class: 'list-row' }, [
        UI.avatar(p ? p.avatarId : 'rev', 40, UI.playerColorVar(i)),
        el('span', { class: 'list-row-main', text: p ? p.name : 'Ukjent spiller' })
      ]));
    });

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('h2', { text: r.courseName }),
      el('p', { class: 'muted', text:
        (r.mode === 'match' ? 'Match' : 'Scramble') + ' · ' + r.holes + ' hull · ' +
        UI.formatDate(r.startedAt) + ' · ' + statusTekst(r.status) }),
      deltakere
    ]));

    if (r.teams && r.teams.length > 1) {
      var lagBoks = el('section', { class: 'card stack' }, [ el('p', { class: 'label', text: 'Lag' }) ]);
      r.teams.forEach(function (lag, n) {
        lagBoks.appendChild(el('div', { class: 'list-row' }, [
          el('span', { class: 'badge badge-solo', text: 'Lag ' + (n + 1) }),
          el('span', { class: 'list-row-main', text: lag.name })
        ]));
      });
      wrap.appendChild(lagBoks);
    }

    // Scorekortet viser det som rakk å bli registrert før runden ble avbrutt.
    var kortBoks = el('div', { class: 'stack' });
    wrap.appendChild(kortBoks);
    GolfStore.holes(r.id).then(function (hullRader) {
      if (!hullRader.length) return;
      var bane = r.courseId ? GolfStore.course(r.courseId) : null;
      kortBoks.appendChild(Screens.scorekort(r, hullRader, bane));
    });

    wrap.appendChild(el('p', { class: 'muted', text:
      'Avbrutte runder teller ikke i statistikken.' }));
    wrap.appendChild(Screens.slettRundeKnapp(r, nav));

    return wrap;
  };

  function statusTekst(s) {
    return s === 'pagar' ? 'pågår' : s === 'fullfort' ? 'fullført' : 'avbrutt';
  }

  /* ======================================================================
     Innstillinger
     ====================================================================== */

  function varigTekst() {
    var l = global.GolfLagring;
    if (!l || l.varig === null) return null;
    return l.varig
      ? 'Nettleseren har lovet å ikke rydde bort dataene av seg selv.'
      : 'Nettleseren kan rydde bort data fra apper som ikke har vært brukt på lenge. Ta sikkerhetskopi jevnlig.';
  }

  // På iPhone har appen på Hjem-skjermen og Safari hvert sitt lager.
  function installertTekst() {
    var l = global.GolfLagring;
    if (!l || l.installert || location.protocol !== 'https:') return null;
    return 'Appen er åpnet i nettleseren, ikke fra Hjem-skjermen. På iPhone ligger data du ' +
           'legger inn her ikke i appen på Hjem-skjermen. Bruk appen fra Hjem-skjermen når dere spiller.';
  }

  Screens.innstillinger = function (nav) {
    var s = GolfStore.settings();
    var wrap = el('div', { class: 'stack' });

    /* ---- sikkerhetskopi ---------------------------------------------- */

    var filFelt = el('input', {
      type: 'file', accept: 'application/json,.json', class: 'visually-hidden',
      onchange: function () {
        var fil = filFelt.files && filFelt.files[0];
        if (!fil) return;
        GolfBackup.readFile(fil).then(function (payload) {
          var sum = GolfBackup.summarize(payload);
          return UI.confirm({
            title: 'Gjenopprette fra kopien?',
            body: 'Kopien inneholder ' + sum.players + ' spillere, ' + sum.courses +
                  ' baner og ' + sum.rounds + ' runder. Alt som ligger i appen nå blir erstattet.',
            confirmText: 'Gjenopprett', danger: true
          }).then(function (ok) {
            if (!ok) return null;
            return GolfBackup.restore(payload);
          });
        }).then(function (gjort) {
          if (gjort === null) return;
          UI.toast('Dataene er gjenopprettet');
          nav.rot('innstillinger');
        }).catch(function (err) {
          UI.toast(err.message || 'Klarte ikke å lese filen');
        }).then(function () { filFelt.value = ''; });
      }
    });

    var sisteKopi = s.lastBackupAt
      ? 'Sist tatt ' + UI.formatDate(s.lastBackupAt) + '.'
      : 'Du har ikke tatt kopi ennå.';

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('h2', { text: 'Sikkerhetskopi' }),
      el('p', { class: 'muted', text:
        'Kopien er en fil med all data i. Den lages på telefonen og deles gjennom telefonens egen delefunksjon. Ingenting sendes til noen server.' }),
      el('p', { class: 'muted', text: sisteKopi + ' ' +
        UI.plural(s.roundsSinceBackup || 0, 'fullført runde', 'fullførte runder') +
        ' siden sist.' }),
      el('button', {
        class: 'btn btn-primary btn-block', text: 'Ta sikkerhetskopi',
        onclick: function () {
          GolfBackup.exportBackup().then(function (hvordan) {
            if (hvordan === 'avbrutt') return;
            UI.toast('Sikkerhetskopi ' + hvordan);
            nav.rot('innstillinger');
          }).catch(function () { UI.toast('Klarte ikke å lage kopi'); });
        }
      }),
      el('button', {
        class: 'btn btn-secondary btn-block', text: 'Gjenopprett fra fil',
        onclick: function () { filFelt.click(); }
      }),
      filFelt
    ]));

    /* ---- poengmodell -------------------------------------------------- */

    var modellValg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Poengmodell' }, [
      modellKnapp('skalerende', 'Skalerende'),
      modellKnapp('fast', 'Fast 3 poeng')
    ]);

    function modellKnapp(verdi, tekst) {
      return el('button', {
        type: 'button', 'aria-pressed': String(s.poengmodell === verdi), text: tekst,
        dataset: { v: verdi },
        onclick: function () {
          GolfStore.saveSettings({ poengmodell: verdi }).then(function () {
            Array.prototype.forEach.call(modellValg.children, function (b) {
              b.setAttribute('aria-pressed', String(b.dataset.v === verdi));
            });
            UI.toast('Poengmodellen er endret');
          });
        }
      });
    }

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('h2', { text: 'Poeng i all time-tabellen' }),
      modellValg,
      el('p', { class: 'muted', text:
        'Skalerende: poeng er antall spillere du slår. Fire spillere gir 3, 2, 1, 0. Tre spillere gir 2, 1, 0. To spillere gir 1, 0.' }),
      el('p', { class: 'muted', text:
        'Fast: seier gir alltid 3 poeng. Tabellen viser da også poeng per runde, slik at den som spiller sjeldnere ikke forsvinner.' }),
      el('p', { class: 'muted', text:
        'Valget endrer bare visningen. Alle runder ligger lagret som de er, så du kan bytte fram og tilbake.' })
    ]));

    /* ---- utseende (UI-REDESIGN) ------------------------------------- */

    var TEMAER = [
      { v: 'auto',  navn: 'Automatisk', sub: 'Følger telefonen' },
      { v: 'lys',   navn: 'Fairway',    sub: 'Lys' },
      { v: 'mork',  navn: 'Klubbhus',   sub: 'Mørk' },
      { v: 'links', navn: 'Links',      sub: 'Sand og himmel' }
    ];

    var temaValg = el('div', { class: 'tema-valg', role: 'group', 'aria-label': 'Utseende' },
      TEMAER.map(function (t) {
        return el('button', {
          type: 'button', class: 'tema-kort',
          'aria-pressed': String((s.tema || 'auto') === t.v),
          dataset: { v: t.v },
          onclick: function () {
            GolfStore.saveSettings({ tema: t.v }).then(function () {
              Array.prototype.forEach.call(temaValg.children, function (b) {
                b.setAttribute('aria-pressed', String(b.dataset.v === t.v));
              });
            });
          }
        }, [
          el('span', { class: 'tema-prove tema-prove-' + t.v, 'aria-hidden': 'true' }),
          el('span', { class: 'tema-navn', text: t.navn }),
          el('span', { class: 'tema-sub', text: t.sub })
        ]);
      }));

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('h2', { text: 'Utseende' }),
      temaValg,
      el('p', { class: 'muted', text:
        'Automatisk bruker Fairway når telefonen står på lys, og Klubbhus når den står på mørk. De andre valgene gjelder uansett hva telefonen står på. Links er alltid lyst.' })
    ]));

    /* ---- lagring ------------------------------------------------------ */

    var lagringTekst =
      GolfDB.backend === 'indexeddb'
        ? 'Data lagres i nettleserens database på denne enheten.'
      : GolfDB.backend === 'localstorage'
        ? 'Data lagres i nettleserens enkle lager. Det skjer blant annet når filen åpnes rett fra disk i stedet for fra en nettadresse.'
        : 'Advarsel: nettleseren tillater ingen lagring her, så dataene forsvinner når du lukker fanen. Ta sikkerhetskopi før du lukker.';

    wrap.appendChild(el('section', { class: 'card stack' }, [
      el('h2', { text: 'Lagring' }),
      el('p', { class: GolfDB.backend === 'minne' ? 'warn-text' : 'muted', text: lagringTekst }),
      varigTekst() ? el('p', { class: 'muted', text: varigTekst() }) : null,
      installertTekst() ? el('p', { class: 'warn-text', text: installertTekst() }) : null,
      el('p', { class: 'muted', text:
        'All data ligger på denne enheten. Appen laster ingenting utenfra og sender ingenting videre.' })
    ]));

    /* ---- nullstilling -------------------------------------------------- */

    wrap.appendChild(el('button', {
      class: 'btn btn-danger btn-block', text: 'Slett all data',
      onclick: function () {
        UI.confirm({
          title: 'Slette all data?',
          body: 'Alle spillere, baner og runder forsvinner. Ta sikkerhetskopi først hvis du vil kunne hente dem tilbake.',
          confirmText: 'Slett alt', danger: true
        }).then(function (ok) {
          if (!ok) return;
          return GolfDB.replaceAll({}).then(function () { return GolfStore.reload(); })
            .then(function () { UI.toast('All data er slettet'); nav.rot('hjem'); });
        });
      }
    }));

    return wrap;
  };
})(window);
