#!/usr/bin/env node
/**
 * One-time helper — run it on YOUR computer (never in CI, never committed with secrets).
 *
 *   GBP_CLIENT_ID=xxx GBP_CLIENT_SECRET=yyy node scripts/get-refresh-token.mjs
 *
 * It opens Google's consent screen, receives the code on http://127.0.0.1:8085/callback,
 * prints your refresh token, then lists your Business Profile accounts and locations
 * (with each location's Place ID) so you can fill in GBP_ACCOUNT_ID / GBP_LOCATION_ID.
 *
 * Create the OAuth client as type "Desktop app" in Google Cloud Console.
 */
import http from 'node:http';
import crypto from 'node:crypto';

const { GBP_CLIENT_ID: clientId, GBP_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error('Set GBP_CLIENT_ID and GBP_CLIENT_SECRET first (see SETUP.md).');
  process.exit(1);
}
const PORT = 8085;
const redirectUri = `http://127.0.0.1:${PORT}/callback`;
const state = crypto.randomBytes(16).toString('hex');
const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage',
    access_type: 'offline',
    prompt: 'consent', // forces Google to return a refresh token
    state,
  });

console.log('\n1) Open this URL in your browser and sign in with the Google account that OWNS/MANAGES the business profile:\n');
console.log(authUrl, '\n');

const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== '/callback') return res.writeHead(404).end();
    if (url.searchParams.get('state') !== state) {
      res.writeHead(400).end('State mismatch');
      return reject(new Error('State mismatch'));
    }
    const err = url.searchParams.get('error');
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end(err ? `Error: ${err}` : 'Done. You can close this tab and return to the terminal.');
    server.close();
    err ? reject(new Error(err)) : resolve(url.searchParams.get('code'));
  });
  server.listen(PORT, '127.0.0.1');
});

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
});
const tokens = await tokenRes.json();
if (!tokens.refresh_token) {
  console.error('No refresh token returned:', tokens.error || tokens);
  process.exit(1);
}
console.log('\n=== GBP_REFRESH_TOKEN (store as a Cloudflare secret; do not share or commit) ===\n');
console.log(tokens.refresh_token, '\n');

const auth = { Authorization: `Bearer ${tokens.access_token}` };
const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: auth });
const accounts = await accRes.json();
if (!accRes.ok) {
  console.error('Could not list accounts (is the Business Profile API access approved for this Cloud project?):');
  console.error(JSON.stringify(accounts.error || accounts, null, 2));
  process.exit(1);
}
for (const a of accounts.accounts || []) {
  console.log(`ACCOUNT  ${a.name}  —  ${a.accountName}  (${a.type})   -> GBP_ACCOUNT_ID=${a.name.split('/')[1]}`);
  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title,metadata&pageSize=100`,
    { headers: auth },
  );
  const locs = await locRes.json();
  if (!locRes.ok) { console.error('  could not list locations:', JSON.stringify(locs.error || locs)); continue; }
  for (const l of locs.locations || []) {
    console.log(`  LOCATION  ${l.name}  —  ${l.title}   -> GBP_LOCATION_ID=${l.name.split('/')[1]}`);
    if (l.metadata?.placeId) console.log(`            PLACE_ID (official, from Google): ${l.metadata.placeId}`);
  }
}
console.log('\nDone.');
