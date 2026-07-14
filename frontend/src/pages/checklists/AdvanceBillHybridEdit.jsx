import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiCallBack } from "../../utils/fetchAPIs";
import { toast } from "react-toastify";
import DynamicButton from "../../Helpers/DynamicButton";
import { FaCaretLeft } from "react-icons/fa";
import BTNAdvanceVendorInfo from "../../components/BTNAdvanceVendorInfo";
import Header from "../../components/Header";
import SideBar from "../../components/SideBar";
import Footer from "../../components/Footer";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { formatDate, convertToEpoch } from "../../utils/getDateTimeNow";
import HrSearchableSelect from "../../components/HrSearchableSelect";

const initialDODataAdvance = {
  btn_num: "",
  purchasing_doc_no: "",
  basic_amount: 0,
  a_drawing_date: "",
  c_drawing_date: "",
  drg_penalty_pct: "0.25",
  max_ld: "0",
  p_drg_amount: 0,
  retention_rate: "0",
  retention_amount: 0,
  retention_remarks: "",
  other_deduction: "0",
  deduction_remarks: "",
  total_deduction: 0,
  net_payable_amount: 0,
  assign_to: "",
  recomend_payment: "YES",
};

const AdvanceBillHybridEdit = () => {
  const navigate = useNavigate();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const { state } = useLocation();

  const [data, setData] = useState(null);
  const [emp, setEmp] = useState([]);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [doForm, setDoForm] = useState(initialDODataAdvance);
  const [form, setForm] = useState(null);

  // Fetch bill details by BTN number
  const getDataByBTN = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/adv-bill-against-bg?type=details&btn_num=${state}`, null, token);
      if (response?.status && response?.data && response.data.length > 0) {
        const billData = response.data[0];
        setData(billData);
        setDoForm((prevForm) => ({
          ...prevForm,
          btn_num: state,
          purchasing_doc_no: id || "",
          basic_amount: parseFloat(billData.net_claim_amount) || 0,
          a_drawing_date: billData.a_drawing_date || "",
          c_drawing_date: billData.c_drawing_date || "",
        }));
      } else {
        toast.error("Error fetching bill details");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching bill details");
    }
  };

  // Fetch finance employee list for dropdown
  const getEmp = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/getFinanceEmpList`, null, token);
      if (response?.status) {
        const options = response.data.map((item) => ({
          value: item.usercode,
          label: `${item.empname} (${item.usercode})`,
        }));
        setEmp(options);
      } else {
        toast.error("Error fetching employee list");
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
      toast.error("Error fetching employee list");
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    getDataByBTN();
    getEmp();
  }, [state, token, id]);

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/adv-bill-against-bg?type=init&poNo=${id}`, null, token);

      if (response?.status && response?.data) {
        const bgFilePath = response.data.bgData && response.data.bgData.length > 0 ? response.data.bgData[0].file_path : "";

        setForm((prevForm) => ({
          ...prevForm,
          vendor_code: response.data.vendor_code || "",
          vendor_name: response.data.vendor_name || "",
          vendor_gstno: response.data.vendor_gstno || "",
          bg_file_path: bgFilePath,
        }));
      } else {
        console.error("API response failed:", response?.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // Calculate penalty for drawing submission delay
  useEffect(() => {
    const { a_drawing_date, c_drawing_date, basic_amount, drg_penalty_pct, max_ld } = doForm;
    if (a_drawing_date && c_drawing_date && basic_amount) {
      const actualDate = parseInt(a_drawing_date);
      const contractualDate = parseInt(c_drawing_date);
      const weeksDelayed = Math.max(0, Math.ceil((actualDate - contractualDate) / (7 * 24 * 60 * 60 * 1000)));
      const penaltyRate = Number(drg_penalty_pct) / 100; // 0.25% per week
      const maxPenaltyRate = Number(max_ld) / 100; // Max 1% or 2%
      let penaltyAmount = weeksDelayed * penaltyRate * basic_amount;
      const maxPenaltyAmount = maxPenaltyRate * basic_amount;
      penaltyAmount = Math.min(penaltyAmount, maxPenaltyAmount);
      penaltyAmount = Math.max(0, Math.round(penaltyAmount));

      setDoForm((prevForm) => ({
        ...prevForm,
        p_drg_amount: penaltyAmount,
        total_deduction: penaltyAmount + Number(prevForm.other_deduction),
      }));
    }
  }, [doForm.a_drawing_date, doForm.c_drawing_date, doForm.basic_amount, doForm.drg_penalty_pct, doForm.max_ld]);

  // Calculate retention and net payable amount
  useEffect(() => {
    const { p_drg_amount, retention_rate, basic_amount, other_deduction } = doForm;
    if (basic_amount) {
      const retentionAmount = (Number(retention_rate) / 100) * basic_amount;
      const totalDeduction = Number(p_drg_amount) + Number(other_deduction);
      const netPayableAmount = basic_amount - totalDeduction - retentionAmount;

      setDoForm((prev) => ({
        ...prev,
        retention_amount: Math.round(retentionAmount),
        total_deduction: Math.round(totalDeduction),
        net_payable_amount: Math.round(netPayableAmount),
      }));
    }
  }, [doForm.p_drg_amount, doForm.retention_rate, doForm.basic_amount, doForm.other_deduction]);

  // Handle form submission
  const handleSubmit = async (e) => {
    if (!doForm.assign_to) {
      toast.error("Please select a Finance Authority.");
      return;
    }
    if (!doForm.recomend_payment) {
      toast.error("Please select a Recommended Payment option.");
      return;
    }
    if (Number(doForm.retention_rate) > 0 && !doForm.retention_remarks) {
      toast.error("Please provide remarks for retention.");
      return;
    }
    if (Number(doForm.other_deduction) > 0 && !doForm.deduction_remarks) {
      toast.error("Please provide remarks for other deductions.");
      return;
    }

    const payload = {
      btn_num: doForm.btn_num,
      purchasing_doc_no: doForm.purchasing_doc_no,
      basic_amount: doForm.basic_amount.toString(),
      drg_penalty: doForm.p_drg_amount.toString(),
      drg_penalty_pct: doForm.drg_penalty_pct,
      max_penalty: doForm.max_ld,
      total_deduction: doForm.total_deduction.toString(),
      retention_amount: doForm.retention_amount.toString(),
      retention_rate: doForm.retention_rate,
      retention_remarks: doForm.retention_remarks,
      other_deduction: doForm.other_deduction.toString(),
      deduction_remarks: doForm.deduction_remarks,
      net_payable_amount: doForm.net_payable_amount.toString(),
      created_at: convertToEpoch(new Date()) * 1000,
      created_by: user?.vendor_code,
      assign_to: doForm.assign_to,
      recomend_payment: doForm.recomend_payment,
    };

    try {
      const response = await apiCallBack("POST", "po/btn/submit-adv-bill-against-bg-do", payload, token);
      if (response?.status) {
        toast.success(response?.message || "Bill submitted successfully");
        setDoForm(initialDODataAdvance);
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.error(response?.message || "Submission failed.");
      }
    } catch (error) {
      toast.error("An error occurred during submission.");
      console.error("Error submitting form:", error);
    }
  };

  // Handle bill rejection
  const rejectBTN = async () => {
    if (!remarks) {
      toast.error("Please provide remarks for rejection.");
      return;
    }

    try {
      const payload = {
        btn_num: state,
        status: "REJECTED",
        rejectedMessage: remarks,
        purchasing_doc_no: id,
      };
      const response = await apiCallBack("POST", "po/btn/submit-adv-bill-against-bg-do", payload, token);
      if (response.status) {
        toast.success(response.message || "Rejected successfully");
        setRemarks("");
        setShowRemarks(false);
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
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="wrapper d-flex flex-column flex-row-fluid">
          <Header title="Advance Bill" id={id} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                <form>
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card">
                        <h3 className="d-flex align-items-center m-3">
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
                        <BTNAdvanceVendorInfo navigate={navigate} id={id} data={data} form={form} />
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
                                          value={doForm.assign_to}
                                          onChange={(val) =>
                                            setDoForm({
                                              ...doForm,
                                              assign_to: val ? val.value : "",
                                            })
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
                                      <td>Basic Amount (Excl. GST)</td>
                                      <td className="btn_value">
                                        <b>₹ {doForm.basic_amount || 0}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Retention (%)</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          name="retention_rate"
                                          className="form-control"
                                          value={doForm.retention_rate}
                                          onChange={(e) => {
                                            let value = e.target.value;
                                            if (Number(value) > 10) value = "10";
                                            if (Number(value) < 0) value = "0";
                                            setDoForm({
                                              ...doForm,
                                              retention_rate: value,
                                            });
                                          }}
                                          onWheel={inputOnWheelPrevent}
                                          min="0"
                                          max="10"
                                        />
                                        <span className="ms-1">%</span>
                                        <span className="ms-2">Retention Amount: ₹ {doForm.retention_amount}</span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Remarks for Retention</td>
                                      <td>
                                        <textarea
                                          name="retention_remarks"
                                          className="form-control"
                                          value={doForm.retention_remarks}
                                          onChange={(e) =>
                                            setDoForm({
                                              ...doForm,
                                              retention_remarks: e.target.value,
                                            })
                                          }
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Other Deduction</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          name="other_deduction"
                                          className="form-control"
                                          value={doForm.other_deduction}
                                          onChange={(e) =>
                                            setDoForm({
                                              ...doForm,
                                              other_deduction: e.target.value,
                                            })
                                          }
                                          onWheel={inputOnWheelPrevent}
                                          min="0"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Deduction Remarks</td>
                                      <td>
                                        <textarea
                                          name="deduction_remarks"
                                          className="form-control"
                                          value={doForm.deduction_remarks}
                                          onChange={(e) =>
                                            setDoForm({
                                              ...doForm,
                                              deduction_remarks: e.target.value,
                                            })
                                          }
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Penalty for Drawing Submission</td>
                                      <td className="btn_value">
                                        <div className="me-3">
                                          <label htmlFor="DADD">Actual Delivery Date:</label>
                                          <p>
                                            <b>{doForm.a_drawing_date && formatDate(doForm.a_drawing_date)}</b>
                                          </p>
                                        </div>
                                        <div className="me-3">
                                          <label htmlFor="DCDD">Contractual Delivery Date:</label>
                                          <p>
                                            <b>{doForm.c_drawing_date && formatDate(doForm.c_drawing_date)}</b>
                                          </p>
                                        </div>
                                        <div>
                                          <label>Penalty Rate (0.25% per week):</label>
                                          <p>₹ {doForm.p_drg_amount || 0}</p>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        <div className="d-flex gap-2 align-items-center">
                                          <span>Max Penalty </span>
                                          <select
                                            name="max_ld"
                                            className="form-select"
                                            style={{ maxWidth: "100px" }}
                                            value={doForm.max_ld}
                                            onChange={(e) =>
                                              setDoForm({
                                                ...doForm,
                                                max_ld: e.target.value,
                                              })
                                            }
                                          >
                                            <option value="0">0%</option>
                                            <option value="1">1%</option>
                                            <option value="2">2%</option>
                                          </select>
                                        </div>
                                      </td>
                                      <td className="btn_value">
                                        <p>₹ {doForm.basic_amount * (Number(doForm.max_ld) / 100) || 0}</p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Total Deductions</td>
                                      <td>
                                        <b>₹ {isNaN(doForm.total_deduction) ? 0 : doForm.total_deduction}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Net Payable Amount</td>
                                      <td>
                                        <b>₹ {isNaN(doForm.net_payable_amount) ? 0 : doForm.net_payable_amount}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Recommend Payment</td>
                                      <td>
                                        <select
                                          name="recomend_payment"
                                          className="form-select"
                                          value={doForm.recomend_payment}
                                          onChange={(e) =>
                                            setDoForm({
                                              ...doForm,
                                              recomend_payment: e.target.value,
                                            })
                                          }
                                        >
                                          <option value="YES">Yes</option>
                                          <option value="NO">No</option>
                                        </select>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <p>Certified that Invoice has been verified w.r.t PO and recommended for release of payment subject to statutory deduction</p>
                              <div className="row">
                                <div className="col-6 text-start">
                                  <DynamicButton label="Submit" onClick={handleSubmit} className="btn fw-bold btn-primary me-3" />
                                  <button className="btn btn-sm btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                    BACK
                                  </button>
                                </div>
                                <div className="col-6 text-end">
                                  {showRemarks ? (
                                    <>
                                      <textarea
                                        placeholder="Enter remarks for rejection"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="form-control mb-2"
                                      />
                                      <DynamicButton label="Submit Rejection" className="btn fw-bold btn-danger" onClick={rejectBTN} />
                                    </>
                                  ) : (
                                    <DynamicButton label="Reject" className="btn fw-bold btn-danger" onClick={() => setShowRemarks(true)} />
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
  );
};

export default AdvanceBillHybridEdit;
