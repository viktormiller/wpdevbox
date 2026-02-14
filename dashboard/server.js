const http = require('http');
const fs = require('fs');
const path = require('path');

const envPath = path.join('/app', '..', '.env');

function parseEnv(text) {
  return text.split('\n').filter(Boolean).filter(l => !l.startsWith('#')).reduce((a,l)=>{
    const i=l.indexOf('='); if(i>0)a[l.slice(0,i)]=l.slice(i+1); return a;
  },{});
}

http.createServer((req,res)=>{
  let env = {};
  try { env = parseEnv(fs.readFileSync(envPath,'utf8')); } catch {}
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>WPDevBox</title>
  <style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto}code{background:#f3f3f3;padding:2px 6px}</style></head><body>
  <h1>WPDevBox Dashboard (MVP)</h1>
  <ul>
    <li>Web server: <code>${env.WEB_SERVER||'nginx'}</code></li>
    <li>PHP: <code>${env.PHP_VERSION||'8.2'}</code></li>
    <li>DB image: <code>${env.MYSQL_IMAGE||'mariadb:10.11'}</code></li>
    <li>Mailpit: <a href="http://localhost:${env.MAILPIT_UI_PORT||18025}">open</a></li>
    <li>Adminer: <a href="http://localhost:${env.ADMINER_PORT||18081}">open</a></li>
  </ul>
  </body></html>`;
  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
  res.end(html);
}).listen(9000, ()=>console.log('dashboard on :9000'));
