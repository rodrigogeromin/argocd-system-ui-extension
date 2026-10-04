import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const port = Number(process.env.PREVIEW_PORT || 8080);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PREVIEW_PORT must be between 1024 and 65535');
const compiler = spawn(process.execPath, ['node_modules/webpack/bin/webpack.js', '--mode', 'development', '--watch'], {stdio: 'inherit'});
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1:8080').pathname;
  const files = {'/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/preview.js': ['preview.js', 'application/javascript']};
  const file = files[pathname];
  if (!file) {response.writeHead(404).end('Not found'); return;}
  try { const content = await readFile(`dist/preview/${file[0]}`); response.writeHead(200, {'Content-Type': file[1], 'Cache-Control': 'no-store'}).end(content); }
  catch {response.writeHead(503).end('Preview compilation in progress. Reload after webpack completes.');}
});
server.listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port} (reload after edits)`));
function stop() {compiler.kill(); server.close();}
process.once('SIGTERM', stop); process.once('SIGINT', stop);
compiler.once('exit', () => server.close());
server.once('error', error => {console.error(error.message); compiler.kill(); process.exitCode = 1;});
