import React, { useEffect, useState } from "react";
import Footer from "../../components/Footer";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaCaretLeft } from "react-icons/fa";
import { useSelector } from "react-redux";
import { apiCallBack } from "../../utils/fetchAPIs";
import ClaimAgainstPBGSubmissioninfo from "../../components/ClaimAgainstPBGSubmissioninfo";
import { toast } from "react-toastify";
import HrSearchableSelect from "../../components/HrSearchableSelect";

const ClaimAgainstPBGSubmissionEdit = () => {
  const initialDODataPBG = {
    assign_to: "",
  };
  const navigate = useNavigate();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const { state } = useLocation();
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejectloading, setRejectLoading] = useState(false);
  const [emp, setEmp] = useState([]);
  const [doForm, setDoForm] = useState(initialDODataPBG);
  const [netPayableAmount, setNetPayableAmount] = useState("");
  const [datapbg, setDatapbg] = useState(null);
  const [data, setData] = useState(null);

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

  const getData = async () => {
    try {
      console.log("Fetching data for btn_num:", state, "with token:", token);
      const response = await apiCallBack("GET", `po/btn/pbg?btn_num=${state}`, null, token);
      console.log("API Response:", response);
      if (response?.statusCode === 200) {
        setData(response.data); // Response is an object
        console.log("Data set successfully:", response.data);
      } else {
        console.log("API failed with statusCode:", response?.statusCode, "Response:", response);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getDataPBG = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setDatapbg(d?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  useEffect(() => {
    getDataPBG();
    getData();
  }, []);

  const handleSubmit = async (status) => {
    if (!doForm.assign_to) {
      toast.warning("Please select an Finance Authority.");
      return;
    }

    setLoading(true);
    // const formData = new FormData();
    // formData.append("btn_num", state);
    // formData.append("net_payable_amount", netPayableAmount);
    // formData.append("assigned_to", doForm.assign_to);
    // formData.append("purchasing_doc_no", id);
    // formData.append("status", status);
    // if (remarks) formData.append("remarks", remarks);
    const paylod = {
      btn_num: state,
      assign_to: doForm.assign_to,
      purchasing_doc_no: id,
      status: status,
      btn_type: data?.btn_type,
      net_payable_amount: netPayableAmount,
      recomend_payment: "YES",
    };

    try {
      const response = await apiCallBack("POST", "po/btn/submit-jcc-ca", paylod, token);

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
  const handleApprovalreject = () => {
    handleRejection("REJECTED");
  };

  // const handleRejection = async () => {
  //   if (showRemarks && remarks) {
  //     setRejectLoading(true);
  //     // const formData = new FormData();
  //     // formData.append("btn_num", state);
  //     // formData.append("net_payable_amount", netPayableAmount);
  //     // formData.append("assigned_to", 0);
  //     // formData.append("purchasing_doc_no", id);
  //     // formData.append("status", "REJECTED");
  //     const paylod = {
  //       btn_num: state,
  //       assign_to: doForm.assign_to,
  //       purchasing_doc_no: id,
  //       status: status,
  //       if (remarks)remarks: remarks),
  //       remarks: remarks,
  //       net_payable_amount: netPayableAmount,
  //       recomend_payment: "YES",
  //     };
  //     // if (remarks) formData.append("remarks", remarks);

  //     try {
  //       const response = await apiCallBack("POST", "po/btn/submit-jcc-ca", paylod, token);

  //       if (response?.status) {
  //         toast.success("Rejection submission successful!");
  //         navigate(`/invoice-and-payment-process/${id}`);
  //       } else {
  //         toast.warning(response?.message);
  //       }
  //     } catch (error) {
  //       console.error("Error submitting rejection:", error);
  //       toast.error("An error occurred while submitting the rejection.");
  //     } finally {
  //       setRejectLoading(false);
  //     }
  //   } else {
  //     setShowRemarks(true);
  //   }
  // };

  const handleRejection = async (status) => {
    if (showRemarks && remarks) {
      setRejectLoading(true);

      const payload = {
        btn_num: state,
        assign_to: doForm.assign_to,
        purchasing_doc_no: id,
        status: status,
        remarks: remarks,
        net_payable_amount: netPayableAmount,
        recomend_payment: "YES",
      };

      try {
        const response = await apiCallBack("POST", "po/btn/submit-jcc-ca", payload, token);

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
            <Header title={"Bills for Material PO"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
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
                        <ClaimAgainstPBGSubmissioninfo setNetPayableAmount={setNetPayableAmount} />
                      </div>
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
                                {/* <div className="col-6 text-end">
                                  {showRemarks ? (
                                    <>
                                      <input type="text" placeholder="Enter remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-control mb-2" />

                                      <button className="btn fw-bold btn-sm btn-danger" onClick={handleRejection} disabled={rejectloading}>
                                        {rejectloading ? "Loading..." : "Submit Rejection"}
                                      </button>
                                    </>
                                  ) : (
                                    <button className="btn fw-bold btn-sm btn-danger" onClick={handleRejection}>
                                      REJECT
                                    </button>
                                  )}
                                </div> */}
                                <div className="col-6 text-end">
                                  {showRemarks ? (
                                    <>
                                      <input type="text" placeholder="Enter remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} className="form-control mb-2" />

                                      <button className="btn fw-bold btn-sm btn-danger" onClick={handleApprovalreject} disabled={rejectloading}>
                                        {rejectloading ? "Loading..." : "Submit Rejection"}
                                      </button>
                                    </>
                                  ) : (
                                    <button className="btn fw-bold btn-sm btn-danger" onClick={handleApprovalreject}>
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
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default ClaimAgainstPBGSubmissionEdit;
