import React, { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import Select from "react-select";
import { toast } from "react-toastify";
import { reConfirm } from "../utils/reConfirm";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calDatesDiff, convertToEpoch, formatDate, formatEpochToDate, formatFilePath, formatFilePathWDC } from "../utils/getDateTimeNow";
import { clrLegend } from "../utils/clrLegend";
import { checkTypeArr } from "../utils/smallFun";
import { USER_PPNC_DEPARTMENT, USER_VENDOR } from "../constants/userConstants";
import { APPROVED, REJECTED, SUBMITTED } from "../constants/BGconstants";
import { groupedByRefNo } from "../utils/groupedByReq";
import { inputOnWheelPrevent } from "../utils/inputOnWheelPrevent";
import { FaPlus } from "react-icons/fa";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import { wdcLines } from "../data/btnData";

const WDCSub = () => {
  const { id } = useParams();
  const { user, token } = useSelector((state) => state.auth);
  let line_item_fields = {
    claim_qty: "",
    line_item_no: "",
    contractual_start_date: "",
    Contractual_completion_date: "",
    actual_start_date: "",
    actual_completion_date: "",
    hinderance_in_days: "",
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
  };

  //wdc*****************************************************************************************************************

  // let line_item_fieldswdc = {
  //   claim_qty: "",
  //   line_item_no: "",
  //   actual_start_date: "",
  //   actual_completion_date: "",
  //   delay_in_work_execution: "",
  // };

  let initialFormDatawdc = {
    action_type: "",
    remarks: "",
    job_location: "",
    yard_no: "",
    status: "",
    work_title: "",
    work_done_by: "",
    total_amount: "",
    guarantee_defect_liability_start_date: "",
    guarantee_defect_liability_end_date: "",
    jcc_job_start_date: "",
    jcc_job_end_date: "",
  };

  const [isPopup, setIsPopup] = useState(false);
  const [isPopupView, setIsPopupView] = useState(false);
  const [isPopupJccView, setIsPopupJccView] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const [isSecjccActionPopup, setIsjccActionSecPopup] = useState(false);
  const [allData, setAllData] = useState([]);
  const [lineItemData, setLineItemData] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const [viewData, setViewData] = useState(null);
  const [emp, setEmp] = useState(null);
  const [doForm, setDoForm] = useState(() => {
    return (
      viewData?.line_item_array?.map(() => ({
        contractual_start_date: "",
        Contractual_completion_date: "",
        status: "",
        delay: 0,
      })) || []
    );
  });
  const [status, setStatus] = useState("");
  const [statusjcc, setStatusjcc] = useState("");
  const [showRemarksPopup, setShowRemarksPopup] = useState(false);
  const [showRemarksPopupjcc, setShowRemarksPopupjcc] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [doFormJcc, setDoFormJcc] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([line_item_fields]);
  // const [dynamicFieldsWdc, setDynamicFieldsWdc] = useState([line_item_fieldswdc]);
  const [lineItems, setLineItems] = useState(wdcLines);
  const [formData, setFormData] = useState(initialFormData);
  const [formDataWdc, setFormDataWdc] = useState(initialFormDatawdc);

  const fileoneInputRef = useRef(null);
  const filetwoInputRef = useRef(null);
  const filethreeInputRef = useRef(null);

  console.log("viewData", viewData);

  const handleInputChange = (e, index, fieldName) => {
    const { value } = e.target;
    const updatedForm = [...doForm];

    updatedForm[index] = {
      ...updatedForm[index],
      [fieldName]: value,
    };

    // If the fieldName is related to dates, recalculate the delay
    if (fieldName === "contractual_start_date" || fieldName === "Contractual_completion_date" || fieldName === "actual_completion_date") {
      const contractualCompletionDateStr = updatedForm[index]?.Contractual_completion_date;
      const actualCompletionDateStr = viewData.line_item_array[index]?.actual_completion_date;
      const hinderanceDays = parseInt(viewData.line_item_array[index]?.hinderance_in_days) || 0;

      if (contractualCompletionDateStr && actualCompletionDateStr) {
        const contractualCompletionDate = new Date(contractualCompletionDateStr);
        const actualCompletionDate = new Date(actualCompletionDateStr);

        // Reset time components to midnight to avoid issues
        contractualCompletionDate.setHours(0, 0, 0, 0);
        actualCompletionDate.setHours(0, 0, 0, 0);

        // Calculate the delay in days
        const timeDiff = actualCompletionDate - contractualCompletionDate;
        const delayDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)); // Days between the two dates

        // Adjust delay by subtracting hinderance days
        const delay = delayDays - hinderanceDays;
        updatedForm[index].delay = delay > 0 ? delay : 0; // Ensure delay is not negative
      }
    }

    setDoForm(updatedForm);
  };

  const handleInputChangeOne = (e, fieldName) => {
    const value = e.target.value;
    setStatus(value);

    if (value === "REJECTED") {
      setShowRemarksPopup(true);
    } else {
      setShowRemarksPopup(false);
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

  const handleInputChangejcc = (e, index, field) => {
    const updatedForm = { ...doFormJcc };
    if (!updatedForm[index]) {
      updatedForm[index] = {};
    }
    updatedForm[index][field] = e.target.value;
    setDoFormJcc(updatedForm);
  };

  const getData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiCallBack("GET", `po/wdc/wdcList?poNo=${id}`, null, token);
      if (data?.status) {
        setAllData(JSON.parse(data?.data));
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching WDC/JCC list:", error);
      setIsLoading(false);
    }
  }, [id, token]);

  const getPOLineItemData = useCallback(async () => {
    try {
      const data = await apiCallBack("GET", `po/details?id=${id}`, null, token);
      if (data?.status) {
        let lineItem = data?.data[0]?.materialResult;
        setLineItemData(lineItem);
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
      // Copy the current form data to avoid direct mutations
      const formDataCopy = { ...formData };

      // Log the initial form data to verify its content
      console.log("Initial Form Data:", formDataCopy);

      // Validate if all required fields are filled
      if (formDataCopy.certifying_authority && formDataCopy.action_type && formDataCopy.remarks && formDataCopy.line_item_array && formDataCopy.line_item_array.length > 0) {
        let isValid = true; // Initialize validation flag

        // Iterate over each line item for validation
        formDataCopy.line_item_array.forEach((item, index) => {
          console.log(`Validating line item ${index + 1}:`, item);

          // Convert fields to strings if they are not strings already
          const lineItemNo = item.line_item_no ? item.line_item_no.toString().trim() : "";
          const claimQty = item.claim_qty ? item.claim_qty.toString().trim() : "";
          const actualStartDate = item.actual_start_date ? item.actual_start_date.toString().trim() : "";
          const actualCompletionDate = item.actual_completion_date ? item.actual_completion_date.toString().trim() : "";
          const hinderanceInDays = item.hinderance_in_days !== null && item.hinderance_in_days !== undefined ? item.hinderance_in_days.toString().trim() : "";

          // Perform validation checks for each required field
          if (!lineItemNo) {
            toast.warn(`PO Line Item is required for item ${index + 1}`);
            isValid = false;
          }

          if (!claimQty || isNaN(claimQty) || parseFloat(claimQty) <= 0) {
            toast.warn(`Claim Quantity is required and should be a positive number for item ${index + 1}`);
            isValid = false;
          }

          if (!actualStartDate) {
            toast.warn(`Actual Start Date is required for item ${index + 1}`);
            isValid = false;
          }

          if (!actualCompletionDate) {
            toast.warn(`Actual Completion Date is required for item ${index + 1}`);
            isValid = false;
          }

          if (hinderanceInDays === "" || isNaN(hinderanceInDays) || parseInt(hinderanceInDays) < 0) {
            toast.warn(`Hinderance in Days is required and should be a non-negative number for item ${index + 1}`);
            isValid = false;
          }
        });

        // If validation fails, log the error and return early
        if (!isValid) {
          console.log("Validation failed. Exiting submitHandler.");
          return;
        }

        console.log("All validations passed. Proceeding with API call...");

        // Create a FormData object to prepare data for the API call
        const fD = new FormData();

        // Append fields to FormData
        fD.append("action_type", formDataCopy.action_type);
        fD.append("purchasing_doc_no", id); // Make sure 'ref_no' is defined correctly
        fD.append("remarks", formDataCopy.remarks);
        fD.append("status", flag);
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
        fD.append("line_item_array", JSON.stringify(formDataCopy.line_item_array));

        // Make the API call using the FormData object
        const res = await apiCallBack("POST", "po/wdc/submitWdc", fD, token);

        // Handle the API response
        if (res.status) {
          toast.success(res.message);
          setIsPopup(false);
          setIsSecPopup(false);
          setFormData(initialFormData); // Reset form data to initial state
          setDynamicFields([line_item_fields]); // Reset dynamic fields
          getData(); // Refresh or fetch updated data
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

        console.log("All validations passed. Proceeding with API call...");

        // Prepare form data for API call
        const formDataToSend = new FormData();
        formDataToSend.append("action_type", formDataCopy.action_type);
        formDataToSend.append("purchasing_doc_no", id);
        formDataToSend.append("remarks", formDataWdcCopy.remarks);
        formDataToSend.append("status", flag);
        formDataToSend.append("work_done_by", formDataWdcCopy.work_done_by);
        formDataToSend.append("work_title", formDataWdcCopy.work_title);
        formDataToSend.append("job_location", formDataWdcCopy.job_location);
        formDataToSend.append("yard_no", formDataWdcCopy.yard_no);
        formDataToSend.append("assigned_to", formDataCopy.certifying_authority);
        formDataToSend.append("total_amount", formDataWdcCopy.total_amount);
        formDataToSend.append("guarantee_defect_liability_start_date", convertToEpoch(formDataWdcCopy.guarantee_defect_liability_start_date));
        formDataToSend.append("guarantee_defect_liability_end_date", convertToEpoch(formDataWdcCopy.guarantee_defect_liability_end_date));
        formDataToSend.append("jcc_job_start_date", convertToEpoch(formDataWdcCopy.jcc_job_start_date));
        formDataToSend.append("jcc_job_end_date", convertToEpoch(formDataWdcCopy.jcc_job_end_date));

        // Perform API call
        const res = await apiCallBack("POST", "po/wdc/submitWdc", formDataToSend, token);

        // Handle response
        if (res.status) {
          toast.success(res.message);
          setIsPopup(false);
          setIsSecPopup(false);
          setFormData(initialFormData);
          setFormDataWdc(initialFormDatawdc);
          // setDynamicFieldsWdc([line_item_fieldswdc]);
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

  const submitHandlerAction = async (flag, reference_no) => {
    try {
      const fD = new FormData();

      fD.append("purchasing_doc_no", viewData?.purchasing_doc_no || "");
      fD.append("reference_no", reference_no || viewData.reference_no || "");
      fD.append("status", flag);

      // Ensure remarks are provided when rejecting
      if (flag === "REJECTED" && !remarks) {
        toast.warn("Remarks are required for rejection.");
        return;
      }

      const newErrors = [];

      // Validate each line item in doForm
      viewData.line_item_array.forEach((item, index) => {
        const doItem = doForm[index];

        if (!doItem?.contractual_start_date) {
          newErrors.push(`Contractual Start Date is required for item ${index + 1}`);
        }

        if (!doItem?.Contractual_completion_date) {
          newErrors.push(`Contractual Completion Date is required for item ${index + 1}`);
        } else if (new Date(doItem.Contractual_completion_date) < new Date(doItem.contractual_start_date)) {
          newErrors.push(`Contractual Completion Date cannot be earlier than Contractual Start Date for item ${index + 1}`);
        }
      });

      if (newErrors.length > 0) {
        newErrors.forEach((error) => toast.warn(error));
        return;
      }

      const lineItemArray = viewData.line_item_array.map((item, index) => {
        let delay = 0;

        const contractualCompletionDateStr = doForm[index]?.Contractual_completion_date;
        const actualCompletionDateStr = item.actual_completion_date;
        const hinderanceDays = parseInt(item.hinderance_in_days) || 0;

        if (contractualCompletionDateStr && actualCompletionDateStr) {
          const contractualCompletionDate = new Date(contractualCompletionDateStr);
          const actualCompletionDate = new Date(actualCompletionDateStr);

          contractualCompletionDate.setHours(0, 0, 0, 0);
          actualCompletionDate.setHours(0, 0, 0, 0);

          const timeDiff = actualCompletionDate - contractualCompletionDate;
          const delayDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

          delay = delayDays - hinderanceDays;
        }

        return {
          contractual_start_date: doForm[index]?.contractual_start_date || "",
          Contractual_completion_date: doForm[index]?.Contractual_completion_date || "",

          delay: delay > 0 ? delay : 0,
          line_item_no: item.line_item_no || "",
        };
      });

      fD.append("line_item_array", JSON.stringify(lineItemArray));
      if (flag === "REJECTED") fD.append("remarks", remarks);

      const res = await apiCallBack("POST", "po/wdc/submitWdc", fD, token);

      if (res.status) {
        toast.success(res.message);
        setIsPopup(false);
        setIsSecPopup(false);
        setFormData(initialFormData);
        setRemarks(""); // Reset remarks

        setDoForm(
          viewData?.line_item_array?.map(() => ({
            contractual_start_date: "",
            Contractual_completion_date: "",
            status: "",
            delay: 0,
          })) || []
        );

        getData();
      } else {
        toast.warn(res.message);
      }
    } catch (error) {
      toast.error("Error uploading file: " + error.message);
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

      const res = await apiCallBack("POST", "po/wdc/submitWdc", fD, token);

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

  const getAvailableAmount = async (item) => {
    try {
      const res = await apiCallBack("GET", `po/demandeManagement/getRestAmount?po_no=${id}&line_item_no=${item}`, null, token);
      if (res?.status) {
        return {
          description: res?.data?.description,
          rest_amount: res?.data?.rest_amount,
          unit: res?.data?.unit,
          rest_amount_wdc: res?.data?.rest_amount_wdc,
        };
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
      return null;
    }
  };

  // const getAvailableAmountWdc = async (item) => {
  //   try {
  //     const res = await apiCallBack("GET", `po/demandeManagement/getRestAmount?po_no=${id}&line_item_no=${item}`, null, token);
  //     if (res?.status) {
  //       return {
  //         description: res?.data?.description,
  //         rest_amount: res?.data?.rest_amount,
  //         unit: res?.data?.unit,
  //         matarial_code: res?.data?.matarial_code,
  //         target_amount: res?.data?.target_amount,
  //         po_rate: res?.data?.po_rate,
  //         rest_amount_wdc: res?.data?.rest_amount_wdc,
  //       };
  //     }
  //   } catch (error) {
  //     console.error("Error fetching WDC list:", error);
  //     return null;
  //   }
  // };

  const handleFieldChange = async (index, fieldName, value) => {
    const updatedFields = [...dynamicFields];

    if (fieldName === "line_item_no") {
      const lineItemNo = value;

      try {
        const getRestData = await getAvailableAmount(lineItemNo);

        updatedFields[index] = {
          ...updatedFields[index],
          line_item_no: lineItemNo,
          description: getRestData?.description || "",
          rest_amount: getRestData?.rest_amount || "",
          unit: getRestData?.unit || "",
          rest_amount_wdc: getRestData?.rest_amount_wdc,
          claim_qty: "",
        };
      } catch (error) {
        console.error("Error fetching available amount:", error);
      }
    } else if (fieldName === "claim_qty") {
      const claimQty = parseFloat(value) || 0;
      const openQty = parseFloat(updatedFields[index].rest_amount_wdc) || 0;

      console.log(claimQty, "claimQty");
      console.log(openQty, "openQty");

      // Check if Claim Quantity is greater than Open Quantity
      if (claimQty > openQty) {
        return toast.warn("Claim Quantity should be less than or equal to Open Quantity.");
      }

      updatedFields[index] = { ...updatedFields[index], claim_qty: value };
    } else {
      updatedFields[index] = { ...updatedFields[index], [fieldName]: value };
    }

    // Update the state with the modified dynamic fields
    setDynamicFields(updatedFields);
    setFormData((prevFormData) => ({
      ...prevFormData,
      line_item_array: updatedFields,
    }));

    // Log the updated state for debugging
    console.log("Updated Fields:", updatedFields);
  };

  // const handleFieldChangeWdc = async (index, fieldName, value) => {
  //   const updatedFields = [...dynamicFieldsWdc];
  //   updatedFields[index][fieldName] = value;

  //   if (fieldName === "line_item_no") {
  //     const lineItemNo = value;
  //     try {
  //       // Mock API function to get available amount, replace with your API call
  //       const getRestData = await getAvailableAmountWdc(lineItemNo);

  //       updatedFields[index] = {
  //         ...updatedFields[index],
  //         description: getRestData?.description || "",
  //         rest_amount: getRestData?.rest_amount || "",
  //         unit: getRestData?.unit || "",
  //         matarial_code: getRestData?.matarial_code || "",
  //         target_amount: getRestData?.target_amount || "",
  //         po_rate: getRestData?.po_rate || "",
  //         rest_amount_wdc: getRestData?.rest_amount_wdc,
  //         claim_qty: "",
  //       };
  //     } catch (error) {
  //       console.error("Error fetching available amount:", error);
  //     }
  //   } else if (fieldName === "claim_qty") {
  //     const claimQty = parseFloat(value) || 0;
  //     const openQty = parseFloat(updatedFields[index].rest_amount_wdc) || 0;

  //     if (claimQty > openQty) {
  //       alert("Claim Quantity should be less than or equal to Open Quantity.");
  //       updatedFields[index].claim_qty = "";
  //     } else {
  //       updatedFields[index].claim_qty = value;
  //     }
  //   }

  //   setDynamicFieldsWdc(updatedFields);
  //   setFormDataWdc((prevFormData) => ({
  //     ...prevFormData,
  //     line_item_array: updatedFields,
  //   }));
  // };

  const handleDateChange = (index, fieldName, date) => {
    const updatedFields = [...dynamicFields];
    updatedFields[index][fieldName] = date;
    setDynamicFields(updatedFields);
  };
  // const handleDateChangeWdc = (index, fieldName, date) => {
  //   const updatedFields = [...dynamicFieldsWdc];
  //   updatedFields[index][fieldName] = date;
  //   setDynamicFieldsWdc(updatedFields);
  // };
  const handleClosePopup = () => {
    setFormData(initialFormData);
    setFormDataWdc(initialFormDatawdc);
    setDynamicFields([line_item_fields]);
    // setDynamicFieldsWdc([line_item_fieldswdc]);
    setIsPopup(false);
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
                                  {/* <th className="min-w-150px">Reference No</th> */}
                                  <th>Action Type</th>
                                  <th className="min-w-150px">DateTime </th>
                                  <th className="min-w-150px">Action By</th>
                                  {/* <th className="min-w-150px">Date</th> */}
                                  <th>PO LineItem</th>
                                  <th className="min-w-150px">Status</th>
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
                                          <tr>
                                            <td colSpan={19}>
                                              <b>{it}</b>
                                            </td>
                                          </tr>
                                          {checkTypeArr(items) &&
                                            items.map((item, index) => (
                                              <tr key={index}>
                                                <td>{item?.action_type}</td>

                                                <td>{item?.created_at && formatDate(item?.created_at)}</td>
                                                <td>{item.created_by_id}</td>
                                                <td>{item?.line_item_array && item?.line_item_array.map((lineItem) => lineItem?.line_item_no).join(", ")}</td>
                                                <td className={`${clrLegend(item?.status)} bold`}>{item?.status}</td>
                                                <td className="d-flex">
                                                  {item?.action_type === "WDC" && (
                                                    <button
                                                      onClick={() => {
                                                        setViewData(item);
                                                        setIsPopupView(true);
                                                      }}
                                                      className="btn btn-sm fw-bold btn-secondary m-1"
                                                      type="button"
                                                    >
                                                      View
                                                    </button>
                                                  )}
                                                  {item?.action_type === "JCC" && (
                                                    <button
                                                      onClick={() => {
                                                        setViewData(item);
                                                        setIsPopupJccView(true);
                                                      }}
                                                      className="btn btn-sm fw-bold btn-secondary m-1"
                                                      type="button"
                                                    >
                                                      View
                                                    </button>
                                                  )}

                                                  {item.status === "SUBMITTED" && user.vendor_code === item.assigned_to && (
                                                    <>
                                                      {item?.action_type === "WDC" && (
                                                        <button
                                                          onClick={() => {
                                                            setViewData(item);
                                                            setIsSecPopup(true);
                                                          }}
                                                          className="btn btn-sm fw-bold btn-primary m-1"
                                                          type="button"
                                                        >
                                                          Action
                                                        </button>
                                                      )}
                                                      {item?.action_type === "JCC" && (
                                                        <button
                                                          onClick={() => {
                                                            setViewData(item);
                                                            setIsjccActionSecPopup(true);
                                                          }}
                                                          className="btn btn-sm fw-bold btn-primary m-1"
                                                          type="button"
                                                        >
                                                          Action
                                                        </button>
                                                      )}
                                                    </>
                                                  )}
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
                        <input
                          type="text"
                          className="form-control"
                          value={formData?.unit}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              unit: e.target.value,
                            })
                          }
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
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Inspection Note Ref. No.</label>
                        <div className="d-flex">
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
                        <label className="form-label">Hinderence report cerified By Berth. </label>
                        <div className="d-flex">
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
                        <label className="form-label">Attendance Report</label>
                        <div className="d-flex">
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
                        />
                      </div>
                    </div>

                    <table className="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>PO LineItem</th>
                          <th>PO SublineItem</th>
                          <th>Description</th>
                          <th>Open Quantity</th>
                          <th>Claim Quantity</th>
                          <th>Actual Start</th>
                          <th>Actual Completion</th>
                          <th>Hinderance in Days</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((field, index) => (
                          <Fragment key={index}>
                            <tr>
                              <td>
                                <select
                                  name={`line_item_${index}`}
                                  id={`line_item_${index}`}
                                  className="form-select"
                                  value={field.lineitem}
                                  onChange={(e) => {
                                    handleFieldChange(index, "lineitem", e.target.value);
                                  }}
                                >
                                  <option value="">Choose PO Line Item</option>
                                  {checkTypeArr(lineItemData) &&
                                    lineItemData.map((item, i) => (
                                      <option value={item?.material_item_number} key={i}>
                                        {item?.material_item_number}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  name={`line_item_${index}`}
                                  id={`line_item_${index}`}
                                  className="form-select"
                                  value={field.line_item_no}
                                  onChange={(e) => {
                                    handleFieldChange(index, "line_item_no", e.target.value);
                                  }}
                                >
                                  <option value="">Choose Sublineitem</option>
                                  {checkTypeArr(lineItemData) &&
                                    lineItemData.map((item, i) => (
                                      <option value={item?.material_item_number} key={i}>
                                        {item?.material_item_number}
                                      </option>
                                    ))}
                                </select>
                              </td>
                              <td>{field.description}</td>
                              <td>
                                {field.rest_amount_wdc} {field.unit}
                              </td>
                              <td>
                                <input type="text" value={dynamicFields[index].claim_qty || ""} onChange={(e) => handleFieldChange(index, "claim_qty", e.target.value)} />
                              </td>
                              <td>
                                {" "}
                                <DatePicker
                                  selected={field.actual_start_date}
                                  onChange={(date) => handleDateChange(index, "actual_start_date", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>
                                <DatePicker
                                  selected={field.actual_completion_date}
                                  onChange={(date) => handleDateChange(index, "actual_completion_date", date)}
                                  dateFormat="dd/MM/yyyy"
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={field.hinderance_in_days}
                                  onChange={(e) => handleFieldChange(index, "hinderance_in_days", e.target.value)}
                                />
                              </td>
                              <td>{index === dynamicFields.length - 1 && <FaPlus onClick={() => setDynamicFields([...dynamicFields, line_item_fields])} />}</td>
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
                          <Select
                            className="basic-single"
                            classNamePrefix="select"
                            isClearable={true}
                            isSearchable={true}
                            name="emp"
                            id="emp"
                            options={emp}
                            value={emp && emp.filter((item) => item.value === formData?.certifying_authority)[0]}
                            onChange={(val) =>
                              setFormData({
                                ...formData,
                                certifying_authority: val?.value || "",
                              })
                            }
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
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">
                          Final totoal executed value <span className="red">*</span>{" "}
                        </label>
                        <input
                          name=""
                          type="number"
                          id=""
                          rows="4"
                          className="form-control"
                          value={formDataWdc?.total_amount}
                          onChange={(e) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              total_amount: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-12 col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Guarantee Defect Start Date</label>
                        <DatePicker
                          selected={formDataWdc?.guarantee_defect_liability_start_date}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              guarantee_defect_liability_start_date: date,
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
                          selected={formDataWdc?.guarantee_defect_liability_end_date}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              guarantee_defect_liability_end_date: date,
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
                        <label className="form-label">Job Start Date</label>
                        <DatePicker
                          selected={formDataWdc?.jcc_job_start_date}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              jcc_job_start_date: date,
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
                          selected={formDataWdc?.jcc_job_end_date}
                          onChange={(date) =>
                            setFormDataWdc({
                              ...formDataWdc,
                              jcc_job_end_date: date,
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

                        <Select
                          className="basic-single"
                          classNamePrefix="select"
                          isClearable={true}
                          isSearchable={true}
                          name="emp"
                          id="emp"
                          options={emp}
                          value={emp && emp.filter((item) => item.value === formData?.certifying_authority)[0]}
                          onChange={(val) =>
                            setFormData({
                              ...formData,
                              certifying_authority: val?.value || "",
                            })
                          }
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

      {user.vendor_code && (
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
                        <span>{viewData?.inspection_note_ref_no}</span>
                        {viewData?.file_inspection_note_ref_no_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_inspection_note_ref_no_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View File
                          </a>
                        ) : viewData?.file_inspection_note_ref_no ? (
                          <a href={formatFilePathWDC(viewData?.file_inspection_note_ref_no)} target="_blank" rel="noreferrer">
                            View File
                          </a>
                        ) : (
                          "NA"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Hinderence Report Certified by Berth</label>
                      <p>
                        <span>{viewData?.hinderence_report_cerified_by_berth}</span>
                        {viewData?.file_hinderence_report_cerified_by_berth_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_hinderence_report_cerified_by_berth_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View File
                          </a>
                        ) : viewData?.file_hinderence_report_cerified_by_berth ? (
                          <a href={formatFilePathWDC(viewData?.file_hinderence_report_cerified_by_berth)} target="_blank" rel="noreferrer">
                            View File
                          </a>
                        ) : (
                          "NA"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Attendance Report</label>
                      <p>
                        <span>{viewData?.attendance_report}</span>
                        {viewData?.file_attendance_report_file_path ? (
                          <a
                            href={formatFilePath(viewData?.file_attendance_report_file_path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              marginRight: "10px",
                            }}
                          >
                            View File
                          </a>
                        ) : viewData?.file_attendance_report ? (
                          <a href={formatFilePathWDC(viewData?.file_attendance_report)} target="_blank" rel="noreferrer">
                            View File
                          </a>
                        ) : (
                          "NA"
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
                        <th>PO LineItem</th>
                        <th>Description</th>
                        <th>Open Quantity</th>
                        <th>Claim Quantity</th>
                        <th>Contractual Start</th>
                        <th>Contractual Completion</th>
                        <th>Actual Start</th>
                        <th>Actual Completion</th>
                        <th>Hinderance in Days</th>
                        <th>Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkTypeArr(viewData?.line_item_array) &&
                        viewData?.line_item_array.map((field, index) => (
                          <Fragment key={index}>
                            <tr>
                              <td>{field?.line_item_no}</td>
                              <td>{field?.description}</td>
                              <td>
                                {field?.rest_amount_wdc} {field?.unit}
                              </td>
                              <td>{field?.claim_qty}</td>
                              <td>
                                <input type="date" onChange={(e) => handleInputChange(e, index, "contractual_start_date")} className="form-control" placeholderText="DD/MM/YYYY" />
                              </td>
                              <td>
                                <input
                                  type="date"
                                  onChange={(e) => handleInputChange(e, index, "Contractual_completion_date")}
                                  className="form-control"
                                  placeholderText="DD/MM/YYYY"
                                />
                              </td>
                              <td>{field?.actual_start_date && formatDate(field?.actual_start_date)}</td>
                              <td>{field?.actual_completion_date && formatDate(field?.actual_completion_date)}</td>
                              <td>{field?.hinderance_in_days}</td>
                              <td>{doForm[index]?.delay || "0"}</td>
                            </tr>
                          </Fragment>
                        ))}
                    </tbody>
                  </table>

                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Stage Details</label>
                      <p>{viewData?.stage_details}</p>
                    </div>
                  </div>
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

                    <DynamicButton
                      label="SUBMIT"
                      onClick={() => (status === "APPROVED" ? submitHandlerAction("APPROVED", null) : showRemarksPopup ? submitHandlerAction("REJECTED", null) : null)}
                      className="btn fw-bold btn-primary"
                    />
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* JCC Popup */}
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
                      <label className="form-label">Guarantee Defect Start Date</label>
                      <p> {viewData?.guarantee_defect_liability_start_date && formatDate(viewData?.guarantee_defect_liability_start_date * 1000)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Guarantee Defect End Date</label>
                      <p> {viewData?.guarantee_defect_liability_end_date && formatDate(viewData?.guarantee_defect_liability_end_date * 1000)}</p>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Job Start Date</label>
                      <p> {viewData?.jcc_job_start_date && formatDate(viewData?.jcc_job_start_date * 1000)}</p>
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Job Completion Date</label>
                      <p> {viewData?.jcc_job_end_date && formatDate(viewData?.jcc_job_end_date * 1000)}</p>
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
                  <div className="col-12 col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Final totoal executed value</label>
                      <p>{viewData?.total_amount}</p>
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

      <div className={isPopupView ? "popup popup_lg active" : "popup popup_lg"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5 pb-3">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">All Data {viewData?.reference_no && `for ${viewData?.reference_no}`}</span>
            </h3>
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
                    <span>{viewData?.inspection_note_ref_no}</span>
                    {viewData?.file_inspection_note_ref_no_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_inspection_note_ref_no_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View File
                      </a>
                    ) : viewData?.file_inspection_note_ref_no ? (
                      <a href={formatFilePathWDC(viewData?.file_inspection_note_ref_no)} target="_blank" rel="noreferrer">
                        View File
                      </a>
                    ) : (
                      "NA"
                    )}
                  </p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Hinderence Report Certified by Berth</label>
                  <p>
                    <span>{viewData?.hinderence_report_cerified_by_berth}</span>
                    {viewData?.file_hinderence_report_cerified_by_berth_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_hinderence_report_cerified_by_berth_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View File
                      </a>
                    ) : viewData?.file_hinderence_report_cerified_by_berth ? (
                      <a href={formatFilePathWDC(viewData?.file_hinderence_report_cerified_by_berth)} target="_blank" rel="noreferrer">
                        View File
                      </a>
                    ) : (
                      "NA"
                    )}
                  </p>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Attendance Report</label>
                  <p>
                    <span>{viewData?.attendance_report}</span>
                    {viewData?.file_attendance_report_file_path ? (
                      <a
                        href={formatFilePath(viewData?.file_attendance_report_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View File
                      </a>
                    ) : viewData?.file_attendance_report ? (
                      <a href={formatFilePathWDC(viewData?.file_attendance_report)} target="_blank" rel="noreferrer">
                        View File
                      </a>
                    ) : (
                      "NA"
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
                    <th>PO LineItem</th>
                    <th>Description</th>
                    <th>Open Quantity</th>
                    <th>Claim Quantity</th>
                    <th>Actual Start</th>
                    <th>Actual Completion</th>
                    <th>Hinderance in Days</th>

                    {viewData?.status === "APPROVED" && <th>Contractual Start</th>}
                    {viewData?.status === "APPROVED" && <th>Contractual Completion</th>}
                    {viewData?.status === "APPROVED" && <th>Delay</th>}

                    {viewData?.status === "REJECTED" && <th>Contractual Start</th>}
                    {viewData?.status === "REJECTED" && <th>Contractual Completion</th>}
                    {viewData?.status === "REJECTED" && <th>Delay</th>}
                  </tr>
                </thead>
                <tbody>
                  {checkTypeArr(viewData?.line_item_array) &&
                    viewData?.line_item_array.map((field, index) => (
                      <Fragment key={index}>
                        <tr>
                          <td>
                            <span>{field?.line_item_no}</span>
                          </td>
                          <td>{field?.description}</td>
                          <td>
                            {field?.rest_amount_wdc} {field?.unit}
                          </td>
                          <td>{field?.claim_qty}</td>
                          <td>{field?.actual_start_date && formatDate(field?.actual_start_date)}</td>
                          <td>{field?.actual_completion_date && formatDate(field?.actual_completion_date)}</td>
                          <td>{field?.hinderance_in_days}</td>

                          {viewData?.status === "APPROVED" && <td>{field?.actual_completion_date && formatDate(field?.contractual_start_date)}</td>}
                          {viewData?.status === "APPROVED" && <td>{field?.actual_completion_date && formatDate(field?.Contractual_completion_date)}</td>}

                          {viewData?.status === "APPROVED" && <td>{field?.delay}</td>}

                          {viewData?.status === "REJECTED" && <td>{field?.actual_completion_date && formatDate(field?.contractual_start_date)}</td>}
                          {viewData?.status === "REJECTED" && <td>{field?.actual_completion_date && formatDate(field?.Contractual_completion_date)}</td>}

                          {viewData?.status === "REJECTED" && <td>{field?.delay}</td>}
                        </tr>
                      </Fragment>
                    ))}
                </tbody>
              </table>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Stage Details</label>
                  <p>{viewData?.stage_details}</p>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <p>{viewData?.remarks}</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* // jcc popup*/}
      <div className={isPopupJccView ? "popup popup_lg active" : "popup popup_lg"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5 pb-3">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">All Data {viewData?.reference_no && `for ${viewData?.reference_no}`}</span>
            </h3>
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
                  <label className="form-label">Final totoal executed value</label>
                  <p>{viewData?.total_amount}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Guarantee Defect Start Date</label>
                  {/* <p>{viewData?.guarantee_defect_liability_start_date}</p> */}
                  <p> {viewData?.guarantee_defect_liability_start_date && formatEpochToDate(viewData?.guarantee_defect_liability_start_date)}</p>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Guarantee Defect End Date</label>

                  <p> {viewData?.guarantee_defect_liability_end_date && formatEpochToDate(viewData?.guarantee_defect_liability_end_date)}</p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Job Start Date</label>

                  <p> {viewData?.jcc_job_start_date && formatEpochToDate(viewData?.jcc_job_start_date)}</p>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <div className="mb-3">
                  <label className="form-label">Job Completion Date</label>

                  <p> {viewData?.jcc_job_end_date && formatEpochToDate(viewData?.jcc_job_end_date)}</p>
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
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <p>{viewData?.remarks}</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default WDCSub;
