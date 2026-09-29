/* ==========================================================================
   Golfapp - Scramble: registrering hull for hull, scoreboard og resultat
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;
  var Screens = global.Screens;
  var S = null;   // settes ved bruk, så filen kan lastes i hvilken som helst rekkefølge

  function sc() { return S || (S = global.GolfScramble); }

  /* ======================================================================
     Registrering
     ====================================================================== */

  Screens['scramble-runde'] = function (nav, params, runde) {
    var wrap = el('div', { class: 'stack' });
    var lag = runde.teams && runde.teams.length
      ? runde.teams
      : [{ name: 'Laget', playerIds: runde.playerIds.slice() }];
    var bane = runde.courseId ? GolfStore.course(runde.courseId) : null;

    var hullRader = [];
    var hullNr = 1;
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

    function lagVerdi(hull, lagIndex) {
      var d = sc().lagData(rad(hull), lagIndex);
      return d || { strokes: null, driveBy: null, mark: null, solo: null };
    }

    function forsteUferdigeHull() {
      for (var h = 1; h <= runde.holes; h++) {
        if (!sc().hullFerdig(rad(h), lag.length)) return h;
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

    function lagre(hull, lagIndex, endring) {
      var r = rad(hull);
      var teams = r && r.teams
        ? r.teams.map(function (t) { return Object.assign({}, t); })
        : [];
      while (teams.length < lag.length) {
        teams.push({ strokes: null, driveBy: null, mark: null, solo: null });
      }
      Object.keys(endring).forEach(function (k) { teams[lagIndex][k] = endring[k]; });

      // Raden i minnet oppdateres før den skrives, så en endring som kommer
      // før lagringen er ferdig bygger videre på denne og ikke overskriver den.
      var ny = GolfStore.holeRow(runde.id, hull, {}, { teams: teams });
      var fantes = false;
      for (var i = 0; i < hullRader.length; i++) {
        if (hullRader[i].hole === hull) { hullRader[i] = ny; fantes = true; break; }
      }
      if (!fantes) hullRader.push(ny);
      hullRader.sort(function (a, b) { return a.hole - b.hole; });
      runde.holesPlayed = sc().ferdigeHull(hullRader, lag.length);
      return GolfStore.putHole(ny).then(function () {
        return GolfStore.saveRound(runde);
      });
    }

    /* ---- skjermen ---------------------------------------------------- */

    var stillingStripe, hullBoks, navKnapper, avsluttBoks, scoreboardBoks;

    function bygg() {
      stillingStripe = el('div', { class: 'standing' });
      hullBoks = el('div', { class: 'stack' });
      navKnapper = el('div', { class: 'hole-nav' });
      avsluttBoks = el('div', { class: 'stack' });
      scoreboardBoks = el('section', { class: 'stack' });

      wrap.appendChild(stillingStripe);
      wrap.appendChild(hullBoks);
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

    function tegnStilling() {
      UI.clear(stillingStripe);
      var st = sc().stilling(hullRader, lag.length);
      lag.forEach(function (l, i) {
        var sum = sc().total(hullRader, i, lag.length);
        var diff = sc().motPar(hullRader, i, bane && bane.pars, lag.length);
        var leder = lag.length > 1 &&
          st.filter(function (r) { return r.place === 1; })
            .some(function (r) { return r.teamIndex === i; }) && sum > 0;
        stillingStripe.appendChild(el('div', {
          class: 'standing-item' + (leder ? ' is-leader' : '')
        }, [
          el('span', { class: 'standing-name', text: l.name }),
          el('span', { class: 'standing-points num', text: String(sum) }),
          diff !== null ? el('span', { class: 'standing-par muted num',
            text: sc().motParTekst(diff) }) : null
        ]));
      });
    }

    function tegnHull() {
      UI.clear(hullBoks);
      var p = par(hullNr);

      hullBoks.appendChild(el('div', { class: 'hole-head' }, [
        el('span', { class: 'hole-title', text: 'Hull ' + hullNr }),
        el('span', { class: 'hole-of muted', text: 'av ' + runde.holes }),
        p ? el('span', { class: 'badge badge-solo', text: 'Par ' + p }) : null
      ]));

      lag.forEach(function (l, i) { hullBoks.appendChild(lagKort(l, i)); });
    }

    function lagKort(l, lagIndex) {
      var kort = el('section', { class: 'card stack' });
      var d = lagVerdi(hullNr, lagIndex);
      var parVerdi = par(hullNr);

      // Handlingene leser alltid det som ligger lagret nå, ikke det som lå
      // der da kortet ble tegnet.
      function naa() { return lagVerdi(hullNr, lagIndex); }

      function lagreOgTegn(endring, alt) {
        return lagre(hullNr, lagIndex, endring).then(function () {
          if (alt) { tegnStilling(); tegnAvslutt(); }
          tegnHull(); tegnScoreboard();
        });
      }

      if (lag.length > 1) {
        kort.appendChild(el('div', { class: 'team-head' }, [
          el('span', { class: 'badge badge-solo', text: 'Lag ' + (lagIndex + 1) }),
          el('span', { class: 'team-name', text: l.name })
        ]));
      }

      /* --- slag --- */
      var felt = el('input', {
        type: 'number', class: 'stroke-input num', min: '1', max: '20',
        inputmode: 'numeric', 'aria-label': 'Slag for ' + l.name,
        value: d.strokes === null || d.strokes === undefined ? '' : String(d.strokes),
        onfocus: function () { felt.select(); },
        onchange: function () {
          var n = parseInt(felt.value, 10);
          skrivSlag(isNaN(n) || n < 1 ? null : Math.min(n, 20));
        }
      });

      // Merket følger slagene. Med par på hullet setter appen birdie og
      // eagle selv, og tar dem bort igjen hvis slagene rettes. Ett slag gir
      // hole in one.
      function skrivSlag(n) {
        felt.value = n === null ? '' : String(n);
        var gml = naa();
        var merke = sc().merkeForSlag(n, par(hullNr), gml.mark);
        var endring = { strokes: n, mark: merke };
        if (merke !== gml.mark) {
          // Hole in one er én spillers slag, og det er utslaget som går i hull.
          endring.solo = merke === 'hio' ? (gml.driveBy || null) : null;
        }
        lagreOgTegn(endring, true);
      }

      function juster(retning) {
        var gml = naa().strokes;
        if (gml === null || gml === undefined) {
          skrivSlag(par(hullNr) || 4);
          return;
        }
        skrivSlag(Math.max(1, Math.min(20, gml + retning)));
      }

      kort.appendChild(el('div', { class: 'stroke-row' }, [
        el('span', { class: 'stroke-name', text: 'Slag på hullet' }),
        el('div', { class: 'stepper' }, [
          el('button', { type: 'button', text: '−',
            'aria-label': 'Ett slag mindre', onclick: function () { juster(-1); } }),
          felt,
          el('button', { type: 'button', text: '+',
            'aria-label': 'Ett slag mer', onclick: function () { juster(1); } })
        ])
      ]));

      /* --- hvem sitt utslag --- */
      var utslagRad = el('div', { class: 'chip-row' });
      l.playerIds.forEach(function (pid) {
        var p = GolfStore.player(pid);
        utslagRad.appendChild(el('button', {
          type: 'button', class: 'chip chip-avatar',
          'aria-pressed': String(d.driveBy === pid),
          onclick: function () {
            var gml = naa();
            var ny = gml.driveBy === pid ? null : pid;
            var endring = { driveBy: ny };
            // Ved hole in one følger spilleren utslaget, med mindre noen
            // annen allerede er valgt med vilje.
            if (gml.mark === 'hio' && ny && (!gml.solo || gml.solo === gml.driveBy)) {
              endring.solo = ny;
            }
            lagreOgTegn(endring, false);
          }
        }, [
          UI.avatar(p ? p.avatarId : 'rev', 28),
          el('span', { text: p ? p.name : 'Ukjent' })
        ]));
      });
      kort.appendChild(el('div', { class: 'stack-tight' }, [
        el('p', { class: 'label', text: 'Hvem sitt utslag brukte dere?' }),
        utslagRad
      ]));

      /* --- birdie, eagle og hole in one --- */
      var merkeBoks = merkeValg(d, parVerdi, lagreOgTegn, naa);
      if (merkeBoks) kort.appendChild(merkeBoks);

      /* --- solo --- */
      if (d.mark) {
        var erHio = d.mark === 'hio';
        var soloRad = el('div', { class: 'chip-row' });
        l.playerIds.forEach(function (pid) {
          var p2 = GolfStore.player(pid);
          soloRad.appendChild(el('button', {
            type: 'button', class: 'chip chip-avatar',
            'aria-pressed': String(d.solo === pid),
            onclick: function () {
              var gml = naa();
              // Ved hole in one kan man bytte spiller, men ikke fjerne den.
              var ny = gml.solo === pid ? (erHio ? pid : null) : pid;
              lagreOgTegn({ solo: ny }, false);
            }
          }, [
            UI.avatar(p2 ? p2.avatarId : 'rev', 28),
            el('span', { text: p2 ? p2.name : 'Ukjent' })
          ]));
        });

        if (!erHio) {
          soloRad.appendChild(el('button', {
            type: 'button', class: 'chip',
            'aria-pressed': String(!d.solo),
            text: 'Ingen solo',
            onclick: function () { lagreOgTegn({ solo: null }, false); }
          }));
        }

        kort.appendChild(el('div', { class: 'stack-tight' }, [
          el('p', { class: 'label', text: erHio
            ? 'Hvem slo hole in one?'
            : 'Solo ' + sc().merkeNavn(d.mark).toLowerCase() + '?' }),
          el('p', { class: erHio && !d.solo ? 'warn-text small' : 'muted small', text: erHio
            ? (d.solo ? 'En hole in one er alltid én spillers slag.'
                      : 'Må fylles ut. En hole in one er alltid én spillers slag.')
            : 'Var det én spiller som sto for det alene? Hopp over hvis ikke.' }),
          soloRad
        ]));
      }

      return kort;
    }

    /* Hva som vises om birdie, eagle og hole in one:
       - Ingen slag registrert: ingenting.
       - Hullet har par: appen setter merket selv. Par eller mer gir ingen
         merke, og da vises ingenting her. Ett slag gir hole in one, som er
         det eneste man kan velge bort.
       - Hullet har ikke par: birdie og eagle velges manuelt, og hole in one
         kommer bare opp ved ett slag. */
    function merkeValg(d, parVerdi, lagreOgTegn, naa) {
      var n = d.strokes;
      if (typeof n !== 'number') return null;

      if (parVerdi) {
        var fraPar = sc().merkeFraPar(n, parVerdi);
        if (n === 1) {
          var hio = d.mark === 'hio';
          return el('div', { class: 'stack-tight' }, [
            el('p', { class: 'label', text: 'Hole in one' }),
            el('div', { class: 'chip-row' }, [
              el('button', {
                type: 'button', class: 'chip', 'aria-pressed': String(hio),
                text: 'Hole in one',
                onclick: function () {
                  var gml = naa();
                  var erNaa = gml.mark === 'hio';
                  lagreOgTegn({
                    mark: erNaa ? fraPar : 'hio',
                    solo: erNaa ? null : (gml.solo || gml.driveBy || null)
                  }, false);
                }
              })
            ]),
            el('p', { class: 'muted small', text: hio
              ? 'Ett slag er registrert som hole in one. Trykk for å ta det bort.'
              : (fraPar ? 'Registrert som ' + sc().merkeNavn(fraPar).toLowerCase() +
                          ' ut fra par ' + parVerdi + '. ' : '') +
                'Trykk hvis det var hole in one.' })
          ]);
        }
        if (!fraPar) return null;
        return el('div', { class: 'stack-tight' }, [
          el('p', { class: 'label', text: 'Markert automatisk' }),
          el('div', { class: 'chip-row' }, [
            el('span', { class: 'badge badge-' + fraPar, text: sc().merkeNavn(fraPar) })
          ]),
          el('p', { class: 'muted small', text:
            n + ' slag på par ' + parVerdi + ' er ' + sc().merkeNavn(fraPar).toLowerCase() + '.' })
        ]);
      }

      // Uten par: manuelt valg.
      var valg = sc().MERKER.filter(function (m) { return m.id !== 'hio' || n === 1; });
      var knapper = el('div', { class: 'chip-row' });
      valg.forEach(function (m) {
        knapper.appendChild(el('button', {
          type: 'button', class: 'chip',
          'aria-pressed': String(d.mark === m.id),
          text: m.navn,
          onclick: function () {
            var gml = naa();
            var ny = gml.mark === m.id ? null : m.id;
            var solo = ny === gml.mark ? gml.solo : null;
            if (ny === 'hio') solo = gml.solo || gml.driveBy || null;
            lagreOgTegn({ mark: ny, solo: solo }, false);
          }
        }));
      });
      return el('div', { class: 'stack-tight' }, [
        el('p', { class: 'label', text: n === 1 ? 'Birdie, eagle eller hole in one?' : 'Birdie eller eagle?' }),
        el('p', { class: 'muted small', text:
          'Banen har ikke par, så dette velges manuelt. Legg inn par på banen, så markerer appen det selv.' }),
        knapper
      ]);
    }

    function tegnNav() {
      UI.clear(navKnapper);
      navKnapper.appendChild(el('button', {
        class: 'btn btn-secondary', text: '‹ Forrige', disabled: hullNr <= 1,
        onclick: function () { gaaTilHull(hullNr - 1); }
      }));
      navKnapper.appendChild(el('button', {
        class: 'btn btn-primary', text: 'Neste ›', disabled: hullNr >= runde.holes,
        onclick: function () { gaaTilHull(hullNr + 1); }
      }));
    }

    function tegnAvslutt() {
      UI.clear(avsluttBoks);
      var ferdige = sc().ferdigeHull(hullRader, lag.length);
      avsluttBoks.appendChild(el('p', { class: 'muted center', text:
        ferdige + ' av ' + runde.holes + ' hull er ferdig registrert.' }));
      avsluttBoks.appendChild(el('button', {
        class: 'btn btn-primary btn-lg btn-block', text: 'Avslutt runden',
        onclick: avsluttRunden
      }));
      avsluttBoks.appendChild(el('button', {
        class: 'btn btn-ghost btn-block',
        text: runde.holes === 18 ? 'Endre til 9 hull' : 'Utvid til 18 hull',
        onclick: endreAntallHull
      }));
    }

    // Hole in one uten spiller ville forsvunnet ut av spillerstatistikken,
    // så vi sier fra før runden lukkes.
    function hioUtenSpiller() {
      var hull = [];
      hullRader.forEach(function (r) {
        (r.teams || []).forEach(function (t) {
          if (t && t.mark === 'hio' && !t.solo) hull.push(r.hole);
        });
      });
      return hull;
    }

    function avsluttRunden() {
      var ferdige = sc().ferdigeHull(hullRader, lag.length);
      if (ferdige === 0) { Screens.ingenHullDialog(runde, nav); return; }
      var mangler = hioUtenSpiller();

      if (mangler.length) {
        UI.confirm({
          title: 'Hole in one mangler spiller',
          body: 'På hull ' + mangler.join(', ') + ' er det registrert hole in one ' +
                'uten at spilleren er pekt ut. Uten spiller havner den ikke i ' +
                'spillerstatistikken.',
          confirmText: 'Gå til hullet',
          cancelText: 'Avslutt likevel'
        }).then(function (gaaTil) {
          if (gaaTil) { gaaTilHull(mangler[0]); return; }
          lukkRunden(ferdige);
        });
        return;
      }

      UI.confirm({
        title: 'Avslutte runden?',
        body: ferdige === runde.holes
          ? 'Resultatet lagres og legger seg i historikken.'
          : 'Bare ' + ferdige + ' av ' + runde.holes + ' hull er ferdig registrert. ' +
            'Hull uten slag på alle lag teller ikke.',
        confirmText: 'Avslutt og lagre'
      }).then(function (ok) {
        if (!ok) return;
        lukkRunden(ferdige);
      });
    }

    function lukkRunden(ferdige) {
      runde.holesPlayed = ferdige;
      return GolfStore.saveRound(runde)
        .then(function () { return GolfStore.setRoundStatus(runde.id, 'fullfort'); })
        .then(function () { nav.erstatt('resultat', { id: runde.id }); });
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
      var ferdige = sc().ferdigeHull(hullRader, lag.length);
      if (ferdige === 0) { Screens.ingenHullDialog(runde, nav); return; }
      // Kutt etter det siste ferdige hullet, så ingen ferdige hull slettes.
      var sisteFerdige = 0;
      for (var h = 1; h <= runde.holes; h++) {
        if (sc().hullFerdig(rad(h), lag.length)) sisteFerdige = h;
      }
      UI.confirm({
        title: 'Gå fra 18 til 9 hull?',
        body: 'Runden avsluttes etter hull ' + sisteFerdige + ', og merkes med faktisk ' +
              'antall hull. ' + ferdige + ' hull er ferdig registrert. Dette kan ikke angres.',
        confirmText: 'Avslutt etter hull ' + sisteFerdige, danger: true
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

    function tegnScoreboard() {
      UI.clear(scoreboardBoks);
      scoreboardBoks.appendChild(el('h2', { text: 'Scorekort' }));
      scoreboardBoks.appendChild(el('p', { class: 'muted small', text:
        'Slag per hull. B, E og HIO er birdie, eagle og hole in one. Trykk på et hullnummer for å gå dit.' }));
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

  Screens['scramble-resultat'] = function (nav, params, runde) {
    var wrap = el('div', { class: 'stack' });
    wrap.appendChild(el('p', { class: 'muted', text: 'Henter resultatet …' }));

    var lag = runde.teams && runde.teams.length
      ? runde.teams
      : [{ name: 'Laget', playerIds: runde.playerIds.slice() }];
    var bane = runde.courseId ? GolfStore.course(runde.courseId) : null;

    GolfStore.holes(runde.id).then(function (hullRader) {
      UI.clear(wrap);
      var st = sc().stilling(hullRader, lag.length);
      var utslag = sc().utslagTelling(hullRader, lag.length);
      var merker = sc().merkeTelling(hullRader, lag.length);

      wrap.appendChild(el('section', { class: 'card stack center' }, [
        el('p', { class: 'label', text: statusTekst(runde.status) }),
        el('h2', { text: runde.courseName }),
        el('p', { class: 'muted', text:
          'Scramble · ' + runde.holes + ' hull · ' + UI.formatDate(runde.startedAt) })
      ]));

      var liste = el('div', { class: 'list' });
      st.forEach(function (r) {
        var l = lag[r.teamIndex];
        var diff = sc().motPar(hullRader, r.teamIndex, bane && bane.pars, lag.length);
        liste.appendChild(el('div', {
          class: 'result-row' + (r.place === 1 && lag.length > 1 ? ' is-winner' : '')
        }, [
          lag.length > 1 ? el('span', { class: 'result-place num', text: r.place + '.' }) : null,
          el('span', { class: 'result-name' }, [
            el('span', { text: l.name }),
            el('span', { class: 'result-shared muted', text:
              l.playerIds.map(function (id) {
                var p = GolfStore.player(id);
                return p ? p.name : 'Ukjent';
              }).join(', ') })
          ]),
          el('span', { class: 'result-points num', text:
            r.strokes + (diff !== null ? ' (' + sc().motParTekst(diff) + ')' : '') })
        ]));
      });
      wrap.appendChild(el('section', { class: 'stack' }, [
        el('h2', { text: 'Resultat' }),
        el('p', { class: 'muted', text: bane && bane.pars
          ? 'Totalt antall slag, og mot par i parentes.'
          : 'Totalt antall slag. Legg inn par på banen for å se mot par.' }),
        liste
      ]));

      var hoydepunkt = el('div', { class: 'list' });
      [['birdie', 'Birdie'], ['eagle', 'Eagle'], ['hio', 'Hole in one']].forEach(function (par2) {
        if (!merker[par2[0]]) return;
        hoydepunkt.appendChild(el('div', { class: 'list-row' }, [
          el('span', { class: 'list-row-main', text: par2[1] }),
          el('span', { class: 'num', text: String(merker[par2[0]]) })
        ]));
      });
      Object.keys(merker.solo).forEach(function (pid) {
        var p = GolfStore.player(pid);
        var s = merker.solo[pid];
        var deler = [];
        if (s.birdie) deler.push(UI.plural(s.birdie, 'solo birdie', 'solo birdier'));
        if (s.eagle) deler.push(UI.plural(s.eagle, 'solo eagle', 'solo eagles'));
        if (s.hio) deler.push(UI.plural(s.hio, 'hole in one', 'hole in one'));
        if (!deler.length) return;
        hoydepunkt.appendChild(el('div', { class: 'list-row' }, [
          UI.avatar(p ? p.avatarId : 'rev', 32),
          el('span', { class: 'list-row-main', text: (p ? p.name : 'Ukjent') + ': ' + deler.join(', ') })
        ]));
      });
      if (hoydepunkt.children.length) {
        wrap.appendChild(el('section', { class: 'stack' }, [
          el('h2', { text: 'Høydepunkter' }), hoydepunkt
        ]));
      }

      var utslagListe = el('div', { class: 'list' });
      runde.playerIds.forEach(function (pid) {
        var p = GolfStore.player(pid);
        utslagListe.appendChild(el('div', { class: 'list-row' }, [
          UI.avatar(p ? p.avatarId : 'rev', 32),
          el('span', { class: 'list-row-main', text: p ? p.name : 'Ukjent' }),
          el('span', { class: 'num', text: String(utslag[pid] || 0) })
        ]));
      });
      wrap.appendChild(el('section', { class: 'stack' }, [
        el('h2', { text: 'Utslag brukt' }),
        el('p', { class: 'muted', text: 'Hvor mange hull laget brukte hver spillers utslag på.' }),
        utslagListe
      ]));

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

  function statusTekst(s) {
    return s === 'fullfort' ? 'Fullført runde'
         : s === 'avbrutt' ? 'Avbrutt runde' : 'Pågående runde';
  }
})(window);
