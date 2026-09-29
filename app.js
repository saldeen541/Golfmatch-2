/* ==========================================================================
   Golfapp - ruter og oppstart
   ========================================================================== */

(function (global) {
  'use strict';

  var el = UI.el;

  var RUTER = {
    'hjem':          { title: 'Golfmatch 2',    tab: 'hjem' },   // UI-REDESIGN: nytt navn
    'ny-runde':      { title: 'Ny runde',       tab: 'hjem' },
    'runde':         { title: 'Runde',          tab: 'hjem' },
    'resultat':      { title: 'Resultat',       tab: 'hjem' },
    'historikk':     { title: 'Alle runder',    tab: 'hjem' },
    'spillere':      { title: 'Spillere',       tab: 'hjem' },
    'spiller':       { title: 'Spiller',        tab: 'hjem' },
    'baner':         { title: 'Baner',          tab: 'hjem' },
    'bane':          { title: 'Bane',           tab: 'hjem' },
    'statistikk':      { title: 'Statistikk',    tab: 'statistikk' },
    'bane-statistikk': { title: 'Bane',          tab: 'statistikk' },
    'innstillinger': { title: 'Innstillinger',  tab: 'innstillinger' }
  };

  /* Navigasjonen er en stabel. Tilbakeknappen tar deg alltid nøyaktig ett
     hakk bakover, dit du faktisk kom fra, og ikke til en fast skjerm.
     Stabelen speiles i nettleserens historikk, slik at tilbakeknappen på
     Android og sveip tilbake virker på samme måte. */

  var stabel = [{ rute: 'hjem', params: {} }];

  function naa() { return stabel[stabel.length - 1]; }

  function settStabel(ny, erstatt) {
    stabel = ny;
    var tilstand = { d: stabel.length - 1 };
    try {
      if (erstatt) history.replaceState(tilstand, '');
      else history.pushState(tilstand, '');
    } catch (e) { /* historikk-API kan være stengt, appen virker likevel */ }
    tegn();
    window.scrollTo(0, 0);
  }

  function nav(rute, params) {
    if (!RUTER[rute]) rute = 'hjem';
    settStabel(stabel.concat([{ rute: rute, params: params || {} }]), false);
  }

  // Erstatter toppen av stabelen. Brukes når man har lagret noe og ikke
  // skal kunne gå «tilbake» til skjemaet man nettopp fullførte.
  nav.erstatt = function (rute, params) {
    if (!RUTER[rute]) rute = 'hjem';
    settStabel(stabel.slice(0, -1).concat([{ rute: rute, params: params || {} }]), true);
  };

  // Nullstiller stabelen. Brukes av bunnmenyen.
  nav.rot = function (rute, params) {
    if (!RUTER[rute]) rute = 'hjem';
    settStabel([{ rute: rute, params: params || {} }], true);
  };

  nav.tilbake = function () {
    if (stabel.length <= 1) return;
    try { history.back(); }
    catch (e) { settStabel(stabel.slice(0, -1), true); }
  };

  window.addEventListener('popstate', function (e) {
    var d = e.state && typeof e.state.d === 'number' ? e.state.d : 0;
    var ny = stabel.slice(0, d + 1);
    if (!ny.length) ny = [{ rute: 'hjem', params: {} }];
    stabel = ny;
    tegn();
    window.scrollTo(0, 0);
  });

  function tegn() {
    var her = naa();
    var def = RUTER[her.rute];
    var innhold = document.getElementById('innhold');
    var tittel = document.getElementById('sidetittel');
    var tilbake = document.getElementById('tilbake');

    tittel.textContent = def.title;
    tilbake.hidden = stabel.length <= 1;
    tilbake.onclick = nav.tilbake;

    UI.clear(innhold);
    var bygger = Screens[her.rute];
    innhold.appendChild(bygger ? bygger(nav, her.params) : el('p', { text: 'Ukjent skjerm' }));

    Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) {
      b.setAttribute('aria-current', String(b.dataset.tab === def.tab));
    });

    // UI-REDESIGN: et felt som hadde fokus, kan ha forsvunnet med forrige skjerm.
    oppdaterTastatur();
  }

  /* ---- bunnmenyen og tastaturet (UI-REDESIGN) --------------------------
     Bunnmenyen skjules mens man skriver i et felt, og kommer tilbake når
     feltet slippes. Da slipper menyen å sveve midt på skjermen når iPhone
     ruller fram feltet, og det blir mer plass over tastaturet.

     Gjelder bare telefoner og nettbrett (grov peker). På maskin er det ikke
     noe skjermtastatur å gjøre plass til.

     Lukkes tastaturet uten at feltet slippes (tilbakeknappen på Android),
     merkes det på at det synlige skjermbildet blir høyt igjen, og menyen
     kommer tilbake. Fokus og verdien i feltet røres ikke.
     -------------------------------------------------------------------- */

  var SKRIVETYPER = ['text', 'number', 'search', 'email', 'tel', 'url', 'password'];
  var beroring = !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
  var tastaturSett = false;
  var fullHoyde = global.visualViewport ? global.visualViewport.height : global.innerHeight;

  function erSkrivefelt(node) {
    if (!node || node.disabled || node.readOnly) return false;
    if (node.tagName === 'TEXTAREA' || node.isContentEditable) return true;
    if (node.tagName !== 'INPUT') return false;
    return SKRIVETYPER.indexOf((node.getAttribute('type') || 'text').toLowerCase()) >= 0;
  }

  function settMenySkjult(skjult) {
    document.body.classList.toggle('tastatur-ute', !!skjult);
  }

  function oppdaterTastatur() {
    if (!beroring) return;
    settMenySkjult(erSkrivefelt(document.activeElement));
  }

  document.addEventListener('focusin', function (e) {
    if (beroring && erSkrivefelt(e.target)) settMenySkjult(true);
  });

  // Venter ett øyeblikk, så menyen ikke blinker når fokus flyttes rett
  // fra ett felt til et annet.
  document.addEventListener('focusout', function () {
    if (!beroring) return;
    setTimeout(oppdaterTastatur, 60);
  });

  if (global.visualViewport) {
    global.visualViewport.addEventListener('resize', function () {
      var h = global.visualViewport.height;
      if (!erSkrivefelt(document.activeElement)) {
        fullHoyde = Math.max(h, global.innerHeight);
        tastaturSett = false;
        return;
      }
      if (h < fullHoyde * 0.8) tastaturSett = true;
      else if (tastaturSett && h > fullHoyde * 0.9) {
        tastaturSett = false;
        settMenySkjult(false);
      }
    });
  }

  /* ---- tema ----------------------------------------------------------- */

  /* UI-REDESIGN: utseendet kan velges i Innstillinger.
     'auto' følger telefonen (Fairway på lys, Klubbhus på mørk),
     'lys' er alltid Fairway, 'mork' alltid Klubbhus, og 'links' er det
     lyse Links-temaet med sand og himmel.

     Valget lagres i innstillingene sammen med resten av dataene. En kopi
     ligger også i localStorage, slik at riktig utseende kan settes med én
     gang ved oppstart, før databasen er åpnet. Da blinker ikke skjermen
     lys før den blir mørk. */
  var TEMA_NOKKEL = 'golfapp-tema';

  function folgTelefonen() {
    if (gjeldendeValg === 'auto') settTema('auto');
  }

  function lagretTema() {
    try { return localStorage.getItem(TEMA_NOKKEL) || 'auto'; }
    catch (e) { return 'auto'; }
  }

  // Fargen på feltet øverst med klokke og batteri. Den er målt fra
  // topplinjen i hvert tema, så feltet og topplinjen glir sammen.
  var STATUSFARGE = { light: '#f0f8f5', dark: '#0f1f16', links: '#e6f0f2' };
  var MORK_TELEFON = global.matchMedia ? global.matchMedia('(prefers-color-scheme: dark)') : null;
  var gjeldendeValg = 'auto';

  function settTema(valg) {
    gjeldendeValg = valg || 'auto';
    var tema = valg === 'lys' ? 'light' : valg === 'mork' ? 'dark'
             : valg === 'links' ? 'links' : null;
    var rot = document.documentElement;
    if (tema) rot.setAttribute('data-theme', tema);
    else rot.removeAttribute('data-theme');

    // Én meta-tagg, med fargen byttet direkte. iPhone følger ikke alltid med
    // når media-regelen på taggen endres, men den følger en ny farge.
    var synlig = tema || (MORK_TELEFON && MORK_TELEFON.matches ? 'dark' : 'light');
    var meta = document.getElementById('statusfarge');
    if (meta && meta.getAttribute('content') !== STATUSFARGE[synlig]) {
      meta.setAttribute('content', STATUSFARGE[synlig]);
    }

    try { localStorage.setItem(TEMA_NOKKEL, valg || 'auto'); } catch (e) { /* ikke kritisk */ }
  }

  /* ---- oppstart ------------------------------------------------------- */

  // Hvis appen åpnes et sted som ikke får lastet hjelpefilene, for eksempel
  // i forhåndsvisningen i Filer-appen på iPhone, skal brukeren få vite hvorfor
  // i stedet for å bli stående på «Starter appen …».
  function manglendeFiler() {
    var kreves = [
      ['GolfAvatars', 'app/assets/avatars.js'],
      ['GolfDB', 'app/js/db.js'],
      ['GolfStore', 'app/js/store.js'],
      ['UI', 'app/js/ui.js'],
      ['GolfBackup', 'app/js/backup.js'],
      ['GolfMatch', 'app/js/match.js'],
      ['GolfScramble', 'app/js/scramble.js'],
      ['GolfStats', 'app/js/stats.js'],
      ['GolfRapport', 'app/js/rapport.js'],
      ['Screens', 'app/js/screens.js']
    ];
    return kreves.filter(function (par) { return !global[par[0]]; })
                 .map(function (par) { return par[1]; });
  }

  function visOppstartsfeil(tekst) {
    var boks = document.getElementById('laster');
    boks.textContent = '';
    var p1 = document.createElement('p');
    p1.textContent = tekst;
    var p2 = document.createElement('p');
    p2.textContent = 'Appen må åpnes fra en nettadresse, ikke fra Filer-appen. ' +
                     'Se README i mappen for hvordan den legges ut.';
    boks.appendChild(p1);
    boks.appendChild(p2);
  }

  // Service workeren er det som gjør at appen fungerer uten nett. Den krever
  // https eller localhost, så åpnes appen fra disk hopper vi over den.
  function registrerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var ok = location.protocol === 'https:' ||
             location.hostname === 'localhost' ||
             location.hostname === '127.0.0.1';
    if (!ok) return;
    // Var det allerede en service worker her, betyr et bytte at en ny
    // versjon er lastet ned. Den tas i bruk neste gang appen åpnes.
    var haddeVersjon = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (haddeVersjon) UI.toast('En ny versjon av appen er lastet ned. Den tas i bruk neste gang du åpner appen.');
      haddeVersjon = true;
    });

    navigator.serviceWorker.register('./sw.js').then(function (reg) {
      // iPhone lar ofte appen ligge i bakgrunnen i stedet for å starte den
      // på nytt. Vi ser derfor etter ny versjon hver gang den kommer fram.
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
    }).catch(function (e) {
      console.warn('Offline-støtte ble ikke slått på:', e);
    });
  }

  // Ber nettleseren om å ikke rydde bort dataene automatisk. Svaret vises
  // under Lagring i innstillingene.
  function beOmVarigLagring() {
    global.GolfLagring = { varig: null, installert: erInstallert() };
    if (!navigator.storage || !navigator.storage.persisted) return;
    navigator.storage.persisted().then(function (ja) {
      return ja || (navigator.storage.persist ? navigator.storage.persist() : false);
    }).then(function (ja) {
      global.GolfLagring.varig = !!ja;
    }).catch(function () {});
  }

  function erInstallert() {
    return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
           navigator.standalone === true;
  }

  // Feil som ellers ville forsvunnet i stillhet, for eksempel en lagring som
  // ikke gikk gjennom, skal brukeren få vite om.
  window.addEventListener('unhandledrejection', function (e) {
    console.error(e.reason);
    UI.toast('Noe gikk galt, og endringen ble kanskje ikke lagret. Prøv igjen.');
  });

  function start() {
    settTema(lagretTema());
    if (MORK_TELEFON) {
      if (MORK_TELEFON.addEventListener) MORK_TELEFON.addEventListener('change', folgTelefonen);
      else if (MORK_TELEFON.addListener) MORK_TELEFON.addListener(folgTelefonen);
    }
    registrerServiceWorker();
    beOmVarigLagring();

    var mangler = manglendeFiler();
    if (mangler.length) {
      visOppstartsfeil('Klarte ikke å laste ' + mangler.length +
        ' av appens filer, blant annet ' + mangler[0] + '.');
      return;
    }

    Array.prototype.forEach.call(document.querySelectorAll('.tabbar button'), function (b) {
      b.addEventListener('click', function () { nav.rot(b.dataset.route); });
    });

    GolfStore.load().then(function () {
      // UI-REDESIGN: valget i innstillingene er det som gjelder. Det følges
      // også etter gjenoppretting fra kopi og etter «Slett all data».
      settTema(GolfStore.settings().tema);
      GolfStore.onChange(function () {
        var s = GolfStore.settings();
        if (s) settTema(s.tema);
      });
      document.getElementById('laster').hidden = true;
      document.getElementById('app').hidden = false;
      nav.rot('hjem');
    }).catch(function (err) {
      console.error(err);
      document.getElementById('laster').textContent =
        'Klarte ikke å starte appen. Prøv å laste siden på nytt.';
    });

    // Tegn på nytt når data endres et annet sted i appen.
    GolfStore.onChange(function () { /* skjermene tegner seg selv ved navigasjon */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.GolfApp = { nav: nav, settTema: settTema };
})(window);
