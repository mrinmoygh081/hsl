import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { checkTypeArr, inputFileChange, inputTypeChange } from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { convertToEpoch, formatDate, formatFilePath } from "../../utils/getDateTimeNow";
import { FaCaretLeft } from "react-icons/fa";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import { initialDataJCC, initialDataService } from "../../data/btnData";
import DynamicButton from "../../Helpers/DynamicButton";
import { toast } from "react-toastify";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import HrSearchableSelect from "../../components/HrSearchableSelect";

const ClaimAgainstJCCubmissionEdit = () => {
  const initialDODataPBG = {
    assign_to: "",
  };
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const [data, setData] = useState("");
  const [wdcNo, setWdcNo] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { state } = useLocation();
  const { isDO } = useSelector((state) => state.selectedPO);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [doForm, setDoForm] = useState(initialDODataPBG);
  const [recomendPayment, setRecomendPayment] = useState("yes");
  const [rejectloading, setRejectLoading] = useState(false);
  const [emp, setEmp] = useState([]);
  const [form, setForm] = useState(null);
  const [vendorData, setVendorData] = useState({});
  const [complianceData, setComplianceData] = useState({});

  console.log("abhinit", form);
  console.log("bikky", data);

  const handleSubmit = async (status) => {
    if (!doForm.assign_to) {
      toast.warning("Please select a Finance Authority.");
      return;
    }

    setLoading(true);

    // Create the JSON payload
    const payload = {
      btn_num: state,
      assign_to: doForm.assign_to,
      recomend_payment: recomendPayment,
      purchasing_doc_no: id,
      status: status,
    };

    try {
      const response = await apiCallBack("POST", "po/btn/submit-jcc-ca", payload, token);

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

  const getJCCListDropdown = async () => {
    const d = await apiCallBack("GET", `po/btn/jcc?type=jcclist&poNo=${id}`, null, null);
    if (d?.status) {
      let options = d?.data.map((item, index) => {
        return {
          value: item.reference_no,
          label: item.reference_no,
        };
      });
      setWdcNo(options);
    } else {
      toast.info("WDC Not Found!");
    }
  };
  // const getEmp = async () => {
  //   try {
  //     const data = await apiCallBack("GET", `po/wdc/grseEmpList`, null, token);
  //     if (data?.status) {
  //       let options = data.data.map((item, index) => {
  //         return {
  //           value: item.code,
  //           label: `${item.name} (${item.code})`,
  //         };
  //       });
  //       setEmp(options);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching Employee list:", error);
  //   }
  // };

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

  const getJCCList = async () => {
    const d = await apiCallBack("GET", `po/btn/jcc?type=init&poNo=${id}`, null, token);
    if (d?.status) {
      setData({ ...data, initial: d?.data });
    }
  };

  useEffect(() => {
    getJCCList();
    getJCCListDropdown();
    // getEmp();
  }, []);

  // const checkWDCDetails = async () => {
  //   if (!form.wdc_number || form.wdc_number === "") {
  //     //   return toast.info("Select a WDC Number");
  //   }
  //   const d = await apiCallBack("GET", `po/btn/jcc?type=jccinfo&reference_no=${form?.wdc_number}`, null, token);
  //   if (d?.status) {
  //     setData({ ...data, wdcDetails: d?.data });
  //   }
  // };

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
            <Header title={"Checklist For Claim Against JCC"} id={id} />
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
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
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
                                                        {/* <Select
                                                          className="basic-single w-100"
                                                          classNamePrefix="select"
                                                          isClearable={true}
                                                          isSearchable={true}
                                                          name="emp"
                                                          id="emp"
                                                          options={emp}
                                                          value={emp && emp.find((item) => item.value === doForm?.assign_to)}
                                                          onChange={(val) =>
                                                            setDoForm({
                                                              ...doForm,
                                                              assign_to: val ? val.value : null,
                                                            })
                                                          }
                                                        /> */}
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
                                                    {/* <tr>
                                                <td>BTN Number:</td>
                                                <td className="btn_value">
                                                  <b>{state}</b>
                                                </td>
                                              </tr> */}
                                                  </tbody>
                                                </table>
                                              </div>

                                              <div className="row">
                                                <div className="col-6 text-start">
                                                  {/* <DynamicButton
                                      label="Approve"
                                      className="btn fw-bold btn-primary me-3"
                                      onClick={handleApproval}
                                    /> */}
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
                                  </tbody>
                                </table>
                              </div>
                              {/* <div className="text-center">
                                <button
                                  className="btn fw-bold btn-primary me-3"
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/invoice-and-payment-process/${id}`
                                    )
                                  }
                                >
                                  BACK
                                </button>
                              </div> */}
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

export default ClaimAgainstJCCubmissionEdit;
