const http = require('http');
const fs = require('fs');
const path = require('path');
const net = require('net');

const ENV_PATH = path.join(__dirname, '.env');
const SITES_DIR = '/sites';
const DOCKER_SOCKET = '/var/run/docker.sock';
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = 9000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const PASSWORD_KEYS = new Set([
  'MYSQL_ROOT_PASSWORD', 'MYSQL_PASSWORD',
]);

// ---------------------------------------------------------------------------
// .env parser
// ---------------------------------------------------------------------------
function parseEnv(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); } catch { return {}; }
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

// ---------------------------------------------------------------------------
// Docker Engine API via unix socket
// ---------------------------------------------------------------------------
function dockerGet(apiPath) {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection(DOCKER_SOCKET, () => {
      sock.write(
        `GET ${apiPath} HTTP/1.0\r\nHost: localhost\r\n\r\n`
      );
    });

    let data = '';
    sock.on('data', (chunk) => { data += chunk.toString(); });
    sock.on('end', () => {
      const bodyStart = data.indexOf('\r\n\r\n');
      if (bodyStart === -1) return reject(new Error('Bad HTTP response'));
      const body = data.slice(bodyStart + 4);
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('JSON parse failed: ' + e.message)); }
    });
    sock.on('error', reject);
    sock.setTimeout(5000, () => { sock.destroy(); reject(new Error('Timeout')); });
  });
}

// ---------------------------------------------------------------------------
// API: /api/config
// ---------------------------------------------------------------------------
function apiConfig(req, res) {
  const env = parseEnv(ENV_PATH);
  const filtered = {};
  for (const [k, v] of Object.entries(env)) {
    filtered[k] = PASSWORD_KEYS.has(k) ? '••••••' : v;
  }
  json(res, filtered);
}

// ---------------------------------------------------------------------------
// API: /api/sites
// ---------------------------------------------------------------------------
function apiSites(req, res) {
  const env = parseEnv(ENV_PATH);
  const tld = env.TLD || 'loc';
  const httpPort = env.HTTP_PORT || '18080';
  const httpsPort = env.HTTPS_PORT || '18443';
  const adminerPort = env.ADMINER_PORT || '18081';

  let entries;
  try { entries = fs.readdirSync(SITES_DIR, { withFileTypes: true }); }
  catch { return json(res, []); }

  const sites = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'general') continue;

    const sitePath = path.join(SITES_DIR, entry.name);
    const hasWpConfig = fileExists(path.join(sitePath, 'wp-config.php'));
    const hasWpAdmin = dirExists(path.join(sitePath, 'wp-admin'));
    const hasWordPress = hasWpConfig || hasWpAdmin;

    const domain = `${entry.name}.${tld}`;
    const dbName = 'wp_' + entry.name.replace(/-/g, '_');

    sites.push({
      name: entry.name,
      domain,
      httpUrl: `http://${domain}:${httpPort}`,
      httpsUrl: `https://${domain}:${httpsPort}`,
      wpAdminUrl: hasWordPress ? `http://${domain}:${httpPort}/wp-admin/` : null,
      dbName,
      adminerUrl: `http://localhost:${adminerPort}/?server=db&username=wp&db=${dbName}`,
      hasWordPress,
    });
  }

  sites.sort((a, b) => a.name.localeCompare(b.name));
  json(res, sites);
}

// ---------------------------------------------------------------------------
// API: /api/containers
// ---------------------------------------------------------------------------
async function apiContainers(req, res) {
  const env = parseEnv(ENV_PATH);
  const project = env.COMPOSE_PROJECT_NAME || 'wpdevbox';
  const filter = JSON.stringify({ label: [`com.docker.compose.project=${project}`] });
  const apiPath = `/v1.44/containers/json?all=true&filters=${encodeURIComponent(filter)}`;

  try {
    const raw = await dockerGet(apiPath);
    const containers = raw.map((c) => ({
      service: c.Labels['com.docker.compose.service'] || 'unknown',
      name: (c.Names[0] || '').replace(/^\//, ''),
      image: c.Image,
      state: c.State,
      status: c.Status,
      ports: [...new Set(
        (c.Ports || [])
          .filter((p) => p.PublicPort)
          .map((p) => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`)
      )],
      health: (c.State === 'running' && c.Status.includes('healthy'))
        ? 'healthy'
        : (c.State === 'running' && c.Status.includes('health:'))
          ? 'unhealthy'
          : null,
    }));
    containers.sort((a, b) => a.service.localeCompare(b.service));
    json(res, containers);
  } catch (err) {
    json(res, { error: err.message }, 502);
  }
}

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Prevent directory traversal
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return notFound(res);
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return notFound(res);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

function fileExists(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

function dirExists(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];

  if (req.method === 'GET') {
    switch (urlPath) {
      case '/api/config':     return apiConfig(req, res);
      case '/api/sites':      return apiSites(req, res);
      case '/api/containers': return apiContainers(req, res);
      default:                return serveStatic(req, res);
    }
  }

  notFound(res);
});

server.listen(PORT, () => console.log(`Dashboard running on :${PORT}`));
