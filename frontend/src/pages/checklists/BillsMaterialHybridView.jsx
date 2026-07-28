import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { actionHandlerByDO } from "../../Helpers/BTNChecklist";
import { calculateNetPay, calculatePenalty, checkTypeArr } from "../../utils/smallFun";
import { apiCallBack } from "../../utils/fetchAPIs";
import { formatDate, formatFilePath } from "../../utils/getDateTimeNow";
import { initialDOData, initialData } from "../../data/btnData";
import BTNMaterialVendorInfo from "../../components/BTNMaterialVendorInfo";
import { FaCaretLeft } from "react-icons/fa";

const BillsMaterialHybridView = () => {
  const navigate = useNavigate();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const { state } = useLocation();
  const [doData, setDoData] = useState(null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialData);
  initialDOData.btn_num = state;
  const [doForm, setDoForm] = useState(initialDOData);
  const [loading, setLoading] = useState(false);
  const [impDates, setImpDates] = useState(null);

  const getBTNDOData = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/btn_do?btn_num=${state}`, null, token);
      if (d?.status && checkTypeArr(d?.data)) {
        setDoData(d?.data[0]);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  const getDataByBTN = async () => {
    setLoading(true);
    try {
      const d = await apiCallBack("GET", `po/btn/btn_num?id=${id}&btn_num=${state}`, null, token);
      if (d?.status && checkTypeArr(d?.data)) {
        setData(d?.data[0]);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    getBTNDOData();
    getDataByBTN();
    getBTNData();
  }, []);

  useEffect(() => {
    const { ld_c_date, ld_ge_date, total_price } = doForm;
    if (ld_c_date && ld_ge_date) {
      let p_amt = calculatePenalty(ld_c_date, ld_ge_date, total_price, 0.5, 5);
      setDoForm({ ...doForm, ld_amount: p_amt });
    }
  }, [doForm?.ld_c_date, doForm?.ld_ge_date]);

  console.log("data", data);
  console.log("doData", doData);

  // ✅ Helper — any other deduction ya retention ka data hai ki nahi
  const hasDeduction = doData?.any_other_deduction_amount > 0;
  const hasRetention = doData?.any_other_retension_amount > 0;

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

                      {doData ? (
                        <div className="col-12">
                          <div className="card">
                            <h3 className="m-3">ENTRY BY DEALING OFFICER:</h3>
                            <div className="card-body p-3">
                              <div className="tab-content">
                                <div className="table-responsive">
                                  <table className="table table-striped table-bordered table_height">
                                    <tbody style={{ maxHeight: "100%" }}>
                                      {/* BTN Number */}
                                      <tr>
                                        <td>BTN Number:</td>
                                        <td className="btn_value">
                                          <b>{doData?.btn_num}</b>
                                        </td>
                                      </tr>

                                      {/* Liquidated Damage */}
                                      <tr>
                                        <td>Liquidated damage</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="GED">Gate Entry Date:</label>
                                            <br />
                                            <b>{doData?.ld_ge_date && formatDate(doData?.ld_ge_date * 1000)}</b>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="CLD">Contractual Delivery Date:</label>
                                            <br />
                                            <b>{doData?.contractual_ld && formatDate(doData?.contractual_ld)}</b>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doData?.ld_amount}</p>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Penalty for Drawing */}
                                      <tr>
                                        <td>Penalty for Drawing submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label>Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_drawing_date && formatDate(form?.a_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label>Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_drawing_date && formatDate(form?.c_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doData?.drg_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Penalty for QAP */}
                                      <tr>
                                        <td>Penalty for QAP submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label>Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_qap_date && formatDate(form?.a_qap_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label>Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_qap_date && formatDate(form?.c_qap_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doData?.qap_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Penalty for ILMS */}
                                      <tr>
                                        <td>Penalty for ILMS submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label>Actual Delivery Date:</label>
                                            <p>
                                              <b>{form?.a_ilms_date && formatDate(form?.a_ilms_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label>Contractual Delivery Date:</label>
                                            <p>
                                              <b>{form?.c_ilms_date && formatDate(form?.c_ilms_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Amount:</label>
                                            <p>&#8377; {doData?.ilms_penalty}</p>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Estimated Penalty */}
                                      <tr>
                                        <td>
                                          Estimated Penalty (Max LD: {doData?.max_ld || 0}%, Max Penalty: {doData?.max_penalty || 0}%)
                                        </td>
                                        <td className="btn_value">
                                          <p>
                                            &#8377;{" "}
                                            {Math.min(
                                              (parseFloat(data?.icgrn_total || 0) * Number(doData?.max_penalty || 0)) / 100,
                                              parseFloat(doData?.ilms_penalty || 0) + parseFloat(doData?.qap_penalty || 0) + parseFloat(doData?.drg_penalty || 0),
                                            ).toFixed(2)}
                                          </p>
                                        </td>
                                      </tr>

                                      {/* Retention Amount */}
                                      <tr>
                                        <td>Retention Amount</td>
                                        <td className="btn_value">
                                          <b>&#8377; {doData?.other_deduction || 0}</b>
                                        </td>
                                      </tr>

                                      {/* ✅ Any Other Deduction */}
                                      <tr>
                                        <td>Any Other Deduction</td>
                                        <td className="btn_value">
                                          {hasDeduction ? (
                                            <div className="d-flex flex-wrap gap-3 align-items-start">
                                              {/* Amount */}
                                              <div>
                                                <label className="text-muted" style={{ fontSize: "12px" }}>
                                                  Deduction Amount:
                                                </label>
                                                <p className="mb-0">
                                                  <b>&#8377; {doData?.any_other_deduction_amount}</b>
                                                </p>
                                              </div>

                                              {/* Rate — sirf percent type mein hoga */}
                                              {doData?.any_other_deduction_rate && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Rate:
                                                  </label>
                                                  <p className="mb-0">
                                                    <b>{doData?.any_other_deduction_rate}%</b>
                                                  </p>
                                                </div>
                                              )}

                                              {/* Remarks */}
                                              {doData?.any_other_deduction_remarks && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Remarks:
                                                  </label>
                                                  <p className="mb-0">
                                                    <b>{doData?.any_other_deduction_remarks}</b>
                                                  </p>
                                                </div>
                                              )}

                                              {/* Document */}
                                              {doData?.any_other_deduction_file_path && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Document:
                                                  </label>
                                                  <p className="mb-0">
                                                    <a
                                                      href={formatFilePath(doData?.any_other_deduction_file_path)}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="btn btn-sm btn-outline-primary"
                                                    >
                                                      📄 {doData?.any_other_deduction_filename || "View File"}
                                                    </a>
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted">No deduction applied</span>
                                          )}
                                        </td>
                                      </tr>

                                      {/* ✅ Any Other Retention — NEW */}
                                      <tr>
                                        <td>Any Other Retention</td>
                                        <td className="btn_value">
                                          {hasRetention ? (
                                            <div className="d-flex flex-wrap gap-3 align-items-start">
                                              {/* Amount */}
                                              <div>
                                                <label className="text-muted" style={{ fontSize: "12px" }}>
                                                  Retention Amount (BG):
                                                </label>
                                                <p className="mb-0">
                                                  <b>&#8377; {doData?.any_other_retension_amount}</b>
                                                </p>
                                              </div>

                                              {/* Rate — sirf percent type mein hoga */}
                                              {doData?.any_other_retension_rate && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Rate:
                                                  </label>
                                                  <p className="mb-0">
                                                    <b>{doData?.any_other_retension_rate}%</b>
                                                  </p>
                                                </div>
                                              )}

                                              {/* Remarks */}
                                              {doData?.any_other_retension_remarks && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Remarks:
                                                  </label>
                                                  <p className="mb-0">
                                                    <b>{doData?.any_other_retension_remarks}</b>
                                                  </p>
                                                </div>
                                              )}

                                              {/* Document */}
                                              {doData?.any_other_retension_file_path && (
                                                <div>
                                                  <label className="text-muted" style={{ fontSize: "12px" }}>
                                                    Document:
                                                  </label>
                                                  <p className="mb-0">
                                                    <a
                                                      href={formatFilePath(doData?.any_other_retension_file_path)}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="btn btn-sm btn-outline-primary"
                                                    >
                                                      📄 {doData?.any_other_retension_filename || "View File"}
                                                    </a>
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted">No retention applied</span>
                                          )}
                                        </td>
                                      </tr>

                                      {/* Total Deductions */}
                                      <tr>
                                        <td>Total deductions</td>
                                        <td>
                                          <b>&#8377; {doData?.total_deduction}</b>
                                        </td>
                                      </tr>

                                      {/* Net Payable Amount */}
                                      <tr>
                                        <td>Net payable amount</td>
                                        <td>
                                          <b>&#8377; {doData?.net_payable_amount}</b>
                                        </td>
                                      </tr>

                                      {/* ✅ Remarks — NEW */}
                                      {doData?.remarks && (
                                        <tr>
                                          <td>Remarks</td>
                                          <td>
                                            <div
                                              style={{
                                                background: "#f8f9fa",
                                                border: "1px solid #dee2e6",
                                                borderRadius: "6px",
                                                padding: "10px 14px",
                                                fontSize: "14px",
                                                color: "#374151",
                                                lineHeight: "1.6",
                                                whiteSpace: "pre-wrap",
                                              }}
                                            >
                                              {doData?.remarks}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                <p>Certified that Invoice has been verified w.r.t PO and recommanded for release of payment subject to satutatory deduction.</p>

                                <div className="text-center">
                                  <button className="btn fw-bold btn-primary" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                    BACK
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="col-12">Waiting for the action from HSL.</div>
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

export default BillsMaterialHybridView;
