const http = require('http');
const fs   = require('fs');

const logStream = fs.createWriteStream('app.log', { flags: 'a' });

const ts = () => new Date().toISOString();
const writeLine = (line) => { process.stdout.write(line + '\n'); logStream.write(line + '\n'); };

const log  = (msg, m = {}) => writeLine(`${ts()} [INFO]  ${msg} ${JSON.stringify(m)}`);
const warn = (msg, m = {}) => writeLine(`${ts()} [WARN]  ${msg} ${JSON.stringify(m)}`);
const err  = (msg, e)      => writeLine(`${ts()} [ERROR] ${msg}\n${e.stack}`);

function fetchPaymentGateway() {
  if (Math.random() < 0.3) throw new Error('PaymentGatewayTimeout: upstream did not respond in 5000ms');
  return { status: 'ok', txId: `tx_${Date.now()}` };
}

http.createServer((req, res) => {
  log(`${req.method} ${req.url}`);
  res.end('ok');
}).listen(3000, () => log('server listening on :3000'));

// 백그라운드 잡음 ─ 실제 운영 서버처럼 INFO가 잔뜩 쌓이게
setInterval(() => log('heartbeat', { uptime: process.uptime() }), 1000);
setInterval(() => log('cache stats', { hits: 1240, misses: 87 }), 2500);
setInterval(() => warn('slow query detected', { ms: 1200, table: 'orders' }), 7000);
setInterval(() => {
  try { fetchPaymentGateway(); }
  catch (e) { err('background payment retry failed', e); }
}, 4000);
