# Workflow Guide

Core concept: Run context operations through a small, repeatable flow: discover, load standards, execute, validate, summarize.

## Key Points
- Always load required files before operation execution.
- Apply MVI and structure standards during creation/update.
- Ask approval before any delete/archive step.
- Validate line count, structure, and navigation links.

## Default Flow
```text
1) Discover target files
2) Read required operation + standards docs
3) Execute operation
4) Validate constraints
5) Summarize changes
```

## Approval UI Rule
- For cleanup operations, show letter choices (`A`, `B`, `C`, or `all`).
- Never delete automatically.

## Reference
- `../operations/harvest.md`
