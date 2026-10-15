import http from 'node:http';
import { readFile } from 'node:fs/promises';
import handler from '../../api/amazon-guardian.mjs';

const assets = {
  '/': ['amazon-judge.html', 'text/html'],
  '/amazon-judge.html': ['amazon-judge.html', 'text/html'],
  '/amazon-judge.js': ['amazon-judge.js', 'text/javascript'],
  '/amazon-judge.css': ['amazon-judge.css', 'text/css']
};
const port = Number(process.env.PORT || 3335);
http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/api/amazon-guardian') {
      // Local judge runner serves only free simulation modes; AWS remains a separate route.
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) { res.writeHead(413); return res.end(); }
      }
      let body;
      try { body = raw ? JSON.parse(raw) : {}; }
      catch { res.writeHead(400); return res.end('Invalid JSON'); }
      if (body.mode === 'bedrock') { res.writeHead(400); return res.end('Use the separately configured AWS route'); }
      res.status = code => { res.statusCode = code; return res; };
      res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
      return await handler({method:req.method, body}, res);
    }
    const asset = assets[path];
    if (req.method !== 'GET' || !asset) { res.writeHead(404); return res.end(); }
    const bytes = await readFile(new URL('../../frontend/public/' + asset[0], import.meta.url));
    res.writeHead(200, {'Content-Type':asset[1], 'Cache-Control':'no-store'});
    res.end(bytes);
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end('Local judge runner failed');
  }
}).listen(port, '127.0.0.1', () => console.log('Guardian simulation: http://127.0.0.1:' + port));
