// WPDevBox Dashboard — Frontend
// Polls /api/containers and /api/sites every 10s. Config loaded once.

(function () {
  'use strict';

  const POLL_INTERVAL = 10_000;
  let config = {};
  let prevContainersJSON = '';
  let prevSitesJSON = '';
  let firstRender = { services: true, sites: true };

  // ── Fetch helpers ──────────────────────────────────────────
  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  // ── Header badges ──────────────────────────────────────────
  function renderBadges(cfg) {
    const el = document.getElementById('header-badges');
    const badges = [
      { label: 'PHP', value: cfg.PHP_VERSION || '?' },
      { label: 'Web', value: cfg.WEB_SERVER || '?' },
      { label: 'DB',  value: cfg.MYSQL_IMAGE || '?' },
    ];
    el.innerHTML = badges.map(function (b) {
      return '<span class="badge"><span class="badge-label">' + esc(b.label) +
        '</span> ' + esc(b.value) + '</span>';
    }).join('');
  }

  // ── Services ───────────────────────────────────────────────
  function renderServices(containers, animate) {
    const grid = document.getElementById('services-grid');
    const count = document.getElementById('services-count');
    const running = containers.filter(function (c) { return c.state === 'running'; }).length;
    count.textContent = running + '/' + containers.length + ' running';

    if (!containers.length) {
      grid.innerHTML = '<div class="empty-state">No containers found. Is Docker running?</div>';
      return;
    }

    grid.innerHTML = containers.map(function (c, i) {
      var dotClass = c.state === 'running' ? 'status-dot--running'
        : c.state === 'exited' ? 'status-dot--exited'
        : 'status-dot--other';

      var ports = (c.ports || []).map(function (p) {
        return '<span class="port-tag">' + esc(p) + '</span>';
      }).join('');

      var animStyle = animate ? ' style="animation-delay:' + (i * 40) + 'ms"' : '';
      var cardClass = animate ? 'card' : 'card card--no-anim';

      return '<div class="' + cardClass + '"' + animStyle + '>' +
        '<div class="card-header">' +
          '<span class="status-dot ' + dotClass + '"></span>' +
          '<span class="card-service">' + esc(c.service) + '</span>' +
        '</div>' +
        '<div class="card-image">' + esc(c.image) + '</div>' +
        '<div class="card-status">' + esc(c.status) + '</div>' +
        (ports ? '<div class="card-ports">' + ports + '</div>' : '') +
      '</div>';
    }).join('');
  }

  // ── Sites ──────────────────────────────────────────────────
  function renderSites(sites, animate) {
    var grid = document.getElementById('sites-grid');
    var count = document.getElementById('sites-count');
    count.textContent = sites.length + (sites.length === 1 ? ' site' : ' sites');

    if (!sites.length) {
      grid.innerHTML = '<div class="empty-state">No sites yet. Run <code>./bin/devbox add-site mysite</code> to create one.</div>';
      return;
    }

    grid.innerHTML = sites.map(function (s, i) {
      var links = [
        '<a class="site-link" href="' + esc(s.httpUrl) + '" target="_blank">HTTP</a>',
        '<a class="site-link" href="' + esc(s.httpsUrl) + '" target="_blank">HTTPS</a>',
      ];
      if (s.wpAdminUrl) {
        links.push('<a class="site-link" href="' + esc(s.wpAdminUrl) + '" target="_blank">WP Admin</a>');
      }
      links.push('<a class="site-link" href="' + esc(s.adminerUrl) + '" target="_blank">Adminer</a>');

      var wpBadge = s.hasWordPress
        ? '<span class="wp-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 1.5c4.687 0 8.5 3.813 8.5 8.5 0 4.687-3.813 8.5-8.5 8.5-4.687 0-8.5-3.813-8.5-8.5 0-4.687 3.813-8.5 8.5-8.5zm-4.5 8.5l2.8 7.5L6 12zm3 0l3 7.5L10.5 12zm3.5 0l3 7.5-3-7.5zm3 0l2.5 7L17 12z"/></svg> WordPress</span>'
        : '';

      var animStyle = animate ? ' style="animation-delay:' + (i * 40) + 'ms"' : '';
      var cardClass = animate ? 'card' : 'card card--no-anim';

      return '<div class="' + cardClass + '"' + animStyle + '>' +
        '<div class="site-name">' + esc(s.name) + '</div>' +
        '<div class="site-domain">' + esc(s.domain) + '</div>' +
        '<div class="site-links">' + links.join('') + '</div>' +
        '<div class="site-meta">' +
          wpBadge +
          '<span class="db-tag">' + esc(s.dbName) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // ── Quick Links ────────────────────────────────────────────
  function renderQuickLinks(cfg) {
    var el = document.getElementById('quick-links');
    var mailpitPort = cfg.MAILPIT_UI_PORT || '18025';
    var adminerPort = cfg.ADMINER_PORT || '18081';
    var dashPort = cfg.DASHBOARD_PORT || '19000';

    var links = [
      {
        icon: 'mailpit', emoji: '\u2709',
        label: 'Mailpit', url: 'http://localhost:' + mailpitPort,
        desc: ':' + mailpitPort,
      },
      {
        icon: 'adminer', emoji: '\u{1F5C4}',
        label: 'Adminer', url: 'http://localhost:' + adminerPort,
        desc: ':' + adminerPort,
      },
      {
        icon: 'dash', emoji: '\u{1F4CA}',
        label: 'Dashboard', url: 'http://localhost:' + dashPort,
        desc: ':' + dashPort,
      },
    ];

    el.innerHTML = links.map(function (l) {
      return '<a class="quick-link" href="' + esc(l.url) + '" target="_blank">' +
        '<div class="quick-link-icon quick-link-icon--' + l.icon + '">' + l.emoji + '</div>' +
        '<div>' +
          '<div class="quick-link-label">' + esc(l.label) + '</div>' +
          '<div class="quick-link-url">localhost' + esc(l.desc) + '</div>' +
        '</div>' +
      '</a>';
    }).join('');
  }

  // ── Config Table ───────────────────────────────────────────
  function renderConfig(cfg) {
    var body = document.getElementById('config-body');
    var keys = Object.keys(cfg);

    if (!keys.length) {
      body.innerHTML = '<tr><td colspan="2" class="empty-state">No configuration loaded</td></tr>';
      return;
    }

    body.innerHTML = keys.map(function (k) {
      var val = cfg[k];
      var masked = val === '\u2022\u2022\u2022\u2022\u2022\u2022';
      return '<tr>' +
        '<td><span class="config-key">' + esc(k) + '</span></td>' +
        '<td><span class="config-val' + (masked ? ' config-val--masked' : '') + '">' + esc(val) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  // ── Skeleton loaders ───────────────────────────────────────
  function showSkeletons() {
    var skel = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
    document.getElementById('services-grid').innerHTML = skel;
    document.getElementById('sites-grid').innerHTML = skel;
  }

  // ── Escape HTML ────────────────────────────────────────────
  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Data loading ───────────────────────────────────────────
  async function loadConfig() {
    try {
      config = await fetchJSON('/api/config');
    } catch (e) {
      config = {};
      console.error('Failed to load config:', e);
    }
    renderBadges(config);
    renderQuickLinks(config);
    renderConfig(config);
  }

  async function pollData() {
    try {
      var data = await Promise.all([
        fetchJSON('/api/containers'),
        fetchJSON('/api/sites'),
      ]);
      var containers = Array.isArray(data[0]) ? data[0] : [];
      var sites = Array.isArray(data[1]) ? data[1] : [];

      var cJSON = JSON.stringify(containers);
      var sJSON = JSON.stringify(sites);

      if (cJSON !== prevContainersJSON) {
        renderServices(containers, firstRender.services);
        prevContainersJSON = cJSON;
        firstRender.services = false;
      }
      if (sJSON !== prevSitesJSON) {
        renderSites(sites, firstRender.sites);
        prevSitesJSON = sJSON;
        firstRender.sites = false;
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
  }

  // ── Init ───────────────────────────────────────────────────
  showSkeletons();
  loadConfig();
  pollData();
  setInterval(pollData, POLL_INTERVAL);
})();
