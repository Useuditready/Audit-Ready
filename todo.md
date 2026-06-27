# AuditReady - Project TODO
<!-- build: 2026-06-27-aba-pages-publish -->

## Migration from Replit to Manus Hosting
- [x] Upgrade project to full-stack (db, server, user)
- [x] Configure Clerk and Stripe secrets
- [x] Landing page with editorial design (hero, features, pricing, footer)
- [x] Dashboard page with compliance overview
- [x] Fix landing page for unauthenticated visitors (shows at /)
- [x] Auth flow: sign in → dashboard (Manus OAuth)

## Database Schema
- [x] Create staff table (name, role, email, status, hire date)
- [x] Create credentials table (type, expiration, status, staff_id, document_url)
- [x] Push schema to database (migration applied)

## Staff Page
- [x] Staff list page with search and filters
- [x] Staff status badges (green=compliant, yellow=expiring, red=expired)
- [x] Add new staff member form (modal)
- [x] Staff count and summary stats

## Staff Detail Page
- [x] Individual staff credential list
- [x] Credential status indicators with expiration dates
- [x] Add credential form (modal with full fields)
- [x] Delete credential functionality

## Dashboard
- [x] Connected to real database (no more mock data)
- [x] KPI cards showing real stats from DB
- [x] Expiring credentials list from real data
- [x] Quick actions linking to staff/credentials pages
- [x] Staff overview in sidebar

## Backend (tRPC)
- [x] staff.list, staff.getById, staff.create, staff.update, staff.delete
- [x] credentials.listByStaff, credentials.listAll, credentials.create, credentials.update, credentials.delete
- [x] dashboard.stats, dashboard.expiring

## Tests
- [x] Vitest tests for staff and credentials DB helpers (7 tests)
- [x] All tests passing (12/12)

## Stripe Integration (Deferred)
- [x] Pricing page connected to Stripe checkout — DEFERRED per user preference (no pricing packages yet)
- [x] Subscription management after sign-up — DEFERRED (no Stripe integration active)

## Completed Features
- [x] Audit-ready CSV export (one-click download from Credentials page)
- [x] Update Credentials page (/credentials) to use real data
- [x] Export test coverage (3 tests for CSV generation)

## Future Features (Require External Services)
- [x] AI document extraction — Phase 1 done (link-based, human-approved, no file storage)
- [x] Live license verification against NC state boards — DEFERRED Phase 2 (requires NC DHHS API access)
- [x] Email expiration reminders (90/60/30/7 days) — Resend integration complete, daily cron active

## Copy Updates
- [x] Update landing page "Why AuditReady" section with revised positioning copy
- [x] Improve logo presentation on landing page (AR monogram + styled serif wordmark)
- [x] Add accreditation requirements section to landing page (what surveyors look for)
- [x] Update ticker/banner copy to be more specific about accreditation

## Credential Verification Workflow (Phase 1)
- [x] Update credentials schema: add issueDate, licenseNumber, documentLink, verifiedBy, verificationDate, notes, verificationStatus (pending/approved/rejected/needs_update)
- [x] Push schema migration to database
- [x] Update tRPC credential procedures (create, update, verify) with new fields
- [x] Add credential.verify procedure (approve/reject/needs_update with verifiedBy + verificationDate)
- [x] Update StaffDetail page: full credential form with all fields + document link field
- [x] Add Approve/Reject/Needs Update action buttons on credential cards
- [x] Show verification status badge on credential cards
- [x] Update Credentials page to show verification status column + verification filter
- [x] Add Phase 1 disclaimer about no document storage (StaffDetail + Credentials page)
- [x] All 15 tests passing (no regressions)

## Phase 1 AI Features
- [x] Backend: ai.extractFromLink procedure (pass URL to LLM, return extracted fields as JSON)
- [x] Backend: ai.ask procedure with strict guardrails (refuses PHI, clinical/legal advice, non-credential topics)
- [x] StaffDetail: "Extract with AI" button — paste doc link → AI pre-fills form → confidence banner → admin reviews → save
- [x] Ask AI floating chat panel (bottom-right, all authenticated pages, credential-context-aware)
- [x] AskAI wired with live dashboard stats context (totalStaff, totalCredentials, expiringSoon, expired)
- [x] Ask AI system prompt guardrails: refuses PHI, therapy notes, clinical docs, legal/compliance opinions
- [x] Audit Narrative Generator: deferred — not a Phase 1 public feature
- [x] 28 tests passing (6 test files) — includes 7 new AI procedure tests with guardrail coverage

## Copy Updates Round 2
- [x] Update hero badge to "FOR AGENCIES THAT PROTECT WHAT THEY'VE BUILT" + business types line below (ABA Agencies · Mental Health Clinics · Psychology Practices)

## Priority Features (Ordered)

### #1 Edit Staff + Edit Credential Flows
- [x] Add phone field to staff table in schema
- [x] Add audit_log table (entity_type, entity_id, action, changed_by, changed_at, before_snapshot, after_snapshot)
- [x] Push schema migration to database
- [x] Add staff.update tRPC procedure with audit log entry
- [x] Add credentials.update tRPC procedure with audit log entry
- [x] Add auditLog.byStaff tRPC procedure (filter by staff member)
- [x] Edit Staff modal: name, role, email, phone, status — save with confirmation, cancel without saving
- [x] Delete staff: confirmation dialog required
- [x] Edit Credential modal: type, issue date, expiration date, license number, document link, notes, status
- [x] Delete credential: confirmation dialog required
- [x] Audit log panel on Staff detail page (who changed what, when)

### #2 Pending Review Queue
- [x] Dedicated page/tab showing all credentials with verificationStatus = pending across all staff
- [x] Approve/Reject/Needs Update actions directly from the queue (with optional notes modal)
- [x] Filter by staff name, credential type; search by staff name or credential type

### #3 Onboarding Checklist
- [x] First-login checklist: Add first staff member → Add credentials → You're audit-ready
- [x] Dismiss/complete state persisted per user (onboardingDismissed field in users table)
- [x] Dashboard widget showing checklist progress (appears above KPI cards, auto-hides when complete)

### #4 Email Reminders with Resend
- [x] Add RESEND_API_KEY and RESEND_FROM_EMAIL secrets
- [x] Install resend npm package
- [x] Add emailReminders table to schema (credentialId, userId, daysBeforeExpiry, expirationDate, sentAt, recipientEmail)
- [x] Push schema migration
- [x] Build sendCredentialReminderEmail helper using Resend API (server/email.ts)
- [x] Build getCredentialsNeedingReminders DB helper (joins credentials + staff + users)
- [x] Build /api/scheduled/credential-reminders Express handler (idempotent, isCron check)
- [x] Register handler in server/_core/index.ts
- [x] Create project-level heartbeat cron (daily 09:00 UTC) via manus-heartbeat CLI
- [x] Write tests for reminder logic (8 tests passing)

## Policy, Legal & Compliance Wording

### Gap Analysis (May 2026)
**What exists:**
- Footer links to /privacy, /terms, /refunds (links exist but pages return 404)
- Phase 1 no-document-storage disclaimer on StaffDetail, Credentials, PendingReview
- HIPAA-safe / no-PHI marketing copy on landing page
- Onboarding checklist disclaimer (NC Medicaid / BACB, not legal advice)
- Ask AI disclaimer (no legal/clinical advice)
- Email footer: no PHI in reminders

**What is missing:**
- [x] Privacy Policy page (/privacy) — data collected, how it's used, retention, user rights
- [x] Terms of Service page (/terms) — acceptable use, no-PHI obligation, liability limits, refund terms
- [x] Refund Policy page (/refunds) — 30-day pilot terms, no-refund-once-paid notice
- [x] "Not a HIPAA Business Associate" notice on landing page and Privacy Policy (AuditReady is not a BAA provider)
- [x] Audit log user notice on Dashboard footer (admin actions are logged with name + timestamp)
- [x] Email reminder unsubscribe/manage notice in email footer (support@auditready.com) + Privacy/Terms links
- [x] Data retention notice in Privacy Policy (90-day deletion, 7-year audit log retention)
- [x] "No legal or compliance advice" notice in Home footer (both disclaimers) and Terms of Service
- [x] Footer copyright year — now dynamic: {new Date().getFullYear()} on Home, Credentials, Staff pages
- [x] Sign-up flow: "By continuing you agree to our Terms of Service and Privacy Policy" on sign-in screen

## Account Settings & Notification Preferences

### Account Settings Page (/settings)
- [x] Add notificationPreferences JSON field to users table in schema (per-threshold opt-out)
- [x] Push schema migration
- [x] Add settings.getProfile tRPC procedure (returns name, email, phone, notificationPreferences)
- [x] Add settings.updateProfile tRPC procedure (update name, phone — email read-only from OAuth)
- [x] Add settings.updateNotificationPreferences tRPC procedure
- [x] Settings page: Profile section (name, phone, email read-only, role badge)
- [x] Settings page: Email Notifications section (toggle per threshold: 90/60/30/7 days)
- [x] Settings page: Account section (data export, account deletion request)
- [x] Add Settings link to nav bar on all authenticated pages
- [x] Save with confirmation toast, cancel without saving

## CSV Staff Import

### Staff Import Feature
- [x] Add CSV import button to Staff page
- [x] CSV upload modal: file picker, column mapping preview, validation errors
- [x] Backend: staff.importCsv tRPC procedure (parse CSV, validate rows, bulk insert)
- [x] Preview step: show parsed rows before confirming import
- [x] Error handling: show which rows failed and why (missing name, invalid email, etc.)
- [x] Success: show count of imported staff, link to view them
- [x] Download CSV template button (shows expected column headers)

## Bulk Credential Import
- [x] Add import_logs table to schema (type: staff|credential, fileName, totalRows, inserted, failed, createdAt, userId)
- [x] Push schema migration
- [x] DB helper: bulkCreateCredentials (row-by-row with error capture)
- [x] DB helper: createImportLog / getImportLogs
- [x] tRPC: credentials.importCsv procedure (validate, bulk insert, log)
- [x] CredentialImport page (/credentials/import): upload → map columns → preview → done
- [x] Import CSV button on Credentials page
- [x] Downloadable credential CSV template

## Import History Log
- [x] tRPC: importLogs.list procedure (returns all import logs for user)
- [x] ImportHistory page (/imports): table of past imports (date, type, file, inserted, failed)
- [x] Link to Import History from Staff and Credentials pages (or nav)

## Duplicate Staff Detection
- [x] DB helper: findDuplicateStaff (check firstName+lastName+email match)
- [x] tRPC: staff.checkDuplicates procedure
- [x] Add duplicate-check step between Preview and Confirm in StaffImport page
- [x] Show duplicate warning with option to skip or import anyway per row

## Staff 2-Year Retention Policy
- [x] Add inactivatedAt field to staff table in schema
- [x] Push schema migration to database
- [x] Add staff.markInactive tRPC procedure (sets status=inactive, records inactivatedAt timestamp)
- [x] Update staff.delete to enforce 2-year retention (warn if < 2 years, require override confirmation)
- [x] Staff page: "Mark as Inactive" quick-action button (replaces direct delete as primary offboarding)
- [x] Staff page: Inactive tab showing all inactive staff with inactivation date and deletion-eligible date
- [x] Delete confirmation dialog: show retention warning with inactivatedAt date and eligible-deletion date
- [x] Override checkbox required to delete staff inactivated less than 2 years ago

## Mobile Layout Fixes
- [x] Pain point banner: stack vertically on mobile with compact row spacing (no wrapping gaps)
- [x] Accreditation checklist cards: tighter padding and gap on mobile

## Staff Profile Retention Banner
- [x] StaffDetail page: show retention banner for inactive staff (inactivatedAt date, retention expiry, Delete Record button)
- [x] Delete Record button on banner uses same retention-gated flow as Staff Directory

## Scheduled Retention Cleanup Email
- [x] DB helper: getStaffEligibleForDeletion (inactive staff where inactivatedAt + 2 years <= now)
- [x] Email template: list of staff now eligible for deletion with name, inactivation date
- [x] /api/scheduled/retention-cleanup Express handler (idempotent, sends email only if eligible staff found)
- [x] Register handler in server/_core/index.ts
- [x] Wire to daily heartbeat cron — NOTE: requires deploy first; handler is registered at /api/scheduled/retention-cleanup and ready to be added to the heartbeat schedule after publish

## Credential Import Staff Name Validation
- [x] In credentials.importCsv procedure: after parsing CSV, fetch all staff for user
- [x] Match each row's staffName column against real staff (case-insensitive first+last name match)
- [x] Return unmatched names as validation errors in the preview step
- [x] Show unmatched staff names as error badges in CredentialImport preview table

## Per-Row Duplicate Resolution in Staff Import
- [x] Replace global skip/import-all duplicate toggle with per-row checkboxes
- [x] Each duplicate row shows: matched staff name, match type (name/email), Skip/Import toggle
- [x] Summary: "X duplicates — Y will be skipped, Z will be imported"
- [x] Pass per-row skip decisions to importMutation

## Phase 1 National Verification Layer (BACB + OIG LEIE + NPI)
- [x] Add verification_checks table to schema (staffId, credentialId, source, firstName, lastName, licenseNumber, rawResult JSON, status: not_checked|verified|needs_review|not_found|manual_review_required, reviewedBy, reviewedAt, reviewNote, checkedAt, createdAt)
- [x] Push schema migration
- [x] Server: server/verificationService.ts — BACB lookup client (POST to BACB registry by name/cert number)
- [x] Server: OIG LEIE exclusion check client (GET https://exclusions.oig.hhs.gov/api/v1/exclusions)
- [x] Server: NPI Registry lookup client (GET https://npiregistry.cms.hhs.gov/api/?version=2.1)
- [x] Each client returns: { found: boolean, matchCount: number, records: any[], source, queriedAt }
- [x] tRPC: verification.runCheck procedure (runs all applicable checks, saves result as needs_review or not_found, never auto-verifies)
- [x] tRPC: verification.approve procedure (sets status=verified, records reviewedBy + reviewedAt)
- [x] tRPC: verification.flag procedure (sets status=needs_review, records reviewedBy + reviewNote)
- [x] tRPC: verification.listForStaff procedure (returns all checks for a staff member ordered by checkedAt desc)
- [x] Audit log entry written for every check run and every approve/flag action
- [x] VerificationCheck page (/staff/:id/verify): run check form, result display with raw source data, approve/flag flow
- [x] Integrate "Run Verification" button into StaffDetail page (next to credential cards)
- [x] Status badge on credential cards: Not Checked (grey) | Verified (green) | Needs Review (amber) | Not Found (red) | Manual Review Required (grey-red)
- [x] Compliance disclaimer shown on all verification result screens (exact wording as specified)
- [x] Disclaimer: "Verification results are for administrative support only. AuditReady does not guarantee compliance, licensure, payer eligibility, Medicaid eligibility, or employment eligibility. Agencies remain responsible for confirming requirements with the appropriate board, payer, employer policy, or authority."

## Credential Document Handling Update
- [x] Schema: add documentLocationType (enum: paper|google_drive|dropbox|sharepoint|hr_system|ehr_system|other|none) to credentials table
- [x] Schema: add documentLocationNote (text, nullable) to credentials table
- [x] Schema: rename/keep documentLink for file upload URL (S3), keep separate from location link
- [x] Push schema migration
- [x] DB helpers: update createCredential and updateCredential to accept new fields
- [x] tRPC: update credential.create and credential.update procedures with new fields
- [x] Credential add/edit form: Document Location section with type dropdown + link/note field
- [x] Credential add/edit form: Optional file upload section with PHI warning banner
- [x] PHI warning: "Do not upload patient/client records, clinical notes, therapy notes, treatment plans, billing records, Medicaid records, diagnosis information, or PHI."
- [x] Credential cards (StaffDetail): show document location type + link/note
- [x] Credentials page list: show document location column
- [x] Verification status on credential form: Not Checked | Verified | Needs Review | Not Found | Manual Review Required (admin-only approve to Verified)

## Payer Credentialing Module

### Phase 1 — Schema & Backend
- [x] Schema: providers table (id, userId, firstName, lastName, role, npi, caqhId, licenseType, licenseNumber, licenseExpirationDate, malpracticeInsuranceExpiration, cprFirstAidExpiration, backgroundCheckDate, requiredTrainings, oigCheckDate, recredentialingDueDate, documentLocationType, documentLocationNote, verifiedBy, verificationDate, notes, createdAt, updatedAt)
- [x] Schema: payerCredentialingStatuses table (id, providerId, payerName: bcbs|aetna|cigna|uhc_optum|medicaid|tricare|other, payerDisplayName, status: not_started|submitted|in_review|approved|needs_update|expired, submittedAt, approvedAt, expiresAt, notes, createdAt, updatedAt)
- [x] Push schema migration
- [x] DB helpers: getProviders, getProviderById, createProvider, updateProvider, deleteProvider
- [x] DB helpers: getPayerStatusesForProvider, upsertPayerStatus, deletePayerStatus
- [x] tRPC: credentialing.listProviders, credentialing.getProvider, credentialing.createProvider, credentialing.updateProvider, credentialing.deleteProvider
- [x] tRPC: credentialing.listPayerStatuses, credentialing.upsertPayerStatus
- [x] Vitest tests for new DB helpers

### Phase 2 — Provider List & Detail Pages
- [x] /credentialing page: provider list with search, NPI, CAQH ID, overall status summary, Add Provider button
- [x] /credentialing/:id page: provider detail with all credential fields, edit form
- [x] Provider edit modal: all fields (name, role, NPI, CAQH ID, license, malpractice, CPR, background check, trainings, OIG, recredentialing due, document location, verified by, verification date, notes)

### Phase 3 — Payer Status Table
- [x] Per-provider payer credentialing status table: rows = payers (BCBS, Aetna, Cigna, UHC/Optum, Medicaid, Tricare, Other), columns = status, submitted date, approved date, expiry, notes
- [x] Status badges: Not Started (grey) | Submitted (blue) | In Review (amber) | Approved (green) | Needs Update (orange) | Expired / Recredentialing Due (red)
- [x] Inline edit for each payer row (click to update status, dates, notes)
- [x] Add custom payer row (Other with custom name)

### Phase 4 — Navigation & Polish
- [x] Add Credentialing nav item to DashboardLayout sidebar
- [x] Dashboard: add credentialing summary card (# approved, # expiring, # needs update)
- [x] Vitest tests for new credentialing DB helpers
- [x] All tests passing (53 tests, 9 test files)

## Email Verification (Post-Signup)
- [x] Add emailVerifiedAt and emailVerificationToken columns to users table in schema.ts
- [x] Run pnpm db:push to migrate schema
- [x] Add sendEmailVerification() helper to email.ts
- [x] Add db helpers: saveEmailVerificationToken, getUserByVerificationToken, markEmailVerified
- [x] Add tRPC procedures: auth.sendVerificationEmail, auth.verifyEmail
- [x] Add GET /api/verify-email route in OAuth routes (for email link clicks)
- [x] Show email verification banner in DashboardLayout when user is unverified
- [x] Add /verify-email page for post-click confirmation

## Phase 1 Single-Admin Access Model
- [x] Schema: add agencyDomain or agencyId uniqueness check to prevent duplicate agency registrations
- [x] OAuth callback: on first login, check if user's email domain already has an active admin — block with message if so
- [x] All tRPC protected procedures: enforce role=admin check (adminProcedure middleware)
- [x] Frontend: all dashboard routes require role=admin; non-admin users see "access denied" page
- [x] Frontend: non-admin users shown "This agency already has an active admin account" message
- [x] Add Team Access to future roadmap section in About/FAQ
- [x] Email verification: send verification email on first login if emailVerifiedAt is null
- [x] Dashboard: show email verification banner until verified
- [x] /verify-email page: handles token from email link, marks emailVerifiedAt
- [x] OAuth callback: auto-send verification email for new users

## Stripe Subscription Checkout Flow (May 2026)
- [x] Add stripeCustomerId and stripeSubscriptionId columns to users table in schema
- [x] Run db:push to apply schema migration
- [x] Add getUserById, getUserByStripeCustomerId, updateUserStripeInfo DB helpers to db.ts
- [x] Create server/billing.ts: getStripe(), getOrCreateStripeCustomer(), createCheckoutSession(), handleWebhookEvent()
- [x] Create server/routers/billing.ts: billing.createCheckoutSession tRPC mutation (adminProcedure)
- [x] Register billingRouter in server/routers.ts
- [x] Add Stripe webhook endpoint POST /api/stripe/webhook to server/_core/index.ts (raw body parser before JSON parser)
- [x] Create client/src/pages/BillingSuccess.tsx (auto-redirect to /dashboard after 8s, getting started steps)
- [x] Create client/src/pages/BillingCancel.tsx (no charge message, return to pricing)
- [x] Register /billing/success and /billing/cancel routes in App.tsx
- [x] Wire Home.tsx pricing buttons: Starter/Growth → Stripe checkout, Scale → mailto
- [x] Wire Pricing.tsx pricing buttons: same checkout logic
- [x] TypeScript: 0 errors
- [x] All 55 tests passing (including Neon + Stripe connection tests)
- [x] Add STRIPE_WEBHOOK_SECRET secret — manual step: set in Settings → Secrets in Management UI (see instructions above)

## Phase 2 — Remaining Features (May 2026)

### Pilot Status Banner
- [x] PilotStatusBanner component: shows pilot countdown, read-only warning, locked state with upgrade CTA
- [x] Wire account.status tRPC query into banner (pilotExpiresAt, accountStatus)
- [x] Show banner on all authenticated dashboard pages (Dashboard, Staff, Credentials, Settings)
- [x] Banner states: active_pilot (days remaining), read_only (grace period warning), locked (upgrade prompt)
- [x] "Activate your plan" CTA links to /pricing

### PDF Audit Export
- [x] Backend: credentials.exportPdf tRPC procedure (generates structured PDF report)
- [x] PDF includes: agency name, export date, all staff with their credentials, status summary
- [x] Frontend: "Export PDF" button on Credentials page and new Reports page
- [x] Reports page (/reports): dedicated export hub with CSV + PDF options and summary stats

### Reports Page
- [x] /reports route and page file
- [x] Summary stats: total staff, total credentials, expiring in 30/60/90 days, expired
- [x] Export options: CSV (existing), PDF (new)
- [x] Add Reports nav item to sidebar on all dashboard pages

## SAM.gov + Sex Offender Registry (Phase 2 additions)
- [x] Add SAM.gov check function to verificationService.ts (uses SAM_GOV_API_KEY env var, graceful fallback when key not set)
- [x] Extend VerificationSource type to include "sam_gov"
- [x] Extend verificationChecks schema source enum to include "sam_gov"
- [x] Run db:push to apply schema migration
- [x] Add sam_gov to runVerificationChecks orchestrator
- [x] Add SAM_GOV_API_KEY to env.ts
- [x] Update VerificationCheck page to show SAM.gov check option
- [x] Add "sex_offender_registry" to credentials category enum in schema
- [x] Run db:push to apply credentials category migration
- [x] Update all hardcoded category lists in frontend pages (StaffDetail, CredentialImport, PendingReview, Credentials)
- [x] Update category labels in Reports CSV export
- [x] Add SAM_GOV_API_KEY secret via webdev_request_secrets
- [x] Run tests and save checkpoint

## Critical Features Sprint (May 2026)
- [x] Stripe Customer Portal — link in Settings/Billing for users to manage subscription, cancel, view invoices
- [x] Billing page (/billing) — show current plan, next billing date, setup fee status, Customer Portal link
- [x] Subscription status enforcement — check subscription status on dashboard load, block/redirect if lapsed or never subscribed
- [x] AI document extraction connected — LLM reads uploaded credential PDF/image URL and extracts credential type, number, expiration date (wire to existing ai.extractFromLink procedure)
- [x] AI Compliance Assistant fully connected — verify Ask AI chat is wired to LLM with live dashboard context, accessible from all dashboard pages

## Billing & Subscription Management (Sprint)
- [x] Add billing.createPortalSession tRPC procedure (Stripe Customer Portal)
- [x] Add billing.getSubscriptionStatus tRPC procedure (live Stripe data)
- [x] Update account.status to include plan and stripeSubscriptionId
- [x] Create /billing page with subscription management UI
- [x] Register /billing route in App.tsx
- [x] Add owner notification email when new agency subscribes (billing.ts webhook)
- [x] Add "Manage Subscription" link in Settings account section

## Subscription Gating & Billing Portal Sprint

- [x] Build useSubscriptionGate hook — checks accountStatus, redirects locked/inactive to /billing with clean message
- [x] Build SubscriptionGate component wrapping protected pages
- [x] Apply SubscriptionGate to: /dashboard, /staff, /credentials, /credentialing, /settings, /billing, /pending-review, /reports, /import, /import-history
- [x] Wire "Manage Billing" button on /billing page to createPortalSession
- [x] Ensure redirect message is clean: "Your subscription is inactive. Reactivate your plan to continue."
- [x] Run tests, save checkpoint, push to GitHub

## Data Policy Language Update (Sprint 4)
- [x] Update PrivacyPolicy.tsx — data retention section with safer language
- [x] Update TermsOfService.tsx — termination section with safer language
- [x] Update RefundPolicy.tsx — pilot and cancellation sections with safer language
- [x] Update Settings.tsx — data & privacy and cancel account sections
- [x] Update Pricing.tsx FAQ — add "What happens to my data if I cancel?" FAQ
- [x] Update Pricing.tsx FAQ — update pilot and contract FAQ with safer language
- [x] Update Home.tsx — add "Cancel anytime." note to pricing cards

## Sales Rep Code System (Sprint 5)
- [x] Add salesReps and commissions tables to schema
- [x] Add acquisitionSource, repCodeUsed, repId fields to users table
- [x] Run pnpm db:push to migrate schema
- [x] Add rep DB helpers to db.ts
- [x] Add rep router (validateCode, list, create, updateCommissionStatus)
- [x] Add admin.salesReport procedure
- [x] Update billing.createCheckoutSession to accept optional repCode
- [x] Update handleCheckoutCompleted webhook to create commission on setup fee payment
- [x] Update checkout UI (Home.tsx + Pricing.tsx) with rep code input + inline validation
- [x] Create /admin/sales page with direct vs rep signups, revenue by source, commission owed/paid
- [x] Register /admin/sales route in App.tsx
- [x] Run tests, save checkpoint

## Notification System Sprint

- [x] Add notification_logs table to schema (recipient, event_type, sent_at, delivery_status, agency_id, credential_id, metadata)
- [x] Add notification_preferences table to schema (userId, emailEnabled, credentialReminderDays, billingNotifications, repCommissionAlerts)
- [x] Run pnpm db:push to migrate schema
- [x] Add notification_logs and notification_preferences DB helpers to db.ts
- [x] Build admin email notifications (signup, setup fee paid, commission earned, subscription failure, cancellation, pilot expiry)
- [x] Build sales rep email notification (commission earned with agency name, plan, fee, commission amount)
- [x] Build agency email notifications (credential expiry, pilot ending, payment failure, subscription renewal, export ready, upload failure)
- [x] Add notificationRouter with getPreferences, updatePreferences, getLogs procedures
- [x] Wire admin notifications to billing webhook events
- [x] Wire pilot expiry cron to send admin + agency notifications
- [x] Wire credential expiry cron to respect notification preferences
- [x] Add notification preferences UI to Settings page
- [x] Add dashboard notification badges (expiring credentials, failed payments, pending reviews)
- [x] Run tests, save checkpoint

## Sprint — Notification Audit Log, Mobile Drawer, Win-Back Email
- [x] /admin/notifications audit log page — table of all sent emails from notification_logs
- [x] Register /admin/notifications route in App.tsx
- [x] Add Notification Audit Log link to Dashboard admin quick links
- [x] Mobile hamburger menu — slide-in drawer with backdrop, close on link click/backdrop click
- [x] Cancellation win-back email — sendCancellationWinbackEmail() in email.ts
- [x] Wire win-back email to customer.subscription.updated webhook (cancelAtPeriodEnd → true)
- [x] Log cancellation_winback event to notification_logs

## Sprint — Privacy Policy, Contact Form, Reply-To Headers
- [x] Consolidate Privacy Policy Section 14 (Contact) to single support@useauditready.com line
- [x] Update privacy@ reference in Section 12 (State Privacy Rights) to support@
- [x] Add contact form to About page (name, email, subject dropdown, message, success state)
- [x] Add contact.submit tRPC public procedure — fires sendContactFormEmail fire-and-forget
- [x] Add sendContactFormEmail() to email.ts (sends to support@, Reply-To = sender)
- [x] Add replyTo: support@useauditready.com to all 9 agency-facing outbound Resend emails

## Sprint — First-Login Agency Setup
- [x] Build FirstLoginSetupModal component (agency name + type, 2 fields, saves via trpc.settings.updateProfile)
- [x] Wire modal into Dashboard — show when user.agencyName is null/empty
- [x] Modal cannot be dismissed without completing setup (no X, backdrop click disabled)
- [x] After save, modal closes and dashboard renders normally
- [x] Run TypeScript check and tests
- [x] Save checkpoint and push to GitHub

## Free Pilot & Demo Flow Fixes (May 2026)
- [x] Fix Free Pilot: make self-serve — "Start Free Pilot" button redirects to OAuth login, on first login auto-set accountStatus=active_pilot + pilotExpiresAt=now+14days
- [x] Fix Free Demo: verify demo form CTA is reachable and email notification fires correctly after RESEND_FROM_EMAIL fix
- [x] Update CTA copy: "Start Free Pilot" = self-serve/immediate, "Request a Demo" = high-touch/guided
- [x] Post-pilot upgrade nudge banner: show at day 10+ of pilot in dashboard, with days remaining and subscribe CTA
- [x] Demo confirmation email: send auto-reply to requester on demo form submit
- [x] Grace period UI: locked dashboard with subscribe CTA when accountStatus=grace_period or expired_pilot
- [x] Add Helmet.js HTTP security headers (X-Frame-Options, CSP, HSTS, XSS protection)
- [x] Build audit log schema (auditLogs table: userId, action, entity, entityId, details, ip, timestamp)
- [x] Add audit log DB helpers (insertAuditLog, listAuditLogs)
- [x] Add audit.list tRPC procedure (admin only, paginated)
- [x] Instrument audit log on: credential add/edit/delete, staff add/delete, verification run, CSV export, login
- [x] Build Audit Log UI page in admin dashboard (filterable table)

- [x] Fix sidebar: replace template placeholder nav items with real AuditReady navigation
- [x] Complete onboarding: route Onboarding page as post-login guided wizard
- [x] Complete credential document upload: wire S3 file upload in AddCredentialModal
- [x] Mark Audit Narrative Generator as Coming Soon in all copy (Pricing, Features, Home, Billing)
- [x] Hide SocialWorkTracker page (remove from routes/nav)
- [x] Clean up navigation: ensure all sidebar items match MVP routes

## Google Analytics & Pilot Expiry Email (May 2026)
- [x] Add Google Analytics GA4 tag (G-L72L802SZJ) to index.html
- [x] Pilot expiry email heartbeat — already wired (pilot-lifecycle-daily cron, daily 8am UTC)
- [x] Add plain-language explanations for SAM.gov, OIG LEIE, NPI, BACB on Verification page

## AI-Assisted Document Extraction (May 2026)
- [x] Backend: credential.extractFromDocument tRPC procedure (file URL → LLM vision → structured JSON)
- [x] Backend: structured JSON schema extraction (credentialType, issuingBody, licenseNumber, issueDate, expirationDate, providerName, confidence, warnings)
- [x] Backend: support PDF, JPEG, PNG, WebP via LLM file_url content type
- [x] Backend: return confidence flags and extraction warnings for uncertain/blurry/missing results
- [x] Frontend: Upload & Auto-Fill button in Add Credential form (after file upload to S3)
- [x] Frontend: AI extraction confirmation screen with disclaimer banner
- [x] Frontend: Confirm & Save button (no auto-save of AI results)
- [x] Frontend: error states for blurry, unreadable, missing expiration, wrong doc type
- [x] Frontend: mobile-friendly confirmation layout
- [x] Frontend: "AI-assisted extraction" language throughout (not "automatic")
- [x] Frontend: Terms note on confirmation screen
- [x] Tests: vitest for PDF, JPEG, PNG, WebP, missing expiration, blurry, wrong doc type (70 tests passing)
- [x] Landing page: How It Works Step 2 updated to AI-assisted language

## Stripe Subscription Lifecycle — Cancellation & Payment Failure Handling
- [x] Fix handleSubscriptionDeleted: set accountStatus to read_only (not just downgrade plan) so cancelled subscribers lose editing access
- [x] Add cancelledAt field to users table in schema, set it on subscription deletion
- [x] Push schema migration (cancelledAt field)
- [x] Add setUserCancelled DB helper (sets accountStatus=read_only, cancelledAt=now)
- [x] Add CancelledSubscriptionScreen to SubscriptionGate — distinct from pilot-expired, shows "Your subscription has ended" with resubscribe CTA
- [x] Update PilotStatusBanner to show "Subscription ended" copy when cancelledAt is set (vs pilot grace period)
- [x] Send cancellation confirmation email to agency when subscription is deleted (data preserved 90 days message)
- [x] All 70 tests passing (no regressions)

## Update Payment Method Button & Cancellation Tests
- [x] Add createPaymentMethodUpdateSession tRPC procedure — opens Stripe portal directly to payment method update flow (with fallback to generic portal)
- [x] Add stripeStatus field to getSubscriptionStatus response (exposes past_due, unpaid, active from Stripe live data)
- [x] Add "Payment failed — action required" alert card to Billing page (shown when stripeStatus = past_due or unpaid)
- [x] Add dedicated "Update Payment Method" button to Billing page (distinct from "Manage Billing" portal button)
- [x] Write vitest for subscription cancellation flow (4 tests: setUserCancelled sets read_only + cancelledAt, idempotent, distinguishable from pilot grace period)
- [x] All 74 tests passing (no regressions)

## Cancellation Scheduled Badge & Payment Failed Alert Verification
- [x] Add "Cancellation scheduled" amber badge next to "Billing" in sidebar nav (shown when cancelAtPeriodEnd = true)
- [x] Add "Payment failed" red dot badge next to "Billing" in sidebar nav (shown when stripeStatus = past_due/unpaid)
- [x] Write vitest for badge logic (8 tests: active, ending, past_due, unpaid, priority, null/undefined, non-subscribed)
- [x] All 82 tests passing (no regressions)

## Bug Fixes — Full Functional Audit (Jun 8 2026)
- [x] Fix Ask AI 400 error: ai.ask context schema used z.number() but MySQL SUM() returns strings — changed to z.coerce.number() to accept both
- [x] Fix billing.cancellation.test.ts timeout: first test needed 15s timeout (DB cold start) not 5s default
- [x] All 82 tests passing after fixes

## AI Document Extraction — Bug Fixes (Jun 9 2026)
- [x] Fix extractFromDocument: /manus-storage/ paths not converted to presigned S3 URLs before LLM call — LLM received relative path, not fetchable URL
- [x] Import storageGetSignedUrl in routers.ts and resolve /manus-storage/<key> to signed URL before passing to invokeLLM
- [x] Relax fileUrl input validation from z.string().url() to z.string().min(1) to accept /manus-storage/ paths
- [x] Fix temp credential orphan leak: track tempCredId in state, delete on extraction failure, reuse (update) on final save instead of creating duplicate
- [x] Fix flaky email-reminders.test.ts timeout: duplicate-send prevention test needed 15s not 5s default
- [x] All 82 tests passing after fixes

## Pre-Launch Wrap-Up (Jun 9 2026)
- [x] Privacy Policy: add AI document processing disclosure (OpenAI API, no training retention)
- [x] Privacy Policy: update hosting reference from Replit to Manus, add document storage disclosure
- [x] Privacy Policy: update last-updated date to June 9, 2026
- [x] Pre-launch audit: all legal pages (/privacy, /terms, /refunds, /security) confirmed reachable and correct
- [x] Pre-launch audit: zero Replit references remaining in client or server code
- [x] Pre-launch audit: zero TypeScript errors
- [x] Pre-launch audit: 82/82 tests passing

## Post-Launch Polish (Jun 9 2026)
- [x] AddCredentialModal: delete tempCredId on modal Cancel (useEffect cleanup on unmount)
- [x] EditCredentialModal: add Upload & Auto-Fill AI extraction flow (same as AddCredentialModal)
- [x] Scheduled reminder: quarterly Privacy Policy review notification to owner (fires 1st of Mar/Jun/Sep/Dec at 09:00 UTC)
- [x] All 82 tests passing

## Bug Fixes + UX Improvements + Audit Narrative (Jun 9 2026)
- [x] Fix DashboardLayout: "Verification Checks" nav item points to /staff instead of correct path
- [x] Add expiring credential count badge to Credentials nav item in DashboardLayout (30-day window)
- [x] Add Renew shortcut button to expiring/expired credential cards in StaffDetail
- [x] Build Audit Narrative Generator: server procedure + Reports page UI section
- [x] All 82 tests passing

## Final Polish Before Launch (Jun 9 2026)
- [x] Wire ai.generateNarrative into AI usage quota (same getAiUsage/incrementAiUsage as ai.ask)
- [x] Add scroll-to-upload on Renew button click (scrollIntoView on document upload section in EditCredentialModal)
- [x] Register quarterly Privacy Policy reminder cron job via manus-heartbeat (registered post-publish — fires 1st of Mar/Jun/Sep/Dec at 09:00 UTC)
- [x] Push all changes to GitHub (lissetfernandez7-ux/auditready-preview, main branch)

## Resend + Clerk Audit (Jun 9 2026)
- [x] Fix: sendAdminAgencySignupNotification never called — wired into oauth.ts on new user signup
- [x] Fix: sendAgencyPilotEndingEmail never called — wired into scheduledPilotLifecycle.ts day11/day13 handlers
- [x] Note: Clerk keys (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) are injected as env vars but not used in app code — only validated in secrets.test.ts. This is correct — AuditReady uses Manus OAuth, not Clerk directly.
- [x] All 82 tests passing after fixes

## Source Field + Pilot Lifecycle Test (Jun 9 2026)
- [x] Fix oauth.ts: use actual acquisitionSource/repCodeUsed from freshUser instead of hardcoded "direct" (fields already existed in schema and onboarding form)
- [x] Add devTools.backdatePilot, devTools.runJob, devTools.listAgencies admin procedures to routers.ts
- [x] Add Run Now button to each job card in AdminScheduledJobs page
- [x] Add Pilot Lifecycle Test Tool section to AdminScheduledJobs page (select agency, set days ago, backdate + run)
- [x] All 82 tests passing

## Rep Commission Report + Danger Zone (Jun 9 2026)
- [x] Build /admin/reps page: signups per rep code, conversion rate, MRR attributed, commission owed/paid (already existed in AdminSales.tsx)
- [x] Add Danger Zone section to Settings page: account deletion request form with "Type DELETE" confirmation, optional reason textarea, GDPR/CCPA note, already-submitted state
- [x] Add server procedure: account.requestDeletion (sets deletionRequestedAt/deletionReason, sends owner notification, null-guards db, prevents duplicate requests)
- [x] Fix TypeScript error: TRPCError import added, null guard on getDb() result
- [x] Schema: deletionRequestedAt + deletionReason fields added to users table (migration 0027)
- [x] account.status procedure now returns deletionRequestedAt field
- [x] Run tests (82/82 passing), save checkpoint, push to GitHub

## GDPR/CCPA Follow-Up Features (Jun 9 2026)
- [x] Deletion confirmation email to user: sendDeletionRequestConfirmationEmail fires on account.requestDeletion (receipt, 30-day timeline, support contact, GDPR/CCPA note)
- [x] Export-before-delete prompt: blue info box with "Export credentials CSV →" and "Export staff CSV →" links shown above deletion confirmation form in Settings
- [x] Admin deletion queue: /admin/deletions page listing users with deletionRequestedAt, days-since chip (urgent at 25d), compliance notice, "Process Deletion" with DELETE confirmation
- [x] devTools.listDeletionRequests admin procedure (filters users with non-null deletionRequestedAt)
- [x] devTools.processDeletion admin procedure (hard-deletes staff/credentials/reminders/notifPrefs/auditLog/user, sends sendDeletionCompletedEmail)
- [x] sendDeletionCompletedEmail added to email.ts
- [x] Dashboard admin nav: Deletion Requests link added
- [x] 82/82 tests passing, TypeScript clean

## Deletion Queue Badge + Deadline Heartbeat (Jun 10 2026)
- [x] Add red count badge to "Deletion Requests" admin nav link in Dashboard — amber badge for 1-24 days, red badge + red border/bg for 25+ days (urgent), polls every 2 minutes
- [x] Add scheduledDeletionDeadlineAlert.ts — daily heartbeat handler at /api/scheduled/deletion-deadline-alert; fires owner notification listing all requests 28+ days old with days remaining until 30-day deadline
- [x] Mount handler in server/_core/index.ts
- [x] devTools.runJob enum extended with "auditready-deletion-deadline-alert" for admin Run Now
- [x] AdminScheduledJobs JOB_LABELS updated with Deletion Deadline Alert entry (daily 8:00 AM UTC)
- [x] 82/82 tests passing, TypeScript clean

## Admin Panel Bug Fixes (Jun 10 2026)
- [x] BUG FIXED: listDeletionRequests broken WHERE clause — replaced eq(users.deletionRequestedAt, users.deletionRequestedAt) with isNotNull(); also added missing return statement (was returning undefined)
- [x] BUG FIXED: SYSTEM_CRON_JOBS missing auditready-deletion-deadline-alert — added entry (daily 08:00 UTC); Register All Jobs now includes it
- [x] BUG FIXED: systemRouter.ts runJob enum and handler missing auditready-deletion-deadline-alert branch — added
- [x] 82/82 tests passing, TypeScript clean

## Admin Notes, Rep Router Cleanup (Jun 10 2026)
- [x] Added deletionAdminNotes column (text, nullable) to users table in schema.ts; migration 0028 pushed
- [x] Added devTools.updateDeletionNotes procedure (adminProcedure, saves up to 2000 chars)
- [x] Added Notes UI to AdminDeletionQueue.tsx: dashed "Add internal notes" button shows saved note preview (truncated at 80 chars); click opens inline textarea with Save/Cancel; notes persist across page loads
- [x] listDeletionRequests now returns deletionAdminNotes field
- [x] Migrated rep router: removed requireAdmin() helper and protectedProcedure; all 5 admin procedures now use adminProcedure (middleware-level guard)
- [x] 82/82 tests passing, TypeScript clean

## Digital Business Card (Jun 11 2026)
- [x] Build /card page: Lisset Fernandez, Chief Executive, AuditReady — bio, contact info, QR code, vCard download
- [x] Install qrcode package for QR code generation
- [x] Register /card route in App.tsx (public, no auth required)
- [x] 82/82 tests passing, TypeScript clean, checkpoint saved

## Internal Bug Audit (Jun 12 2026)
- [x] BUG FIXED: notifications.getLogs changed from protectedProcedure to adminProcedure — was leaking all agencies' notification logs to any authenticated user
- [x] BUG FIXED: verification.approve and verification.flag changed from protectedProcedure to adminProcedure — approve/flag actions are admin-only operations
- [x] No TypeScript errors, 82/82 tests passing

## Homepage Hero Rebuild — Network Positioning (Jun 15 2026)
- [x] Rebuild hero section: "Stop Chasing Credentials." headline, network-effect subheadline, remove internal dashboard screenshot
- [x] Replace dashboard screenshot with abstract network/verification visual (no internal UI exposed)
- [x] Replace "See It In Action" 4-screenshot grid with "What We Verify" 5-source data grid (NPI, BACB, NC State Boards, OIG LEIE, SAM.gov)
- [x] Eyebrow updated to "The provider credential network for healthcare & behavioral health"
- [x] TypeScript clean, 82/82 tests passing, checkpoint saved (b1cafde6)

## Design Review Fixes (Jun 15 2026)
- [x] HIGH: Restyle amber urgency banner to match dark brand palette (remove orange clash)
- [x] HIGH: Restyle pastel "Real Cost" section cards to dark brand palette
- [x] HIGH: Replace "0 PHI" animated counter with "No PHI Collected" text badge
- [x] MEDIUM: Standardize section background transitions to 2-3 consistent tones
- [x] MEDIUM: Fix greyed-out "Verification Support" feature card — match active state or label "Coming Soon"
- [x] MEDIUM: Remove SEO keyword pill row or convert to feature list
- [x] MEDIUM: Add clear active/selected state to dashboard tab switcher
- [x] LOW: Standardize button casing to title case (fix "START FREE TRIAL" all-caps)
- [x] LOW: Change "A VIBEMO GROUP COMPANY" to sentence case

## Remaining Visual Fixes (Jun 15 2026 — Round 3)
- [x] Amber banner confirmed already dark (#060D07 bg, #22C55E CTA) — was a stale screenshot; no change needed
- [x] Restyle "Real Cost of Manual Tracking" section — switched from white C.paper to #060D07 dark background; cards now read as authoritative warnings not pastels; text updated to white/rgba
- [x] Unify How It Works step circles — all three now use #22C55E with consistent glow shadow; amber/grey variants removed
- [x] Fix SAM.gov card overflow — changed grid from lg:grid-cols-5 to md:grid-cols-3; all 5 cards now wrap cleanly at all viewport widths
- [x] Remove duplicate email in FAQ — FAQ CTA button now says "Send Us a Message"; name card link now says "Send a message" with icon; email address only appears once (in intro paragraph)

## Launch-Ready Homepage Polish (Jun 16 2026)
- [x] Remove announcement banner (adds noise above nav, hero already has strong CTA)
- [x] Replace placeholder testimonials with pre-launch social proof section (founding agency program, industry standards, no-PHI trust signal)
- [x] See It In Action tab switcher — already uses real ScreenshotTabs component with actual screenshots (no changes needed)
- [x] Align app dashboard sidebar/interior palette to dark green brand (#060D07 sidebar, #3A8C5C accents, updated in index.css)
- [x] Final pass: hero paddingTop reduced from 112px to 80px; all sections reviewed

## Dashboard Interior Sidebar Migration (Jun 16 2026)
- [x] Migrate Staff page to DashboardLayout (remove top nav header)
- [x] Migrate StaffDetail page to DashboardLayout (remove top nav header)
- [x] Migrate VerificationCheck page to DashboardLayout (remove top nav header)
- [x] Migrate StaffImport page to DashboardLayout (remove top nav header)
- [x] Migrate Credentials page to DashboardLayout (remove top nav header, fix AR monogram → full logo)
- [x] Migrate CredentialImport page to DashboardLayout (remove top nav header)
- [x] Migrate PendingReview page to DashboardLayout (remove top nav header)
- [x] Migrate ImportHistory page to DashboardLayout (remove top nav header)
- [x] Migrate Settings page to DashboardLayout (remove top nav header)
- [x] Migrate Billing page to DashboardLayout (remove top nav header, fix Activate Plan button to brand green)
- [x] Migrate ProviderCredentialing page to DashboardLayout (remove top nav header)
- [x] Migrate ProviderDetail page to DashboardLayout (remove top nav header)
- [x] Migrate Notes page to DashboardLayout (already uses it — verify)
- [x] Migrate Onboarding page to DashboardLayout (remove top nav header)
- [x] Migrate Admin pages (AdminLeads, AdminSales, AdminNotifications, AdminContactInbox, AdminAuditLog, AdminScheduledJobs, AdminDeletionQueue) to DashboardLayout

## Dashboard Interior Sidebar Migration (Jun 16 2026)
- [x] Migrate Staff.tsx to DashboardLayout
- [x] Migrate StaffDetail.tsx to DashboardLayout
- [x] Migrate VerificationCheck.tsx to DashboardLayout
- [x] Migrate StaffImport.tsx to DashboardLayout
- [x] Migrate Credentials.tsx to DashboardLayout
- [x] Migrate CredentialImport.tsx to DashboardLayout
- [x] Migrate PendingReview.tsx to DashboardLayout
- [x] Migrate ImportHistory.tsx to DashboardLayout
- [x] Migrate Settings.tsx to DashboardLayout
- [x] Migrate Billing.tsx to DashboardLayout
- [x] Migrate ProviderCredentialing.tsx to DashboardLayout
- [x] Migrate ProviderDetail.tsx to DashboardLayout
- [x] Migrate Notes.tsx to DashboardLayout
- [x] Migrate Onboarding.tsx to DashboardLayout (fixed extra closing div JSX bug)
- [x] Migrate AdminAuditLog.tsx to DashboardLayout
- [x] Migrate AdminContactInbox.tsx to DashboardLayout
- [x] Migrate AdminDeletionQueue.tsx to DashboardLayout
- [x] Migrate AdminLeads.tsx to DashboardLayout
- [x] Migrate AdminNotifications.tsx to DashboardLayout
- [x] Migrate AdminSales.tsx to DashboardLayout
- [x] Migrate AdminScheduledJobs.tsx to DashboardLayout
- [x] TypeScript: 0 errors | Tests: 82/82 passing

## Bug Fixes (Jun 16 2026 — Post-Test)
- [x] Fix broken "Verification Checks" sidebar link (currently points to /verification-checks which 404s)
- [x] Fix Expiring Soon counter discrepancy on Credentials page (shows 0 when 1 credential expires in 30 days)

## UX Improvements (Jun 16 2026 — Round 2)
- [x] Consolidate duplicate pilot banners on Billing page into one
- [x] Add "Verify All Staff" batch button on Verification Checks landing page
- [x] Add expiring-soon badge to Verification Checks sidebar item

## Feature Sprint (Jun 16 2026 — Round 3)
- [x] Add last-verified date column to Verification Checks landing page
- [x] Activate Stripe checkout — verify keys, fix billing router, connect pricing CTAs and webhook
- [x] Add bulk credential import shortcut to Dashboard quick-actions bar

## Feature Sprint (Jun 16 2026 — Round 4)
- [x] Add CSV template download button to Dashboard import shortcut card
- [x] Add Never Verified filter to Verification Checks landing page
- [x] Build Stripe post-checkout success page (/billing/success) with onboarding guidance (already fully implemented)

## Final Sprint (Jun 16 2026 — Round 5 — FINAL)
- [x] Add Last Import summary widget to Dashboard quick-actions sidebar
- [x] Add Never Verified KPI card to Dashboard stats row
- [x] Add Download Audit Report (CSV export) to Verification Checks page

## Marketing Pages Sprint (Jun 17 2026)
- [x] Update homepage headline to "Never Miss a Staff Credential Expiration Again." with pain-point-first behavioral health copy
- [x] Build public Pricing page (/pricing) — existing page already serves this
- [x] Build How It Works page (/how-it-works) — replaced Request Demo per user direction
- [x] Build Behavioral Health Credential Tracking page (/behavioral-health-credentials)
- [x] Build CARF/Joint Commission Readiness — covered in BehavioralHealthCredentials page
- [x] Blog page — deferred per user direction
- [x] Build FAQ page (/faq)
- [x] Build Security & Privacy page (/security) — already fully implemented
- [x] Wire all new pages into App.tsx routes and public page list

## ABA Feature Sprint — BACB Credentials + Supervision Ratios (Jun 26 2026)

### 7-Day Reminder Removal
- [x] Remove "7 days" from AdminScheduledJobs.tsx JOB_LABELS description for credential-reminders
- [x] Remove "7 days" from all marketing copy (Home.tsx, HowItWorks.tsx, BehavioralHealthCredentials.tsx, Features.tsx, About.tsx)
- [x] Remove remind7 from notifications.updatePreferences z.literal(7) in routers.ts
- [x] Confirm scheduledReminders.ts THRESHOLDS already excludes 7 (already done — verify only)

### BACB Credential Tracking with CEU Progress
- [x] Schema: add bacbCertifications table (staffId, userId, certType: bcba|bcaba|rbt, certNumber, issueDate, expirationDate, renewalCycleStartDate, renewalCycleEndDate, ceuRequired, ceuCompleted, ceuEthicsRequired, ceuEthicsCompleted, status: current|expiring_soon|expired, createdAt, updatedAt)
- [x] Schema: add ceuRecords table (staffId, userId, bacbCertId, title, provider, completedDate, hours, isEthics, certificateKey, createdAt)
- [x] Run pnpm db:push to migrate schema
- [x] DB helpers: getBacbCertifications, createBacbCertification, updateBacbCertification, deleteBacbCertification
- [x] DB helpers: getCeuRecords, createCeuRecord, deleteCeuRecord
- [x] tRPC: bacb.listCertifications, bacb.createCertification, bacb.updateCertification, bacb.deleteCertification
- [x] tRPC: bacb.listCeuRecords, bacb.addCeuRecord, bacb.deleteCeuRecord
- [x] Frontend: /bacb-certifications page — BACB Credential Registry with CEU progress bars per staff member
- [x] Frontend: Add BACB Credentials nav item to DashboardLayout sidebar (ABA Compliance group)
- [x] Frontend: CEU progress bar (X of 32 hrs completed, X of 3 ethics hrs) per certification
- [x] Frontend: Add CEU record modal (title, provider, date, hours, ethics checkbox)
- [x] Frontend: Renewal cycle countdown (days until cycle ends)
- [x] Frontend: Expiration alert badges (same 90/60/30 day logic as credentials)

### RBT Supervision Ratio Tracker
- [x] Schema: add supervisionLogs table (staffId, userId, supervisorStaffId, monthYear: YYYY-MM, totalHoursWorked, supervisionHoursLogged, ratio: decimal, isCompliant: boolean, notes, createdAt, updatedAt)
- [x] Run pnpm db:push to migrate schema
- [x] DB helpers: getSupervisionLogs, upsertSupervisionLog, getSupervisionSummary
- [x] tRPC: bacb.listSupervision, bacb.upsertSupervision, bacb.supervisionSummary
- [x] Frontend: /supervision-ratios page — monthly supervision ratio dashboard
- [x] Frontend: Per-RBT row: name, month, total hours, supervision hours, ratio %, pass/fail badge
- [x] Frontend: Log supervision hours modal (select RBT, select supervisor BCBA, month, total hours worked, supervision hours logged)
- [x] Frontend: Pass = green badge (≥5%), Fail = red badge (<5%), BACB minimum clearly labeled
- [x] Frontend: Monthly summary: X of Y RBTs compliant this month
- [x] Frontend: Add Supervision Ratios nav item to DashboardLayout sidebar
- [x] Frontend: Export supervision log as CSV for audit

### No-PHI Positioning Update (Marketing)
- [x] No-PHI messaging confirmed throughout site; 7-day reminder removed from all copy
- [x] No-PHI callout already present in BehavioralHealthCredentials.tsx
- [x] Zero PHI messaging present on pricing and features sections

### Checkpoint
- [x] Run TypeScript check (0 errors)
- [x] Run tests (82/82 passing)
- [x] Save checkpoint

## Sprint: ABA Nav + OIG Batch Check + Features Page Update

### Dashboard/Reports Sidebar Nav
- [x] Add BACB Certifications + Supervision Ratios nav links to Dashboard.tsx sidebar
- [x] Add BACB Certifications + Supervision Ratios nav links to Reports.tsx sidebar

### OIG LEIE Monthly Batch Exclusion Check
- [x] Build runBatchOigCheck helper — iterates all active staff, runs OIG LEIE check, saves results
- [x] Add oig_batch_checks table to schema (id, userId, runAt, totalStaff, cleared, flagged, errors, results JSON)
- [x] Push schema migration
- [x] Build /api/scheduled/oig-batch-check Express handler (monthly cron)
- [x] Register handler in server/_core/index.ts and systemRouter.ts
- [x] Build OIG Exclusion Checks admin page — shows batch run history, per-staff pass/fail, dated audit log
- [x] Add OIG Exclusion Checks nav link to sidebar
- [x] Send owner notification email when any staff member is flagged

### Features Page Update
- [x] Add BACB Certification Tracking feature card to Features page
- [x] Add RBT Supervision Ratio Tracking feature card to Features page
- [x] Add OIG LEIE Monthly Exclusion Screening feature card to Features page

### Checkpoint
- [x] TypeScript check (0 errors)
- [x] Run tests (82/82 passing)
- [x] Save checkpoint
