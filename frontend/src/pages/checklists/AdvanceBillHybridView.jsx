import React, { useEffect, useState } from "react";
import { apiCallBack } from "../../utils/fetchAPIs";
import { checkTypeArr } from "../../utils/smallFun";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Footer from "../../components/Footer";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import BTNAdvanceVendorInfo from "../../components/BTNAdvanceVendorInfo";
import { formatDate } from "../../utils/getDateTimeNow";
import { FaCaretLeft } from "react-icons/fa";
import { toast } from "react-toastify";

const AdvanceBillHybridView = () => {
  const navigate = useNavigate();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const { state } = useLocation();
  const [data, setData] = useState(null);
  const [doData, setDoData] = useState(null);
  const [form, setForm] = useState(null);

  console.log("doData", doData);

  const getDataByBTN = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/adv-bill-against-bg?type=details&btn_num=${state}`, null, token);
      console.log("response", response);
      if (response?.status && response?.data) {
        // Since data is an array, take the first item or handle multiple if needed
        setData(response.data[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getDataByBTNDO = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/adv-bill-against-bg?type=details&btn_num=${state}`, null, token);
      if (response?.status && response?.data && response.data.length > 0) {
        const billData = response.data[0];
        setDoData(billData);
      } else {
        toast.error("Error fetching bill details");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error fetching bill details");
    }
  };

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

  useEffect(() => {
    getDataByBTN();
    getDataByBTNDO();
  }, []);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Advance Bill"} id={id} />
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
                      {doData ? (
                        <div className="col-12">
                          <div className="card">
                            <h3 className="m-3">ENTRY BY DEALING OFFICER:</h3>
                            <div className="card-body p-3">
                              <div className="tab-content">
                                <div className="table-responsive">
                                  <table className="table table-striped table-bordered table_height">
                                    <tbody style={{ maxHeight: "100%" }}>
                                      <tr>
                                        <td>BTN Number:</td>
                                        <td className="btn_value">
                                          <b>{doData?.btn_num}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Basic Amount (Excl. GST)</td>
                                        <td className="btn_value">
                                          <b>₹ {doData?.basic_amount || 0}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Retention (%)</td>
                                        <td className="btn_value">
                                          <span>{doData?.retention_rate || 0}%</span>
                                          <span className="ms-2">Retention Amount: ₹ {doData?.retention_amount || 0}</span>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Remarks for Retention</td>
                                        <td>
                                          <p>{doData?.retention_remarks || "N/A"}</p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Other Deduction</td>
                                        <td className="btn_value">
                                          <p>₹ {doData?.other_deduction || 0}</p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Deduction Remarks</td>
                                        <td>
                                          <p>{doData?.deduction_remarks || "N/A"}</p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Penalty for Drawing Submission</td>
                                        <td className="btn_value">
                                          <div className="me-3">
                                            <label htmlFor="DADD">Actual Delivery Date:</label>
                                            <p>
                                              <b>{doData?.a_drawing_date && formatDate(doData?.a_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div className="me-3">
                                            <label htmlFor="DCDD">Contractual Delivery Date:</label>
                                            <p>
                                              <b>{doData?.c_drawing_date && formatDate(doData?.c_drawing_date)}</b>
                                            </p>
                                          </div>
                                          <div>
                                            <label>Penalty Amount:</label>
                                            <p>₹ {doData?.drg_penalty || 0}</p>
                                          </div>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Max Penalty ({doData?.max_penalty || 0}%)</td>
                                        <td className="btn_value">
                                          <p>₹ {((parseFloat(doData?.basic_amount || 0) * Number(doData?.max_penalty || 0)) / 100).toFixed(2)}</p>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Total Deductions</td>
                                        <td>
                                          <b>₹ {doData?.total_deduction || 0}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Net Payable Amount</td>
                                        <td>
                                          <b>₹ {doData?.net_payable_amount || 0}</b>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <p>Certified that Invoice has been verified w.r.t PO and recommended for release of payment subject to statutory deduction</p>
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
                        <>
                          <div className="col-12">Waiting for the action from GRSE.</div>
                        </>
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

export default AdvanceBillHybridView;
