-- Table: public.btn

-- DROP TABLE IF EXISTS public.btn;

CREATE TABLE IF NOT EXISTS public.btn
(
    btn_num character varying(30) COLLATE pg_catalog."default" NOT NULL,
    purchasing_doc_no character varying(30) COLLATE pg_catalog."default" NOT NULL,
    invoice_no character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    invoice_filename character varying(150) COLLATE pg_catalog."default",
    invoice_value character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    invoice_type character varying(200) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    debit_note character varying(15) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    credit_note character varying(15) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    debit_credit_filename character varying(150) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    net_claim_amount character varying(30) COLLATE pg_catalog."default" NOT NULL DEFAULT NULL::character varying,
    cgst character varying(4) COLLATE pg_catalog."default",
    sgst character varying(4) COLLATE pg_catalog."default",
    igst character varying(4) COLLATE pg_catalog."default",
    c_sdbg_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    c_sdbg_filename character varying(150) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    a_sdbg_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    demand_raise_filename character varying(150) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    gate_entry_no character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    get_entry_filename character varying(150) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    gate_entry_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    icgrn_total character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    c_drawing_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    a_drawing_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    c_qap_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    a_qap_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    c_ilms_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    a_ilms_date character varying(30) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    pbg_filename character varying(150) COLLATE pg_catalog."default" DEFAULT NULL::character varying,
    hsn_gstn_icgrn boolean DEFAULT true,
    updated_by character varying(30) COLLATE pg_catalog."default" NOT NULL,
    created_at bigint NOT NULL,
    created_by_id character varying(30) COLLATE pg_catalog."default" NOT NULL,
    vendor_code character varying(10) COLLATE pg_catalog."default" NOT NULL,
    yard character varying(20) COLLATE pg_catalog."default",
    stage character varying(20) COLLATE pg_catalog."default",
    btn_type character varying(30) COLLATE pg_catalog."default",
    net_with_gst character varying(30) COLLATE pg_catalog."default" NOT NULL DEFAULT NULL::character varying,
    grn_nos text COLLATE pg_catalog."default",
    icgrn_nos text COLLATE pg_catalog."default",
    sync_id uuid NOT NULL DEFAULT gen_random_uuid(),
    sync boolean NOT NULL DEFAULT false,
    sync_updated_at timestamp with time zone NOT NULL DEFAULT now(),
    suppoting_invoice_filename character varying(500) COLLATE pg_catalog."default",
    invoice_supporting_doc text COLLATE pg_catalog."default",
    debit_credit_file_path text COLLATE pg_catalog."default",
    demand_raise_file_path text COLLATE pg_catalog."default",
    invoice_file_path text COLLATE pg_catalog."default",
    supporting_invoice_file_path text COLLATE pg_catalog."default",
    suppoting_invoice_file_path text COLLATE pg_catalog."default",
    CONSTRAINT btn_pkey PRIMARY KEY (purchasing_doc_no, btn_num),
    CONSTRAINT btn_sync_id_key UNIQUE (sync_id)
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.btn
    OWNER to postgres;

-- Trigger: before_update_trigger

-- DROP TRIGGER IF EXISTS before_update_trigger ON public.btn;

CREATE OR REPLACE TRIGGER before_update_trigger
    BEFORE UPDATE 
    ON public.btn
    FOR EACH ROW
    EXECUTE FUNCTION public.update_sync_fields();

ALTER TABLE public.btn
    DISABLE TRIGGER before_update_trigger;