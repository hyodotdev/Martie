#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Iterable


KEY_EVENTS = [
    "first_open",
    "app_launch",
    "daily_quiz_started",
    "daily_quiz_completed",
    "signup_completed",
    "daily_return_cta_shown",
    "daily_return_cta_pressed",
    "share_initiated",
    "share_completed",
    "share_sheet_closed",
    "share_landing_store_opened",
    "acquisition_source_captured",
    "guest_save_cta_shown",
    "guest_save_cta_pressed",
    "noti_permission_requested",
    "noti_permission_result",
    "noti_permission_granted",
]

DERIVED_NOTIFICATION_GRANTED_EVENT = "noti_permission_granted"

ACTIVATION_STEPS: list[tuple[str, ...]] = [
    ("first_open", "app_launch"),
    ("daily_quiz_started",),
    ("daily_quiz_completed",),
    ("signup_completed",),
]

RETURN_STEPS: list[tuple[str, ...]] = [
    ("daily_quiz_completed",),
    ("daily_return_cta_shown",),
    ("daily_return_cta_pressed",),
    ("daily_quiz_started",),
    ("daily_quiz_completed",),
]

SEGMENT_PROPERTIES = ["acquisition_source", "language", "app_platform", "is_premium"]
EVENT_NAME_KEYS = ["event_name", "event", "Event", "Event Name", "name"]
USER_ID_KEYS = [
    "user_pseudo_id",
    "user_id",
    "distinct_id",
    "$distinct_id",
    "Distinct ID",
    "User ID",
    "uid",
]
TIME_KEYS = [
    "event_timestamp",
    "event_date",
    "time",
    "$time",
    "timestamp",
    "Timestamp",
    "Time",
    "date",
    "Date",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze Martie Firebase/GA4 metrics.")
    parser.add_argument("--from-date", required=True, help="Start date, YYYY-MM-DD.")
    parser.add_argument("--to-date", required=True, help="End date, YYYY-MM-DD.")
    parser.add_argument(
        "--file",
        action="append",
        default=[],
        help="Firebase/GA4 export file. Supports JSONL, NDJSON, JSON, and CSV.",
    )
    parser.add_argument("--output", choices=["markdown", "json"], default="markdown")
    parser.add_argument("--min-segment-users", type=int, default=10)
    return parser.parse_args()


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value)


def first_value(mapping: dict[str, Any], keys: Iterable[str]) -> Any:
    for key in keys:
        value = mapping.get(key)
        if value not in (None, ""):
            return value
    return None


def normalize_scalar(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    value = value.strip()
    if value == "":
        return None
    lower = value.lower()
    if lower == "true":
        return True
    if lower == "false":
        return False
    if lower in {"null", "none"}:
        return None
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


def parse_time(value: Any) -> dt.datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time.min, tzinfo=dt.timezone.utc)
    if isinstance(value, (int, float)):
        if 10_000_000 <= value <= 99_999_999 and float(value).is_integer():
            return parse_time(str(int(value)))
        timestamp = float(value)
        if timestamp > 10_000_000_000_000:
            timestamp = timestamp / 1_000_000
        elif timestamp > 10_000_000_000:
            timestamp = timestamp / 1000
        return dt.datetime.fromtimestamp(timestamp, tz=dt.timezone.utc)
    if isinstance(value, str):
        raw = value.strip()
        if raw == "":
            return None
        if len(raw) == 8 and raw.isdigit():
            try:
                parsed_date = dt.datetime.strptime(raw, "%Y%m%d").date()
                return dt.datetime.combine(
                    parsed_date,
                    dt.time.min,
                    tzinfo=dt.timezone.utc,
                )
            except ValueError:
                return None
        if raw.isdigit():
            return parse_time(int(raw))
        normalized = raw.replace("Z", "+00:00")
        try:
            parsed = dt.datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=dt.timezone.utc)
            return parsed.astimezone(dt.timezone.utc)
        except ValueError:
            try:
                parsed_date = dt.date.fromisoformat(raw[:10])
                return dt.datetime.combine(parsed_date, dt.time.min, tzinfo=dt.timezone.utc)
            except ValueError:
                return None
    return None


def flatten_ga4_params(record: dict[str, Any]) -> dict[str, Any]:
    flattened: dict[str, Any] = {}
    for field in ("event_params", "user_properties"):
        params = record.get(field)
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except json.JSONDecodeError:
                params = None
        if not isinstance(params, list):
            continue
        for item in params:
            if not isinstance(item, dict):
                continue
            key = item.get("key")
            value = item.get("value")
            if not key or not isinstance(value, dict):
                continue
            for value_key in ("string_value", "int_value", "float_value", "double_value"):
                if value.get(value_key) not in (None, ""):
                    flattened[str(key)] = value[value_key]
                    break
    return flattened


def normalize_event(record: dict[str, Any], source: str) -> dict[str, Any] | None:
    props = record.get("properties")
    if isinstance(props, str):
        try:
            props = json.loads(props)
        except json.JSONDecodeError:
            props = {}
    if not isinstance(props, dict):
        props = {}

    ga4_params = flatten_ga4_params(record)
    event_name = first_value(record, EVENT_NAME_KEYS) or props.get("event")
    if not event_name:
        return None

    merged = dict(record)
    merged.update(props)
    merged.update(ga4_params)
    distinct_id = first_value(merged, USER_ID_KEYS)
    event_time = parse_time(first_value(merged, TIME_KEYS))

    normalized_props = {str(k): normalize_scalar(v) for k, v in merged.items() if v not in (None, "")}
    return {
        "event": str(event_name),
        "distinct_id": str(distinct_id) if distinct_id not in (None, "") else None,
        "time": event_time,
        "date": event_time.date() if event_time else None,
        "properties": normalized_props,
        "source": source,
    }


def load_json_file(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    parsed = json.loads(text)
    if isinstance(parsed, list):
        records = parsed
    elif isinstance(parsed, dict):
        for key in ("results", "data", "events"):
            if isinstance(parsed.get(key), list):
                records = parsed[key]
                break
        else:
            records = [parsed]
    else:
        records = []
    return [event for item in records if isinstance(item, dict) for event in [normalize_event(item, str(path))] if event]


def load_jsonl_file(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(record, dict):
                event = normalize_event(record, str(path))
                if event:
                    events.append(event)
    return events


def load_csv_file(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            cleaned = {str(k): normalize_scalar(v) for k, v in row.items() if k is not None}
            event = normalize_event(cleaned, str(path))
            if event:
                events.append(event)
    return events


def load_file(path_text: str) -> list[dict[str, Any]]:
    path = Path(path_text).expanduser()
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv_file(path)
    if suffix in {".jsonl", ".ndjson"}:
        return load_jsonl_file(path)
    if suffix == ".json":
        return load_json_file(path)
    return load_jsonl_file(path)


def dedupe_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    result: list[dict[str, Any]] = []
    for event in events:
        props = event["properties"]
        insert_id = props.get("$insert_id")
        if insert_id:
            key = (event["event"], event["distinct_id"], props.get("time"), insert_id)
            if key in seen:
                continue
            seen.add(key)
        result.append(event)
    return result


def filter_period(events: list[dict[str, Any]], from_date: dt.date, to_date: dt.date) -> list[dict[str, Any]]:
    return [
        event
        for event in events
        if event["date"] is None or from_date <= event["date"] <= to_date
    ]


def sort_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(events, key=lambda event: event["time"] or dt.datetime.min.replace(tzinfo=dt.timezone.utc))


def is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value == 1
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "granted"}
    return False


def with_derived_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    derived_events = []
    for event in events:
        if event["event"] != "noti_permission_result":
            continue
        if not is_truthy(event["properties"].get("granted")):
            continue
        derived_event = dict(event)
        derived_event["event"] = DERIVED_NOTIFICATION_GRANTED_EVENT
        derived_events.append(derived_event)
    return events + derived_events


def step_label(step: tuple[str, ...]) -> str:
    return "/".join(step)


def compute_funnel(events: list[dict[str, Any]], steps: list[tuple[str, ...]]) -> list[int]:
    by_user: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        if event["distinct_id"]:
            by_user[event["distinct_id"]].append(event)

    counts = [0 for _ in steps]
    for user_events in by_user.values():
        index = 0
        for event in sort_events(user_events):
            if event["event"] in steps[index]:
                counts[index] += 1
                index += 1
                if index == len(steps):
                    break
    return counts


def user_sets(events: list[dict[str, Any]]) -> dict[str, set[str]]:
    result: dict[str, set[str]] = defaultdict(set)
    for event in events:
        user_id = event["distinct_id"]
        if user_id:
            result[event["event"]].add(user_id)
    result["first_open/app_launch"] = result["first_open"] | result["app_launch"]
    return result


def first_user_properties(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for event in sort_events(events):
        user_id = event["distinct_id"]
        if user_id and user_id not in result:
            result[user_id] = event["properties"]
    return result


def compute_d1(events: list[dict[str, Any]], to_date: dt.date) -> dict[str, Any]:
    completions: dict[str, set[dt.date]] = defaultdict(set)
    for event in events:
        if event["event"] == "daily_quiz_completed" and event["distinct_id"] and event["date"]:
            completions[event["distinct_id"]].add(event["date"])

    cohort_pairs = 0
    retained_pairs = 0
    daily_rows = []
    for day in sorted({day for days in completions.values() for day in days}):
        if day >= to_date:
            continue
        cohort = {user for user, days in completions.items() if day in days}
        retained = {user for user in cohort if day + dt.timedelta(days=1) in completions[user]}
        cohort_pairs += len(cohort)
        retained_pairs += len(retained)
        daily_rows.append({"date": day.isoformat(), "cohort": len(cohort), "retained": len(retained)})

    rate = retained_pairs / cohort_pairs if cohort_pairs else None
    return {"cohort": cohort_pairs, "retained": retained_pairs, "rate": rate, "daily": daily_rows}


def compute_segment_rows(
    events: list[dict[str, Any]],
    users: dict[str, set[str]],
    min_users: int,
) -> dict[str, list[dict[str, Any]]]:
    user_props = first_user_properties(events)
    rows_by_property: dict[str, list[dict[str, Any]]] = {}
    base_users = users["first_open/app_launch"]
    started_users = users["daily_quiz_started"]
    completed_users = users["daily_quiz_completed"]
    signup_users = users["signup_completed"]

    for prop in SEGMENT_PROPERTIES:
        values: dict[str, set[str]] = defaultdict(set)
        for user_id in base_users | started_users | completed_users | signup_users:
            value = user_props.get(user_id, {}).get(prop, "unknown")
            values[str(value if value not in (None, "") else "unknown")].add(user_id)

        rows = []
        for value, segment_users in values.items():
            total = len(segment_users)
            if total < min_users:
                continue
            started = len(segment_users & started_users)
            completed = len(segment_users & completed_users)
            signup = len(segment_users & signup_users)
            rows.append(
                {
                    "value": value,
                    "users": total,
                    "start_rate": started / total if total else None,
                    "completion_rate": completed / started if started else None,
                    "signup_rate": signup / completed if completed else None,
                }
            )
        rows_by_property[prop] = sorted(rows, key=lambda row: row["users"], reverse=True)
    return rows_by_property


def percent(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value * 100:.1f}%"


def ratio(numerator: int, denominator: int) -> float | None:
    return numerator / denominator if denominator else None


def funnel_rows(counts: list[int], steps: list[tuple[str, ...]]) -> list[dict[str, Any]]:
    rows = []
    first = counts[0] if counts else 0
    previous = None
    for index, count in enumerate(counts):
        rows.append(
            {
                "step": step_label(steps[index]),
                "users": count,
                "step_rate": ratio(count, previous) if previous is not None else None,
                "overall_rate": ratio(count, first),
            }
        )
        previous = count
    return rows


def build_recommendations(activation: list[int], d1: dict[str, Any], event_counts: Counter[str]) -> list[str]:
    recommendations: list[str] = []
    start_rate = ratio(activation[1], activation[0]) if len(activation) > 1 else None
    completion_rate = ratio(activation[2], activation[1]) if len(activation) > 2 else None
    signup_rate = ratio(activation[3], activation[2]) if len(activation) > 3 else None
    d1_rate = d1["rate"]

    if start_rate is not None and start_rate < 0.55:
        recommendations.append(
            "First screen leak: test a clearer daily quiz CTA and reduce competing actions. "
            "Success metric: daily_quiz_started / first_open."
        )
    if completion_rate is not None and completion_rate < 0.70:
        recommendations.append(
            "Quiz completion leak: inspect latency, question difficulty, and answer feedback. "
            "Success metric: daily_quiz_completed / daily_quiz_started."
        )
    if signup_rate is not None and signup_rate < 0.20:
        recommendations.append(
            "Signup value leak: move save/streak/league value closer to the result moment. "
            "Success metric: signup_completed / daily_quiz_completed."
        )
    if d1_rate is not None and d1_rate < 0.15:
        recommendations.append(
            "Retention leak: strengthen tomorrow preview and notification opt-in after completion. "
            "Success metric: next-day daily_quiz_completed / prior-day daily_quiz_completed."
        )
    if event_counts["share_initiated"] < max(5, event_counts["daily_quiz_completed"] * 0.05):
        recommendations.append(
            "Referral volume is low: add or tune share prompts after high-confidence result states. "
            "Success metric: share_initiated / daily_quiz_completed."
        )
    if not recommendations:
        recommendations.append(
            "No single obvious leak dominates. Segment by acquisition_source and language before changing the core flow."
        )
    return recommendations[:4]


def analyze(events: list[dict[str, Any]], from_date: dt.date, to_date: dt.date, min_segment_users: int) -> dict[str, Any]:
    period_events = filter_period(dedupe_events(events), from_date, to_date)
    reporting_events = with_derived_events(period_events)
    event_counts = Counter(event["event"] for event in reporting_events)
    users = user_sets(reporting_events)
    activation_counts = compute_funnel(period_events, ACTIVATION_STEPS)
    return_counts = compute_funnel(period_events, RETURN_STEPS)
    d1 = compute_d1(period_events, to_date)
    segments = compute_segment_rows(period_events, users, min_segment_users)
    return {
        "period": {"from": from_date.isoformat(), "to": to_date.isoformat()},
        "events_loaded": len(period_events),
        "event_counts": dict(event_counts),
        "unique_users": {key: len(value) for key, value in users.items()},
        "activation_funnel": funnel_rows(activation_counts, ACTIVATION_STEPS),
        "return_funnel": funnel_rows(return_counts, RETURN_STEPS),
        "d1_retention": d1,
        "segments": segments,
        "recommendations": build_recommendations(activation_counts, d1, event_counts),
    }


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    output = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    output.extend("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join(output)


def render_markdown(result: dict[str, Any], source: str) -> str:
    lines = [
        "# Martie Analytics Snapshot",
        "",
        f"Period: {result['period']['from']} to {result['period']['to']}",
        f"Source: {source}",
        f"Events loaded: {result['events_loaded']}",
        "",
        "## Activation Funnel",
        "",
        markdown_table(
            ["Step", "Users", "Step conversion", "Overall"],
            [
                [
                    row["step"],
                    str(row["users"]),
                    percent(row["step_rate"]) if row["step_rate"] is not None else "-",
                    percent(row["overall_rate"]),
                ]
                for row in result["activation_funnel"]
            ],
        ),
        "",
        "## D1 Retention",
        "",
        f"- Cohort user-days: {result['d1_retention']['cohort']}",
        f"- Retained user-days: {result['d1_retention']['retained']}",
        f"- D1 rate: {percent(result['d1_retention']['rate'])}",
        "",
        "## Return CTA Funnel",
        "",
        markdown_table(
            ["Step", "Users", "Step conversion", "Overall"],
            [
                [
                    row["step"],
                    str(row["users"]),
                    percent(row["step_rate"]) if row["step_rate"] is not None else "-",
                    percent(row["overall_rate"]),
                ]
                for row in result["return_funnel"]
            ],
        ),
        "",
        "## Key Event Counts",
        "",
        markdown_table(
            ["Event", "Count", "Unique users"],
            [
                [
                    event,
                    str(result["event_counts"].get(event, 0)),
                    str(result["unique_users"].get(event, 0)),
                ]
                for event in KEY_EVENTS
            ],
        ),
        "",
        "## Segment Notes",
    ]

    has_segments = False
    for prop, rows in result["segments"].items():
        if not rows:
            continue
        has_segments = True
        lines.extend(
            [
                "",
                f"### {prop}",
                "",
                markdown_table(
                    ["Value", "Users", "Start rate", "Completion/start", "Signup/completion"],
                    [
                        [
                            row["value"],
                            str(row["users"]),
                            percent(row["start_rate"]),
                            percent(row["completion_rate"]),
                            percent(row["signup_rate"]),
                        ]
                        for row in rows[:8]
                    ],
                ),
            ]
        )
    if not has_segments:
        lines.extend(["", "No segment has enough users for a reliable read."])

    lines.extend(["", "## Recommended Experiments", ""])
    for index, recommendation in enumerate(result["recommendations"], start=1):
        lines.append(f"{index}. {recommendation}")

    lines.extend(
        [
            "",
            "## Data Quality Checks",
            "",
        "- Do not compare raw export counts to Firebase/GA4 UI without checking filters and time zones.",
            "- Treat small segments as directional only.",
            "- Use before/after windows for release impact claims.",
        ]
    )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    from_date = parse_date(args.from_date)
    to_date = parse_date(args.to_date)
    if to_date < from_date:
        print("--to-date must be after --from-date", file=sys.stderr)
        return 2

    if not args.file:
        print("At least one --file export is required.", file=sys.stderr)
        return 2

    events = [event for path in args.file for event in load_file(path)]
    source = ", ".join(args.file)

    result = analyze(events, from_date, to_date, args.min_segment_users)
    if args.output == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(render_markdown(result, source))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
