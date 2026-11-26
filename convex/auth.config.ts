import {convexAuthProvider} from '@convex-dev/auth/server';

export default {
  providers: [
    // Convex Auth 0.0.x (`convex/auth.ts`): apps older than 2.8.0 sign in
    // with email codes and hold these tokens until they update.
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
    // Convex Auth 2 (`convex/emailAuth.ts`).
    convexAuthProvider(),
  ],
};
