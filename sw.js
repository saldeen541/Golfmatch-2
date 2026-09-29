/* ==========================================================================
   Golfapp - service worker

   Laster ned hele appen ved første besøk og serverer den fra telefonens eget
   lager etterpå. Det er dette som gjør at appen fungerer i flymodus og uten
   dekning.

   VIKTIG VED ENDRINGER: øk versjonsnummeret under når en fil endres. Ellers
   fortsetter telefonen å bruke den gamle kopien.
   ========================================================================== */

// UI-REDESIGN: ny versjon, redesign.css i listen og valg av utseende (også Links).
var VERSJON = 'golfapp-v8-redesign-7';

var FILER = [
  './',
  './index.html',
  './manifest.webmanifest',
  './app/styles/tokens.css',
  './app/styles/app.css',
  './app/styles/redesign.css',
  './app/assets/avatars.js',
  './app/js/db.js',
  './app/js/store.js',
  './app/js/ui.js',
  './app/js/backup.js',
  './app/js/match.js',
  './app/js/scramble.js',
  './app/js/stats.js',
  './app/js/rapport.js',
  './app/js/screens.js',
  './app/js/screens-round.js',
  './app/js/screens-match.js',
  './app/js/screens-scramble.js',
  './app/js/screens-stats.js',
  './app/js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSJON)
      // cache: 'reload' går forbi nettleserens vanlige mellomlager. Ellers kan
      // en ny versjon bli installert med gamle filer hvis den legges ut to
      // ganger med kort mellomrom.
      .then(function (cache) {
        return cache.addAll(FILER.map(function (url) {
          return new Request(url, { cache: 'reload' });
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (navn) {
        return Promise.all(navn.map(function (n) {
          return n === VERSJON ? null : caches['delete'](n);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  // Sidevisninger: prøv nett først, slik at en ny versjon fanges opp. Med
  // dårlig dekning på banen venter vi ikke mer enn to sekunder før appen
  // startes fra lageret. Bare gyldige svar lagres, så en feilside eller en
  // innloggingsside for trådløst nett aldri erstatter appen.
  if (req.mode === 'navigate') {
    e.respondWith(new Promise(function (resolve) {
      var ferdig = false;
      function fraLager() {
        return caches.match('./index.html').then(function (treff) {
          return treff || caches.match('./');
        });
      }
      function svar(r) { if (!ferdig && r) { ferdig = true; resolve(r); } }

      var tidsfrist = setTimeout(function () {
        fraLager().then(function (treff) {
          if (treff) svar(treff);
        });
      }, 2000);

      fetch(req).then(function (nett) {
        if (nett && nett.ok && nett.type === 'basic') {
          var kopi = nett.clone();
          caches.open(VERSJON).then(function (c) { c.put('./index.html', kopi); });
          clearTimeout(tidsfrist);
          svar(nett);
          return;
        }
        return fraLager().then(function (treff) {
          clearTimeout(tidsfrist);
          svar(treff || nett);
        });
      }).catch(function () {
        fraLager().then(function (treff) {
          clearTimeout(tidsfrist);
          svar(treff || Response.error());
        });
      });
    }));
    return;
  }

  // Alt annet: lageret først. Appen laster ingenting utenfra, så dette er
  // bare appens egne filer.
  e.respondWith(
    caches.match(req).then(function (treff) {
      if (treff) return treff;
      return fetch(req).then(function (svar) {
        if (svar && svar.status === 200 && svar.type === 'basic') {
          var kopi = svar.clone();
          caches.open(VERSJON).then(function (c) { c.put(req, kopi); });
        }
        return svar;
      });
    })
  );
});
