/* ==========================================================================
   Golfapp - statistikk

   Tre nivåer: Match, Scramble og Baner. Sesong- og banefilteret øverst
   gjelder Match og Scramble. Baner har sitt eget nivå, fordi snitt per hull
   og beste runde bare gir mening per bane.
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;
  var Screens = global.Screens;

  // Valgene huskes mens appen er åpen, slik at man ikke må velge på nytt
  // hver gang man går inn og ut av statistikken.
  var valg = {
    fane: 'match', aar: null, baneId: null, scrambleSort: 'dato',
    oppsett: null,   // match: nøkkelen til et bestemt sett spillere
    lagKey: null     // scramble: nøkkelen til en bestemt lagsammensetning
  };

  // Settes når statistikkskjermen bygges, slik at filtrene kan be om en
  // ny tegning uten å gå veien om ruteren.
  var tegnPaaNytt = null;

  function baneKart() {
    var k = {};
    GolfStore.courses().forEach(function (c) { k[c.id] = c; });
    return k;
  }

  Screens.statistikk = function (nav) {
    var wrap = el('div', { class: 'stack' });
    wrap.appendChild(el('p', { class: 'muted', text: 'Henter statistikk …' }));

    GolfStore.allHoles().then(function (hullKart) {
      UI.clear(wrap);
      var alle = GolfStore.rounds();
      var fullforte = GolfStats.fullforte(alle);

      if (!fullforte.length) {
        wrap.appendChild(UI.emptyState(
          'Ingen fullførte runder ennå',
          'Statistikken fylles opp etter hvert som dere spiller ferdig runder. Avbrutte runder teller ikke.'));
        return;
      }

      /* ---- faner ---- */
      var faner = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Statistikk' }, [
        fane('match', 'Match'), fane('scramble', 'Scramble'), fane('baner', 'Baner')
      ]);
      function fane(id, tekst) {
        return el('button', {
          type: 'button', text: tekst, dataset: { f: id },
          'aria-pressed': String(valg.fane === id),
          onclick: function () { valg.fane = id; tegn(); }
        });
      }
      wrap.appendChild(faner);

      var filterBoks = el('div', { class: 'stack-tight' });
      var innhold = el('div', { class: 'stack' });
      wrap.appendChild(filterBoks);
      wrap.appendChild(innhold);

      tegnPaaNytt = tegn;

      function tegn() {
        Array.prototype.forEach.call(faner.children, function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.f === valg.fane));
        });
        tegnFilter();
        UI.clear(innhold);
        if (valg.fane === 'match') innhold.appendChild(matchFane(hullKart, alle));
        else if (valg.fane === 'scramble') innhold.appendChild(scrambleFane(nav, hullKart, alle));
        else innhold.appendChild(banerFane(nav, hullKart, alle));
      }

      /* ---- filter: sesong og bane ---- */
      function tegnFilter() {
        UI.clear(filterBoks);
        if (valg.fane === 'baner') return;   // Baner har sitt eget valg

        var aar = GolfStats.aarene(alle);
        var baner = GolfStats.baneOversikt(fullforte, GolfStore.courses());

        // Et valgt år eller en valgt bane som ikke lenger har runder, for
        // eksempel etter sletting, slippes. Ellers kan filteret bli stående
        // uten at det vises noen knapp for å ta det bort.
        if (valg.aar !== null && (aar.length < 2 || aar.indexOf(valg.aar) < 0)) valg.aar = null;
        if (valg.baneId !== null && (baner.length < 2 ||
            !baner.some(function (b) { return b.courseId === valg.baneId; }))) valg.baneId = null;

        if (aar.length > 1) {
          var aarRad = el('div', { class: 'chip-row' });
          aarRad.appendChild(filterChip('All time', valg.aar === null, function () {
            valg.aar = null; tegn();
          }));
          aar.forEach(function (a) {
            aarRad.appendChild(filterChip(String(a), valg.aar === a, function () {
              valg.aar = valg.aar === a ? null : a; tegn();
            }));
          });
          filterBoks.appendChild(aarRad);
        }

        if (baner.length > 1) {
          var baneRad = el('div', { class: 'chip-row' });
          baneRad.appendChild(filterChip('Alle baner', valg.baneId === null, function () {
            valg.baneId = null; tegn();
          }));
          baner.forEach(function (b) {
            baneRad.appendChild(filterChip(b.navn, valg.baneId === b.courseId, function () {
              valg.baneId = valg.baneId === b.courseId ? null : b.courseId; tegn();
            }));
          });
          filterBoks.appendChild(baneRad);
        }
      }

      tegn();
    });

    return wrap;
  };

  function filterChip(tekst, aktiv, onclick) {
    return el('button', {
      type: 'button', class: 'chip chip-sm', text: tekst,
      'aria-pressed': String(aktiv), onclick: onclick
    });
  }

  function poengTekst(n) {
    var hel = Math.floor(n);
    if (n === 0) return '0';
    if (hel === 0) return '½';
    return hel + (n % 1 !== 0 ? '½' : '');
  }

  function navnFor(id) {
    var p = GolfStore.player(id);
    return p ? p.name : 'Ukjent';
  }

  function avatarFor(id) {
    var p = GolfStore.player(id);
    return p ? p.avatarId : 'rev';
  }

  /* ======================================================================
     Match
     ====================================================================== */

  function matchFane(hullKart, alle) {
    var boks = el('div', { class: 'stack' });
    var modell = GolfStore.settings().poengmodell;

    // Alle runder i utvalget, uten oppsettfilteret. Brukes til å finne
    // hvilke oppsett som finnes å velge mellom.
    var iUtvalg = GolfStats.filtrer(alle, {
      modus: 'match', aar: valg.aar, baneId: valg.baneId
    });
    var oppsett = GolfStats.matchOppsett(iUtvalg, hullKart, modell);

    // Et oppsett som ikke lenger finnes i utvalget, slippes.
    if (valg.oppsett && !oppsett.some(function (o) { return o.key === valg.oppsett; })) {
      valg.oppsett = null;
    }

    var runder = GolfStats.filtrer(alle, {
      modus: 'match', aar: valg.aar, baneId: valg.baneId, oppsett: valg.oppsett
    });

    if (!iUtvalg.length) {
      boks.appendChild(UI.emptyState('Ingen match-runder i utvalget',
        'Prøv et annet år eller en annen bane.'));
      return boks;
    }

    boks.appendChild(oppsettVelger(oppsett, 'oppsett',
      'Dere er ikke alltid like mange. Velg et oppsett for å se tabellen for akkurat de spillerne, eller hold på alle sammen.'));

    var tabell = GolfStats.matchTabell(runder, hullKart, modell);

    if (!runder.length) {
      boks.appendChild(UI.emptyState('Ingen runder med dette oppsettet', ''));
      return boks;
    }

    boks.appendChild(el('p', { class: 'muted small', text: valg.oppsett
      ? UI.plural(runder.length, 'match', 'matcher') + ' med ' +
        GolfStats.navnListe(tabell.map(function (r) { return r.playerId; }), navnFor) + '.'
      : UI.plural(runder.length, 'match', 'matcher') + ' på tvers av alle oppsett.' }));

    boks.appendChild(seierspall(tabell));

    var t = el('table', { class: 'stat-table' });
    t.appendChild(el('thead', null, el('tr', null, [
      el('th', { text: 'Spiller' }),
      el('th', { text: 'R', title: 'Runder' }),
      el('th', { text: '1.' }), el('th', { text: '2.' }),
      el('th', { text: '3.' }), el('th', { text: '4.' }),
      el('th', { text: 'Poeng' })
    ])));

    var kropp = el('tbody');
    tabell.forEach(function (rad) {
      kropp.appendChild(el('tr', null, [
        el('td', null, el('span', { class: 'sb-player' }, [
          UI.avatar(avatarFor(rad.playerId), 32),
          el('span', { text: navnFor(rad.playerId) })
        ])),
        el('td', { class: 'num', text: String(rad.runder) }),
        el('td', { class: 'num', text: String(rad.plasseringer[0]) }),
        el('td', { class: 'num', text: String(rad.plasseringer[1]) }),
        el('td', { class: 'num', text: String(rad.plasseringer[2]) }),
        el('td', { class: 'num', text: String(rad.plasseringer[3]) }),
        el('td', { class: 'num stat-points' }, [
          el('strong', { text: poengTekst(rad.poeng) }),
          el('span', { class: 'stat-sub', text: rad.poengPerRunde.toFixed(1) + ' per runde' })
        ])
      ]));
    });
    t.appendChild(kropp);
    boks.appendChild(el('div', { class: 'card card-tight scroll' }, t));

    boks.appendChild(el('div', { class: 'stack-tight' }, [
      el('p', { class: 'label', text: 'Slik regnes poengene' }),
      el('p', { class: 'muted small', text: modell === 'fast'
        ? 'Fast modell: vinneren får 3 poeng. Ved tre spillere får nummer to 1 poeng, ved fire får nummer to 2 og nummer tre 1. Deler dere plassering, deles poengene for plassene dere deler på.'
        : 'Skalerende modell: poeng er antall spillere du slår i runden, pluss et halvt for hver du ender likt med. Fire spillere gir 3, 2, 1, 0. Tre gir 2, 1, 0. To gir 1, 0.' }),
      el('p', { class: 'muted small', text:
        'Kolonnene 1. til 4. er antall ganger du har endt på den plasseringen. Deler dere plassering, teller den for begge. Modellen byttes i Innstillinger.' })
    ]));

    return boks;
  }

  /* Velger for oppsett i Match og lag i Scramble. Samme mønster begge
     steder: «Alle» først, deretter ett valg per kombinasjon som faktisk
     har spilt, med antall runder på. */
  function oppsettVelger(liste, felt, forklaring) {
    var rad = el('div', { class: 'chip-row' });
    var valgtVerdi = felt === 'oppsett' ? valg.oppsett : valg.lagKey;

    rad.appendChild(el('button', {
      type: 'button', class: 'chip chip-sm', text: 'Alle',
      'aria-pressed': String(valgtVerdi === null),
      onclick: function () { velg(null); }
    }));

    liste.forEach(function (o) {
      rad.appendChild(el('button', {
        type: 'button', class: 'chip chip-sm',
        'aria-pressed': String(valgtVerdi === o.key),
        text: GolfStats.navnListe(o.playerIds, navnFor) + ' (' + o.runder + ')',
        onclick: function () { velg(valgtVerdi === o.key ? null : o.key); }
      }));
    });

    function velg(v) {
      if (felt === 'oppsett') valg.oppsett = v; else valg.lagKey = v;
      if (tegnPaaNytt) tegnPaaNytt();
    }

    return el('div', { class: 'stack-tight' }, [
      el('p', { class: 'label', text: felt === 'oppsett' ? 'Oppsett' : 'Lag' }),
      el('p', { class: 'muted small', text: forklaring }),
      rad
    ]);
  }

  function seierspall(tabell) {
    var topp = tabell.slice(0, 3);
    if (!topp.length) return el('div');
    // Rekkefølgen på pallen er 2, 1, 3.
    var plasser = [topp[1], topp[0], topp[2]];
    var hoyder = ['pall-2', 'pall-1', 'pall-3'];
    var merker = ['2', '1', '3'];

    var pall = el('div', { class: 'podium' });
    plasser.forEach(function (rad, i) {
      if (!rad) return;
      pall.appendChild(el('div', { class: 'podium-slot' }, [
        UI.avatar(avatarFor(rad.playerId), i === 1 ? 64 : 52),
        el('span', { class: 'podium-name', text: navnFor(rad.playerId) }),
        el('div', { class: 'podium-block ' + hoyder[i] }, [
          el('span', { class: 'podium-place', text: merker[i] }),
          el('span', { class: 'podium-points num', text: poengTekst(rad.poeng) + ' p' })
        ])
      ]));
    });
    return el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Seierspall' }), pall
    ]);
  }

  /* ======================================================================
     Scramble
     ====================================================================== */

  function scrambleFane(nav, hullKart, alle) {
    var boks = el('div', { class: 'stack' });
    var runder = GolfStats.filtrer(alle, {
      modus: 'scramble', aar: valg.aar, baneId: valg.baneId
    });

    if (!runder.length) {
      boks.appendChild(UI.emptyState('Ingen scramble-runder i utvalget',
        'Prøv et annet år eller en annen bane.'));
      return boks;
    }

    var bk = baneKart();
    var lagListe = GolfStats.scrambleLag(runder, hullKart, bk);

    if (valg.lagKey && !lagListe.some(function (l) { return l.key === valg.lagKey; })) {
      valg.lagKey = null;
    }

    boks.appendChild(oppsettVelger(lagListe, 'lag',
      'Lagene varierer fra gang til gang. Velg et lag for å se hvordan akkurat den sammensetningen gjør det, eller hold på alle.'));

    if (valg.lagKey) {
      boks.appendChild(lagDetaljSeksjon(nav, valg.lagKey, runder, hullKart, bk));
      return boks;
    }

    /* ---- sammenligning av lag ---- */
    if (lagListe.length > 1) {
      var lt = el('table', { class: 'stat-table' });
      lt.appendChild(el('thead', null, el('tr', null, [
        el('th', { text: 'Lag' }),
        el('th', { text: 'R', title: 'Runder' }),
        el('th', { text: 'Beste' }),
        el('th', { text: 'Snitt' })
      ])));
      var lk = el('tbody');
      lagListe.forEach(function (l) {
        lk.appendChild(el('tr', {
          class: 'klikkbar',
          onclick: function () { valg.lagKey = l.key; if (tegnPaaNytt) tegnPaaNytt(); }
        }, [
          el('td', null, el('span', { class: 'sb-player' },
            l.playerIds.map(function (id) { return UI.avatar(avatarFor(id), 26); })
              .concat([el('span', { text: GolfStats.navnListe(l.playerIds, navnFor) })]))),
          el('td', { class: 'num', text: String(l.runder) }),
          el('td', { class: 'num', text: String(l.beste) }),
          el('td', { class: 'num stat-points' }, [
            el('strong', { text: l.snitt.toFixed(1) }),
            l.motParSnitt !== null ? el('span', { class: 'stat-sub', text:
              GolfScramble.motParTekst(Math.round(l.motParSnitt * 10) / 10) }) : null
          ])
        ]));
      });
      lt.appendChild(lk);
      boks.appendChild(el('section', { class: 'stack-tight' }, [
        el('h2', { text: 'Lag' }),
        el('div', { class: 'card card-tight scroll' }, lt),
        el('p', { class: 'muted small', text:
          'Beste og snitt er totalscore for laget på runder med 18 hull, eller 9 hull for lag som ikke har spilt 18. Tallet under snittet er mot par. Trykk på en rad for å se laget nærmere.' })
      ]));
    }

    /* ---- spilleroversikt ---- */
    var spillere = GolfStats.scrambleSpillere(runder, hullKart);
    var t = el('table', { class: 'stat-table' });
    t.appendChild(el('thead', null, el('tr', null, [
      el('th', { text: 'Spiller' }),
      el('th', { text: 'R', title: 'Runder' }),
      el('th', { text: 'Utslag' }),
      el('th', { text: 'Solo' }),
      el('th', { text: 'HIO', title: 'Hole in one' })
    ])));
    var kropp = el('tbody');
    spillere.forEach(function (rad) {
      var solo = rad.soloBirdie + rad.soloEagle;
      kropp.appendChild(el('tr', null, [
        el('td', null, el('span', { class: 'sb-player' }, [
          UI.avatar(avatarFor(rad.playerId), 32),
          el('span', { text: navnFor(rad.playerId) })
        ])),
        el('td', { class: 'num', text: String(rad.runder) }),
        el('td', { class: 'num stat-points' }, [
          el('strong', { text: String(rad.utslag) }),
          el('span', { class: 'stat-sub', text: Math.round(rad.utslagAndel * 100) + ' %' })
        ]),
        el('td', { class: 'num stat-points' }, [
          el('strong', { text: String(solo) }),
          el('span', { class: 'stat-sub', text: rad.soloBirdie + 'B / ' + rad.soloEagle + 'E' })
        ]),
        el('td', { class: 'num', text: String(rad.hio) })
      ]));
    });
    t.appendChild(kropp);

    boks.appendChild(el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Spillere' }),
      el('div', { class: 'card card-tight scroll' }, t),
      el('p', { class: 'muted small', text:
        'Utslag er antall hull laget brukte spillerens utslag på, og andelen av hullene det utgjør. Solo er solo birdie og solo eagle til sammen, delt opp under. HIO er hole in one.' })
    ]));

    /* ---- rundekort ---- */
    var sortRad = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Sortering' }, [
      sortKnapp('dato', 'Nyeste først'), sortKnapp('score', 'Laveste score')
    ]);
    function sortKnapp(id, tekst) {
      return el('button', {
        type: 'button', text: tekst, dataset: { s: id },
        'aria-pressed': String(valg.scrambleSort === id),
        onclick: function () {
          valg.scrambleSort = id;
          Array.prototype.forEach.call(sortRad.children, function (b) {
            b.setAttribute('aria-pressed', String(b.dataset.s === id));
          });
          tegnKort();
        }
      });
    }

    var kortBoks = el('div', { class: 'stack' });
    function tegnKort() {
      UI.clear(kortBoks);
      GolfStats.scrambleRunder(runder, hullKart, valg.scrambleSort).forEach(function (k) {
        kortBoks.appendChild(scrambleKort(k, nav));
      });
    }
    tegnKort();

    boks.appendChild(el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Runder' }),
      sortRad,
      kortBoks
    ]));

    return boks;
  }

  /* Ett bestemt lag: nøkkeltall, hva hver spiller bidro med i nettopp
     dette laget, og rundene laget har spilt. */
  function lagDetaljSeksjon(nav, key, runder, hullKart, bk) {
    var d = GolfStats.lagDetalj(key, runder, hullKart, bk);
    var boks = el('div', { class: 'stack' });

    boks.appendChild(el('section', { class: 'card stack center' }, [
      el('div', { class: 'team-avatars' },
        d.playerIds.map(function (id) { return UI.avatar(avatarFor(id), 48); })),
      el('h2', { text: GolfStats.navnListe(d.playerIds, navnFor) })
    ]));

    boks.appendChild(el('div', { class: 'keyfigures' }, [
      nokkeltall('Runder', String(d.runder)),
      nokkeltall('Beste', d.beste !== null ? String(d.beste) : '–',
        d.hullISnitt ? d.hullISnitt + ' hull' : null),
      nokkeltall('Snitt', d.snitt !== null ? d.snitt.toFixed(1) : '–',
        d.motParSnitt !== null
          ? GolfScramble.motParTekst(Math.round(d.motParSnitt * 10) / 10) + ' mot par'
          : null)
    ]));

    var t = el('table', { class: 'stat-table' });
    t.appendChild(el('thead', null, el('tr', null, [
      el('th', { text: 'Spiller' }),
      el('th', { text: 'Utslag' }),
      el('th', { text: 'Solo' }),
      el('th', { text: 'HIO', title: 'Hole in one' })
    ])));
    var kropp = el('tbody');
    d.spillere.forEach(function (s) {
      kropp.appendChild(el('tr', null, [
        el('td', null, el('span', { class: 'sb-player' }, [
          UI.avatar(avatarFor(s.playerId), 32),
          el('span', { text: navnFor(s.playerId) })
        ])),
        el('td', { class: 'num stat-points' }, [
          el('strong', { text: String(s.utslag) }),
          el('span', { class: 'stat-sub', text: Math.round(s.utslagAndel * 100) + ' %' })
        ]),
        el('td', { class: 'num stat-points' }, [
          el('strong', { text: String(s.soloBirdie + s.soloEagle) }),
          el('span', { class: 'stat-sub', text: s.soloBirdie + 'B / ' + s.soloEagle + 'E' })
        ]),
        el('td', { class: 'num', text: String(s.hio) })
      ]));
    });
    t.appendChild(kropp);

    boks.appendChild(el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'I dette laget' }),
      el('div', { class: 'card card-tight scroll' }, t),
      el('p', { class: 'muted small', text:
        'Tallene gjelder bare rundene der nettopp disse spillerne var på lag sammen.' })
    ]));

    var rundeBoks = el('div', { class: 'stack' });
    d.rader.forEach(function (x) {
      rundeBoks.appendChild(el('button', {
        class: 'round-card',
        onclick: function () { nav('resultat', { id: x.runde.id }); }
      }, [
        el('div', { class: 'round-card-top' }, [
          el('span', { class: 'round-card-date', text: UI.formatDate(x.runde.startedAt) }),
          el('span', { class: 'badge badge-solo', text: x.runde.holes + ' hull' })
        ]),
        el('div', { class: 'round-card-score' }, [
          el('span', { class: 'score-big num', text: String(x.total) }),
          x.motPar !== null
            ? el('span', { class: 'score-par muted num', text: GolfScramble.motParTekst(x.motPar) })
            : null,
          el('span', { class: 'round-card-course', text: x.runde.courseName })
        ])
      ]));
    });
    boks.appendChild(el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Runder' }), rundeBoks
    ]));

    return boks;
  }

  function scrambleKort(k, nav) {
    var r = k.runde;
    var navn = r.playerIds.map(navnFor).join(', ');
    var motPar = k.besteMotPar;

    return el('button', {
      class: 'round-card', onclick: function () { nav('resultat', { id: r.id }); }
    }, [
      el('div', { class: 'round-card-top' }, [
        el('span', { class: 'round-card-date', text: UI.formatDate(r.startedAt) }),
        el('span', { class: 'badge badge-solo', text: r.holes + ' hull' })
      ]),
      el('div', { class: 'round-card-score' }, [
        el('span', { class: 'score-big num', text: String(k.beste) }),
        motPar !== null
          ? el('span', { class: 'score-par muted num', text: GolfScramble.motParTekst(motPar) })
          : null,
        el('span', { class: 'round-card-course', text: r.courseName })
      ]),
      el('span', { class: 'round-card-players muted', text: navn }),
      k.totaler.length > 1
        ? el('span', { class: 'round-card-players muted', text:
            k.totaler.map(function (t) { return t.navn + ' ' + t.total; }).join(' · ') })
        : null
    ]);
  }

  /* ======================================================================
     Baner
     ====================================================================== */

  function banerFane(nav, hullKart, alle) {
    var boks = el('div', { class: 'stack' });
    var fullforte = GolfStats.fullforte(alle);
    var baner = GolfStats.baneOversikt(fullforte, GolfStore.courses());

    if (!baner.length) {
      boks.appendChild(UI.emptyState('Ingen baner med fullførte runder',
        'Banestatistikken fylles opp etter hvert som dere spiller.'));
      return boks;
    }

    var liste = el('div', { class: 'list' });
    baner.forEach(function (b) {
      liste.appendChild(el('button', {
        class: 'list-row',
        onclick: function () { nav('bane-statistikk', { id: b.courseId }); }
      }, [
        el('span', { class: 'list-row-main' }, [
          el('span', { class: 'list-row-title', text: b.navn }),
          el('span', { class: 'list-row-sub muted', text:
            [b.scramble ? UI.plural(b.scramble, 'scramble', 'scramble') : null,
             b.match ? UI.plural(b.match, 'match', 'matcher') : null]
              .filter(Boolean).join(' · ') })
        ]),
        el('span', { class: 'list-row-chevron', text: '›' })
      ]));
    });
    boks.appendChild(liste);
    return boks;
  }

  /* ---- én bane -------------------------------------------------------- */

  Screens['bane-statistikk'] = function (nav, params) {
    var wrap = el('div', { class: 'stack' });
    wrap.appendChild(el('p', { class: 'muted', text: 'Henter banen …' }));

    GolfStore.allHoles().then(function (hullKart) {
      UI.clear(wrap);
      var bane = GolfStore.course(params.id);
      var fullforte = GolfStats.fullforte(GolfStore.rounds());

      if (!bane) {
        // Banen kan være slettet. Rundene beholder navnet sitt.
        var navnFraRunde = null;
        fullforte.forEach(function (r) { if (r.courseId === params.id) navnFraRunde = r.courseName; });
        wrap.appendChild(UI.emptyState('Banen er slettet',
          navnFraRunde ? 'Rundene på ' + navnFraRunde + ' ligger fortsatt i historikken.' : ''));
        return;
      }

      var d = GolfStats.baneDetalj(bane, fullforte, hullKart);

      wrap.appendChild(el('section', { class: 'card stack center' }, [
        el('h2', { text: bane.name }),
        el('p', { class: 'muted', text: bane.holes + ' hull' +
          (bane.pars ? ' · par ' + bane.pars.reduce(function (a, b) { return a + b; }, 0) : ' · uten par') })
      ]));

      /* ---- scramble ---- */
      if (d.scrambleRunder) {
        var toppRad = el('div', { class: 'keyfigures' }, [
          nokkeltall('Runder', String(d.scrambleRunder)),
          nokkeltall('Beste', d.beste ? String(d.beste.total) : '–',
            d.beste ? d.beste.lagNavn + ', ' + UI.formatDate(d.beste.runde.startedAt) : null),
          nokkeltall('Snitt', d.snitt !== null ? d.snitt.toFixed(1) : '–',
            d.hullISnitt ? d.hullISnitt + ' hull' : null)
        ]);
        wrap.appendChild(el('section', { class: 'stack-tight' }, [
          el('h2', { text: 'Scramble' }), toppRad
        ]));

        wrap.appendChild(perHullSeksjon(d));
      }

      /* ---- match ---- */
      if (d.matchRunder) {
        var vinnerliste = el('div', { class: 'list' });
        d.matchVinnere.forEach(function (v) {
          vinnerliste.appendChild(el('div', { class: 'list-row' }, [
            UI.avatar(avatarFor(v.playerId), 32),
            el('span', { class: 'list-row-main', text: navnFor(v.playerId) }),
            el('span', { class: 'num', text: UI.plural(v.seire, 'seier', 'seire') })
          ]));
        });
        wrap.appendChild(el('section', { class: 'stack-tight' }, [
          el('h2', { text: 'Match' }),
          el('p', { class: 'muted small', text:
            UI.plural(d.matchRunder, 'runde spilt', 'runder spilt') + ' på banen.' }),
          d.matchVinnere.length ? vinnerliste
            : el('p', { class: 'muted', text: 'Ingen avgjorte matcher ennå.' })
        ]));
      }

      if (!d.scrambleRunder && !d.matchRunder) {
        wrap.appendChild(UI.emptyState('Ingen fullførte runder på banen ennå', ''));
      }
    });

    return wrap;
  };

  function nokkeltall(etikett, verdi, under) {
    return el('div', { class: 'keyfigure' }, [
      el('span', { class: 'keyfigure-label', text: etikett }),
      el('span', { class: 'keyfigure-value num', text: verdi }),
      under ? el('span', { class: 'keyfigure-sub', text: under }) : null
    ]);
  }

  // Snitt per hull. Uten par viser vi bare snittet, med par viser vi hvor
  // mange slag hullet koster dere over eller under par.
  function perHullSeksjon(d) {
    var medData = d.perHull.filter(function (h) { return h.snitt !== null; });
    if (!medData.length) {
      return el('p', { class: 'muted', text: 'Ingen registrerte hull ennå.' });
    }

    var harPar = medData.some(function (h) { return h.motPar !== null; });
    var maks = Math.max.apply(null, medData.map(function (h) {
      return harPar ? Math.abs(h.motPar) : h.snitt;
    })) || 1;

    var liste = el('div', { class: 'hole-bars' + (harPar ? ' fra-null' : '') });
    d.perHull.forEach(function (h) {
      if (h.snitt === null) return;

      var spor;
      if (harPar) {
        // Med par tegnes stolpene ut fra null i midten, slik at et hull
        // under par og et over par er direkte sammenlignbare.
        var bredde = Math.round(Math.abs(h.motPar) / maks * 50);
        spor = el('span', { class: 'hole-bar-track' }, [
          el('span', { class: 'hole-bar-zero' }),
          h.motPar === 0 ? null : el('span', {
            class: 'hole-bar-fill ' + (h.motPar > 0 ? 'is-over' : 'is-under'),
            style: 'width:' + Math.max(2, bredde) + '%'
          })
        ]);
      } else {
        spor = el('span', { class: 'hole-bar-track' },
          el('span', {
            class: 'hole-bar-fill is-plain',
            style: 'width:' + Math.max(4, Math.round(h.snitt / maks * 100)) + '%'
          }));
      }

      liste.appendChild(el('div', { class: 'hole-bar' }, [
        el('span', { class: 'hole-bar-nr num', text: String(h.hole) }),
        el('span', { class: 'hole-bar-par muted', text: h.par ? 'par ' + h.par : '' }),
        spor,
        el('span', { class: 'hole-bar-value num', text:
          harPar ? (h.motPar > 0 ? '+' : '') + h.motPar.toFixed(1) : h.snitt.toFixed(1) })
      ]));
    });

    return el('section', { class: 'stack-tight' }, [
      el('h2', { text: 'Snitt per hull' }),
      el('p', { class: 'muted small', text: harPar
        ? 'Hvor mange slag over eller under par hullet gir dere i snitt. Tallet står til høyre, så fargen er bare et hjelpemiddel.'
        : 'Snitt antall slag per hull. Legg inn par på banen for å se hvor mange slag over eller under par hullene gir.' }),
      liste
    ]);
  }
})(window);
