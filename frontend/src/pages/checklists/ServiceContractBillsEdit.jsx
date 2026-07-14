import React, { useCallback, useEffect, useState } from "react";
import Footer from "../../components/Footer";
import BTNServiceVendor from "../../components/BTNServiceVendor";
import { FaCaretLeft } from "react-icons/fa";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { initialDataService, initialEmpData } from "../../data/btnData";
import { useSelector } from "react-redux";
import { apiCallBack } from "../../utils/fetchAPIs";
import DynamicButton from "../../Helpers/DynamicButton";
import { toast } from "react-toastify";
import { actionHandlerServiceByEmp } from "../../Helpers/BTNChecklist";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { calculateLDByDate, calculateNetPayService, checkTypeArr, inputTypeChange } from "../../utils/smallFun";
import HrSearchableSelect from "../../components/HrSearchableSelect";

const ServiceContractBillsEdit = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { isDO } = useSelector((state) => state.selectedPO);

  const { state } = useLocation();
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [form, setForm] = useState(initialDataService);
  const [invoiceData, setInvoiceData] = useState(null);
  const [billCA, setBillCA] = useState();
  const [empForm, setEmpForm] = useState(initialEmpData);
  const [emp, setEmp] = useState([]);
  const [empFinance, setEmpFinance] = useState([]);
  const [showRemarks, setShowRemarks] = useState(false);
  const [showRemarksapprove, setShowRemarksApprove] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [remarksforword, setRemarksforword] = useState("");
  const [grnsesData, setGrnsesData] = useState(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showRECOMMENDModal, setShowRECOMMENDModal] = useState(false);
  const [delegateForm, setDelegateForm] = useState({
    certifying_authority: "",
    status: "",
    remarks: "",
  });

  // console.log(form, "abhinit  ");
  // console.log(user, "bikky ");
  // console.log(state, "abhinit state ");
  // console.log(billCA, "billCA ");
  console.log(data, "data sunkkkkkkkkkkkkk ");

  const getData = async () => {
    const d = await apiCallBack("GET", `po/btn/initServiceHybrid?poNo=${id}`, null, token);
    if (d?.status) {
      setData((prevData) => ({ ...prevData, initial: d?.data }));
    }
  };

  useEffect(() => {
    if (id) {
      getData();
    }
  }, [id]);

  // const getForm = async (btn) => {
  //   const d = await apiCallBack("GET", `po/btn/getServiceBtnData?type=sbtn-details&btn_num=${btn}`);
  //   if (d?.status) {
  //     setForm(d?.data);

  //     // Check if wdc_details is available in the form response
  //     if (d?.data?.wdc_details) {
  //       setData((prevData) => ({
  //         ...prevData,
  //         wdcDetails: d.data.wdc_details,
  //       }));
  //     } else {
  //       // Fallback to API call if wdc_details is not in form response
  //       checkWDCDetails(d?.data?.wdc_number);
  //     }
  //   }
  // };

  // const checkWDCDetails = async (wdc_number) => {
  //   if (!wdc_number) return;

  //   const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid?reference_no=${wdc_number}`, null, token);
  //   if (d?.status) {
  //     setData((prevData) => ({
  //       ...prevData,
  //       wdcDetails: d?.data,
  //     }));
  //   }
  // };

  const getForm = async (btn) => {
    const d = await apiCallBack("GET", `po/btn/getServiceBtnData?type=sbtn-details&btn_num=${btn}`);
    if (d?.status) {
      setForm(d?.data);

      if (d?.data?.wdc_details) {
        setData((prevData) => ({
          ...prevData,
          wdcDetails: d.data.wdc_details,
        }));
      }

      // ALWAYS call karo - compliance data ke liye
      checkWDCDetails(d?.data);
    }
  };

  const checkWDCDetails = async (formData) => {
    if (!formData?.wdc_number) return;

    try {
      const wdcNumberArr = Array.isArray(formData.wdc_number)
        ? formData.wdc_number
        : formData.wdc_number
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      // units string parse karo → [{ value: "MAIN", label: "MAIN" }]
      let parsedUnits = [];
      if (Array.isArray(formData.units)) {
        parsedUnits = formData.units;
      } else if (typeof formData.units === "string" && formData.units) {
        try {
          const cleaned = JSON.parse(formData.units); // pehli layer
          const arr = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned); // doosri layer
          parsedUnits = arr.map((u) => ({ value: u, label: u }));
        } catch {
          parsedUnits = [];
        }
      }

      const payload = {
        outside: formData.outside === true || formData.outside === "true",
        units: parsedUnits,
        wdc_number_no: wdcNumberArr,
      };

      const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid`, payload, token);
      if (d?.status) {
        setData((prevData) => ({
          ...prevData,
          wdcDetails: {
            ...prevData?.wdcDetails,
            ...d?.data,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching WDC details:", error);
    }
  };

  useEffect(() => {
    if (state?.btn_num && state?.bill_ca) {
      getForm(state.btn_num);
      setBillCA(state.bill_ca);
    }
    console.log("state", state);
  }, [state]);

  // const getEmp = async () => {
  //   try {
  //     const data = await apiCallBack("GET", `getGrseOfficerList?department_id=15&internal_role_id=1`, null, token);
  //     if (data?.status) {
  //       let options = data.data.map((item, index) => {
  //         return {
  //           value: item.usercode,
  //           label: `${item.empname} (${item.usercode})`,
  //         };
  //       });
  //       setEmp(options);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching Employee list:", error);
  //   }
  // };

  const getEmpFinanceEmpList = async () => {
    try {
      const data = await apiCallBack("GET", `po/btn/getFinanceEmpList`, null, token);
      if (data?.status) {
        let options = data.data.map((item, index) => {
          return {
            value: item.usercode,
            label: `${item.empname} (${item.usercode})`,
          };
        });
        setEmpFinance(options);
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
    }
  };

  const getEmpdelegate = useCallback(async () => {
    try {
      const data = await apiCallBack("GET", `po/wdc/grseEmpList`, null, token);
      if (data?.status) {
        let options = data.data.map((item) => ({
          value: item.code,
          label: `${item.name} (${item.code})`,
        }));
        setEmp(options);
      } else {
        toast.error(data?.message || "Failed to fetch employee list");
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
      toast.error("Failed to fetch employee list");
    }
  }, [token]);

  useEffect(() => {
    getEmpdelegate();
  }, [getEmpdelegate]);

  // useEffect(() => {
  //   getEmp();
  // }, []);
  useEffect(() => {
    getEmpFinanceEmpList();
  }, []);
  // console.log(empFinance, "fiiii");
  // console.log(emp, "hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh");

  useEffect(() => {
    if (state) {
      setEmpForm({ ...empForm, btn_num: state?.btn_num });
    }
  }, [state]);
  console.log(state, "state hhhhhhh");

  const checkValue = async () => {
    // if (!empForm?.grn_no || !empForm.grn_no === "") {
    //   return toast.warn("Please enter Service Entry/GRN Number");
    // }
    let queryParams = new URLSearchParams();
    queryParams.append("type", "grn-and-service-entry");
    if (empForm?.grn_no) queryParams.append("grn_no", empForm.grn_no);
    if (empForm?.check_wdc_number) queryParams.append("check_wdc_number", empForm.check_wdc_number);
    queryParams.append("po", id);
    const d = await apiCallBack("GET", `po/btn/getServiceBtnData?${queryParams.toString()}`, null, token);
    if (d?.status) {
      setEmpForm({ ...empForm, value: d?.data?.totalIcgrnValue });
      let data = { ...d?.data, lineItems: [...d?.data.icgrnSubLineItem, ...d?.data?.sirSubLineItem] };

      setGrnsesData(data);
    } else {
      toast.error(d?.message);
    }
  };

  const rejectBTN = async () => {
    try {
      let payload = {
        btn_num: state?.btn_num,
        status: "REJECTED",
        rejectedMessage: remarks,
        purchasing_doc_no: id,
      };
      const response = await apiCallBack("POST", "po/btn/submitSBtnByCAuthorty", payload, token);
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

  const calcEstimatedLD = useCallback(() => {
    if (checkTypeArr(data?.wdcDetails?.line_item_array) && form?.net_claim_amount) {
      let estimatedLD = 0;
      for (let item of data?.wdcDetails?.line_item_array) {
        if (item?.delay) {
          console.log("item?.delay", parseFloat(item?.delay), parseFloat(item?.claim_amount), 0.5);
          let ld = calculateLDByDate(parseFloat(item?.delay), parseFloat(item?.claim_amount), 0.5);
          console.log("ld", ld);
          item.lineLD = ld;
          estimatedLD += ld;
        }
        item.lineLD = 0;
      }
      console.log("empForm?.max_ld", empForm?.max_ld);
      let max_penalty_amount = (Number(form?.net_claim_amount) * Number(empForm?.max_ld)) / 100;
      console.log("empForm", empForm);
      console.log("max_penalty_amount", max_penalty_amount);
      estimatedLD = Math.min(estimatedLD, max_penalty_amount);
      setEmpForm({ ...empForm, estimatedLD });
    }
  }, [data?.wdcDetails?.line_item_array, form?.net_claim_amount, empForm?.max_ld]);

  useEffect(() => {
    calcEstimatedLD();
  }, [calcEstimatedLD]);

  useEffect(() => {
    let net = form?.net_claim_amount;
    let netWIthGST = form?.net_claim_amt_gst;
    console.log("net", net);
    console.log("netWIthGST", netWIthGST);
    if (net && netWIthGST) {
      let report = calculateNetPayService(net, netWIthGST, empForm?.estimatedLD, empForm?.retension_rate, empForm?.other_deduction);
      // console.log("net_pay", report?.net_pay);
      setEmpForm({
        ...empForm,
        total_deduction: report?.deduct,
        net_payable_amount: report?.net_pay,
        retension_amount: report?.retension,
      });
    }
  }, [form?.net_claim_amount, empForm?.estimatedLD, empForm?.retension_rate, empForm?.other_deduction]);

  const checkInvoiceDate = async () => {
    try {
      const response = await apiCallBack("GET", `po/hr/compliance/check?invoice_date=${form?.invoice_date}&purchasing_doc_no=${id}`, null, token);

      if (response?.status && response?.data) {
        setInvoiceData(response.data);
      } else {
        setInvoiceData(null);
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
    }
  };

  useEffect(() => {
    if (form?.invoice_date && id) {
      checkInvoiceDate();
    }
  }, [form?.invoice_date, id]);

  //delegateBTN

  const delegateBTN = async () => {
    try {
      if (!delegateForm.certifying_authority) {
        return toast.warn("Please select a delegate");
      }
      if (!delegateForm.remarks) {
        return toast.warn("Please enter remarks for delegation");
      }
      let payload = {
        btn_num: state?.btn_num,
        purchasing_doc_no: id,
        delegate_to: delegateForm.certifying_authority,
        status: "DELEGATED",
        remarks: delegateForm.remarks,
      };
      const response = await apiCallBack("POST", "po/btn/submitSBtnByCAuthorty", payload, token);
      if (response.status) {
        toast.success(response.message || "Delegated successfully");
        setDelegateForm({ certifying_authority: "", remarks: "" });
        setShowDelegateModal(false);
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.error(response.message || "Error delegating the BTN");
      }
    } catch (error) {
      console.error("Error delegating the BTN:", error);
      toast.error("Error delegating the BTN");
    }
  };

  const recommendBTN = async () => {
    try {
      if (!delegateForm.status) {
        return toast.warn("Please select a status");
      }
      if (!delegateForm.remarks) {
        return toast.warn("Please enter remarks for status");
      }
      let payload = {
        btn_num: state?.btn_num,
        purchasing_doc_no: id,
        status: delegateForm.status,
        remarks: delegateForm.remarks,
      };
      const response = await apiCallBack("POST", "po/btn/submitSBtnByCAuthorty", payload, token);
      if (response.status) {
        toast.success(response.message || `${delegateForm.status} successfully`);
        setDelegateForm({ certifying_authority: "", status: "", remarks: "" });
        setShowRECOMMENDModal(false);
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.error(response.message || `Error submitting ${delegateForm.status} status`);
      }
    } catch (error) {
      console.error(`Error submitting ${delegateForm.status} status:`, error);
      toast.error(`Error submitting ${delegateForm.status} status`);
    }
  };
  const handleForwardClick = (e) => {
    e.preventDefault(); // Prevent default form submission
    if (!empForm?.grn_no && !empForm?.check_wdc_number) {
      toast.warn("Please enter either GRN Number or WDC Number and check the value before submitting.");
      return;
    }
    if (!grnsesData?.total_price) {
      toast.warn("Please check the GRN/WDC number to populate the Total Amount before submitting.");
      return;
    }
    // if (!data?.invoice_date) {
    //   toast.warning("Invoice Date is mandatory.");
    //   return;
    // }
    setShowRemarksApprove(true);
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Service Contract Bills"} id={id} />
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
                              BTN NO: <strong>{state?.btn_num}</strong>
                            </span>
                          </h3>
                          <BTNServiceVendor data={data} form={form} invoiceData={invoiceData} />
                        </div>
                      </div>
                      {(user?.vendor_code === billCA || isDO || (user?.vendor_code && form?.delegate_to && user.vendor_code === form.delegate_to)) && (
                        <div className="col-12">
                          <div className="card">
                            <h3 className="m-3">ENTRY BY CERTIFYING AUTHORITY:</h3>
                            <div className="card-body p-3">
                              <div className="tab-content">
                                <div className="table-responsive">
                                  <table className="table table-striped table-bordered table_height">
                                    <tbody style={{ maxHeight: "100%" }}>
                                      <tr>
                                        <td>Finance Authority</td>
                                        <td className="btn_value">
                                          {/* <Select
                                            className="basic-single w-100"
                                            classNamePrefix="select"
                                            isClearable={true}
                                            isSearchable={true}
                                            name="empFinance"
                                            id="empFinance"
                                            options={empFinance}
                                            value={empFinance.filter((item) => item.value === empForm?.finance_authority)[0]}
                                            onChange={(val) =>
                                              setEmpForm({
                                                ...empForm,
                                                finance_authority: val ? val.value : null,
                                              })
                                            }
                                          /> */}
                                          <HrSearchableSelect
                                            options={empFinance}
                                            value={empForm?.finance_authority}
                                            onChange={(val) =>
                                              setEmpForm({
                                                ...empForm,
                                                finance_authority: val ? val.value : null,
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
                                          <b>{empForm?.btn_num}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>GRN/WDC no:</td>
                                        <td>
                                          <div className="d-flex align-items-center">
                                            <div className="me-2">
                                              <input
                                                type="text"
                                                className="form-control me-3"
                                                name="grn_no"
                                                id="grn_no"
                                                value={empForm?.grn_no}
                                                placeholder={"GRN Number"}
                                                onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}
                                                style={{ minWidth: "150px" }}
                                              />
                                            </div>
                                            <div className="mx-2 fw-bold text-nowrap">AND/OR</div>
                                            <div className="me-2">
                                              <input
                                                type="text"
                                                className="form-control me-3"
                                                name="check_wdc_number"
                                                id="check_wdc_number"
                                                value={empForm?.check_wdc_number}
                                                placeholder={"WDC"}
                                                onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}
                                                style={{ minWidth: "150px" }}
                                              />
                                            </div>

                                            {/* CHECK Button */}
                                            <DynamicButton label="CHECK" onClick={checkValue} className="btn btn-primary btn-sm" />
                                          </div>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Total Amount</td>
                                        <td>
                                          {console.log(grnsesData?.total_price, "grnsesData?.total_price abhiiii")}
                                          <b>&#8377;{grnsesData?.total_price}</b>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                  {grnsesData?.total_price ? (
                                    <>
                                      <table className="table table-striped table-bordered table_height">
                                        <thead>
                                          <tr>
                                            <th>LI</th>
                                            <th>Sub-LI</th>
                                            <th>Description</th>
                                            <th>UOM</th>
                                            <th>Claim Qty</th>
                                            <th>Claim Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {checkTypeArr(grnsesData?.lineItems) &&
                                            grnsesData?.lineItems.map((item, i) => (
                                              <tr key={i}>
                                                <td>{item?.lineitem}</td>
                                                <td>{item?.sublineitem}</td>
                                                <td>{item?.description}</td>
                                                <td>{item?.unit}</td>
                                                <td>{item?.claim_qty}</td>
                                                <td>{item?.claim_amount}</td>
                                              </tr>
                                            ))}
                                          <tr>
                                            <td colSpan={5}>Total:</td>
                                            <td colSpan={2}>
                                              <b>&#8377;{grnsesData?.total_price}</b>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                      <table className="table table-striped table-bordered table_height">
                                        <tbody>
                                          <tr>
                                            <td>Max LD</td>
                                            <td>
                                              <select name="max_ld" id="" className="form-select" onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}>
                                                <option value="">Choose Max LD</option>
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="10">10%</option>
                                              </select>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Estimated Total LD</td>
                                            <td>&#8377;{empForm?.estimatedLD}</td>
                                          </tr>
                                          <tr>
                                            <td>Retension if any (%)</td>
                                            <td className="btn_value">
                                              <input
                                                type="number"
                                                name="retension_rate"
                                                className="form-control"
                                                value={empForm?.retension_rate}
                                                onChange={(e) => {
                                                  let value = e.target.value;
                                                  if (value > 100) value = 100;
                                                  if (value < 0) value = 0;
                                                  setEmpForm({
                                                    ...empForm,
                                                    retension_rate: value,
                                                  });
                                                }}
                                                onWheel={inputOnWheelPrevent}
                                                min="0"
                                                max="100"
                                              />
                                              <span className="ms-1">%</span>
                                              <span className="ms-2">Retension Amount: {empForm?.retension_amount}</span>
                                            </td>
                                          </tr>

                                          <tr>
                                            <td>Remarks for Retension</td>
                                            <td>
                                              <input
                                                type="text"
                                                name="retension_remarks"
                                                className="form-control"
                                                value={empForm?.retension_remarks}
                                                onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}
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
                                                value={empForm?.other_deduction}
                                                onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}
                                                onWheel={inputOnWheelPrevent}
                                              />
                                            </td>
                                          </tr>

                                          <tr>
                                            <td>Deduction Remarks</td>
                                            <td>
                                              <input
                                                type="text"
                                                name="deduction_remarks"
                                                className="form-control"
                                                value={empForm?.deduction_remarks}
                                                onChange={(e) => inputTypeChange(e, empForm, setEmpForm)}
                                              />
                                            </td>
                                          </tr>

                                          <tr>
                                            <td>Total deductions</td>
                                            <td>
                                              <b>&#8377; {isNaN(empForm?.total_deduction) ? 0 : empForm?.total_deduction}</b>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td>Net payable amount</td>
                                            <td>
                                              <b>&#8377; {empForm?.net_payable_amount || 0}</b>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </>
                                  ) : (
                                    <table className="table table-striped table-bordered table_height">
                                      <thead>
                                        <tr>
                                          <th className="text-center">Please check the Service Entry Value / GRN Value</th>
                                        </tr>
                                      </thead>
                                    </table>
                                  )}
                                </div>
                                <p>Certified that Invoice has been verified w.r.t PO and recommanded for release of payment subject to satutatory deduction.</p>
                                <div className="row">
                                  <div className="col-6 text-start">
                                    {showRemarksapprove ? (
                                      <>
                                        <textarea
                                          type="text"
                                          placeholder="Enter remarks for Forward"
                                          value={remarksforword}
                                          onChange={(e) => setRemarksforword(e.target.value)}
                                          className="form-control mb-2"
                                        />
                                        <DynamicButton
                                          label="Submit"
                                          onClick={() => actionHandlerServiceByEmp(empForm, grnsesData, setEmpForm, initialEmpData, navigate, id, token, form, remarksforword)}
                                          className="btn fw-bold btn-primary me-3"
                                        />
                                      </>
                                    ) : (
                                      <>
                                        {((isDO && form.is_dreturn === "Y") || user?.vendor_code === form.current_ca || user?.vendor_code === form.bill_certifing_authority) && (
                                          <button className="btn fw-bold btn-primary me-3" onClick={handleForwardClick}>
                                            Forward
                                          </button>
                                        )}
                                      </>
                                    )}

                                    {/* {!(user?.vendor_code && form?.delegate_to && user.vendor_code === form.delegate_to) && (
                                      <DynamicButton label="Delegate" onClick={() => setShowDelegateModal(true)} className="btn fw-bold btn-primary me-3" />
                                    )} */}

                                    {(user?.vendor_code === form.current_ca || user?.vendor_code === form.bill_certifing_authority || (isDO && form.is_dreturn === "Y")) &&
                                      user?.vendor_code != form.delegate_to && (
                                        <DynamicButton label="Delegate" onClick={() => setShowDelegateModal(true)} className="btn fw-bold btn-primary me-3" />
                                      )}
                                    {user?.vendor_code === form.delegate_to && form?.status === "DELEGATED" && (
                                      <DynamicButton label="Recommend" onClick={() => setShowRECOMMENDModal(true)} className="btn fw-bold btn-primary me-3" />
                                    )}
                                    <button className="btn btn-sm btn-primary me-3" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                      BACK
                                    </button>
                                  </div>
                                  <div className="col-6 text-end">
                                    {showRemarks ? (
                                      <>
                                        <textarea
                                          type="text"
                                          placeholder="Enter remarks for REJECT"
                                          value={remarks}
                                          onChange={(e) => setRemarks(e.target.value)}
                                          className="form-control mb-2"
                                        />
                                        <DynamicButton label="Submit Rejection" className="btn fw-bold btn-danger" onClick={rejectBTN} />
                                      </>
                                    ) : (
                                      <>
                                        {((isDO && form.is_dreturn === "Y") || user?.vendor_code === form.current_ca || user?.vendor_code === form.bill_certifing_authority) && (
                                          <button className="btn fw-bold btn-danger" onClick={() => setShowRemarks(true)}>
                                            REJECT
                                          </button>
                                        )}
                                      </>
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
      <div className={`modal fade ${showDelegateModal ? "show d-block" : ""}`} tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Delegate Bill</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowDelegateModal(false);
                  setDelegateForm({ certifying_authority: "", remarks: "" });
                }}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Delegated To</label>
                    {/* <Select
                      className="basic-single"
                      classNamePrefix="select"
                      isClearable={true}
                      isSearchable={true}
                      name="emp"
                      id="emp"
                      options={emp}
                      value={emp && emp.filter((item) => item.value === delegateForm?.certifying_authority)}
                      onChange={(val) => setDelegateForm({ ...delegateForm, certifying_authority: val?.value || "" })}
                    /> */}
                    <HrSearchableSelect
                      options={emp}
                      value={delegateForm?.certifying_authority}
                      onChange={(val) => setDelegateForm({ ...delegateForm, certifying_authority: val?.value || "" })}
                      placeholder="Select delegate"
                      isClearable={true}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      type="text"
                      className="form-control"
                      value={delegateForm.remarks}
                      onChange={(e) => setDelegateForm({ ...delegateForm, remarks: e.target.value })}
                      placeholder="Enter remarks for delegation"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDelegateModal(false);
                  setDelegateForm({ certifying_authority: "", remarks: "" });
                }}
              >
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={delegateBTN}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`modal fade ${showRECOMMENDModal ? "show d-block" : ""}`} tabIndex="-1" role="dialog" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Recommend Bill</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => {
                  setShowRECOMMENDModal(false);
                  setDelegateForm({ certifying_authority: "", status: "", remarks: "" });
                }}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    {/* <label className="form-label">Status</label> */}
                    <select className="form-select" value={delegateForm.status} onChange={(e) => setDelegateForm({ ...delegateForm, status: e.target.value })}>
                      <option value="">Select Status</option>
                      <option value="RECOMMEND">Recommended</option>
                      <option value="NON_RECOMMEND">Non Recommended</option>
                    </select>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      type="text"
                      className="form-control"
                      value={delegateForm.remarks}
                      onChange={(e) => setDelegateForm({ ...delegateForm, remarks: e.target.value })}
                      placeholder="Enter remarks for status"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowRECOMMENDModal(false);
                  setDelegateForm({ certifying_authority: "", status: "", remarks: "" });
                }}
              >
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={recommendBTN}>
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ServiceContractBillsEdit;
