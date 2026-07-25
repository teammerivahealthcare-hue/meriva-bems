# Biomedical Equipment Management System — Phase 1 Foundation

**Status:** Concept locked, pre-build
**Market:** India (single-hospital SaaS, chain-ready schema)
**Stack:** React + Node + PostgreSQL
**Last updated:** 24 July 2026

---

## 0. How to Use This Document

This is the reference you point back to in every build conversation instead of re-explaining scope. When something changes, change it *here* — not in a chat message. Sections marked 🔓 are still open decisions.

---

## 1. What This Product Actually Is

Not "a CMMS." The organising idea is:

> **Every equipment has a profile. Four independent streams of truth flow into it.**

| Stream | What it answers |
|---|---|
| **Usage** | Who used it, how long, how often, how hard |
| **Health** | What broke, when, how often, what's due |
| **Custody** | Where is it, who's responsible, how did it get there |
| **Commercial** | What's it cost, what's covered, what's expiring |

Standard CMMS products cover Health and Commercial. **Usage and Custody are the differentiators** — and so is the condemnation model below.

### The four things no competitor in this market does

1. **Usage-based maintenance triggers** — PM and calibration driven by operating hours, not just the calendar
2. **Runtime-at-failure capture** — breakdown flagged mid-session, so you know the machine failed at 906 operating hours, not just "in June"
3. **Condemned-but-in-use as a first-class state** — matches how Indian hospitals actually behave
4. **Shelf-age-at-purchase tracking** — catches dealers supplying aged stock as new

These four are the product identity. Protect them in every scope cut.

---

## 2. Personas

| Persona | Logs in? | Does what |
|---|---|---|
| **Biomedical Admin** | Yes | Owns the fleet. Approves moves, authorises continued use, closes tickets, hires freelancers, sees everything |
| **Biomedical Engineer / Technician** | Yes | Performs PM, calibration, repairs. Logs parts. Raises tickets |
| **Staff** (nurse, doctor, junior engineer, ward staff, attendant) | Yes | Scans equipment, runs usage sessions, flags breakdowns, initiates and receives moves |
| **Freelance Engineer** | **No — tokenized link** | Views one equipment's profile, performs work, files a service report, e-signs |
| **Platform Admin** (you) | Yes | Manages the shared manufacturer/model catalog, onboards hospitals |

---

## 3. Tenancy

Three levels **in the schema from day one**, only one exposed in MVP UI:

```
Organization  (hidden in MVP — every account has exactly one)
  └── Facility  (the hospital)
        └── Building / Floor
              └── Department
                    └── Room / Location
```

**Why now:** adding `organization_id` today costs one column. Retrofitting it when a hospital chain becomes your biggest prospect means a migration across every table with real cross-tenant leakage risk. Cheapest insurance in the build.

Every tenant-scoped query filters on `facility_id`. Enforce it at the ORM/middleware layer, not per-route — one forgotten filter is a data breach in this domain.

---

## 4. Data Model

### 4.1 Platform Catalog (shared across all tenants — you maintain this)

**Manufacturer** — name, country, support contact, website

**EquipmentCategory** — name, criticality default, `usage_tracking_mode` default, PM frequency default, calibration required (bool)

**EquipmentModel** — manufacturer, model name, series, category, typical accessory list, default PM interval, default calibration interval, expected service life (years)

> This is what lets hospital #12 onboard a Dräger ventilator without re-typing specs hospital #1 already entered. It compounds in value with every customer — treat it as an asset.

### 4.2 Tenant Structure

**Organization** → **Facility** → **Building** → **Department** → **Room**

Facility carries: name, bed count, address, NABH status, contact, subscription plan.

### 4.3 Assets

**Equipment**
```
id, facility_id, asset_id (human-readable, e.g. MH/RAD/0042)
equipment_model_id (FK to catalog)  |  or free-text if not in catalog
serial_number, qr_code_token

-- The procurement-integrity fields
year_of_manufacture          -- from the device nameplate
date_of_purchase             -- from the invoice
date_of_installation
date_of_acceptance
shelf_age_months             -- DERIVED: purchase − manufacture. Flag if > 12
dealer_vendor_id             -- who supplied it

cost, funding_source
department_id, room_id, responsible_user_id
criticality                  -- CRITICAL | SEMI_CRITICAL | NON_CRITICAL
usage_tracking_mode          -- SESSION_TIMER | HOUR_METER | NONE
financial_status             -- ACTIVE_ASSET | CONDEMNED
operational_status           -- see §5.1
cumulative_usage_hours       -- DERIVED from sessions
hour_meter_reading, hour_meter_last_read_at
created_at, updated_at
```

**Accessory** — child of Equipment, own ID and QR
```
id, equipment_id (parent), accessory_id, name, serial_number
status              -- IN_USE | REPLACED | MISSING | DAMAGED | RETIRED
source              -- OEM | LOCAL | REFURBISHED
part_warranty_until
replaced_accessory_id   -- FK to the one it succeeded → builds lineage
installed_at, removed_at, removal_reason, disposition
```

> **Consumables are NOT accessories.** Small recurring items (filters, tubing, electrodes, batteries) get no ID — they're logged as `PartUsage` line items on a work order. Only components worth tracking individually become Accessory records.

**EquipmentDocument** — equipment_id, type (manual / invoice / warranty card / calibration cert / service report / condemnation approval), file, version, uploaded_by, expiry_date

### 4.4 Commercial

**Vendor** — name, type (`OEM` | `DEALER` | `AMC_VENDOR` | `SERVICE_COMPANY` | `FREELANCE`), contact, GSTIN, escalation matrix, SLA terms

**Contract** — vendor_id, type (`WARRANTY` | `AMC` | `CMC` | `SERVICE`), start, end, cost, coverage scope, response SLA hours, resolution SLA hours, renewal status

**ContractCoverage** — contract_id × equipment_id (many-to-many; one AMC covers many machines)

### 4.5 Operations

**UsageSession**
```
id, equipment_id, user_id, session_type
  -- CLINICAL_USE (drives wear → PM/calibration triggers)
  -- MAINTENANCE_WORK (drives MTTR → excluded from wear)
started_at, ended_at, duration_seconds
end_reason          -- NORMAL | BREAKDOWN | AUTO_CLOSED | ADMIN_CORRECTED
gate_state_at_start -- GREEN | AMBER
gate_acknowledged   -- bool, when AMBER
breakdown_at_seconds -- runtime at failure, if end_reason = BREAKDOWN
```
`session_type` is set automatically from the user's role — staff never choose.

**Ticket** — the reported problem
```
id, equipment_id, raised_by, source (SCAN_BREAKDOWN | MANUAL | PM_FINDING)
issue_type, description, priority (CRITICAL | HIGH | NORMAL)
runtime_hours_at_failure   -- carried from the session
status, sla_due_at, sla_breached
downtime_started_at, downtime_ended_at, downtime_hours (DERIVED)
acknowledged_by_user_at    -- digital sign-off on closure
```

**WorkOrder** — a unit of work (one ticket may spawn several)
```
id, equipment_id, ticket_id (nullable)
type          -- CORRECTIVE | PREVENTIVE | CALIBRATION | INSTALLATION | INSPECTION
performed_by_user_id (nullable) | performed_by_freelance_id (nullable) | vendor_id (nullable)
started_at, completed_at, findings, cost
```

**PMSchedule** — equipment_id, frequency, **trigger_type (`CALENDAR` | `USAGE_HOURS` | `WHICHEVER_FIRST`)**, interval_value, last_done, next_due, checklist_template_id

**ChecklistTemplate / ChecklistItem / ChecklistResponse** — per category, with reading capture

**CalibrationRecord** — equipment_id, performed_by, date, validity_until, accuracy results, certificate document_id, pass/fail

**PartUsage** (consumables) — work_order_id, name, quantity, unit_cost, remark_chips[], remark_text

**ComponentReplacement** (swaps) — work_order_id, old_accessory_id, new_accessory_id, reason, disposition, source, cost, remark_chips[], remark_text

**MovementRequest**
```
id, equipment_id, initiated_by, from_room_id, to_room_id
initiated_at, arrived_at, received_by
approval_status, approved_by, approved_at
flagged_unapproved (bool)   -- set if approval window lapses
```

**AccessoryCheckIn** — movement_request_id, accessory_id, state (`ARRIVED_OK` | `ARRIVED_DAMAGED` | `STAYED_BEHIND`), damage_note, photo

**CondemnationRecord** — equipment_id, requested_by, justification, approved_by, approved_at, disposal_method (nullable until disposed)

**ContinuedUseAuthorization** — equipment_id, authorized_by, reason, valid_until, review_interval_months, status (`ACTIVE` | `EXPIRED` | `REVOKED`)

**ServiceReport** — work_order_id, freelance_engineer_id, problem, diagnosis, work done, parts, before/after photos, cost, recommendation, hospital signature blob + OTP metadata, engineer signature blob + OTP metadata, generated PDF

**ActivityLog** — see §8

**Notification / NotificationPreference** — see §7

---

## 5. State Machines

### 5.1 Equipment — two orthogonal fields

Never collapse these into one. An asset can be written off the books and still working.

**Financial status**
```
ACTIVE_ASSET ──condemnation approved──▶ CONDEMNED
```

**Operational status**
```
DRAFT ──complete onboarding──▶ IN_SERVICE
IN_SERVICE ⇄ UNDER_MAINTENANCE
IN_SERVICE ──breakdown──▶ DOWN ──repair closed──▶ IN_SERVICE
IN_SERVICE ⇄ IN_TRANSIT
any ──admin action──▶ RETIRED ──disposal──▶ DISPOSED
```

**The critical combination:** `CONDEMNED + IN_SERVICE` is a legitimate, supported state — not an error. It means: written off the books, no AMC, no warranty, serviced by freelancers, still treating patients, under a live `ContinuedUseAuthorization`.

**"In use" is NOT a status** — it's derived from an open UsageSession. Same for these badge flags, all computed:

`PM due` · `PM overdue` · `Calibration expiring` · `Calibration expired` · `Warranty expiring` · `AMC expiring` · `SLA breached` · `Continued-use review overdue` · `Aged stock at purchase`

One machine can be `OPERATIONAL` while carrying three of these simultaneously. That's why they're flags, not states.

### 5.2 Usage Session

```
ACTIVE ──stop──▶ COMPLETED
ACTIVE ──flag breakdown──▶ ENDED_BY_BREAKDOWN  (elapsed time frozen)
ACTIVE ──exceeds category max──▶ AUTO_CLOSED   (admin review queue)
AUTO_CLOSED ──admin edits──▶ ADMIN_CORRECTED
```

**Auto-close is mandatory, not optional.** Staff will forget to stop timers. Without a per-category maximum session length, usage hours inflate into noise within a month and every usage-based trigger becomes untrustworthy.

### 5.3 Breakdown Chain (fully automatic)

```
Staff taps "Equipment broke down" mid-session
  → session ends, runtime-at-failure frozen
  → equipment.operational_status = DOWN
  → downtime clock starts
  → Ticket auto-created, prefilled: equipment, department, runtime at failure, reporter
  → CRITICAL notification to admin (immediate)
  → if under AMC → auto-route to vendor, SLA clock starts
  → ... repair ...
  → ticket RESOLVED → downtime clock stops → uptime % recalculated
  → department user acknowledges → CLOSED
```

Downtime is captured because the system did it, not because someone remembered to. That's where most CMMS data quality dies.

### 5.4 Movement — move first, approve after

Hard-blocking a move fails in reality: if a ventilator is needed in another ICU *now*, staff will move it and file later. So:

```
Scan at origin → MovementRequest INITIATED, status IN_TRANSIT
   (move proceeds immediately — no block)
Arrival → receiver (may be any staff, not only origin staff or admin)
   completes per-accessory check-in
Admin approves → APPROVED
If not approved within configured window (default 24h) → FLAGGED_UNAPPROVED
   → escalating notification, badge on equipment profile
```

Every step records **who**. Accountability comes from the record, not from the block.

### 5.5 Ticket

```
OPEN → ASSIGNED → IN_PROGRESS → [PENDING_VENDOR | PENDING_PARTS] → RESOLVED → CLOSED
```
Downtime accrues from OPEN to RESOLVED. SLA measured on response (OPEN→ASSIGNED) and resolution (OPEN→RESOLVED).

---

## 6. The Scan Gate

Every scan is a safety checkpoint. The system evaluates the equipment's flags and returns one of three responses. Admin configures thresholds per category.

| Gate | Trigger | Behaviour |
|---|---|---|
| 🟢 **GREEN** | No blocking flags | Timer starts. No interruption |
| 🟡 **AMBER** | PM overdue · calibration expired · warranty/AMC lapsed · continued-use review overdue · condemned-but-authorised | Shows admin's decision and its validity date. Staff taps **Acknowledge** — logged against their name — then proceeds |
| 🔴 **RED** | Status DOWN · continued-use revoked · admin block | Session cannot start. Offers **Raise ticket** instead |

**Example AMBER:**
> *"PM overdue by 12 days. Warranty expired 30 Jun 2026. Biomedical admin approved continued use until 30 Aug 2026. Proceed?"*

Admin sets the response once; every subsequent scanner sees it until changed or expired. This gives you a documented chain — admin authorised, staff was informed, staff proceeded — which is exactly what a NABH assessor wants to see.

---

## 7. Notifications

Three tiers. All thresholds customisable per hospital; each user can tune their own subscriptions.

| Tier | Channel | Contents |
|---|---|---|
| **Immediate** | Push + SMS | Critical-equipment breakdown · SLA breach · unapproved move past window · continued-use authorisation expired on in-use equipment |
| **Daily digest** | In-app + email | PM due this week · calibration expiring · orphaned sessions awaiting correction · movement approvals pending · open tickets ageing |
| **Weekly digest** | Email | Warranty / AMC / CMC expiring at 90/60/30 days · condemnation reviews due · aged-stock flags from new registrations |

Untiered notifications get muted within two weeks and then the whole alerting system is dead weight. The tiering is not cosmetic.

---

## 8. Activity Log

**One append-only event stream per equipment**, serving as both the user-facing timeline and the audit trail. Immutable — corrections are new entries, never edits.

Every event carries: `actor` (user or freelance engineer or system) · `timestamp` · `event_type` · `before` / `after` values · optional note.

Logged events: session start/stop/auto-close · breakdown flag · gate acknowledgement · status change · ticket lifecycle transitions · work order created/completed · PM done · checklist submitted · calibration recorded · certificate uploaded · part consumed · component replaced · movement initiated/arrived/approved/flagged · accessory check-in result · accessory damaged/missing/replaced · document added · contract added/renewed/expired · condemnation requested/approved · continued-use authorised/reviewed/revoked · freelance engineer invited · service report signed · responsible staff reassigned · hour meter reading

Filterable by type and date range → an admin pulls "everything that happened to this ventilator in Q2" in one click. **That screen is your NABH audit answer.**

---

## 9. Equipment Profile — The Core Screen

Tabs:

| Tab | Contents |
|---|---|
| **Overview** | Photo, identity, live status + flag badges, location, responsible staff, "in use by X since 10:42", cumulative hours, quick actions |
| **Usage** | Hours chart (daily/monthly), session log, hours since last PM, users by frequency |
| **Maintenance** | PM schedule + history, completed checklists with readings, next due (calendar and usage) |
| **Calibration** | Records, certificates, validity, accuracy results |
| **Breakdowns** | Ticket history sortable by quarter/year, failure count, runtime-at-failure trend, MTTR / MTBF for this unit |
| **Movement** | Full custody chain, accessory check-in results per move, unapproved flags |
| **Accessories** | Child assets with **replacement lineage** (see below) |
| **Contracts** | Warranty, AMC/CMC, vendor, SLA performance |
| **Documents** | Manuals, invoices, certificates, service reports |
| **Costs** | Repairs + parts + contract spend → total cost of ownership, vs. purchase cost |
| **Activity** | The full event timeline (§8) |

**Accessory lineage display:**
> **Ultrasound probe** — Original (2019–2023, failed) → Replacement #1, *local* (2023–2024, failed) → Replacement #2, *OEM* (2024–present)

That single view is a component-level reliability and cost story. Nothing in this market shows it.

---

## 10. Parts UX

Two buttons on a work order, because there are two genuinely different events.

### "Add consumable" — 5 seconds
Name (autocomplete) · Quantity · Unit cost · Remark chips. No ID, no lifecycle. This is filters, tubing, electrodes, batteries.

### "Replace component" — guided, because it mutates the asset tree
1. **Which component** — dropdown scoped to *this equipment's* accessory tree
2. **Old part out** — reason (failed / worn / preventive / damaged-by-staff) + disposition (scrapped / returned to vendor / kept as spare)
3. **New part in** — serial number · **source (OEM / LOCAL / REFURBISHED)** · part warranty · cost
4. **Remark**
5. On save → old accessory → `REPLACED` (history intact); new accessory created under same parent with `replaced_accessory_id` link

### Design rules

**Never ship a blank remarks box.** Quick-select chips plus optional free text:
`Under warranty` · `Temporary fix` · `Recommend replacement` · `Part not genuine` · `Awaiting OEM part` · `Damaged by user`
Chips are filterable and reportable; prose is not.

**Autocomplete learns per hospital.** Ship no parts master. The first typed entry becomes next time's suggestion. Zero setup burden — and after three months each hospital has organically built the parts list that seeds v2 inventory.

**Part source is a data goldmine in this market.** OEM vs local vs refurbished is a decision Indian hospitals make constantly and nobody measures the outcome. After a year: *"Local probes on your ultrasounds average 9 months. OEM average 27."* That one report justifies the subscription.

**Cost rolls up automatically** to the equipment's total cost of ownership, feeding the replace-or-repair decision.

---

## 11. Freelance Engineer Flow (No Login)

Freelancers won't install an app or maintain credentials for a hospital they visit twice a year. So: **tokenized link, no account.**

```
Admin assigns work order to freelance engineer (name + phone)
  → system generates secure one-time link → SMS / WhatsApp
  → engineer opens on phone, no signup
  → SCOPED VIEW: this equipment only — identity, service history,
    open issue, past repairs, accessory list, documents
    (downloadable as PDF / image)
  → performs work
  → fills service report in-browser
  → BOTH PARTIES SIGN:
       hospital admin  — drawn signature + OTP to their number
       freelance engineer — drawn signature + OTP to their number
  → PDF generated, attached to equipment profile permanently
  → link expires
```

**Security boundary:** the link exposes *one equipment*, never the fleet.

**Service report contents:** equipment identity · problem reported · diagnosis · work performed · parts used/replaced with remarks · **before/after photos (mandatory)** · time in/out · cost · recommendation · both signatures with OTP metadata.

### On e-signature — read this before building

India recognises two statutory electronic signature types under the IT Act, 2000: DSC-based digital signatures, and Aadhaar-based eSign through a licensed provider. **A drawn-on-screen signature is neither.** It remains usable as commercial evidence of acknowledgement — almost certainly sufficient for a hospital–engineer service acknowledgement — but it is not the statutory article.

**MVP decision:** drawn signature + **OTP verification of the signer's phone number**, plus captured timestamp, IP, device, and GPS where permitted. The OTP is what makes it defensible — you can show the signer controlled that number at that moment.

If a hospital later demands statutory eSign, integrate a provider (Digio, Leegality, eMudhra). Do not build that for MVP.

> ⚠️ This is a legal question and I'm not a lawyer — get a quick opinion before making claims about it in sales material.

**Why this feature matters more than it looks:** today this transaction leaves a paper chit or nothing at all. If your system generates the record, you own the truth. The hospital gets NABH-ready documentation, the engineer gets proof of work, and every freelance biomedical engineer in the region touches your platform before you've launched a marketplace. 🔓 *Engineer reputation/portfolio: deferred, but this data is its seed.*

---

## 12. Condemnation — The India Model

Standard CMMS treats condemnation as the end. In Indian hospitals it is a **financial event, not an operational one**: the asset is written off the books, loses AMC and warranty, and keeps working — serviced by freelancers or third parties — until it truly dies or the admin pulls it.

```
Engineer raises condemnation request (justification: breakdown frequency,
  repair cost, obsolescence)
  → management approves
  → financial_status = CONDEMNED
  → operational_status UNCHANGED (still IN_SERVICE)
  → admin creates ContinuedUseAuthorization:
        reason, valid_until, review_interval (default 6 months, configurable)
  → equipment now shows 🟡 AMBER on every scan, stating the authorisation
  → alerts escalate at 30 / 15 / 7 days before review due
  → REVIEW LAPSES → authorisation EXPIRED → still AMBER, now reading
        "Continued-use authorisation expired on [date]. Contact biomedical."
        (staff may still proceed with acknowledgement — the lapse is logged, not hidden)
  → admin re-authorises in one click from the alert
  → eventually: RETIRED → DISPOSED (disposal method recorded)
```

**What this unlocks:**
- **Sharper cost tracking.** No AMC post-condemnation, so every repair is out-of-pocket. The system can say: *"This written-off ultrasound has cost ₹1.4L in freelance repairs over 14 months. Replacement is now cheaper."* That's a purchase-decision engine.
- **Vendor model widens** to include freelance/unregistered engineers — which is exactly the foundation the paused marketplace will need.
- **Risk becomes evidence.** Using written-off equipment on patients is an NABH exposure. Recording the admin's explicit decision, with review dates and acknowledgements, converts a liability into audit documentation.

---

## 13. Procurement Integrity (Year of Manufacture)

Dealers in this market sometimes supply aged stock as new. Capturing manufacture year separately from purchase date makes that visible:

```
shelf_age_months = date_of_purchase − year_of_manufacture
  > 12 months → 🚩 "Aged stock at purchase" flag on the equipment profile
```

**Downstream value:**
- Remaining useful life is computed from manufacture, not purchase — more honest depreciation and replacement planning
- Aggregated by dealer → **a vendor scorecard showing which suppliers habitually ship old inventory**. Over three years of data across your customer base, that's a genuinely defensible product asset.

One extra field. Large payoff.

---

## 14. Role–Permission Matrix

| Action | Admin | Engineer | Staff | Freelance (link) |
|---|:--:|:--:|:--:|:--:|
| View all equipment | ✅ | ✅ | Own dept | Single unit |
| Register / edit equipment | ✅ | ✅ | ❌ | ❌ |
| Bulk import | ✅ | ❌ | ❌ | ❌ |
| Start / stop usage session | ✅ | ✅ | ✅ | ❌ |
| Flag breakdown | ✅ | ✅ | ✅ | ❌ |
| Raise ticket | ✅ | ✅ | ✅ | ❌ |
| Assign / close ticket | ✅ | ✅ | ❌ | ❌ |
| Perform PM / calibration | ✅ | ✅ | ❌ | ✅ (assigned) |
| Log parts | ✅ | ✅ | ❌ | ✅ (assigned) |
| Initiate move | ✅ | ✅ | ✅ | ❌ |
| Receive / check in move | ✅ | ✅ | ✅ | ❌ |
| Approve move | ✅ | ❌ | ❌ | ❌ |
| Correct auto-closed session | ✅ | ❌ | ❌ | ❌ |
| Set scan-gate response | ✅ | ❌ | ❌ | ❌ |
| Request condemnation | ✅ | ✅ | ❌ | ❌ |
| Approve condemnation / authorise continued use | ✅ | ❌ | ❌ | ❌ |
| Manage contracts & vendors | ✅ | ❌ | ❌ | ❌ |
| Sign service report | ✅ | ❌ | ❌ | ✅ |
| View activity log | ✅ | ✅ | ❌ | ❌ |

---

## 15. MVP Scope

### In

**Setup** — hospital signup, building/floor/department/room, user roles, category configuration
**Catalog** — manufacturer/model master, hospital-side selection
**Equipment** — registration with manufacture-year capture, bulk import from your existing spreadsheet, QR generation, accessories as child assets, documents, criticality
**Commercial** — warranty, AMC/CMC contracts, coverage mapping, vendors
**Usage** — session timer with scan gate, three tracking modes, auto-close, hour-meter entry
**Breakdown** — flag-from-timer → auto ticket → downtime clock → SLA → closure with acknowledgement
**Maintenance** — PM scheduling (calendar / usage / whichever-first), checklists, calibration with certificate upload
**Movement** — retroactive approval, per-accessory check-in with three states, unapproved flagging
**Condemnation** — condemned-but-in-use, continued-use authorisation, re-review cycle
**Parts** — consumable logging + component replacement with lineage, remark chips
**Freelance** — tokenized link, scoped profile view, PDF export, service report with dual OTP signature
**Activity log** — full event stream per equipment
**Notifications** — three tiers, customisable
**UI** — equipment profile (all tabs), equipment list table, basic dashboard (uptime, open tickets, PM due, expiring contracts, flags)

### Out (v2)

Spare parts **inventory** (stock levels, reorder, indents, approvals) · advanced KPI dashboards (fleet-wide MTTR/MTBF trends) · financial reporting suite · vendor SLA scorecards · HIS/HMS integration · hospital-chain multi-facility UI · engineer marketplace and reputation · native mobile app (MVP = responsive web + camera QR scan) · regional language support

**Note on the biggest deferral:** parts *consumption* is in MVP (you need cost attribution per equipment). Parts *inventory* is out — it's a full subsystem, hospitals typically have a store module already, and it doesn't block the core loop.

---

## 16. India-Specific Notes

- **Compliance frame is NABH**, not FDA or Joint Commission. Position audit-readiness accordingly.
- **DPDP Act 2023** governs personal data. Staff data is in scope; **no patient linkage** keeps you clear of the heaviest obligations. 🔓 Confirm data residency requirements before choosing hosting.
- **Currency INR**; capture GSTIN on vendors; AMC costs typically quoted annually.
- **Language:** English is fine for admin and engineering staff. Ward-level staff may need Hindi/regional later — defer, but don't hard-code English strings.
- **Connectivity:** assume patchy hospital wifi. Scan-and-timer should degrade gracefully; consider queued offline session capture even if full offline mode is v2.

---

## 17. Open Items 🔓

- [ ] Data residency / hosting region decision
- [ ] Whether engineer portfolio-reputation data is captured from day one (cheap now, valuable later) even though the feature is deferred
- [ ] Offline session capture — MVP or v2
- [ ] Subscription/pricing model and plan tiers
- [ ] Legal opinion on e-signature claims in sales material
- [ ] Default category configurations (which categories get SESSION_TIMER vs HOUR_METER vs NONE) — needs input from hospital #3
- [ ] Whether department users need read access to their own department's dashboard

---

## 18. Build Sequence

1. **Schema + tenancy middleware** — get isolation right before anything else
2. **Auth + roles**
3. **Vertical slice: Equipment** — catalog → registration → QR → profile page, end to end
4. **Bulk import** — proves the onboarding story for demos
5. **Usage sessions + scan gate** — the differentiator, and it validates the mobile-web scan flow early
6. **Breakdown chain** — timer → ticket → downtime
7. **PM + calibration**
8. **Movement + accessory check-in**
9. **Condemnation + continued use**
10. **Freelance flow + service report + e-sign**
11. **Activity log** (instrument as you go — don't retrofit)
12. **Notifications**
13. **Dashboard + list views**

Steps 1–4 give you a demoable product. Step 5–6 give you the pitch.

---

*Phase 1 complete. Next: screens and UI flows.*
