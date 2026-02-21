# Context Templates

Core concept: Use compact templates to keep structure consistent and review cost low.

## Key Points
- Keep template output under 200 lines.
- Use one template per file purpose.
- Include a reference line to related docs.

## Concept Template
```md
# {Title}

Core concept: {1-3 sentences}

- {point 1}
- {point 2}
- {point 3}

Example:
{under 10 lines}

Reference: {path or URL}
```

## Error Template
```md
# {Error Name}

Symptom: {what fails}
Cause: {root cause}
Fix: {steps}
Prevention: {guardrail}
Reference: {path or URL}
```

## Reference
- `mvi.md`
