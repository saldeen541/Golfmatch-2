/* ==========================================================================
   Golfapp - sikkerhetskopi

   Kopien er en vanlig tekstfil med all data i. Den lages på telefonen og
   deles gjennom telefonens egen delefunksjon, eller lastes ned. Ingenting
   sendes til noen server.

   En nettapp får ikke skrive filer på egen hånd, derfor krever kopien ett
   trykk. Appen minner om det etter hver femte fullførte runde.
   ========================================================================== */

(function (global) {
  'use strict';

  var FORMAT = 'golfapp-backup';
  var FORMAT_VERSION = 1;

  function filename() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    // UI-REDESIGN: filnavnet følger det nye navnet. Innholdet og formatet er
    // det samme, så kopier kan flyttes begge veier mellom Golfapp og Golfmatch 2.
    return 'golfmatch2-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
           '-' + p(d.getHours()) + p(d.getMinutes()) + '.json';
  }

  function build() {
    return GolfDB.dump().then(function (data) {
      return {
        format: FORMAT,
        formatVersion: FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        data: data
      };
    });
  }

  function exportBackup() {
    return build().then(function (payload) {
      var text = JSON.stringify(payload, null, 2);
      var name = filename();
      var file = null;

      try {
        file = new File([text], name, { type: 'application/json' });
      } catch (e) { /* eldre nettlesere */ }

      // Telefonens delefunksjon først: da kan man legge kopien i iCloud,
      // Google Disk eller sende den til seg selv.
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: 'Sikkerhetskopi av Golfmatch 2' })   // UI-REDESIGN
          .then(function () { return GolfStore.markBackupTaken(); })
          .then(function () { return 'delt'; })
          .catch(function (err) {
            if (err && err.name === 'AbortError') return 'avbrutt';
            return download(text, name);
          });
      }
      return download(text, name);
    });
  }

  function download(text, name) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return GolfStore.markBackupTaken().then(function () { return 'lastet ned'; });
  }

  /* ---- gjenoppretting -------------------------------------------------- */

  function validate(payload) {
    if (!payload || typeof payload !== 'object') return 'Filen kunne ikke leses.';
    if (payload.format !== FORMAT) return 'Dette ser ikke ut som en sikkerhetskopi fra Golfmatch 2 eller Golfapp.';
    if (!payload.data || typeof payload.data !== 'object') return 'Filen mangler innhold.';
    if (payload.formatVersion > FORMAT_VERSION) {
      return 'Kopien er laget av en nyere versjon av appen enn denne.';
    }
    var known = GolfDB.stores;
    for (var i = 0; i < known.length; i++) {
      var rows = payload.data[known[i]];
      if (rows === undefined) continue;
      if (!Array.isArray(rows)) return 'Filen er skadet.';
      for (var j = 0; j < rows.length; j++) {
        var r = rows[j];
        if (!r || typeof r !== 'object' || (typeof r.id !== 'string' && typeof r.id !== 'number')) {
          return 'Filen er skadet.';
        }
      }
    }
    // Rundene må ha en spillerliste, ellers kan ikke appen vise dem.
    var runder = payload.data.rounds || [];
    for (var k = 0; k < runder.length; k++) {
      if (!Array.isArray(runder[k].playerIds)) return 'Filen er skadet.';
    }
    return null;
  }

  function summarize(payload) {
    var d = payload.data;
    return {
      players: (d.players || []).length,
      courses: (d.courses || []).length,
      rounds: (d.rounds || []).length,
      createdAt: payload.createdAt
    };
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var payload;
        try { payload = JSON.parse(reader.result); }
        catch (e) { reject(new Error('Filen er ikke gyldig JSON.')); return; }
        var problem = validate(payload);
        if (problem) { reject(new Error(problem)); return; }
        resolve(payload);
      };
      reader.onerror = function () { reject(new Error('Klarte ikke å lese filen.')); };
      reader.readAsText(file);
    });
  }

  // Gjenoppretting erstatter alt. Brukeren bekrefter først.
  function restore(payload) {
    return GolfDB.replaceAll(payload.data)
      .then(function () { return GolfStore.reload(); });
  }

  global.GolfBackup = {
    exportBackup: exportBackup,
    readFile: readFile,
    summarize: summarize,
    restore: restore
  };
})(window);
