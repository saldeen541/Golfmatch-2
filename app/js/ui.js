/* ==========================================================================
   Golfapp - små byggeklosser for grensesnittet

   All tekst fra brukeren settes med textContent, aldri som HTML. Det er
   grunnen til at appen ikke kan lure inn kode gjennom et spillernavn.
   ========================================================================== */

(function (global) {
  'use strict';

  function applyStyle(node, value) {
    if (!value) return;
    if (typeof value === 'object') {
      Object.keys(value).forEach(function (prop) {
        node.style.setProperty(prop, value[prop]);
      });
      return;
    }
    String(value).split(';').forEach(function (bit) {
      var i = bit.indexOf(':');
      if (i < 0) return;
      var prop = bit.slice(0, i).trim();
      var val = bit.slice(i + 1).trim();
      if (prop) node.style.setProperty(prop, val);
    });
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;      // kun for egne SVG-er
        // Stil settes gjennom CSSOM, ikke som style-attributt. Da kan
        // sikkerhetsregelen i index.html holde inline stil helt stengt.
        else if (k === 'style') applyStyle(node, v);
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (Array.isArray(children) ? children : children ? [children] : [])
      .forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /* ---- avatar --------------------------------------------------------- */

  function avatar(avatarId, size, playerColorVar) {
    var inner = el('span', {
      class: 'avatar',
      style: 'width:' + size + 'px;height:' + size + 'px',
      html: (GolfAvatars.get(avatarId) || GolfAvatars.list[0]).svg
    });
    if (!playerColorVar) return inner;
    return el('span', {
      class: 'avatar-ring',
      style: '--player-color:var(' + playerColorVar + ')'
    }, inner);
  }

  function playerColorVar(index) {
    return '--player-' + ((index % 4) + 1);
  }

  /* ---- melding nederst ------------------------------------------------ */

  var toastTimer = null;

  function toast(message) {
    var box = document.getElementById('toast');
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    box.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      box.classList.remove('is-on');
      setTimeout(function () { box.hidden = true; }, 200);
    }, 2600);
  }

  /* ---- bekreftelse ----------------------------------------------------
     Egen dialog i stedet for confirm(), som ser dårlig ut på mobil og
     låser siden mens den står åpen.
     -------------------------------------------------------------------- */

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var backdrop = el('div', { class: 'modal-backdrop' });
      var okBtn = el('button', {
        class: 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary'),
        text: opts.confirmText || 'Ja',
        onclick: function () { close(true); }
      });
      var box = el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [
        el('h2', { text: opts.title }),
        opts.body ? el('p', { class: 'muted', text: opts.body }) : null,
        el('div', { class: 'modal-actions' }, [
          el('button', {
            class: 'btn btn-ghost',
            text: opts.cancelText || 'Avbryt',
            onclick: function () { close(false); }
          }),
          okBtn
        ])
      ]);
      backdrop.appendChild(box);
      backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) close(false);
      });
      function onKey(e) { if (e.key === 'Escape') close(false); }
      function close(result) {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
        resolve(result);
      }
      document.addEventListener('keydown', onKey);
      document.body.appendChild(backdrop);
      okBtn.focus();
    });
  }

  /* ---- diverse -------------------------------------------------------- */

  function formatDate(ms) {
    var d = new Date(ms);
    return d.toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function emptyState(title, body, action) {
    return el('div', { class: 'empty' }, [
      el('p', { class: 'empty-title', text: title }),
      body ? el('p', { class: 'muted', text: body }) : null,
      action || null
    ]);
  }

  global.UI = {
    el: el,
    clear: clear,
    avatar: avatar,
    playerColorVar: playerColorVar,
    toast: toast,
    confirm: confirmDialog,
    formatDate: formatDate,
    plural: plural,
    emptyState: emptyState
  };
})(window);
