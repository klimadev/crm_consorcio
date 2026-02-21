# Harvest Operation

Core concept: Harvest turns temporary summaries into permanent, structured context and then optionally cleans temporary files with explicit approval.

## Key Points
- Input can be a file, folder, or default workspace scan.
- Extract reusable knowledge only, not session chatter.
- Write output into function-based folders.
- Require approval UI before archive/delete actions.

## Required Reads
- `../standards/mvi.md`
- `../guides/workflows.md`

## Steps
```text
1) Scan summaries (OVERVIEW, SUMMARY, SESSION, CONTEXT, .tmp)
2) Extract durable concepts and examples
3) Save in target category with navigation updates
4) Present cleanup options: A/B/C/all
5) Apply only approved cleanup actions
```

## Approval UI Example
```text
Cleanup options:
A) Archive summary files
B) Delete summary files
C) Keep files
Type: A, B, C, or all
```

## Reference
- `navigation.md`
