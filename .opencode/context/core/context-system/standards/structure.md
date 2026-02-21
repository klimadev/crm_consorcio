# Structure Standard

Core concept: Organize context by function so people can find intent fast. Avoid flat folders with mixed content types.

## Key Points
- Each category must include `navigation.md`.
- Required function folders: `concepts/`, `examples/`, `guides/`, `lookup/`, `errors/`.
- Keep files focused to one purpose each.
- Prefer many small files over one large index.

## Required Layout
```text
{category}/
  navigation.md
  concepts/
  examples/
  guides/
  lookup/
  errors/
```

## Naming Guidance
- Use kebab-case file names.
- Use descriptive names: `auth-flow.md`, `retry-policy.md`.

## Reference
- `../guides/creation.md`
