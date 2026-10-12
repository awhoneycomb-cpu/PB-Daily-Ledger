# Daily Cash Book & Sales Ledger - Operations & System Manual

## 1. Executive Summary & Purpose

The **Daily Cash Book & Sales Ledger** is a specialized real-time cash management, sales tracking, and vault reconciliation system designed for retail counters, distributors, and trading businesses operating in **Pakistani Rupee (PKR / Rs.)**. 

The system bridges the tactile speed of traditional two-page paper cash registers (*Roznamcha / Daily Khata*) with modern automated arithmetic, instant multi-tab Excel workbooks, physical currency denomination verification, and multi-day vault tracking.

### Core Objectives
* **Zero Discrepancy:** Continuous mathematical reconciliation between drawer cash, bank accounts, and the secure vault.
* **Non-Destructive History:** Continuous shift roll-overs that preserve 100% of historical transactions across days and months.
* **Separation of Sales vs. Internal Movements:** Pure business revenue and expenses are strictly isolated from vault handovers and bank deposits to prevent distorted profit calculations.
* **Offline-First Resilience:** Zero dependency on remote database latency; state is cached instantly to browser storage with portable JSON backup and restore capabilities.

---

## 2. Core Concepts & Architectural Model

### 2.1 The Two Financial Zones
1. **The Cash Register Drawer (Active Operational Cash):**
   * Physical cash held at the counter for day-to-day customer transactions, giving change, and paying immediate minor expenses.
   * Starts each morning with an **Opening Cash Float**.
   * Increases with **Physical Cash Sales** and **Cash Injections from Safe Vault**.
   * Decreases with **Cash Operating Expenses** and **Evening Transfers to the Safe Vault**.
2. **The Cash Safe Vault (Secure Reserve):**
   * The business safe or vault containing capital reserves, locked savings, committee deposits, and accumulated evening takings.
   * Independent running balance that rolls over permanently across shifts until banked or reinvested.

### 2.2 Payment Modes
* **Cash (Physical):** Affects physical cash in the counter drawer. Counted at the end of the day using the currency denomination counter.
* **Online / Bank Transfer:** Payments received or disbursed via bank transfer, Raast, JazzCash, Nayapay, or card terminals. Recorded in the ledger for customer reconciliation but highlighted distinctively so they do not impact the physical drawer register calculation.

---

## 3. Mathematical Formulas & Balancing Logic

The system executes real-time calculations on every keystroke:

### A. Live Cash Register Value (Expected Cash in Drawer)
$$\text{Expected Drawer Cash} = \text{Opening Cash Float} + \text{Physical Cash In} - \text{Physical Cash Out} - \text{Pending Safe Transfer}$$

* *Physical Cash In* includes counter cash sales and cash float replenishments injected from the safe vault.
* *Physical Cash Out* includes cash expenses paid from drawer.
* *Pending Safe Transfer* reflects unfinalized evening transfers awaiting physical lockup.

### B. Safe Vault Total
$$\text{Total Safe Cash} = \text{Safe Running Balance} + \text{Finalized Safe Transfers} + \text{Vault Deposits}$$

### C. Cash Variance & Denomination Check
$$\text{Cash Variance} = \text{Counted Physical Cash (Denominations)} - \text{Expected Drawer Cash}$$

* **Variance = 0:** Perfect balance (*Balanced Register*).
* **Variance > 0:** Cash surplus (more money in drawer than recorded).
* **Variance < 0:** Cash shortage (unrecorded disbursement or missing cash).

---

## 4. Standard Operating Procedures (SOPs)

### Phase 1: Morning Opening & Shift Setup
1. **Open the Active Day:**
   * When opening the shop in the morning, check the date indicator in the top header.
   * If starting a new business day, click the **"Start New Day"** button in the header.
2. **Establish the Morning Cash Float:**
   * **Option A (Automatic Rollover):** Select *Carry over previous closing cash* to transfer yesterday's ending register balance into today's starting float.
   * **Option B (Custom Float):** If excess cash was locked in the safe overnight and you keep a fixed float (e.g. Rs. 10,000 or Rs. 15,000) for morning change, enter that figure directly.
   * **Option C (Direct Slot):** You can also adjust or type the morning float directly into the **Opening Cash Balance** card at the top of the dashboard.

---

### Phase 2: Daytime Operational Recording

#### A. Recording Cash In (Counter Sales)
1. Select the **Cash In** tab in the Data Intake Form.
2. Ensure the subtype is set to **Customer Sales**.
3. Enter the transaction **Amount (PKR)** (use quick buttons `+500`, `+1,000`, `+5,000` for speed).
4. Select the **Salesperson / Counter** (e.g. Abdullah, Ishtiaq, Ilyas, Tayab Electric, General Counter) or click **+ Add Staff** to register a new counter.
5. Enter the customer **Invoice / Bill #**.
6. Select **Cash** or **Online / Bank Transfer**.
7. Click **Add Cash In Entry** (or press Enter).

#### B. Recording Cash Out (Business Expenses)
1. Select the **Cash Out** tab in the Data Intake Form.
2. Enter the disbursement **Amount (PKR)**.
3. Select an **Expense Category**:
   * *Freight & Cargo*
   * *Logistics & Courier*
   * *Office & Refreshment* (tea, lunch, snacks)
   * *Fuel & Travel* (petrol, bike delivery)
   * *Supplier & Vendor Payment*
   * *Partner Drawing & Transfer*
   * *Utilities & Maintenance*
   * *Miscellaneous*
4. Enter the **Receipt / Voucher #** (e.g. Receipt # 9250644, Voucher # 4359).
   > **Protocol Rule:** Always use the term **Receipt #** or **Voucher #**. Transport and delivery receipts are officially recorded as Receipt Numbers.
5. Select whether the payment was made from the counter **Cash Drawer** or via **Bank Online**.
6. Enter particulars in the **Payee Note** field.
7. Click **Record Cash Out Entry**.

#### C. Recording Cash Returns / Expense Refunds
When an employee returns unused money (e.g. petrol change, tea change, or courier advance return):
1. Under **Cash In**, select **Expense Refund**.
2. Select the category from which the funds were originally disbursed (e.g. Fuel, Refreshment, Freight).
3. Enter the returned change amount and reference note.
4. The system logs the return, adds the physical cash back to the drawer, and offsets the category analytics.

#### D. Float Replenishment / Injections
When counter cash runs low and you need change from the safe:
1. Under **Cash In**, select **Safe / Capital Injection**.
2. Select the source: **Safe Vault**, **Owner Capital**, or **Bank Cash**.
3. Enter amount.
4. If *Safe Vault* is selected, the system automatically deducts the cash from the Safe balance and adds it to the cash drawer register, tagging the entry as `[Safe ➔ Drawer]`.

---

### Phase 3: Daytime Monitoring & Reconciliation

#### 1. Live Overview Cards
* **Opening Cash:** Starting float for the active calendar date.
* **Today's Gross Sales:** Pure sales revenue (excluding internal transfers).
* **Operating Expenses:** Pure business operating expenses (excluding vault transfers).
* **Cash Register (Drawer Cash):** Exact physical cash that must be physically present in the drawer right now.

#### 2. Physical Currency Denomination Slip
1. Open the drawer and count the physical currency notes.
2. Enter the bill counts into the **Denomination Counter**:
   * Count of Rs. 5,000, 1,000, 500, 100, 50, 20, 10 notes and loose coins.
3. The system calculates the physical total and instantly displays:
   * **Balanced (Rs. 0 difference):** Cash in hand perfectly matches all transactions.
   * **Shortage / Surplus:** Shows exact discrepancy in Pakistani Rupees.

---

### Phase 4: Day-End Closing & Safe Transfers

1. **Calculate Day-End Takings:**
   * In the **Cash Safe Manager** panel, view the live drawer balance.
   * Click **Transfer Takings (Leave Float)** to automatically set the transfer amount equal to the day's net earnings while keeping the morning starting float in the drawer for tomorrow.
2. **Execute Drawer to Safe Transfer:**
   * Enter the handover note or select *Day-End Cash Handover to Safe*.
   * Enter the handover **Receipt #** if a voucher was issued.
   * Click **Transfer to Safe Now**.
   * Cash is credited to the Safe Vault and deducted from the live drawer register, marked as `[Drawer ➔ Safe]`.
3. **Safe to Bank Deposits:**
   * If cash is taken from the vault to deposit into the bank (e.g. Meezan Bank, HBL, Bank Alfalah), open the **Safe to Bank** section.
   * Enter the deposit amount, select the bank name, and input the bank deposit **Receipt #**.
   * Click **Deposit to Bank**. Safe vault cash is reduced, and the deposit is recorded in the ledger without affecting the counter drawer.

---

### Phase 5: Starting a New Day (Preserving History)

1. Click **"Start New Day"** in the top navigation header.
2. Select the new calendar date (defaults to the next day).
3. Select your morning opening float preference:
   * *Carry over previous closing cash*
   * *Specify custom morning opening float*
   * *Start with Rs. 0 float*
4. Click **Start Day**.
5. **Historical Integrity:**
   * All sales, expenses, invoices, and receipts from yesterday and previous days remain **100% intact**.
   * You can return to inspect or export any past day at any time using the date picker in the header or by clicking that day's date chip in the 7-day trend chart.

---

## 5. Multi-View Ledger & Analytical Tools

### 5.1 Two-Page Physical Ledger View (*Roznamcha*)
Matches the layout of traditional hardbound ledger books used across Pakistani commercial markets:
* **Left Page (Cash Out / Expenses):** Serial number, verification tick `(✓)`, amount, payment mode, particulars, category, and Receipt #.
* **Right Page (Cash In / Receipts):** Serial number, salesperson/counter, invoice/bill number, payment mode, and amount.
* **Summary Footers:** Cash In total, Cash Out total, and Net closing balance.

### 5.2 All-Transactions Tabular View
* Complete searchable transaction log with real-time filters.
* Filter by text (invoice #, receipt #, description, staff name, category).
* Filter by transaction type (Cash In, Cash Out, Internal Transfers).
* Scope selector: View **Active Day Only** or **All Recorded Dates**.
* Inline Date Editing: Click any entry's date to adjust or backdate transactions.

### 5.3 Cash Flow Trends & Historical Chart
* View cash movements across **7 Days**, **14 Days**, **30 Days**, or **All History**.
* Multiple chart visualization modes:
  * **Flow Area Chart:** Visualizes cash inflow peaks vs. cash outflow valleys.
  * **Bar Chart:** Direct side-by-side comparison of daily takings.
  * **Net Flow Chart:** Highlights days with positive cash accumulation vs. heavy expense days.
* **Interactive Date Chips:** Every past recorded day appears as a clickable chip below the chart with its individual Income, Expense, and Net summary. Clicking any date instantly opens that day's ledger.

---

## 6. Data Security, Export, & Backup Protocols

### 6.1 Multi-Tab Excel (.xlsx) Export
Click **"Download Excel (.xlsx)"** in the header to download a complete workbook containing:
* **Sheet 1 (`Transaction Log`):** Flat export of every transaction with Date, Time, Type, Amount (PKR), Payment Mode, Staff, Bill #, Category, Description, Receipt #, and Verification Status.
* **Sheet 2 (`Two-Page Ledger`):** Formatted parallel Roznamcha ledger matching physical print registers.
* **Sheet 3 (`Day Summary`):** Reconciliation summary, opening float, physical cash drawer balance, safe vault holdings, and expense category breakdown.

### 6.2 Portable JSON Backup & Restoration
* **Backup:** Click **Backup (.json)** in the header to generate a timestamped file (`Ledger_Backup_YYYY-MM-DD.json`). Store this on a USB drive or secure cloud storage.
* **Restore:** Click **Restore** to upload a previously saved `.json` file and restore the full state (all dates, transactions, staff lists, vault balance) on any computer.

### 6.3 Clear Safety Controls
To protect against accidental data loss, clicking **Clear** opens a confirmation modal offering three specific levels of clearance:
1. **Clear Everything (Factory Reset):** Resets all transactions, vault deposits, and floats. Requires explicit secondary confirmation.
2. **Clear Transactions Only:** Clears the ledger entries while preserving your configured staff counters and safe balance.
3. **Reset Opening Balance Only:** Resets today's starting float to Rs. 0 without touching transactions.

---

## 7. Terminology & System Standards

| Standard Terminology | Deprecated / Disallowed Terms | Context & Explanation |
| :--- | :--- | :--- |
| **Receipt / Voucher #** | *Builty / Bilty* | All cargo, transport, vendor, and cash vouchers must be identified strictly as Receipt or Voucher numbers. |
| **Cash In / Sales** | *Credit / Income* | Inflow of cash from customer billings or refunds. |
| **Cash Out / Expenses** | *Debit / Payout* | Business disbursements paid via cash drawer or bank. |
| **Cash Register / Drawer Cash** | *Total Profit* | Physical cash in the counter drawer. Not synonymous with business net profit. |
| **Safe Vault** | *Petty Cash* | The long-term secure cash reserve, separate from the till. |
| **Internal Transfer** | *Operational Expense* | Movement of money between counter, vault, or bank. Never counted as sales revenue or expense. |

---

## 8. Frequently Asked Questions (FAQ)

#### Q: How do I enter an expense that happened yesterday?
**A:** In the Data Intake form, click the **Date** field in the bottom bar and pick yesterday's date (or click the **Yesterday** quick chip). Enter the expense details and click submit. It will automatically attach to yesterday's historical sheet.

#### Q: Why doesn't an internal transfer change my sales revenue?
**A:** Moving money from the drawer to the safe, or from the safe to the bank, is a transfer of assets, not an income or expense. The ledger tracks the movement physically while keeping your sales and operating expense statistics 100% clean.

#### Q: What if the cash in my drawer does not match the register value?
**A:** Use the **Denomination Counter** to count your bills. If a shortage or surplus appears:
1. Check if an expense was paid without being recorded in the ledger.
2. Check if a customer sale was recorded as Cash instead of Online, or vice versa.
3. Check if change was given incorrectly.

#### Q: My data looks missing or I see 0 transactions. How do I recover it?
**A:** Your data is safe. Here are the three most common reasons and immediate 1-click fixes:
1. **Different Date Selected:** The ledger opens showing today's date. If your entries were made yesterday, last week, or on September 5, click the **"View All Dates"** button on the filter bar or banner, or use the date picker to jump to that date.
2. **Data on Your Phone's Browser:** If you entered transactions on your phone, open the app on your phone and tap **"Sync Cloud"** or **"Data Recovery"** -> **"Push to Cloud"**. It will immediately push all stored entries to the live cloud database so your PC sees them instantly.
3. **Data Recovery Center:** Click the **"Data Recovery"** button in the header at any time. It inspects local storage, reveals all dates with records, lets you restore saved snapshots, and provides emergency import/export tools.

#### Q: How does cross-device synchronization work between my phone and computer?
**A:** The application includes live Firebase Firestore cloud synchronization:
1. **Live Automatic Sync:** Any entry added on your phone, tablet, or desktop instantly syncs across all connected devices in real time without refreshing.
2. **"Sync Cloud" Button:** If you previously had entries entered only on your phone (in offline or local storage), clicking the **"Sync Cloud"** button in the header will immediately upload and broadcast your complete transaction history to the cloud database so it appears on all devices.
3. **Cloud Live Status:** Look at the badge next to the app title in the header—it displays **"Cloud Live Sync"** with a live pulsing indicator when active.

#### Q: How can I run the app without opening Google AI Studio?
**A:** You have 3 easy ways:
1. **Direct Web Link:** Open `https://ais-pre-ubptl7rfpbv4cwlo2iqnng-184534543669.asia-southeast1.run.app` directly in your browser. Bookmark it or pin it to your browser tabs.
2. **Install as App (PWA):** Click the "Run Without Studio" button in the top header or look for the Install icon in your browser address bar. It installs onto your Windows/Mac desktop or Android/iPhone home screen and launches like a native app.
3. **Run 100% Offline (Local Machine):** Download the code, run `npm install` and `npm run dev`, and open `http://localhost:3000`.

#### Q: Can I run this system without an internet connection?
**A:** Yes. The application is built offline-first. If you lose internet or work offline, transactions are securely cached locally. As soon as you reconnect, they sync back to the cloud. You can also export Excel sheets or create JSON backups at any time offline.

