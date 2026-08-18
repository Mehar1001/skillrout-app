---
agent: devin-local
session: quasar-lasagna
created: 2026-08-18T20:02:53Z
---
# Skillrout — Floating Context

You are building Skillrout inside the existing Expo/Firebase project at `Skillrout`.

Always check the full instructions in `agents.md` before making changes.

## Must-Remember (3-second check)
1. RUN = record visit. PRINT = output. SUBMIT = finalize settlement.
2. Only SUBMIT advances `machine.lastSettledIn` / `machine.lastSettledOut`.
3. `totalNet > 0` and `storePercent + vendorPercent === 100` are required to submit.
4. Receipts use the visit snapshot, not live master data.
5. Photos belong to the visit, not the machine master.

## Current State
- Existing app is Skillrout (customer match/coupon + employee shift).
- This launch re-shapes it into Skillrout (store-machine-settlement).
- Planning docs: `PRD.md`, `architecture.md`, `architecture_essentials.md`, `scaffold.md`.

## Design Quick Ref
- Primary: `#6B7C59` (Muted Olive)
- Accent: `#C46A3D` (Terracotta)
- Background: `#F7F4F0`
- Spacing: `4, 8, 13, 21, 34, 55`
- Mobile-first, Bento for dashboards, WCAG AA.

## If Stuck
- Ask the user a focused question.
- Never break the five business rules above.
