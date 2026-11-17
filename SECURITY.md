# Security policy

Please report vulnerabilities privately by email to **hyo@hyo.dev**, or through
GitHub's "Report a vulnerability" button on this repository. Include the steps
to reproduce and the impact you expect. Do not open a public issue, and do not
test against other players' accounts or data.

You can expect an acknowledgement within a few days. Fixes ship through the
stores or an over-the-air update, and the report is credited unless you ask
otherwise.

## Scope

- The app in this repository and its Convex backend functions.
- Values in `app.config.ts`, `src/utils/levelPlayConfig.ts` and
  `public/.well-known/` are public identifiers that ship in every binary; they
  are not secrets.
- Secrets (payment, Google service account, OpenAI, Resend keys, admin and
  review accounts) live only in the Convex and EAS environments, never in git.
