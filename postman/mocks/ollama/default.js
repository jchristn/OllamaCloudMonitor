const http = require('http');
http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const url = new URL(req.url, 'http://127.0.0.1');
  const token = req.headers.authorization;
  if (token === 'Bearer invalid') { res.writeHead(401); return res.end('{"error":"invalid api key"}'); }
  if (token === 'Bearer limited') { res.writeHead(429, {'Retry-After':'8'}); return res.end('{"error":"too many requests"}'); }
  if (token === 'Bearer forbidden' && url.searchParams.get('scope') === 'team') {res.writeHead(403);return res.end('{"error":"admin required"}');}
  if (token === 'Bearer broken') {res.writeHead(500, {'Content-Type':'text/html'});return res.end('<html>Upstream failed</html>');}
  if (token === 'Bearer redirect') {res.writeHead(302, {Location:'https://example.com'});return res.end();}
  if (url.pathname === '/api/balance') return res.end(JSON.stringify(token === 'Bearer legacy' ? {included:{session:{remaining_percent:75,resets_at:'2026-12-01T00:00:00Z'},weekly:{remaining_percent:40,resets_at:'2026-12-05T00:00:00Z'}},purchased:{balance_usd:25}} : {included:{balance_usd:72.5,allowance_usd:100,period:{from:'2026-11-01T00:00:00Z',until:'2026-12-01T00:00:00Z'}},purchased:{balance_usd:25}}));
  if (url.pathname !== '/api/usage') {res.writeHead(501);return res.end('{"error":"not modeled"}');}
  if (!token?.startsWith('Bearer ')) {res.writeHead(401);return res.end('{"error":"missing token"}');}
  const range=url.searchParams.get('range')||'7d';
  const count=range==='24h'?25:range==='7d'?8:31;
  const step=range==='24h'?3600000:86400000;
  const now=Date.now(),start=Math.floor(now/step)*step-(count-1)*step;
  const models=['qwen3-coder:480b','gpt-oss:120b','deepseek-v3.1:671b'];
  const keys=token==='Bearer legacy'?['request_count']:['request_count','usage_usd','input_tokens','cached_input_tokens','output_tokens'];
  const buckets=Array.from({length:count},(_,i)=>{
    const groups=models.map((model,j)=>({model,...Object.fromEntries(keys.map(key=>[key,key==='usage_usd'?Number(((Math.sin(i*1.6+j)+1.5)*(j===0?1.1:.45)).toFixed(4)):key==='request_count'?(i*13+j*7)%80+8:(i+1)*(j+1)*1200]))}));
    if(token==='Bearer empty')groups.splice(0);
    const remainder=Object.fromEntries(keys.map(key=>[key,key==='usage_usd'?.02:2]));
    return {from:new Date(start+i*step).toISOString(),until:new Date(i===count-1?now:start+(i+1)*step).toISOString(),partial:i===count-1,groups,remainder,...Object.fromEntries(keys.map(key=>[key,groups.reduce((sum,g)=>sum+g[key],remainder[key])]))};
  });
  const totals=Object.fromEntries(keys.map(key=>[key,buckets.reduce((sum,b)=>sum+b[key],0)]));
  totals.groups=models.map(model=>({model,...Object.fromEntries(keys.map(key=>[key,buckets.reduce((sum,b)=>sum+(b.groups.find(g=>g.model===model)?.[key]||0),0)]))}));
  totals.remainder=Object.fromEntries(keys.map(key=>[key,buckets.reduce((sum,b)=>sum+b.remainder[key],0)]));
  res.end(JSON.stringify({range,scope:url.searchParams.get('scope')||'self',group_by:'model',granularity:range==='24h'?'hour':'day',from:buckets[0].from,until:new Date(now).toISOString(),totals,buckets}));
}).listen(process.env.PORT || 9090, '127.0.0.1');
