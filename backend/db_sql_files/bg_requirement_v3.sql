-- BG module update per To-Be Document v3.0, sections 6.2.1 - 6.2.6, 6.22.2
-- 1. Currency + Mode of BG on BG entry (6.2.1 / 6.2.2)
-- 2. po_bg_terms: per-PO BG terms, warranty and PO closure (filled by SAP PO replication)
-- 3. holiday_calendar: uploaded by HR, used for working-day BG expiry alerts (6.2.4)
-- 4. BG Retention Release claim through BTN flow (6.22.2)
-- 5. Email config: Finance Officer recipients, GRSE address clean-up
-- NOTE: run bg_requirement_v2.sql first (it is not yet applied on hsl-ovms as of 29/10/2026).

ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS currency varchar(5);
ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS bg_mode varchar(20);
ALTER TABLE sdbg_save ADD COLUMN IF NOT EXISTS currency varchar(5);
ALTER TABLE sdbg_save ADD COLUMN IF NOT EXISTS bg_mode varchar(20);

-- Per-PO BG terms replicated from SAP (PO header / Customer Data tab)
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

-- Holiday calendar maintained by HR
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

-- BG Retention Release claim (header)
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

-- BG Retention Release claim lines: one per PO / BG claimed
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

-- Expiry alerts go to the Finance Officer who accepted the BG (resolved at runtime), not hardcoded GRSE mailboxes
UPDATE email_send_info SET u_email = '{{finance_officer}}'
WHERE event_name = 'BG_EXPIRY_REMINDER' AND u_type = 'finance_officer';


-- DO forwarded a BG: notify the Finance nodal point (drop inherited GRSE mailboxes)
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

-- Bank confirmation: copy to vendor, Dealing Officer and Finance Officer (6.2.3)
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT * FROM (VALUES
  ('BG_APPROVED_BANK_CONFIRM', 'vendor', '{{vendor}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_APPROVED_BANK_CONFIRM', 'do', '{{do}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_APPROVED_BANK_CONFIRM', 'finance_officer', '{{finance_officer}}', 'BG_APPROVED_BANK_CONFIRM'),
  ('BG_EXTENSION_RELEASE_BANK', 'vendor', '{{vendor}}', 'BG_EXTENSION_RELEASE_BANK'),
  ('BG_EXTENSION_RELEASE_BANK', 'do', '{{do}}', 'BG_EXTENSION_RELEASE_BANK'),
  ('BG_EXTENSION_RELEASE_BANK', 'finance_officer', '{{finance_officer}}', 'BG_EXTENSION_RELEASE_BANK')
) AS v(event_name, u_type, u_email, email_body_name)
WHERE NOT EXISTS (
  SELECT 1 FROM email_send_info WHERE event_name = v.event_name AND u_type = v.u_type
);
