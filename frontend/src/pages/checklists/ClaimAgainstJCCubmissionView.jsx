import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiCallBack } from "../../utils/fetchAPIs";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft } from "react-icons/fa";
import { formatFilePath } from "../../utils/getDateTimeNow";

const ClaimAgainstJCCubmissionView = () => {
  const [form, setForm] = useState(null);
  const [vendorData, setVendorData] = useState({});
  const [complianceData, setComplianceData] = useState({});
  const { state } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();

  const getForm = async (btn) => {
    try {
      const response = await apiCallBack("GET", `po/btn/jcc?type=details&btn_num=${btn}`, null, token);
      if (response?.status) {
        setForm(response.data);
      }
    } catch (error) {
      console.error("Error fetching form data:", error);
    }
  };

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/jcc?poNo=${id}&type=init`, null, token);
      if (response?.status) {
        setVendorData(response.data.vendorDetails);
        setComplianceData(response.data.complianceData);
      }
    } catch (error) {
      console.error("Error fetching init data:", error);
    }
  };

  useEffect(() => {
    if (state) {
      getForm(state);
    }
    getData();
  }, [state]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Checklist for Any Other Claims"} id={id} />
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
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody>
                                    <tr>
                                      <td>Claim Type:</td>
                                      <td className="btn_value">{form?.btn_type || "-"}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Name:</td>
                                      <td className="btn_value">{vendorData?.vendor_name || "-"}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code:</td>
                                      <td className="btn_value">{vendorData?.vendor_code || "-"}</td>
                                    </tr>
                                    <tr>
                                      <td>JCC Reference No:</td>
                                      <td className="btn_value">{form?.jcc_ref_number || "-"}</td>
                                    </tr>
                                    <tr>
                                      <td>Earned Leave:</td>
                                      <td className="btn_value">
                                        {complianceData?.leave_salary_compliance ? (
                                          <span
                                            style={{
                                              color: complianceData.leave_salary_compliance === "Y" ? "green" : "red",
                                            }}
                                          >
                                            {complianceData.leave_salary_compliance}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Bonus Claim Document:</td>
                                      <td className="btn_value">
                                        {complianceData?.bonus_compliance ? (
                                          <span
                                            style={{
                                              color: complianceData.bonus_compliance === "Y" ? "green" : "red",
                                            }}
                                          >
                                            {complianceData.bonus_compliance}
                                          </span>
                                        ) : (
                                          "-"
                                        )}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table className="table table-striped table-bordered table_height">
                                  <thead>
                                    <tr>
                                      <th>Reference Invoice No</th>
                                      <th>Claim Amount</th>
                                      <th>Remarks</th>
                                      <th>Invoice File</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Row 1 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">{form?.ref_invoice1_no || "-"}</div>
                                      </td>
                                      <td>{form?.ref_invoice1_amount || "0"}</td>
                                      <td>{form?.ref_invoice1_remarks || "-"}</td>
                                      <td>
                                        {form?.ref_invoice1_file_path && form?.ref_invoice1_file_path !== "null" ? (
                                          <a href={formatFilePath(form.ref_invoice1_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                            View File
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Row 2 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">{form?.ref_invoice2_no || "-"}</div>
                                      </td>
                                      <td>{form?.ref_invoice2_amount || "0"}</td>
                                      <td>{form?.ref_invoice2_remarks || "-"}</td>
                                      <td>
                                        {form?.ref_invoice2_file_path && form?.ref_invoice2_file_path !== "null" ? (
                                          <a href={formatFilePath(form.ref_invoice2_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                            View File
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Row 3 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">{form?.ref_invoice3_no || "-"}</div>
                                      </td>
                                      <td>{form?.ref_invoice3_amount || "0"}</td>
                                      <td>{form?.ref_invoice3_remarks || "-"}</td>
                                      <td>
                                        {form?.ref_invoice3_file_path && form?.ref_invoice3_file_path !== "null" ? (
                                          <a href={formatFilePath(form.ref_invoice3_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                            View File
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Row 4 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">{form?.ref_invoice4_no || "-"}</div>
                                      </td>
                                      <td>{form?.ref_invoice4_amount || "0"}</td>
                                      <td>{form?.ref_invoice4_remarks || "-"}</td>
                                      <td>
                                        {form?.ref_invoice4_file_path && form?.ref_invoice4_file_path !== "null" ? (
                                          <a href={formatFilePath(form.ref_invoice4_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                            View File
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Total Claim Amount */}
                                    <tr>
                                      <td colSpan={3} className="text-end">
                                        <strong>Total Claim Amount:</strong>
                                      </td>
                                      <td>
                                        <b>{form?.net_claim_amount || "0.00"}</b>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
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

export default ClaimAgainstJCCubmissionView;
