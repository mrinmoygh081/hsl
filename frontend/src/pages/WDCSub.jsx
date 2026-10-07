import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calDatesDiff, convertToEpoch, formatDashedDate, formatDate, formatEpochToDate, formatFilePath, formatFilePathWDC } from "../utils/getDateTimeNow";
import { clrLegend } from "../utils/clrLegend";
import { checkTypeArr } from "../utils/smallFun";
import { USER_VENDOR } from "../constants/userConstants";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { groupedByRefNo } from "../utils/groupedByReq";
import { inputOnWheelPrevent } from "../utils/inputOnWheelPrevent";
import { FaMinus, FaPlus } from "react-icons/fa";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import { useReactToPrint } from "react-to-print";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logo from "../images/image001.jpg";
import { BsChatRightText } from "react-icons/bs";
import SearchableSelect from "../components/SearchableSelect";

const styles = `
  .icon-container {
    position: relative;
    display: inline-block;
  }
  .tooltip {
    visibility: hidden;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 4px;
    padding: 5px 10px;
    position: absolute;
    z-index: 1000;
    bottom: 125%;
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    font-size: 12px;
    opacity: 0;
    transition: opacity 0.3s;
  }
  .icon-container:hover .tooltip {
    visibility: visible;
    opacity: 1;
  }
`;

// Inject styles into the document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const WDCSub = () => {
  const { id } = useParams();
  const { user, token } = useSelector((state) => state.auth);
  const { po } = useSelector((state) => state.selectedPO);

  let line_item_fields = {
    claim_qty: "",
    lineitem: "",
    sublineitem: "",
    contractual_start: "",
    contractual_completion: "",
    actual_start: "",
    actual_completion: "",
    hinderance: "",
  };

  let initialFormData = {
    certifying_authority: "",
    action_type: "",
    remarks: "",
    job_location: "",
    yard_no: "",
    unit: "",
    stage_details: "",
    work_title: "",
    work_done_by: "",
    inspection_note_ref_no: "",
    file_inspection_note_ref_no: null,
    hinderence_report_cerified_by_berth: "",
    file_hinderence_report_cerified_by_berth: null,
    attendance_report: "",
    file_attendance_report: null,
    line_item_array: [line_item_fields],
    damage_array: [{ name: "", amount: "" }],
  };

  // WDC

  console.log(user.vendor_code, "abhinit");

  let initialFormDatawdc = {
    action_type: "",
    remarks: "",
    job_location: "",
    yard_no: "",
    status: "",
    work_title: "",
    work_done_by: "",
    total_amount: "",
    guarantee_defect_liability_start: "",
    guarantee_defect_liability_end: "",
    guarantee_defect_liability_status: "",
    jcc_job_start: "",
    jcc_job_end: "",
  };

  const [isPopup, setIsPopup] = useState(false);
  const [isPopupView, setIsPopupView] = useState(false);
  const [isPopupJccView, setIsPopupJccView] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const [isSecjccActionPopup, setIsjccActionSecPopup] = useState(false);
  const [isSecjccActionViewPopup, setIsjccActionSecViewPopup] = useState(false);
  const [allData, setAllData] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [viewData, setViewData] = useState(null);
  const [emp, setEmp] = useState(null);
  const [doForm, setDoForm] = useState([]);
  const [status, setStatus] = useState("");
  const [statusjcc, setStatusjcc] = useState("");
  const [showRemarksPopup, setShowRemarksPopup] = useState(false);
  const [showRemarksDelegatePopup, setShowRemarksDelegatePopup] = useState(false);
  const [showRemarksRecommedPopup, setShowRemarksRecommedPopup] = useState(false);
  const [showRemarksPopupjcc, setShowRemarksPopupjcc] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [delegateRemarks, setDelegateRemarks] = useState("");
  const [delegateRecommed, setDelegateRecommed] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([line_item_fields]);
  const [lineItems, setLineItems] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [formDataWdc, setFormDataWdc] = useState(initialFormDatawdc);
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    referenceNo: null,
  });
  const [cancelGrseModal, setCancelGrsModal] = useState({
    isOpen: false,
    referenceNo: null,
  });

  const fileoneInputRef = useRef(null);
  const filetwoInputRef = useRef(null);
  const filethreeInputRef = useRef(null);
  const popupRef = useRef(null);
  const remarksRef = useRef(null);

  // print and downlod wdc view page
  const componentRef = useRef();
  const [isRemarksPopupOpen, setIsRemarksPopupOpen] = useState(false);
  const [currentRemarks, setCurrentRemarks] = useState("");

  const handleShowRemarksPopup = (remarks) => {
    setCurrentRemarks(remarks || "No remarks provided");
    setIsRemarksPopupOpen(true);
  };

  const handleCloseRemarksPopup = () => {
    setIsRemarksPopupOpen(false);
    setCurrentRemarks("");
  };

  useEffect(() => {
    if (viewData?.penalty_details) {
      try {
        // Double parse to handle stringified JSON
        const firstParse = JSON.parse(viewData.penalty_details);
        const parsedPenalties = JSON.parse(firstParse);
        if (Array.isArray(parsedPenalties) && parsedPenalties.length > 0) {
          setFormData((prev) => ({
            ...prev,
            damage_array: parsedPenalties.map((item) => ({
              name: item.name || "",
              amount: item.amount || "",
            })),
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            damage_array: [{ name: "", amount: "" }],
          }));
        }
      } catch (error) {
        console.error("Error parsing penalty_details:", error);
        setFormData((prev) => ({
          ...prev,
          damage_array: [{ name: "", amount: "" }],
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        damage_array: [{ name: "", amount: "" }],
      }));
    }
  }, [viewData]);
  console.log(viewData, "viewData abhinit");

  const closePopup = () => {
    if (popupRef.current) {
      popupRef.current.style.display = "none"; // Hide the popup
      remarksRef.current.textContent = ""; // Clear the remarks text
    }
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal"); // Set default font to normal

    // Add logo and company name
    doc.addImage(logo, "PNG", 10, 10, 20, 20);
    doc.text("Garden Reach Shipbuilders & Engineers (HSL)", 35, 20);

    // Add title with bold font
    doc.setFont("helvetica", "bold");
    const titleText = "Work Done Certificate (WDC)";
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(titleText);
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(titleText, xPosition, 40);
    doc.setFont("helvetica", "normal"); // Reset to normal font after title

    // Define fields for the document
    let y = 50;
    const fields = [
      {
        label: "WDC No",
        value: `${viewData?.reference_no || "N/A"} (${viewData?.status === "APPROVED" ? "Approved" : viewData?.status === "REJECTED" ? "Rejected" : "Unapproved"})`,
      },
      { label: "PO No", value: po || "N/A" },
      {
        label: "Supplier",
        value: `${viewData?.vendor_code || "N/A"} (${viewData?.vendor_name || "N/A"})`,
      },
      { label: "Work Title", value: viewData?.work_title || "N/A" },
      { label: "Work Done By", value: viewData?.work_done_by || "N/A" },
      { label: "Job Location", value: viewData?.job_location || "N/A" },
      { label: "Yard No", value: viewData?.yard_no || "N/A" },
      { label: "Unit", value: viewData?.unit || "N/A" },
      {
        label: "Inspection Note Ref No",
        value: viewData?.inspection_note_ref_no || "N/A",
      },
      {
        label: "Hinderence Report",
        value: viewData?.hinderence_report_cerified_by_berth || "N/A",
      },
      { label: "Attendance Report", value: viewData?.attendance_report || "N/A" },
      {
        label: "Certifying Authority",
        value: `${viewData?.assigned_to_name || "N/A"} (${viewData?.assigned_to || "N/A"})`,
      },
      { label: "Stage Details", value: viewData?.stage_details || "N/A" },
      ...(viewData?.delegate_to ? [{ label: "Delegated", value: viewData.delegate_to }] : []),
      ...(viewData?.delegate_to_name ? [{ label: "Delegated Name", value: viewData.delegate_to_name }] : []),
      { label: "Remarks", value: viewData?.remarks || "N/A" },
      { label: "Total Amount", value: viewData?.total_amount || "N/A" },
    ];

    // Render fields, handling Remarks with text wrapping
    fields.forEach((field) => {
      if (field.label === "Remarks" && field.value !== "N/A") {
        // Wrap long remarks text
        const maxWidth = pageWidth - 20; // Account for 10px margins on both sides
        const lines = doc.splitTextToSize(`${field.label}: ${field.value}`, maxWidth);
        doc.text(lines, 10, y);
        y += lines.length * 7; // Adjust y position based on number of lines
      } else {
        doc.text(`${field.label}: ${field.value}`, 10, y);
        y += 7;
      }
    });

    // Item table
    const itemTableStartY = y;
    doc.autoTable({
      startY: itemTableStartY,
      head: [["Li", "Sub Li", "Description", "Open Qty", "Claim Qty", "Contractual Start", "Contractual Completion", "Actual Start", "Actual Completion", "Hind."]],
      body:
        viewData?.item?.map((field) => [
          field?.lineitem || "",
          field?.sublineitem || "",
          field?.description || "",
          `${field?.open_qty || ""} ${field?.unit || ""}`,
          `${field?.claim_qty || ""} ${field?.unit || ""}`,
          field?.contractual_start ? formatDate(field.contractual_start) : "",
          field?.contractual_completion ? formatDate(field.contractual_completion) : "",
          field?.actual_start ? formatDate(field.actual_start) : "",
          field?.actual_completion ? formatDate(field.actual_completion) : "",
          field?.hinderance || "",
        ]) || [],
    });

    // Penalty table
    console.log("Penalty Details:", penaltyDetails); // Debugging log
    if (Array.isArray(penaltyDetails) && penaltyDetails.length > 0) {
      const totalPenalty = penaltyDetails.reduce((total, field) => {
        const amount = Number(field.amount) || 0;
        console.log(`Field: ${field.name}, Amount: ${amount}`); // Debugging log
        return total + amount;
      }, 0);
      console.log("Total Penalty Amount:", totalPenalty); // Debugging log
      if (totalPenalty > 0) {
        const penaltyTableStartY = doc.lastAutoTable.finalY + 10;
        doc.autoTable({
          startY: penaltyTableStartY,
          head: [["Penalty Type", "Penalty Amount"]],
          body: penaltyDetails.map((field) => [field.name || "N/A", field.amount ? Number(field.amount).toFixed(2) : "0.00"]),
          foot: [["Total Amount", totalPenalty.toFixed(2)]],
        });
      }
    }

    // Add declaration at the bottom
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 10;
    doc.text("This is a system-generated document and does not require a signature.", 10, pageHeight - bottomMargin);

    // Save the PDF
    doc.save(`${viewData?.reference_no || "Document"}.pdf`);
  };

  //JCC view
  const handleDownloadJccView = () => {
    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal"); // Set default font to normal

    // Add logo and company name
    doc.addImage(logo, "PNG", 10, 10, 20, 20);
    doc.text("Garden Reach Shipbuilders & Engineers (HSL)", 35, 20);

    // Add title with bold font
    doc.setFont("helvetica", "bold");
    const titleText = "Job Completion Certificate (JCC)";
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(titleText);
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(titleText, xPosition, 40);
    doc.setFont("helvetica", "normal"); // Reset to normal font after title

    // Define fields for the document
    let y = 50;
    const fields = [
      {
        label: "JCC No",
        value: `${viewData?.reference_no || "N/A"} (${viewData?.status === "APPROVED" ? "Approved" : viewData?.status === "REJECTED" ? "Rejected" : "Unapproved"})`,
      },
      { label: "PO No", value: po || "N/A" },
      {
        label: "Date",
        value: viewData?.created_at ? formatDate(viewData?.created_at) : "N/A",
      },
      {
        label: "Supplier",
        value: `${viewData?.vendor_name || "N/A"} (${viewData?.vendor_code || "N/A"})`,
      },
      { label: "Work Title", value: viewData?.work_title || "N/A" },
      { label: "Work Done By", value: viewData?.work_done_by || "N/A" },
      { label: "Job Location", value: viewData?.job_location || "N/A" },
      { label: "Yard No", value: viewData?.yard_no || "N/A" },
      {
        label: "Final Total Executed Value",
        value: viewData?.total_amount || "N/A",
      },
      {
        label: "Guarantee Defect Start Date",
        value: viewData?.guarantee_defect_liability_start ? formatEpochToDate(viewData?.guarantee_defect_liability_start) : "N/A",
      },
      {
        label: "Guarantee Defect End Date",
        value: viewData?.guarantee_defect_liability_end ? formatEpochToDate(viewData?.guarantee_defect_liability_end) : "N/A",
      },
      {
        label: "Job Start Date",
        value: viewData?.jcc_job_start ? formatEpochToDate(viewData?.jcc_job_start) : "N/A",
      },
      {
        label: "Job Completion Date",
        value: viewData?.jcc_job_end ? formatEpochToDate(viewData?.jcc_job_end) : "N/A",
      },
      {
        label: "Certifying Authority",
        value: `${viewData?.assigned_to_name || "N/A"} (${viewData?.assigned_to || "N/A"})`,
      },
      { label: "Remarks", value: viewData?.remarks || "N/A" },
    ];

    // Render fields, handling Remarks with text wrapping
    fields.forEach((field) => {
      if (field.label === "Remarks" && field.value !== "N/A") {
        // Wrap long remarks text
        const maxWidth = pageWidth - 20; // Account for 10px margins on both sides
        const lines = doc.splitTextToSize(`${field.label}: ${field.value}`, maxWidth);
        doc.text(lines, 10, y);
        y += lines.length * 7; // Adjust y position based on number of lines
      } else {
        doc.text(`${field.label}: ${field.value}`, 10, y);
        y += 7;
      }
    });

    // Add declaration at the bottom
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 10;
    doc.text("This is a system-generated document and does not require a signature.", 10, pageHeight - bottomMargin);

    // Save the PDF
    doc.save(`${viewData?.reference_no || "Document"}.pdf`);
  };

  useEffect(() => {
    if (viewData) {
      viewData?.item.forEach((item, index) => {
        let actual = Number(item.actual_completion);
        let contractual = Number(item.contractual_completion);
        const dif = calDatesDiff(new Date(actual), new Date(contractual));
        const hinderanceDays = parseInt(viewData.item[index]?.hinderance) || 0;

        if (contractual && actual) {
          item.delay = Math.max(0, dif - hinderanceDays);
        }
      });
      setDoForm(viewData?.item);
    }
  }, [viewData]);

  const handleInputChange = (e, index, fieldName) => {
    const { value } = e.target;
    const updatedForm = [...doForm];

    // If the fieldName is related to dates, recalculate the delay
    if (fieldName === "contractual_completion") {
      updatedForm[index] = {
        ...updatedForm[index],
        [fieldName]: convertToEpoch(new Date(value)) * 1000,
      };
      const actual = Number(viewData.item[index]?.actual_completion);
      const contractual = updatedForm[index]?.contractual_completion;
      const dif = calDatesDiff(new Date(actual), new Date(contractual));
      const hinderanceDays = parseInt(viewData.item[index]?.hinderance) || 0;

      if (contractual && actual) {
        const delay = dif - hinderanceDays;
        updatedForm[index].delay = delay > 0 ? delay : 0;
      }
    } else if (fieldName === "contractual_start") {
      updatedForm[index] = {
        ...updatedForm[index],
        [fieldName]: convertToEpoch(new Date(value)) * 1000,
      };
    } else {
      updatedForm[index] = {
        ...updatedForm[index],
        [fieldName]: value,
      };
    }

    setDoForm(updatedForm);
  };

  const handleInputChangeOne = (e, fieldName) => {
    const value = e.target.value;
    setStatus(value);

    if (value === "REJECTED") {
      setShowRemarksPopup(true);
      setShowRemarksDelegatePopup(false);
      setShowRemarksRecommedPopup(false);
    } else if (value === "DELEGATED") {
      setShowRemarksDelegatePopup(true);
      setShowRemarksPopup(false);
      setShowRemarksRecommedPopup(false);
    } else if (value === "RECOMMEND") {
      setShowRemarksRecommedPopup(true);
      setShowRemarksPopup(false);
      setShowRemarksDelegatePopup(false);
    } else {
      setShowRemarksPopup(false);
      setShowRemarksDelegatePopup(false);
      setShowRemarksRecommedPopup(false);
    }
  };
  const handleInputChangeOnejcc = (e, fieldName) => {
    const value = e.target.value;
    setStatusjcc(value);

    if (value === "REJECTED") {
      setShowRemarksPopupjcc(true);
    } else {
      setShowRemarksPopupjcc(false);
    }
  };

  const handleDamageChange = (index, e) => {
    const { name, value } = e.target;
    const updatedDamageArray = [...formData.damage_array];
    updatedDamageArray[index] = { ...updatedDamageArray[index], [name]: value };
    setFormData({ ...formData, damage_array: updatedDamageArray });
  };

  const addDamageField = () => {
    setFormData({
      ...formData,
      damage_array: [...formData.damage_array, { name: "", amount: "" }],
    });
  };

  const removeDamageField = (index) => {
    if (formData.damage_array.length > 1) {
      setFormData({
        ...formData,
        damage_array: formData.damage_array.filter((_, i) => i !== index),
      });
    }
  };

  let penaltyDetails = [];

  // Safely parse penalty_details
  try {
    if (viewData?.penalty_details) {
      // First parse to remove outer quotes
      const firstParse = JSON.parse(viewData.penalty_details);
      // Second parse to convert inner string to array
      const parsedData = JSON.parse(firstParse);
      // Ensure parsedData is an array
      if (Array.isArray(parsedData)) {
        penaltyDetails = parsedData;
      } else {
        console.error("Parsed penalty_details is not an array:", parsedData);
      }
    } else {
      console.warn("penalty_details is undefined or null:", viewData?.penalty_details);
    }
  } catch (e) {
    console.error("Error parsing penalty_details:", e);
  }

  const getData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", `po/wdc/v2/wdcList?poNo=${id}`, null, token);
      if (res?.status) {
        setAllData(res?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC/JCC list:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  const getPOLineItemData = useCallback(async () => {
    try {
      const res = await apiCallBack("GET", `po/wdc/getOpenQty?po_no=${id}`, null, token);
      if (res?.status) {
        setLineItems(res?.data);
      }
    } catch (error) {
      console.error("Error fetching PO Line Items:", error);
    }
  }, [id, token]);

  const getEmp = useCallback(async () => {
    try {
      const data = await apiCallBack("GET", `po/wdc/grseEmpList`, null, token);
      if (data?.status) {
        let options = data.data.map((item, index) => {
          return {
            value: item.code,
            label: `${item.name} (${item.code})`,
          };
        });
        setEmp(options);
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
    }
  }, [token]);

  useEffect(() => {
    getData();
    getEmp();
    getPOLineItemData();
  }, [getData, getEmp, getPOLineItemData]);

  useEffect(() => {
    if (allData && allData.length > 0) {
      const gData = groupedByRefNo(allData);
      setGroupedData(gData);
    }
  }, [allData]);

  const submitHandler = async (flag, ref_no) => {
    try {
      const formDataCopy = { ...formData };

      if (formDataCopy.certifying_authority && formDataCopy.action_type && formDataCopy.remarks && formDataCopy.line_item_array && formDataCopy.line_item_array.length > 0) {
        const isInvalid = formDataCopy.line_item_array.some((item, index) => {
          const lineItemNo = item.lineitem ? item.lineitem.toString().trim() : "";
          const claimQty = item.claim_qty ? item.claim_qty.toString().trim() : "";
          const actualStartDate = item.actual_start ? item.actual_start.toString().trim() : "";
          const actualCompletionDate = item.actual_completion ? item.actual_completion.toString().trim() : "";
          const contractualStartDate = item.contractual_start ? item.contractual_start.toString().trim() : "";
          const contractualCompletionDate = item.contractual_completion ? item.contractual_completion.toString().trim() : "";
          const hinderanceInDays = item.hinderance !== null && item.hinderance !== undefined ? item.hinderance.toString().trim() : 0;

          // Perform validation checks for each required field
          if (!lineItemNo) {
            toast.warn(`PO Line Item is required for item ${index + 1}`);
            return true;
          }

          if (!claimQty || isNaN(claimQty) || parseFloat(claimQty) <= 0) {
            toast.warn(`Claim Quantity is required and should be a positive number.`);
            return true;
          }
          if (!contractualStartDate) {
            toast.warn(`Contractual Start Date is required for item ${index + 1}`);
            return true;
          }
          if (!contractualCompletionDate) {
            toast.warn(`Contractual Completion Date is required for item ${index + 1}`);
            return true;
          }
          if (!actualStartDate) {
            toast.warn(`Actual Start Date is required for item ${index + 1}`);
            return true;
          }

          if (!actualCompletionDate) {
            toast.warn(`Actual Completion Date is required for item ${index + 1}`);
            return true;
          }

          if (parseInt(hinderanceInDays) < 0) {
            toast.warn(`Hinderance in Days is required and should be a non-negative number for item ${index + 1}`);
            return true;
          }
          return false;
        });
        if (isInvalid) return;

        // Create a FormData object to prepare data for the API call
        const fD = new FormData();
        console.log("formDataCopy", formDataCopy);

        // Append fields to FormData
        fD.append("purchasing_doc_no", id);
        fD.append("remarks", formDataCopy.remarks);
        fD.append("status", flag);
        fD.append("action_type", formDataCopy.action_type);
        fD.append("work_done_by", formDataCopy.work_done_by || "");
        fD.append("work_title", formDataCopy.work_title || "");
        fD.append("job_location", formDataCopy.job_location || "");
        fD.append("yard_no", formDataCopy.yard_no || "");
        fD.append("inspection_note_ref_no", formDataCopy.inspection_note_ref_no || "");
        fD.append("file_inspection_note_ref_no", formDataCopy.file_inspection_note_ref_no || "");
        fD.append("hinderence_report_cerified_by_berth", formDataCopy.hinderence_report_cerified_by_berth || "");
        fD.append("file_hinderence_report_cerified_by_berth", formDataCopy.file_hinderence_report_cerified_by_berth || "");
        fD.append("attendance_report", formDataCopy.attendance_report || "");
        fD.append("file_attendance_report", formDataCopy.file_attendance_report || "");
        fD.append("unit", formDataCopy.unit || "");
        fD.append("stage_details", formDataCopy.stage_details || "");
        fD.append("assigned_to", formDataCopy.certifying_authority || "");
        fD.append("item", JSON.stringify(formDataCopy.line_item_array));

        // Make the API call using the FormData object
        const res = await apiCallBack("POST", "po/wdc/v2/submitWdc", fD, token);

        // Handle the API response
        if (res.status) {
          toast.success(res.message);
          setIsPopup(false);
          setIsSecPopup(false);
          setFormData(initialFormData);
          setDynamicFields([line_item_fields]);
          getData();
        } else {
          toast.warn(res.message);
        }
      } else {
        console.log("Required fields are missing or incorrect.");
        toast.warn("Please fill up all the required fields!");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting form: " + error.message);
    }
  };

  //JCC *****************************************************
  const submitHandlerWdc = async (flag, ref_no) => {
    try {
      // Create copies of formData and formDataWdc
      const formDataCopy = { ...formData };
      const formDataWdcCopy = { ...formDataWdc };

      // Check if all main fields are filled
      if (formDataCopy.action_type && formDataWdcCopy.remarks && formDataCopy.certifying_authority && formDataWdcCopy.total_amount) {
        let isValid = true;

        if (!isValid) {
          console.log("Validation failed. Exiting submitHandler.");
          return;
        }

        // Prepare form data for API call
        const formDataToSend = new FormData();
        formDataToSend.append("action_type", formDataCopy.action_type);
        formDataToSend.append("purchasing_doc_no", id);
        formDataToSend.append("remarks", formDataWdcCopy.remarks);
        formDataToSend.append("status", flag);
        formDataToSend.append("work_done_by", formDataWdcCopy.work_done_by || "");
        formDataToSend.append("work_title", formDataWdcCopy.work_title || "");
        formDataToSend.append("job_location", formDataWdcCopy.job_location || "");
        formDataToSend.append("yard_no", formDataWdcCopy.yard_no || "");
        formDataToSend.append("guarantee_defect_liability_status", formDataWdcCopy.guarantee_defect_liability_status || "");
        formDataToSend.append("assigned_to", formDataCopy.certifying_authority);
        formDataToSend.append("total_amount", formDataWdcCopy.total_amount);
        formDataToSend.append("reference_no", ref_no);
        formDataToSend.append("vendor_code", formDataWdcCopy.vendor_code || "");
        formDataToSend.append("updated_by", formDataWdcCopy.updated_by || "VENDOR");
        formDataToSend.append("created_by_id", formDataWdcCopy.created_by_id || "");
        formDataToSend.append("created_by_name", formDataWdcCopy.created_by_name || "");
        formDataToSend.append("created_at", formDataWdcCopy.created_at || Date.now());
        formDataToSend.append("action_by", formDataWdcCopy.action_by || "");
        formDataToSend.append("action_on", formDataWdcCopy.action_on || "");

        // Convert date fields and append only if not null
        const guaranteeStart = convertToEpoch(formDataWdcCopy.guarantee_defect_liability_start);
        const guaranteeEnd = convertToEpoch(formDataWdcCopy.guarantee_defect_liability_end);
        const jccJobStart = convertToEpoch(formDataWdcCopy.jcc_job_start);
        const jccJobEnd = convertToEpoch(formDataWdcCopy.jcc_job_end);

        // Append date fields only if they are not null
        if (guaranteeStart !== null) {
          formDataToSend.append("guarantee_defect_liability_start", guaranteeStart);
        }
        if (guaranteeEnd !== null) {
          formDataToSend.append("guarantee_defect_liability_end", guaranteeEnd);
        }
        if (jccJobStart !== null) {
          formDataToSend.append("jcc_job_start", jccJobStart);
        }
        if (jccJobEnd !== null) {
          formDataToSend.append("jcc_job_end", jccJobEnd);
        }

        // Perform API call
        const res = await apiCallBack("POST", "po/wdc/v2/submitWdc", formDataToSend, token);

        // Handle response
        if (res.status) {
          toast.success(res.message);
          setIsPopup(false);
          setIsSecPopup(false);
          setFormData(initialFormData);
          setFormDataWdc(initialFormDatawdc);
          getData();
        } else {
          toast.warn(res.message);
        }
      } else {
        toast.warn("Please fill up all the required fields!");
      }
    } catch (error) {
      toast.error("Error uploading file: " + error.message);
      console.error("Error uploading file:", error);
    }
  };

  const openCancelModal = (reference_no) => {
    console.log("Opening cancel modal for:", reference_no);
    setCancelModal({
      isOpen: true,
      referenceNo: reference_no,
    });
  };

  const closeCancelModal = () => {
    setCancelModal({
      isOpen: false,
      referenceNo: null,
    });
  };

  const openCancelGrseModal = (reference_no) => {
    console.log("Opening cancel modal for:", reference_no);
    setCancelGrsModal({
      isOpen: true,
      referenceNo: reference_no,
    });
  };

  const closeCancelGrseModal = () => {
    setCancelGrsModal({
      isOpen: false,
      referenceNo: null,
    });
  };

  const confirmCancel = async () => {
    if (!cancelModal.referenceNo) return;

    try {
      const payload = {
        reference_no: cancelModal.referenceNo,
        status: "CANCEL_REQUESTED",
        purchasing_doc_no: id,
      };

      console.log("Sending cancel request:", payload); // Debug log

      const res = await apiCallBack("POST", "po/wdc/v2/cancel-request", payload, token);

      if (res?.status) {
        toast.success(res.message || "Cancel request submitted successfully");
        getData();
      } else {
        toast.warn(res.message || "Failed to submit cancel request");
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Error submitting cancel request");
    } finally {
      closeCancelModal();
    }
  };

  const confirmGrseCancel = async () => {
    if (!cancelGrseModal.referenceNo) return;

    try {
      const payload = {
        reference_no: cancelGrseModal.referenceNo,
        status: "CANCELLED",
        purchasing_doc_no: id,
      };

      console.log("Sending cancel request:", payload);

      const res = await apiCallBack("POST", "po/wdc/v2/cancel-by-grse", payload, token);

      if (res?.status) {
        toast.success(res.message || "Cancel request submitted successfully");
        getData();
      } else {
        toast.warn(res.message || "Failed to submit cancel request");
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Error submitting cancel request");
    } finally {
      closeCancelGrseModal();
    }
  };

  const submitHandlerAction = async (flag, reference_no) => {
    try {
      if (!flag || flag === "") {
        return toast.warn("Status is required.");
      }
      const fD = new FormData();
      fD.append("purchasing_doc_no", viewData?.purchasing_doc_no || "");
      fD.append("reference_no", reference_no || viewData.reference_no || "");
      fD.append("status", flag);

      const newErrors = [];

      doForm.forEach((item) => {
        if (!item?.contractual_start) {
          newErrors.push(`Contractual Start Date is required for lineitem ${item?.lineitem} (${item?.sublineitem})`);
        }
        if (!item?.contractual_completion) {
          newErrors.push(`Contractual Completion Date is required for item ${item?.lineitem} (${item?.sublineitem})`);
        } else if (new Date(item.contractual_completion) < new Date(item.contractual_start)) {
          newErrors.push(`Contractual Completion Date cannot be earlier than Contractual Start Date for item ${item?.lineitem} (${item?.sublineitem})`);
        }
      });

      if (newErrors.length > 0) {
        newErrors.forEach((error) => toast.warn(error));
        return;
      }

      fD.append("item", JSON.stringify(doForm));

      if (flag === "REJECTED") {
        if (!remarks) {
          return toast.warn("Remarks are required for rejection.");
        }
        fD.append("remarks", remarks);
      }
      if (flag === "DELEGATED") {
        if (!delegateRemarks || delegateRemarks.trim() === "") {
          return toast.warn("Remarks are required for delegation.");
        }
        if (!formData.certifying_authority) {
          return toast.warn("Delegate To is required for delegation.");
        }
        fD.append("remarks2", delegateRemarks.trim());
        fD.append("delegate_to", formData.certifying_authority);
      }
      if (flag === "RECOMMEND") {
        if (!delegateRecommed || delegateRecommed.trim() === "") {
          return toast.warn("Remarks are required for delegation.");
        }
        fD.append("remarks3", delegateRecommed.trim());
      }

      // ✅ FIXED: Penalty details should be sent for APPROVED, DELEGATED, and RECOMMEND status
      if (flag === "APPROVED" || flag === "DELEGATED" || flag === "RECOMMEND") {
        if (flag === "DELEGATED" && !formData.certifying_authority) {
          return toast.warn("Delegate To is required for delegation.");
        }

        // Transform damage_array to penalty_details with correct key names
        const penalty_details =
          formData.damage_array?.length > 0
            ? formData.damage_array.map((item) => ({
                name: item.name || "",
                amount: item.amount || "",
              }))
            : [];

        // Append penalty_details only if it contains data
        if (penalty_details.length > 0) {
          fD.append("penalty_details", JSON.stringify(penalty_details));
        }
      }

      const res = await apiCallBack("POST", "po/wdc/v2/updateWdc", fD, token);

      if (res.status) {
        toast.success(res.message);
        setIsPopup(false);
        setIsSecPopup(false);
        setFormData(initialFormData);
        setRemarks("");
        setDoForm([]);
        getData();
      } else {
        toast.warn(res.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  // JCC Submit Handler
  const submitHandlerActionJcc = async (flag, reference_no) => {
    try {
      const fD = new FormData();

      fD.append("purchasing_doc_no", viewData?.purchasing_doc_no || "");
      fD.append("reference_no", reference_no || viewData.reference_no || "");
      fD.append("action_type", viewData?.action_type || "");
      fD.append("remarks", viewData?.remarks || "");
      fD.append("status", flag);

      const newErrors = [];

      // Validate the remarks if flag is REJECTED
      if (flag === "REJECTED" && (!remarks || remarks.trim() === "")) {
        newErrors.push("Remarks are required when rejecting.");
      }

      // Validate each line item in doFormJcc

      // If there are validation errors, display them and return early
      if (newErrors.length > 0) {
        newErrors.forEach((error) => toast.warn(error));
        return;
      }

      // Only append remarks once, based on the flag
      if (flag === "REJECTED") {
        fD.set("remarks", remarks); // Use set to ensure only one instance of remarks
      }

      const res = await apiCallBack("POST", "po/wdc/v2/updateWdc", fD, token);

      if (res.status) {
        toast.success(res.message);
        setIsPopupJccView(false);
        setIsjccActionSecPopup(false);
        setFormDataWdc(initialFormDatawdc);
        setRemarks("");
        setShowRemarksPopupjcc("");
        getData();
      } else {
        toast.warn(res.message);
      }
    } catch (error) {
      toast.error("Error uploading file: " + error.message);
      console.error("Error uploading file:", error);
    }
  };

  const handleFieldChange = async (index, e) => {
    const updatedFields = [...dynamicFields];
    const { name, value } = e.target;

    switch (name) {
      case "lineitem": {
        try {
          let selectedLine = lineItems.filter((item) => item.lineitem === value)[0] || [];
          updatedFields[index] = {
            ...updatedFields[index],
            lineitem: value,
            subData: selectedLine.subData,
            open_qty: selectedLine.open_qty || "",
            unit: selectedLine.unit || "",
            description: selectedLine.description || "",
            claim_qty: "",
          };
        } catch (error) {
          console.error("Error fetching available amount:", error);
        }
        break;
      }
      case "sublineitem": {
        try {
          let subData = updatedFields[index].subData || [];
          let description = subData.filter((item) => item.sublineitem === value)[0].description || [];
          let open_qty = subData.filter((item) => item.sublineitem === value)[0].open_qty || [];
          let unit = subData.filter((item) => item.sublineitem === value)[0].unit || [];

          updatedFields[index] = { ...updatedFields[index], [name]: value, description, open_qty, unit, claim_qty: "" };
        } catch (error) {
          console.error("Error fetching available amount:", error);
        }
        break;
      }
      default: {
        updatedFields[index] = { ...updatedFields[index], [name]: value };
      }
    }
    console.log("updatedFields[index", updatedFields[index]);

    // Update the state with the modified dynamic fields
    setDynamicFields(updatedFields);
    setFormData((prevFormData) => ({
      ...prevFormData,
      line_item_array: updatedFields,
    }));

    // Log the updated state for debugging
    console.log("Updated Fields:", updatedFields);
  };

  const handleDateChange = (index, fieldName, date) => {
    const updatedFields = [...dynamicFields];
    updatedFields[index][fieldName] = date;
    setDynamicFields(updatedFields);
  };

  const handleClosePopup = () => {
    setFormData(initialFormData);
    setFormDataWdc(initialFormDatawdc);
    setDynamicFields([line_item_fields]);
    setIsPopup(false);
  };

  const getSingleInfo = async (ref) => {
    try {
      const res = await apiCallBack("GET", `po/wdc/getWdc?ref=${ref}&po=${id}`, null, token);
      if (res?.status) {
        setViewData(res?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC/JCC list:", error);
    }
  };

  const wdcAuttonVisible = (wdcData, userData, btn) => {
    const firstItem = wdcData[0];

    console.log("🔍 wdcAuttonVisible DEBUG:", {
      status: firstItem?.status,
      action_on: firstItem?.action_on,
      userVendorCode: userData?.vendor_code,
      action_type: firstItem?.action_type,
      button: btn,
    });

    if (!firstItem || firstItem?.action_type !== "WDC") {
      return false;
    }

    const userVendorCode = userData?.vendor_code?.toString().trim();
    const actionOn = firstItem?.action_on?.toString().trim();

    if (btn === "cancel-btn") {
      const result = firstItem?.status === "CANCEL_REQUESTED" && actionOn === userVendorCode;
      console.log("✅ Cancel button result:", result);
      return result;
    }

    if (btn === "action-btn") {
      const excludedStatuses = ["CANCEL_REQUESTED", "APPROVED", "REJECTED"];
      const result = !excludedStatuses.includes(firstItem?.status) && actionOn === userVendorCode;
      console.log("✅ Action button result:", result);
      return result;
    }

    return false;
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"WDC - JCC"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {user?.user_type === USER_VENDOR && (
                          <button onClick={() => setIsPopup(true)} className="btn fw-bold btn-primary mx-3">
                            ACTION
                          </button>
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
                                  <th>Action Type</th>
                                  <th>DateTime </th>
                                  <th className="w_110">Work Title </th>
                                  <th className="min-w-170px">Action By</th>
                                  <th className="min-w-170px">Action On (next)</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th className="w_110">Status</th>
                                  <th className="min-w-150px">Action</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={4} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {Object.keys(groupedData).map((it, index) => {
                                      let items = groupedData[it];
                                      return (
                                        <Fragment key={index}>
                                          <tr className="bg_grey">
                                            <td colSpan={7}>
                                              <b>{it}</b>
                                            </td>
                                            <td className="d-flex">
                                              {/* View Buttons - WDC और JCC दोनों के लिए */}
                                              {items[0]?.action_type === "WDC" && (
                                                <button
                                                  onClick={() => getSingleInfo(it).then(() => setIsPopupView(true))}
                                                  className="btn btn-sm fw-bold btn-secondary m-1"
                                                  type="button"
                                                >
                                                  View
                                                </button>
                                              )}
                                              {items[0]?.action_type === "JCC" && (
                                                <button
                                                  onClick={() => getSingleInfo(it).then(() => setIsPopupJccView(true))}
                                                  className="btn btn-sm fw-bold btn-secondary m-1"
                                                  type="button"
                                                >
                                                  View
                                                </button>
                                              )}

                                              {/* Action Buttons - WDC के लिए */}
                                              {items[0]?.action_type === "WDC" && user.vendor_code === items[0].assigned_to && (
                                                <>
                                                  {/* Action Button - CANCEL_REQUESTED, APPROVED, REJECTED को छोड़कर */}
                                                  {wdcAuttonVisible(items, user, "action-btn") && (
                                                    <button
                                                      onClick={() => getSingleInfo(it).then(() => setIsSecPopup(true))}
                                                      className="btn btn-sm fw-bold btn-primary m-1"
                                                      type="button"
                                                    >
                                                      Action
                                                    </button>
                                                  )}

                                                  {/* CANCELLE Button - सिर्फ CANCEL_REQUESTED status में */}
                                                  {wdcAuttonVisible(items, user, "cancel-btn") && (
                                                    <button onClick={() => openCancelGrseModal(it)} className="btn btn-sm fw-bold btn-danger m-1" type="button">
                                                      CANCELLE
                                                    </button>
                                                  )}
                                                </>
                                              )}

                                              {/* JCC Action Button - पहले जैसा ही */}
                                              {items[0]?.action_type === "JCC" && user.vendor_code === items[0].assigned_to && (
                                                <button
                                                  onClick={() => getSingleInfo(it).then(() => setIsjccActionSecPopup(true))}
                                                  className="btn btn-sm fw-bold btn-primary m-1"
                                                  type="button"
                                                >
                                                  Action
                                                </button>
                                              )}

                                              {/* Delegate Action Button */}
                                              {user.vendor_code === items[0]?.delegate_to && (
                                                <button
                                                  onClick={() => getSingleInfo(it).then(() => setIsSecPopup(true))}
                                                  className="btn btn-sm fw-bold btn-primary m-1"
                                                  type="button"
                                                >
                                                  Action
                                                </button>
                                              )}

                                              {/* CANCEL REQUEST Button - Vendor के लिए, WDC में, और CANCEL_REQUESTED नहीं होना चाहिए */}
                                              {items[0]?.action_type === "WDC" && user?.user_type === USER_VENDOR && items[0]?.status !== "CANCEL_REQUESTED" && (
                                                <button onClick={() => openCancelModal(it)} className="btn btn-sm fw-bold btn-danger m-1" type="button">
                                                  CANCEL REQUEST
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                          {checkTypeArr(items) &&
                                            items.map((item, index) => (
                                              <tr key={index}>
                                                <td>{item?.action_type}</td>
                                                <td>{item?.created_at && formatDate(item?.created_at)}</td>
                                                <td>{item.work_title}</td>
                                                <td>
                                                  {item.action_by_name} ({item.action_by})
                                                </td>
                                                <td>
                                                  {item.action_on_name} ({item.action_on})
                                                </td>
                                                <td>{item?.remarks}</td>
                                                <td className={`${clrLegend(item?.status)} bold`}>
                                                  {item?.status}
                                                  {(item?.status === "REJECTED" || item?.status === "DELEGATED") && (
                                                    <div className="icon-container">
                                                      <BsChatRightText
                                                        className="ms-2"
                                                        size={25}
                                                        style={{ cursor: "pointer", color: "blue" }}
                                                        onClick={() => handleShowRemarksPopup(item.status === "REJECTED" ? item.remarks : item.remarks2)}
                                                        aria-label={`View reason for ${item.status === "REJECTED" ? "rejection" : "delegation"}`}
                                                      />
                                                      <div className="tooltip">Reason for {item.status === "REJECTED" ? "Rejection" : "Delegated"}</div>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="d-flex">
                                                </td>
                                              </tr>
                                            ))}
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
      {cancelModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={closeCancelModal} // Close when clicking overlay
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h4 style={{ marginBottom: "15px", color: "#dc3545" }}>Confirm Cancellation</h4>
            <p style={{ marginBottom: "20px", fontSize: "16px" }}>
              Are you sure you want to cancel request <strong>{cancelModal.referenceNo}</strong>?
            </p>
            <div
              style={{
                marginTop: "25px",
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
              }}
            >
              <button onClick={closeCancelModal} className="btn btn-secondary" style={{ padding: "8px 20px" }}>
                No, Keep It
              </button>
              <button onClick={confirmCancel} className="btn btn-danger" style={{ padding: "8px 20px" }}>
                Yes, Cancel Request
              </button>
            </div>
          </div>
        </div>
      )}
      {cancelGrseModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
          onClick={closeCancelGrseModal}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <h4 style={{ marginBottom: "15px", color: "#dc3545" }}>Confirm Cancellation</h4>
            <p style={{ marginBottom: "20px", fontSize: "16px" }}>
              Are you sure you want to cancel request <strong>{cancelModal.referenceNo}</strong>?
            </p>
            <div
              style={{
                marginTop: "25px",
                display: "flex",
                gap: "15px",
                justifyContent: "flex-end",
              }}
            >
              <button onClick={closeCancelGrseModal} className="btn btn-secondary" style={{ padding: "8px 20px" }}>
                No, Keep It
              </button>
              <button onClick={confirmGrseCancel} className="btn btn-danger" style={{ padding: "8px 20px" }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {user?.user_type === USER_VENDOR && (
        <div className={isPopup ? "popup popup_lg active" : "popup popup_lg"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5 pb-3">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Take Your Action {formData?.action_type && `(${formData?.action_type})`}</span>
              </h3>
              <button className="btn fw-bold btn-danger" onClick={handleClosePopup}>
                Close
              </button>
            </div>
            <form>
              <div className="row">
                <div className="col-12 col-md-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Action <span className="red">*</span>{" "}
                    </label>
                    <select
                      name=""
                      id=""
                      className="form-select"
                      value={formData?.action_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          action_type: e.target.value,
                        })
                      }
                    >
                      <option value="">Choose Your Action</option>
                      <option value="WDC">Work Done Certificate</option>
                      <option value="JCC">Job Completion Certificate</option>
                    </select>
                  </div>
                </div>
                {/* WDC FORM */}
                {formData?.action_type === "WDC" && (
                  <>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Work Done By</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData?.work_done_by}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              work_done_by: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Work Title</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData?.work_title}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              work_title: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">JOB Location</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData?.job_location}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              job_location: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Unit</label>
                        <SearchableSelect
                          options={[
                            { value: "MAIN", label: "MAIN" },
                            { value: "FOJ", label: "FOJ" },
                            { value: "RBD", label: "RBD" },
                            { value: "61PARK", label: "61PARK" },
                            { value: "TU", label: "TU" },
                            { value: "DEP", label: "DEP" },
                          ]}
                          value={formData.unit}
                          onChange={(option) => setFormData({ ...formData, unit: option ? option.value : "" })}
                          placeholder="Select Units..."
                          isClearable={true}
                          className="w_250"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Yard No</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData?.yard_no}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              yard_no: e.target.value,
                            })
                          }
                          onWheel={inputOnWheelPrevent}
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label d-flex align-items-center gap-2">
                          Inspection Note Ref. No.
                          <FileUploadInfoIcon />
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="text"
                            className="form-control me-2"
                            value={formData?.inspection_note_ref_no}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                inspection_note_ref_no: e.target.value,
                              })
                            }
                          />
                          <input
                            type="file"
                            className="form-control"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                file_inspection_note_ref_no: e.target.files[0],
                              })
                            }
                            ref={fileoneInputRef}
                            accept=".pdf"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label d-flex align-items-center gap-2">
                          Hinderence report cerified By Berth. <FileUploadInfoIcon />
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="text"
                            className="form-control me-2"
                            value={formData?.hinderence_report_cerified_by_berth}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hinderence_report_cerified_by_berth: e.target.value,
                              })
                            }
                          />
                          <input
                            type="file"
                            className="form-control"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                file_hinderence_report_cerified_by_berth: e.target.files[0],
                              })
                            }
                            ref={filetwoInputRef}
                            accept=".pdf"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label d-flex align-items-center gap-2">
                          Attendance Report
                          <FileUploadInfoIcon />
                        </label>
                        <div className="d-flex align-items-center gap-2">
                          <input
                            type="text"
                            className="form-control me-2"
                            value={formData?.attendance_report}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                attendance_report: e.target.value,
                              })
                            }
                          />
                          <input
                            type="file"
                            className="form-control"
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                file_attendance_report: e.target.files[0],
                              })
                            }
                            ref={filethreeInputRef}
                            accept=".pdf"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Stage Details</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData?.stage_details}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stage_details: e.target.value,
                            })
                          }
                          onWheel={inputOnWheelPrevent}
                        />
                      </div>
                    </div>

                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th className="w_80">LI</th>
                          <th className="w_80">Sub-LI</th>
                          <th>Description</th>
                          <th className="w_80">Open Qty</th>
                          <th className="w_80">Claim Qty</th>
                          <th className="w_110">Contractual Start</th>
                          <th className="w_110">Contractual End</th>
                          <th className="w_110">Actual Start</th>
                          <th className="w_110">Actual End</th>
                          <th className="w_80">Hinderance Day</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dynamicFields.map((field, index) => (
                          <Fragment key={index}>
                            <tr>
                              <td>
                                <select
                                  name={`lineitem`}
                                  id={`lineitem_${index}`}
                                  className="form-select"
                                  value={field.lineitem}
                                  onChange={(e) => {
                                    handleFieldChange(index, e);
                                  }}
                                  style={{ width: "130px" }}
                                >
                                  <option value="">Choose LineItem</option>
                                  {checkTypeArr(lineItems) &&
                                    lineItems.map((item, i) => (
                                      <option value={item?.lineitem} key={i}>
                                        {item?.lineitem}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  name={`sublineitem`}
                                  id={`sublineitem_${index}`}
                                  className="form-select"
                                  value={field.sublineitem}
                                  onChange={(e) => handleFieldChange(index, e)}
                                  style={{ width: "130px" }}
                                >
                                  <option value="">Choose Sublineitem</option>
                                  {checkTypeArr(dynamicFields[index].subData) &&
                                    dynamicFields[index].subData.map((item, i) => (
                                      <option value={item?.sublineitem} key={i}>
                                        {item?.sublineitem}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td>{field.description}</td>
                              <td>
                                {field.open_qty} {field.unit}
                              </td>
                              <td>
                                <input
                                  type="text"
                                  name="claim_qty"
                                  value={dynamicFields[index].claim_qty || ""}
                                  onChange={(e) => handleFieldChange(index, e)}
                                  className="form-control"
                                />
                              </td>
                              <td>
                                <DatePicker
                                  name="contractual_start"
                                  selected={field.contractual_start}
                                  onChange={(date) => handleDateChange(index, "contractual_start", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                  maxDate={new Date()}
                                />
                              </td>
                              <td>
                                <DatePicker
                                  selected={field.contractual_completion}
                                  onChange={(date) => handleDateChange(index, "contractual_completion", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>
                                <DatePicker
                                  selected={field.actual_start}
                                  onChange={(date) => handleDateChange(index, "actual_start", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                  maxDate={new Date()}
                                />
                              </td>
                              <td>
                                <DatePicker
                                  selected={field.actual_completion}
                                  onChange={(date) => handleDateChange(index, "actual_completion", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                  maxDate={new Date()}
                                />
                              </td>
                              <td>
                                <input type="text" name="hinderance" className="form-control" value={field.hinderance} onChange={(e) => handleFieldChange(index, e)} />
                              </td>
                              <td>
                                {dynamicFields.length > 1 && (
                                  <FaMinus className="me-3 cursor-pointer" onClick={() => setDynamicFields(dynamicFields.filter((_, i) => i !== index))} />
                                )}
                                {index === dynamicFields.length - 1 && <FaPlus className="cursor-pointer" onClick={() => setDynamicFields([...dynamicFields, line_item_fields])} />}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>

                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Certifying Authority <span className="red">*</span>{" "}
                        </label>

                        {checkTypeArr(emp) && (
                          <SearchableSelect
                            options={emp || []}
                            value={formData?.certifying_authority}
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                certifying_authority: val?.value || "",
                              })
                            }
                            placeholder="Select Certifying Authority..."
                            isClearable={true}
                          />
                        )}
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Remarks <span className="red">*</span>{" "}
                        </label>
                        <textarea
                          name=""
                          id=""
                          rows="4"
                          className="form-control"
                          value={formData?.remarks}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              remarks: e.target.value,
                            })
                          }
                        ></textarea>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3 d-flex justify-content-between">
                        <DynamicButton label="SUBMIT" onClick={() => submitHandler("SUBMITTED", null)} className="btn fw-bold btn-primary" />
                      </div>
                    </div>
                  </>
                )}
                {formData?.action_type === "JCC" && (
                  <>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Work Done By</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formDataWdc?.work_done_by}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              work_done_by: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Work Title</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formDataWdc?.work_title}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              work_title: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">JOB Location</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formDataWdc?.job_location}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              job_location: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Yard No</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formDataWdc?.yard_no}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              yard_no: e.target.value,
                            })
                          }
                          onWheel={inputOnWheelPrevent}
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Final total executed value <span className="red">*</span>{" "}
                        </label>
                        <input
                          name="total_amount"
                          type="number"
                          id=""
                          className="form-control"
                          value={formDataWdc?.total_amount}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              total_amount: e.target.value,
                            })
                          }
                          onWheel={inputOnWheelPrevent}
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Guarantee Defect Start Date</label>
                        <DatePicker
                          selected={formDataWdc?.guarantee_defect_liability_start}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              guarantee_defect_liability_start: date,
                            })
                          }
                          dateFormat="dd/MM/yyyy"
                          className="form-control"
                          placeholderText="DD/MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Guarantee Defect End Date</label>
                        <DatePicker
                          selected={formDataWdc?.guarantee_defect_liability_end}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              guarantee_defect_liability_end: date,
                            })
                          }
                          dateFormat="dd/MM/yyyy"
                          className="form-control"
                          placeholderText="DD/MM/YYYY"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Guarantee Defect Liability Status</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formDataWdc?.guarantee_defect_liability_status}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              guarantee_defect_liability_status: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Job Start Date</label>
                        <DatePicker
                          selected={formDataWdc?.jcc_job_start}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              jcc_job_start: date,
                            })
                          }
                          dateFormat="dd/MM/yyyy"
                          className="form-control"
                          placeholderText="DD/MM/YYYY"
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Job Completion Date</label>
                        <DatePicker
                          selected={formDataWdc?.jcc_job_end}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              jcc_job_end: date,
                            })
                          }
                          dateFormat="dd/MM/yyyy"
                          className="form-control"
                          placeholderText="DD/MM/YYYY"
                        />
                      </div>
                    </div>

                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Certifying Authority <span className="red">*</span>{" "}
                        </label>

                        <SearchableSelect
                          options={emp || []}
                          value={formData?.certifying_authority}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              certifying_authority: val?.value || "",
                            })
                          }
                          placeholder="Select Certifying Authority..."
                          isClearable={true}
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Remarks <span className="red">*</span>{" "}
                        </label>
                        <textarea
                          name=""
                          id=""
                          rows="4"
                          className="form-control"
                          value={formDataWdc?.remarks}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              remarks: e.target.value,
                            })
                          }
                        ></textarea>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3 d-flex justify-content-between">
                        <DynamicButton label="SUBMIT" onClick={() => submitHandlerWdc("SUBMITTED", null)} className="btn fw-bold btn-primary" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action WDC JCC by Certifying Authority */}
      {user?.user_type !== USER_VENDOR && (
        <>
          <div className={isSecPopup ? "popup popup_lg active" : "popup popup_lg"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5 pb-3">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">All Data {viewData?.reference_no && `for ${viewData?.reference_no}`}</span>
                </h3>
                <button
                  className="btn fw-bold btn-danger"
                  onClick={() => {
                    setViewData(null);
                    setIsSecPopup(false);
                    setRemarks("");
                    setShowRemarksPopup("");
                  }}
                >
                  Close
                </button>
              </div>
              <form>
                <div className="row">
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Action</label>
                      <p>{viewData?.action_type}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Work Title</label>
                      <p>{viewData?.work_title}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Work Done By</label>
                      <p>{viewData?.work_done_by}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">JOB Location</label>
                      <p>{viewData?.job_location}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Yard No</label>
                      <p>{viewData?.yard_no}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Unit</label>
                      <p>{viewData?.unit}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Inspecttion Note Ref No</label>
                      <p>
                        <span>{viewData?.inspection_note_ref_no}</span>{" "}
                        {viewData?.file_inspection_note_ref_no_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_inspection_note_ref_no_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View
                          </a>
                        ) : viewData?.file_inspection_note_ref_no ? (
                          <a href={formatFilePathWDC(viewData?.file_inspection_note_ref_no)} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Hinderence Report Certified by Berth</label>
                      <p>
                        <span>{viewData?.hinderence_report_cerified_by_berth}</span>{" "}
                        {viewData?.file_hinderence_report_cerified_by_berth_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_hinderence_report_cerified_by_berth_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View
                          </a>
                        ) : viewData?.file_hinderence_report_cerified_by_berth ? (
                          <a href={formatFilePathWDC(viewData?.file_hinderence_report_cerified_by_berth)} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Attendance Report</label>
                      <p>
                        <span>{viewData?.attendance_report}</span>{" "}
                        {viewData?.file_attendance_report_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_attendance_report_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View
                          </a>
                        ) : viewData?.file_attendance_report ? (
                          <a href={formatFilePathWDC(viewData?.file_attendance_report)} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          ""
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Certifying Authority</label>
                      <p>
                        {viewData?.cname || ""} {viewData?.assigned_to ? `(${viewData.assigned_to})` : ""}
                      </p>
                    </div>
                  </div>

                  <table className="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th className="w_50">LI</th>
                        <th className="w_80">Sub-LI</th>
                        <th>Description</th>
                        <th className="w_80">Open Qty</th>
                        <th className="w_80">Unit</th>
                        <th className="w_80">Claim Qty</th>
                        <th className="w_110">Contractual Start</th>
                        <th className="w_110">Contractual End</th>
                        <th className="w_110">Actual Start</th>
                        <th className="w_110">Actual End</th>
                        <th className="w_80">Hinderance Day</th>
                        <th>Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkTypeArr(doForm) &&
                        doForm.map((field, index) => (
                          <Fragment key={index}>
                            <tr>
                              <td>{field?.lineitem}</td>
                              <td>{field?.sublineitem}</td>
                              <td>{field?.description}</td>
                              <td>{field?.open_qty}</td>
                              <td>{field?.unit}</td>
                              <td>{field?.claim_qty}</td>
                              <td>
                                <input
                                  type="date"
                                  value={formatDashedDate(field?.contractual_start)}
                                  onChange={(e) => handleInputChange(e, index, "contractual_start")}
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  value={formatDashedDate(field?.contractual_completion)}
                                  onChange={(e) => handleInputChange(e, index, "contractual_completion")}
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>{field?.actual_start && formatDate(field?.actual_start)}</td>
                              <td>{field?.actual_completion && formatDate(field?.actual_completion)}</td>
                              <td>{field?.hinderance}</td>
                              <td>{doForm[index]?.delay || "0"}</td>
                            </tr>
                          </Fragment>
                        ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td className="p-4 font-bold" colSpan="1">
                          Total Amount
                        </td>
                        <td className="p-4 font-bold">
                          <p>{viewData?.total_amount}</p>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Stage Details</label>
                      <p>{viewData?.stage_details}</p>
                    </div>
                  </div>
                  <table className="table table-bordered table-striped">
                    <thead>
                      <tr>
                        <th>Panelty Type</th>
                        <th>Panelty Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.damage_array.map((damage, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="p-4 align-top">
                            <div className="col-12 col-md-5">
                              <div className="mb-3">
                                <select name="name" id={`name_${index}`} className="form-select" value={damage.name} onChange={(e) => handleDamageChange(index, e)}>
                                  <option value="">Choose Panelty Type</option>
                                  <option value="Safety Violation">Safety Violation</option>
                                  <option value="Cleanliness">Cleanliness</option>
                                  <option value="Hiring Charges">Hiring Charges</option>
                                  <option value="Others">Others</option>
                                </select>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="col-12 col-md-5">
                              <div className="mb-3">
                                <input
                                  type="number"
                                  name="amount"
                                  className="form-control"
                                  value={damage.amount}
                                  onChange={(e) => handleDamageChange(index, e)}
                                  onWheel={inputOnWheelPrevent}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="flex items-center space-x-4 pt-8">
                              {formData.damage_array.length > 1 && <FaMinus className="me-3 cursor-pointer" onClick={() => removeDamageField(index)} />}
                              {index === formData.damage_array.length - 1 && <FaPlus className="cursor-pointer" onClick={addDamageField} />}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }} colSpan="1">
                          Total Amount
                        </td>
                        <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }}>
                          {formData.damage_array.reduce((total, damage) => total + (Number(damage.amount) || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {console.log(formData.status, "jjjjjj")}
                  {status === "DELEGATED" && (
                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Delegated</label>
                        <SearchableSelect
                          options={emp || []}
                          value={formData?.certifying_authority}
                          onChange={(val) => setFormData({ ...formData, certifying_authority: val?.value || "" })}
                          placeholder="Select Delegate..."
                          isClearable={true}
                        />
                      </div>
                    </div>
                  )}
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Remarks</label>
                      <p>{viewData?.remarks}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select className="form-select" onChange={(e) => handleInputChangeOne(e, "status")}>
                        <option value="">Select</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        {!(user?.vendor_code && user.vendor_code === viewData?.delegate_to) && <option value="DELEGATED">Delegated</option>}
                        {user?.vendor_code && viewData?.delegate_to && user.vendor_code === viewData.delegate_to && <option value="RECOMMEND">Recommend</option>}
                      </select>
                    </div>

                    {showRemarksPopup && (
                      <div className="col-12  my-4">
                        <div className="remarks-container">
                          <label htmlFor="remarks">Remarks For Rejection</label>
                          <textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
                        </div>
                      </div>
                    )}

                    {showRemarksDelegatePopup && (
                      <div className="col-12 my-4">
                        <div className="remarks-container">
                          <label htmlFor="delegateRemarks">Remarks For Delegation</label>
                          <textarea id="delegateRemarks" value={delegateRemarks} onChange={(e) => setDelegateRemarks(e.target.value)} required />
                        </div>
                      </div>
                    )}
                    {showRemarksRecommedPopup && (
                      <div className="col-12 my-4">
                        <div className="remarks-container">
                          <label htmlFor="recommendRemarks">Remarks For Recommend</label>
                          <textarea id="recommendRemarks" value={delegateRecommed} onChange={(e) => setDelegateRecommed(e.target.value)} required />
                        </div>
                      </div>
                    )}

                    {viewData?.delegate_to != null && viewData.delegate_to !== "" && (
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Delegated</label>
                          <div className="d-flex align-items-center">
                            <p>
                              {viewData?.delegate_to_name || ""} {viewData?.delegate_to ? `(${viewData.delegate_to})` : ""}
                            </p>
                            {viewData?.remarks2 != null && viewData.remarks2 !== "" && (
                              <div className="icon-container">
                                <BsChatRightText
                                  className="ms-2"
                                  size={25}
                                  style={{ cursor: "pointer", color: "blue" }}
                                  onClick={() => handleShowRemarksPopup(viewData.remarks2)}
                                  aria-label="View reason for delegation"
                                />
                                <div className="tooltip">Reason for Delegated</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {viewData?.status === "RECOMMEND" && (
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Recommend</label>
                          <div className="d-flex align-items-center">
                            {viewData?.remarks3 != null && viewData.remarks3 !== "" && (
                              <div className="icon-container">
                                <BsChatRightText
                                  className="ms-2"
                                  size={25}
                                  style={{ cursor: "pointer", color: "blue" }}
                                  onClick={() => handleShowRemarksPopup(viewData.remarks3)}
                                  aria-label="View reason for delegation"
                                />
                                <div className="tooltip">Reason for Delegated</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <DynamicButton label="SUBMIT" onClick={() => submitHandlerAction(status, null)} className="btn fw-bold btn-primary" />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Action JCC Popup */}
          <div className={isSecjccActionPopup ? "popup popup_lg active" : "popup popup_lg"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5 pb-3">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">All Data {viewData?.reference_no && `for ${viewData?.reference_no}`}</span>
                </h3>
                <button
                  className="btn fw-bold btn-danger"
                  onClick={() => {
                    setViewData(null);
                    setIsjccActionSecPopup(false);
                    setShowRemarksPopupjcc(false);
                    setRemarks("");
                  }}
                >
                  Close
                </button>
              </div>
              <form>
                <div className="row">
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Action</label>
                      <p>{viewData?.action_type}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Work Title</label>
                      <p>{viewData?.work_title}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Work Done By</label>
                      <p>{viewData?.work_done_by}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">JOB Location</label>
                      <p>{viewData?.job_location}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Yard No</label>
                      <p>{viewData?.yard_no}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Final total executed value</label>
                      <p>{viewData?.total_amount}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Guarantee Defect Start Date</label>
                      <p> {viewData?.guarantee_defect_liability_start && formatDate(viewData?.guarantee_defect_liability_start * 1000)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Guarantee Defect End Date</label>
                      <p> {viewData?.guarantee_defect_liability_end && formatDate(viewData?.guarantee_defect_liability_end * 1000)}</p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Job Start Date</label>
                      <p> {viewData?.jcc_job_start && formatDate(viewData?.jcc_job_start * 1000)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Job Completion Date</label>
                      <p> {viewData?.jcc_job_end && formatDate(viewData?.jcc_job_end * 1000)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Certifying Authority</label>
                      <p>
                        {viewData?.assigned_to_name} ({viewData?.assigned_to})
                      </p>
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Remarks</label>
                      <p>{viewData?.remarks}</p>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Status</label>
                        <select className="form-select" onChange={(e) => handleInputChangeOnejcc(e, "statusjcc")}>
                          <option value="">Select</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>

                      {showRemarksPopupjcc && (
                        <div className="col-12  my-4">
                          <div className="remarks-container">
                            <label htmlFor="remarks">Remarks For Rejection</label>
                            <textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
                          </div>
                        </div>
                      )}

                      <DynamicButton
                        label="SUBMIT"
                        onClick={() =>
                          statusjcc === "APPROVED" ? submitHandlerActionJcc("APPROVED", null) : showRemarksPopupjcc ? submitHandlerActionJcc("REJECTED", null) : null
                        }
                        className="btn fw-bold btn-primary"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* View WDC */}
      <div className={isPopupView ? "popup popup_lg active" : "popup popup_lg"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5 pb-3">
            <h3 className="card-title align-items-start flex-column">
              <div className="d-flex flex-column">
                <img src={logo} alt="HSL Logo" style={{ width: "100px", marginRight: "10px" }} />
                <div className="d-flex">
                  <span className="card-label fw-bold fs-3 mb-1">Garden Reach Shipbuilders & Engineers (HSL)</span>
                  <span className="ms-3 fw-bold fs-3">
                    Supplier: {viewData?.vendor_name || "N/A"} ({viewData?.vendor_code || "N/A"})
                  </span>
                </div>

                <div className="d-flex">
                  <span className="ms-3 fw-bold fs-3"> WDC No.: {viewData?.reference_no && `${viewData?.reference_no}`}</span>
                  &ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;
                  <span className="card-label fw-bold fs-3 mb-1">Date: {viewData?.created_at && formatDate(viewData?.created_at)}</span>
                </div>
              </div>
            </h3>
            <div>
              <button className="btn fw-bold btn-success me-2" onClick={handleDownload}>
                Download
              </button>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setViewData(null);
                  setIsPopupView(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
          <form>
            <div className="row">
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Action</label>
                  <p>{viewData?.action_type}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Work Title</label>
                  <p>{viewData?.work_title}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Work Done By</label>
                  <p>{viewData?.work_done_by}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">JOB Location</label>
                  <p>{viewData?.job_location}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <p>{viewData?.yard_no}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Unit</label>
                  <p>{viewData?.unit}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Inspecttion Note Ref No</label>
                  <p>
                    <span>{viewData?.inspection_note_ref_no}</span>{" "}
                    {viewData?.file_inspection_note_ref_no_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_inspection_note_ref_no_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View
                      </a>
                    ) : viewData?.file_inspection_note_ref_no ? (
                      <a href={formatFilePathWDC(viewData?.file_inspection_note_ref_no)} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Hinderence Report Certified by Berth</label>
                  <p>
                    <span>{viewData?.hinderence_report_cerified_by_berth}</span>{" "}
                    {viewData?.file_hinderence_report_cerified_by_berth_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_hinderence_report_cerified_by_berth_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View
                      </a>
                    ) : viewData?.file_hinderence_report_cerified_by_berth ? (
                      <a href={formatFilePathWDC(viewData?.file_hinderence_report_cerified_by_berth)} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Attendance Report</label>
                  <p>
                    <span>{viewData?.attendance_report}</span>{" "}
                    {viewData?.file_attendance_report_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_attendance_report_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View
                      </a>
                    ) : viewData?.file_attendance_report ? (
                      <a href={formatFilePathWDC(viewData?.file_attendance_report)} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      ""
                    )}
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Certifying Authority</label>
                  <p>
                    {viewData?.assigned_to || ""} {viewData?.assigned_to_name ? `(${viewData.assigned_to_name})` : ""}
                  </p>
                </div>
              </div>

              <table className="table table-bordered table-striped">
                <thead>
                  <tr>
                    <th>LineItem</th>
                    <th>Sub LineItem</th>
                    <th>Description</th>
                    <th>Open Quantity</th>
                    <th>Claim Quantity</th>
                    <th>Contractual Start</th>
                    <th>Contractual Completion</th>
                    <th>Actual Start</th>
                    <th>Actual Completion</th>
                    <th>Hinderance in Days</th>
                    {(viewData?.status === "APPROVED" || viewData?.status === "REJECTED") && <th>Delay</th>}
                  </tr>
                </thead>
                <tbody>
                  {checkTypeArr(viewData?.item) &&
                    viewData?.item.map((field, index) => (
                      <Fragment key={index}>
                        <tr>
                          <td>{field?.lineitem}</td>
                          <td>{field?.sublineitem}</td>
                          <td>{field?.description}</td>
                          <td>
                            {field?.open_qty} {field?.unit}
                          </td>
                          <td>
                            {field?.claim_qty} {field?.unit}
                          </td>
                          <td>{field?.actual_start && formatDate(field?.contractual_start)}</td>
                          <td>{field?.actual_completion && formatDate(field?.contractual_completion)}</td>
                          <td>{field?.actual_start && formatDate(field?.actual_start)}</td>
                          <td>{field?.actual_completion && formatDate(field?.actual_completion)}</td>
                          <td>{field?.hinderance}</td>
                          {(viewData?.status === "APPROVED" || viewData?.status === "REJECTED") && <td>{field?.delay}</td>}
                        </tr>
                      </Fragment>
                    ))}
                </tbody>

                <tfoot>
                  <tr className="border-t border-gray-200">
                    <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }} colSpan="1">
                      Total Amount
                    </td>
                    <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }}>{viewData?.total_amount}</td>
                  </tr>
                </tfoot>
              </table>
              {penaltyDetails.length > 0 && penaltyDetails.reduce((total, field) => total + (Number(field.amount) || 0), 0) > 0 ? (
                <table className="table table-bordered table-striped" style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }}>Penalty Type</th>
                      <th style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }}>Penalty Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {penaltyDetails.map((field, index) => (
                      <Fragment key={index}>
                        {console.log(field, "ram")} {/* Debug log retained */}
                        <tr>
                          <td style={{ textAlign: "left", padding: "12px", border: "1px solid #dee2e6" }}>{field.name}</td>
                          <td style={{ textAlign: "left", padding: "12px", border: "1px solid #dee2e6" }}>{field.amount}</td>
                        </tr>
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }} colSpan="1">
                        Total Amount
                      </td>
                      <td style={{ textAlign: "left", padding: "12px", fontWeight: "bold", border: "1px solid #dee2e6" }}>
                        {penaltyDetails.reduce((total, field) => total + (Number(field.amount) || 0), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : null}

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Stage Details</label>
                  <p>{viewData?.stage_details}</p>
                </div>
              </div>

              {viewData?.delegate_to != null && viewData.delegate_to !== "" && (
                <div className="col-12 col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Delegated</label>
                    <div className="d-flex align-items-center">
                      <p>
                        {viewData?.delegate_to_name || ""} {viewData?.delegate_to ? `(${viewData.delegate_to})` : ""}
                      </p>
                      {viewData?.remarks2 != null && viewData.remarks2 !== "" && (
                        <div className="icon-container">
                          <BsChatRightText
                            className="ms-2"
                            size={25}
                            style={{ cursor: "pointer", color: "blue" }}
                            onClick={() => handleShowRemarksPopup(viewData.remarks2)}
                            aria-label="View reason for delegation"
                          />
                          <div className="tooltip">Reason for Delegated</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {viewData?.status === "RECOMMEND" && (
                <div className="col-12 col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Recommend</label>
                    <div className="d-flex align-items-center">
                      {viewData?.remarks3 != null && viewData.remarks3 !== "" && (
                        <div className="icon-container">
                          <BsChatRightText
                            className="ms-2"
                            size={25}
                            style={{ cursor: "pointer", color: "blue" }}
                            onClick={() => handleShowRemarksPopup(viewData.remarks3)}
                            aria-label="View reason for delegation"
                          />
                          <div className="tooltip">Reason for Delegated</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <p>{viewData?.remarks}</p>
                </div>
              </div>
              <small className="text-muted" style={{ fontSize: "16px" }}>
                This is a system-generated document and does not require a signature.
              </small>
            </div>
          </form>
        </div>
      </div>
      {isRemarksPopupOpen && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
            padding: "30px",
            zIndex: 1000,
            borderRadius: "8px",
            width: "380px",
            maxWidth: "90%",
          }}
        >
          <h4>Reason for Delegation</h4>
          <p>{currentRemarks}</p>
          <button
            className="btn btn-danger"
            onClick={handleCloseRemarksPopup}
            style={{
              marginTop: "10px",
              fontSize: "14px",
              padding: "5px 10px",
            }}
          >
            Close
          </button>
        </div>
      )}
      {/* // jcc popup*/}
      <div className={isPopupJccView ? "popup popup_lg active" : "popup popup_lg"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5 pb-3">
            <h3 className="card-title d-flex align-items-center">
              <img src={logo} alt="HSL Logo" style={{ width: "100px", marginRight: "10px" }} />

              <div className="d-flex flex-column">
                <div className="d-flex">
                  <span className="card-label fw-bold fs-3 mb-1">Garden Reach Shipbuilders & Engineers (HSL)</span>
                  <span className="ms-3 fw-bold fs-3">
                    Supplier: {viewData?.vendor_name || "N/A"} ({viewData?.vendor_code || "N/A"})
                  </span>
                </div>

                <div className="d-flex">
                  <span className="ms-3 fw-bold fs-3">JCC No.: {viewData?.reference_no && ` ${viewData?.reference_no}`}</span>
                  &ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;&ensp;
                  <span className="card-label fw-bold fs-3 mb-1">Date: {viewData?.created_at && formatDate(viewData?.created_at)}</span>
                </div>
              </div>
            </h3>

            <div>
              <button className="btn fw-bold btn-success me-2" onClick={handleDownloadJccView}>
                Download
              </button>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setViewData(null);
                  setIsPopupJccView(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
          <form>
            <div className="row">
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Action</label>
                  <p>{viewData?.action_type}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Work Title</label>
                  <p>{viewData?.work_title}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Work Done By</label>
                  <p>{viewData?.work_done_by}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">JOB Location</label>
                  <p>{viewData?.job_location}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Yard No</label>
                  <p>{viewData?.yard_no}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Final Total Executed Value</label>
                  <p>{viewData?.total_amount}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Guarantee Defect Start Date</label>
                  <p> {viewData?.guarantee_defect_liability_start && formatEpochToDate(viewData?.guarantee_defect_liability_start)}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Guarantee Defect End Date</label>

                  <p> {viewData?.guarantee_defect_liability_end && formatEpochToDate(viewData?.guarantee_defect_liability_end)}</p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Job Start Date</label>

                  <p> {viewData?.jcc_job_start && formatEpochToDate(viewData?.jcc_job_start)}</p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Job Completion Date</label>

                  <p> {viewData?.jcc_job_end && formatEpochToDate(viewData?.jcc_job_end)}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Certifying Authority</label>
                  <p>
                    {viewData?.assigned_to_name || ""} {viewData?.assigned_to ? `(${viewData.assigned_to})` : ""}
                  </p>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <p>{viewData?.remarks}</p>
                </div>
              </div>
              <small className="text-muted" style={{ fontSize: "16px" }}>
                This is a system-generated document and does not require a signature.
              </small>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default WDCSub;
