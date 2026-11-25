---
name: e2e-test
description: Run Martie end-to-end UX regression tests on physical Android devices and iPhones. Use when the user runs `/e2e-test` or `$e2e-test`, asks for E2E testing, on-device or TestFlight validation, sandbox purchase checks, first-time-user daily quiz retention checks, quiz completion/replay blank-screen regressions, or Growtoki event/crash verification before or after EAS updates.
---

# E2E Test

Run the on-device checks that protect Martie's core quiz UX. Use
`references/workflow.md` for the canonical first-time-user daily quiz
retention loop, then run the quiz completion regression below whenever the
work touches quiz routing, replay, result screens, user cursor/level sync,
Growtoki analytics, crash/error capture, or an EAS production update.

## Workflow

1. Confirm the task touches user-facing screens or the retention loop.
2. Run on physical devices: an Android phone or tablet over `adb`, and an
   iPhone over `xcrun devicectl` when the change can differ on iOS. Never use
   an Android emulator or iOS simulator, never create an AVD, and never use
   iPhone Mirroring: none of these is E2E evidence or clears the
   `$loop-review` device gate.
3. Reuse the attached device and an existing Metro session when available.
   Start only missing local services needed for the test.
4. Preserve app data for logged-in checks; use `pm clear` only for fresh guest
   scenarios, and only on a test device or after the user agrees, because it
   wipes that device's app data.
5. Capture screenshots at every gate and inspect device logs before marking
   PASS. Read each screenshot before the next tap; never tap coordinates from
   memory.
6. Check Growtoki events when validating a production incident or post-deploy
   behavior.
7. Report one row per scenario and device as PASS, FAIL or BLOCKED, with
   evidence (see Reporting).
8. Do not auto-fix failures unless the user explicitly asks for fixes. If a
   fix is requested, capture failure evidence first, then patch and re-run the
   failed scenario.

## Environment

- Martie repo: the repository root
- Growtoki repo (private analytics, maintainers only): `$GROWTOKI_REPO`
- Bun: `bun` on `PATH`
- Android package: `dev.hyo.martie`
- Main activity: `dev.hyo.martie/.MainActivity`
- Device: a physical Android phone or tablet. Its `adb devices` serial never
  starts with `emulator-`. Skip headsets and TV sticks unless the user names
  one.
- ADB: `$ANDROID_HOME/platform-tools/adb`

Use absolute tool paths in shell commands when possible:

```bash
export ADB=$ANDROID_HOME/platform-tools/adb
export BUN="$(command -v bun)"
```

## Setup

```bash
git status --short --branch

# Physical devices only. Pick the phone or tablet and pin it for every call.
$ADB devices -l | rg -v "^emulator-" | rg " device "
export ANDROID_SERIAL=<serial>
$ADB shell getprop ro.product.model
```

If no physical device is attached, stop and ask the user to connect one. Do
not fall back to an emulator.

The device needs a debug build, which loads JavaScript and assets from Metro.
Check with `$ADB shell dumpsys package dev.hyo.martie | rg "pkgFlags"`; it must
list `DEBUGGABLE`. Install one with `adb install -r` on the debug APK, or with
`bunx expo run:android --device`. Replacing a store build needs an uninstall,
which wipes the user's app data, so ask first.

```bash
curl -sf http://localhost:8081/status >/dev/null || (
  "$BUN" start > /tmp/martie-metro.log 2>&1 &
  export MARTIE_E2E_METRO_PID=$!
  until rg -q "Logs for your project|Metro waiting" /tmp/martie-metro.log 2>/dev/null; do sleep 2; done
)

$ADB reverse tcp:8081 tcp:8081
```

Take screenshots with `$ADB exec-out screencap -p > <file>.png`. Avoid
`uiautomator dump` on quiz screens: it waits for the UI to go idle, and the
commentator's looping animation keeps it busy, so it stalls for seconds and
can return a stale dump.

Leave the device connected after the test and remove the port reverse with
`$ADB reverse --remove tcp:8081`. Stop Metro only if this workflow started it:

```bash
[ -n "$MARTIE_E2E_METRO_PID" ] && kill "$MARTIE_E2E_METRO_PID" 2>/dev/null
```

## Devices

Discover what is attached on every run instead of trusting a list:

```bash
$ADB devices -l                # Android; ignore serials starting with emulator-
xcrun devicectl list devices   # iPhones; use only rows marked physical
```

Use a phone or tablet. `adb` also lists Quest headsets and Fire TV or Vega
sticks; skip them unless the user names one. Record the serial or UDID of
every device you test. An iPhone UDID can change when the device
re-enumerates, so re-list after any `device was not found` error instead of
retrying the old id.

## Physical iPhone

Build a Debug app for the device, install it, and launch it. Keep build
output outside the repository:

```bash
export IOS_UDID=<udid from devicectl>
xcodebuild -workspace ios/Martie.xcworkspace -scheme Martie \
  -configuration Debug -destination "id=$IOS_UDID" \
  -derivedDataPath <DerivedData path outside the repo> build
xcrun devicectl device install app --device "$IOS_UDID" \
  <DerivedData>/Build/Products/Debug-iphoneos/Martie.app
xcrun devicectl device process launch --device "$IOS_UDID" dev.hyo.martie
```

A cold device build can run past 20 minutes; a build still compiling is not
blocked. Run it in the background and reuse DerivedData.

The iPhone cannot reach `127.0.0.1` and there is no `adb reverse`. Serve Metro
on the Mac's LAN address, and check the address on every run because it
changes between networks:

```bash
LAN_IP=$(ipconfig getifaddr en1 || ipconfig getifaddr en0)
REACT_NATIVE_PACKAGER_HOSTNAME=$LAN_IP bunx expo start --host lan --port 8081
```

Drive the iPhone with `maestro-runner`, which runs Maestro YAML flows over its
bundled WebDriverAgent. Write the flows for the run outside the repository,
with `appId: dev.hyo.martie`:

```bash
export PATH="$HOME/.maestro-runner/bin:$PATH"
maestro-runner --platform ios --device "$IOS_UDID" --team-id PRDQGB267K \
  test flow.yaml
```

- Do not pass `--wda-bundle-id`: a custom bundle forces a WebDriverAgent
  rebuild that fails signing. The default bundle reuses the cached build.
- If the bundled WebDriverAgent fails to build because it targets iOS 12, raise
  `IPHONEOS_DEPLOYMENT_TARGET` to 15.0 in
  `~/.maestro-runner/drivers/ios/WebDriverAgent/WebDriverAgent.xcodeproj/project.pbxproj`
  and rerun.
- `takeScreenshot` saves only plain filenames, under the run's `assets/`
  folder; an absolute path silently saves nothing while the step passes.
  Confirm each PNG exists before claiming a visual check.
- Read `reports/<timestamp>/report.json` for the verdict; the exit code alone
  is unreliable.

Traps that look like app bugs:

- Reinstalling resets Local Network permission. The app then cannot reach
  Metro and shows `No script URL provided`. The Allow alert belongs to
  SpringBoard, so tap it from the flow (`tapOn: "Allow"`), then relaunch.
- Expo bakes `extra` values into the binary at native build time. Changing
  `.env` and restarting Metro changes nothing; rebuild natively.

Two gates need the user, about once a day each: the device passcode for
_Enable UI Automation_, and the side-button double-click a sandbox purchase can
ask for. Neither can be automated. Report the row `BLOCKED: needs <which>` and
keep going.

## Sandbox Purchases and Credentials

During an E2E run, test purchases are pre-approved: Google Play license-tester
purchases, Amazon App Tester purchases on the Fire tablet, and StoreKit
sandbox purchases on the iPhone. Tap the purchase sheet and finish the
transaction without asking. Confirm the sheet says it is a sandbox or test
purchase first; anything that looks like a real charge stops the row.

The TestFlight and Sandbox Apple Account password is pinned: `Password12!`.
It belongs to a shared sandbox test account and is published here at the
maintainer's direction, so it needs no redaction in transcripts, logs or
screenshots. When a sandbox purchase sheet asks for it, enter it and continue.
Never use it for any other account, and never retry a rejected password or an
Apple account challenge: stop the row as `BLOCKED` and let the user finish it.

TestFlight and the Sandbox Apple Account are separate. TestFlight installs the
beta with the user's normal Apple Account, while purchases in a TestFlight or
development-signed build go to the Sandbox Apple Account under **Settings →
Developer → Sandbox Apple Account**. A purchase row passes only when the store
transaction completes, the app grants the item, and the transaction is
finished; record the transaction id.

## Required: Daily Quiz Retention Loop

Read `references/workflow.md` and run the seven first-time-user gates:
fresh install home, first-quiz sheet, `/daily-quiz`, blocked hardware back,
`/daily-result`, no modal re-trigger, and guest league sign-in modal.

## Required: Practice Quiz Completion Regression

This protects the failure that reached production: after failing a practice
quiz, tapping `Replay`, completing the next run, and tapping the last action
must route to `/quiz-final`. A loop on the last question, a blank/white screen,
or missing `QuizFinal` Growtoki events is a FAIL even when logcat has no fatal
crash.

### Guest Failure -> Replay -> Final

Start from a clean guest state:

```bash
$ADB shell pm clear dev.hyo.martie
$ADB shell am start -W -a android.intent.action.VIEW -d 'martie://quiz' dev.hyo.martie
sleep 8
```

Complete the first practice run with enough wrong answers to score below 70%.
On the result screen, verify `Replay` and `Done` are visible. Tap `Replay`.
Complete the second run. At the final answer reveal, verify the primary action
label is `Complete`, not `Next Question`. Tap `Complete`; `/quiz-final` must
render within 5 seconds with points and either `Replay` or `Play Next Level`
plus `Done`.

After the transition:

```bash
$ADB shell logcat -d -t 500 | rg -i "FATAL EXCEPTION|addViewAt|ReactNative.*Exception|ErrorBoundary"
```

Expected: no matching fatal/addViewAt/ErrorBoundary crash lines for the run.

### Logged-In Replay Path

Run the same failure -> `Replay` -> last `Complete` -> `/quiz-final` path while
logged in, because user cursor and level sync are auth-sensitive. Preserve app
data if the device is already logged in. If login is needed, use
`hyo@hyo.dev`; the fake OTP is printed in Metro/console logs, so inspect the
logs and enter that code.

Pass criteria are identical to the guest path. A logged-in-only loop usually
means the route transition is racing with user cursor/level sync.

### Passed Result Branch

If a full correct-answer pass is slow or flaky to automate, validate the passed
result branch directly with a valid quiz id/key from Convex:

```bash
./node_modules/.bin/convex run --inline-query '
const quizzes = await ctx.db.query("quizzes").withIndex("by_key").order("asc").take(10);
const quiz = quizzes[quizzes.length - 1];
return { id: quiz._id, key: quiz.key };
'

$ADB shell am start -W -a android.intent.action.VIEW -d \
  'martie://quiz-final?point=80&hasPassed=true&lastQuizId=<id>&lastQuizKey=<key>&quizCount=10' \
  dev.hyo.martie
sleep 5
```

Expected: result screen shows `80points`, `Play Next Level`, and `Done`, with
no white screen or fatal logcat errors. Report clearly when this branch was
validated by direct deep link instead of a full answer-driven pass.

## Growtoki Verification

Use this only for production incidents, post-deploy checks, or when the user
asks whether Growtoki recorded the behavior.

From `$GROWTOKI_REPO`, query recent production events:

```bash
./node_modules/.bin/convex run --prod --inline-query '
const project = await ctx.db.query("projects").filter((q) => q.eq(q.field("slug"), "martie")).first();
const events = await ctx.db.query("events").withIndex("by_project", (q) => q.eq("projectId", project._id)).order("desc").take(80);
return events.map((event) => ({
  name: event.name,
  createdAt: new Date(event.createdAt).toISOString(),
  sessionId: event.sessionId,
  userId: event.userId,
  properties: event.properties,
}));
'
```

Interpretation:

- PASS: after quiz completion there is a `screen_view` for `QuizFinal` and/or
  `practice_quiz_completed`, followed by final-screen action events when the
  user taps buttons.
- FAIL: repeated `quiz_correct`/`quiz_wrong` with `questionIndex: 9`, no later
  `QuizFinal`, and no `practice_quiz_completed`. This is a UI transition loop,
  not necessarily a JS crash.
- FAIL: a visible white/blank screen with no `crash_captured` or
  `error_captured`; Growtoki instrumentation is missing that failure surface.
- PASS for crash capture only when an intentional or real crash produces
  `crash_captured` or `error_captured` with useful screen/session properties.

## Reference

Read `references/workflow.md` for the exact device setup, tap coordinates, scenarios, expected UI, and recovery steps.

## Reporting

Report one row per scenario and device:

```markdown
| Scenario | Device (serial/UDID) | Result | Evidence |
|---|---|---|---|
| Daily quiz retention loop | <device> | PASS/FAIL/BLOCKED | screenshot path + one-line observation |
| Guest replay completion | <device> | PASS/FAIL/BLOCKED | final screen/logcat evidence |
| Logged-in replay completion | <device> | PASS/FAIL/BLOCKED/SKIPPED | account state + evidence |
| Passed result branch | <device> | PASS/FAIL | deep link or answer-driven evidence |
| Sandbox purchase | <device> | PASS/FAIL/BLOCKED | transaction id, or the exact error |
| Growtoki event/crash verification | — | PASS/FAIL/SKIPPED | event sequence summary |
```

- A build or an install is not a test. Say which you did.
- Never mark a row PASS without a concrete device result you observed.
- A row you could not run is `BLOCKED` with the exact missing prerequisite
  (device, account, catalog, network route, or a user-only gate), never
  omitted and never guessed.

Include the Codemagic Patch release label and commit SHA when this is a post-deploy validation.
Never call the bug fixed until both UI evidence and log/event evidence agree.
