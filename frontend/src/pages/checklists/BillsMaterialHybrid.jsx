import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCaretLeft, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { actionHandlerBTN } from "../../Helpers/BTNChecklist";
import { checkTypeArr, inputTypeChange } from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { convertToEpoch, formatDate, formatFilePath } from "../../utils/getDateTimeNow";
import { toast } from "react-toastify";
import { initialData } from "../../data/btnData";
import DynamicButton from "../../Helpers/DynamicButton";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import MultiSearchableSelect from "../../components/MultiSearchableSelect";
import FileUploadWithProgress from "../../utils/FileUploadWithProgress";
import { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";
import { uploadFileStream } from "../../utils/uploadFile";

/* ----------------------------- constants ----------------------------- */

// Invoice basic value vs GRN total value: itna difference tolerate hoga (INR).
const GRN_TOLERANCE = 1;
const UPLOAD_TIMEOUT_MS = 60000;
const STAGE_OPTIONS = Array.from({ length: 30 }, (_, i) => String(i + 1));

/* ------------------------------ helpers ------------------------------ */

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v) => Number(Number(v).toFixed(2));

const escapeHtml = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// epoch(seconds) | "dd/mm/yyyy" | "dd-mm-yyyy" | ISO string | Date  ->  Date | null
const toDateObj = (val) => {
  if (!val || val === "--") return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const str = String(val).trim();
  if (/^\d+$/.test(str)) {
    const d = new Date(Number(str) * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

// -> "yyyy-mm-dd" (extractInvoice API ke liye)
const toISODate = (val) => {
  const d = toDateObj(val);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const buildFileData = (response) => ({
  file_id: response?.id || response?.data?.id || response?.file_id || "",
  fileName: response?.fileName || response?.data?.fileName || "",
  filePath: response?.filePath || response?.data?.filePath || "",
  file_name: response?.file_name || response?.data?.originalName || "",
  file_path: response?.file_path || response?.data?.filePath || "",
});

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

const confirmDialog = async (title, text) => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#2a2d93",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, Continue",
    cancelButtonText: "Cancel",
    allowOutsideClick: false,
  });
  return result.isConfirmed;
};

const FileLinks = ({ files, fallback = "--", label = "View File", getHref = (item) => formatFilePath(item?.file_path) }) => {
  if (!checkTypeArr(files)) return <>{fallback}</>;
  return (
    <>
      {files.map((item, i) => (
        <a key={i} href={getHref(item)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
          {label}
        </a>
      ))}
    </>
  );
};

const naOrDate = (v) => (v ? formatDate(v) : "--");

/* ----------------------------- component ----------------------------- */

const BillsMaterialHybrid = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [form, setForm] = useState(() => {
    const base = structuredClone(initialData || {});
    return { ...base, stage: base.stage || "1" };
  });
  const [associated, setAssociated] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [penaltyAccepted, setPenaltyAccepted] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [penaltyDetails, setPenaltyDetails] = useState({
    penaltyPercentage: 0,
    penaltyAmount: 0,
    payableAmount: 0,
  });

  // Same file dobara CHECK karne par re-upload na ho
  const uploadedRef = useRef(null);

  /* ---------------------------- derived values ---------------------------- */

  const isVerified = Boolean(form?.invoice_no && form?.invoice_filename);
  const grnTotal = num(form?.total_price);
  const hasGrnValue = grnTotal > 0;
  const hasInvoiceValue = num(form?.invoice_value) > 0;
  const grnDiff = round2(num(form?.invoice_value) - grnTotal);
  const isGrnMatched = hasGrnValue && hasInvoiceValue && Math.abs(grnDiff) <= GRN_TOLERANCE;

  /* ------------------------------ data load ------------------------------ */

  const getData = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setData(d?.data);
      }
    } catch (error) {
      console.error("Error fetching BTN data:", error);
      toast.error("Unable to load PO details.");
    }
  };

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!data) return;
    setForm((prev) => ({
      ...prev,
      c_sdbg_date: data?.c_sdbg_date || "",
      c_drawing_date: data?.c_drawing_date || "",
      c_qap_date: data?.c_qap_date || "",
      c_ilms_date: data?.c_ilms_date || "",
      a_sdbg_date: data?.a_sdbg_date || "",
      a_drawing_date: data?.a_drawing_date || "",
      a_qap_date: data?.a_qap_date || "",
      a_ilms_date: data?.a_ilms_date || "",
    }));
  }, [data]);

  /* ----------------------- net amount calculations ----------------------- */
  // Ek hi effect: Net Basic = Basic + Debit - Credit, phir GST lagao.
  // Values clear karne par bhi recalc hota hai (pehle stale reh jaata tha).
  useEffect(() => {
    const net = round2(num(form?.invoice_value) + num(form?.debit_note) - num(form?.credit_note));
    const gstPct = num(form?.cgst) + num(form?.sgst) + num(form?.igst);
    const withGst = round2(net * (1 + gstPct / 100));

    setForm((prev) => (prev.net_claim_amount === net && prev.net_with_gst === withGst ? prev : { ...prev, net_claim_amount: net, net_with_gst: withGst }));
  }, [form?.invoice_value, form?.debit_note, form?.credit_note, form?.cgst, form?.sgst, form?.igst]);

  /* --------------------------- reset / handlers --------------------------- */

  const resetExtraction = () => {
    setForm((prev) => ({
      ...prev,
      invoice_no: "",
      invoice_filename: "",
      company_name: "",
      gst_no: "",
      gate_entry_no: "",
      gate_entry_date: "",
      grn_nos: "",
      icgrn_nos: "",
      total_price: "",
      associated_po: [],
      CAPEX_IND: false,
    }));
    setAssociated([]);
    setPenaltyAccepted(false);
    setGstVerified(false);
    setPenaltyDetails({
      penaltyPercentage: 0,
      penaltyAmount: 0,
      payableAmount: 0,
    });
  };

  const handleResetInvoice = () => {
    setInvoiceFile(null);
    setFileInputKey((k) => k + 1);
    uploadedRef.current = null;
    resetExtraction();
    setForm((prev) => ({ ...prev, invoice_date: "", invoice_value: "" }));
  };

  const handleInvoiceTypeChange = (e) => {
    const value = e.target.value;
    setInvoiceFile(null);
    setFileInputKey((k) => k + 1);
    uploadedRef.current = null;
    resetExtraction();
    setForm((prev) => ({ ...prev, invoice_type: value, invoice_date: "", invoice_value: "" }));
  };

  const handleInvoiceFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && !(file.type === "application/pdf" || file.name?.toLowerCase().endsWith(".pdf"))) {
      toast.warning("Only PDF files are allowed.");
      setFileInputKey((k) => k + 1);
      return;
    }
    setInvoiceFile(file);
    uploadedRef.current = null;
    resetExtraction(); // nayi file = purana extracted data invalid
  };

  const handleExtractInvoice = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (isExtracting) return;

    if (!invoiceFile) {
      toast.warning("Please upload the Invoice File.");
      return;
    }
    const invoiceDateString = toISODate(form?.invoice_date);
    if (!invoiceDateString) {
      toast.warning("Please select a valid Invoice Date.");
      return;
    }

    setIsExtracting(true);
    try {
      // Step 1: file upload (agar pehle se is file ka upload ho chuka hai to reuse)
      let uploadedFileMetadata = uploadedRef.current?.file === invoiceFile ? uploadedRef.current.meta : null;

      if (!uploadedFileMetadata) {
        toast.info("Uploading file...");
        uploadedFileMetadata = await withTimeout(
          new Promise((resolve) => {
            uploadFileStream({
              file: invoiceFile,
              token,
              vendorCode: id,
              type: "BTN",
              onSuccess: (uploadedFile) => resolve(uploadedFile),
            }).catch((err) => {
              console.error("Upload error", err);
              resolve(null);
            });
          }),
          UPLOAD_TIMEOUT_MS,
        );

        if (!uploadedFileMetadata) {
          toast.error("File upload failed, cannot extract invoice.");
          return;
        }
        uploadedRef.current = { file: invoiceFile, meta: uploadedFileMetadata };
      }

      // Step 2: extractInvoice API
      const formData = new FormData();
      formData.append("file", invoiceFile);
      formData.append("invoice_date", invoiceDateString);

      toast.info("Extracting invoice data...");
      const response = await apiCallBack("POST", "po/btn/extractInvoice", formData, token);

      const applyVerifiedData = (res) => {
        const invNo = res.invoiceNo || res.invoiceDetails?.invoice_no || res.data?.extractedData?.data?.invoice_no || "";

        if (!invNo) {
          toast.warn("Invoice number could not be read from the file. Please upload a clearer PDF.");
          return false;
        }

        const geList = checkTypeArr(res.gateEntryVerification) ? res.gateEntryVerification : [];
        const primaryGe = geList[0] || {};
        const gate_entry_no = geList.map((g) => g.gate_entry_no).filter(Boolean).join(", ") || primaryGe.gate_entry_no || res.data?.grnData?.data?.gate_entry_no || "";
        const gate_entry_date = primaryGe.gate_entry_date ? formatDate(primaryGe.gate_entry_date) : res.data?.grnData?.data?.gate_entry_date ? formatDate(res.data.grnData.data.gate_entry_date) : "";

        const grnRecords = checkTypeArr(res.grnVerification?.grnRecords)
          ? res.grnVerification.grnRecords
          : geList.length > 0
          ? geList.map((g) => ({ grn_no: g.grn_no, price: g.price }))
          : res.data?.grnData?.data?.grn_nos || [];

        const totalPrice =
          res.grnVerification?.grnAmount ??
          res.grnVerification?.invoiceAmount ??
          res.invoiceDetails?.sub_total ??
          res.data?.grnData?.data?.total_price ??
          "";

        const basicValue = res.invoiceDetails?.sub_total ?? res.grnVerification?.invoiceAmount ?? "";
        const geInvoiceDate = primaryGe.invoice_date || res.data?.grnData?.data?.invoice_date;

        const isGstFound = res.gstVerification ? Boolean(res.gstVerification.found) : true;
        const isPenalty = res.gstVerification ? !res.gstVerification.found : false;

        const pd = res.penalty_details || res.amountDetails || response?.penalty_details || response?.amountDetails;
        if (isGstFound) {
          setPenaltyDetails({
            penaltyPercentage: 0,
            penaltyAmount: 0,
            payableAmount: 0,
          });
        } else if (pd) {
          setPenaltyDetails({
            penaltyPercentage: pd.penaltyPercentage ?? pd.penalty_percentage ?? 0,
            penaltyAmount: pd.penaltyAmount ?? pd.penalty_amount ?? 0,
            payableAmount: pd.payableAmount ?? pd.payable_amount ?? 0,
          });
        }

        setForm((prev) => ({
          ...prev,
          invoice_no: invNo,
          invoice_filename: uploadedFileMetadata,
          company_name: res.invoiceDetails?.company_name || prev.company_name || "",
          gst_no: res.invoiceDetails?.gst_no || prev.gst_no || "",
          gate_entry_no: gate_entry_no || prev.gate_entry_no,
          gate_entry_date: gate_entry_date || prev.gate_entry_date,
          grn_nos: grnRecords && grnRecords.length > 0 ? grnRecords : prev.grn_nos,
          total_price: totalPrice !== "" ? totalPrice : prev.total_price,
          invoice_value: basicValue !== "" ? basicValue : prev.invoice_value,
          invoice_date: geInvoiceDate && toDateObj(geInvoiceDate) ? convertToEpoch(toDateObj(geInvoiceDate)) : prev.invoice_date,
          CAPEX_IND: res.data?.grnData?.data?.CAPEX_IND ?? prev.CAPEX_IND ?? false,
        }));

        setPenaltyAccepted(isPenalty);
        setGstVerified(isGstFound);

        const associateList = res.associatePoList || res.data?.grnData?.data?.associatePoList;
        const options = checkTypeArr(associateList) ? associateList.map((item) => ({ value: item.purchasing_doc_no, label: item.purchasing_doc_no })) : [];
        if (options.length > 0) setAssociated(options);

        toast.success(res.message || "Invoice details extracted successfully!");
        return true;
      };

      if (response && (response.status === "VERIFIED" || response.success || (response.status && response.data))) {
        if (response.data && (response.data.extractedData || response.data.grnData)) {
          const { extractedData, grnData } = response.data;
          const invoice_no = extractedData?.data?.invoice_no || "";

          if (!invoice_no) {
            toast.warn("Invoice number could not be read from the file. Please upload a clearer PDF.");
            return;
          }

          if (grnData && grnData.status && grnData.data) {
            const { gate_entry_no, grn_nos, icgrn_nos, gate_entry_date, total_price, invoice_date, CAPEX_IND, associatePoList } = grnData.data;

            setForm((prev) => ({
              ...prev,
              invoice_no,
              invoice_filename: uploadedFileMetadata,
              gate_entry_no,
              gate_entry_date: formatDate(gate_entry_date),
              grn_nos,
              icgrn_nos,
              total_price,
              invoice_date: formatDate(invoice_date),
              CAPEX_IND,
            }));

            const options = checkTypeArr(associatePoList) ? associatePoList.map((item) => ({ value: item.purchasing_doc_no, label: item.purchasing_doc_no })) : [];
            setAssociated(options);
            setPenaltyAccepted(false);
            setGstVerified(true);
            setPenaltyDetails({
              penaltyPercentage: 0,
              penaltyAmount: 0,
              payableAmount: 0,
            });
            toast.success(response.message || "Invoice details extracted successfully!");
          } else {
            toast.warn(grnData?.message || "Invalid GRN data returned");
          }
        } else {
          applyVerifiedData(response);
        }
      } else if (response && (response.requiresConfirmation || response.status === "GST_NOT_FOUND" || response.penaltyPercentage)) {
        const pd = response.penalty_details || response.amountDetails;
        if (pd) {
          setPenaltyDetails({
            penaltyPercentage: pd.penaltyPercentage ?? pd.penalty_percentage ?? 0,
            penaltyAmount: pd.penaltyAmount ?? pd.penalty_amount ?? 0,
            payableAmount: pd.payableAmount ?? pd.payable_amount ?? 0,
          });
        }
        const msg = response.message || "GST number does not exist in GST records";
        const invoiceNum = response.invoiceNo || response.invoiceDetails?.invoice_no || "";

        const result = await Swal.fire({
          title: "GST Not Found in Records",
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p style="margin-bottom: 8px;"><strong>Status:</strong> ${escapeHtml(msg)}</p>
              ${invoiceNum ? `<p style="margin-bottom: 8px;"><strong>Invoice No:</strong> ${escapeHtml(invoiceNum)}</p>` : ""}
              <hr style="margin: 12px 0;" />
              <p style="margin-bottom: 0; font-size: 15px; font-weight: 600;">
                GST number does not exist in records. Do you want to proceed with this bill with penalty?
              </p>
            </div>
          `,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#2a2d93",
          cancelButtonColor: "#6c757d",
          confirmButtonText: "Yes, Proceed",
          cancelButtonText: "Cancel",
          allowOutsideClick: false,
        });

        if (result.isConfirmed) {
          const tempInvId = response?.temp_inv_id || response?.draftId || response?.draft_id || response?.id || response?.temp_invoice_id;

          try {
            toast.info("Processing invoice with penalty...");
            const penaltyRes = await apiCallBack(
              "POST",
              "po/btn/process-with-penalty",
              {
                temp_inv_id: tempInvId,
                continueWithPenalty: true,
              },
              token
            );

            if (penaltyRes && (penaltyRes.status === "VERIFIED" || penaltyRes.success)) {
              applyVerifiedData(penaltyRes);
              setPenaltyAccepted(true);
              setGstVerified(false);
              return;
            } else if (penaltyRes && penaltyRes.message) {
              toast.warn(penaltyRes.message);
            }
          } catch (err) {
            console.error("Error processing invoice with penalty:", err);
            toast.error("Failed to process invoice with penalty");
          }

          toast.info("Proceeding with penalty confirmed.");
          setPenaltyAccepted(true);
          setGstVerified(false);
          setForm((prev) => ({
            ...prev,
            invoice_no: invoiceNum || prev.invoice_no,
            invoice_filename: uploadedFileMetadata,
          }));
        } else {
          window.location.reload();
        }
      } else if (response && response.message) {
        toast.warn(response.message);
      } else {
        toast.warn("Unexpected response structure");
      }
    } catch (error) {
      console.error("Error extracting invoice", error);
      toast.error("Error extracting invoice details");
    } finally {
      setIsExtracting(false);
    }
  };

  /* ------------------------------ validation ------------------------------ */

  const validateForm = () => {
    if (!form?.invoice_type) return "Please choose the Invoice Type.";
    if (!isVerified) return "Please upload the invoice and click CHECK to verify it before submitting.";
    if (!toDateObj(form?.invoice_date)) return "Invoice Date is missing.";

    const basic = num(form?.invoice_value);
    const debit = num(form?.debit_note);
    const credit = num(form?.credit_note);

    if (basic <= 0) return "Please enter the Basic value (must be greater than 0).";
    if (debit < 0 || credit < 0) return "Debit/Credit note value cannot be negative.";
    if (credit > basic + debit) return "Credit note value cannot exceed Basic value + Debit note.";
    if ((debit > 0 || credit > 0) && !form?.debit_credit_filename) return "Please upload the Debit/Credit Note file.";

    if (!form?.CAPEX_IND) {
      const c = num(form?.cgst);
      const s = num(form?.sgst);
      const i = num(form?.igst);
      if ([c, s, i].some((v) => v < 0 || v > 100)) return "GST percentage must be between 0 and 100.";
      if (i > 0 && (c > 0 || s > 0)) return "Use either IGST or CGST + SGST, not both.";
      if (c !== s) return "CGST and SGST percentages must be equal.";
    }

    if (!form?.agree_to_declaration) return "Please accept the declaration that all entries are correct.";
    if (!form?.hsn_gstn_icgrn) return "Please confirm that HSN code, GSTIN and Tax rate are as per PO.";
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.warning(error);
      return;
    }

    if (!penaltyAccepted && !form?.CAPEX_IND && num(form?.cgst) === 0 && num(form?.sgst) === 0 && num(form?.igst) === 0) {
      const ok = await confirmDialog("No GST entered", "CGST, SGST and IGST are all 0%. Do you want to continue?");
      if (!ok) return;
    }

    if (hasGrnValue && !isGrnMatched) {
      const ok = await confirmDialog(
        "Invoice value does not match GRN value",
        `Basic value (${num(form?.invoice_value).toFixed(2)}) differs from GRN total (${grnTotal.toFixed(2)}). The bill will not be auto-forwarded. Continue?`,
      );
      if (!ok) return;
    }

    return actionHandlerBTN("BillsMaterialHybrid", token, id, form, setForm, initialData, navigate);
  };

  /* -------------------------------- render -------------------------------- */

  const showInvoiceBlock = form?.invoice_type === D_S_INVOICE || form?.invoice_type === E_INVOICE;

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Bills for Material PO"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card">
                          <h3 className="d-flex align-items-center m-3">
                            <button className="btn_icon me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                              <FaCaretLeft className="fs-20" />
                            </button>{" "}
                            References - PO No:{id}
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Yard No:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="yard"
                                          value={form?.yard ?? ""}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Stage:</td>
                                      <td className="btn_value">
                                        <select name="stage" className="form-select" value={form?.stage || "1"} onChange={(e) => inputTypeChange(e, form, setForm)}>
                                          {STAGE_OPTIONS.map((s) => (
                                            <option key={s} value={s}>
                                              {s}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Choose Invoice Type</td>
                                      <td className="btn_value">
                                        <select
                                          name="invoice_type"
                                          className="form-select"
                                          value={form?.invoice_type || ""}
                                          disabled={isExtracting}
                                          onChange={handleInvoiceTypeChange}
                                        >
                                          <option value="">Choose Invoice Type</option>
                                          <option value={D_S_INVOICE}>Digitally signed Invoice</option>
                                          <option value={E_INVOICE}>E-Invoice</option>
                                        </select>
                                      </td>
                                    </tr>

                                    {showInvoiceBlock && (
                                      <tr>
                                        <td>{form.invoice_type === D_S_INVOICE ? "Digitally Signed Invoice:" : "E-Invoice:"}</td>
                                        <td>
                                          <div className="d-flex align-items-end flex-wrap gap-3 py-1">
                                            <div style={{ width: "260px" }}>
                                              <label className="form-label fw-bold mb-1" style={{ fontSize: "13px" }}>
                                                Invoice File
                                              </label>
                                              <input
                                                key={fileInputKey}
                                                type="file"
                                                className="form-control"
                                                accept=".pdf"
                                                disabled={isVerified || isExtracting}
                                                onChange={handleInvoiceFileChange}
                                              />
                                            </div>
                                            <div style={{ width: "180px" }}>
                                              <label className="form-label fw-bold mb-1" style={{ fontSize: "13px" }}>
                                                Invoice Date
                                              </label>
                                              <DatePicker
                                                selected={toDateObj(form?.invoice_date)}
                                                onChange={(date) => setForm((prev) => ({ ...prev, invoice_date: date ? convertToEpoch(date) : "" }))}
                                                dateFormat="dd/MM/yyyy"
                                                className="form-control"
                                                placeholderText="Select date"
                                                maxDate={new Date()}
                                                disabled={isVerified || isExtracting}
                                              />
                                            </div>
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                              {!isVerified && <DynamicButton label="CHECK" onClick={handleExtractInvoice} className="btn-primary px-4 fw-bold" />}
                                              {isVerified && (
                                                <button type="button" className="btn btn-sm btn-light-danger fw-bold" onClick={handleResetInvoice}>
                                                  CHANGE INVOICE
                                                </button>
                                              )}
                                              {form?.invoice_filename && (
                                                <span
                                                  className="badge d-inline-flex align-items-center gap-1 py-2 px-3 fw-bold"
                                                  style={{
                                                    backgroundColor: "#d1e7dd",
                                                    color: "#0f5132",
                                                    border: "1px solid #badbcc",
                                                    fontSize: "12px",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: "320px",
                                                    borderRadius: "4px",
                                                  }}
                                                  title={form.invoice_filename.file_name || form.invoice_filename.fileName}
                                                >
                                                  <FaCheckCircle className="me-1 flex-shrink-0" style={{ color: "#0f5132" }} />
                                                  <span className="text-truncate" style={{ color: "#0f5132" }}>
                                                    Uploaded: <strong>{form.invoice_filename.file_name || form.invoice_filename.fileName}</strong>
                                                  </span>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    <tr>
                                      <td>Invoice No:</td>
                                      <td className="btn_value">
                                        <b>{form?.invoice_no || "--"}</b>
                                        {gstVerified && (
                                          <span
                                            className="badge ms-3 fw-bold d-inline-flex align-items-center"
                                            style={{
                                              backgroundColor: "#d1e7dd",
                                              color: "#0f5132",
                                              border: "1px solid #badbcc",
                                              fontSize: "12px",
                                              padding: "4px 10px",
                                              borderRadius: "4px",
                                            }}
                                          >
                                            <FaCheckCircle className="me-1 text-success" />
                                            GST Verified
                                          </span>
                                        )}
                                        {penaltyAccepted && (
                                          <span
                                            className="badge ms-3 fw-bold d-inline-flex align-items-center"
                                            style={{
                                              backgroundColor: "#fff3cd",
                                              color: "#856404",
                                              border: "1px solid #ffeeba",
                                              fontSize: "12px",
                                              padding: "4px 10px",
                                              borderRadius: "4px",
                                            }}
                                          >
                                            <FaExclamationTriangle className="me-1 text-warning" />
                                            GST not found - proceeding with penalty
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                    {form?.company_name && (
                                      <tr>
                                        <td>Company Name:</td>
                                        <td className="btn_value">
                                          <b>{form.company_name}</b>
                                        </td>
                                      </tr>
                                    )}
                                    {form?.gst_no && (
                                      <tr>
                                        <td>Vendor GST No:</td>
                                        <td className="btn_value">
                                          <b>{form.gst_no}</b>
                                          {gstVerified && (
                                            <span
                                              className="badge ms-2 fw-bold d-inline-flex align-items-center"
                                              style={{
                                                backgroundColor: "#d1e7dd",
                                                color: "#0f5132",
                                                border: "1px solid #badbcc",
                                                fontSize: "12px",
                                                padding: "4px 10px",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              <FaCheckCircle className="me-1 text-success" />
                                              Verified in Records
                                            </span>
                                          )}
                                          {penaltyAccepted && (
                                            <span
                                              className="badge ms-2 fw-bold d-inline-flex align-items-center"
                                              style={{
                                                backgroundColor: "#fff3cd",
                                                color: "#856404",
                                                border: "1px solid #ffeeba",
                                                fontSize: "12px",
                                                padding: "4px 10px",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              <FaExclamationTriangle className="me-1 text-warning" />
                                              Not in Records (Penalty Applicable)
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    )}

                                    {checkTypeArr(associated) && (
                                      <tr>
                                        <td>Additional PO:</td>
                                        <td>
                                          <MultiSearchableSelect
                                            options={associated}
                                            value={form?.associated_po?.map((val) => ({ value: val, label: val })) || []}
                                            onChange={(selectedOptions) =>
                                              setForm((prev) => ({
                                                ...prev,
                                                associated_po: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
                                              }))
                                            }
                                            placeholder="Select Additional PO(s)"
                                          />
                                        </td>
                                      </tr>
                                    )}

                                    <tr>
                                      <td>Basic value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="invoice_value"
                                          value={form?.invoice_value ?? ""}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Debit/Credit Note:</td>
                                      <td className="btn_value">
                                        <FileUploadWithProgress
                                          warningText={BTN_UPLOAD_WARNING}
                                          token={token}
                                          vendorCode={id}
                                          uploadedFile={form?.debit_credit_filename || null}
                                          onUploadSuccess={(response) => setForm((prev) => ({ ...prev, debit_credit_filename: buildFileData(response) }))}
                                          onDelete={() => setForm((prev) => ({ ...prev, debit_credit_filename: null }))}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Debit Note value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="debit_note"
                                          value={form?.debit_note ?? ""}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Credit Note value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="credit_note"
                                          value={form?.credit_note ?? ""}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>

                                    {!form?.CAPEX_IND && (
                                      <>
                                        <tr>
                                          <td>Net Basic amount:</td>
                                          <td className="btn_value">
                                            <b>{form?.net_claim_amount}</b>
                                          </td>
                                        </tr>
                                        {[
                                          ["CGST", "cgst"],
                                          ["SGST", "sgst"],
                                          ["IGST", "igst"],
                                        ].map(([label, name]) => (
                                          <tr key={name}>
                                            <td>{label}:</td>
                                            <td className="btn_value">
                                              <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                className="form-control"
                                                onWheel={inputOnWheelPrevent}
                                                name={name}
                                                value={form?.[name] ?? ""}
                                                onChange={(e) => inputTypeChange(e, form, setForm)}
                                              />
                                              <span className="ms-1">%</span>
                                            </td>
                                          </tr>
                                        ))}
                                      </>
                                    )}
                                    <tr>
                                      <td>Net claim amount with GST:</td>
                                      <td className="btn_value">
                                        <b>{form?.net_with_gst}</b>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Contractual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {form?.c_sdbg_date && formatDate(form?.c_sdbg_date)}
                                          {!form?.c_sdbg_date ? "--" : form?.c_sdbg_date && !form?.a_sdbg_date ? "(NOT SUBMITTED)" : ""}
                                        </b>
                                        <FileLinks files={data?.sdbg_filename} fallback="" />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">{naOrDate(form?.a_sdbg_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Demand Draft</td>
                                      <td>
                                        <b>
                                          <FileLinks files={data?.dd_filename} label="VIEW" getHref={(item) => `${process.env.REACT_APP_PDF_URL}submitSDBG/${item?.file_name}`} />
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Indeminity Bond</td>
                                      <td>
                                        <b>
                                          <FileLinks files={data?.ib_filename} />
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Demand raised by production/PP&C if any</td>
                                      <td className="btn_value">
                                        <FileUploadWithProgress
                                          warningText={BTN_UPLOAD_WARNING}
                                          token={token}
                                          vendorCode={id}
                                          uploadedFile={form?.demand_raise_filename || null}
                                          onUploadSuccess={(response) => setForm((prev) => ({ ...prev, demand_raise_filename: buildFileData(response) }))}
                                          onDelete={() => setForm((prev) => ({ ...prev, demand_raise_filename: null }))}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Gate Entry Acknowledgement no.</td>
                                      <td className="btn_value">
                                        <b>{form?.gate_entry_no || "--"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Gate Entry Date</td>
                                      <td className="btn_value">
                                        <b>{form?.gate_entry_date || "--"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>GRN No </td>
                                      <td className="btn_value">
                                        <p className="mb-0">
                                          {checkTypeArr(form?.grn_nos) &&
                                            [...new Set(form.grn_nos.map((item) => (typeof item === "object" ? item?.grn_no : item) || "--"))].map((uniqueGrn, i) => (
                                              <span
                                                key={i}
                                                className="badge me-2 fw-bold"
                                                style={{
                                                  backgroundColor: "#cfe2ff",
                                                  color: "#084298",
                                                  border: "1px solid #b6d4fe",
                                                  fontSize: "13px",
                                                  padding: "5px 12px",
                                                  borderRadius: "4px",
                                                }}
                                              >
                                                {uniqueGrn}
                                              </span>
                                            ))}
                                          {typeof form?.grn_nos === "string" && form.grn_nos && (
                                            <span
                                              className="badge me-2 fw-bold"
                                              style={{
                                                backgroundColor: "#cfe2ff",
                                                color: "#084298",
                                                border: "1px solid #b6d4fe",
                                                fontSize: "13px",
                                                padding: "5px 12px",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              {form.grn_nos}
                                            </span>
                                          )}
                                          {!form?.grn_nos && "--"}
                                        </p>
                                      </td>
                                    </tr>
                                    {/* ICGRN no - abhi ke liye hidden, zarurat par uncomment karo
<tr>
                                      <td>ICGRN no </td>
                                      <td className="btn_value">
                                        <p>
                                          {checkTypeArr(form?.icgrn_nos) &&
                                            [...new Set(form.icgrn_nos.map((item) => item?.grn_no || "--"))].map((uniqueGrn, i) => (
                                              <b key={i} className="mx-2">
                                                {uniqueGrn}
                                              </b>
                                            ))}
                                        </p>
                                      </td>
                                    </tr>
*/}
                                    <tr>
                                      <td>Total Value (GRN and ICGRN)</td>
                                      <td className="btn_value">
                                        <b>{form?.total_price ? form.total_price : "--"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Invoice vs GRN Value</td>
                                      <td className="btn_value">
                                        {!hasGrnValue ? (
                                          <span
                                            className="badge fw-semibold"
                                            style={{
                                              backgroundColor: "#e2e3e5",
                                              color: "#41464b",
                                              border: "1px solid #d3d6d8",
                                              padding: "5px 12px",
                                              fontSize: "12px",
                                              borderRadius: "4px",
                                            }}
                                          >
                                            Verify the invoice (CHECK) to compare
                                          </span>
                                        ) : !hasInvoiceValue ? (
                                          <span
                                            className="badge fw-semibold"
                                            style={{
                                              backgroundColor: "#e2e3e5",
                                              color: "#41464b",
                                              border: "1px solid #d3d6d8",
                                              padding: "5px 12px",
                                              fontSize: "12px",
                                              borderRadius: "4px",
                                            }}
                                          >
                                            Enter Basic value to compare
                                          </span>
                                        ) : isGrnMatched ? (
                                          <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span
                                              className="badge fw-bold d-inline-flex align-items-center gap-1"
                                              style={{
                                                backgroundColor: "#d1e7dd",
                                                color: "#0f5132",
                                                border: "1px solid #badbcc",
                                                padding: "5px 12px",
                                                fontSize: "12px",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              <FaCheckCircle className="me-1" style={{ color: "#0f5132" }} />
                                              Matched
                                            </span>
                                            <span className="ms-2 fw-semibold text-dark" style={{ fontSize: "13px" }}>
                                              (Invoice Basic Value: <b>{form?.invoice_value}</b> | Total GRN Value: <b>{form?.total_price || grnTotal}</b>)
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span
                                              className="badge fw-bold d-inline-flex align-items-center gap-1"
                                              style={{
                                                backgroundColor: "#f8d7da",
                                                color: "#842029",
                                                border: "1px solid #f5c2c7",
                                                padding: "5px 12px",
                                                fontSize: "12px",
                                                borderRadius: "4px",
                                              }}
                                            >
                                              <FaExclamationTriangle className="me-1" style={{ color: "#842029" }} />
                                              Mismatch (difference: {grnDiff > 0 ? "+" : ""}{grnDiff})
                                            </span>
                                            <span className="ms-2 fw-semibold text-dark" style={{ fontSize: "13px" }}>
                                              (Invoice Basic Value: <b>{form?.invoice_value}</b> | Total GRN Value: <b>{form?.total_price || grnTotal}</b>)
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Penalty Percentage</td>
                                      <td className="btn_value">
                                        <b>{num(penaltyDetails?.penaltyPercentage) > 0 ? `${penaltyDetails.penaltyPercentage}%` : "0"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Penalty Amount</td>
                                      <td className="btn_value">
                                        <b>{penaltyDetails?.penaltyAmount ? penaltyDetails.penaltyAmount : "0"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Payable Amount</td>
                                      <td className="btn_value">
                                        <b>{penaltyDetails?.payableAmount ? penaltyDetails.payableAmount : "0"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual Drawing submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.c_drawing_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual Drawing submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.a_drawing_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual QAP submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.c_qap_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual QAP submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.a_qap_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual ILMS submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.c_ilms_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual ILMS submission date</td>
                                      <td className="btn_value">
                                        <b>{naOrDate(form?.a_ilms_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PBG</td>
                                      <td className="btn_value">
                                        <FileLinks files={data?.pbg_filename} fallback="PBG NOT SUBMITTED" />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan="2">
                                        <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="agree_to_declaration"
                                            name="agree_to_declaration"
                                            checked={!!form?.agree_to_declaration}
                                            onChange={(e) => setForm((prev) => ({ ...prev, agree_to_declaration: e.target.checked }))}
                                          />
                                          <label className="form-check-label" htmlFor="agree_to_declaration">
                                            I hereby declare that all the entries are correct.
                                          </label>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan="2">
                                        <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="hsn_gstn_icgrn"
                                            name="hsn_gstn_icgrn"
                                            checked={!!form?.hsn_gstn_icgrn}
                                            onChange={(e) => setForm((prev) => ({ ...prev, hsn_gstn_icgrn: e.target.checked }))}
                                          />
                                          <label className="form-check-label" htmlFor="hsn_gstn_icgrn">
                                            Whether HSN code, GSTIN, Tax rate is as per PO
                                          </label>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="text-center">
                                {user?.user_type === USER_VENDOR && <DynamicButton label="SUBMIT" onClick={handleSubmit} className="btn fw-bold btn-primary me-3" />}
                                <button className="btn btn-sm btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                  BACK
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default BillsMaterialHybrid;
