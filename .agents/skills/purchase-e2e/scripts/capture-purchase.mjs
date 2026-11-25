#!/usr/bin/env node
// Captures store receipts from a running Martie debug build through Metro's
// inspector, so the same receipt can be re-verified on IAPKit.
//
//   node capture-purchase.mjs listen        # before tapping the store button
//   node capture-purchase.mjs dump <file>   # after the purchase completes
//
// `dump` writes the receipts to <file> with mode 0600 and prints only
// product ids and field lengths. Never commit or paste that file.
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const WebSocket = createRequire(path.join(repoRoot, 'package.json'))('ws');
const metro = process.env.METRO_URL ?? 'http://127.0.0.1:8081';

const LISTEN = `(() => {
  const iap = globalThis.expo?.modules?.ExpoIap;
  if (!iap) return {error: 'ExpoIap module not found'};
  globalThis.__purchaseE2E?.subscription?.remove?.();
  const purchases = [];
  const subscription = iap.addListener('purchase-updated', (p) => purchases.push(p));
  globalThis.__purchaseE2E = {purchases, subscription};
  return {listening: true};
})()`;

const DUMP = `(() => {
  const state = globalThis.__purchaseE2E;
  if (!state) return {error: 'listener not attached; run listen first'};
  return {
    purchases: state.purchases.map((p) => ({
      productId: p.productId,
      store: p.store ?? p.platform,
      token: p.purchaseToken ?? null,
      amazonUserId: p.userIdAmazon ?? null,
    })),
  };
})()`;

const target = async () => {
  const response = await fetch(`${metro}/json/list`);
  const pages = await response.json();
  // METRO_DEVICE picks one app when several devices share Metro, e.g. "iPhone".
  const device = process.env.METRO_DEVICE ?? '';
  const page = pages.find(
    (p) => p.appId === 'dev.hyo.martie' && p.title.includes(device),
  );
  if (!page) throw new Error('No app is connected to Metro');
  // Metro only accepts inspector clients from its own origin.
  const url = new URL(page.webSocketDebuggerUrl);
  url.hostname = new URL(metro).hostname;
  return {url: url.toString(), name: page.title};
};

const evaluate = ({url}, expression) =>
  new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {headers: {Origin: metro}});
    const timer = setTimeout(
      () => reject(new Error('inspector timeout')),
      15000,
    );
    ws.on('open', () =>
      ws.send(
        JSON.stringify({
          id: 1,
          method: 'Runtime.evaluate',
          params: {expression, returnByValue: true},
        }),
      ),
    );
    ws.on('message', (data) => {
      const message = JSON.parse(String(data));
      if (message.id !== 1) return;
      clearTimeout(timer);
      ws.close();
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result?.result?.value);
    });
    ws.on('error', reject);
  });

const [mode, file] = process.argv.slice(2);
const page = await target();
if (mode === 'listen') {
  const result = await evaluate(page, LISTEN);
  if (result?.error) throw new Error(result.error);
  console.log(`listening on ${page.name}`);
} else if (mode === 'dump' && file) {
  const result = await evaluate(page, DUMP);
  if (result?.error) throw new Error(result.error);
  writeFileSync(file, JSON.stringify(result.purchases, null, 2), {mode: 0o600});
  for (const p of result.purchases) {
    console.log(
      `${p.store} ${p.productId} token=${p.token?.length ?? 0} chars` +
        (p.amazonUserId ? ` amazonUserId=${p.amazonUserId.length} chars` : ''),
    );
  }
  if (result.purchases.length === 0) process.exitCode = 1;
} else {
  console.error('usage: capture-purchase.mjs listen | dump <file>');
  process.exitCode = 2;
}
