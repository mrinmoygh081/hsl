import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { actionHandlerByDO, getGrnIcgrnByInvoice } from "../../Helpers/BTNChecklist";
import { calculateNetPay, calculatePenalty, checkTypeArr } from "../../utils/smallFun";
import { apiCallBack } from "../../utils/fetchAPIs";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { convertToEpoch, formatDashedDate, formatDate } from "../../utils/getDateTimeNow";
import BTNMaterialVendorInfo from "../../components/BTNMaterialVendorInfo";
import { initialDOData, initialData } from "../../data/btnData";
import DynamicButton from "../../Helpers/DynamicButton";
import { toast } from "react-toastify";
import { FaCaretLeft } from "react-icons/fa";
import HrSearchableSelect from "../../components/HrSearchableSelect";
import FileUploadWithProgress from "../../utils/FileUploadWithProgress";
import FileUploadInfoPopup from "../../Helpers/FileUploadInfoPopup";

const AnyOtherDynamicFields = ({ typeKey, valueKey, amountKey, remarksKey, fileKey, filenameKey, filepathKey, fileidKey, doForm, setDoForm, netClaimAmount, token, id }) => {
  const [showInfo, setShowInfo] = useState(false);
  const currentType = doForm?.[typeKey];

  return (
    <div className="d-flex flex-wrap gap-3 align-items-start">
      {/* Percent Input */}
      {currentType === "percent" && (
        <div>
          <label>Percentage (0% - 40%):</label>
          <div className="d-flex align-items-center gap-1">
            <input
              type="number"
              className="form-control"
              style={{ maxWidth: "100px" }}
              min="0"
              max="40"
              step="0.01"
              value={doForm?.[valueKey] || ""}
              onWheel={inputOnWheelPrevent}
              onChange={(e) => {
                let value = parseFloat(e.target.value) || 0;
                if (value > 40) value = 40;
                if (value < 0) value = 0;
                const net = parseFloat(netClaimAmount) || 0;
                const calculated = parseFloat(((net * value) / 100).toFixed(2));
                setDoForm((prev) => ({
                  ...prev,
                  [valueKey]: value,
                  [amountKey]: calculated,
                }));
              }}
            />
            <span>%</span>
          </div>
        </div>
      )}

      {/* Price Input */}
      {currentType === "price" && (
        <div>
          <label>Amount (₹):</label>
          <input
            type="number"
            className="form-control"
            style={{ maxWidth: "150px" }}
            min="0"
            value={doForm?.[valueKey] || ""}
            onWheel={inputOnWheelPrevent}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setDoForm((prev) => ({
                ...prev,
                [valueKey]: value,
                [amountKey]: value,
              }));
            }}
          />
        </div>
      )}

      {/* Remarks */}
      {currentType && (
        <div>
          <label>Remarks (Reason):</label>
          <textarea
            type="text"
            className="form-control"
            style={{ minWidth: "220px" }}
            placeholder="Enter reason..."
            value={doForm?.[remarksKey] || ""}
            onChange={(e) =>
              setDoForm((prev) => ({
                ...prev,
                [remarksKey]: e.target.value,
              }))
            }
          />
        </div>
      )}

      {/* Calculated Amount */}
      {currentType && (
        <div>
          <label>Amount:</label>
          <p>
            <b>₹ {doForm?.[amountKey] || 0}</b>
          </p>
        </div>
      )}

      {/* File Upload */}
      {currentType && (
        <div>
          <label className="d-flex align-items-center gap-2">
            Document (Optional):
            <span onClick={() => setShowInfo(true)} style={{ cursor: "pointer", color: "#6b7280" }} title="View upload instructions">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
          </label>

          {/* ✅ Popup */}
          <FileUploadInfoPopup
            show={showInfo}
            onClose={() => setShowInfo(false)}
            warningText="Uploading incorrect documents may lead to rejection of the BTN. Please ensure the document is relevant to the deduction/retention applied."
          />
          <FileUploadWithProgress
            showInfoIcon={false}
            token={token}
            vendorCode={id}
            uploadedFile={doForm?.[fileKey]}
            onUploadSuccess={(response) => {
              const fileData = response?.data || response;
              const file_id = fileData?.file_id || fileData?.id || "";
              const fileName = fileData?.fileName || fileData?.file_name || fileData?.originalName || "";
              const filePath = fileData?.filePath || fileData?.file_path || "";
              const newFileObj = { file_id, fileName, filePath, file_name: fileName, file_path: filePath };
              setDoForm((prev) => ({
                ...prev,
                [fileKey]: newFileObj,
                [filenameKey]: fileName,
                [filepathKey]: filePath,
                [fileidKey]: file_id,
              }));
            }}
            onDelete={() =>
              setDoForm((prev) => ({
                ...prev,
                [fileKey]: null,
                [filenameKey]: "",
                [filepathKey]: "",
                [fileidKey]: "",
              }))
            }
          />
          {doForm?.[filenameKey] && <small className="text-success d-block mt-1">✓ File: {doForm?.[filenameKey]}</small>}
        </div>
      )}
    </div>
  );
};

const BillsMaterialHybridEdit = () => {
  const navigate = useNavigate();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const { state } = useLocation();

  const [impDates, setImpDates] = useState(null);
  const [data, setData] = useState(null);
  initialDOData.btn_num = state;
  const [form, setForm] = useState(initialData);
  const [doForm, setDoForm] = useState(initialDOData);
  const [emp, setEmp] = useState([]);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  console.log(doForm, "doForm");

  const getBTNData = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setImpDates(d?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  const getDataByBTN = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/btn_num?id=${id}&btn_num=${state}`, null, token);
      if (d?.status && checkTypeArr(d?.data)) {
        setData(d?.data[0]);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  useEffect(() => {
    let net = data?.net_claim_amount;
    let netWithGST = data?.net_with_gst;

    if (net && netWithGST) {
      let report = calculateNetPay(
        net,
        netWithGST,
        doForm?.ld_amount,
        doForm?.p_sdbg_amount,
        doForm?.drg_penalty,
        doForm?.qap_penalty,
        doForm?.ilms_penalty,
        doForm?.o_ret_per,
        doForm?.p_estimate_amount,
      );
      const anyOtherDeduction = parseFloat(doForm?.any_other_deduction_amount) || 0;
      const anyOtherRetention = parseFloat(doForm?.any_other_retension_amount) || 0;
      const totalDeduction = (parseFloat(report?.deduct) || 0) + anyOtherDeduction + anyOtherRetention;
      const netPayable = (parseFloat(report?.net_pay) || 0) - anyOtherDeduction - anyOtherRetention;

      setDoForm((prevForm) => ({
        ...prevForm,
        total_deduction: totalDeduction,
        net_payable_amount: netPayable,
        other_deduction: report?.other,
      }));
    }
  }, [
    data?.net_claim_amount,
    data?.net_with_gst,
    doForm?.ld_amount,
    doForm?.o_ret_per,
    doForm?.p_estimate_amount,
    doForm?.any_other_deduction_amount,
    doForm?.any_other_retension_amount,
  ]);

  const getEmp = async () => {
    try {
      const data = await apiCallBack("GET", `po/btn/getFinanceEmpList`, null, token);
      if (data?.status) {
        let options = data.data.map((item, index) => {
          return {
            value: item.usercode,
            label: `${item.empname} (${item.usercode})`,
          };
        });
        setEmp(options);
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
    }
  };

  const getGateEntryInfo = async (invoice_no) => {
    let response = await getGrnIcgrnByInvoice(id, invoice_no, token);
    console.log("response", response);
    if (response.status && response?.data?.gate_entry_date) {
      const gate_entry_date = formatDashedDate(response?.data?.gate_entry_date);
      setDoForm((prev) => ({
        ...prev,
        ld_ge_date: gate_entry_date,
      }));
    }
  };

  useEffect(() => {
    getBTNData();
    getDataByBTN();
    getEmp();
  }, []);

  useEffect(() => {
    if (data?.invoice_no) {
      console.log("data?.invoice_no", data?.invoice_no);
      getGateEntryInfo(data?.invoice_no);
    }
  }, [data?.invoice_no]);

  useEffect(() => {
    const { contractual_ld, ld_ge_date } = doForm;
    if (contractual_ld && ld_ge_date && data?.icgrn_total) {
      const icgrnData = data?.icgrn_total;
      const cc = convertToEpoch(new Date(contractual_ld)) * 1000;
      const aa = convertToEpoch(new Date(ld_ge_date)) * 1000;
      let p_amt = calculatePenalty(cc, aa, icgrnData, 0.5, Number(doForm?.max_ld));
      setDoForm((prev) => ({ ...prev, ld_amount: p_amt }));
    }
  }, [doForm?.contractual_ld, doForm?.ld_ge_date, data?.icgrn_total, doForm?.max_ld]);

  useEffect(() => {
    const { a_sdbg_date, a_drawing_date, a_ilms_date, a_qap_date, c_sdbg_date, c_drawing_date, c_ilms_date, c_qap_date } = form;
    let p_sdbg = 0;
    let p_drg = 0;
    let p_qap = 0;
    let p_ilms = 0;
    let p_estimate = 0;

    if (data?.icgrn_total) {
      const icgrnData = data?.icgrn_total;

      if (a_drawing_date && c_drawing_date && icgrnData) {
        p_drg = calculatePenalty(convertToEpoch(new Date(c_drawing_date)) * 1000, Number(a_drawing_date), icgrnData, 0.25, null);
      }
      if (a_qap_date && c_qap_date && icgrnData) {
        p_qap = calculatePenalty(convertToEpoch(new Date(c_qap_date)) * 1000, Number(a_qap_date), icgrnData, 0.25, null);
      }
      if (a_ilms_date && c_ilms_date && icgrnData) {
        p_ilms = calculatePenalty(convertToEpoch(new Date(c_ilms_date)) * 1000, Number(a_ilms_date), icgrnData, 0.25, null);
      }
      let p_total = p_drg + p_qap + p_ilms;
      console.log("p_total", p_total);
      let max_penalty_amount = (icgrnData * Number(doForm?.max_penalty)) / 100;
      console.log("max_penalty_amount", max_penalty_amount);
      p_estimate = Math.min(p_total, max_penalty_amount);
    }
    setDoForm((prev) => ({
      ...prev,
      p_sdbg_amount: p_sdbg,
      drg_penalty: p_drg,
      qap_penalty: p_qap,
      ilms_penalty: p_ilms,
      p_estimate_amount: p_estimate,
    }));
  }, [form, data?.icgrn_total, doForm?.max_penalty]);

  useEffect(() => {
    if (data) {
      setForm(data);
    }
    if (impDates) {
      setForm({
        ...form,
        c_sdbg_date: impDates?.c_sdbg_date || "",
        c_drawing_date: impDates?.c_drawing_date || "",
        c_qap_date: impDates?.c_qap_date || "",
        c_ilms_date: impDates?.c_ilms_date || "",
        a_sdbg_date: impDates?.a_sdbg_date || "",
        a_drawing_date: impDates?.a_drawing_date || "",
        a_qap_date: impDates?.a_qap_date || "",
        a_ilms_date: impDates?.a_ilms_date || "",
      });
    }
  }, [impDates, data]);

  const rejectBTN = async () => {
    try {
      let payload = {
        btn_num: state,
        status: "REJECTED",
        remarks,
        purchasing_doc_no: id,
      };
      const response = await apiCallBack("POST", "po/btn/BillsMaterialHybridByDO", payload, token);
      if (response.status) {
        toast.success(response.message || "Rejected successfully");
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.error(response.message || "Error rejecting the BTN");
      }
    } catch (error) {
      console.error("Error rejecting the BTN:", error);
      toast.error("Error rejecting the BTN");
    }
  };

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
                  <form>
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card">
                          <h3 className="d-flex align-items-center m-3 styled-header">
                            <button className="btn_icon me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                              <FaCaretLeft className="fs-20" />
                            </button>
                            <span className="header-title">
                              References - PO No: <strong>{id}</strong>
                            </span>
                            <span className="header-space"></span>
                            <span className="header-subtitle ms-4">
                              BTN NO: <strong>{state}</strong>
                            </span>
                          </h3>
                          <BTNMaterialVendorInfo navigate={navigate} id={id} />
                        </div>
                      </div>
                      {isDO && (
                        <div className="col-12">
                          <div className="card">
                            <h3 className="m-3">ENTRY BY DEALING OFFICER:</h3>
                            <div className="card-body p-3">
                              <div className="tab-content">
                                <div className="table-responsive">
                                  <table className="table table-striped table-bordered table_height">
                                    <tbody style={{ maxHeight: "100%" }}>
                                      <tr>
                                        <td>Finance Authority</td>
                                        <td className="btn_value">
                                          <HrSearchableSelect
                                            options={emp}
                                            value={doForm?.assign_to}
                                            onChange={(val) =>
                                              setDoForm((prev) => ({
                                                ...prev,
                                                assign_to: val ? val.value : null,
                                              }))
                                            }
                                            placeholder="Select Finance Authority"
                                            isClearable={true}
                                            className="w-100"
                                          />
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>BTN Number:</td>
                                        <td className="btn_value">
                                          <b>{state}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Liquidated damage{" "}
                                          <div className="d-flex gap-2 align-items-center">
                                            <span>Max LD </span>
                                            <select
                                              name="max_ld"
                                              id=""
                                              className="form-select"
                                              style={{ maxWidth: "100px" }}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setDoForm((prev) => ({
                                                  ...prev,
                                                  max_ld: val,
                                                }));
                                              }}
                                            >
                                              <option value="select">Select LD</option>
                                              <option value="0">0%</option>
                                              <option value="5">5%</option>
                                              <option value="10">10%</option>
                                            </select>
                                          </div>
                                        </td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="GED">Gate Entry Date:</label>
                                            <p>
                                              <b>
                                                {console.log(doForm?.ld_ge_date, "lllllllllllllll")}
                                                {doForm?.ld_ge_date && formatDate(doForm?.ld_ge_date)}
                                              </b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="CLD">Contractual Delivery Date:</label>
                                            <input
                                              type="date"
                                              className="form-control"
                                              id="CLD"
                                              value={doForm?.contractual_ld}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setDoForm((prev) => ({
                                                  ...prev,
                                                  contractual_ld: val,
                                                }));
                                              }}
                                            />
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doForm?.ld_amount}</p>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Penalty for Drawing submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="DADD">Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_drawing_date && formatDate(form?.a_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="DCDD">Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_drawing_date && formatDate(form?.c_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doForm?.drg_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Penalty for QAP submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="QADD">Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_qap_date && formatDate(form?.a_qap_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="QCDD">Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_qap_date && formatDate(form?.c_qap_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doForm?.qap_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Penalty for ILMS submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="LADD">Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_ilms_date && formatDate(form?.a_ilms_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="LCDD">Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_ilms_date && formatDate(form?.c_ilms_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doForm?.ilms_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>
                                          Estimated Penalty{" "}
                                          <div className="d-flex gap-2 align-items-center">
                                            <span>Max Penalty </span>
                                            <select
                                              name="max_penalty"
                                              id=""
                                              className="form-select"
                                              style={{ maxWidth: "100px" }}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                setDoForm((prev) => ({
                                                  ...prev,
                                                  max_penalty: val,
                                                }));
                                              }}
                                            >
                                              <option value="select">Select Penalty</option>
                                              <option value="0">0%</option>
                                              <option value="1">1%</option>
                                              <option value="2">2%</option>
                                              <option value="3">3%</option>
                                              <option value="4">4%</option>
                                              <option value="5">5%</option>
                                            </select>
                                          </div>
                                        </td>
                                        <td className="btn_value">
                                          <p>&#8377; {doForm?.p_estimate_amount}</p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Retension (BG)if any (%)</td>
                                        <td className="btn_value">
                                          <input
                                            type="number"
                                            name="o_ret_per"
                                            className="form-control"
                                            value={doForm?.o_ret_per}
                                            onChange={(e) => {
                                              let value = e.target.value;
                                              if (value > 100) value = 100;
                                              if (value < 0) value = 0;
                                              setDoForm((prev) => ({
                                                ...prev,
                                                o_ret_per: value,
                                              }));
                                            }}
                                            onWheel={inputOnWheelPrevent}
                                            min="0"
                                            max="100"
                                          />
                                          <span className="ms-1">%</span>
                                          <span className="ms-2">Retension Amount: {doForm?.other_deduction}</span>
                                        </td>
                                      </tr>
                                      {/* ===== ANY OTHER DEDUCTION - COMPLETE ROW ===== */}
                                      <tr>
                                        <td>
                                          Any Other Deduction / Retention
                                          <div className="d-flex gap-2 align-items-center mt-1">
                                            <span>Category</span>
                                            <select
                                              className="form-select"
                                              style={{ maxWidth: "180px" }}
                                              value={doForm?.any_other_category || ""}
                                              onChange={(e) => {
                                                const cat = e.target.value;
                                                // Reset both when category changes
                                                setDoForm((prev) => ({
                                                  ...prev,
                                                  any_other_category: cat,
                                                  // Reset deduction
                                                  any_other_deduction_type: "",
                                                  any_other_deduction_value: "",
                                                  any_other_deduction_amount: 0,
                                                  any_other_deduction_remarks: "",
                                                  any_other_deduction_file: null,
                                                  any_other_deduction_filename: "",
                                                  any_other_deduction_file_path: "",
                                                  any_other_deduction_file_id: "",
                                                  // Reset retention
                                                  any_other_retension_type: "",
                                                  any_other_retension_value: "",
                                                  any_other_retension_amount: 0,
                                                  any_other_retension_remarks: "",
                                                  any_other_retension_file: null,
                                                  any_other_retension_filename: "",
                                                  any_other_retension_file_path: "",
                                                  any_other_retension_file_id: "",
                                                }));
                                              }}
                                            >
                                              <option value="">Select Category</option>
                                              <option value="deduction">Any Other Deduction</option>
                                              <option value="retention">Any Other Retention</option>
                                            </select>
                                          </div>
                                          {/* Type dropdown — category select hone ke baad dikhega */}
                                          {doForm?.any_other_category && (
                                            <div className="d-flex gap-2 align-items-center mt-2">
                                              <span>Type</span>
                                              <select
                                                className="form-select"
                                                style={{ maxWidth: "130px" }}
                                                value={doForm?.any_other_category === "deduction" ? doForm?.any_other_deduction_type || "" : doForm?.any_other_retension_type || ""}
                                                onChange={(e) => {
                                                  const newType = e.target.value;
                                                  if (doForm?.any_other_category === "deduction") {
                                                    setDoForm((prev) => ({
                                                      ...prev,
                                                      any_other_deduction_type: newType,
                                                      any_other_deduction_value: "",
                                                      any_other_deduction_amount: 0,
                                                      any_other_deduction_remarks: "",
                                                      any_other_deduction_file: null,
                                                      any_other_deduction_filename: "",
                                                      any_other_deduction_file_path: "",
                                                      any_other_deduction_file_id: "",
                                                    }));
                                                  } else {
                                                    setDoForm((prev) => ({
                                                      ...prev,
                                                      any_other_retension_type: newType,
                                                      any_other_retension_value: "",
                                                      any_other_retension_amount: 0,
                                                      any_other_retension_remarks: "",
                                                      any_other_retension_file: null,
                                                      any_other_retension_filename: "",
                                                      any_other_retension_file_path: "",
                                                      any_other_retension_file_id: "",
                                                    }));
                                                  }
                                                }}
                                              >
                                                <option value="">Select</option>
                                                <option value="percent">Percent (%)</option>
                                                <option value="price">Price (₹)</option>
                                              </select>
                                            </div>
                                          )}
                                        </td>

                                        <td className="btn_value">
                                          {/* ───── DEDUCTION UI ───── */}
                                          {doForm?.any_other_category === "deduction" && (
                                            <AnyOtherDynamicFields
                                              typeKey="any_other_deduction_type"
                                              valueKey="any_other_deduction_value"
                                              amountKey="any_other_deduction_amount"
                                              remarksKey="any_other_deduction_remarks"
                                              fileKey="any_other_deduction_file"
                                              filenameKey="any_other_deduction_filename"
                                              filepathKey="any_other_deduction_file_path"
                                              fileidKey="any_other_deduction_file_id"
                                              doForm={doForm}
                                              setDoForm={setDoForm}
                                              netClaimAmount={data?.net_claim_amount}
                                              token={token}
                                              id={id}
                                            />
                                          )}

                                          {/* ───── RETENTION UI ───── */}
                                          {doForm?.any_other_category === "retention" && (
                                            <AnyOtherDynamicFields
                                              typeKey="any_other_retension_type"
                                              valueKey="any_other_retension_value"
                                              amountKey="any_other_retension_amount"
                                              remarksKey="any_other_retension_remarks"
                                              fileKey="any_other_retension_file"
                                              filenameKey="any_other_retension_filename"
                                              filepathKey="any_other_retension_file_path"
                                              fileidKey="any_other_retension_file_id"
                                              doForm={doForm}
                                              setDoForm={setDoForm}
                                              netClaimAmount={data?.net_claim_amount}
                                              token={token}
                                              id={id}
                                            />
                                          )}
                                        </td>
                                      </tr>
                                      {/* ===== ANY OTHER DEDUCTION END ===== */}
                                      <tr>
                                        <td>Total deductions</td>
                                        <td>
                                          <b>&#8377; {isNaN(doForm?.total_deduction) ? 0 : doForm?.total_deduction}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Net payable amount</td>
                                        <td>
                                          <b>&#8377; {isNaN(doForm?.net_payable_amount) ? 0 : doForm?.net_payable_amount}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Remarks</td>
                                        <td>
                                          <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder="Enter remarks..."
                                            value={doForm?.remarks || ""}
                                            onChange={(e) =>
                                              setDoForm((prev) => ({
                                                ...prev,
                                                remarks: e.target.value,
                                              }))
                                            }
                                            style={{ resize: "vertical", minHeight: "80px" }}
                                          />
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <p>Certified that Invoice has been verified w.r.t PO and recommanded for release of payment subject to satutatory deduction.</p>
                                <div className="row">
                                  <div className="col-6 text-start">
                                    <DynamicButton
                                      label="Approved"
                                      onClick={() => actionHandlerByDO(doForm, setDoForm, initialDOData, data, navigate, id, token)}
                                      className="btn fw-bold btn-primary me-3"
                                    />
                                    <button className="btn btn-sm btn-primary me-3" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                      BACK
                                    </button>
                                  </div>
                                  <div className="col-6 text-end">
                                    {showRemarks ? (
                                      <>
                                        <input type="text" placeholder="Enter remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-control mb-2" />
                                        <DynamicButton label="Submit Rejection" className="btn fw-bold btn-danger" onClick={rejectBTN} />
                                      </>
                                    ) : (
                                      <button className="btn fw-bold btn-danger" onClick={() => setShowRemarks(true)}>
                                        REJECT
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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

export default BillsMaterialHybridEdit;
