import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { apiCallBack, postAPI } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import { reConfirm } from "../utils/reConfirm";
import { inputOnWheelPrevent } from "../utils/inputOnWheelPrevent";
import { clrLegend } from "../utils/clrLegend";
import { BGEntry, BGEntrySave, bgFi, bgInputs } from "../Helpers/BG";
import { IoClose } from "react-icons/io5";
import { ACTION_ABG, ACTION_DD, ACTION_IB, ACTION_O, ACTION_PBG, ACTION_SDBG, ACTION_RM, ACTION_MBG } from "../constants/BGconstants";
import { logOutFun } from "../utils/logOutFun";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { groupedByActionType, groupedByRefNo } from "../utils/groupedByReq";
import jsPDF from "jspdf";
import { checkTypeArr } from "../utils/smallFun";
import { convertToEpoch, formatDate, formatFilePath } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import { ASSIGNER, DEPT_FI, USER_VENDOR } from "../constants/userConstants";
import SkeletonLoader from "../loader/SkeletonLoader";
import { FaDownload } from "react-icons/fa";
import "react-datepicker/dist/react-datepicker.css";
import HrSearchableSelect from "../components/HrSearchableSelect";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

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
  const [checkuser, setCheckuser] = useState([]);

  const [sdbgEntryForFi, setSdbgEntryForFi] = useState(bgFi);
  const [selectedActionType, setSelectedActionType] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState(null);

  // FormData state ko update karein
  const [formData, setFormData] = useState({
    sdbgFile: null,
    remarks: "",
    bg_no: "",
    uploadedFilePath: "", // New field
    uploadedFileName: "", // New field
  });

  const [entryState, setEntryState] = useState({});
  const [isExtPopup, setIsExtPopup] = useState(false);
  const [extTarget, setExtTarget] = useState(null);
  const [extForm, setExtForm] = useState({
    action_type: "",
    validity_date: "",
    bg_date: "",
    bg_amount: "",
    bank_gu_no: "",
    reason: "",
    bg_filename: "",
    bg_file_path: "",
  });
  const [isExtUploading, setIsExtUploading] = useState(false);
  const HSL_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...";

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
    setIsLoading(true);
    const data = await apiCallBack("GET", `po/sdbg/getSDBGData?poNo=${id}`, null, token);
    if (data?.status) {
      setAllsdbg(data?.data);
      setIsLoading(false);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
      setIsLoading(false);
    }
  };

  const getSDBGcheckuser = async () => {
    const data = await apiCallBack("GET", `po/sdbg/checkIsDEO?manNo=${user?.vendor_code}`, null, token);
    if (data?.status) {
      setCheckuser(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
    }
  };

  const getAssign = async () => {
    const data = await apiCallBack("GET", `po/sdbg/getCurrentAssignee?poNo=${id}`, null, token);
    if (data?.status) {
      setCurrentAssign(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
      logOutFun(dispatch, logoutHandler, poRemoveHandler);
    }
  };

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

    if (value.length > 45) {
      alert("Input cannot exceed 45 characters.");
      return;
    }

    setFormDatainput((prevData) => ({
      ...prevData,
      [name]: value.toUpperCase(),
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
    getSDBGcheckuser();
  }, []);

  useEffect(() => {
    if (id) {
      setFormDatainput({ ...formDatainput, purchasing_doc_no: id });
    } else {
      toast.warn("You must provide PO Number!");
    }
  }, [id]);

  const updateSDBG = async (flag) => {
    const { remarks, uploadedFilePath, uploadedFileName } = formData;

    // File upload check
    if (!uploadedFilePath) {
      return toast.warning("Please upload the file first!");
    }

    // Required field validation
    if (
      selectedActionType.trim() === "" ||
      !formDatainput?.bg_no ||
      remarks.trim() === "" ||
      !formDatainput?.bank_name ||
      !formDatainput?.bank_email ||
      !formDatainput?.branch_name ||
      !formDatainput?.bank_addr1 ||
      !formDatainput?.bank_city ||
      !formDatainput?.bank_pin_code ||
      !formDatainput?.bg_date ||
      !formDatainput?.bg_recived_date ||
      !formDatainput?.bg_ammount ||
      !formDatainput?.validity_date ||
      !formDatainput?.claim_priod ||
      !formDatainput?.bg_type
    ) {
      return toast.warn("Please provide all required fields");
    }

    try {
      const payload = {
        purchasing_doc_no: id,
        file_path: uploadedFilePath, // Uploaded file path
        file_name: uploadedFileName, // Uploaded file name
        remarks: remarks,
        bg_no: formDatainput.bg_no,
        status: flag,
        action_type: selectedActionType,

        // BG entry fields
        bank_name: formDatainput.bank_name,
        bank_email: formDatainput.bank_email,
        branch_name: formDatainput.branch_name,
        bank_addr1: formDatainput.bank_addr1,
        bank_addr2: formDatainput.bank_addr2 || "",
        bank_addr3: formDatainput.bank_addr3 || "",
        bank_city: formDatainput.bank_city,
        bank_pin_code: formDatainput.bank_pin_code,
        bg_date: formDatainput.bg_date,
        bg_recived_date: formDatainput.bg_recived_date,
        bg_ammount: formDatainput.bg_ammount,
        yard_no: formDatainput.yard_no || "",
        validity_date: formDatainput.validity_date,
        claim_priod: formDatainput.claim_priod,
        bg_type: formDatainput.bg_type,
        isConfirmedBG: formDatainput.isConfirmedBG ? "true" : "false",
      };

      const response = await apiCallBack("POST", `po/sdbg/submitSDBG`, payload, token);

      if (response.status) {
        setIsPopup(false);
        toast.success("Form submitted successfully");

        // Reset all forms
        setFormData({
          sdbgFile: null,
          remarks: "",
          bg_no: "",
          uploadedFilePath: "",
          uploadedFileName: "",
        });
        let bg = { ...bgInputs, purchasing_doc_no: id };
        setFormDatainput(bg);
        if (inputFileRef.current) {
          inputFileRef.current.value = null;
        }
        setSelectedActionType("");
        setUploadResponse(null);
        getSDBG();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Form submission failed");
    }
  };
  const uploadSDBGEntry = async (flag) => {
    if (!formDatainput?.isConfirmedBG) {
      return toast.warn("Only confirmed BG can be forwarded to Fi Dept.");
    }
    let status = await BGEntry(formDatainput, token, flag);
    if (status) {
      setIsPopup(false);
      setIsEntryPopup(false);
      let bg = { ...bgInputs, purchasing_doc_no: id };
      setFormDatainput(bg);
      getSDBG();
    }
  };

  const handleExtFileUpload = async (file) => {
    if (!file) return;
    setIsExtUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("type", "BGX");
    uploadFormData.append("ref", user?.vendor_code || "vendor");
    uploadFormData.append("file", file);

    try {
      const response = await apiCallBack("POST", "upload/fileStream", uploadFormData, token);
      if (response?.data?.filePath) {
        setExtForm((prev) => ({ ...prev, bg_filename: response.data.fileName, bg_file_path: response.data.filePath }));
        toast.success("File uploaded successfully!");
      } else {
        toast.warning("Failed to upload file. Please try again.");
      }
    } catch (error) {
      console.error("File upload failed:", error);
      toast.warning("Failed to upload file. Please try again.");
    }
    setIsExtUploading(false);
  };

  const submitExtensionOrRelease = async () => {
    if (!extForm.action_type) {
      return toast.warn("Please select Extension or Release.");
    }
    if (!extForm.reason) {
      return toast.warn("Please provide a reason.");
    }
    if (extForm.action_type === "EXTENSION" && (!extForm.validity_date || !extForm.bg_filename)) {
      return toast.warn("Please provide the new validity date and upload the revised BG document issued by the bank.");
    }

    const payload = {
      sdbg_reference_no: extTarget?.reference_no,
      file_no: extTarget?.bg_file_no,
      purchasing_doc_no: id,
      action_type: extForm.action_type,
      validity_date: extForm.validity_date || undefined,
      bg_date: extForm.bg_date || undefined,
      bg_amount: extForm.bg_amount || undefined,
      bank_gu_no: extForm.bank_gu_no || undefined,
      reason: extForm.reason,
      bg_filename: extForm.bg_filename || undefined,
      bg_file_path: extForm.bg_file_path || undefined,
    };

    const res = await apiCallBack("POST", "bg-extension", payload, token);
    if (res?.status) {
      toast.success(res?.message || "Request submitted successfully");
      setIsExtPopup(false);
      setExtForm({ action_type: "", validity_date: "", bg_date: "", bg_amount: "", bank_gu_no: "", reason: "", bg_filename: "", bg_file_path: "" });
    } else {
      toast.error(res?.message || "Failed to submit request");
    }
  };

  const uploadSDBGSave = async () => {
    let status = await BGEntrySave(formDatainput, token);
    if (status) {
      setIsPopup(false);
      setIsEntryPopup(false);
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
    let payloadRemarks = entry?.remarks;

    if (flag === "APPROVED") {
      payloadRemarks = "RECEIVED  by Finance Officer";
    } else if (flag === "RETURN_TO_DO") {
      payloadRemarks = payloadRemarks || "SDBG Entry returned to dealing officer for correction";
    } else if (flag === "REJECTED") {
      payloadRemarks = "Rejected by Finance Officer";
    } else if (flag === "HOLD") {
      payloadRemarks = "Hold by Finance Officer";
    }

    let payload = {
      purchasing_doc_no: id,
      status: flag,
      remarks: payloadRemarks,
      reference_no: referenceNo,
    };

    const data = await apiCallBack("POST", `po/sdbg/sdbgUpdateByFinance`, payload, token);

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
        reConfirm({ file: true }, () => financeEntry("RETURN_TO_DO", referenceNo), "You're going to return the SDBG Entry to Dealing Officer to recheck. Please confirm!");
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
      const response1 = await fetch(`${process.env.REACT_APP_BACKEND_API}po/sdbg/getSdbgSave?reference_no=${referenceNo}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

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
      const response2 = await fetch(`${process.env.REACT_APP_BACKEND_API}po/sdbg/getspecificbg`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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

  const formatDateToDDMMYY = (epoch) => {
    if (!epoch || isNaN(epoch) || epoch === "0") return "";

    // Convert to number
    const time = Number(epoch);

    // Detect if timestamp is in seconds (10 digits) or milliseconds (13 digits)
    const normalizedTime = time < 1000000000000 ? time * 1000 : time;

    const date = new Date(normalizedTime);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear(); // full 4-digit year

    return `${day}/${month}/${year}`;
  };

  const generatePDFFromSDBGEntry = (entry) => {
    const pdf = new jsPDF();
    let y = 40;

    try {
      pdf.addImage(HSL_LOGO_BASE64, "PNG", 10, 10, 50, 20);
    } catch (error) {
      console.warn("Error adding logo to PDF:", error);
    }

    pdf.setFontSize(18);
    pdf.text(70, 20, "HSL BG Entry");

    pdf.setFontSize(12);

    const addText = (label, value) => {
      if (value) {
        pdf.text(20, y, `${label}: ${value}`);
        y += 10;
      }
    };

    addText("Reference No", entry?.reference_no || "");
    addText("BG Tracking No", entry?.bg_file_no || "");
    addText("BG Entry Date", formatDateToDDMMYY(entry?.created_at));
    addText("Bankers Name", entry?.bank_name || "");
    addText("Bankers Email Id", entry?.bank_email || "");
    addText("Bankers Branch", entry?.branch_name || "");
    addText("Bankers Address1", entry?.bank_addr1 || "");
    addText("Bankers Address2", entry?.bank_addr2 || "");
    addText("Bankers Address3", entry?.bank_addr3 || "");
    addText("Bankers City", entry?.bank_city || "");
    addText("Bank Pincode", entry?.bank_pin_code || "");
    addText("Bank Guarantee No", entry?.bg_no || "");
    addText("BG Date", formatDateToDDMMYY(entry?.bg_date));
    addText("BG Received Date", formatDateToDDMMYY(entry?.bg_recived_date));
    addText("BG Amount", entry?.bg_ammount || "");
    addText("BG Type", entry?.bg_type || "");
    addText("Department", entry?.department || "");
    addText("PO Number", entry?.purchasing_doc_no || "");
    addText("Yard No", entry?.yard_no || "");
    addText("Validity Date", formatDateToDDMMYY(entry?.validity_date));
    addText("Claim Period", formatDateToDDMMYY(entry?.claim_priod));
    // Optionally add extension and release dates
    addText("Extension Date 1", formatDateToDDMMYY(entry?.extension_date1));
    addText("Extension Date 2", formatDateToDDMMYY(entry?.extension_date2));
    addText("Extension Date 3", formatDateToDDMMYY(entry?.extension_date3));
    addText("Extension Date 4", formatDateToDDMMYY(entry?.extension_date4));
    addText("Extension Date 5", formatDateToDDMMYY(entry?.extension_date5));
    addText("Extension Date 6", formatDateToDDMMYY(entry?.extension_date6));
    addText("Release Date", formatDateToDDMMYY(entry?.release_date));
    addText("Correct and Confirmed BG in Prescribed Format is being forwarded.", "");

    return pdf;
  };

  const handleFileUpload = async () => {
    if (!formData.sdbgFile) {
      toast.warning("Please select a file before uploading!");
      return;
    }

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("type", "BGX");
    uploadFormData.append("ref", user?.vendor_code || "vendor");
    uploadFormData.append("file", formData.sdbgFile);

    try {
      const response = await apiCallBack("POST", "upload/fileStream", uploadFormData, token);
      console.log(response, "response upload");

      if (response?.data?.filePath) {
        setUploadResponse(response);

        // FormData mein uploaded file ka path save karein
        setFormData((prev) => ({
          ...prev,
          uploadedFilePath: response.data.filePath,
          uploadedFileName: response.data.fileName,
        }));

        toast.success("File uploaded successfully!");
      } else {
        toast.warning("Failed to upload file. Please try again.");
      }
    } catch (error) {
      console.error("File upload failed:", error);
      toast.warning("Failed to upload file. Please try again.");
    }
    setIsUploading(false);
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
                        {user?.user_type !== ASSIGNER && (
                          <>
                            {/* Finance Head (deptid = 15 and internal_role_Id 1) */}
                            {user?.department_id === DEPT_FI && user?.internal_role_id === ASSIGNER && !checkuser && (
                              <>
                                <p className="m-0 p-2">{!currentAssign?.assigned_to ? "(Not Assigned!)" : `Assigned to ${currentAssign.assigned_to}`}</p>
                                <button onClick={() => setIsAssignPopup(true)} className="btn fw-bold btn-primary me-3">
                                  ASSIGN
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {/* Vendor  */}
                        {user?.user_type === ASSIGNER && (
                          <>
                            <button onClick={() => setIsPopup(true)} className="btn btn-sm fw-bold btn-primary">
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
                                  <th className="min-w-150px">DateTime </th>
                                  <th>Bank Guarantee No</th>
                                  <th className="min-w-90px">File</th>
                                  <th className="min-w-150px">Action By</th>
                                  <th className="min-w-150px">Action On (next)</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th>Status</th>
                                  {(isDO || (user?.department_id === DEPT_FI && !checkuser)) && <th className="min-w-150px">Action</th>}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={11}>
                                        <SkeletonLoader col={6} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {Object.keys(groupedBG).map((it, index) => {
                                      let items = groupedBG[it];
                                      return (
                                        <Fragment key={index}>
                                          <tr>
                                            <td colSpan={11}>
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
                                                    <td colSpan={7}>
                                                      <b>{item}</b>
                                                    </td>
                                                    <td>
                                                      {isDO && ite.some((data) => data.status !== "ASSIGNED") && (
                                                        <span>
                                                          {console.log("isDO", isDO)}
                                                          {console.log("ite", ite)}
                                                          <button
                                                            onClick={() => {
                                                              setIsEntryPopup(true);
                                                              setFormDatainput({
                                                                ...formDatainput,
                                                                reference_no: item,
                                                              });
                                                              SdbgEntryUpdate(item);
                                                            }}
                                                            className="btn fw-bold btn-primary btn-sm"
                                                          >
                                                            ACTION
                                                          </button>
                                                        </span>
                                                      )}
                                                      {console.log("ite", ite)}
                                                      {console.log("user", user)}
                                                      {((ite && ite.some((data) => user?.department_id === DEPT_FI && data.status !== "ASSIGNED")) ||
                                                        user.user_type === USER_VENDOR) &&
                                                        !checkuser && (
                                                          <button
                                                            onClick={() => {
                                                              setIsCheckEntryPopup(true);
                                                              setFormDatainput({
                                                                ...formDatainput,
                                                                reference_no: item,
                                                              });
                                                              SdbgEntryUpdate(item);
                                                            }}
                                                            className="btn btn-sm fw-bold btn-primary me-3"
                                                          >
                                                            {user?.user_type === USER_VENDOR ? "VIEW" : "ACTION"}
                                                          </button>
                                                        )}
                                                      {user?.user_type === USER_VENDOR && ite && ite.some((data) => data.status === "APPROVED") && (
                                                        <button
                                                          onClick={async () => {
                                                            const res = await apiCallBack("POST", "po/sdbg/getspecificbg", { reference_no: item, purchasing_doc_no: id }, token);
                                                            const entry = res?.data?.[res.data.length - 1];
                                                            if (!entry) {
                                                              return toast.warn("Could not load BG details for this request.");
                                                            }
                                                            setExtTarget(entry);
                                                            setIsExtPopup(true);
                                                          }}
                                                          className="btn btn-sm fw-bold btn-info"
                                                        >
                                                          REQUEST EXT/RELEASE
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                  {ite &&
                                                    ite.map((data, dex) => (
                                                      <tr key={dex}>
                                                        <td className="table_center">{data?.created_at && formatDate(data?.created_at)}</td>
                                                        <td>{data?.bg_no}</td>
                                                        <td>
                                                          <a href={formatFilePath(data.file_path)} target="_blank" rel="noreferrer">
                                                            Check File
                                                          </a>
                                                        </td>
                                                        <td>{data?.assigned_from || data?.action_by}</td>
                                                        <td>{data?.assigned_to || data?.action_on}</td>
                                                        <td>{data?.remarks}</td>
                                                        <td className={`${clrLegend(data?.status)} bold`}>{data?.status}</td>
                                                        <td></td>
                                                      </tr>
                                                    ))}
                                                </Fragment>
                                              );
                                            })}
                                        </Fragment>
                                      );
                                    })}
                                  </>
                                )}
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
                    bg_no: "",
                  });
                  // Reset all form fields
                  let bg = { ...bgInputs, purchasing_doc_no: id };
                  setFormDatainput(bg);
                }}
              >
                Close
              </button>
            </div>

            <div className="row">
              {/* Action Type */}
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
                    <option value={ACTION_MBG}>{ACTION_MBG}</option>
                    <option value={ACTION_RM}>{ACTION_RM}</option>
                    <option value={ACTION_O}>{ACTION_O}</option>
                  </select>
                </div>
              </div>

              {/* File Upload */}
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    BG File
                    <span className="mandatorystart">*</span>
                    <FileUploadInfoIcon />
                  </label>
                  <input type="file" ref={inputFileRef} className="form-control" onChange={(e) => setFormData({ ...formData, sdbgFile: e.target.files[0] })} accept=".pdf" />
                  {/* Upload Button */}
                  <button type="button" className="btn btn-sm btn-info mt-2" onClick={handleFileUpload} disabled={!formData.sdbgFile || isUploading}>
                    {isUploading ? "Uploading..." : "Upload File"}
                  </button>
                  {/* Upload Status */}
                  {formData.uploadedFilePath && (
                    <div className="mt-2 text-success">
                      <small>✓ File uploaded successfully: {formData.uploadedFileName}</small>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Name</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bank_name" value={formDatainput?.bank_name || ""} onChange={handleInputChange2} />
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Email Id</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input
                    type="email"
                    className="form-control"
                    name="bank_email"
                    value={formDatainput?.bank_email || ""}
                    onChange={(e) => setFormDatainput((prev) => ({ ...prev, bank_email: e.target.value }))}
                  />
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
                  <input type="text" className="form-control" name="bank_addr1" value={formDatainput?.bank_addr1 || ""} onChange={handleInputChange2} maxLength={45} />
                  <small>{formDatainput?.bank_addr1?.length || 0}/45 characters</small>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address2</label>
                  <input type="text" className="form-control" name="bank_addr2" value={formDatainput?.bank_addr2 || ""} onChange={handleInputChange2} maxLength={45} />
                  <small>{formDatainput?.bank_addr2?.length || 0}/45 characters</small>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers Address3</label>
                  <input type="text" className="form-control" name="bank_addr3" value={formDatainput?.bank_addr3 || ""} onChange={handleInputChange2} maxLength={45} />
                  <small>{formDatainput?.bank_addr3?.length || 0}/45 characters</small>
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Bankers City</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <input type="text" className="form-control" name="bank_city" value={formDatainput?.bank_city || ""} onChange={handleInputChange2} />
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

              {/* BG Details */}
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
                    selected={parseDateFromEpoch(formDatainput.bg_recived_date)}
                    onChange={(date) => {
                      setFormDatainput((prevData) => ({
                        ...prevData,
                        bg_recived_date: convertToEpochh(date),
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
                    step="any"
                  />
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <input
                    type="number"
                    className="form-control"
                    name="yard_no"
                    value={formDatainput?.yard_no || ""}
                    onChange={handleInputChange2}
                    onWheel={(e) => inputOnWheelPrevent(e)}
                  />
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Validity Date</label>
                  &nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <DatePicker
                    selected={parseDateFromEpoch(formDatainput.validity_date)}
                    onChange={(date) => {
                      setFormDatainput((prevData) => ({
                        ...prevData,
                        validity_date: convertToEpochh(date),
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
                    selected={parseDateFromEpoch(formDatainput.claim_priod)}
                    onChange={(date) => {
                      setFormDatainput((prevData) => ({
                        ...prevData,
                        claim_priod: convertToEpochh(date),
                      }));
                    }}
                    dateFormat="dd/MM/yyyy"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">BG Type</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <select
                    className="form-select"
                    value={formDatainput?.bg_type || ""}
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
                    <option value="MATERIAL BG">MATERIAL BG</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>&nbsp;&nbsp;
                  <span className="mandatorystart">*</span>
                  <textarea rows="4" className="form-control" value={formData?.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}></textarea>
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <div className="col-12">
                <div className="form-check pb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="isConfirmedBG"
                    name="isConfirmedBG"
                    checked={formDatainput?.isConfirmedBG || false}
                    onChange={(e) =>
                      setFormDatainput({
                        ...formDatainput,
                        isConfirmedBG: e.target.checked,
                      })
                    }
                  />
                  <label className="form-check-label" htmlFor="isConfirmedBG">
                    Correct and Confirmed BG in Prescribed Format is being forwarded.
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="col-12">
                <div className="mb-3 d-flex justify-content-between">
                  <DynamicButton label="SUBMIT" onClick={() => updateSDBG("SUBMITTED")} className="btn fw-bold btn-primary" />
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
            <div className="card-header border-0 pt-5" style={{ display: "flex", alignItems: "center" }}>
              <h3 className="card-title flex-column" style={{ marginRight: "10px" }}>
                <span className="card-label fw-bold fs-3 mb-1">BG Entry</span>
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <DynamicButton label="SAVE" onClick={() => uploadSDBGSave("SAVED")} className="btn btn-sm fw-bold btn-info" />
                <button className="btn fw-bold btn-success">
                  <FaDownload size={20} onClick={handleDownloadPDF} />
                </button>
                <button
                  className="btn btn-sm fw-bold btn-danger d-flex"
                  onClick={() => {
                    setIsEntryPopup(false);
                    let bg = { ...bgInputs, purchasing_doc_no: id };
                    setFormDatainput(bg);
                  }}
                  style={{ fontSize: "24px" }}
                >
                  <IoClose />
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="row">
                <div className="col-12">
                  <SkeletonLoader row={10} col={2} />
                </div>
              </div>
            ) : (
              <div className="row">
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Ref No</label>
                    <input type="text" className="form-control" name="reference_no" value={formDatainput?.reference_no || ""} disabled />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Name</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input type="text" className="form-control" name="bank_name" value={formDatainput?.bank_name || ""} onChange={handleInputChange2} />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers Email Id</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input
                      type="email"
                      className="form-control"
                      name="bank_email"
                      value={formDatainput?.bank_email || ""}
                      onChange={(e) => setFormDatainput((prev) => ({ ...prev, bank_email: e.target.value }))}
                    />
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
                    <input type="text" className="form-control" name="bank_addr1" value={formDatainput?.bank_addr1 || ""} onChange={handleInputChange2} maxLength={45} />
                    <small>{formDatainput?.bank_addr1?.length || 0}/45 characters</small>
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
                      maxLength={45} // Restrict user input directly
                    />
                    <small>{formDatainput?.bank_addr2?.length || 0}/45 characters</small>
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
                      maxLength={45} // Restrict user input directly
                    />
                    <small>{formDatainput?.bank_addr3?.length || 0}/45 characters</small>
                  </div>
                </div>

                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Bankers City</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <input type="text" className="form-control" name="bank_city" value={formDatainput?.bank_city || ""} onChange={handleInputChange2} />
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
                    <input type="text" className="form-control" name="bg_no" value={formDatainput?.bg_no || ""} onChange={handleInputChange2} />
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
                      selected={parseDateFromEpoch(formDatainput.bg_recived_date)}
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
                      step="any"
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Yard No</label>
                    <input
                      type="number"
                      className="form-control"
                      name="yard_no"
                      value={formDatainput?.yard_no || ""}
                      onChange={handleInputChange2}
                      onWheel={(e) => inputOnWheelPrevent(e)}
                    />
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Validity Date</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <DatePicker
                      selected={formDatainput.validity_date ? new Date(formDatainput.validity_date * 1000) : null}
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
                      selected={formDatainput.claim_priod ? new Date(formDatainput.claim_priod * 1000) : null}
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
                    <span className="mandatorystart">*</span>
                    <input type="text" className="form-control" name="department" value={formDatainput?.department || ""} onChange={handleInputChange2} />
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
                      <option value="MATERIAL BG">MATERIAL BG</option>
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
                      Correct and Confirmed BG in Prescribed Format is being forwarded.
                    </label>
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    <DynamicButton
                      label="FORWARD TO FINANCE"
                      onClick={() => uploadSDBGEntry("FORWARD_TO_FINANCE")}
                      className="btn-primary"
                      confirmMessage="You're going to forward the SDBG to Finance Dept. Please confirm!"
                    />
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
            )}
          </div>
        </div>
      )}

      {/* for finance officer  */}
      {(user?.department_id === DEPT_FI || user.user_type === USER_VENDOR) && (
        <div className={isCheckEntryPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Check BG Entry</span>
              </h3>
              <button
                className="btn btn-sm fw-bold btn-danger d-flex"
                onClick={() => {
                  setIsCheckEntryPopup(false);
                  let bg = { ...bgInputs, purchasing_doc_no: id };
                  setFormDatainput(bg);
                  setSdbgEntryForFi(bgFi);
                }}
                style={{ fontSize: "24px" }}
              >
                <IoClose />
              </button>
            </div>
            {isLoading ? (
              <div className="row">
                <div className="col-12">
                  <SkeletonLoader row={10} col={2} />
                </div>
              </div>
            ) : (
              <div className="row">
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">BG Tracking No. (BG File No)</label>
                    &nbsp;&nbsp;
                    {formDatainput?.bg_file_no ? <p>{formDatainput?.bg_file_no}</p> : <p>Will be generated automatically on acceptance by Finance.</p>}
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Reference No</label>
                    <p>{formDatainput?.reference_no}</p>
                  </div>
                </div>
                {console.log(formDatainput?.created_at, "formDatainput?.created_at")}
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
                        {formDatainput?.created_at ? formatDate(formDatainput.created_at) : ""}
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
                    <label className="form-label">Bankers Email Id</label>
                    <p>{formDatainput?.bank_email}</p>
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
                    <p>{formDatainput?.bg_date ? formatDate(formDatainput.bg_date * 1000) : ""}</p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">BG Received Date</label>
                    <p>{formDatainput?.bg_recived_date ? formatDate(formDatainput?.bg_recived_date * 1000) : ""}</p>
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
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">PO Number</label>
                    <p>{formDatainput?.purchasing_doc_no}</p>
                  </div>
                </div>
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
                    <p>{formDatainput?.validity_date ? formatDate(formDatainput?.validity_date * 1000) : ""}</p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Claim Period</label>
                    <p>{formDatainput?.claim_priod ? formatDate(formDatainput.claim_priod * 1000) : ""}</p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 1</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date1 && formDatainput.extension_date1 !== "0" ? formatDate(formDatainput.extension_date1 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 2</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date2 && formDatainput.extension_date2 !== "0" ? formatDate(formDatainput.extension_date2 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 3</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date3 && formDatainput.extension_date3 !== "0" ? formatDate(formDatainput.extension_date3 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 4</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date4 && formDatainput.extension_date4 !== "0" ? formatDate(formDatainput.extension_date4 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 5</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date5 && formDatainput.extension_date5 !== "0" ? formatDate(formDatainput.extension_date5 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Extension Date 6</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.extension_date6 && formDatainput.extension_date6 !== "0" ? formatDate(formDatainput.extension_date6 * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">Release Date</label>
                    <p>
                      <td
                        style={{
                          border: "none",
                          background: "none",
                        }}
                      >
                        {formDatainput?.release_date && formDatainput.release_date !== "0" ? formatDate(formDatainput.release_date * 1000) : ""}
                      </td>
                    </p>
                  </div>
                </div>
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
                <div className="col-md-6 col-12">
                  {entryState[formDatainput?.reference_no]?.showRemarksInput && (
                    <div className="col-12 mb-3">
                      <label className="form-label">Remarks</label>
                      <textarea
                        className="form-control"
                        value={entryState[formDatainput?.reference_no]?.remarks}
                        onChange={(e) => handleRemarksChange(formDatainput?.reference_no, e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="col-12">
                  <label className="form-check-label" htmlFor="isConfirmedBG">
                    Correct and Confirmed BG in Prescribed Format is being forwarded.
                  </label>
                </div>
                {user?.department_id === DEPT_FI && (
                  <>
                    <div className="col-12">
                      <div className="mb-3 d-flex justify-content-between">
                        <button
                          onClick={() =>
                            reConfirm({ file: true }, () => financeEntry("APPROVED", formDatainput?.reference_no), "You're going to receiving the SDBG Entry. Please confirm!")
                          }
                          className="btn fw-bold btn-success me-3"
                          type="button"
                        >
                          RECEIVED
                        </button>
                        <button onClick={() => handleReturnClick(formDatainput?.reference_no)} className="btn fw-bold btn-primary" type="button">
                          {entryState[formDatainput?.reference_no]?.showRemarksInput ? "Confirm Return to Dept" : "Return to Dept"}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* for finance officer and Assigner  */}
      {userType !== USER_VENDOR && user.department_id === DEPT_FI && user.internal_role_id === ASSIGNER && (
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
                    <HrSearchableSelect
                      options={empOption}
                      value={assign.assigned_to}
                      onChange={(val) =>
                        setAssign({
                          ...assign,
                          assigned_to: val ? val.value : null,
                        })
                      }
                      placeholder="Select employee"
                      isClearable={true}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    <DynamicButton label="ASSIGN" onClick={assignSDBGByFinance} className="btn fw-bold btn-primary" />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor: Request Extension / Release against an already-accepted BG */}
      {isExtPopup && (
        <div className="popup active">
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Request Extension / Release</span>
              </h3>
              <button className="btn fw-bold btn-danger" onClick={() => setIsExtPopup(false)}>
                Close
              </button>
            </div>
            <form>
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Against BG No</label>
                    <p>
                      {extTarget?.bg_no} (Tracking No: {extTarget?.bg_file_no || "-"})
                    </p>
                  </div>
                </div>
                <div className="col-md-6 col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Request Type <span className="mandatorystart">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={extForm.action_type}
                      onChange={(e) => setExtForm((prev) => ({ ...prev, action_type: e.target.value }))}
                    >
                      <option value="">Select</option>
                      <option value="EXTENSION">Extension</option>
                      <option value="RELEASE">Release</option>
                    </select>
                  </div>
                </div>

                {extForm.action_type === "EXTENSION" && (
                  <>
                    <div className="col-md-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">
                          New Validity Date <span className="mandatorystart">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={extForm.validity_date}
                          onChange={(e) => setExtForm((prev) => ({ ...prev, validity_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Revised BG Date (if changed)</label>
                        <input
                          type="date"
                          className="form-control"
                          value={extForm.bg_date}
                          onChange={(e) => setExtForm((prev) => ({ ...prev, bg_date: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Revised BG Amount (if changed)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={extForm.bg_amount}
                          onChange={(e) => setExtForm((prev) => ({ ...prev, bg_amount: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-md-6 col-12">
                      <div className="mb-3">
                        <label className="form-label">Revised BG Number (if changed)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={extForm.bank_gu_no}
                          onChange={(e) => setExtForm((prev) => ({ ...prev, bank_gu_no: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Revised BG Document from Bank <span className="mandatorystart">*</span>
                        </label>
                        <input type="file" className="form-control" accept=".pdf" onChange={(e) => handleExtFileUpload(e.target.files[0])} />
                        {extForm.bg_filename && <small>Uploaded: {extForm.bg_filename}</small>}
                      </div>
                    </div>
                  </>
                )}

                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Reason / Remarks <span className="mandatorystart">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={extForm.reason}
                      onChange={(e) => setExtForm((prev) => ({ ...prev, reason: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3">
                    <DynamicButton label="SUBMIT" onClick={submitExtensionOrRelease} className="btn fw-bold btn-primary" disabled={isExtUploading} />
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
