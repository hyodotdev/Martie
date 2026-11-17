#!/bin/zsh
# Publishes a Codemagic Patch over-the-air update for the current store binary
# version (package.json `version`). Only JavaScript/asset changes may ship this
# way; anything native needs a store build.

set -euo pipefail

platform="${1:-}"
if [[ "$platform" != "ios" && "$platform" != "android" && "$platform" != "all" ]]; then
  print -u2 "usage: $0 <ios|android|all>"
  exit 64
fi

if [[ "${OTA_CONFIRM_COMPATIBLE:-}" != "1" ]]; then
  print -u2 \
    "set OTA_CONFIRM_COMPATIBLE=1 only after confirming the change is JavaScript/assets-only"
  exit 64
fi

update_message="${OTA_MESSAGE:-}"
if [[ -z "$update_message" ]]; then
  print -u2 "set OTA_MESSAGE to a short, user-facing description"
  exit 64
fi

# Production (default) reaches store builds; Staging reaches test builds.
deployment="${OTA_DEPLOYMENT:-Production}"
if [[ "$deployment" != "Production" && "$deployment" != "Staging" ]]; then
  print -u2 "OTA_DEPLOYMENT must be Production or Staging, not $deployment"
  exit 64
fi

script_dir="${0:A:h}"
repo_root="${script_dir:h}"
cd "$repo_root"

if [[ "$deployment" == "Production" ]]; then
  current_branch="$(git branch --show-current)"
  if [[ "$current_branch" != "main" ]]; then
    print -u2 "production OTA must run from main, not $current_branch"
    exit 1
  fi
  if [[ -n "$(git status --porcelain)" ]]; then
    print -u2 "production OTA requires a clean worktree"
    exit 1
  fi
  git fetch --quiet origin main
  local_head="$(git rev-parse HEAD)"
  if [[ "$local_head" != "$(git rev-parse origin/main)" ]]; then
    print -u2 "production OTA requires HEAD to match origin/main"
    exit 1
  fi
  ci_state="$(
    gh run list \
      --workflow CI \
      --commit "$local_head" \
      --event push \
      --limit 1 \
      --json headSha,status,conclusion \
      --jq 'if length == 1 then "\(.[0].headSha):\(.[0].status):\(.[0].conclusion)" else "" end'
  )"
  if [[ "$ci_state" != "${local_head}:completed:success" ]]; then
    print -u2 "production OTA requires successful CI for exact main@$local_head"
    exit 1
  fi
fi

if [[ "${OTA_DRY_RUN:-}" == "1" ]]; then
  print "Verified Martie $platform $deployment OTA release gates"
  exit 0
fi

stage=production
env_file=.env.production
if [[ "$deployment" == "Staging" ]]; then
  stage=development
  env_file=.env.development
fi

version="$(bun -e 'process.stdout.write(require("./package.json").version)')"
case "$platform" in
  ios) targets=(ios) ;;
  android) targets=(android) ;;
  all) targets=(ios android) ;;
esac

for target in $targets; do
  app_name="Martie-iOS"
  [[ "$target" == "android" ]] && app_name="Martie-Android"
  print "Publishing Martie $target $deployment OTA $version from $(git rev-parse --short HEAD)"
  # Production reads the EAS production environment on top of the stage file,
  # the same EXPO_PUBLIC_* values the store builds were compiled with.
  release=(
    bunx @codemagic/patch-cli@0.10.0 release-react
    --server-url https://ota.codemagicpatch.dev
    --app "$app_name"
    --deployment "$deployment"
    --platform "$target"
    --target-binary-version "$version"
    --release-notes "$update_message"
    --non-interactive --yes
  )
  if [[ "$deployment" == "Production" ]]; then
    bunx dotenv -e "$env_file" -- bunx eas-cli@23.0.0 env:exec production --non-interactive \
      "NODE_ENV=production STAGE=$stage EXPO_NO_DOTENV=1 ${(j: :)${(q)release}}"
  else
    NODE_ENV=production STAGE=$stage EXPO_NO_DOTENV=1 \
      bunx dotenv -e "$env_file" -- $release
  fi
done
