# Skillrout — Admin and Employee User Guide

This guide explains how to use the Skillrout Dashboard in plain, simple steps.

## What Skillrout does

Skillrout is an app for business owners and employees to track store visits, machine meter readings, and cash settlements.

- **Admins / Owners** request access, set up stores, machines, and employee accounts.
- **Employees** visit stores, read the machines, enter the readings, and settle the visit.

There are only three important buttons to remember:

- **RUN** — saves the visit.
- **PRINT** — prints a receipt.
- **SUBMIT & PRINT** — finalizes the settlement and moves the machine reading forward.

## Before you start

You need:

- The Skillrout web or mobile app open.
- A valid email address for the owner.
- A separate email address for each employee.
- Internet connection.

## Part 1 — Admin / Owner guide

### 1.1 Request owner access

1. Open the Skillrout app at `https://skillrout.web.app`.
2. Tap **Get Started** or **Create Owner Account**.
3. Type your **Business name**.
4. Type your **email address**.
5. Type a strong password (10–128 characters, at least one letter, one number, and one special character like `@`, `$`, `!`, `%`, `*`, `?`, or `&`). Example: `SkillTest9!`.
6. Tap **Submit request**.

**What you see:**

- A message says the request is pending approval.
- A pending owner record is created.
- You cannot sign in until an admin approves the account and you verify your email.

### 1.2 Verify your email and sign in

1. Open your email app.
2. Find the verification email from Skillrout.
3. Tap the verification link.
4. Go to `https://skillrout.web.app/owner/login`.
5. Enter your email and password.
6. Tap **Sign In**.

**What you see:**

- If you did not verify, the app tells you to verify first.
- If you are approved and verified, you see the **Owner Dashboard**.

### 1.3 Reset your password

1. On the owner sign-in screen, type your email.
2. Tap **Forgot password?**.
3. Open your email and tap the reset link.
4. The link opens `https://skillrout.web.app/auth/action`.
5. Follow the instructions to make a new strong password.

**What you see:**

- A password reset email arrives in a few minutes.
- You can sign in again with the new password.

### 1.4 Create a store

A store is the place where the machines are located.

1. From the **Owner Dashboard**, tap **Stores**.
2. Tap the button to add a new store.
3. Type the **Store name**, for example `UAT Store 1`.
4. Type the **Address**, for example `100 Test Street`.
5. Type the **Store percentage**. This is the share the store keeps. Example: `50`.
6. Type the **Vendor/Games percentage**. Example: `50`.
7. Make sure **Store % + Vendor/Games % = 100%**.
8. Tap **Save**.

**What you see:**

- The new store appears in the list.
- If you refresh the page, the store is still there.
- If the percentages do not total 100, the app shows an error and does not save.

### 1.5 Add a machine to the store

A machine is the game or device the employee reads.

1. From the **Owner Dashboard**, tap **Machines**.
2. Select the store where the machine is.
3. Tap the button to add a new machine.
4. The **Number** is auto-assigned `1`, `2`, `3`, etc. Do not type it.
5. Type the **Machine name**. Example: `Front Machine`.
6. Type the **Last Settled IN** value. Example: `1000`.
7. Type the **Last Settled OUT** value. Example: `500`.
8. Tap **Save**.

**What you see:**

- The machine appears under the store as `1 Front Machine`.
- The number is shown without `#` or `Serial`.
- The machine keeps the `Last Settled IN` and `Last Settled OUT` values you entered.
- These numbers are the starting point for the first employee visit.

### 1.6 Renumber machines

1. Open **Machines** and select the store.
2. Expand the renumber preview.
3. Confirm the new order `1`, `2`, `3`.
4. Tap **Apply renumbering**.

**What you see:**

- Old numbers are saved as **legacy numbers** for OCR/history.
- Existing visit records keep the number they had at the time.

### 1.7 Create an employee

1. From the **Owner Dashboard**, tap **Employees**.
2. Tap the button to add a new employee.
3. Type the **Employee name**.
4. Type the **Employee email**. This must be different from the owner email.
5. Type a strong temporary **Password**.
6. Select one or more stores to assign to the employee.
7. Tap **Create Employee**.

**What you see:**

- A new user is created in Firebase Authentication.
- A document is created in `employees/{uid}` with the owner's ID and assigned stores.
- The employee is set to **must change password**.
- If you do not select a store, the app shows an error and does not create the employee.

### 1.8 View history

1. From the **Owner Dashboard**, tap **History**.
2. You see a list of every visit for every store.
3. Each visit shows:
   - Date and time
   - Employee name
   - Store name
   - Result (positive, zero, or negative)
   - Settlement status (submitted or not submitted)
   - Print status (printed or not printed)
4. Tap any visit to see the full details or reprint the receipt.

### 1.9 Reports

1. From the **Owner Dashboard**, tap **Reports**.
2. Pick a date range.
3. View or print the report.

**What you see:**

- A report using visit snapshots.
- Machine numbers shown as plain `1`, `2`, `3`.

### 1.10 Sign out

1. Tap your profile or the menu.
2. Tap **Sign Out**.

**What you see:**

- You return to the public home page.

---

## Part 2 — Employee guide

### 2.1 Sign in as an employee

1. Open the Skillrout app.
2. Tap **Sign In** and choose **Employee Sign In**.
3. Or go directly to `https://skillrout.web.app/employee/login`.
4. Enter the **employee email** the owner gave you.
5. Enter the **temporary password** the owner gave you.
6. Tap **Sign In**.

**What you see:**

- On first login you are asked to create a new password.
- You do not go to the owner dashboard.
- You go to the **Select Store** screen.
- You only see the stores the owner assigned to you.

### 2.2 Select a store

1. On the **Select Store** screen, tap your assigned store.
2. You see the store name and address.
3. The **Business date** is today.
4. You see the machines for that store with their **Last Settled IN** and **Last Settled OUT** values.

**What you see:**

- Only the stores you are allowed to visit are shown.
- Machines are shown as `1 Front Machine` with no `#` or `Serial`.
- The machine list shows the starting numbers, for example `IN $1,000.00` and `OUT $500.00`.

### 2.3 Enter the machine readings

1. Look at the real machine's screen.
2. Find the **IN** meter number.
3. In the app, tap the **Present IN** field for that machine.
4. Type the number as money, for example `$1,200.00`.
5. Find the **OUT** meter number.
6. In the app, tap the **Present OUT** field.
7. Type the number, for example `$600.00`.
8. If you want, tap **Photo** to take a picture of the machine meter.

**What you see:**

- The app shows **New IN**, **New OUT**, and **Machine Net** as you type.
- If you type a number lower than **Last Settled**, the field turns red and shows an error.
- The **RUN** button stays disabled until every machine has a valid reading.

### 2.4 Take a photo (optional)

1. Tap **Photo** next to the machine.
2. Allow camera access if the app asks.
3. Take the photo.
4. Tap **Use Photo** or **Retake**.

**What you see:**

- The photo is attached to the machine reading.
- You can **Remove** the photo if you do not want it.

### 2.5 RUN the visit

1. After all machines have valid readings, tap the **RUN** button.
2. Watch the progress messages: preparing, uploading photos, recording, checking.
3. Wait for the success or the **Check Status** option.

**What you see:**

- A new visit is saved in the system.
- The visit status is **not submitted**.
- The print status is **not printed**.
- The machine **Last Settled IN/OUT** numbers do **not** change.

### 2.6 Settlement split

1. After a positive RUN, the **Settlement** screen shows the read-only store/games split.
2. If the split is wrong, contact the owner.
3. Tap **Save Split and Continue**.

**What you see:**

- The split comes from the store defaults.
- The app shows **Store Amount**, **Vendor Amount**, and **Cash Due Location**.

### 2.7 Choose what to do next

On the **Outcome** screen you see different buttons based on the **Total Net**.

#### If Total Net is more than $0 (positive)

You see:

- **Submit & Print** — finalizes the settlement and advances the machine baseline.
- **Print Receipt** — only prints the receipt; does not advance the baseline.
- **Cancel** — goes back.

#### If Total Net is $0 or less

You see:

- **Print Receipt** — prints the receipt.
- **Cancel** — goes back.
- You do **not** see **Submit & Print**.

### 2.8 PRINT only

1. Tap **Print Receipt**.
2. The receipt opens.
3. Use the system print dialog to print or save as PDF.

**What you see:**

- The print status of the visit changes to **printed**.
- The settlement status stays **not submitted**.
- The machine **Last Settled** numbers do **not** change.

### 2.9 SUBMIT & PRINT

Use this only when the visit made money.

1. Make sure the split is correct and totals to 100%.
2. Tap **Submit & Print**.
3. The receipt opens; print or save as PDF.
4. Return to the app.

**What you see:**

- The settlement status changes to **submitted**.
- The visit cannot be submitted again.
- The machine **Last Settled IN** and **Last Settled OUT** are updated to the **Present** values.
- The next visit will use these new numbers as the starting point.

**Example:**

| Value | Before | After Submit |
|---|---:|---:|
| Last Settled IN | $1,000.00 | $1,200.00 |
| Last Settled OUT | $500.00 | $600.00 |

### 2.10 View employee history

1. From the bottom tabs, tap **History**.
2. You see only the visits for your assigned stores.
3. Tap any visit to see details or reprint the receipt.

**What you see:**

- Positive, zero, and negative visits are shown.
- You cannot see visits from stores you are not assigned to.

### 2.11 Sign out

1. Tap your profile or the menu.
2. Tap **Sign Out**.

**What you see:**

- You return to the public home page.

---

## Part 3 — Important rules

### The three main rules

1. **RUN** only saves the visit. It never changes the machine baseline.
2. **PRINT** only marks the visit as printed. It never changes the machine baseline.
3. **SUBMIT & PRINT** is the only action that changes the machine **Last Settled** numbers.

### What happens with a negative or zero visit?

- **Submit & Print** is hidden.
- You can still **Print Receipt**.
- The machine baseline stays the same.

### What if I make a mistake after RUN?

- The visit is saved permanently.
- If it was not submitted yet, the owner can void or correct it later.
- If it was already submitted, only the owner can make a correction.

---

## Part 4 — Common words and what they mean

| Word | Meaning |
|---|---|
| **Store** | The business location where machines are kept. |
| **Machine** | The device with IN/OUT meters that the employee reads. |
| **Machine number** | The plain `1`, `2`, `3` store-local number shown for each machine. |
| **Last Settled IN/OUT** | The approved baseline numbers from the last submitted settlement. |
| **Present IN/OUT** | The current numbers on the machine right now. |
| **New IN** | `Present IN - Last Settled IN`. How much IN activity happened since the last settlement. |
| **New OUT** | `Present OUT - Last Settled OUT`. How much OUT activity happened since the last settlement. |
| **Machine Net** | `New IN - New OUT` for one machine. |
| **Total Net** | `Total New IN - Total New OUT` for the whole store visit. |
| **Store %** | The share of the net the store keeps. |
| **Vendor/Games %** | The share of the net the vendor/operator keeps. |
| **Store Amount** | `Total Net * Store %`. |
| **Vendor Amount** | `Total Net - Store Amount`. |
| **Cash Due Location** | `Total New OUT + Store Amount`. The cash the location keeps. |
| **RUN** | Save the visit without changing baselines. |
| **PRINT** | Print the receipt without changing baselines. |
| **SUBMIT & PRINT** | Finalize and advance the baselines. |

---

## Part 5 — Quick example

This example uses the UAT test data.

### Setup

- Store: **UAT Store 1**
- Store %: **50**
- Vendor/Games %: **50**
- Machine: **1 Front Machine**
- Last Settled IN: **1000**
- Last Settled OUT: **500**

### Employee visit

1. Employee selects **UAT Store 1**.
2. Employee enters **Present IN = 1200** and **Present OUT = 600**.
3. Employee taps **RUN**.
4. Employee reviews the calculation:

| Result | Value |
|---|---:|
| New IN | $200.00 |
| New OUT | $100.00 |
| Total Net | $100.00 |
| Store Amount | $50.00 |
| Vendor Amount | $50.00 |
| Cash Due Location | $150.00 |

5. Employee taps **Submit & Print**.
6. The receipt prints and the machine baseline moves forward:

| Value | Before | After |
|---|---:|---:|
| Last Settled IN | 1000 | 1200 |
| Last Settled OUT | 500 | 600 |

---

## Part 6 — Tips and troubleshooting

### The app says "Present IN must be equal to or greater than Last Settled IN"

- You typed a number lower than the baseline.
- Check the machine again. The reading should always go up over time.
- Fix the number and tap **RUN** again.

### The Store % and Vendor/Games % do not add to 100

- The split is read-only on the employee settlement screen.
- Contact the owner to update the store defaults.

### The Submit & Print button is missing

- The **Total Net** is zero or negative.
- You can only **Print Receipt**.
- The next visit may be positive.

### I cannot see a store

- Only stores assigned by the owner are visible.
- Ask the owner to check your assigned stores in the **Employees** screen.

### I forgot my password

1. Tap **Forgot password?** on the sign-in screen.
2. Enter your email.
3. Follow the link in the email to `https://skillrout.web.app/auth/action`.

### The app is stuck on "Loading..."

- Check your internet connection.
- Close the app and open it again.
- If the problem continues, contact the owner or admin.

---

## Part 7 — Where to get more help

- Read the **UAT.md** file for the full tester guide and acceptance tests.
- Read the **PRD.md** file for detailed product rules.
- Ask the owner or project admin for support.

## Part 8 — Share a receipt or report

The **Print** button opens the normal print dialog. To create a file instead:

1. Tap **Share**.
2. Choose **Share as PDF** or **Share as JPEG**.
3. On a phone or tablet, choose an app from the system share sheet.
4. On the web, the file is shared when the browser supports file sharing; otherwise it downloads automatically.

PDF is best for printing and business records. JPEG is best for sending as an image in a message. Sharing a receipt also records it as printed.
