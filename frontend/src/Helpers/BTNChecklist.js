import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import { convertToEpoch } from "../utils/getDateTimeNow";
import { initialDataAdvance, initialDataService, initialDODataAdvance } from "../data/btnData";
import { TYPE_GRN, TYPE_SERVICE } from "../constants/BTNContants";
import { checkTypeArr } from "../utils/smallFun";
import { parse } from "url";

export const getGrnIcgrnByInvoice = async (po, invoice_no, token) => {
  try {
    const payload = {
      purchasing_doc_no: po,
      invoice_no: invoice_no,
    };
    const response = await apiCallBack("POST", "po/btn/getGrnIcgrnByInvoice", payload, token);
    return response;
  } catch (error) {
    console.error("ERROR GETTING GRN ICGRN:", error);
  }
};

// export const actionHandlerBTN = async (flag, token, id, form, setForm, initialData, navigate) => {
//   try {
//     const {
//       yard,
//       stage,
//       invoice_no,
//       invoice_type,
//       invoice_filename,
//       invoice_supporting_doc,
//       invoice_value,
//       invoice_date,
//       debit_note,
//       credit_note,
//       net_claim_amount,
//       cgst,
//       sgst,
//       igst,
//       debit_credit_filename,
//       total_price,
//       hsn_gstn_icgrn,
//       agree_to_declaration,
//       demand_raise_filename,
//       associated_po,
//     } = form;

//     if (!invoice_type || invoice_type.trim() === "") {
//       toast.warning("Please choose Invoice Type.");
//       return;
//     }

//     if (!invoice_value || invoice_value.trim() === "") {
//       toast.warning("Basic Value is mandatory.");
//       return;
//     }
//     // if (!invoice_date || invoice_date.toString().trim() === "" || invoice_date.toString().trim() === "--") {
//     //   toast.warning("Invoice Date is mandatory.");
//     //   return;
//     // }
//     if (!invoice_date || invoice_date === null || invoice_date.toString().trim() === "" || invoice_date.toString().trim() === "--") {
//       toast.warning("Invoice Date is mandatory.");
//       return;
//     }
//     if (!agree_to_declaration) {
//       toast.warning("Please check to agree the Declaration.");
//       return;
//     }
//     if (!hsn_gstn_icgrn) {
//       toast.warning("Please check the HSN code, GSTIN, Tax rate is as per PO.");
//       return;
//     }
//     if (!invoice_filename) {
//       toast.warning("Invoice file is mandatory.");
//       return;
//     }
//     if ((parseFloat(debit_note) > 0 || parseFloat(credit_note) > 0) && !debit_credit_filename) {
//       toast.warning("Debit/Credit Note file is mandatory.");
//       return;
//     }
//     if (parseInt(total_price) !== parseInt(net_claim_amount)) {
//       toast.warning("Total price and net claim amount should be equal!");
//       return;
//     }
//     const fDToSend = new FormData();
//     fDToSend.append("yard", yard);
//     fDToSend.append("stage", stage);
//     fDToSend.append("purchasing_doc_no", id);
//     fDToSend.append("invoice_no", invoice_no);
//     fDToSend.append("invoice_type", invoice_type);
//     fDToSend.append("invoice_value", invoice_value);
//     fDToSend.append("invoice_date", invoice_date);
//     fDToSend.append("debit_note", debit_note);
//     fDToSend.append("credit_note", credit_note);
//     fDToSend.append("hsn_gstn_icgrn", hsn_gstn_icgrn);
//     fDToSend.append("cgst", cgst);
//     fDToSend.append("sgst", sgst);
//     fDToSend.append("igst", igst);
//     console.log("associated_po", associated_po);
//     if (checkTypeArr(associated_po)) {
//       fDToSend.append("associated_po", JSON.stringify(associated_po.map((item) => ({ a_po: item }))));
//     }
//     fDToSend.append("invoice_filename", invoice_filename);
//     if (invoice_supporting_doc) {
//       fDToSend.append("invoice_supporting_doc", invoice_supporting_doc);
//     }

//     if (debit_credit_filename) {
//       fDToSend.append("debit_credit_filename", debit_credit_filename);
//     }
//     // if (get_entry_filename) {
//     //   fDToSend.append("get_entry_filename", get_entry_filename);
//     // }
//     if (demand_raise_filename) {
//       fDToSend.append("demand_raise_filename", demand_raise_filename);
//     }
//     const response = await apiCallBack("POST", "po/btn/BillsMaterialHybrid", fDToSend, token);

//     if (response?.status) {
//       toast.success(response?.message);
//       setForm(initialData);
//       // getData();
//       navigate(`/invoice-and-payment-process/${id}`);
//     } else {
//       toast.error(response?.message);
//     }
//   } catch (error) {
//     console.error("error", error?.message);
//     toast.error("Error:", error.message);
//   }
// };

export const actionHandlerBTN = async (flag, token, id, form, setForm, initialData, navigate) => {
  try {
    const {
      yard,
      stage,
      invoice_no,
      invoice_type,
      invoice_filename,
      invoice_supporting_doc,
      invoice_value,
      invoice_date,
      debit_note,
      credit_note,
      net_claim_amount,
      cgst,
      sgst,
      igst,
      debit_credit_filename,
      total_price,
      hsn_gstn_icgrn,
      agree_to_declaration,
      demand_raise_filename,
      associated_po,
    } = form;

    // ===================== VALIDATIONS =====================
    if (!invoice_type || invoice_type.trim() === "") {
      toast.warning("Please choose Invoice Type.");
      return;
    }

    if (!invoice_value || invoice_value.toString().trim() === "") {
      toast.warning("Basic Value is mandatory.");
      return;
    }

    if (!invoice_date || invoice_date === null || invoice_date.toString().trim() === "" || invoice_date.toString().trim() === "--") {
      toast.warning("Invoice Date is mandatory.");
      return;
    }

    if (!agree_to_declaration) {
      toast.warning("Please check to agree the Declaration.");
      return;
    }

    if (!hsn_gstn_icgrn) {
      toast.warning("Please check the HSN code, GSTIN, Tax rate is as per PO.");
      return;
    }

    if (!invoice_filename || (typeof invoice_filename === "object" && !invoice_filename.file_id)) {
      toast.warning("Invoice file is mandatory.");
      return;
    }

    if ((parseFloat(debit_note) > 0 || parseFloat(credit_note) > 0) && (!debit_credit_filename || (typeof debit_credit_filename === "object" && !debit_credit_filename.file_id))) {
      toast.warning("Debit/Credit Note file is mandatory.");
      return;
    }

    if (parseInt(total_price) !== parseInt(net_claim_amount)) {
      toast.warning("Total price and net claim amount should be equal!");
      return;
    }

    // ===================== DATE CONVERTER - YYYY-MM-DD =====================
    const formatToYYYYMMDD = (dateVal) => {
      if (!dateVal) return "";
      // DD/MM/YYYY string hai (data?.invoice_date se aaya)
      if (typeof dateVal === "string" && dateVal.includes("/")) {
        const [dd, mm, yyyy] = dateVal.split("/");
        return `${yyyy}-${mm}-${dd}`;
      }
      // Epoch seconds hai (DatePicker se convertToEpoch ke baad aaya)
      const date = new Date(Number(dateVal) * 1000);
      if (isNaN(date.getTime())) return "";
      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const yyyy = date.getFullYear();
      return `${yyyy}-${mm}-${dd}`;
    };

    // ===================== PREPARE PAYLOAD =====================
    const payload = {
      stage: parseInt(stage) || 1,
      purchasing_doc_no: id,
      invoice_no: invoice_no || "",
      invoice_type: invoice_type,
      invoice_value: invoice_value || 0,
      invoice_date: formatToYYYYMMDD(invoice_date),
      debit_note: debit_note ? String(debit_note) : "0",
      credit_note: credit_note ? String(credit_note) : "0",
      hsn_gstn_icgrn: Boolean(hsn_gstn_icgrn),
      cgst: parseInt(cgst) || 0,
      sgst: parseInt(sgst) || 0,
      igst: parseInt(igst) || 0,

      invoice_filename: "",
      invoice_file_path: "",
      invoice_file_id: "",

      invoice_supporting_doc_filename: "",
      invoice_supporting_doc_file_path: "",
      invoice_supporting_doc_file_id: "",

      debit_credit_filename: "",
      debit_credit_file_path: "",
      debit_credit_file_id: "",

      demand_raise_filename: "",
      demand_raise_file_path: "",
      demand_raise_file_id: "",
    };

    // yard only if value hai
    if (yard) {
      payload.yard = parseInt(yard) || 0;
    }

    // Associated PO handling
    if (checkTypeArr(associated_po)) {
      payload.associated_po = associated_po.map((item) => ({ a_po: item }));
    }

    // Invoice file handling
    if (invoice_filename) {
      if (typeof invoice_filename === "object" && invoice_filename.file_id) {
        payload.invoice_filename = invoice_filename.fileName || invoice_filename.file_name || "";
        payload.invoice_file_path = invoice_filename.filePath || invoice_filename.file_path || "";
        payload.invoice_file_id = invoice_filename.file_id || "";
      } else if (typeof invoice_filename === "string") {
        payload.invoice_filename = invoice_filename;
      }
    }

    // Invoice supporting doc handling
    if (invoice_supporting_doc) {
      if (typeof invoice_supporting_doc === "object" && invoice_supporting_doc.file_id) {
        payload.invoice_supporting_doc_filename = invoice_supporting_doc.fileName || invoice_supporting_doc.file_name || "";
        payload.invoice_supporting_doc_file_path = invoice_supporting_doc.filePath || invoice_supporting_doc.file_path || "";
        payload.invoice_supporting_doc_file_id = invoice_supporting_doc.file_id || "";
      } else if (typeof invoice_supporting_doc === "string") {
        payload.invoice_supporting_doc_filename = invoice_supporting_doc;
      }
    }

    // Debit/Credit note file handling
    if (debit_credit_filename) {
      if (typeof debit_credit_filename === "object" && debit_credit_filename.file_id) {
        payload.debit_credit_filename = debit_credit_filename.fileName || debit_credit_filename.file_name || "";
        payload.debit_credit_file_path = debit_credit_filename.filePath || debit_credit_filename.file_path || "";
        payload.debit_credit_file_id = debit_credit_filename.file_id || "";
      } else if (typeof debit_credit_filename === "string") {
        payload.debit_credit_filename = debit_credit_filename;
      }
    }

    // Demand raise file handling
    if (demand_raise_filename) {
      if (typeof demand_raise_filename === "object" && demand_raise_filename.file_id) {
        payload.demand_raise_filename = demand_raise_filename.fileName || demand_raise_filename.file_name || "";
        payload.demand_raise_file_path = demand_raise_filename.filePath || demand_raise_filename.file_path || "";
        payload.demand_raise_file_id = demand_raise_filename.file_id || "";
      } else if (typeof demand_raise_filename === "string") {
        payload.demand_raise_filename = demand_raise_filename;
      }
    }

    console.log("Final JSON Payload:", JSON.stringify(payload, null, 2));

    const response = await apiCallBack("POST", "po/btn/BillsMaterialHybrid", payload, token);

    if (response?.status) {
      toast.success(response?.message);
      setForm(initialData);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message);
    }
  } catch (error) {
    console.error("error", error?.message);
    toast.error("Error:", error.message);
  }
};
// export const actionHandlerByDO = async (doForm, setDoForm, initialData, data, navigate, id, token) => {
//   console.log("doForm", doForm);
//   try {
//     doForm.purchasing_doc_no = id;
//     if (!doForm?.assign_to || doForm?.assign_to === "") {
//       return toast.warn("Please choose the finance authority.");
//     }
//     if (!doForm?.ld_ge_date || doForm?.ld_ge_date === "") {
//       return toast.warn("Please select gate entry date");
//     }
//     if (!doForm?.contractual_ld || doForm?.contractual_ld === "") {
//       return toast.warn("Please select contractual delivery date.");
//     }
//     if (!doForm?.max_ld || doForm?.max_ld === "") {
//       return toast.warn(" Please select Max LD.");
//     }
//     if (!doForm?.max_penalty || doForm?.max_penalty === "") {
//       return toast.warn(" Please select Max Penalty.");
//     }
//     if (!doForm?.other_deduction || doForm?.other_deduction === "") {
//       return toast.warn("Please fill retension percentage.");
//     }
//     if (!data?.invoice_date || data?.invoice_date === "") {
//       return toast.warn("Invoice Date is mandatory.");
//     }

//     const response = await apiCallBack("POST", "po/btn/BillsMaterialHybridByDO", doForm, token);
//     console.log("response2", response);
//     if (response?.status) {
//       toast.success(response?.message);
//       setDoForm(initialData);
//       navigate(`/invoice-and-payment-process/${id}`);
//     } else {
//       toast.error(response?.message);
//     }
//   } catch (error) {
//     toast.error("Error:", error);
//   }
// };

// SERVICE BTN

export const actionHandlerByDO = async (doForm, setDoForm, initialData, data, navigate, id, token) => {
  try {
    doForm.purchasing_doc_no = id;

    // ===================== VALIDATIONS =====================
    if (!doForm?.assign_to) return toast.warn("Please choose the finance authority.");
    if (!doForm?.ld_ge_date) return toast.warn("Please select gate entry date.");
    if (!doForm?.contractual_ld) return toast.warn("Please select contractual delivery date.");
    if (!doForm?.max_ld || doForm?.max_ld === "select") return toast.warn("Please select Max LD.");
    if (!doForm?.max_penalty || doForm?.max_penalty === "select") return toast.warn("Please select Max Penalty.");
    if (!doForm?.o_ret_per) return toast.warn("Please fill retention percentage.");
    // Any Other Deduction validation
    if (doForm?.any_other_deduction_type) {
      if (!doForm?.any_other_deduction_value) return toast.warn("Please enter Any Other Deduction value.");
      if (!doForm?.any_other_deduction_remarks?.trim()) return toast.warn("Please provide remarks for Any Other Deduction.");
    }
    // ✅ Any Other Retention validation
    if (doForm?.any_other_retension_type) {
      if (!doForm?.any_other_retension_value) return toast.warn("Please enter Any Other Retention value.");
      if (!doForm?.any_other_retension_remarks?.trim()) return toast.warn("Please provide remarks for Any Other Retention.");
    }
    if (!doForm?.remarks?.trim()) return toast.warn("Please enter remarks.");

    // ===================== PREPARE PAYLOAD =====================
    const payload = {
      btn_num: doForm.btn_num,
      purchasing_doc_no: id,
      assign_to: doForm.assign_to,
      ld_ge_date: doForm.ld_ge_date,
      contractual_ld: doForm.contractual_ld,
      max_ld: doForm.max_ld,
      max_penalty: doForm.max_penalty,
      ld_amount: doForm.ld_amount || 0,
      drg_penalty: doForm.drg_penalty || 0,
      qap_penalty: doForm.qap_penalty || 0,
      ilms_penalty: doForm.ilms_penalty || 0,
      p_sdbg_amount: doForm.p_sdbg_amount || 0,
      p_estimate_amount: doForm.p_estimate_amount || 0,
      o_ret_per: doForm.o_ret_per || 0,
      other_deduction: doForm.other_deduction || 0,
      total_deduction: doForm.total_deduction || 0,
      net_payable_amount: doForm.net_payable_amount || 0,
      remarks: doForm.remarks || "",

      // Any Other Deduction
      any_other_deduction_amount: doForm.any_other_deduction_amount || 0,
      any_other_deduction_rate: doForm.any_other_deduction_type === "percent" ? doForm.any_other_deduction_value : null,
      any_other_deduction_remarks: doForm.any_other_deduction_remarks || "",

      // ✅ FILE FIELDS - Direct from state
      any_other_deduction_filename: doForm.any_other_deduction_filename || "",
      any_other_deduction_file_path: doForm.any_other_deduction_file_path || "",
      any_other_deduction_file_id: doForm.any_other_deduction_file_id || "",

      any_other_retension_amount: doForm.any_other_retension_amount || 0,
      any_other_retension_rate: doForm.any_other_retension_type === "percent" ? doForm.any_other_retension_value : null,
      any_other_retension_remarks: doForm.any_other_retension_remarks || "",
      any_other_retension_filename: doForm.any_other_retension_filename || "",
      any_other_retension_file_path: doForm.any_other_retension_file_path || "",
      any_other_retension_file_id: doForm.any_other_retension_file_id || "",
    };

    console.log("🚀 Final Payload Sent:", payload);

    const response = await apiCallBack("POST", "po/btn/BillsMaterialHybridByDO", payload, token);

    if (response?.status) {
      toast.success(response?.message || "BTN Approved Successfully");
      setDoForm(initialData);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message || "Failed to submit");
    }
  } catch (error) {
    console.error("Error in actionHandlerByDO:", error);
    toast.error("Something went wrong!");
  }
};

export const actionHandlerServiceBTN = async (flag, token, user, id, form, setForm, data, navigate) => {
  try {
    const {
      wdc_number,
      invoice_type,
      invoice_no,
      invoice_date,
      invoice_filename,
      suppoting_invoice_filename,
      invoice_value,
      debit_credit_filename,
      debit_note,
      credit_note,
      net_claim_amount,
      net_claim_amt_gst,
      cgst,
      sgst,
      igst,
      hsn_gstn_icgrn,
      bill_certifing_authority,
      agree_to_declaration,
      total_price,
      outside,
      units,
    } = form;

    // Validation for multiple WDC numbers
    if (!wdc_number || wdc_number.length === 0) {
      return toast.warn("At least one WDC number is mandatory.");
    }
    if (!bill_certifing_authority || bill_certifing_authority === "") {
      return toast.warn("Please choose GRSE officer.");
    }
    if (!invoice_type || invoice_type.trim() === "") {
      return toast.warning("Please choose Invoice Type.");
    }
    if (!invoice_no || invoice_no === "") {
      return toast.warning("Invoice number is mandatory.");
    }
    if (!invoice_date || invoice_date === "") {
      return toast.warning("Invoice date is mandatory.");
    }
    if (!invoice_filename || invoice_filename === "") {
      return toast.warning("Invoice file is mandatory.");
    }
    if (!invoice_value || invoice_value.trim() === "") {
      return toast.warning("Basic Value is mandatory.");
    }
    if (!agree_to_declaration) {
      return toast.warning("Please check to agree the Declaration.");
    }
    if (!hsn_gstn_icgrn) {
      return toast.warning("Please check the HSN code, GSTIN, Tax rate is as per PO.");
    }
    if ((parseFloat(debit_note) > 0 || parseFloat(credit_note) > 0) && !debit_credit_filename) {
      return toast.warning("Debit/Credit Note file is mandatory.");
    }
    if (!data?.wdcDetails) {
      return toast.warn("Please select and check WDC details.");
    }
    const { esi_compliance, pf_compliance, wages_compliance } = data.wdcDetails;
    if (parseInt(total_price) !== parseInt(net_claim_amount)) {
      return toast.warn("Total price and net claim amount should be equal!");
    }
    if (pf_compliance !== "NA" && pf_compliance !== "Y") {
      return toast.warning("PF Compliance is mandatory!");
    }
    if (esi_compliance !== "NA" && esi_compliance !== "Y") {
      return toast.warning("ESI Compliance is mandatory!");
    }
    if (wages_compliance !== "NA" && wages_compliance !== "Y") {
      return toast.warning("WAGES Compliance is mandatory!");
    }
    if (!outside && (!units || units.length === 0)) {
      return toast.warn("Please select units or check OUTSIDE GRSE.");
    }

    // Use FormData to handle file uploads
    const fDToSend = new FormData();
    fDToSend.append("purchasing_doc_no", id);
    fDToSend.append("wdc_number", JSON.stringify(wdc_number)); // Send wdc_number as a JSON stringified array
    fDToSend.append("invoice_type", invoice_type);
    fDToSend.append("invoice_no", invoice_no);
    fDToSend.append("invoice_date", invoice_date);
    fDToSend.append("invoice_value", invoice_value);
    fDToSend.append("debit_note", debit_note);
    fDToSend.append("credit_note", credit_note);
    fDToSend.append("net_claim_amount", net_claim_amount);
    fDToSend.append("cgst", cgst);
    fDToSend.append("sgst", sgst);
    fDToSend.append("igst", igst);
    fDToSend.append("net_claim_amt_gst", net_claim_amt_gst);
    fDToSend.append("bill_certifing_authority", bill_certifing_authority);
    fDToSend.append("outside", outside); // Sends true/false as string due to FormData
    fDToSend.append("units", JSON.stringify(units.map((unit) => unit.value)));

    if (invoice_filename) {
      fDToSend.append("invoice_filename", invoice_filename);
    }
    if (suppoting_invoice_filename) {
      fDToSend.append("suppoting_invoice_filename", suppoting_invoice_filename);
    }
    if (debit_credit_filename) {
      fDToSend.append("debit_credit_filename", debit_credit_filename);
    }

    const response = await apiCallBack("POST", "po/btn/submitServiceHybrid", fDToSend, token);

    if (response?.status) {
      toast.success(response?.message);
      setForm(initialDataService);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message);
    }
  } catch (error) {
    console.error(error);
    toast.error("Error: " + error.message);
  }
};

//JCC
// export const actionHandlerJCCBTN = async (
//   flag,
//   token,
//   user,
//   id,
//   form,
//   setForm,
//   navigate
// ) => {
//   try {
//     // Destructuring form fields
//     const {
//       btn_num,
//       purchasing_doc_no,
//       vendor_code,
//       invoice_no,
//       invoice_value,
//       yard,
//       jcc_filename,
//       invoice_filename,
//       invoice_type,
//       invoice_date,
//       bill_certifing_authority,
//       net_claim_amount,
//       jcc_ref_number,
//       jcc_job_start_date,
//       jcc_job_end_date,
//       hsn_gstn_icgrn,
//       remarks,
//       suppoting_invoice_filename, // Added suppoting_invoice_filename to the form
//     } = form;

//     // Validation checks for mandatory fields
//     // if (!purchasing_doc_no || purchasing_doc_no === "") {
//     //   return toast.warn("Purchasing document number is mandatory.");
//     // }
//     // if (!bill_certifing_authority || bill_certifing_authority === "") {
//     //   return toast.warn("Please choose a GRSE officer.");
//     // }
//     // if (!invoice_type || invoice_type.trim() === "") {
//     //   return toast.warning("Please choose Invoice Type.");
//     // }
//     // if (!invoice_no || invoice_no === "") {
//     //   return toast.warning("Invoice number is mandatory.");
//     // }
//     // if (!invoice_filename || invoice_filename === "") {
//     //   return toast.warning("Invoice file is mandatory.");
//     // }
//     // if (!invoice_value || invoice_value.trim() === "") {
//     //   return toast.warning("Basic value is mandatory.");
//     // }
//     // if (!hsn_gstn_icgrn) {
//     //   return toast.warning(
//     //     "Please verify the HSN code, GSTIN, and Tax rate as per the PO."
//     //   );
//     // }

//     // FormData object for submitting form data
//     const formDataToSend = new FormData();
//     formDataToSend.append("purchasing_doc_no", purchasing_doc_no);
//     formDataToSend.append("btn_num", btn_num);
//     formDataToSend.append("vendor_code", vendor_code);
//     formDataToSend.append("invoice_no", invoice_no);
//     formDataToSend.append("invoice_value", invoice_value);
//     formDataToSend.append("yard", yard);
//     formDataToSend.append("jcc_ref_number", jcc_ref_number);
//     formDataToSend.append("jcc_job_start_date", jcc_job_start_date);
//     formDataToSend.append("jcc_job_end_date", jcc_job_end_date);
//     formDataToSend.append("hsn_gstn_icgrn", hsn_gstn_icgrn);
//     formDataToSend.append("remarks", remarks);
//     formDataToSend.append("bill_certifing_authority", bill_certifing_authority);
//     formDataToSend.append("net_claim_amount", net_claim_amount);
//     formDataToSend.append("invoice_type", invoice_type);
//     formDataToSend.append("invoice_date", invoice_date);

//     // Attach files if they exist
//     if (invoice_filename) {
//       formDataToSend.append("invoice_filename", invoice_filename);
//     }
//     if (suppoting_invoice_filename) {
//       formDataToSend.append(
//         "suppoting_invoice_filename",
//         suppoting_invoice_filename
//       ); // Add supporting invoice file
//     }
//     if (jcc_filename) {
//       formDataToSend.append("jcc_filename", jcc_filename);
//     }

//     // API call
//     const response = await apiCallBack(
//       "POST",
//       "po/btn/jcc-submit",
//       formDataToSend,
//       token
//     );

//     // Handle response
//     if (response?.status) {
//       toast.success(response?.message);
//       setForm(initialDataService); // Reset form to initial state
//       navigate(`/invoice-and-payment-process/${id}`); // Redirect to appropriate page
//     } else {
//       toast.error(response?.message);
//     }
//   } catch (error) {
//     console.error("Error in actionHandlerJCCBTN:", error);
//     toast.error("An error occurred: " + error.message);
//   }
// };
export const actionHandlerServiceByEmp = async (empForm, grnsesData, setEmpForm, initialEmpData, navigate, id, token, form, remarksforword) => {
  try {
    const {
      finance_authority,
      other_deduction,
      max_ld,
      retension_rate,
      retension_amount,
      retension_remarks,
      btn_num,
      type,
      number,
      estimatedLD,
      deduction_remarks,
      total_deduction,
      net_payable_amount,
      check_wdc_number,
      grn_no,
    } = empForm;
    const { total_price } = grnsesData;
    const { net_claim_amount } = form;
    if (!finance_authority || finance_authority === "") {
      return toast.warn("Please choose the finance authority.");
    }
    console.log("total_price-net_claim_amount: ", total_price, net_claim_amount);
    if (!total_price || total_price === "") {
      return toast.warn("Service entry sheet value or GRN Value is mandatory.");
    }
    // if (Number(total_price) !== Number(net_claim_amount)) {
    //   return toast.warn("SES/GRN Value and Net Claim Amount should be matched.");
    // }
    if (Math.round(parseFloat(total_price)) !== Math.round(parseFloat(net_claim_amount))) {
      return toast.warn("SES/GRN Value and Net Claim Amount should be matched.");
    }
    // if (!other_deduction || other_deduction === "") {
    //   return toast.warn("Please fill retension percentage.");
    // }
    if (max_ld === "" || max_ld === undefined || max_ld === null) {
      return toast.warn("Please select Max LD.");
    }
    if (!remarksforword) {
      return toast.warn("Please enter remarks for approval.");
    }

    let payload = {
      purchasing_doc_no: id,
      btn_num: btn_num,
      assign_to: finance_authority,
      // entry_type: type === TYPE_SERVICE ? "service-entry" : type === TYPE_GRN ? "grn" : null,
      // entry_number: number,
      check_wdc_number,
      grn_no,
      max_ld,
      estimated_ld: estimatedLD,
      retension_rate,
      retension_amount,
      retension_remarks,
      other_deduction,
      deduction_remarks,
      total_deduction,
      net_payable_amount,
      remarks: remarksforword,
    };

    const response = await apiCallBack("POST", "po/btn/submitSBtnByCAuthorty", payload, token);
    if (response?.status) {
      toast.success(response?.message);
      setEmpForm(initialEmpData);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message);
    }
  } catch (error) {
    console.error("err", error);
    toast.error("Error:", error);
  }
};

// Advance bill hybrid paylod submit button
export const actionHandlerAdvancebill = async (flag, token, id, form, setForm, navigate) => {
  try {
    const {
      yard,
      stage,
      invoice_type,
      invoice_no,
      invoice_date,
      invoice_filename,
      invoice_value,
      invoice_supporting_filename,
      net_claim_amount,
      cgst,
      sgst,
      igst,
      net_with_gst,
      associated_po,
      hsn_gstn_icgrn,
    } = form;
    if (!hsn_gstn_icgrn) {
      return toast.warning("Please check the HSN code, GSTIN, Tax rate is as per PO.");
    }
    if (!invoice_type || invoice_type === "") {
      return toast.warning("Please select the invoice type!");
    }
    if (!invoice_no || invoice_no === "") {
      return toast.warning("Please fill up the invoice number!");
    }
    if (!invoice_value || invoice_value === "") {
      return toast.warning("Please fill up the basic value!");
    }
    if (!invoice_filename || invoice_filename === "") {
      return toast.warning("Please select the invoice file!");
    }
    let fDToSend = new FormData();
    fDToSend.append("yard", yard);
    fDToSend.append("stage", stage);
    fDToSend.append("purchasing_doc_no", id);
    fDToSend.append("invoice_no", invoice_no);
    fDToSend.append("invoice_value", invoice_value);
    fDToSend.append("invoice_date", new Date(invoice_date).getTime());
    fDToSend.append("invoice_type", invoice_type);
    fDToSend.append("net_claim_amount", net_claim_amount);
    fDToSend.append("net_with_gst", net_with_gst);
    fDToSend.append("cgst", cgst);
    fDToSend.append("sgst", sgst);
    fDToSend.append("igst", igst);
    fDToSend.append("associated_po", associated_po);

    if (invoice_filename) {
      fDToSend.append("invoice_filename", invoice_filename);
    }
    if (invoice_supporting_filename) {
      fDToSend.append("invoice_supporting_filename", invoice_supporting_filename);
    }

    console.log("fDToSend", fDToSend);

    const response = await apiCallBack("POST", "po/btn/submit-abh", fDToSend, token);

    if (response?.status) {
      toast.success(response?.message);
      setForm(initialDataAdvance);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message);
    }
  } catch (error) {
    toast.error("Error:", error);
  }
};

export const actionHandlerAdvancebillPayment = async (flag, token, id, form, setForm, navigate) => {
  try {
    const { yard, stage, invoice_type, invoice_no, invoice_date, invoice_value, net_claim_amount, invoice_filename, suppoting_invoice_filename, hsn_gstn_taxrate } = form;

    // Validation for mandatory fields
    if (!hsn_gstn_taxrate) {
      return toast.warning("Please check the HSN code, GSTIN, Tax rate is as per PO.");
    }
    if (!invoice_type || invoice_type === "") {
      return toast.warning("Please select the invoice type!");
    }
    if (!invoice_no || invoice_no === "") {
      return toast.warning("Please fill up the invoice number!");
    }
    if (!invoice_value || invoice_value === "") {
      return toast.warning("Please fill up the basic value!");
    }
    if (!invoice_filename || invoice_filename === null) {
      return toast.warning("Please select the invoice file!");
    }

    // Prepare FormData for API submission
    let fDToSend = new FormData();
    fDToSend.append("purchasing_doc_no", id);
    fDToSend.append("invoice_no", invoice_no);
    fDToSend.append("invoice_date", new Date(invoice_date).getTime());
    fDToSend.append("invoice_value", invoice_value);
    fDToSend.append("net_claim_amount", net_claim_amount);
    fDToSend.append("invoice_type", invoice_type);
    fDToSend.append("yard", yard);
    fDToSend.append("stage", stage);
    fDToSend.append("hsn_gstn_taxrate", hsn_gstn_taxrate ? "1" : "0");

    if (invoice_filename) {
      fDToSend.append("invoice_filename", invoice_filename);
    }
    if (suppoting_invoice_filename) {
      fDToSend.append("suppoting_invoice_filename", suppoting_invoice_filename);
    }

    console.log("fDToSend", fDToSend);

    // API call to submit form data
    const response = await apiCallBack("POST", "po/btn/submit-adv-bill-against-bg", fDToSend, token);

    if (response?.status) {
      toast.success(response?.message);
      setForm({
        invoice_no: "",
        invoice_date: null,
        invoice_value: "",
        net_claim_amount: "",
        invoice_type: "",
        invoice_filename: null,
        suppoting_invoice_filename: null,
        yard: "",
        stage: "",
        hsn_gstn_taxrate: false,
        cgst: "",
        sgst: "",
        igst: "",
        vendor_code: form.vendor_code,
        vendor_name: form.vendor_name,
        vendor_gstno: form.vendor_gstno,
      });
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.error(response?.message || "Failed to submit the form.");
    }
  } catch (error) {
    toast.error(`Error: ${error.message}`);
  }
};
