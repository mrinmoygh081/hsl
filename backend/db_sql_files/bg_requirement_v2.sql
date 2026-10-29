-- BG module update per To-Be Document v2.0, section 6.2
-- 1. Banker's Email Id field (6.2.1)
-- 2. action_type on sdbg_extension to support EXTENSION vs RELEASE (6.2.4 / 6.2.5)
-- 3. Email config for: bank confirmation on Finance approval (6.2.2),
--    45/30/15-day expiry reminders to DO + Finance + Vendor (6.2.3),
--    extension/release confirmation (6.2.4 / 6.2.5)

ALTER TABLE sdbg_entry ADD COLUMN IF NOT EXISTS bank_email varchar(255);
ALTER TABLE sdbg_save ADD COLUMN IF NOT EXISTS bank_email varchar(255);
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS action_type varchar(20);
-- Revised BG document uploaded by the vendor for an EXTENSION request (6.2.4)
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS bg_filename text;
ALTER TABLE sdbg_extension ADD COLUMN IF NOT EXISTS bg_file_path text;

-- Bank confirmation email on Finance approval of a BG (vendor + DO already covered by BG_RECEIVED)
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_APPROVED_BANK_CONFIRM', 'bank', '{{bank}}', 'BG_APPROVED_BANK_CONFIRM'
WHERE NOT EXISTS (
  SELECT 1 FROM email_send_info WHERE event_name = 'BG_APPROVED_BANK_CONFIRM' AND u_type = 'bank'
);

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_APPROVED_BANK_CONFIRM',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{reference_no}}</b>, Bank Guarantee No. <b>{{bg_no}}</b>. This is to confirm that the referred Bank Guarantee has been accepted/received by HSL Finance Department. BG Tracking No: <b>{{bg_file_no}}</b>. This is a system generated confirmation; no action is required from your end.',
  'INFO: BG No. {{bg_no}} has been Accepted by HSL Finance'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_APPROVED_BANK_CONFIRM');

-- Staged expiry reminders at 45/30/15 days to DO, Finance, Vendor
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT * FROM (VALUES
  ('BG_EXPIRY_REMINDER', 'do', '{{do}}', 'BG_EXPIRY_REMINDER'),
  ('BG_EXPIRY_REMINDER', 'vendor', '{{vendor}}', 'BG_EXPIRY_REMINDER'),
  ('BG_EXPIRY_REMINDER', 'finance_officer', '{{finance_officer}}', 'BG_EXPIRY_REMINDER')
) AS v(event_name, u_type, u_email, email_body_name)
WHERE NOT EXISTS (
  SELECT 1 FROM email_send_info WHERE event_name = v.event_name AND u_type = v.u_type
);

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXPIRY_REMINDER',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{ref_no}}</b>, Ref. File No. {{file_no}}. The mentioned BG is expiring on <b>{{expire_date}}</b> ({{days_left}} day(s) from today). This is for your information and necessary action please.',
  'INFO: BG No. {{ref_no}} Expiring on {{expire_date}} ({{days_left}} days left)'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXPIRY_REMINDER');

-- BG Extension / Release confirmation to vendor (DO/Finance already see it in-app)
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_EXTENSION_RELEASE_BANK', 'bank', '{{bank}}', 'BG_EXTENSION_RELEASE_BANK'
WHERE NOT EXISTS (
  SELECT 1 FROM email_send_info WHERE event_name = 'BG_EXTENSION_RELEASE_BANK' AND u_type = 'bank'
);

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXTENSION_RELEASE_BANK',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{sdbg_reference_no}}</b>. This is to confirm that the {{action_type}} request for the referred Bank Guarantee has been <b>{{status}}</b>. This is a system generated confirmation; no action is required from your end.',
  'INFO: BG {{action_type}} request has been {{status}}'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXTENSION_RELEASE_BANK');

-- Notify the Dealing Officer when a vendor submits a new Extension/Release request
INSERT INTO email_send_info (event_name, u_type, u_email, email_body_name)
SELECT 'BG_EXTENSION_SUBMITTED', 'do', '{{do}}', 'BG_EXTENSION_SUBMITTED'
WHERE NOT EXISTS (
  SELECT 1 FROM email_send_info WHERE event_name = 'BG_EXTENSION_SUBMITTED' AND u_type = 'do'
);

INSERT INTO email_body (email_body_name, email_body, email_subject)
SELECT 'BG_EXTENSION_SUBMITTED',
  'Ref. PO No. <b>{{purchasing_doc_no}}</b>, Ref. BG No. <b>{{sdbg_reference_no}}</b>. A new {{action_type}} request has been submitted by the vendor for the referred Bank Guarantee. Please login to OVMS portal to review and forward it to Finance.',
  'INFO: New BG {{action_type}} request submitted for Ref. BG No. {{sdbg_reference_no}}'
WHERE NOT EXISTS (SELECT 1 FROM email_body WHERE email_body_name = 'BG_EXTENSION_SUBMITTED');
