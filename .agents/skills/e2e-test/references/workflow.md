# E2E UX Test (Android emulator)

End-to-end UX flow validation on the Android emulator. Runs the canonical
first-time-user → daily-quiz → result → league flow, taking screenshots at
each gate and reporting PASS/FAIL with evidence.

**Use when**: verifying that a PR (especially anything touching home /
first-quiz modal / daily-quiz / league) hasn't broken the core retention
loop.

**Don't use for**: pure backend/Convex changes, schema migrations, or work
that doesn't touch user-facing screens.

---

## Prerequisites

- Android emulator AVD `Pixel_Test` exists (or any AVD — replace name
  below). `Pixel_9_Pro` AVD is broken on this machine, do **not** try it.
- App package: `dev.hyo.martie`, MainActivity: `dev.hyo.martie/.MainActivity`.
- Dev build installed (or this skill installs it).

## Reasonable assumptions you can make

- If `adb devices` already shows `emulator-5554 device`, reuse it.
- If Metro is not running on port 8081, start it (`bun start`) in the
  background and wait until log line "Logs for your project will appear
  below." appears.
- App data is wiped at the start of every run via `pm clear` so each run
  starts from a clean fresh-install state. The user always wants this for
  E2E.
- Display→screen scale is **4x** on Pixel_Test (display 320x712, screen
  1280x2856). Multiply tap coords by 4.
- Debug toasts ("Open debugger to view warnings", "[Expo-IAP]
  initConnection failed") may obscure buttons in dev builds — dismiss them
  before tapping by sending `input tap 1160 2440` and `input tap 1160 2640`
  (the X icon coords).

---

## Procedure

For each scenario: send the input(s) → `sleep N` → take a screenshot →
Read it → mark PASS/FAIL based on the visible UI. Use `TodoWrite` to track
all 7 scenarios from the start so the user sees progress.

### 0. Setup

```bash
# emulator
adb devices | grep -q "emulator.*device$" || (
  emulator @Pixel_Test -no-snapshot-load > /tmp/emulator.log 2>&1 &
  until adb devices | grep -q "emulator.*device$"; do sleep 3; done
)

# metro (only if not already up)
curl -sf http://localhost:8081/status >/dev/null || (
  bun start > /tmp/metro.log 2>&1 &
  until grep -q "Logs for your project" /tmp/metro.log 2>/dev/null; do sleep 2; done
)

# dev build talking to local metro
adb reverse tcp:8081 tcp:8081

# fresh state
adb shell pm clear dev.hyo.martie
adb shell am start -n dev.hyo.martie/.MainActivity
sleep 12   # cold-start + JS bundle download
```

### 1. Fresh install → home (no onboarding)

Take screenshot. Expect: Martie logo, "0 day streak", bulb count, speech
bubble. **MUST NOT** show onboarding screens (Greeting / Intro).

### 2. First-quiz bottom sheet auto-shows

```bash
sleep 4   # 600ms trigger + animation
```

Take screenshot. Expect: bottom sheet sliding up with Martie image, "Try
your first quiz!" heading, "5 questions, 2 minutes. No cost." subtitle,
red Try Now button.

### 3. Try Now → /daily-quiz

```bash
# dismiss debug toasts first
adb shell input tap 1160 2440
sleep 1
adb shell input tap 1160 2640
sleep 1
# now tap Try Now (bottom-center after toast cleared)
adb shell input tap 640 2640
sleep 5
```

Take screenshot. Expect: progress bar at top, timer (~13s), question text
bubble, Martie image, 4 answer options. **MUST NOT** still be on home.

### 4. Hardware back blocked + completeToLeave toast

```bash
adb shell input keyevent KEYCODE_BACK
sleep 1
```

Take screenshot. Expect: toast at top reading "Finish today's quiz to
leave this screen." (or its locale equivalent), and the daily-quiz screen
still rendered (NOT home). Note: the timer may have advanced to the answer
reveal — that's fine; the key is "still on /daily-quiz".

### 5. Complete 5 questions → /daily-result with default header

Power through questions by alternately answering and tapping Next
Question. Use `sleep 14` between Next Questions to let the timer expire on
unanswered ones (faster than computing answer coords). Final screen:

Take screenshot. Expect:
- Header: only a back arrow on the left, **no title text** (matches the
  default stack header used by `article-detail`, `quiz-results`, etc.).
- Body: Martie image, score (e.g. "1/5"), "Today's Martie #N" with check/X
  marks, Share Text / Share Image buttons, Return button.

### 6. Re-enter home → modal does NOT re-trigger

```bash
adb shell input keyevent KEYCODE_BACK
sleep 5
```

Take screenshot. Expect: home tab with "✅ Completed!" Today's Quiz card.
Wait an extra `sleep 4` and screenshot again — modal must still be absent.
Both `wasShown` (Zustand session flag) and `dailyChallenge.isCompleted`
guards should keep it suppressed.

### 7. Guest league tap → toast + SignInRequireModal

```bash
adb shell input tap 640 1640   # "Join the league to compete!" card
sleep 2
```

Take screenshot. Expect **both**:
- Top: black toast "Sign in is required to join the league." (locale
  variant OK).
- Bottom: SignInRequireModal sheet with "Don't lose your data!" heading
  and Later / Sign In buttons.

### Cleanup

```bash
# leave emulator running, but stop the metro we started (don't kill the
# user's pre-existing metro)
[ -n "$METRO_PID" ] && kill "$METRO_PID" 2>/dev/null
```

---

## Reporting format

Report results as a markdown table:

```
| # | Scenario | Result | Evidence |
|---|----------|--------|----------|
| 1 | Fresh install → home | ✅ PASS | <one-line observation> |
| ... |
```

Then summarize: `N/7 PASS`. If any FAIL, include a short root-cause guess
and the screenshot path. Do **not** auto-fix — surface the failure to the
user first.

## Out-of-scope (acknowledge but skip)

- **Login + signed-in league join** — needs OTP from email; can't be
  automated reliably. Note in the report as "skipped (manual OTP needed)".
- **Long localized answer wrap** — depends on whether today's daily has
  long options; visual verification only when applicable. The unit-style
  CSS check (`min-height` + `padding-top/bottom` in QuizView mobile/tablet)
  is the source of truth.
- **Time-shifted scenarios** ("tomorrow's daily") — Convex backend won't
  honor a fake device clock, so don't attempt.

## Failure modes & recovery

- **Red error screen "Unable to load script"** → Metro isn't reachable.
  Check `adb reverse tcp:8081 tcp:8081`, confirm Metro log shows it's
  serving, then `adb shell input keyevent KEYCODE_BACK` to dismiss the
  RedBox and retry the launch.
- **Tap missed Try Now** → debug toasts are obscuring the button. Run the
  X-icon dismiss taps (1160, 2440) and (1160, 2640) and re-tap.
- **Modal didn't appear in S2** → `dailyChallenge.isCompleted` may already
  be true (you've run E2E earlier today as a guest with the same data
  blob). Confirm with `adb shell run-as dev.hyo.martie ls
  /data/data/dev.hyo.martie/mmkv` is wiped, or just re-run after `pm
  clear`.
- **Coordinates drift** if you ever switch AVDs. Re-derive: actual = displayed × (1280/imageWidth).
