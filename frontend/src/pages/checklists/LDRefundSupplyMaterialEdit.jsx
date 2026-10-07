import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiCallBack } from "../../utils/fetchAPIs";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft } from "react-icons/fa";
import { formatDate, formatFilePath } from "../../utils/getDateTimeNow";
import { toast } from "react-toastify";
import HrSearchableSelect from "../../components/HrSearchableSelect";

const LDRefundSupplyMaterialEdit = () => {
  const [data, setData] = useState(null);
  const [InvoiceData, setInvoiceData] = useState(null);
  const { state } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  const [gstData, setGstData] = useState();

  const initialDODataPBG = {
    assign_to: "",
  };
  const { isDO } = useSelector((state) => state.selectedPO);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectloading, setRejectLoading] = useState(false);
  const [emp, setEmp] = useState([]);
  const [doForm, setDoForm] = useState(initialDODataPBG);
  const [netPayableAmount, setNetPayableAmount] = useState("");

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `getFilteredData?$tableName=btn_any_other_claim&$filter={"btn_num":"${state}"}`, null, token);
      if (response?.status) {
        setData(response?.data[0]);

        setInvoiceData(JSON.parse(response?.data[0]?.icgrn_nos));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getGstData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/getGstnByPo?poNo=${id}`, null, token);
      if (response?.status) {
        setGstData(response?.data[0]);

      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    getData();
    getGstData();
  }, []);

  //********************************************do code start **************************************************************** */

  useEffect(() => {
    const getEmp = async () => {
      try {
        const data = await apiCallBack("GET", `po/btn/getFinanceEmpList?$select=1`, null, token);
        if (data?.status) {
          let options = data.data.map((item) => ({
            value: item.usercode,
            label: `${item.empname} (${item.usercode})`,
          }));
          setEmp(options);
        } else {
          setEmp([]);
        }
      } catch (error) {
        console.error("Error fetching Employee list:", error);
        setEmp([]);
      }
    };

    getEmp();
  }, [token]);

  const handleSubmit = async (status) => {
    if (!doForm.assign_to) {
      toast.warning("Please select an Finance Authority.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("btn_num", state);
    formData.append("net_payable_amount", data.total_claim_amount);
    formData.append("assigned_to", doForm.assign_to);
    formData.append("purchasing_doc_no", id);
    formData.append("status", status);
    if (remarks) formData.append("remarks", remarks);

    try {
      const response = await apiCallBack("POST", "po/btn/btnPbgSubmitByDO", formData, token);

      if (response?.status) {
        toast.success("Submission successful!");
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.warning(response?.message);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting the form.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = () => {
    handleSubmit("APPROVED");
  };

  const handleRejection = async () => {
    if (showRemarks && remarks) {
      setRejectLoading(true);
      const formData = new FormData();
      formData.append("btn_num", state);
      formData.append("net_payable_amount", netPayableAmount);
      formData.append("assigned_to", 0);
      formData.append("purchasing_doc_no", id);
      formData.append("status", "REJECTED");
      if (remarks) formData.append("remarks", remarks);

      try {
        const response = await apiCallBack("POST", "po/btn/btnPbgSubmitByDO", formData, token);

        if (response?.status) {
          toast.success("Rejection submission successful!");
          navigate(`/invoice-and-payment-process/${id}`);
        } else {
          toast.warning(response?.message);
        }
      } catch (error) {
        console.error("Error submitting rejection:", error);
        toast.error("An error occurred while submitting the rejection.");
      } finally {
        setRejectLoading(false);
      }
    } else {
      setShowRemarks(true);
    }
  };

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
                            </button>{" "}
                            Checklist for Any Other Claims:
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody>
                                    <tr>
                                      <td>Claim Type:</td>
                                      <td className="btn_value">{data?.btn_type}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Name :</td>
                                      <td className="btn_value">{gstData?.name1 ? gstData.name1 : ""}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code :</td>
                                      <td className="btn_value">{gstData?.lifnr ? gstData.lifnr : ""}</td>
                                    </tr>
                                    <tr>
                                      <td>GSTIN (Registration no) :</td>
                                      <td className="btn_value">{gstData?.stcd3 ? gstData.stcd3 : "No GSTIN number"}</td>
                                    </tr>
                                    <tr>
                                      <td>Invoice/Letter Reference No. :</td>
                                      <td className="btn_value">
                                        {data?.letter_reference_no}
                                        <span style={{ marginLeft: "16px" }}>
                                          {/* Adjust the margin value as needed */}
                                          {data?.invoice_file_path && data?.invoice_file_path !== "null" ? (
                                            <a href={formatFilePath(data.invoice_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                              View File
                                            </a>
                                          ) : (
                                            <span>-</span>
                                          )}
                                        </span>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Invoice/Letter Date:</td>
                                      <td className="btn_value">{formatDate(data?.letter_date * 1000)}</td>
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
                                        <div className="btn_value">{data?.ref_invoice1_no}</div>
                                      </td>
                                      <td>{data?.ref_invoice1_amount}</td>
                                      <td>{data?.ref_invoice1_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice1_file_path && data?.ref_invoice1_file_path !== "null" ? (
                                          <a href={formatFilePath(data.ref_invoice1_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                            View File
                                          </a>
                                        ) : (
                                          <span>-</span>
                                        )}
                                      </td>
                                    </tr>

                                    {/* Repeat similar rows for Invoice 2, 3, and 4 */}
                                    {/* Row 2 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">{data?.ref_invoice2_no}</div>
                                      </td>
                                      <td>{data?.ref_invoice2_amount}</td>
                                      <td>{data?.ref_invoice2_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice2_file_path && data?.ref_invoice2_file_path !== "null" ? (
                                          <a href={formatFilePath(data.ref_invoice2_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
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
                                        <div className="btn_value">{data?.ref_invoice3_no}</div>
                                      </td>
                                      <td>{data?.ref_invoice3_amount}</td>
                                      <td>{data?.ref_invoice3_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice3_file_path && data?.ref_invoice3_file_path !== "null" ? (
                                          <a href={formatFilePath(data.ref_invoice3_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
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
                                        <div className="btn_value">{data?.ref_invoice4_no}</div>
                                      </td>
                                      <td>{data?.ref_invoice4_amount}</td>
                                      <td>{data?.ref_invoice4_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice4_file_path && data?.ref_invoice4_file_path !== "null" ? (
                                          <a href={formatFilePath(data.ref_invoice4_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
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
                                      <td>{<b>{data?.total_claim_amount}</b>}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              {isDO && (
                                <div className="col-12">
                                  <div className="card">
                                    <h3 className="m-3">ENTRY BY DEALING OFFICER:</h3>
                                    <div className="card-body p-3">
                                      <div className="tab-content">
                                        <div className="table-responsive">
                                          <table className="table table-striped table-bordered table_height_pbg">
                                            <tbody>
                                              <tr>
                                                <td>Finance Authority</td>
                                                <td className="btn_value">
                                                  <HrSearchableSelect
                                                    options={emp}
                                                    value={doForm?.assign_to}
                                                    onChange={(val) =>
                                                      setDoForm({
                                                        ...doForm,
                                                        assign_to: val ? val.value : null,
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
                                            </tbody>
                                          </table>
                                        </div>

                                        <div className="row">
                                          <div className="col-6 text-start">
                                            <button className="btn btn-sm fw-bold btn-primary me-3" onClick={handleApproval} disabled={loading}>
                                              {loading ? "Loading..." : "APPROVE"}{" "}
                                            </button>
                                            <button type="button" className="btn btn-sm btn-primary me-3" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                              BACK
                                            </button>
                                          </div>
                                          <div className="col-6 text-end">
                                            {showRemarks ? (
                                              <>
                                                <input
                                                  type="text"
                                                  placeholder="Enter remarks"
                                                  value={remarks}
                                                  onChange={(e) => setRemarks(e.target.value)}
                                                  className="form-control mb-2"
                                                />

                                                <button className="btn fw-bold btn-sm btn-danger" onClick={handleRejection} disabled={rejectloading}>
                                                  {rejectloading ? "Loading..." : "Submit Rejection"}
                                                </button>
                                              </>
                                            ) : (
                                              <button className="btn fw-bold btn-sm btn-danger" onClick={handleRejection}>
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

export default LDRefundSupplyMaterialEdit;
