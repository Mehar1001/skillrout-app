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
| 1 | On the **Activity** tab, tap **Finish Route**. | A clear route-finished message appears. | | |
| 2 | Read the screen. | Shift status changes to **Waiting for Owner**. | | |
| 3 | Check the next-step message. | Message says the owner will check the cash and close the shift. | | |
| 4 | Try tapping **Start Shift** again. | Cannot start a new shift until current one is closed. | | |
| 5 | Sign out and sign back in. | Shift is still **Waiting for Owner**. | | |

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

## 5. Owner — Save store cash

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Enter Cash Received `45.00`. | Difference shows `-5.00`. | | |
| 2 | Enter a reason for the difference. | Reason is accepted. | | |
| 3 | Check **Receipt Verified** if shown. | Receipt verified flag is saved. | | |
| 4 | Tap **Save Store Cash**. | Store status becomes **Received** or **Difference**. | | |
| 5 | Return to the shift. | Shift status is **Ready to Close** when all store cash is checked, or **Needs Cash** if stores are still missing. | | |
| 6 | Repeat for any remaining stores. | All stores show **Received** or **Difference**. | | |

---

## 6. Owner — Close the shift

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Tap **Close Shift**. | Confirmation dialog appears. | | |
| 2 | Confirm. | Shift status becomes **Closed**. | | |
| 3 | Open the shift again. | The closed summary shows expected return, cash received, difference, stores, machines, visit IDs, closed at, and closed by. | | |
| 4 | Try to edit the shift. | Fields are no longer editable. | | |

---

## 7. Owner — Run Shift Reports and export Excel

| # | Step | Expected result | Pass / Fail | Notes |
|---|------|-----------------|-------------|-------|
| 1 | Tap the **Shift Reports** tab. | Shift Reports screen opens. | | |
| 2 | Tap **Today** (or a range that includes the closed shift). | Summary cards update. | | |
| 3 | Check summary values. | Total shifts `1`, Expected `50.00`, Received `45.00`, Difference `-5.00`. | | |
| 4 | Tap **Export Excel**. | File is shared (mobile) or downloaded (web). | | |
| 5 | Open the workbook. | Three sheets exist: **Summary**, **Store Detail**, **Machine Detail**. | | |
| 6 | Check Store Detail sheet. | Shows employee, shift, store, expected `50.00`, received `45.00`, difference `-5.00`. | | |
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

## Required usability fixes before sign-off

### UX-CASH-01: Store cash and Close Shift actions need clearer feedback

| Area | Severity | Finding |
|------|----------|---------|
| Save/Update Store Cash | High | When clicking **Save Store Cash** or **Update Cash**, the button loads but the owner does not get a clear success or failure message. The owner cannot confidently tell whether the action worked. |
| Close Shift | High | When clicking **Close Shift**, the shift may close, but the owner needs a clear confirmation, warning, and success message. |
| Difference handling | High | If there is a difference between expected cash and cash received, the app must clearly warn the owner before closing. |
| User experience | High | The flow feels too technical for normal users. Owners need simple language and visible next steps. |

Expected behavior for **Save/Update Store Cash**:
- Show loading text: "Saving store cash..."
- On success, show: "Store cash saved."
- If cash received differs from expected, show: "Difference recorded: -$5.00."
- If a reason is required, show: "Please enter a reason for the difference."
- Update store status immediately from **Needs Cash** to **Received** or **Difference**.
- If nothing changed after saving, show a non-clickable **Saved** state instead of an update button.

Expected behavior for **Close Shift**:
- Before closing, show a confirmation with:
  - Expected return: `$X`
  - Cash received: `$Y`
  - Difference: `$Z`
  - "Closing this shift will clear the employee to start a new shift."
- Confirmation buttons: **Cancel** and **Close Shift**.
- After success, show: "Shift closed successfully. Employee is cleared to start a new shift."
- After failure, show: "Could not close shift: [clear reason]".

Key requirement: no admin action should silently succeed or silently fail. Every action must produce at least one clear success message, error message, confirmation dialog, or visible status update.

---

## Acceptance notes

### Close Shift confirmation + employee clearance

When the owner taps **Close Shift**, a confirmation dialog must appear with this message:

> You have collected and reviewed the shift cash. Closing this shift will mark the cash review complete and allow the employee to start a new shift for the next visit.

Buttons: **Cancel** and **Close Shift**.

After the owner confirms:
- A success message appears: "Shift closed successfully."
- The shift status becomes **Closed**.
- The **Close Shift** button disappears or is disabled.
- The closed shift appears in **Shift Reports**.
- **Export Excel** includes the closed shift.

On the employee side after the owner closes the shift:
- **Employee Activity** shows "All cleared. No pending cash review."
- The **Start Shift** button is available again.
- The employee can begin the next store visit normally.

### Excel export feedback

Tapping **Export Excel** must show a clear success or failure message on the report screen. A failed export should log the error and display it to the user instead of failing silently.
