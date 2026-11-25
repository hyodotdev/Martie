#!/usr/bin/env node
// Re-verifies captured receipts on IAPKit (production by default).
//
//   node iapkit-verify.mjs <capture-file>
//
// Reads IAPKIT_API_KEY and IAPKIT_BASE_URL from the environment or the
// repository's gitignored .env.local. Prints only the verdict fields.
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const readEnvLocal = () => {
  const file = path.join(repoRoot, '.env.local');
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '')]),
  );
};

const envLocal = readEnvLocal();
const apiKey = process.env.IAPKIT_API_KEY ?? envLocal.IAPKIT_API_KEY;
const baseUrl =
  process.env.IAPKIT_BASE_URL ??
  envLocal.IAPKIT_BASE_URL ??
  'https://kit.openiap.dev';
if (!apiKey) {
  console.error('BLOCKED: IAPKIT_API_KEY is not set (see .env.local)');
  process.exit(2);
}

const body = (p) => {
  switch (p.store) {
    case 'apple':
    case 'ios':
      return {store: 'apple', jws: p.token, expectedProductId: p.productId};
    case 'google':
    case 'android':
      return {
        store: 'google',
        purchaseToken: p.token,
        expectedProductId: p.productId,
      };
    case 'amazon':
      return {
        store: 'amazon',
        userId: p.amazonUserId,
        receiptId: p.token,
        sandbox: true,
        expectedProductId: p.productId,
      };
    default:
      return null;
  }
};

const purchases = JSON.parse(readFileSync(process.argv[2], 'utf8'));
let failed = false;
for (const purchase of purchases) {
  const request = body(purchase);
  if (!request) {
    console.log(
      `SKIP ${purchase.store} ${purchase.productId}: no IAPKit route`,
    );
    continue;
  }
  const response = await fetch(`${baseUrl}/v1/purchase/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  const result = await response.json();
  const pass =
    response.ok &&
    result.isValid === true &&
    String(result.environment ?? '').toLowerCase() === 'sandbox';
  failed ||= !pass;
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${request.store} ${purchase.productId}`,
    JSON.stringify({
      http: response.status,
      isValid: result.isValid,
      state: result.state,
      environment: result.environment,
      productId: result.productId,
      error: result.errors?.[0]?.code,
    }),
  );
}
process.exitCode = failed ? 1 : 0;
