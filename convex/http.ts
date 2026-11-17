//* This file is needed for convex auth

import {httpActionGeneric, httpRouter} from 'convex/server';
import {auth} from './auth';
import {levelPlayRewardCallback} from './adReward';

const http = httpRouter();

auth.addHttpRoutes(http);

// Naver Pay 결제형 returnUrl landing page. The app WebView intercepts
// navigation to this URL before it loads; this is only a fallback.
const naverReturn = httpActionGeneric(async () => {
  return new Response(
    '<!doctype html><html><body><p>Naver Pay complete. You can close this view.</p></body></html>',
    {status: 200, headers: {'Content-Type': 'text/html'}},
  );
});

http.route({
  path: '/naverpay/return',
  method: 'GET',
  handler: naverReturn,
});

// Toss Pay payment-window returnUrl landing page. Same contract as above:
// the app WebView intercepts successUrl/failUrl before they load.
const tossReturn = httpActionGeneric(async () => {
  return new Response(
    '<!doctype html><html><body><p>Toss Pay complete. You can close this view.</p></body></html>',
    {status: 200, headers: {'Content-Type': 'text/html'}},
  );
});

http.route({
  path: '/toss/return',
  method: 'GET',
  handler: tossReturn,
});

// LevelPlay rewarded-ad server-to-server callback (see convex/adReward.ts).
http.route({
  path: '/levelplay/reward',
  method: 'GET',
  handler: levelPlayRewardCallback,
});
http.route({
  path: '/levelplay/reward',
  method: 'POST',
  handler: levelPlayRewardCallback,
});

export default http;
