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
import { BGEntry, BGEntrySave, bgInputs } from "../Helpers/BG";
import {
  ACTION_ABG,
  ACTION_DD,
  ACTION_IB,
  ACTION_O,
  ACTION_PBG,
  ACTION_SDBG,
  ACTION_RM,
  FORWARD_TO_FINANCE,
  SUBMITTED,
} from "../constants/BGconstants";
import { logOutFun } from "../utils/logOutFun";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { groupedByActionType, groupedByRefNo } from "../utils/groupedByReq";
import jsPDF from "jspdf";
import { checkTypeArr } from "../utils/smallFun";
import { convertToEpoch, formatDate } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import { ASSIGNER, DEPT_FI, USER_VENDOR } from "../constants/userConstants";
import SkeletonLoader from "../loader/SkeletonLoader";

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
  const [expandedReferences, setExpandedReferences] = useState({});

  const [sdbgEntryForFi, setSdbgEntryForFi] = useState({
    bg_file_no: "",
  });
  const [selectedActionType, setSelectedActionType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    sdbgFile: null,
    remarks: "",
  });
  const [entryState, setEntryState] = useState({});
  const GRSE_LOGO_BASE64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...";

  let bg = { ...bgInputs, purchasing_doc_no: id };
  const [formDatainput, setFormDatainput] = useState(bg);
  const { user, token, userType } = useSelector((state) => state.auth);
  const { isDO } = useSelector((state) => state.selectedPO);
  const [empOption, setEmpOption] = useState([]);
  const [currentAssign, setCurrentAssign] = useState([]);
  const [assign, setAssign] = useState({
    purchasing_doc_no: id,
    assigned_from: user?.vendor_code,
    assigned_to: null,
    remarks: "Assigned to Fi Employee",
    status: "ASSIGNED",
  });

  const convertToEpochh = (date) => {
    return Math.floor(new Date(date).getTime() / 1000);
  };

  const parseDateFromEpoch = (epoch) => {
    return epoch ? new Date(epoch * 1000) : null;
  };

  const getSDBG = async () => {
    const data = await apiCallBack(
      "GET",
      `po/sdbg/getSDBGData?poNo=${id}`,
      null,
      token
    );
    if (data?.status) {
      setAllsdbg(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
    }
  };

  const getAssign = async () => {
    const data = await apiCallBack(
      "GET",
      `po/sdbg/getCurrentAssignee?poNo=${id}`,
      null,
      token
    );
    if (data?.status) {
      setCurrentAssign(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
    }
  };

  // const getSDBGEntry = async (refNo) => {
  //   console.log("LEE", refNo, id);
  //   const data = await apiCallBack(
  //     "GET",
  //     `po/sdbg/getSdbgEntry?poNo=${id}&reference_no=${refNo}`,
  //     null,
  //     token
  //   );
  //   if (data?.status) {
  //     setSdbgEntry(data?.data);
  //   }
  // };

  // useEffect(() => {
  //   if (formDatainput?.reference_no) {
  //     getSDBGEntry(formDatainput?.reference_no);
  //   }
  // }, [formDatainput?.reference_no]);

  // handle remarks to deling ofiicer
  // useEffect(() => {
  //   if (remarks.trim().length > 0) {
  //     setIsRemarksProvided(true);
  //   } else {
  //     setIsRemarksProvided(false);
  //   }
  // }, [remarks]);

  const getEmpList = async () => {
    const res = await apiCallBack("GET", `po/sdbg/assigneeList`, null, token);
    if (res?.status) {
      let options =
        res?.data &&
        res.data.map((item, index) => {
          return {
            value: item.emp_id,
            label: `${item.cname} (${item.emp_id})`,
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
    if (user?.user_type !== 1) {
      getEmpList();
      getSDBG();
    }
  }, []);

  useEffect(() => {
    getAssign();
    getSDBG();
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
    if (
      selectedActionType.trim() === "" ||
      !sdbgFile ||
      remarks.trim() === ""
    ) {
      return toast.warn("Please provide all required fields");
    }
    try {
      const form = new FormData();
      form.append("purchasing_doc_no", id);
      form.append("file", formData.sdbgFile);
      form.append("remarks", formData.remarks);
      form.append("status", flag);
      form.append("action_type", selectedActionType);

      const response = await apiCallBack(
        "POST",
        `po/sdbg/submitSDBG`,
        form,
        token
      );
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
    if (!formDatainput?.isConfirmedBG) {
      return toast.warn("Only confirmed BG can be forwarded to Fi Dept.");
    }
    let status = await BGEntry(formDatainput, token);
    if (status) {
      setIsPopup(false);
      setIsEntryPopup(false);
      let bg = { ...bgInputs, purchasing_doc_no: id };
      setFormDatainput(bg);
      getSDBG();
    }
  };

  const uploadSDBGSave = async () => {
    let status = await BGEntrySave(formDatainput, token);
    if (status) {
      setIsPopup(false);
      setIsEntryPopup(false);
      // let bg = { ...bgInputs, purchasing_doc_no: id };
      // setFormDatainput(bg);
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
    const d = await postAPI("/po/sdbg/sdbgSubmitByDealingOfficer", form, token);
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
      const res = await apiCallBack(
        "POST",
        `po/sdbg/sdbgUpdateByFinance`,
        assign,
        token
      );
      if (res?.status) {
        setIsAssignPopup(false);
        toast.success(`Successfully assigned to ${assign?.assigned_to}`);
        getAssign();
        getSDBG();
      } else {
        toast.warn(res?.message);
      }
    } else {
      toast.warn("Please choose an employee to Assign!");
    }
  };

  const financeEntry = async (flag, referenceNo) => {
    const entry = entryState[referenceNo];
    let action_type = "SDBG SUBMISSION";
    let payloadRemarks = entry?.remarks;
    const { bg_file_no } = sdbgEntryForFi;

    if (
      (flag === "APPROVED" || flag === "HOLD") &&
      !bg_file_no &&
      bg_file_no === ""
    ) {
      return toast.warn("Please fill the BG file no.");
    }

    if (flag === "APPROVED") {
      payloadRemarks = "APPROVED by Finance Officer";
    } else if (flag === "RETURN_TO_DO") {
      payloadRemarks =
        payloadRemarks ||
        "SDBG Entry returned to dealing officer for correction";
    } else if (flag === "REJECTED") {
      payloadRemarks = "Rejected by Finance Officer";
    } else if (flag === "HOLD") {
      payloadRemarks = "Hold by Finance Officer";
    }

    let payload = {
      purchasing_doc_no: id,
      status: flag,
      remarks: payloadRemarks,
      action_type,
      reference_no: referenceNo,
      bg_file_no,
    };

    const data = await apiCallBack(
      "POST",
      `po/sdbg/sdbgUpdateByFinance`,
      payload,
      token
    );

    if (data?.status) {
      setIsCheckEntryPopup(false);
      getSDBG();
      toast.success(data?.message);
      setEntryState((prevState) => ({
        ...prevState,
        [referenceNo]: { showRemarksInput: false, remarks: "" },
      }));
    } else {
      toast.warn(data?.message);
    }
  };

  const handleReturnClick = (referenceNo) => {
    const entry = entryState[referenceNo];
    if (entry?.showRemarksInput) {
      if (entry?.remarks && entry?.remarks.trim()) {
        reConfirm(
          { file: true },
          () => financeEntry("RETURN_TO_DO", referenceNo),
          "You're going to return the SDBG Entry to Dealing Officer to recheck. Please confirm!"
        );
      } else {
        toast.warn("Remarks cannot be blank.");
      }
    } else {
      setEntryState((prevState) => ({
        ...prevState,
        [referenceNo]: { ...entry, showRemarksInput: true },
      }));
    }
  };

  const handleRemarksChange = (referenceNo, value) => {
    setEntryState((prevState) => ({
      ...prevState,
      [referenceNo]: { ...prevState[referenceNo], remarks: value },
    }));
  };

  const SdbgEntryUpdate = async (referenceNo) => {
    setIsLoading(true);
    let payload = {
      purchasing_doc_no: id,
      reference_no: referenceNo,
    };

    try {
      // First, try to fetch data from getSdbgSave endpoint
      const response1 = await fetch(
        `${process.env.REACT_APP_BACKEND_API}/po/sdbg/getSdbgSave?reference_no=${referenceNo}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response1.ok) {
        const data1 = await response1.json();
        if (data1.status && checkTypeArr(data1.data)) {
          setFormDatainput(data1.data[data1.data.length - 1]);
          setIsLoading(false);
          console.log(data1.message);
          return; // Exit function if successful
        }
      }

      // If fetching from getSdbgSave fails or doesn't return valid data, fall back to getspecificbg
      const response2 = await fetch(
        `${process.env.REACT_APP_BACKEND_API}/po/sdbg/getspecificbg`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response2.ok) {
        throw new Error(`HTTP error! Status: ${response2.status}`);
      }

      const data2 = await response2.json();

      if (data2.status && checkTypeArr(data2.data)) {
        setFormDatainput(data2.data[data2.data.length - 1]);
        console.log(data2.message);
      }
    } catch (error) {
      console.error("Error in fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
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
    const pdf = generatePDFFromSDBGEntry(formDatainput);

    // Trigger download
    pdf.save(`sdbg_entry_${id}.pdf`);
  };

  const generatePDFFromSDBGEntry = (entry) => {
    const pdf = new jsPDF();

    try {
      // Add GRSE logo and heading
      pdf.addImage(GRSE_LOGO_BASE64, "PNG", 10, 10, 50, 20);
    } catch (error) {
      console.error("Error adding image to PDF:", error);
    }

    pdf.setFontSize(18);
    pdf.text(70, 20, "GRSE BG Entry");

    // Add content to PDF
    let y = 40; // Initial y-coordinate
    pdf.setFontSize(12);
    pdf.text(20, y, `Reference No: ${entry?.reference_no || ""}`);
    y += 10;
    pdf.text(20, y, `BG Entry Date: ${formatDate(entry?.created_at)}`);
    y += 10;
    pdf.text(20, y, `Bankers Name: ${entry?.bank_name || ""}`);
    y += 10;
    pdf.text(20, y, `Bankers Branch: ${entry?.branch_name || ""}`);
    y += 10;
    pdf.text(20, y, `Bankers Address1: ${entry?.bank_addr1 || ""}`);
    y += 10;
    if (entry?.bank_addr2) {
      pdf.text(20, y, `Bankers Address2: ${entry?.bank_addr2}`);
      y += 10;
    }
    if (entry?.bank_addr3) {
      pdf.text(20, y, `Bankers Address3: ${entry?.bank_addr3}`);
      y += 10;
    }
    pdf.text(20, y, `Bankers City: ${entry?.bank_city || ""}`);
    y += 10;
    pdf.text(20, y, `Bank Pincode: ${entry?.bank_pin_code || ""}`);
    y += 10;
    pdf.text(20, y, `Bank Guarantee No: ${entry?.bg_no || ""}`);
    y += 10;
    pdf.text(
      20,
      y,
      `BG Date: ${
        entry?.bg_date
          ? new Date(entry?.bg_date * 1000).toLocaleDateString()
          : ""
      }`
    );
    y += 10;
    pdf.text(
      20,
      y,
      `BG Received Date: ${
        entry?.bg_recived_date
          ? new Date(entry?.bg_recived_date * 1000).toLocaleDateString()
          : ""
      }`
    );
    y += 10;
    pdf.text(20, y, `BG Amount: ${entry?.bg_ammount || ""}`);
    y += 10;
    pdf.text(20, y, `BG Type: ${entry?.bg_type || ""}`);
    y += 10;
    pdf.text(20, y, `Department: ${entry?.department || ""}`);
    y += 10;
    pdf.text(20, y, `PO Number: ${entry?.purchasing_doc_no || ""}`);
    y += 10;
    // pdf.text(
    //   20,
    //   y,
    //   `PO Date: ${
    //     entry?.po_date ? new Date(entry?.po_date).toLocaleDateString() : ""
    //   }`
    // );
    // y += 10;
    pdf.text(20, y, `Yard No: ${entry?.yard_no || ""}`);
    y += 10;
    pdf.text(
      20,
      y,
      `Validity Date: ${
        entry?.validity_date
          ? new Date(entry?.validity_date * 1000).toLocaleDateString()
          : ""
      }`
    );
    y += 10;
    pdf.text(
      20,
      y,
      `Claim Period: ${
        entry?.claim_priod
          ? new Date(entry?.claim_priod * 1000).toLocaleDateString()
          : ""
      }`
    );
    y += 10;
    // pdf.text(20, y, `Vendor Name: ${entry?.vendor_name || ""}`);
    // y += 10;
    // pdf.text(20, y, `Vendor Address1: ${entry?.vendor_address1 || ""}`);
    // y += 10;
    // pdf.text(20, y, `Vendor City: ${entry?.vendor_city || ""}`);
    // y += 10;
    // pdf.text(20, y, `Vendor Pincode: ${entry?.vendor_pin_code || ""}`);
    // y += 10;
    return pdf;
  };

  const toggleReferenceVisibility = (reference) => {
    setExpandedReferences((prevState) => ({
      ...prevState,
      [reference]: !prevState[reference],
    }));
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
                            {user?.department_id === 15 &&
                              user?.internal_role_id === 1 && (
                                <>
                                  <p className="m-0 p-2">
                                    {!currentAssign?.assigned_to
                                      ? "(Not Assigned!)"
                                      : `Assigned to ${currentAssign.assigned_to}`}
                                  </p>
                                  <button
                                    onClick={() => setIsAssignPopup(true)}
                                    className="btn fw-bold btn-primary me-3"
                                  >
                                    ASSIGN
                                  </button>
                                </>
                              )}
                          </>
                        )}
                        {/* Vendor  */}
                        {user?.user_type === 1 && (
                          <>
                            <button
                              onClick={() => setIsPopup(true)}
                              className="btn btn-sm fw-bold btn-primary"
                            >
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
                                  {(isDO || user?.department_id === 15) && (
                                    <th className="min-w-150px">Action</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {Object.keys(groupedBG).map((it, index) => {
                                  let items = groupedBG[it];
                                  return (
                                    <Fragment key={index}>
                                      <tr>
                                        <td
                                          colSpan={10}
                                          onClick={() =>
                                            toggleReferenceVisibility(it)
                                          }
                                          // style={{ cursor: "pointer" }}
                                        >
                                          <b>{it}</b>
                                        </td>
                                      </tr>
                                      {items &&
                                        groupedByRefNo(items) &&
                                        Object.keys(groupedByRefNo(items)).map(
                                          (item, ind) => {
                                            let ite =
                                              groupedByRefNo(items)[item];
                                            const isExpanded =
                                              expandedReferences[item];
                                            return (
                                              <Fragment key={ind}>
                                                <tr>
                                                  <td
                                                    colSpan={5}
                                                    onClick={() =>
                                                      toggleReferenceVisibility(
                                                        item
                                                      )
                                                    }
                                                    style={{
                                                      cursor: "pointer",
                                                    }}
                                                  >
                                                    <b>
                                                      <span className="hover-underline">
                                                        {item}
                                                      </span>
                                                    </b>
                                                  </td>
                                                  <td>
                                                    {isDO &&
                                                      ite.some(
                                                        (data) =>
                                                          data.status !==
                                                          "ASSIGNED"
                                                      ) && (
                                                        <span>
                                                          <button
                                                            onClick={() => {
                                                              setIsEntryPopup(
                                                                true
                                                              );
                                                              setFormDatainput({
                                                                ...formDatainput,
                                                                reference_no:
                                                                  item,
                                                              });
                                                              SdbgEntryUpdate(
                                                                item
                                                              );
                                                            }}
                                                            className="btn fw-bold btn-primary btn-sm"
                                                          >
                                                            ACTION
                                                          </button>
                                                        </span>
                                                      )}
                                                    {ite &&
                                                      ite.some(
                                                        (data) =>
                                                          user?.department_id ===
                                                            15 &&
                                                          data.status !==
                                                            "ASSIGNED"
                                                      ) && (
                                                        <button
                                                          onClick={() => {
                                                            setIsCheckEntryPopup(
                                                              true
                                                            );
                                                            setFormDatainput({
                                                              ...formDatainput,
                                                              reference_no:
                                                                item,
                                                            });
                                                            SdbgEntryUpdate(
                                                              item
                                                            );
                                                          }}
                                                          className="btn btn-sm fw-bold btn-primary me-3"
                                                        >
                                                          ACTION
                                                        </button>
                                                      )}
                                                  </td>
                                                </tr>
                                                {isExpanded &&
                                                  ite.map((data, dex) => (
                                                    <tr key={dex}>
                                                      <td className="table_center">
                                                        {data?.created_at &&
                                                          formatDate(
                                                            data?.created_at
                                                          )}
                                                      </td>
                                                      <td>
                                                        <a
                                                          href={`${process.env.REACT_APP_PDF_URL}/submitSDBG/${data.file_name}`}
                                                          target="_blank"
                                                          rel="noreferrer"
                                                        >
                                                          Check File
                                                        </a>
                                                      </td>
                                                      <td>
                                                        {data?.created_by_name}{" "}
                                                        ({data?.created_by_id})
                                                      </td>
                                                      <td>{data?.remarks}</td>
                                                      <td
                                                        className={`${clrLegend(
                                                          data?.status
                                                        )} bold`}
                                                      >
                                                        {data?.status}
                                                      </td>
                                                      <td></td>
                                                    </tr>
                                                  ))}
                                              </Fragment>
                                            );
                                          }
                                        )}
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
                  <input
                    type="file"
                    ref={inputFileRef}
                    className="form-control"
                    onChange={(e) =>
                      setFormData({ ...formData, sdbgFile: e.target.files[0] })
                    }
                    accept=".pdf"
                  />
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
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <button
                    onClick={() => updateSDBG("SUBMITTED")}
                    className="btn fw-bold btn-primary"
                    type="submit"
                  >
                    SUBMIT
                  </button>
                  {userType !== 1 && (
                    // <button
                    //   onClick={() => updateSDBG("Approved")}
                    //   className="btn fw-bold btn-primary"
                    //   type="submit"
                    // >
                    //   Approved
                    // </button>
                    <DynamicButton
                      label="Approved"
                      onClick={() => updateSDBG("Approved")}
                      className="btn fw-bold btn-primary"
                    />
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
                <span className="card-label fw-bold fs-3 mb-1">BG ry</span>
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
            {isLoading ? (
              <SkeletonLoader row={10} />
            ) : (
              <div className="row">
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Ref No</label>
                    <input
                      type="text"
                      className="form-control"
                      name="reference_no"
                      value={formDatainput?.reference_no || ""}
                      disabled
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Name</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input
                      type="text"
                      className="form-control"
                      name="bank_name"
                      value={formDatainput?.bank_name || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Branch</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input
                      type="text"
                      className="form-control"
                      name="branch_name"
                      value={formDatainput?.branch_name || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Address1</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input
                      type="text"
                      className="form-control"
                      name="bank_addr1"
                      value={formDatainput?.bank_addr1 || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Address2</label>
                    <input
                      type="text"
                      className="form-control"
                      name="bank_addr2"
                      value={formDatainput?.bank_addr2 || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Address3</label>
                    <input
                      type="text"
                      className="form-control"
                      name="bank_addr3"
                      value={formDatainput?.bank_addr3 || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers City</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input
                      type="text"
                      className="form-control"
                      name="bank_city"
                      value={formDatainput?.bank_city || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bank Pincode</label>
                    &nbsp;&nbsp;
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
                    <input
                      type="text"
                      className="form-control"
                      name="bg_no"
                      value={formDatainput?.bg_no || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">BG Date</label>&nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <DatePicker
                      selected={parseDateFromEpoch(formDatainput.bg_date)}
                      onChange={(date) => {
                        setFormDatainput((prevData) => ({
                          ...prevData,
                          bg_date: convertToEpochh(date),
                        }));
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">BG Received Date</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <DatePicker
                      // selected={
                      //   formDatainput.bg_recived_date
                      //     ? new Date(formDatainput.bg_recived_date * 1000)
                      //     : null
                      // }
                      selected={parseDateFromEpoch(
                        formDatainput.bg_recived_date
                      )}
                      onChange={(date) => {
                        setFormDatainput((prevData) => ({
                          ...prevData,
                          bg_recived_date: convertToEpoch(date),
                        }));
                      }}
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
                    <input
                      type="text"
                      className="form-control"
                      name="yard_no"
                      value={formDatainput?.yard_no || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Validity Date</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <DatePicker
                      selected={
                        formDatainput.validity_date
                          ? new Date(formDatainput.validity_date * 1000)
                          : null
                      }
                      onChange={(date) => {
                        setFormDatainput((prevData) => ({
                          ...prevData,
                          validity_date: new Date(convertToEpoch(date)),
                        }));
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Claim Period</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <DatePicker
                      selected={
                        formDatainput.claim_priod
                          ? new Date(formDatainput.claim_priod * 1000)
                          : null
                      }
                      onChange={(date) => {
                        setFormDatainput((prevData) => ({
                          ...prevData,
                          claim_priod: new Date(convertToEpoch(date)),
                        }));
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Department</label>
                    &nbsp;&nbsp;
                    <input
                      type="text"
                      className="form-control"
                      name="department"
                      value={formDatainput?.department || ""}
                      onChange={handleInputChange2}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">BG Type</label>&nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <select
                      className="form-select"
                      name=""
                      id=""
                      value={formDatainput?.bg_type}
                      onChange={(e) =>
                        setFormDatainput({
                          ...formDatainput,
                          bg_type: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose BG</option>
                      <option value="SDBG">SDBG</option>
                      <option value="PBG">PBG</option>
                      <option value="ADVANCED BG">ADVANCED BG</option>
                    </select>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check pb-3">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isConfirmedBG"
                      name="isConfirmedBG"
                      value={formDatainput?.isConfirmedBG}
                      required
                      onClick={(e) =>
                        setFormDatainput({
                          ...formDatainput,
                          isConfirmedBG: e.target.checked,
                        })
                      }
                    />
                    <label className="form-check-label" htmlFor="isConfirmedBG">
                      Correct and Confirmed BG in Prescribed Format is being
                      forwarded.
                    </label>
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    {/* <button
                      onClick={() => uploadSDBGEntry("FORWARD_TO_FINANCE")}
                      className="btn fw-bold btn-primary"
                      type="submit"
                    >
                      FORWARD TO FINANCE
                    </button> */}
                    <DynamicButton
                      label="FORWARD TO FINANCE"
                      onClick={() => uploadSDBGEntry("FORWARD_TO_FINANCE")}
                      className="btn-primary"
                      confirmMessage="You're going to forward the SDBG to Finance Dept. Please confirm!"
                    />
                    {/* <button
                      onClick={() => uploadSDBGSave("SAVED")}
                      className="btn fw-bold btn-info custom-save-button"
                      type="submit"
                    >
                      SAVE
                    </button> */}
                    <DynamicButton
                      label="SAVE"
                      onClick={() => uploadSDBGSave("SAVED")}
                      className="btn-info custom-save-button"
                    />
                    <button
                      className="btn fw-bold btn-success"
                      onClick={handleDownloadPDF}
                    >
                      Download BG Entry
                    </button>
                    <button
                      onClick={() =>
                        reConfirm(
                          { file: true },
                          () => rejectSDBG("REJECTED"),
                          "You're going to Reject the SDBG. Please confirm!"
                        )
                      }
                      className="btn fw-bold btn-danger"
                      type="submit"
                    >
                      REJECTED
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* for finance officer  */}
      {user?.department_id === 15 && (
        <div className={isCheckEntryPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">
                  Check BG Entry
                </span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => setIsCheckEntryPopup(false)}
              >
                Close
              </button>
            </div>

            <div className="row">
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG File No</label>
                  &nbsp;&nbsp;
                  {formDatainput?.bg_file_no ? (
                    <p>{formDatainput?.bg_file_no}</p>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      name="department"
                      value={sdbgEntryForFi?.bg_file_no || ""}
                      onChange={(e) =>
                        setSdbgEntryForFi({
                          ...sdbgEntryForFi,
                          bg_file_no: e.target.value,
                        })
                      }
                    />
                  )}
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Reference No</label>
                  <p>{formDatainput?.reference_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Entry Date</label>
                  <p>
                    <td
                      style={{
                        border: "none",
                        background: "none",
                      }}
                    >
                      {formDatainput?.created_at
                        ? formatDate(formDatainput.created_at)
                        : ""}
                    </td>
                  </p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Name</label>
                  <p>{formDatainput?.bank_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Branch</label>
                  <p>{formDatainput?.branch_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address1</label>
                  <p>{formDatainput?.bank_addr1}</p>
                </div>
              </div>
              {formDatainput?.bank_addr2 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Bankers Address2</label>
                      <p>{formDatainput?.bank_addr2}</p>
                    </div>
                  </div>
                </>
              )}
              {formDatainput?.bank_addr3 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Bankers Address3</label>
                      <p>{formDatainput?.bank_addr3}</p>
                    </div>
                  </div>
                </>
              )}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers City</label>
                  <p>{formDatainput?.bank_city}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Pincode</label>
                  <p>{formDatainput?.bank_pin_code}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bank Guarantee No</label>
                  <p>{formDatainput?.bg_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Date</label>
                  <p>
                    {formDatainput?.bg_date
                      ? new Date(
                          formDatainput?.bg_date * 1000
                        ).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Received Date</label>
                  <p>
                    {formDatainput?.bg_recived_date
                      ? formatDate(formDatainput?.bg_recived_date * 1000)
                      : ""}
                  </p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Amount</label>
                  <p>{formDatainput?.bg_ammount}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Type</label>
                  <p>{formDatainput?.bg_type}</p>
                </div>
              </div>

              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <p>{formDatainput?.department}</p>
                </div>
              </div> */}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">PO Number</label>
                  <p>{formDatainput?.purchasing_doc_no}</p>
                </div>
              </div>
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">PO Date</label>
                  <p>
                    {formDatainput?.po_date &&
                      new Date(formDatainput?.po_date).toLocaleDateString()}
                  </p>
                </div>
              </div> */}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <p>{formDatainput?.yard_no}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Department</label>
                  <p>{formDatainput?.department}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Validity Date</label>
                  <p>
                    {formDatainput?.validity_date
                      ? new Date(
                          formDatainput?.validity_date * 1000
                        ).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Claim Period</label>
                  <p>
                    {formDatainput?.claim_priod
                      ? new Date(
                          formDatainput?.validity_date * 1000
                        ).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>

              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Name</label>
                  <p>{formDatainput?.vendor_name}</p>
                </div>
              </div>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Address1</label>
                  <p>{formDatainput?.vendor_address1}</p>
                </div>
              </div> */}
              {formDatainput?.vendor_address2 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Vendor Address2</label>
                      <p>{formDatainput?.vendor_address2}</p>
                    </div>
                  </div>
                </>
              )}
              {formDatainput?.vendor_address3 && (
                <>
                  <div className="col-md-6 col-12">
                    <div className="mb-3">
                      <label className="form-label">Vendor Address3</label>
                      <p>{formDatainput?.vendor_address3}</p>
                    </div>
                  </div>
                </>
              )}
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor City</label>
                  <p>{formDatainput?.vendor_city}</p>
                </div>
              </div> */}
              {/* <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Vendor Pincode</label>
                  <p>{formDatainput?.vendor_pin_code}</p>
                </div>
              </div> */}
              <div className="col-md-6 col-12">
                {entryState[formDatainput?.reference_no]?.showRemarksInput && (
                  <div className="col-12 mb-3">
                    <label className="form-label">Remarks</label>
                    <textarea
                      className="form-control"
                      value={entryState[formDatainput?.reference_no]?.remarks}
                      onChange={(e) =>
                        handleRemarksChange(
                          formDatainput?.reference_no,
                          e.target.value
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {/* {showRemarksInput && (
              <div className="col-12 mb-3">
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-control"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            )} */}

              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <button
                    onClick={() =>
                      reConfirm(
                        { file: true },
                        () =>
                          financeEntry("APPROVED", formDatainput?.reference_no),
                        "You're going to receiving the SDBG Entry. Please confirm!"
                      )
                    }
                    className="btn fw-bold btn-success me-3"
                    type="button"
                  >
                    RECEIVED
                  </button>
                  {/* <button
                    className="btn fw-bold btn-info me-3"
                    type="button"
                    onClick={() =>
                      reConfirm(
                        { file: true },
                        () => financeEntry("HOLD", formDatainput?.reference_no),
                        "You're going to Hold the SDBG Entry. Please confirm!"
                      )
                    }
                  >
                    HOLD
                  </button>
                  <button
                    onClick={() =>
                      reConfirm(
                        { file: true },
                        () => financeEntry("RETURN_TO_DO", formDatainput?.reference_no),
                        "You're going to return the SDBG Entry to Dealing Officer to recheck. Please confirm!"
                      )
                    }
                    className="btn fw-bold btn-primary"
                    type="button"
                  >
                    Return to Dealing Officer handleReturnClick
                  </button> */}

                  <button
                    onClick={() =>
                      handleReturnClick(formDatainput?.reference_no)
                    }
                    className="btn fw-bold btn-primary"
                    type="button"
                  >
                    {entryState[formDatainput?.reference_no]?.showRemarksInput
                      ? "Confirm Return to Dept"
                      : "Return to Dept"}
                  </button>
                  {/* <button
                    onClick={() =>
                      reConfirm(
                        { file: true },
                        () =>
                          financeEntry("REJECTED", formDatainput?.reference_no),
                        "You're going to Reject the SDBG Entry. Please confirm!"
                      )
                    }
                    className="btn fw-bold btn-danger"
                    type="button"
                  >
                    REJECT
                  </button> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* for finance officer and Assigner  */}
      {userType !== USER_VENDOR &&
        user.department_id === DEPT_FI &&
        user.internal_role_id === ASSIGNER && (
          <div className={isAssignPopup ? "popup active" : "popup"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">ASSIGN</span>
                </h3>
                <button
                  className="btn fw-bold btn-danger"
                  onClick={() => setIsAssignPopup(false)}
                >
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
                        onChange={(val) =>
                          setAssign({ ...assign, assigned_to: val.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3 d-flex justify-content-between">
                      {/* <button
                        onClick={() => assignSDBGByFinance()}
                        className="btn fw-bold btn-primary"
                        type="button"
                      >
                        ASSIGN
                      </button> */}
                      <DynamicButton
                        label="ASSIGN"
                        onClick={assignSDBGByFinance}
                        className="btn fw-bold btn-primary"
                      />
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
