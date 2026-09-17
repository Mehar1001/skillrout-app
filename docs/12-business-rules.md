# Business Rules

1. RUN permanently records a visit snapshot and never advances machine settlement baselines.
2. PRINT changes print metadata only.
3. SUBMIT is the only normal employee operation that advances `lastSettledIn` and `lastSettledOut`.
4. SUBMIT requires `totalNet > 0` and percentages totaling 100.
5. Readings cannot be below their captured settlement baseline.
6. Business date must be today or within the previous seven days.
7. Receipts/reports use visit snapshots, not live machine master data.
8. Photos belong to visits, not machine records.
9. Money is rounded to two decimals.
10. Client-generated visit IDs make RUN retry-safe; duplicates are rejected as already existing.
11. Submitted visits are protected from ordinary client financial edits.
12. Employee access requires an active profile and assigned store.
13. Employees may have only one unresolved collection shift.
14. RUN requires the employee’s valid shift in `in_progress` or `returning` status.
15. Finishing a route moves its shift to `pending_reconciliation`.
16. Reconciliation compares submitted visit vendor amounts with actual cash by store.
17. A non-zero reconciliation difference requires a reason.
18. All shift stores must be reconciled before close.
19. Closing freezes `closedSummary` and permits the employee to start another shift.
20. Owner adjustments retain original values and adjustment history; baseline rewrite is explicitly requested and guarded.
21. Visit image uploads are scoped to the tenant/store/visit, limited to supported image MIME types, and less than 5 MB.
