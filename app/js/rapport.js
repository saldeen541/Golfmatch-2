/* ==========================================================================
   Golfapp - eksportrapport

   Tegner resultatet av en runde som et bilde, klart til å legges ut på
   Discord. Bildet tegnes på et canvas i appen. Ingen kodebibliotek utenfra,
   ingen server: det virker i flymodus som alt annet.

   Avatarene tegnes ved å gjøre SVG-en om til et bilde med en data-URL.
   Den må ha width og height satt, ellers nekter Safari å tegne den.

   GolfRapport.del(runde, hullRader, bane) -> Promise<'delt'|'lastet ned'|'avbrutt'>
   GolfRapport.bygg(...)                   -> Promise<canvas>, brukt av forhåndsvisning
   ========================================================================== */

(function (global) {
  'use strict';

  var B = 1080;                 // bildebredde
  var M = 64;                   // marg

  var F = {
    bg:      '#101a14',
    panel:   '#17241c',
    panel2:  '#1e3125',
    linje:   '#2c4234',
    ink:     '#f4f2ea',
    muted:   '#9da79f',
    aksent:  '#e8663a',
    god:     '#4cb377',
    gull:    '#f0b429',
    spiller: ['#3987e5', '#c98500', '#d55181', '#00a300']
  };

  var FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function font(vekt, str) { return vekt + ' ' + str + 'px ' + FONT; }

  function rundRekt(ctx, x, y, b, h, r) {
    var rr = Math.min(r, b / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + b, y, x + b, y + h, rr);
    ctx.arcTo(x + b, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + b, y, rr);
    ctx.closePath();
  }

  function kutt(ctx, tekst, maksBredde) {
    if (ctx.measureText(tekst).width <= maksBredde) return tekst;
    var t = tekst;
    while (t.length > 1 && ctx.measureText(t + '…').width > maksBredde) t = t.slice(0, -1);
    return t + '…';
  }

  function lastAvatar(avatarId) {
    return new Promise(function (res) {
      var a = GolfAvatars.get(avatarId) || GolfAvatars.list[0];
      // Safari krever eksplisitt størrelse på SVG-en for å rastrere den.
      var svg = a.svg.replace('<svg ', '<svg width="256" height="256" ');
      // UI-REDESIGN: rapporten er mørk, så landskapet bak dyret får
      // kveldsfargene fra Klubbhus.
      svg = svg.replace('fill="#d3e8f1"', 'fill="#20404a"')
               .replace('fill="#f1e2bd"', 'fill="#5e5238"')
               .replace('fill="#8fd0a0"', 'fill="#2c6a50"');
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { res(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function tegnAvatar(ctx, img, x, y, d, ringFarge) {
    ctx.save();
    if (ringFarge) {
      ctx.fillStyle = ringFarge;
      ctx.beginPath();
      ctx.arc(x + d / 2, y + d / 2, d / 2 + 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    ctx.clip();
    if (img) ctx.drawImage(img, x, y, d, d);
    else { ctx.fillStyle = F.panel2; ctx.fillRect(x, y, d, d); }
    ctx.restore();
  }

  function poengTekst(n) {
    if (n === 0) return '0';
    var hel = Math.floor(n);
    if (hel === 0) return '½';
    return hel + (n % 1 !== 0 ? '½' : '');
  }

  function fornavn(navn) { return navn.split(' ')[0]; }

  /* ======================================================================
     Seksjoner

     Hver seksjon melder hvor høy den er, og tegner seg selv. Da kan vi
     regne ut bildehøyden før vi lager canvaset.
     ====================================================================== */

  function toppSeksjon(runde, undertekst) {
    return {
      hoyde: 300,
      tegn: function (ctx, y) {
        ctx.textBaseline = 'alphabetic';

        ctx.fillStyle = F.aksent;
        ctx.font = font('700', 30);
        var merke = runde.mode === 'match' ? 'MATCH' : 'SCRAMBLE';
        ctx.letterSpacing && (ctx.letterSpacing = '6px');
        ctx.fillText(merke, M, y + 54);
        ctx.letterSpacing && (ctx.letterSpacing = '0px');

        ctx.fillStyle = F.ink;
        ctx.font = font('750', 88);
        ctx.fillText(kutt(ctx, runde.courseName, B - M * 2), M, y + 156);

        ctx.fillStyle = F.muted;
        ctx.font = font('500', 34);
        ctx.fillText(undertekst, M, y + 214);

        ctx.strokeStyle = F.linje;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(M, y + 266);
        ctx.lineTo(B - M, y + 266);
        ctx.stroke();
      }
    };
  }

  // Resultatlisten: én rad per spiller eller lag, vinneren løftet fram.
  function stillingSeksjon(rader) {
    var radH = 132;
    return {
      hoyde: 28 + rader.length * (radH + 14),
      tegn: function (ctx, y, avatarer) {
        var yy = y + 28;
        rader.forEach(function (rad) {
          var vinner = rad.plass === 1;

          ctx.fillStyle = vinner ? F.panel2 : F.panel;
          rundRekt(ctx, M, yy, B - M * 2, radH, 28);
          ctx.fill();
          if (vinner) {
            ctx.strokeStyle = F.god;
            ctx.lineWidth = 3;
            rundRekt(ctx, M, yy, B - M * 2, radH, 28);
            ctx.stroke();
          }

          var x = M + 36;

          if (rad.plass) {
            ctx.fillStyle = vinner ? F.gull : F.muted;
            ctx.font = font('750', 46);
            ctx.textAlign = 'left';
            ctx.fillText(rad.plass + '.', x, yy + 84);
            x += 62;
          }

          (rad.avatarIder || []).forEach(function (id, i) {
            tegnAvatar(ctx, avatarer[id], x, yy + 26, 80,
              rad.avatarIder.length === 1 ? rad.farge : null);
            x += i === rad.avatarIder.length - 1 ? 96 : 60;
          });

          ctx.fillStyle = F.ink;
          ctx.font = font('700', 44);
          ctx.textAlign = 'left';
          var maks = B - M - 36 - x - 240;
          ctx.fillText(kutt(ctx, rad.navn, maks), x, yy + 70);

          if (rad.under) {
            ctx.fillStyle = F.muted;
            ctx.font = font('500', 28);
            ctx.fillText(kutt(ctx, rad.under, maks), x, yy + 106);
          }

          ctx.textAlign = 'right';
          ctx.fillStyle = vinner ? F.god : F.ink;
          ctx.font = font('750', 56);
          ctx.fillText(rad.verdi, B - M - 36, yy + 76);
          if (rad.verdiUnder) {
            ctx.fillStyle = F.muted;
            ctx.font = font('500', 26);
            ctx.fillText(rad.verdiUnder, B - M - 36, yy + 110);
          }
          ctx.textAlign = 'left';

          yy += radH + 14;
        });
      }
    };
  }

  /* Scorekortet. Over ni hull deles det i to blokker, slik et papirkort
     også gjør, i stedet for å presse atten kolonner inn på bredden.
     Hver blokk summerer sine egne hull, merket UT og INN. Totalen for
     runden står allerede i resultatlisten øverst. */
  function scorekortSeksjon(tittel, kolonner, rader) {
    var blokker = [];
    for (var i = 0; i < kolonner.length; i += 9) {
      blokker.push(kolonner.slice(i, i + 9));
    }
    var radH = 74;
    var hodeH = 56;
    var blokkH = hodeH + rader.length * radH + 40;

    // Navnekolonnen tilpasses det lengste navnet, slik at lagnavn med to
    // avatarer ikke blir kuttet.
    function navnBredde(ctx) {
      var bredest = 0;
      rader.forEach(function (rad) {
        var avatarer = Math.min((rad.avatarIder || []).length, 2);
        ctx.font = font('650', 32);
        bredest = Math.max(bredest, 24 + avatarer * 40 + 24 + ctx.measureText(rad.navn).width + 24);
      });
      return Math.max(260, Math.min(430, Math.ceil(bredest)));
    }

    function sumEtikett(i) {
      if (blokker.length === 1) return 'SUM';
      return i === 0 ? 'UT' : i === 1 ? 'INN' : 'SUM';
    }

    return {
      hoyde: 70 + blokker.length * blokkH,
      tegn: function (ctx, y, avatarer) {
        ctx.fillStyle = F.muted;
        ctx.font = font('700', 28);
        ctx.letterSpacing && (ctx.letterSpacing = '4px');
        ctx.fillText(tittel.toUpperCase(), M, y + 44);
        ctx.letterSpacing && (ctx.letterSpacing = '0px');

        var navnB = navnBredde(ctx);
        var yy = y + 70;
        blokker.forEach(function (blokk, bi) {
          var sumB = 130;
          var cellB = (B - M * 2 - navnB - sumB) / 9;

          ctx.fillStyle = F.panel;
          rundRekt(ctx, M, yy, B - M * 2, hodeH + rader.length * radH, 28);
          ctx.fill();

          // hoderad
          ctx.textAlign = 'center';
          ctx.font = font('700', 26);
          ctx.fillStyle = F.muted;
          blokk.forEach(function (k, i) {
            ctx.fillText(String(k.merke), M + navnB + cellB * i + cellB / 2, yy + 38);
          });
          ctx.fillText(sumEtikett(bi), B - M - sumB / 2, yy + 38);

          ctx.strokeStyle = F.linje;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(M + 20, yy + hodeH);
          ctx.lineTo(B - M - 20, yy + hodeH);
          ctx.stroke();

          rader.forEach(function (rad, ri) {
            var ry = yy + hodeH + ri * radH;

            ctx.textAlign = 'left';
            var ax = M + 24;
            (rad.avatarIder || []).slice(0, 2).forEach(function (id, i) {
              tegnAvatar(ctx, avatarer[id], ax, ry + 13, 48, i === 0 ? rad.farge : null);
              ax += 40;
            });
            ctx.fillStyle = F.ink;
            ctx.font = font('650', 32);
            ctx.fillText(kutt(ctx, rad.navn, navnB - (ax - M) - 16), ax + 16, ry + 48);

            ctx.textAlign = 'center';
            var sum = 0, underSum = 0, harUnder = false;
            blokk.forEach(function (k, i) {
              var celle = rad.celler[k.indeks];
              var cx = M + navnB + cellB * i + cellB / 2;
              if (celle && typeof celle.tall === 'number') sum += celle.tall;
              if (celle && typeof celle.undertall === 'number') {
                underSum += celle.undertall;
                harUnder = true;
              }
              if (!celle) {
                ctx.fillStyle = F.linje;
                ctx.font = font('600', 30);
                ctx.fillText('–', cx, ry + 48);
                return;
              }
              if (celle.uthev) {
                ctx.fillStyle = F.panel2;
                rundRekt(ctx, cx - cellB / 2 + 5, ry + 8, cellB - 10, radH - 16, 14);
                ctx.fill();
              }
              // UI-REDESIGN: med merke rundt tallet flyttes tallet litt opp,
              // slik at merket ikke treffer teksten under.
              var tallY = ry + (celle.under ? (celle.form ? 40 : 42) : 48);
              if (celle.form) tegnMerke(ctx, celle.form, cx, tallY - 11.5, celle.under ? 18 : 21);
              ctx.fillStyle = celle.farge || F.ink;
              ctx.font = font(celle.uthev ? '750' : '600', 32);
              ctx.fillText(celle.tekst, cx, tallY);
              if (celle.under) {
                ctx.fillStyle = celle.underFarge || F.muted;
                ctx.font = font('700', 22);
                ctx.fillText(celle.under, cx, ry + (celle.form ? 67 : 64));
              }
            });

            var sx = B - M - sumB / 2;
            ctx.fillStyle = F.ink;
            ctx.font = font('750', 36);
            ctx.fillText(String(sum), sx, ry + (harUnder ? 42 : 48));
            if (harUnder) {
              ctx.fillStyle = F.god;
              ctx.font = font('700', 24);
              ctx.fillText(poengTekst(underSum), sx, ry + 64);
            }
          });

          yy += blokkH;
        });
        ctx.textAlign = 'left';
      }
    };
  }

  function listeSeksjon(tittel, linjer) {
    return {
      hoyde: linjer.length ? 70 + linjer.length * 46 + 20 : 0,
      tegn: function (ctx, y) {
        if (!linjer.length) return;
        ctx.fillStyle = F.muted;
        ctx.font = font('700', 28);
        ctx.letterSpacing && (ctx.letterSpacing = '4px');
        ctx.fillText(tittel.toUpperCase(), M, y + 44);
        ctx.letterSpacing && (ctx.letterSpacing = '0px');
        ctx.font = font('500', 32);
        linjer.forEach(function (t, i) {
          ctx.fillStyle = F.ink;
          ctx.fillText(kutt(ctx, t, B - M * 2), M, y + 92 + i * 46);
        });
      }
    };
  }

  function bunnSeksjon(dato) {
    return {
      hoyde: 120,
      tegn: function (ctx, y) {
        ctx.strokeStyle = F.linje;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(M, y + 30);
        ctx.lineTo(B - M, y + 30);
        ctx.stroke();

        // liten golfflagg-vignett. UI-REDESIGN: gult flagg som i det nye ikonet.
        ctx.fillStyle = F.god;
        ctx.beginPath();
        ctx.ellipse(M + 22, y + 88, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = F.ink;
        ctx.fillRect(M + 20, y + 54, 4, 34);
        ctx.fillStyle = '#ffd45c';
        ctx.beginPath();
        ctx.moveTo(M + 24, y + 56);
        ctx.lineTo(M + 62, y + 66);
        ctx.lineTo(M + 24, y + 76);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = F.muted;
        ctx.font = font('600', 28);
        ctx.fillText('Golfmatch 2', M + 78, y + 88);   // UI-REDESIGN: nytt navn
        ctx.textAlign = 'right';
        ctx.fillText(dato, B - M, y + 88);
        ctx.textAlign = 'left';
      }
    };
  }

  /* ======================================================================
     Bygg rapporten
     ====================================================================== */

  function bygg(runde, hullRader, bane) {
    return runde.mode === 'match'
      ? byggMatch(runde, hullRader, bane)
      : byggScramble(runde, hullRader, bane);
  }

  function samleAvatarer(ider) {
    var unike = ider.filter(function (v, i) { return ider.indexOf(v) === i; });
    return Promise.all(unike.map(lastAvatar)).then(function (bilder) {
      var kart = {};
      unike.forEach(function (id, i) { kart[id] = bilder[i]; });
      return kart;
    });
  }

  function navnFor(id) {
    var p = GolfStore.player(id);
    return p ? p.name : 'Ukjent';
  }

  function avatarFor(id) {
    var p = GolfStore.player(id);
    return p ? p.avatarId : GolfAvatars.list[0].id;
  }

  /* UI-REDESIGN: samme merker som scorekortet i appen. Sirkel for birdie,
     dobbel sirkel for eagle eller bedre, firkant for bogey og dobbel firkant
     for dobbeltbogey eller verre. */
  function slagMerke(slag, par) {
    if (!par || typeof slag !== 'number') return null;
    var diff = slag - par;
    if (diff <= -2) return 'eagle';
    if (diff === -1) return 'birdie';
    if (diff === 1) return 'bogey';
    if (diff >= 2) return 'dobbel';
    return null;
  }

  function tegnMerke(ctx, form, cx, cy, r) {
    var under = form === 'eagle' || form === 'birdie';
    ctx.save();
    ctx.strokeStyle = under ? F.god : '#c9d4cd';
    ctx.lineWidth = 2.25;
    function sirkel(rr) { ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); }
    function firkant(rr) { rundRekt(ctx, cx - rr, cy - rr, rr * 2, rr * 2, 5); ctx.stroke(); }
    if (form === 'birdie') sirkel(r);
    if (form === 'eagle') { sirkel(r - 2); sirkel(r + 2.5); }
    if (form === 'bogey') firkant(r - 1);
    if (form === 'dobbel') { firkant(r - 3); firkant(r + 1.5); }
    ctx.restore();
  }

  function byggMatch(runde, hullRader, bane) {
    var pars = bane && bane.pars;
    var stilling = GolfMatch.stilling(hullRader, runde.playerIds);
    var perHull = GolfMatch.poengPerHull(hullRader, runde.playerIds);
    var ferdige = GolfMatch.ferdigeHull(hullRader, runde.playerIds);

    var stillingRader = stilling.map(function (s) {
      var i = runde.playerIds.indexOf(s.playerId);
      return {
        plass: s.place,
        navn: navnFor(s.playerId),
        under: s.shared ? 'delt plassering' : null,
        avatarIder: [avatarFor(s.playerId)],
        farge: F.spiller[i % 4],
        verdi: poengTekst(s.points) + ' p'
      };
    });

    var kolonner = [];
    for (var h = 1; h <= runde.holes; h++) kolonner.push({ merke: h, indeks: h });

    var kortRader = runde.playerIds.map(function (id, i) {
      var celler = {};
      for (var h = 1; h <= runde.holes; h++) {
        var rad = null;
        for (var k = 0; k < hullRader.length; k++) if (hullRader[k].hole === h) rad = hullRader[k];
        var slag = rad && rad.strokes ? rad.strokes[id] : undefined;
        if (slag === undefined) { celler[h] = null; continue; }
        var poeng = perHull[h] ? perHull[h][id] : 0;
        celler[h] = {
          tekst: String(slag),
          tall: slag,
          under: perHull[h] ? poengTekst(poeng) : '',
          undertall: perHull[h] ? poeng : undefined,
          uthev: poeng === 1,
          underFarge: poeng > 0 ? F.god : F.muted,
          form: slagMerke(slag, GolfStore.parFor(pars, h))
        };
      }
      return {
        navn: fornavn(navnFor(id)),
        avatarIder: [avatarFor(id)],
        farge: F.spiller[i % 4],
        celler: celler
      };
    });

    var seksjoner = [
      toppSeksjon(runde, ferdige + ' hull · ' + UI.formatDate(runde.startedAt)),
      stillingSeksjon(stillingRader),
      scorekortSeksjon('Scorekort · slag og poeng', kolonner, kortRader),
      bunnSeksjon(UI.formatDate(runde.startedAt))
    ];

    return tegnAlt(seksjoner, runde.playerIds.map(avatarFor));
  }

  function byggScramble(runde, hullRader, bane) {
    var lag = runde.teams && runde.teams.length
      ? runde.teams
      : [{ name: 'Laget', playerIds: runde.playerIds.slice() }];
    var stilling = GolfScramble.stilling(hullRader, lag.length);
    var ferdige = GolfScramble.ferdigeHull(hullRader, lag.length);
    var pars = bane && bane.pars;

    var stillingRader = stilling.map(function (s) {
      var l = lag[s.teamIndex];
      var diff = GolfScramble.motPar(hullRader, s.teamIndex, pars, lag.length);
      return {
        plass: lag.length > 1 ? s.place : null,
        navn: l.name,
        under: l.playerIds.map(navnFor).join(', '),
        avatarIder: l.playerIds.map(avatarFor),
        farge: F.spiller[s.teamIndex % 4],
        verdi: String(s.strokes),
        verdiUnder: diff === null ? null : diff === 0 ? 'Par' : GolfScramble.motParTekst(diff) + ' mot par'
      };
    });

    var kolonner = [];
    for (var h = 1; h <= runde.holes; h++) kolonner.push({ merke: h, indeks: h });

    var kortRader = lag.map(function (l, i) {
      var celler = {};
      for (var h = 1; h <= runde.holes; h++) {
        var rad = null;
        for (var k = 0; k < hullRader.length; k++) if (hullRader[k].hole === h) rad = hullRader[k];
        var d = GolfScramble.lagData(rad, i);
        if (!d || !d.strokes) { celler[h] = null; continue; }
        var p = GolfStore.parFor(pars, h);
        celler[h] = {
          tekst: String(d.strokes),
          tall: d.strokes,
          under: d.mark ? (d.mark === 'birdie' ? 'B' : d.mark === 'eagle' ? 'E' : 'HIO') : '',
          uthev: !!d.mark,
          farge: p !== null && d.strokes < p ? F.god : F.ink,
          underFarge: F.gull,
          form: slagMerke(d.strokes, p)
        };
      }
      return {
        navn: lag.length > 1 ? l.name : 'Slag',
        avatarIder: l.playerIds.map(avatarFor),
        farge: F.spiller[i % 4],
        celler: celler
      };
    });

    // Høydepunkter: solo-registreringene og de mest brukte utslagene.
    var merker = GolfScramble.merkeTelling(hullRader, lag.length);
    var utslag = GolfScramble.utslagTelling(hullRader, lag.length);
    var linjer = [];
    Object.keys(merker.solo).forEach(function (pid) {
      var s = merker.solo[pid];
      var d = [];
      if (s.hio) d.push(UI.plural(s.hio, 'hole in one', 'hole in one'));
      if (s.eagle) d.push(UI.plural(s.eagle, 'solo eagle', 'solo eagles'));
      if (s.birdie) d.push(UI.plural(s.birdie, 'solo birdie', 'solo birdier'));
      if (d.length) linjer.push(navnFor(pid) + ': ' + d.join(', '));
    });
    var flest = Object.keys(utslag).sort(function (a, b) { return utslag[b] - utslag[a]; });
    if (flest.length) {
      linjer.push('Flest utslag brukt: ' + flest.slice(0, 3).map(function (id) {
        return navnFor(id) + ' ' + utslag[id];
      }).join(', '));
    }

    var seksjoner = [
      toppSeksjon(runde, ferdige + ' hull · ' + UI.formatDate(runde.startedAt)),
      stillingSeksjon(stillingRader),
      scorekortSeksjon('Scorekort · slag per hull', kolonner, kortRader),
      listeSeksjon('Høydepunkter', linjer),
      bunnSeksjon(UI.formatDate(runde.startedAt))
    ];

    return tegnAlt(seksjoner, runde.playerIds.map(avatarFor));
  }

  function tegnAlt(seksjoner, avatarIder) {
    return samleAvatarer(avatarIder).then(function (avatarer) {
      var hoyde = M * 2 + seksjoner.reduce(function (s, x) { return s + x.hoyde; }, 0);

      var canvas = document.createElement('canvas');
      canvas.width = B;
      canvas.height = Math.round(hoyde);
      var ctx = canvas.getContext('2d');

      // bakgrunn med en svak glød øverst, så bildet ikke blir flatt
      ctx.fillStyle = F.bg;
      ctx.fillRect(0, 0, B, canvas.height);
      var glod = ctx.createRadialGradient(B * 0.2, 0, 0, B * 0.2, 0, B * 1.1);
      glod.addColorStop(0, 'rgba(76, 179, 119, 0.16)');
      glod.addColorStop(1, 'rgba(76, 179, 119, 0)');
      ctx.fillStyle = glod;
      ctx.fillRect(0, 0, B, canvas.height);

      ctx.textBaseline = 'alphabetic';
      var y = M;
      seksjoner.forEach(function (s) {
        s.tegn(ctx, y, avatarer);
        y += s.hoyde;
      });
      return canvas;
    });
  }

  /* ======================================================================
     Del bildet
     ====================================================================== */

  function filnavn(runde) {
    var d = new Date(runde.startedAt);
    function p(n) { return String(n).padStart(2, '0'); }
    // UI-REDESIGN: filnavnet følger det nye navnet.
    return 'golfmatch2-' + (runde.mode === 'match' ? 'match' : 'scramble') + '-' +
           d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.png';
  }

  function tilBlob(canvas) {
    return new Promise(function (res, rej) {
      if (canvas.toBlob) canvas.toBlob(function (b) { b ? res(b) : rej(new Error('tomt bilde')); }, 'image/png');
      else rej(new Error('canvas.toBlob mangler'));
    });
  }

  function del(runde, hullRader, bane) {
    return bygg(runde, hullRader, bane)
      .then(tilBlob)
      .then(function (blob) {
        var navn = filnavn(runde);
        var fil = null;
        try { fil = new File([blob], navn, { type: 'image/png' }); } catch (e) { /* eldre nettlesere */ }

        if (fil && navigator.canShare && navigator.canShare({ files: [fil] })) {
          return navigator.share({ files: [fil] })
            .then(function () { return 'delt'; })
            .catch(function (err) {
              if (err && err.name === 'AbortError') return 'avbrutt';
              return lastNed(blob, navn);
            });
        }
        return lastNed(blob, navn);
      });
  }

  function lastNed(blob, navn) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = navn;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return 'lastet ned';
  }

  global.GolfRapport = { bygg: bygg, del: del, filnavn: filnavn };
})(window);
