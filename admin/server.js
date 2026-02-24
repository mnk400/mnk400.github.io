const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  });
}

const PORT = parseInt(process.env.PORT || '3333');
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const S3_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

// =============================================================================
// AWS Signature V4 + S3 proxy
// =============================================================================

function signRequest(method, objectKey, body, contentType, queryParams) {
  const date = new Date();
  const amzDate = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);
  const hash = d => crypto.createHash('sha256').update(d).digest('hex');
  const hmac = (k, d) => crypto.createHmac('sha256', k).update(d, 'utf8').digest();

  const url = new URL(`${S3_ENDPOINT}/${R2_BUCKET}/${objectKey}`);
  if (queryParams) Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
  const payloadHash = hash(body || '');

  const headers = { host: url.host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash };
  if (contentType) headers['content-type'] = contentType;

  const signedHeaderKeys = Object.keys(headers).sort();
  const signedHeaders = signedHeaderKeys.join(';');
  const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}\n`).join('');
  const canonicalQS = [...url.searchParams.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const canonicalRequest = [method, url.pathname, canonicalQS, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, hash(canonicalRequest)].join('\n');

  const kSigning = ['auto', 's3', 'aws4_request'].reduce((k, v) => hmac(k, v), hmac('AWS4' + R2_SECRET_KEY, dateStamp));
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');
  headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { url: url.toString(), headers };
}

async function proxyToR2(method, objectKey, body, contentType, queryParams) {
  const { url, headers } = signRequest(method, objectKey, body, contentType, queryParams);
  const res = await fetch(url, { method, headers, body: method !== 'GET' && method !== 'HEAD' ? body : undefined });
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: Buffer.from(await res.arrayBuffer()) };
}

function extractXml(xml, tag) {
  const results = [];
  const re = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[1]);
  return results;
}

// =============================================================================
// HTTP helpers
// =============================================================================

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function requireCreds(res) {
  if (!R2_ACCESS_KEY || !R2_SECRET_KEY) {
    sendJson(res, 500, { error: 'R2 credentials not configured in .env' });
    return false;
  }
  return true;
}

// =============================================================================
// HTTP server
// =============================================================================

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://0.0.0.0:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // Serve index.html
  if (url.pathname === '/' && req.method === 'GET') {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const configScript = `<script>
      window.__R2_CONFIG = {
        publicUrl: ${JSON.stringify(R2_PUBLIC_URL)},
        bucket: ${JSON.stringify(R2_BUCKET)},
        albums: ['photos', 'art'],
      };
    </script>`;
    html = html.replace('</head>', configScript + '\n</head>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // Discover albums: /api/albums
  if (url.pathname === '/api/albums' && req.method === 'GET') {
    if (!requireCreds(res)) return;
    try {
      const r2Res = await proxyToR2('GET', '', null, null, { 'list-type': '2', delimiter: '/', 'max-keys': '100' });
      const prefixes = extractXml(r2Res.body.toString('utf8'), 'Prefix').map(p => p.replace(/\/$/, '')).filter(Boolean);
      sendJson(res, 200, prefixes);
    } catch (err) {
      console.error('Albums list error:', err);
      sendJson(res, 502, { error: err.message });
    }
    return;
  }

  // Proxy S3 requests: /r2/{objectKey}
  if (url.pathname.startsWith('/r2/')) {
    if (!requireCreds(res)) return;
    const objectKey = decodeURIComponent(url.pathname.slice(4));

    try {
      const body = ['PUT', 'POST'].includes(req.method) ? await readBody(req) : null;
      const r2Res = await proxyToR2(req.method, objectKey, body, req.headers['content-type'] || null);
      res.writeHead(r2Res.status, { 'Content-Type': r2Res.headers['content-type'] || 'application/octet-stream' });
      res.end(r2Res.body);
    } catch (err) {
      console.error('R2 proxy error:', err);
      sendJson(res, 502, { error: err.message });
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Admin running at http://0.0.0.0:${PORT}`);
  console.log(`R2 bucket: ${R2_BUCKET}`);
  console.log(`Public URL: ${R2_PUBLIC_URL}`);
  if (!R2_ACCESS_KEY || !R2_SECRET_KEY) {
    console.log('\n⚠  R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are empty in .env');
    console.log('   Create an API token at: Cloudflare Dashboard > R2 > Manage R2 API Tokens');
  }
});
