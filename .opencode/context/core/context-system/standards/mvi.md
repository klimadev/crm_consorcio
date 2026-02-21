# MVI Standard

Core concept: Context files should be short, scannable, and action-oriented. Capture only what is needed to execute reliably now, not full background history.

## Key Points
- Keep every file under 200 lines.
- Start with a 1-3 sentence core concept.
- Include 3-5 key points only.
- Add one minimal example (under 10 lines).
- End with a reference link to a fuller guide.

## Minimal Example
```md
Core concept: Retry only transient failures.

- Retry max 3 times.
- Use exponential backoff.
- Log final failure once.

Example:
retry(3, backoffMs)
```

## Validation Checklist
- Is the file under 200 lines?
- Can a new contributor scan it in under 30 seconds?
- Are examples minimal and runnable in spirit?

## Reference
- `../guides/compact.md`
