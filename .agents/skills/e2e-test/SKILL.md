---
name: e2e-test
description: Run Martie end-to-end UX regression tests on a physical Android device. Use when the user runs `/e2e-test` or `$e2e-test`, asks for E2E testing, on-device validation, first-time-user daily quiz retention checks, quiz completion/replay blank-screen regressions, or Growtoki event/crash verification before or after EAS updates.
---

# E2E Test

Run the on-device checks that protect Martie's core quiz UX. Use
`references/workflow.md` for the canonical first-time-user daily quiz
retention loop, then run the quiz completion regression below whenever the
work touches quiz routing, replay, result screens, user cursor/level sync,
Growtoki analytics, crash/error capture, or an EAS production update.

## Workflow

1. Confirm the task touches user-facing screens or the retention loop.
2. Run on a physical device attached over USB. Never use an Android emulator
   or iOS simulator, and never create an AVD for this: an emulator run is not
   E2E evidence and does not clear the `$loop-review` device gate.
3. Reuse the attached device and an existing Metro session when available.
   Start only missing local services needed for the test.
4. Preserve app data for logged-in checks; use `pm clear` only for fresh guest
   scenarios, and only on a test device or after the user agrees, because it
   wipes that device's app data.
5. Capture screenshots at every gate and inspect logcat before marking PASS.
6. Check Growtoki events when validating a production incident or post-deploy
   behavior.
7. Report PASS/FAIL in a table with evidence.
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

Report results as:

```markdown
| Scenario | Result | Evidence |
|---|---|---|
| Daily quiz retention loop | PASS/FAIL | screenshot path + one-line observation |
| Guest replay completion | PASS/FAIL | final screen/logcat evidence |
| Logged-in replay completion | PASS/FAIL/SKIPPED | account state + evidence |
| Passed result branch | PASS/FAIL | deep link or answer-driven evidence |
| Growtoki event/crash verification | PASS/FAIL/SKIPPED | event sequence summary |
```

Include the Codemagic Patch release label and commit SHA when this is a post-deploy validation.
Never call the bug fixed until both UI evidence and log/event evidence agree.
