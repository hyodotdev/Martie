# Martie Vega

This is a separate React Native for Vega target for Amazon Vega TV devices.
It is not built by Expo EAS. The root `bun run eas:prod:vega` script delegates to
the Vega SDK and produces a `.vpkg`.

## Build

Install Amazon Vega Developer Tools first:

```sh
curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash
source ~/vega/env
```

Use the default component directory when prompted:

```txt
~/vega/sdk
```

Then build from the repository root:

```sh
bun run eas:prod:vega
```

The Amazon Appstore upload artifact is the ARM release VPKG under:

```txt
apps/vega/build/armv7-release/
```

Override the Vega build number when needed:

```sh
VEGA_BUILD_NUMBER=101 bun run eas:prod:vega
```

## Notes

- The Vega package id is `dev.hyo.martie`, matching the Fire OS package id so
  the VPKG can be added to the same Amazon Appstore listing.
- The launch component is `dev.hyo.martie.main`.
- The WebView loads `https://martie.hyo.dev/app/`, the Expo web build that
  `.github/workflows/pages.yml` publishes. `hyo.dev/martie` only redirects to
  the mobile stores, so it must not be used here.
- This first target wraps the Martie web experience in Vega WebView. A deeper
  native Vega port should replace this shell if TV-specific IAP, offline
  behavior, or richer D-pad navigation is required.
