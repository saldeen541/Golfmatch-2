/* ==========================================================================
   Golfapp - skjermbilder

   Hver skjerm er en funksjon som bygger innholdet sitt og returnerer en
   node. Ruteren i app.js bytter mellom dem.
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;
  var Screens = {};

  /* ======================================================================
     Hjem
     ====================================================================== */

  Screens.hjem = function (nav) {
    var wrap = el('div', { class: 'stack' });
    var aktiv = GolfStore.activeRound();

    if (aktiv) {
      wrap.appendChild(el('section', { class: 'card card-accent' }, [
        el('p', { class: 'label', text: 'Pågående runde' }),
        el('h2', { text: aktiv.courseName }),
        el('p', { class: 'muted', text:
          (aktiv.mode === 'match' ? 'Match' : 'Scramble') + ' · ' +
          aktiv.holes + ' hull · startet ' + UI.formatDate(aktiv.startedAt) }),
        el('div', { class: 'row gap' }, [
          el('button', {
            class: 'btn btn-primary', text: 'Fortsett',
            onclick: function () { nav('runde', { id: aktiv.id }); }
          }),
          el('button', {
            class: 'btn btn-ghost', text: 'Avbryt runden',
            onclick: function () { avbrytRunde(aktiv, nav); }
          })
        ])
      ]));
    } else {
      wrap.appendChild(el('button', {
        class: 'btn btn-primary btn-lg btn-block',
        text: 'Ny runde',
        onclick: function () { nav('ny-runde'); }
      }));
    }

    if (GolfStore.backupDue()) {
      wrap.appendChild(el('section', { class: 'notice' }, [
        el('p', { text: 'Det er ' +
          UI.plural(GolfStore.settings().roundsSinceBackup, 'runde', 'runder') +
          ' siden sist du tok sikkerhetskopi.' }),
        el('button', {
          class: 'btn btn-secondary', text: 'Ta kopi nå',
          onclick: function () { taKopi(); }
        })
      ]));
    }

    wrap.appendChild(el('div', { class: 'tiles' }, [
      tile('Spillere', GolfStore.players().length + ' registrert', function () { nav('spillere'); }),
      tile('Baner', GolfStore.courses().length + ' lagret', function () { nav('baner'); })
    ]));

    var ferdige = GolfStore.rounds().filter(function (r) { return r.status !== 'pagar'; });
    var hist = el('section', { class: 'stack' }, [
      el('div', { class: 'section-head' }, [
        el('h2', { text: 'Siste runder' }),
        ferdige.length > 5 ? el('button', {
          class: 'btn btn-ghost btn-sm', text: 'Se alle',
          onclick: function () { nav('historikk'); }
        }) : null
      ])
    ]);
    if (!ferdige.length) {
      hist.appendChild(UI.emptyState(
        'Ingen runder ennå',
        'Når dere har spilt ferdig en runde, dukker den opp her.'));
    } else {
      ferdige.slice(0, 5).forEach(function (r) { hist.appendChild(rundeKort(r, nav)); });
      if (ferdige.length > 5) {
        hist.appendChild(el('button', {
          class: 'btn btn-secondary btn-block',
          text: 'Se alle ' + ferdige.length + ' runder',
          onclick: function () { nav('historikk'); }
        }));
      }
    }
    wrap.appendChild(hist);

    return wrap;
  };

  function tile(title, sub, onclick) {
    return el('button', { class: 'tile', onclick: onclick }, [
      el('span', { class: 'tile-title', text: title }),
      el('span', { class: 'tile-sub', text: sub })
    ]);
  }

  function rundeKort(r, nav) {
    var navn = r.playerIds.map(function (id) {
      var p = GolfStore.player(id);
      return p ? p.name : 'Ukjent';
    });
    return el('button', { class: 'round-card', onclick: function () { nav('runde', { id: r.id }); } }, [
      el('div', { class: 'round-card-top' }, [
        el('span', { class: 'round-card-date', text: UI.formatDate(r.startedAt) }),
        r.status === 'avbrutt'
          ? el('span', { class: 'badge badge-avbrutt', text: 'Avbrutt' })
          : el('span', { class: 'badge badge-solo', text: r.mode === 'match' ? 'Match' : 'Scramble' })
      ]),
      el('span', { class: 'round-card-course', text: r.courseName }),
      el('span', { class: 'round-card-players muted', text: navn.join(', ') })
    ]);
  }

  function avbrytRunde(runde, nav) {
    UI.confirm({
      title: 'Avbryte runden?',
      body: 'Runden blir liggende i historikken merket som avbrutt, men teller ikke i statistikken.',
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
  }

  Screens.avbrytRunde = avbrytRunde;

  function taKopi() {
    GolfBackup.exportBackup().then(function (hvordan) {
      if (hvordan === 'avbrutt') return;
      UI.toast('Sikkerhetskopi ' + hvordan);
      if (global.GolfApp) GolfApp.nav.rot('hjem');
    }).catch(function () {
      UI.toast('Klarte ikke å lage kopi');
    });
  }

  /* ======================================================================
     Spillere
     ====================================================================== */

  Screens.spillere = function (nav) {
    var wrap = el('div', { class: 'stack' });
    var aktive = GolfStore.players();
    var arkiverte = GolfStore.players(true).filter(function (p) { return p.archived; });

    wrap.appendChild(el('button', {
      class: 'btn btn-primary btn-block',
      text: 'Ny spiller',
      onclick: function () { nav('spiller'); }
    }));

    if (!aktive.length) {
      wrap.appendChild(UI.emptyState(
        'Ingen spillere ennå',
        'Legg inn dere som pleier å spille sammen. Spillerne gjenbrukes i alle runder.'));
    } else {
      var liste = el('section', { class: 'list' });
      aktive.forEach(function (p, i) {
        liste.appendChild(el('button', {
          class: 'list-row',
          onclick: function () { nav('spiller', { id: p.id }); }
        }, [
          UI.avatar(p.avatarId, 40, UI.playerColorVar(i)),
          el('span', { class: 'list-row-main', text: p.name }),
          el('span', { class: 'list-row-chevron', text: '›' })
        ]));
      });
      wrap.appendChild(liste);
    }

    if (arkiverte.length) {
      var arkiv = el('section', { class: 'stack' }, [
        el('h2', { text: 'Arkiverte' }),
        el('p', { class: 'muted', text:
          'Arkiverte spillere er ikke med i nye runder, men blir stående i gamle runder og i statistikken.' })
      ]);
      var aliste = el('div', { class: 'list' });
      arkiverte.forEach(function (p) {
        aliste.appendChild(el('div', { class: 'list-row' }, [
          UI.avatar(p.avatarId, 40),
          el('span', { class: 'list-row-main muted', text: p.name }),
          el('button', {
            class: 'btn btn-ghost btn-sm', text: 'Hent tilbake',
            onclick: function () {
              GolfStore.setPlayerArchived(p.id, false).then(function () {
                UI.toast(p.name + ' er tilbake');
                nav.erstatt('spillere');
              });
            }
          })
        ]));
      });
      arkiv.appendChild(aliste);
      wrap.appendChild(arkiv);
    }

    return wrap;
  };

  /* ---- ny eller endre spiller ---------------------------------------- */

  Screens.spiller = function (nav, params) {
    var eksisterende = params.id ? GolfStore.player(params.id) : null;
    var valgtAvatar = eksisterende ? eksisterende.avatarId : GolfAvatars.list[0].id;

    var navnFelt = el('input', {
      type: 'text', class: 'field', id: 'spiller-navn',
      maxlength: '24', autocomplete: 'off',
      placeholder: 'For eksempel Kim',
      value: eksisterende ? eksisterende.name : ''
    });

    var rutenett = el('div', { class: 'avatar-picker' });
    GolfAvatars.list.forEach(function (a) {
      var knapp = el('button', {
        type: 'button',
        class: 'avatar-option',
        'aria-pressed': String(a.id === valgtAvatar),
        title: a.article,
        onclick: function () {
          valgtAvatar = a.id;
          Array.prototype.forEach.call(rutenett.children, function (c) {
            c.setAttribute('aria-pressed', String(c.dataset.avatar === valgtAvatar));
          });
        },
        dataset: { avatar: a.id }
      }, [
        UI.avatar(a.id, 56),
        el('span', { class: 'avatar-option-name', text: a.article })
      ]);
      rutenett.appendChild(knapp);
    });

    var lagre = el('button', {
      class: 'btn btn-primary btn-block',
      text: eksisterende ? 'Lagre endringer' : 'Legg til spiller',
      onclick: function () {
        var navn = navnFelt.value.trim();
        if (!navn) { UI.toast('Skriv inn et navn'); navnFelt.focus(); return; }
        var kollisjon = GolfStore.players(true).some(function (p) {
          return p.id !== (eksisterende && eksisterende.id) &&
                 p.name.toLowerCase() === navn.toLowerCase();
        });
        if (kollisjon) { UI.toast('Det finnes allerede en spiller med det navnet'); return; }
        GolfStore.savePlayer({
          id: eksisterende ? eksisterende.id : null,
          name: navn,
          avatarId: valgtAvatar
        }).then(function () {
          UI.toast(eksisterende ? 'Spilleren er oppdatert' : navn + ' er lagt til');
          nav.tilbake();
        });
      }
    });

    var wrap = el('div', { class: 'stack' }, [
      el('section', { class: 'card stack' }, [
        el('label', { class: 'label', for: 'spiller-navn', text: 'Navn' }),
        navnFelt
      ]),
      el('section', { class: 'card stack' }, [
        el('p', { class: 'label', text: 'Avatar' }),
        el('p', { class: 'muted', text: 'Avataren følger spilleren i scoreboard, statistikk og rapport.' }),
        rutenett
      ]),
      lagre
    ]);

    if (eksisterende) {
      wrap.appendChild(el('button', {
        class: 'btn btn-danger btn-block',
        text: 'Arkiver spilleren',
        onclick: function () {
          UI.confirm({
            title: 'Arkivere ' + eksisterende.name + '?',
            body: 'Spilleren forsvinner fra nye runder, men blir stående i gamle runder og i statistikken.',
            confirmText: 'Arkiver',
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            GolfStore.setPlayerArchived(eksisterende.id, true).then(function () {
              UI.toast(eksisterende.name + ' er arkivert');
              nav.tilbake();
            });
          });
        }
      }));
    }

    return wrap;
  };

  /* ======================================================================
     Baner
     ====================================================================== */

  Screens.baner = function (nav) {
    var wrap = el('div', { class: 'stack' });
    var baner = GolfStore.courses();

    wrap.appendChild(el('button', {
      class: 'btn btn-primary btn-block',
      text: 'Ny bane',
      onclick: function () { nav('bane'); }
    }));

    if (!baner.length) {
      wrap.appendChild(UI.emptyState(
        'Ingen baner ennå',
        'Legg inn banene dere spiller, så slipper dere å skrive navnet hver gang. Par per hull er valgfritt.'));
      return wrap;
    }

    var liste = el('section', { class: 'list' });
    baner.forEach(function (c) {
      var parTekst = c.pars && c.pars.length
        ? 'par ' + c.pars.reduce(function (a, b) { return a + b; }, 0)
        : 'uten par';
      liste.appendChild(el('button', {
        class: 'list-row',
        onclick: function () { nav('bane', { id: c.id }); }
      }, [
        el('span', { class: 'list-row-main' }, [
          el('span', { class: 'list-row-title', text: c.name }),
          el('span', { class: 'list-row-sub muted', text: c.holes + ' hull · ' + parTekst })
        ]),
        el('span', { class: 'list-row-chevron', text: '›' })
      ]));
    });
    wrap.appendChild(liste);
    return wrap;
  };

  /* ---- ny eller endre bane -------------------------------------------- */

  Screens.bane = function (nav, params) {
    var eksisterende = params.id ? GolfStore.course(params.id) : null;
    var antallHull = eksisterende ? eksisterende.holes : 18;
    var parFelt = [];

    var navnFelt = el('input', {
      type: 'text', class: 'field', id: 'bane-navn',
      maxlength: '40', autocomplete: 'off',
      placeholder: 'For eksempel Losby',
      value: eksisterende ? eksisterende.name : ''
    });

    var parBoks = el('div', { class: 'par-grid' });
    var parSeksjon = el('section', { class: 'card stack' }, [
      el('p', { class: 'label', text: 'Par per hull (valgfritt)' }),
      el('p', { class: 'muted', text:
        'Legger du inn par, foreslår appen birdie og eagle automatisk i scramble. La feltene stå tomme hvis du ikke vet.' }),
      parBoks,
      el('button', {
        class: 'btn btn-ghost btn-sm', text: 'Tøm alle',
        onclick: function () { parFelt.forEach(function (f) { f.value = ''; }); }
      })
    ]);

    function byggParFelt() {
      UI.clear(parBoks);
      parFelt = [];
      for (var i = 0; i < antallHull; i++) {
        var verdi = eksisterende && eksisterende.pars && eksisterende.pars[i]
          ? String(eksisterende.pars[i]) : '';
        var felt = el('input', {
          type: 'number', class: 'par-input num', min: '3', max: '6',
          inputmode: 'numeric', value: verdi,
          'aria-label': 'Par på hull ' + (i + 1)
        });
        parFelt.push(felt);
        parBoks.appendChild(el('label', { class: 'par-cell' }, [
          el('span', { class: 'par-num', text: String(i + 1) }),
          felt
        ]));
      }
    }

    var hullValg = el('div', { class: 'segmented', role: 'group', 'aria-label': 'Antall hull' }, [
      hullKnapp(9), hullKnapp(18)
    ]);

    function hullKnapp(n) {
      return el('button', {
        type: 'button',
        'aria-pressed': String(antallHull === n),
        text: n + ' hull',
        onclick: function () {
          antallHull = n;
          Array.prototype.forEach.call(hullValg.children, function (b) {
            b.setAttribute('aria-pressed', String(b.textContent === antallHull + ' hull'));
          });
          byggParFelt();
        }
      });
    }

    byggParFelt();

    var wrap = el('div', { class: 'stack' }, [
      el('section', { class: 'card stack' }, [
        el('label', { class: 'label', for: 'bane-navn', text: 'Banenavn' }),
        navnFelt,
        el('p', { class: 'label', style: 'margin-top:12px', text: 'Antall hull' }),
        hullValg
      ]),
      parSeksjon,
      el('button', {
        class: 'btn btn-primary btn-block',
        text: eksisterende ? 'Lagre endringer' : 'Legg til bane',
        onclick: function () {
          var navn = navnFelt.value.trim();
          if (!navn) { UI.toast('Skriv inn et banenavn'); navnFelt.focus(); return; }
          var pars = parFelt.map(function (f) {
            var n = parseInt(f.value, 10);
            return (n >= 3 && n <= 6) ? n : null;
          });
          var komplett = pars.every(function (p) { return p !== null; });
          GolfStore.saveCourse({
            id: eksisterende ? eksisterende.id : null,
            name: navn,
            holes: antallHull,
            pars: komplett ? pars : null
          }).then(function () {
            UI.toast(komplett ? 'Banen er lagret med par'
                              : 'Banen er lagret. Par kan fylles inn senere.');
            nav.tilbake();
          });
        }
      })
    ]);

    if (eksisterende) {
      wrap.appendChild(el('button', {
        class: 'btn btn-danger btn-block',
        text: 'Slett banen',
        onclick: function () {
          UI.confirm({
            title: 'Slette ' + eksisterende.name + '?',
            body: 'Runder som allerede er spilt på banen beholder banenavnet sitt.',
            confirmText: 'Slett',
            danger: true
          }).then(function (ok) {
            if (!ok) return;
            GolfStore.removeCourse(eksisterende.id).then(function () {
              UI.toast('Banen er slettet');
              nav.tilbake();
            });
          });
        }
      }));
    }

    return wrap;
  };

  global.Screens = Screens;
})(window);
