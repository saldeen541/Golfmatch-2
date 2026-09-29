/* ==========================================================================
   Golfapp - datamodell

   Ett lag over GolfDB som kjenner begrepene i appen: spillere, baner,
   runder og innstillinger. Alt holdes i minnet mens appen kjører, og
   skrives til lagringen ved hver endring.

   Statistikk regnes alltid ut fra rundene ved visning. Vi lagrer aldri
   ferdig utregnede totaler, slik at en rettet runde slår rett gjennom.
   ========================================================================== */

(function (global) {
  'use strict';

  var cache = { players: [], courses: [], rounds: [], settings: null };
  var listeners = [];

  var DEFAULT_SETTINGS = {
    id: 'settings',
    v: 1,
    poengmodell: 'skalerende',      // 'skalerende' | 'fast'
    roundsSinceBackup: 0,
    backupReminderEvery: 5,
    lastBackupAt: null,
    tema: 'auto'                    // UI-REDESIGN: 'auto' | 'lys' | 'mork'
  };

  /* ---- oppstart ------------------------------------------------------- */

  function load() {
    return GolfDB.ready().then(function () {
      return Promise.all([
        GolfDB.all('players'),
        GolfDB.all('courses'),
        GolfDB.all('rounds'),
        GolfDB.get('settings', 'settings')
      ]);
    }).then(function (res) {
      cache.players = res[0] || [];
      cache.courses = res[1] || [];
      cache.rounds = res[2] || [];
      cache.settings = res[3] || null;
      if (!cache.settings) {
        cache.settings = Object.assign({}, DEFAULT_SETTINGS);
        return GolfDB.put('settings', cache.settings);
      }
      // Fyll ut felter som er kommet til i en nyere versjon.
      Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
        if (cache.settings[k] === undefined) cache.settings[k] = DEFAULT_SETTINGS[k];
      });
    });
  }

  function onChange(fn) { listeners.push(fn); }
  function emit() { listeners.forEach(function (fn) { fn(); }); }

  /* ---- spillere ------------------------------------------------------- */

  function players(includeArchived) {
    return cache.players
      .filter(function (p) { return includeArchived || !p.archived; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'nb'); });
  }

  function player(id) {
    for (var i = 0; i < cache.players.length; i++) {
      if (cache.players[i].id === id) return cache.players[i];
    }
    return null;
  }

  function savePlayer(data) {
    var row = data.id ? player(data.id) : null;
    if (row) {
      row.name = data.name;
      row.avatarId = data.avatarId;
      row.updatedAt = Date.now();
    } else {
      row = {
        id: GolfDB.uid(),
        v: 1,
        name: data.name,
        avatarId: data.avatarId,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      cache.players.push(row);
    }
    return GolfDB.put('players', row).then(function () { emit(); return row; });
  }

  // Spillere slettes aldri, de arkiveres. Da vises historiske runder riktig.
  function setPlayerArchived(id, archived) {
    var row = player(id);
    if (!row) return Promise.resolve();
    row.archived = !!archived;
    row.updatedAt = Date.now();
    return GolfDB.put('players', row).then(function () { emit(); });
  }

  /* ---- baner ---------------------------------------------------------- */

  function courses() {
    return cache.courses.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name, 'nb');
    });
  }

  function course(id) {
    for (var i = 0; i < cache.courses.length; i++) {
      if (cache.courses[i].id === id) return cache.courses[i];
    }
    return null;
  }

  function saveCourse(data) {
    var row = data.id ? course(data.id) : null;
    if (row) {
      row.name = data.name;
      row.holes = data.holes;
      row.pars = data.pars || null;
      row.updatedAt = Date.now();
    } else {
      row = {
        id: GolfDB.uid(),
        v: 1,
        name: data.name,
        holes: data.holes,
        pars: data.pars || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      cache.courses.push(row);
    }
    return GolfDB.put('courses', row).then(function () { emit(); return row; });
  }

  // Par for et hull. En 9-hullsbane som spilles to ganger bruker samme
  // par på hull 10 til 18 som på 1 til 9.
  function parFor(pars, hull) {
    if (!pars || !pars.length) return null;
    var p = pars[hull - 1];
    if (typeof p !== 'number' && pars.length === 9 && hull > 9) p = pars[hull - 10];
    return typeof p === 'number' && p > 0 ? p : null;
  }

  function removeCourse(id) {
    cache.courses = cache.courses.filter(function (c) { return c.id !== id; });
    return GolfDB.remove('courses', id).then(function () { emit(); });
  }

  /* ---- runder --------------------------------------------------------- */

  function rounds(filter) {
    var list = cache.rounds.slice();
    if (filter && filter.status) {
      list = list.filter(function (r) { return r.status === filter.status; });
    }
    if (filter && filter.mode) {
      list = list.filter(function (r) { return r.mode === filter.mode; });
    }
    return list.sort(function (a, b) { return b.startedAt - a.startedAt; });
  }

  function round(id) {
    for (var i = 0; i < cache.rounds.length; i++) {
      if (cache.rounds[i].id === id) return cache.rounds[i];
    }
    return null;
  }

  function activeRound() {
    var list = rounds({ status: 'pagar' });
    return list.length ? list[0] : null;
  }

  function createRound(data) {
    var row = {
      id: GolfDB.uid(),
      v: 1,
      status: 'pagar',                  // 'pagar' | 'fullfort' | 'avbrutt'
      mode: data.mode,                  // 'match' | 'scramble'
      holes: data.holes,                // 9 | 18
      holesPlayed: 0,
      courseId: data.courseId || null,
      courseName: data.courseName,
      playerIds: data.playerIds.slice(),
      teams: data.teams || null,
      note: '',
      startedAt: Date.now(),
      updatedAt: Date.now(),
      endedAt: null
    };
    cache.rounds.push(row);
    return GolfDB.put('rounds', row).then(function () { emit(); return row; });
  }

  function saveRound(row) {
    row.updatedAt = Date.now();
    return GolfDB.put('rounds', row).then(function () { emit(); return row; });
  }

  function setRoundStatus(id, status) {
    var row = round(id);
    if (!row) return Promise.resolve();
    row.status = status;
    row.endedAt = Date.now();
    row.updatedAt = Date.now();
    var job = GolfDB.put('rounds', row);
    // Bare fullførte runder teller mot påminnelsen om sikkerhetskopi.
    if (status === 'fullfort') {
      cache.settings.roundsSinceBackup = (cache.settings.roundsSinceBackup || 0) + 1;
      job = job.then(function () { return GolfDB.put('settings', cache.settings); });
    }
    return job.then(function () { emit(); return row; });
  }

  function removeRound(id) {
    cache.rounds = cache.rounds.filter(function (r) { return r.id !== id; });
    return GolfDB.all('holeScores')
      .then(function (rows) {
        var jobs = rows
          .filter(function (h) { return h.roundId === id; })
          .map(function (h) { return GolfDB.remove('holeScores', h.id); });
        return Promise.all(jobs);
      })
      .then(function () { return GolfDB.remove('rounds', id); })
      .then(function () { emit(); });
  }

  /* ---- score hull for hull --------------------------------------------
     Radene skrives fortløpende under runden, én per hull. Det er dette som
     gjør at en avbrutt eller pauset runde kan gjenopptas.
     -------------------------------------------------------------------- */

  function holeId(roundId, hole) { return roundId + ':' + hole; }

  function holes(roundId) {
    return GolfDB.all('holeScores').then(function (rows) {
      return rows
        .filter(function (h) { return h.roundId === roundId; })
        .sort(function (a, b) { return a.hole - b.hole; });
    });
  }

  function holeRow(roundId, hole, strokes, extra) {
    var row = {
      id: holeId(roundId, hole),
      v: 1,
      roundId: roundId,
      hole: hole,
      strokes: strokes || {},
      updatedAt: Date.now()
    };
    if (extra) Object.keys(extra).forEach(function (k) { row[k] = extra[k]; });
    return row;
  }

  function putHole(row) {
    return GolfDB.put('holeScores', row).then(function () { return row; });
  }

  function saveHole(roundId, hole, strokes, extra) {
    return putHole(holeRow(roundId, hole, strokes, extra));
  }

  // Alle hullrader gruppert på runde. Brukes av statistikken, som trenger
  // alle rundene samtidig.
  function allHoles() {
    return GolfDB.all('holeScores').then(function (rows) {
      var kart = {};
      rows.forEach(function (h) {
        if (!kart[h.roundId]) kart[h.roundId] = [];
        kart[h.roundId].push(h);
      });
      Object.keys(kart).forEach(function (id) {
        kart[id].sort(function (a, b) { return a.hole - b.hole; });
      });
      return kart;
    });
  }

  // Brukes når antall hull kortes ned underveis.
  function removeHolesAbove(roundId, maxHole) {
    return holes(roundId).then(function (rows) {
      return Promise.all(rows
        .filter(function (h) { return h.hole > maxHole; })
        .map(function (h) { return GolfDB.remove('holeScores', h.id); }));
    });
  }

  /* ---- innstillinger -------------------------------------------------- */

  function settings() { return cache.settings; }

  function saveSettings(patch) {
    Object.keys(patch).forEach(function (k) { cache.settings[k] = patch[k]; });
    return GolfDB.put('settings', cache.settings).then(function () { emit(); });
  }

  function backupDue() {
    var s = cache.settings;
    return (s.roundsSinceBackup || 0) >= (s.backupReminderEvery || 5);
  }

  function markBackupTaken() {
    return saveSettings({ roundsSinceBackup: 0, lastBackupAt: Date.now() });
  }

  /* ---- etter gjenoppretting ------------------------------------------- */

  function reload() {
    return load().then(function () { emit(); });
  }

  global.GolfStore = {
    load: load,
    reload: reload,
    onChange: onChange,

    players: players,
    player: player,
    savePlayer: savePlayer,
    setPlayerArchived: setPlayerArchived,

    courses: courses,
    course: course,
    saveCourse: saveCourse,
    removeCourse: removeCourse,
    parFor: parFor,

    rounds: rounds,
    round: round,
    activeRound: activeRound,
    createRound: createRound,
    saveRound: saveRound,
    setRoundStatus: setRoundStatus,
    removeRound: removeRound,

    holes: holes,
    allHoles: allHoles,
    saveHole: saveHole,
    holeRow: holeRow,
    putHole: putHole,
    removeHolesAbove: removeHolesAbove,

    settings: settings,
    saveSettings: saveSettings,
    backupDue: backupDue,
    markBackupTaken: markBackupTaken
  };
})(window);
