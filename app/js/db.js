/* ==========================================================================
   Golfapp - lagring

   All data ligger på telefonen. Ingenting sendes noe sted.

   Appen bruker IndexedDB når den er tilgjengelig. Når filen åpnes rett fra
   disk (file://) blokkerer nettleserne IndexedDB, og da faller vi tilbake på
   localStorage automatisk. API-et er likt begge veier, så resten av appen
   trenger ikke vite hvilken som er i bruk.

   GolfDB.ready()            -> Promise, må kalles før alt annet
   GolfDB.backend            -> 'indexeddb' | 'localstorage' (etter ready)
   GolfDB.all(store)         -> Promise<[rad, ...]>
   GolfDB.get(store, id)     -> Promise<rad | null>
   GolfDB.put(store, rad)    -> Promise<rad>
   GolfDB.remove(store, id)  -> Promise
   GolfDB.replaceAll(data)   -> Promise, brukes ved gjenoppretting
   GolfDB.dump()             -> Promise<{ store: [rader] }>, brukes ved kopi
   ========================================================================== */

(function (global) {
  'use strict';

  var DB_NAME = 'golfapp';
  var DB_VERSION = 1;
  var STORES = ['players', 'courses', 'rounds', 'holeScores', 'settings'];
  var LS_PREFIX = 'golfapp:';

  var backend = null;
  var idb = null;
  var readyPromise = null;

  /* ---- hjelpere ------------------------------------------------------- */

  function uid() {
    return Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 8);
  }

  function clone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  /* ---- IndexedDB ------------------------------------------------------ */

  function openIndexedDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('ingen indexedDB')); return; }

      var settled = false;
      var timer = setTimeout(function () {
        if (!settled) { settled = true; reject(new Error('tidsavbrudd')); }
      }, 4000);

      function done(fn, arg) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(arg);
      }

      var req;
      try { req = global.indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { done(reject, e); return; }

      req.onupgradeneeded = function () {
        var db = req.result;
        STORES.forEach(function (name) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };
      req.onsuccess = function () { done(resolve, req.result); };
      req.onerror = function () { done(reject, req.error || new Error('feil')); };
      req.onblocked = function () { done(reject, new Error('blokkert')); };
    });
  }

  function idbTx(store, mode, run) {
    return new Promise(function (resolve, reject) {
      var tx = idb.transaction(store, mode);
      var os = tx.objectStore(store);
      var out;
      try { out = run(os); } catch (e) { reject(e); return; }
      tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('avbrutt')); };
    });
  }

  /* ---- localStorage --------------------------------------------------- */

  function lsRead(store) {
    try {
      var raw = global.localStorage.getItem(LS_PREFIX + store);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function lsWrite(store, rows) {
    try {
      global.localStorage.setItem(LS_PREFIX + store, JSON.stringify(rows));
      return true;
    } catch (e) {
      // Fullt lager eller privat vindu. Vi lar appen fortsette, men
      // sikkerhetskopi blir da eneste måte å ta vare på dataene på.
      console.warn('Klarte ikke å lagre lokalt:', e);
      return false;
    }
  }

  function localStorageWorks() {
    try {
      var k = LS_PREFIX + '__test';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---- felles API ----------------------------------------------------- */

  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = openIndexedDb()
      .then(function (db) {
        idb = db;
        backend = 'indexeddb';
      })
      .catch(function () {
        backend = localStorageWorks() ? 'localstorage' : 'minne';
        if (backend === 'minne') memory = {};
      })
      .then(function () { return backend; });
    return readyPromise;
  }

  // Siste utvei: alt i minnet. Da forsvinner dataene når fanen lukkes, og
  // appen sier tydelig fra om det i innstillingene.
  var memory = null;

  function memRows(store) {
    if (!memory[store]) memory[store] = [];
    return memory[store];
  }

  function all(store) {
    if (backend === 'indexeddb') {
      return idbTx(store, 'readonly', function (os) { return os.getAll(); });
    }
    if (backend === 'localstorage') {
      return Promise.resolve(lsRead(store));
    }
    return Promise.resolve(clone(memRows(store)));
  }

  function get(store, id) {
    return all(store).then(function (rows) {
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].id === id) return rows[i];
      }
      return null;
    });
  }

  function put(store, row) {
    if (!row.id) row.id = uid();
    if (!row.v) row.v = 1;
    if (backend === 'indexeddb') {
      return idbTx(store, 'readwrite', function (os) { os.put(row); })
        .then(function () { return row; });
    }
    var rows = backend === 'localstorage' ? lsRead(store) : memRows(store);
    var found = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === row.id) { rows[i] = row; found = true; break; }
    }
    if (!found) rows.push(row);
    if (backend === 'localstorage') lsWrite(store, rows);
    else memory[store] = rows;
    return Promise.resolve(row);
  }

  function remove(store, id) {
    if (backend === 'indexeddb') {
      return idbTx(store, 'readwrite', function (os) { os['delete'](id); });
    }
    var rows = (backend === 'localstorage' ? lsRead(store) : memRows(store))
      .filter(function (r) { return r.id !== id; });
    if (backend === 'localstorage') lsWrite(store, rows);
    else memory[store] = rows;
    return Promise.resolve();
  }

  function clear(store) {
    if (backend === 'indexeddb') {
      return idbTx(store, 'readwrite', function (os) { os.clear(); });
    }
    if (backend === 'localstorage') { lsWrite(store, []); return Promise.resolve(); }
    memory[store] = [];
    return Promise.resolve();
  }

  function dump() {
    return Promise.all(STORES.map(function (s) { return all(s); }))
      .then(function (results) {
        var out = {};
        STORES.forEach(function (s, i) { out[s] = results[i]; });
        return out;
      });
  }

  // Gjenoppretting skjer i én transaksjon. Stopper den halvveis, for eksempel
  // fordi appen lukkes, rulles alt tilbake og de gamle dataene står urørt.
  function replaceAll(data) {
    if (backend === 'indexeddb') {
      return new Promise(function (resolve, reject) {
        var tx = idb.transaction(STORES, 'readwrite');
        STORES.forEach(function (s) {
          var os = tx.objectStore(s);
          os.clear();
          (data[s] || []).forEach(function (row) {
            if (!row.v) row.v = 1;
            os.put(row);
          });
        });
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error('avbrutt')); };
      });
    }
    return Promise.all(STORES.map(function (s) { return clear(s); }))
      .then(function () {
        var jobs = [];
        STORES.forEach(function (s) {
          (data[s] || []).forEach(function (row) { jobs.push(put(s, row)); });
        });
        return Promise.all(jobs);
      });
  }

  global.GolfDB = {
    stores: STORES,
    uid: uid,
    ready: ready,
    get backend() { return backend; },
    all: all,
    get: get,
    put: put,
    remove: remove,
    clear: clear,
    dump: dump,
    replaceAll: replaceAll
  };
})(window);
