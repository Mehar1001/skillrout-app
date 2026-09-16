# Skillrout — Collection Shift UAT Sign-Off Checklist

Use this checklist with an existing owner and employee in production to validate the Collection Shift feature.

---

## Pre-requisites

- Owner has an active account.
- Employee has an active account with at least one assigned store.
- At least one machine with a known last settled reading is set up.
- Employee knows the email and password.

---

## 1. Employee — Start a shift

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Sign in as employee. | Employee dashboard appears. | | |
| 2 | Tap the **Activity** tab. | Activity screen opens. | | |
| 3 | Tap **Start Shift**. | Shift starts. Status shows **In Progress**. | | |
| 4 | Tap **Select Store** and choose the assigned store. | Store visit screen opens. | | |

---

## 2. Employee — Run and Submit a visit

Use these example readings:

- Last Settled IN: `1000`
- Last Settled OUT: `500`
- Present IN: `1200`
- Present OUT: `600`
- Store %: `50`
- Vendor %: `50`

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Enter Present IN `1200` and Present OUT `600`. | New IN `200.00`, New OUT `100.00`, Net `100.00`. | | |
| 2 | Tap **RUN**. | Visit is saved. `lastSettled` does **not** change. | | |
| 3 | Tap **Submit & Print** on the outcome screen. | Settlement is submitted and receipt opens. | | |
| 4 | Close or save the receipt. | Returns to employee screen. | | |
| 5 | Go to the **Activity** tab. | Gross Collected `200.00`, Net `100.00`, Store Share `50.00`, Expected Return Cash `50.00`. | | |

---

## 3. Employee — Finish the route

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | On the **Activity** tab, tap **Finish Route**. | Confirmation dialog appears. | | |
| 2 | Confirm. | Shift status changes to **Pending Reconciliation**. | | |
| 3 | Read the screen. | Message says "Waiting for admin reconciliation." | | |
| 4 | Try tapping **Start Shift** again. | Cannot start a new shift until current one is closed. | | |
| 5 | Sign out and sign back in. | Shift is still in **Pending Reconciliation**. | | |

---

## 4. Owner — Open Collections and review the shift

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Sign in as owner. | Owner dashboard appears. | | |
| 2 | Tap the **Collections** tab. | Shifts are grouped by employee. | | |
| 3 | Find the employee and tap the pending shift. | Shift drill-down opens. | | |
| 4 | Tap the store row. | Machine line items are shown. | | |
| 5 | Check the expected amount. | Expected Return is `50.00`. | | |

---

## 5. Owner — Reconcile the store

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Enter Actual Cash Received `45.00`. | Difference shows `-5.00`. | | |
| 2 | Enter a discrepancy reason. | Reason is accepted. | | |
| 3 | Check **Receipt Verified** if shown. | Receipt verified flag is saved. | | |
| 4 | Tap **Approve Store Reconciliation**. | Store status becomes `reconciled`. | | |
| 5 | Return to the shift. | Shift status is **Partially Reconciled** or **Pending Reconciliation**. | | |
| 6 | Repeat for any remaining stores. | All stores show `reconciled`. | | |

---

## 6. Owner — Close the shift

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Tap **Close Shift**. | Confirmation dialog appears. | | |
| 2 | Confirm. | Shift status becomes **Closed**. | | |
| 3 | Open the shift again. | `closedSummary` shows expected return, actual received, difference, stores, machines, visit IDs, closed at, and closed by. | | |
| 4 | Try to edit the shift. | Fields are no longer editable. | | |

---

## 7. Owner — Run Shift Reports and export Excel

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Tap the **Shift Reports** tab. | Shift Reports screen opens. | | |
| 2 | Tap **Today** (or a range that includes the closed shift). | Summary cards update. | | |
| 3 | Check summary values. | Total shifts `1`, Expected `50.00`, Actual `45.00`, Difference `-5.00`. | | |
| 4 | Tap **Export Excel**. | File is shared (mobile) or downloaded (web). | | |
| 5 | Open the workbook. | Three sheets exist: **Summary**, **Store Detail**, **Machine Detail**. | | |
| 6 | Check Store Detail sheet. | Shows employee, shift, store, expected `50.00`, actual `45.00`, difference `-5.00`. | | |
| 7 | Check Machine Detail sheet. | Shows the machine, visit, readings, and expected `50.00`. | | |

---

## Sign-off

| Tester | Role | Date | Signature |
|--------|------|------|-----------|
| | | | |

| Outcome | |
|---------|---|
| All checks passed | |
| Issues found | |

If any check failed, record the issue number and re-test after the fix.

---

## Acceptance notes

### Close Shift confirmation + employee clearance

When the owner taps **Close Shift**, a confirmation dialog must appear with this message:

> You have collected and reviewed the pending shift amount. Closing this shift will mark reconciliation complete and allow the employee to start a new shift for the next visit.

Buttons: **Cancel** and **Close Shift**.

After the owner confirms:
- A success message appears: "Shift closed successfully."
- The shift status becomes **Closed**.
- The **Close Shift** button disappears or is disabled.
- The closed shift appears in **Shift Reports**.
- **Export Excel** includes the closed shift.

On the employee side after the owner closes the shift:
- **Employee Activity** shows "All cleared. No pending reconciliation."
- The **Start Shift** button is available again.
- The employee can begin the next store visit normally.

### Excel export feedback

Tapping **Export Excel** must show a clear success or failure message on the report screen. A failed export should log the error and display it to the user instead of failing silently.
