import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { apiCallBack, postAPI } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import Select from "react-select";
import { reConfirm } from "../utils/reConfirm";
import { inputOnWheelPrevent } from "../utils/inputOnWheelPrevent";
import { clrLegend } from "../utils/clrLegend";
import { BGEntry, bgInputs } from "../Helpers/BG";
import { ACTION_ABG, ACTION_DD, ACTION_IB, ACTION_O, ACTION_PBG, ACTION_SDBG, ACTION_RM, FORWARD_TO_FINANCE, SUBMITTED } from "../constants/BGconstants";
import { logOutFun } from "../utils/logOutFun";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { groupedByActionType, groupedByRefNo } from "../utils/groupedByReq";
import jsPDF from "jspdf";

const SDBGSub = () => {
  const dispatch = useDispatch();
  const inputFileRef = useRef(null);
  const { id } = useParams();
  const [isPopup, setIsPopup] = useState(false);
  const [isEntryPopup, setIsEntryPopup] = useState(false);
  const [isAssignPopup, setIsAssignPopup] = useState(false);
  const [isCheckEntryPopup, setIsCheckEntryPopup] = useState(false);
  const [allsdbg, setAllsdbg] = useState([]);
  const [groupedBG, setGroupedBG] = useState([]);
  const [sdbgEntry, setSdbgEntry] = useState([]);
  const [selectedActionType, setSelectedActionType] = useState("");
  const [formData, setFormData] = useState({
    sdbgFile: null,
    remarks: "",
  });

  let bg = { ...bgInputs, purchasing_doc_no: id };
  const [formDatainput, setFormDatainput] = useState(bg);
  const { user, token, userType } = useSelector((state) => state.auth);
  const { isDO } = useSelector((state) => state.selectedPO);
  const [empOption, setEmpOption] = useState([]);
  const [assign, setAssign] = useState({
    purchasing_doc_no: id,
    assigned_from: user?.vendor_code,
    assigned_to: null,
    remarks: "Assigned to Finance Employee",
    status: "ASSIGNED",
  });

  const getSDBG = async () => {
    const data = await apiCallBack("GET", `po/sdbg/getSDBGData?poNo=${id}`, null, token);
    if (data?.status) {
      setAllsdbg(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
    }
  };

  const getSDBGEntry = async (refNo) => {
    const data = await apiCallBack("GET", `po/sdbg/getSdbgEntry?poNo=${id}&reference_no=${refNo}`, null, token);
    if (data?.status) {
      setSdbgEntry(data?.data);
    }
  };

  useEffect(() => {
    if (formDatainput?.reference_no) {
      getSDBGEntry(formDatainput?.reference_no);
    }
  }, [formDatainput?.reference_no]);

  const getEmpList = async () => {
    const res = await apiCallBack("GET", `po/sdbg/assigneeList`, null, token);
    if (res?.status) {
      let options =
        res?.data &&
        res.data.map((item, index) => {
          return {
            value: item.emp_id,
            label: `${item.CNAME} (${item.emp_id})`,
          };
        });
      setEmpOption(options);
    }
  };

  const handleInputChange2 = (e) => {
    const { name, value } = e.target;
    setFormDatainput((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  useEffect(() => {
    getSDBG();
    if (user?.user_type !== 1) {
      getEmpList();
    }
  }, []);

  useEffect(() => {
    if (id) {
      setFormDatainput({ ...formDatainput, purchasing_doc_no: id });
    } else {
      toast.warn("You must provide PO Number!");
    }
  }, [id]);

  const updateSDBG = async (flag) => {
    const { sdbgFile, remarks } = formData;
    if (selectedActionType.trim() === "" || !sdbgFile || remarks.trim() === "") {
      return toast.warn("Please provide all required fields");
    }
    try {
      const form = new FormData();
      form.append("purchasing_doc_no", id);
      form.append("file", formData.sdbgFile);
      form.append("remarks", formData.remarks);
      form.append("status", flag);
      form.append("action_type", selectedActionType);

      const response = await apiCallBack("POST", `po/sdbg/submitSDBG`, form, token);
      if (response.status) {
        setIsPopup(false);
        toast.success("Form submitted successfully");
        setFormData({
          sdbgFile: null,
          remarks: "",
        });
        inputFileRef.current.value = null;
        setSelectedActionType("");
        getSDBG();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Form submission failed");
    }
  };

  const uploadSDBGEntry = async () => {
    let status = await BGEntry(formDatainput, token);
    if (status) {
      setIsPopup(false);
      setIsEntryPopup(false);
      let bg = { ...bgInputs, purchasing_doc_no: id };
      setFormDatainput(bg);
      getSDBG();
    }
  };
  const rejectSDBG = async (flag = "REJECTED") => {
    let form = {
      purchasing_doc_no: id,
      reference_no: formDatainput?.reference_no,
      status: flag,
      remarks: "SDBG REJECTED by Dealing Officer",
    };
    const d = await postAPI("po/sdbg/sdbgSubmitByDealingOfficer", form, token);
    if (d?.status) {
      toast.success(d?.message);
      setIsPopup(false);
      setIsEntryPopup(false);
      let bg = { ...bgInputs, purchasing_doc_no: id };
      setFormDatainput(bg);
      getSDBG();
    } else {
      toast.error(d?.message);
    }
  };

  const assignSDBGByFinance = async () => {
    if (assign?.assigned_to) {
      const res = await apiCallBack("POST", `po/sdbg/sdbgUpdateByFinance`, assign, token);
      if (res?.status) {
        setIsAssignPopup(false);
        toast.success(`Successfully assigned to ${assign?.assigned_to}`);
        getSDBG();
      }
    } else {
      toast.warn("Please choose an employee to Assign!");
    }
  };

  const financeEntry = async (flag) => {
    let remarks;
    let action_type = "SDBG SUBMISSION";

    if (flag === "APPROVED") {
      remarks = "APPROVED by Finance Officer";
    } else if (flag === "RETURN_TO_DO") {
      remarks = "SDBG Entry returned to dealing officer for correction";
    } else if (flag === "REJECTED") {
      remarks = "Rejected by Finance Officer";
    }

    let payload = {
      purchasing_doc_no: id,
      status: flag,
      remarks,
      action_type,
      reference_no: sdbgEntry?.reference_no,
    };

    const data = await apiCallBack("POST", `po/sdbg/sdbgUpdateByFinance`, payload, token);

    if (data?.status) {
      setIsCheckEntryPopup(false);
      getSDBG();
      toast.success(data?.message);
    } else {
      toast.warn(data?.message);
    }
  };

  useEffect(() => {
    if (allsdbg && allsdbg.length > 0) {
      const gData = groupedByActionType(allsdbg);
      setGroupedBG(gData);
    }
  }, [allsdbg]);

  const handleDownloadPDF = () => {
    // Generate PDF
    const pdf = generatePDFFromSDBGEntry(sdbgEntry);

    // Trigger download
    pdf.save("sdbg_entry.pdf");
  };

  const generatePDFFromSDBGEntry = (entry) => {
    const pdf = new jsPDF();

    // Add content to PDF
    let y = 20; // Initial y-coordinate
    pdf.text(20, y, `Reference No: ${entry?.reference_no}`);
    y += 10; // Increase y-coordinate for the next line
    pdf.text(20, y, `BG Entry Date: ${entry?.created_at && new Date(entry?.created_at).toLocaleDateString()}`);
    y += 10;
    pdf.text(20, y, `Bankers Name: ${entry?.bank_name}`);
    y += 10;
    pdf.text(20, y, `Bankers Branch: ${entry?.branch_name}`);
    y += 10;
    pdf.text(20, y, `Bankers Address1: ${entry?.bank_addr1}`);
    y += 10;
    if (entry?.bank_addr2) {
      pdf.text(20, y, `Bankers Address2: ${entry?.bank_addr2}`);
      y += 10;
    }
    if (entry?.bank_addr3) {
      pdf.text(20, y, `Bankers Address3: ${entry?.bank_addr3}`);
      y += 10;
    }
    pdf.text(20, y, `Bankers City: ${entry?.bank_city}`);
    y += 10;
    pdf.text(20, y, `Bank Pincode: ${entry?.bank_pin_code}`);
    y += 10;
    pdf.text(20, y, `Bank Guarantee No: ${entry?.bg_no}`);
    y += 10;
    // pdf.text(
    //   20,
    //   y,
    //   `BG Date: ${
    //     entry?.bg_date
    //       ? new Date(entry?.bg_date * 1000).toLocaleDateString()
    //       : ""
    //   }`
    // );
    // y += 10;
    pdf.text(20, y, `BG Date: ${entry?.bg_date && new Date(entry?.bg_date * 1000).toLocaleDateString()}`);
    y += 10;
    pdf.text(20, y, `BG Amount: ${entry?.bg_ammount}`);
    y += 10;
    pdf.text(20, y, `BG Type: ${entry?.bg_type}`);
    y += 10;
    pdf.text(20, y, `Department: ${entry?.department}`);
    y += 10;
    pdf.text(20, y, `PO Number: ${entry?.purchasing_doc_no}`);
    y += 10;
    pdf.text(20, y, `PO Date: ${entry?.po_date && new Date(entry?.po_date).toLocaleDateString()}`);
    y += 10;
    pdf.text(20, y, `Yard No: ${entry?.yard_no}`);
    y += 10;
    pdf.text(20, y, `Validity Date: ${entry?.validity_date ? new Date(entry?.validity_date * 1000).toLocaleDateString() : ""}`);
    y += 10;
    pdf.text(20, y, `Claim Period: ${entry?.claim_priod ? new Date(entry?.validity_date * 1000).toLocaleDateString() : ""}`);
    y += 10;
    pdf.text(20, y, `Vendor Name: ${entry?.vendor_name}`);
    y += 10;
    pdf.text(20, y, `Vendor Address1: ${entry?.vendor_address1}`);
    y += 10;
    // pdf.text(20, y, `Vendor Address2: ${entry.vendor_address2}`);
    // y += 10;
    // pdf.text(20, y, `Vendor Address3: ${entry.vendor_address3}`);
    // y += 10;
    // pdf.text(20, y, `Vendor Address3: ${entry.vendor_address3}`);
    // y += 10;
    pdf.text(20, y, `Vendor City: ${entry?.vendor_city}`);
    y += 10;
    pdf.text(20, y, `Vendor Pincode: ${entry?.vendor_pin_code}`);
    y += 10;
    return pdf;
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Security Deposits Status"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {/* Not Vendor */}
                        {user?.user_type !== 1 && (
                          <>
                            {/* Finance Head (deptid = 15 and internal_role_Id 1) */}
                            {user?.department_id === 15 && user?.internal_role_id === 1 && (
                              <>
                                <p className="m-0 p-2">
                                  {!allsdbg[allsdbg?.length - 1]?.assigned_to ? "(Not Assigned!)" : `Assigned to ${allsdbg[allsdbg?.length - 1]?.assigned_to}`}
                                </p>
                                <button onClick={() => setIsAssignPopup(true)} className="btn fw-bold btn-primary me-3">
                                  ASSIGN
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {/* Vendor  */}
                        {user?.user_type === 1 && (
                          <>
                            <button onClick={() => setIsPopup(true)} className="btn fw-bold btn-primary">
                              ACTION
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  {/* <th className="min-w-170px">Action Type</th> */}
                                  <th className="min-w-150px">DateTime </th>
                                  <th className="min-w-90px">File</th>
                                  <th className="min-w-150px">Action By</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th>Status</th>
                                  {(isDO || user?.department_id === 15) && <th className="min-w-150px">Action</th>}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {Object.keys(groupedBG).map((it, index) => {
                                  let items = groupedBG[it];
                                  return (
                                    <Fragment key={index}>
                                      <tr>
                                        <td colSpan={10}>
                                          <b>{it}</b>
                                        </td>
                                      </tr>
                                      {items &&
                                        groupedByRefNo(items) &&
                                        Object.keys(groupedByRefNo(items)).map((item, ind) => {
                                          let ite = groupedByRefNo(items)[item];
                                          return (
                                            <Fragment key={ind}>
                                              <tr>
                                                <td colSpan={10}>
                                                  <b>{item}</b>
                                                </td>
                                              </tr>
                                              {ite &&
                                                ite.map((data, dex) => (
                                                  <tr>
                                                    {/* <td className="table_center">
                                                        {data?.action_type}
                                                      </td> */}
                                                    <td className="table_center">{data?.created_at && new Date(data?.created_at).toLocaleString()}</td>
                                                    <td>
                                                      <a href={`${process.env.REACT_APP_PDF_URL}/submitSDBG/${data.file_name}`} target="_blank" rel="noreferrer">
                                                        Check File
                                                      </a>
                                                    </td>
                                                    <td>
                                                      {data?.created_by_name} ({data?.created_by_id})
                                                    </td>
                                                    <td>{data?.remarks}</td>
                                                    <td className={`${clrLegend(data?.status)} bold`}>{data?.status}</td>
                                                    <td>
                                                      {isDO &&
                                                        data?.status === SUBMITTED &&
                                                        (data?.action_type === ACTION_SDBG ||
                                                          data?.action_type === ACTION_DD ||
                                                          data?.action_type === ACTION_IB ||
                                                          data?.action_type === ACTION_PBG) && (
                                                          <>
                                                            <button
                                                              onClick={() => {
                                                                setIsEntryPopup(true);
                                                                setFormDatainput({
                                                                  ...formDatainput,
                                                                  reference_no: data?.reference_no,
                                                                });
                                                              }}
                                                              className="btn fw-bold btn-primary me-3"
                                                            >
                                                              ACTION
                                                            </button>
                                                          </>
                                                        )}
                                                      {data?.status === FORWARD_TO_FINANCE && (
                                                        <>
                                                          {user?.department_id === 15 && (
                                                            <>
                                                              <button
                                                                onClick={() => {
                                                                  setIsCheckEntryPopup(true);
                                                                  setFormDatainput({
                                                                    ...formDatainput,
                                                                    reference_no: data?.reference_no,
                                                                  });
                                                                }}
                                                                className="btn fw-bold btn-primary me-3"
                                                              >
                                                                ACTION
                                                              </button>
                                                            </>
                                                          )}
                                                        </>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                            </Fragment>
                                          );
                                        })}
                                    </Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>

      {/* vendor */}
      {user?.user_type === 1 && (
        <div className={isPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">UPLOAD BG</span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setIsPopup(false);
                  setSelectedActionType("");
                  setFormData({
                    sdbgFile: null,
                    remarks: "",
                  });
                }}
              >
                Close
              </button>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="my-3">
                  <select
                    name=""
                    id=""
                    className="form-select"
                    onChange={(e) => {
                      setSelectedActionType(e.target.value);
                    }}
                    value={selectedActionType}
                  >
                    <option value="">Choose Action Type</option>
                    <option value={ACTION_SDBG}>{ACTION_SDBG}</option>
                    <option value={ACTION_IB}>{ACTION_IB}</option>
                    <option value={ACTION_DD}>{ACTION_DD}</option>
                    <option value={ACTION_PBG}>{ACTION_PBG}</option>
                    <option value={ACTION_ABG}>{ACTION_ABG}</option>
                    <option value={ACTION_RM}>{ACTION_RM}</option>
                    <option value={ACTION_O}>{ACTION_O}</option>
                  </select>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">SDBG File</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="file" ref={inputFileRef} className="form-control" onChange={(e) => setFormData({ ...formData, sdbgFile: e.target.files[0] })} accept=".pdf" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <textarea
                    name=""
                    id=""
                    rows="4"
                    className="form-control"
                    value={formData?.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <button onClick={() => updateSDBG("SUBMITTED")} className="btn fw-bold btn-primary" type="submit">
                    SUBMIT
                  </button>
                  {userType !== 1 && (
                    <button onClick={() => updateSDBG("Approved")} className="btn fw-bold btn-primary" type="submit">
                      Approved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* for DO */}
      {isDO && (
        <div className={isEntryPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">BG Entry</span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setIsEntryPopup(false);
                  let bg = { ...bgInputs, purchasing_doc_no: id };
                  setFormDatainput(bg);
                }}
              >
                Close
              </button>
            </div>
            <div className="row">
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Ref No</label>
                  <input type="text" className="form-control" name="reference_no" value={formDatainput?.reference_no || ""} disabled />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Name</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bank_name" value={formDatainput?.bank_name || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Branch</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="branch_name" value={formDatainput?.branch_name || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address1</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bank_addr1" value={formDatainput?.bank_addr1 || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address2</label>
                  <input type="text" className="form-control" name="bank_addr2" value={formDatainput?.bank_addr2 || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address3</label>
                  <input type="text" className="form-control" name="bank_addr3" value={formDatainput?.bank_addr3 || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers City</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bank_city" value={formDatainput?.bank_city || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Pincode</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input
                    type="number"
                    className="form-control"
                    name="bank_pin_code"
                    value={formDatainput?.bank_pin_code || ""}
                    onChange={handleInputChange2}
                    onWheel={(e) => inputOnWheelPrevent(e)}
                  />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Guarantee No</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bg_no" value={formDatainput?.bg_no || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Date</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <DatePicker
                    selected={formDatainput?.bg_date}
                    onChange={(date) => setFormDatainput({ ...formDatainput, bg_date: date })}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Amount</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input
                    type="number"
                    className="form-control"
                    name="bg_ammount"
                    value={formDatainput?.bg_ammount || ""}
                    onChange={handleInputChange2}
                    onWheel={(e) => inputOnWheelPrevent(e)}
                  />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <input type="text" className="form-control" name="yard_no" value={formDatainput?.yard_no || ""} onChange={handleInputChange2} />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Validity Date</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <DatePicker
                    selected={formDatainput?.validity_date}
                    onChange={(date) =>
                      setFormDatainput({
                        ...formDatainput,
                        validity_date: date,
                      })
                    }
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Claim Period</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <DatePicker
                    selected={formDatainput?.claim_priod || ""}
                    onChange={(date) =>
                      setFormDatainput({
                        ...formDatainput,
                        claim_priod: date,
                      })
                    }
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                  />
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Type</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <select className="form-select" name="" id="" value={formData?.bg_type} onChange={(e) => setFormData({ ...formData, bg_type: e.target.value })}>
                    <option value="SDBG">SDBG</option>
                    <option value="PBG">PBG</option>
                    <option value="ADVANCED BG">ADVANCED BG</option>
                  </select>
                </div>
              </div>

              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <button onClick={() => uploadSDBGEntry("FORWARD_TO_FINANCE")} className="btn fw-bold btn-primary" type="submit">
                    FORWARD TO FINANCE
                  </button>
                  <button className="btn fw-bold btn-success btn-sm" onClick={handleDownloadPDF}>
                    Download BG Entry
                  </button>
                  <button
                    onClick={() => reConfirm({ file: true }, () => rejectSDBG("REJECTED"), "You're going to Reject the SDBG. Please confirm!")}
                    className="btn fw-bold btn-danger"
                    type="submit"
                  >
                    REJECTED
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* for finance officer  */}
      {user?.department_id === 15 && (
        <div className={isCheckEntryPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Check BG Entry</span>
              </h3>
              {/* <button
                className="btn fw-bold btn-success btn-sm"
                onClick={handleDownloadPDF}
              >
                Download BG Entry
              </button> */}
              <button className="btn fw-bold btn-danger" onClick={() => setIsCheckEntryPopup(false)}>
                Close
              </button>
            </div>

            <div className="row">
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Reference No</label>
                  <p>{sdbgEntry?.reference_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Entry Date</label>
                  {/* <p>{sdbgEntry?.created_at}</p> */}
                  <p> {sdbgEntry?.created_at ? new Date(sdbgEntry?.created_at).toLocaleDateString() : ""}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Name</label>
                  <p>{sdbgEntry?.bank_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Branch</label>
                  <p>{sdbgEntry?.branch_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address1</label>
                  <p>{sdbgEntry?.bank_addr1}</p>
                </div>
              </div>
              {sdbgEntry?.bank_addr2 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Bankers Address2</label>
                      <p>{sdbgEntry?.bank_addr2}</p>
                    </div>
                  </div>
                </>
              )}
              {sdbgEntry?.bank_addr3 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Bankers Address3</label>
                      <p>{sdbgEntry?.bank_addr3}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers City</label>
                  <p>{sdbgEntry?.bank_city}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Pincode</label>
                  <p>{sdbgEntry?.bank_pin_code}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Guarantee No</label>
                  <p>{sdbgEntry?.bg_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Date</label>
                  <p>{sdbgEntry?.bg_date ? new Date(sdbgEntry?.bg_date * 1000).toLocaleDateString() : ""}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Amount</label>
                  <p>{sdbgEntry?.bg_ammount}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Type</label>
                  <p>{sdbgEntry?.bg_type}</p>
                </div>
              </div>

              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <p>{sdbgEntry?.department}</p>
                </div>
              </div> */}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">PO Number</label>
                  <p>{sdbgEntry?.purchasing_doc_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">PO Date</label>
                  <p>{sdbgEntry?.po_date && new Date(sdbgEntry?.po_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <p>{sdbgEntry?.yard_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Validity Date</label>
                  <p>{sdbgEntry?.validity_date ? new Date(sdbgEntry?.validity_date * 1000).toLocaleDateString() : ""}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Claim Period</label>
                  <p>{sdbgEntry?.claim_priod ? new Date(sdbgEntry?.validity_date * 1000).toLocaleDateString() : ""}</p>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Name</label>
                  <p>{sdbgEntry?.vendor_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Address1</label>
                  <p>{sdbgEntry?.vendor_address1}</p>
                </div>
              </div>
              {sdbgEntry?.vendor_address2 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Vendor Address2</label>
                      <p>{sdbgEntry?.vendor_address2}</p>
                    </div>
                  </div>
                </>
              )}
              {sdbgEntry?.vendor_address3 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Vendor Address3</label>
                      <p>{sdbgEntry?.vendor_address3}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor City</label>
                  <p>{sdbgEntry?.vendor_city}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Pincode</label>
                  <p>{sdbgEntry?.vendor_pin_code}</p>
                </div>
              </div>
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Checklist Reference</label>
                  <p>{sdbgEntry?.check_list_reference}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Checklist Date</label>
                  <p>
                    {sdbgEntry?.check_list_date
                      ? new Date(sdbgEntry?.validity_date).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div> */}
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Name</label>
                  <p>{sdbgEntry?.vendor_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Address1</label>
                  <p>{sdbgEntry?.vendor_address1}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Address2</label>
                  <p>{sdbgEntry?.vendor_address2}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Address3</label>
                  <p>{sdbgEntry?.vendor_address3}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor City</label>
                  <p>{sdbgEntry?.vendor_city}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Pincode</label>
                  <p>{sdbgEntry?.vendor_pin_code}</p>
                </div>
              </div> */}
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date1</label>
                  <p>{sdbgEntry?.extension_date1}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date2</label>
                  <p>{sdbgEntry?.extension_date2}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date3</label>
                  <p>{sdbgEntry?.extension_date3}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date4</label>
                  <p>{sdbgEntry?.extension_date4}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date5</label>
                  <p>{sdbgEntry?.extension_date5}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Extension Date6</label>
                  <p>{sdbgEntry?.extension_date6}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Release Date</label>
                  <p>{sdbgEntry?.release_date}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Demand Notice Date</label>
                  <p>{sdbgEntry?.demand_notice_date}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Entension Letter Date</label>
                  <p>{sdbgEntry?.entension_letter_date}</p>
                </div>
              </div> */}
              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <button
                    onClick={() => reConfirm({ file: true }, () => financeEntry("APPROVED"), "You're going to Accept the SDBG Entry. Please confirm!")}
                    className="btn fw-bold btn-success me-3"
                    type="button"
                  >
                    APPROVED
                  </button>
                  <button type="button" onClick={() => toast.warn("SAP is not conntected!")}>
                    HOLD
                  </button>
                  <button
                    onClick={() =>
                      reConfirm({ file: true }, () => financeEntry("RETURN_TO_DO"), "You're going to return the SDBG Entry to Dealing Officer to recheck. Please confirm!")
                    }
                    className="btn fw-bold btn-primary"
                    type="button"
                  >
                    Return to Dealing Officer
                  </button>
                  <button
                    onClick={() => reConfirm({ file: true }, () => financeEntry("REJECTED"), "You're going to Reject the SDBG Entry. Please confirm!")}
                    className="btn fw-bold btn-danger"
                    type="button"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* for finance officer and Assigner  */}
      {userType !== 1 && user.department_id === 15 && user.internal_role_id === 1 && (
        <div className={isAssignPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">ASSIGN</span>
              </h3>
              <button className="btn fw-bold btn-danger" onClick={() => setIsAssignPopup(false)}>
                Close
              </button>
            </div>
            <form>
              <div className="row" style={{ overflow: "unset" }}>
                <div className="col-12">
                  <div className="mb-3">
                    <label htmlFor="empName">Employee Name</label>
                    <Select
                      className="basic-single"
                      classNamePrefix="select"
                      isClearable={true}
                      isSearchable={true}
                      name="empName"
                      id="empName"
                      options={empOption}
                      onChange={(val) => setAssign({ ...assign, assigned_to: val.value })}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    <button onClick={() => assignSDBGByFinance()} className="btn fw-bold btn-primary" type="button">
                      ASSIGN
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default SDBGSub;
