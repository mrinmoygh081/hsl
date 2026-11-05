-- =====================================================================================
-- SDBG / BG module - DB schema sync with current backend + frontend code
-- Ref: OVMS To-Be Document v3.0, section 6.2 (BG Submission & Processing), 6.22.2
--
-- Single self-contained, idempotent script (safe to run more than once, on LAN or NIC DB).
-- It supersedes bg_requirement_v2.sql + bg_requirement_v3.sql (both are included below),
-- plus column type/size fixes found by comparing the code against the hsl-ovms dump
-- of 30/10/2026 (in which neither v2 nor v3 had been applied).
--
-- Requires: PostgreSQL 13+ (gen_random_uuid) and function public.update_sync_fields().
-- Run:      psql -h <host> -U <user> -d <db> -v ON_ERROR_STOP=1 -f sdbg_db_sync_v4.sql
-- =====================================================================================

BEGIN;

-- -------------------------------------------------------------------------------------
-- 1. sdbg_entry / sdbg_save : new BG entry fields (6.2.1 / 6.2.2)
--    Banker Email Id, Currency, Mode of BG (PHYSICAL | E-BG | HYBRID | DD)
-- -------------------------------------------------------------------------------------
ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS bank_email varchar(255);
ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS currency   varchar(5);
ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS bg_mode    varchar(20);

ALTER TABLE sdbg_save  ADD COLUMN IF NOT EXISTS bank_email varchar(255);
ALTER TABLE sdbg_save  ADD COLUMN IF NOT EXISTS currency   varchar(5);
ALTER TABLE sdbg_save  ADD COLUMN IF NOT EXISTS bg_mode    varchar(20);

-- -------------------------------------------------------------------------------------
-- 2. Type / length fixes (the code writes values the old columns cannot hold)
-- -------------------------------------------------------------------------------------
-- DO "Save" stores the BG amount with decimals; bigint rejects e.g. 125000.50.
-- Both tables get the same precision (entry was numeric(13,3)).
ALTER TABLE sdbg_save  ALTER COLUMN bg_ammount TYPE numeric(15,3) USING bg_ammount::numeric;
ALTER TABLE sdbg_entry ALTER COLUMN bg_ammount TYPE numeric(15,3);

-- Banker Email Id is validated up to 255 chars. Some servers already had bank_email as
-- varchar(150), which ADD COLUMN IF NOT EXISTS leaves untouched, so force the size here.
ALTER TABLE sdbg_entry ALTER COLUMN bank_email TYPE varchar(255);
ALTER TABLE sdbg_save  ALTER COLUMN bank_email TYPE varchar(255);

-- sdbg.bg_no gets the vendor BG No. (validated up to 100 chars; sdbg_entry.bg_no is 255). Was varchar(20).
ALTER TABLE sdbg ALTER COLUMN bg_no TYPE varchar(255);

-- sdbg_extension.file_no gets the BG Tracking No. (bg_file_no = "BGT" + timestamp + vendor, ~24 chars). Was varchar(10).
ALTER TABLE sdbg_extension ALTER COLUMN file_no TYPE varchar(60);

-- -------------------------------------------------------------------------------------
-- 3. sdbg_extension : Extension vs Release request + revised BG document (6.2.4 / 6.2.5)
-- -------------------------------------------------------------------------------------
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS action_type  varchar(20);   -- EXTENSION | RELEASE
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS bg_filename  text;
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS bg_file_path text;

-- sdbg_extension is synced LAN <-> NIC but had no sync trigger, so DO / Finance
-- updates on an extension request were never flagged for sync.
DROP TRIGGER IF EXISTS before_update_trigger ON sdbg_extension;
CREATE TRIGGER before_update_trigger BEFORE UPDATE ON sdbg_extension FOR EACH ROW EXECUTE FUNCTION update_sync_fields();

-- -------------------------------------------------------------------------------------
-- 4. po_bg_terms : per-PO BG terms, warranty and PO closure (SAP PO replication)
--    Drives the "BG Value to be in line with PO terms" warning
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS po_bg_terms (
  purchasing_doc_no varchar(20) PRIMARY KEY,
  bg_percentage numeric(7,3),
  bg_amount numeric(15,3),
  bg_basis varchar(30),                  -- PO_VALUE | RUNNING_INVOICE | BPO
  currency varchar(5),
  bg_submission_date bigint,
  warranty_expiry_date bigint,
  po_closed boolean DEFAULT false NOT NULL,
  po_closed_date bigint,
  sd_percentage numeric(7,3),
  sd_amount numeric(15,3),
  created_at bigint,
  last_changed_at bigint,
  sync_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  sync boolean DEFAULT false NOT NULL,
  sync_updated_at timestamp with time zone DEFAULT now() NOT NULL
);
DROP TRIGGER IF EXISTS before_update_trigger ON po_bg_terms;
CREATE TRIGGER before_update_trigger BEFORE UPDATE ON po_bg_terms FOR EACH ROW EXECUTE FUNCTION update_sync_fields();

-- -------------------------------------------------------------------------------------
-- 5. holiday_calendar : maintained by HR, used for working-day BG expiry alerts (45/30/15)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holiday_calendar (
  id serial PRIMARY KEY,
  holiday_date date NOT NULL UNIQUE,
  description varchar(255),
  is_active boolean DEFAULT true NOT NULL,  -- soft delete, so removals reach the other server via sync
  created_by varchar(20),
  created_at bigint,
  last_changed_at bigint,
  sync_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  sync boolean DEFAULT false NOT NULL,
  sync_updated_at timestamp with time zone DEFAULT now() NOT NULL
);
DROP TRIGGER IF EXISTS before_update_trigger ON holiday_calendar;
CREATE TRIGGER before_update_trigger BEFORE UPDATE ON holiday_calendar FOR EACH ROW EXECUTE FUNCTION update_sync_fields();

-- -------------------------------------------------------------------------------------
-- 6. BG Retention Release claim through the BTN flow (6.22.2)
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS btn_bg_retention (
  btn_num varchar(30) PRIMARY KEY,
  purchasing_doc_no varchar(20) NOT NULL,   -- primary PO (first line)
  vendor_code varchar(20) NOT NULL,
  net_claim_amount numeric(15,3) NOT NULL,
  warranty_cert_filename text,
  warranty_cert_file_path text,
  wcc_filename text,
  wcc_file_path text,
  no_due_cert_filename text,
  no_due_cert_file_path text,
  other_doc_filename text,
  other_doc_file_path text,
  remarks text,
  status varchar(40) NOT NULL,
  do_remarks text,
  do_action_by varchar(20),
  do_action_at bigint,
  fi_remarks text,
  fi_action_by varchar(20),
  fi_action_at bigint,
  misc_recovery_applicable boolean DEFAULT false NOT NULL,
  misc_recovery_amount numeric(15,3),
  misc_recovery_remarks text,
  net_payable_amount numeric(15,3),
  btn_type varchar(40) NOT NULL,
  created_at bigint NOT NULL,
  created_by_id varchar(20) NOT NULL,
  sync_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  sync boolean DEFAULT false NOT NULL,
  sync_updated_at timestamp with time zone DEFAULT now() NOT NULL
);
DROP TRIGGER IF EXISTS before_update_trigger ON btn_bg_retention;
CREATE TRIGGER before_update_trigger BEFORE UPDATE ON btn_bg_retention FOR EACH ROW EXECUTE FUNCTION update_sync_fields();

CREATE TABLE IF NOT EXISTS btn_bg_retention_line (
  id serial PRIMARY KEY,
  btn_num varchar(30) NOT NULL,
  purchasing_doc_no varchar(20) NOT NULL,
  sdbg_reference_no varchar(30),
  bg_no varchar(255),
  claim_amount numeric(15,3) NOT NULL,
  fi_status varchar(20),                  -- APPROVED | REJECTED (line-level Finance decision)
  approved_amount numeric(15,3),
  fi_remarks text,
  created_at bigint NOT NULL,
  sync_id uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  sync boolean DEFAULT false NOT NULL,
  sync_updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS btn_bg_retention_line_btn_num_idx ON btn_bg_retention_line (btn_num);
DROP TRIGGER IF EXISTS before_update_trigger ON btn_bg_retention_line;
CREATE TRIGGER before_update_trigger BEFORE UPDATE ON btn_bg_retention_line FOR EACH ROW EXECUTE FUNCTION update_sync_fields();

-- -------------------------------------------------------------------------------------
-- 7. Email events / bodies (6.2.2 - 6.2.5)
-- -------------------------------------------------------------------------------------

-- Bank confirmation email on Finance approval of a BG
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_APPROVED_BANK_CONFIRM', 'bank', '{{bank}}', 'BG_APPROVED_BANK_CONFIRM'
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = 'BG_APPROVED_BANK_CONFIRM' AND u_type = 'bank');

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_APPROVED_BANK_CONFIRM',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{reference_no}}</b>, Bank Guarantee No. <b>{{bg_no}}</b>. This is to confirm that the referred Bank Guarantee has been accepted/received by HSL Finance Department. BG Tracking No: <b>{{bg_file_no}}</b>. This is a system generated confirmation; no action is required from your end.',
  'INFO: BG No. {{bg_no}} has been Accepted by HSL Finance'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_APPROVED_BANK_CONFIRM');

-- Staged expiry reminders (45/30/15 working days) to DO, Finance Officer, Vendor
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT * FROM (VALUES
  ('BG_EXPIRY_REMINDER', 'do', '{{do}}', 'BG_EXPIRY_REMINDER'),
  ('BG_EXPIRY_REMINDER', 'vendor', '{{vendor}}', 'BG_EXPIRY_REMINDER'),
  ('BG_EXPIRY_REMINDER', 'finance_officer', '{{finance_officer}}', 'BG_EXPIRY_REMINDER')
) AS v(event_name, u_type, u_email, email_body_name)
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = v.event_name AND u_type = v.u_type);

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXPIRY_REMINDER',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{ref_no}}</b>, Ref. File No. {{file_no}}. The mentioned BG is expiring on <b>{{expire_date}}</b> ({{days_left}} day(s) from today). This is for your information and necessary action please.',
  'INFO: BG No. {{ref_no}} Expiring on {{expire_date}} ({{days_left}} days left)'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXPIRY_REMINDER');

-- BG Extension / Release confirmation to bank
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_EXTENSION_RELEASE_BANK', 'bank', '{{bank}}', 'BG_EXTENSION_RELEASE_BANK'
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = 'BG_EXTENSION_RELEASE_BANK' AND u_type = 'bank');

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXTENSION_RELEASE_BANK',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{sdbg_reference_no}}</b>. This is to confirm that the {{action_type}} request for the referred Bank Guarantee has been <b>{{status}}</b>. This is a system generated confirmation; no action is required from your end.',
  'INFO: BG {{action_type}} request has been {{status}}'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXTENSION_RELEASE_BANK');

-- Notify the Dealing Officer when a vendor submits a new Extension / Release request
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_EXTENSION_SUBMITTED', 'do', '{{do}}', 'BG_EXTENSION_SUBMITTED'
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = 'BG_EXTENSION_SUBMITTED' AND u_type = 'do');

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXTENSION_SUBMITTED',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{sdbg_reference_no}}</b>. A new {{action_type}} request has been submitted by the vendor for the referred Bank Guarantee. Please login to OVMS portal to review and forward it to Finance.',
  'INFO: New BG {{action_type}} request submitted for Ref. BG No. {{sdbg_reference_no}}'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXTENSION_SUBMITTED');

-- -------------------------------------------------------------------------------------
-- 8. Email recipients clean-up (drop inherited GRSE mailboxes, route per To-Be flow)
-- -------------------------------------------------------------------------------------

-- Expiry alerts go to the Finance Officer who accepted the BG (resolved at runtime)
UPDATE email_send_info SET u_email = '{{finance_officer}}'
WHERE event_name = 'BG_EXPIRY_REMINDER' AND u_type = 'finance_officer';

-- DO forwarded a BG: notify the Finance nodal point
UPDATE email_send_info SET u_type = 'finance_nodal', u_email = '{{finance_nodal}}'
WHERE event_name = 'BG_ENTRY_BY_DO';
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_ENTRY_BY_DO', 'finance_nodal', '{{finance_nodal}}', 'BG_ENTRY_BY_DO'
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = 'BG_ENTRY_BY_DO');

-- Vendor uploaded a BG: Dealing Officer only (Finance is involved after DO review)
UPDATE email_send_info SET u_type = 'do', u_email = '{{do}}'
WHERE event_name = 'BG_UPLOAD_BY_VENDOR';

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_ENTRY_BY_DO',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{reference_no}}</b>, Bank Guarantee No. <b>{{bg_no}}</b>. The referred Bank Guarantee has been reviewed by the Dealing Officer and forwarded to Finance. Please login to OVMS portal to assign it to a Finance Officer.',
  'ACTION: BG No. {{bg_no}} forwarded to Finance'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_ENTRY_BY_DO');

-- Bank confirmation: copy to vendor, Dealing Officer and Finance Officer
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT * FROM (VALUES
  ('BG_APPROVED_BANK_CONFIRM', 'vendor', '{{vendor}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_APPROVED_BANK_CONFIRM', 'do', '{{do}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_APPROVED_BANK_CONFIRM', 'finance_officer', '{{finance_officer}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_EXTENSION_RELEASE_BANK', 'vendor', '{{vendor}}', 'BG_EXTENSION_RELEASE_BANK'),
  ('BG_EXTENSION_RELEASE_BANK', 'do', '{{do}}', 'BG_EXTENSION_RELEASE_BANK'),
  ('BG_EXTENSION_RELEASE_BANK', 'finance_officer', '{{finance_officer}}', 'BG_EXTENSION_RELEASE_BANK')
) AS v(event_name, u_type, u_email, email_body_name)
WHERE NOT EXISTS (SELECT 1 FROM email_send_info WHERE event_name = v.event_name AND u_type = v.u_type);

-- -------------------------------------------------------------------------------------
-- 9. Email data fixes found on hsl-ovms (05/11/2026)
-- -------------------------------------------------------------------------------------

-- BG recipient rows that were inserted with u_email = 'NULL' (text) / NULL / '' send to no one:
-- mail.services resolves u_email as a {{u_type}} placeholder. Point them at their placeholder.
-- Rows holding a real address (e.g. a test mailbox for the bank) are left as they are.
UPDATE email_send_info
SET    u_email = '{{' || u_type || '}}'
WHERE  event_name LIKE 'BG%'
  AND  u_type IS NOT NULL AND u_type <> ''
  AND  (u_email IS NULL OR TRIM(u_email) IN ('', 'NULL', 'null'));

-- Identical duplicate BG email bodies: the mail lookup LEFT JOINs email_body by name,
-- so each duplicate sends the same email again. Keep the lowest id.
DELETE FROM email_body b
USING  email_body keep
WHERE  b.email_body_name LIKE 'BG%'
  AND  keep.email_body_name = b.email_body_name
  AND  keep.email_body = b.email_body
  AND  COALESCE(keep.email_subject, '') = COALESCE(b.email_subject, '')
  AND  keep.id < b.id;

COMMIT;
