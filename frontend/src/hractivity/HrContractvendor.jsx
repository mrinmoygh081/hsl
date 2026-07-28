import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { IoClose } from "react-icons/io5";
import { BsChatRightText } from "react-icons/bs";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import sampleFile from "../samplefile/excel_file_hr2 (3).xlsx";
import { Modal, Button, Form } from "react-bootstrap";
import "react-datepicker/dist/react-datepicker.css";
import { formatDate } from "../utils/getDateTimeNow";
import { ASSIGNER, DEPT_FI, DEPT_IT, STAFF, USER_HSL_CONTRACT, USER_HSL_HR, USER_HSL_PURCHASE, USER_VENDOR } from "../constants/userConstants";
import { Link } from "react-router-dom";
import debounce from "lodash/debounce";
import Swal from "sweetalert2";
import HrContractvendorViewOnly from "./HrContractvendorViewOnly";
import HrSearchableSelect from "../components/HrSearchableSelect";
import MultiSearchableSelect from "../components/MultiSearchableSelect";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../Helpers/FileUploadInfoIcon";
import FileUploadProgressBar from "../Helpers/FileUploadProgressBar";
import ReactPaginate from "react-paginate";

const HrContractvendor = () => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [tableData, setTableData] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRowRemarks, setSelectedRowRemarks] = useState("");
  const [hasHoldStatus, setHasHoldStatus] = useState(false);
  const [viewApi, setViewApi] = useState([]);
  const [showModalhr, setShowModalhr] = useState(false);
  const [showModalretailer, setShowModalretailer] = useState(false);
  const [selectedOptionsHr, setSelectedOptionsHr] = useState(null);
  const [selectedOptionsRetailer, setSelectedOptionsRetailer] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [showModalSupportingDoc, setShowModalSupportingDoc] = useState(false);
  const [supportingDocUploadResponse, setSupportingDocUploadResponse] = useState(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRcNo, setFilterRcNo] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPoNo, setFilterPoNo] = useState("");
  const [filtervendor_code, setFiltervendor_code] = useState("");
  const [isActionDisabled, setIsActionDisabled] = useState(false);
  const [complianceFile, setComplianceFile] = useState(null);

  // Pagination states for view tables
  const [currentPageView, setCurrentPageView] = useState(0);
  const [itemsPerPageView, setItemsPerPageView] = useState(10);
  const [totalCountView, setTotalCountView] = useState(0);

  const { token, user } = useSelector((state) => state.auth);
  const fileInputRef = useRef();
  const hrUrl = "po/hr/compliance";

  // const isAuthorized = user?.department_id === USER_HSL_CONTRACT || user?.department_id === USER_HSL_HR || user?.user_type === USER_VENDOR;
  // const isViewOnlyUser =
  //   user?.vendor_code === "602717" ||
  //   user?.vendor_code === "600233" ||
  //   user?.vendor_code === "601824" ||
  //   user?.department_id === DEPT_FI ||
  //   user?.department_id === DEPT_IT ||
  //   user?.department_id === USER_HSL_PURCHASE;
  // const isViewOnlyUser =
  //   (user?.vendor_code === "602717" || user?.vendor_code === "600233" || user?.vendor_code === "601824" || user?.vendor_code === "199609") &&
  //   user?.department_id !== USER_HSL_CONTRACT && // ← Added this condition
  //   (user?.department_id === DEPT_FI || user?.department_id === DEPT_IT || user?.department_id === USER_HSL_PURCHASE);
  // const isContractUserWithUpload = user?.department_id === USER_HSL_CONTRACT && !isViewOnlyUser;
  //const isAuthorized = user?.department_id === USER_HSL_CONTRACT || user?.department_id === USER_HSL_HR || user?.user_type === USER_VENDOR;
  // BEFORE
  // Line ~50 ke aas paas ye dono update karo:

  const isViewOnlyUser =
    !(user?.department_id === USER_HSL_CONTRACT || user?.department_id === USER_HSL_HR || user?.user_type === USER_VENDOR) &&
    (user?.department_id === DEPT_FI ||
      user?.department_id === DEPT_IT ||
      user?.department_id === USER_HSL_PURCHASE ||
      user?.vendor_code === "199609" ||
      user?.vendor_code === "602717" ||
      user?.vendor_code === "600233" ||
      user?.vendor_code === "601824");

  const isAuthorized =
    user?.department_id === USER_HSL_CONTRACT ||
    user?.department_id === USER_HSL_HR ||
    user?.user_type === USER_VENDOR ||
    user?.department_id === DEPT_FI ||
    user?.department_id === DEPT_IT ||
    user?.department_id === USER_HSL_PURCHASE ||
    user?.vendor_code === "199609" ||
    user?.vendor_code === "602717" ||
    user?.vendor_code === "600233" ||
    user?.vendor_code === "601824";
  const isContractUploadUser = user?.department_id === USER_HSL_CONTRACT;
  const showStatus = (row) => row.status || row.hr_retailer_status || row.vendor_status || "--";
  const showRemarks = (row) => row.hr_remarks || row.hr_retailer_remarks || null;

  // Filter/search/pageSize change hone par page 0 reset (ViewOnly jaisa)
  useEffect(() => {
    setCurrentPageView(0);
  }, [filterMonth, filterYear, filterRcNo, filterUnit, filterStatus, filterPoNo, filtervendor_code, searchQuery, itemsPerPageView]);

  const debouncedFetchTableData = debounce(async (query) => {
    try {
      if (!selectedCategory.trim() && !query.trim()) {
        setTableData([]);
        return;
      }

      const queryParams = new URLSearchParams({
        type: selectedType.toLowerCase(),
        docNo: selectedCategory || query,
        ...(selectedType === "PO" && selectedUnit?.value && { unit: selectedUnit.value }),
        ...(query && { search: query }),
      }).toString();

      const data = await apiCallBack("GET", `${hrUrl}?${queryParams}`, null, token);
      if (data?.status) {
        setTableData(data.data || []);
      } else {
        setTableData([]);
        toast.error("No data found for the given criteria.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching data.");
    }
  }, 2000);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const fileType = selectedFile.name.split(".").pop().toLowerCase();
      if (fileType === "xls" || fileType === "xlsx") {
        setFile(selectedFile);
      } else {
        toast.error("Only Excel files (.xls, .xlsx) are allowed.");
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file before uploading.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("type", "hr");
    formData.append("ref", user?.vendor_code);
    formData.append("file", file);

    try {
      const response = await apiCallBack("POST", `${hrUrl}/upload`, formData, token);
      if (response?.status) {
        toast.success(response.message || "File uploaded successfully!");
        setUploadedFile(response.data);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (user?.department_id === USER_HSL_CONTRACT) {
          fetchInitialData();
        }
      } else {
        toast.warning(response.message || "File upload failed.");
      }
    } catch (error) {
      toast.error(`Error uploading file: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const link = document.createElement("a");
    link.href = sampleFile;
    link.download = "sample.xlsx";
    link.click();
  };

  const complianceOptions = [
    { value: "PF", label: "PF" },
    { value: "ESI", label: "ESI" },
    { value: "WAGES", label: "WAGES" },
    { value: "LEAVE_SALARY", label: "LEAVE_SALARY" },
    { value: "BONUS", label: "BONUS" },
    { value: "OTHERS", label: "OTHERS" },
  ];

  const unitOptions = [
    { value: "MAIN", label: "MAIN" },
    { value: "FOJ", label: "FOJ" },
    { value: "RBD", label: "RBD" },
    { value: "61PARK", label: "61PARK" },
    { value: "TU", label: "TU" },
    { value: "DEP", label: "DEP" },
  ];

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const statusOptions = [
    { value: "SUBMITTED", label: "SUBMITTED" },
    { value: "RECOMMEND", label: "RECOMMEND" },
    { value: "NOT_RECOMMEND", label: "NOT RECOMMEND" },
    { value: "APPROVED", label: "APPROVED" },
    { value: "REJECTED", label: "REJECTED" },
    { value: "HOLD_BY_HR", label: "HOLD BY HR" },
    { value: "HOLD_BY_HR_RECIPIENT", label: "HOLD BY HR RECIPIENT" },
  ];

  const mandatoryOptions = ["PF", "ESI", "WAGES"];

  const isMandatorySelected = () => mandatoryOptions.every((option) => selectedOptions.some((selected) => selected.value === option));

  const handleFileChangepopup = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "application/pdf" || file.type === "application/zip")) {
      setSelectedFile(file);
      setComplianceFile(file); // progress bar ke liye
    } else {
      toast.warning("Only PDF and ZIP files are allowed.");
      setComplianceFile(null);
    }
  };

  // const handleSubmitr = async () => {
  //   if (!isMandatorySelected()) {
  //     toast.warning("Please select PF, ESI, and WAGES before submitting.");
  //     return;
  //   }
  //   if (!selectedFile) {
  //     toast.warning("Please upload a file before submitting!");
  //     return;
  //   }
  //   setIsUploading(true);
  //   const formData = new FormData();
  //   formData.append("type", "hr");
  //   formData.append("ref", user?.vendor_code);
  //   formData.append("file", selectedFile);

  //   try {
  //     const response = await apiCallBack("POST", "upload/compliance-file", formData, token);
  //     setUploadResponse(response);
  //     if (response.data?.status) {
  //       toast.success("File uploaded successfully!");
  //     } else {
  //       toast.warning(response.data?.message);
  //     }
  //   } catch (error) {
  //     toast.warning("Failed to upload file. Please try again.");
  //   }
  //   setIsUploading(false);
  // };

  const handleSubmitr = async () => {
    if (!isMandatorySelected()) {
      toast.warning("Please select PF, ESI, and WAGES before submitting.");
      return;
    }

    if (!selectedFile) {
      toast.warning("Please upload a file before submitting!");
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("type", "hr");
    formData.append("ref", user?.vendor_code);
    formData.append("file", selectedFile);

    try {
      const response = await apiCallBack("POST", "upload/compliance-file", formData, token);

      console.log("API Response:", response);

      setUploadResponse(response);

      if (response?.status) {
        toast.success("File uploaded successfully!");
      } else {
        toast.warning(response?.message);
      }
    } catch (error) {
      console.log("Upload Error:", error);

      toast.warning(error?.response?.data?.message || error?.message || "Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };
  const handleSupportingDocUpload = async () => {
    if (!selectedFile) {
      toast.warning("Please select a file before uploading.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("type", "hr");
    formData.append("ref", user?.vendor_code);
    formData.append("file", selectedFile);

    try {
      const response = await apiCallBack("POST", "upload/compliance-file", formData, token);
      setSupportingDocUploadResponse(response);
      if (response.data?.filePath) {
        toast.success("Supporting document uploaded successfully!");
      } else {
        toast.warning("Failed to upload supporting document. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to upload supporting document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSupportingDocSubmit = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!supportingDocUploadResponse?.data?.filePath) {
      toast.warning("Please upload a supporting document first.");
      return;
    }

    const payload = {
      action: "doc-update",
      compliance_data: selectedRows.map((row) => ({
        compliance_group_id: row.compliance_group_id || "",
        supporting_doc: supportingDocUploadResponse.data.filePath,
      })),
    };

    try {
      const response = await apiCallBack("POST", `${hrUrl}/vendor-update`, payload, token);
      if (response?.status) {
        toast.success(response.message || "Supporting document submitted successfully!");
        await fetchComplianceView();
        setSelectedRows([]);
        setSelectAll(false);
        setShowModalSupportingDoc(false);
        setSupportingDocUploadResponse(null);
        setSelectedFile(null);
        setIsActionDisabled(false);
      } else {
        toast.error(response.message || "Failed to submit supporting document.");
      }
    } catch (error) {
      toast.error("An error occurred while submitting supporting document.");
    }
  };

  const handleSubmit = async () => {
    if (!isMandatorySelected()) {
      toast.warning("Please select PF, ESI, and WAGES before submitting.");
      return;
    }
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!uploadResponse?.data?.filePath) {
      toast.warning("Please upload a file first using the Upload button in the modal.");
      return;
    }
    if (!selectedMonth) {
      toast.warning("Please select a compliance month.");
      return;
    }
    if (!selectedYear) {
      toast.warning("Please select a compliance year.");
      return;
    }
    if (!selectedOptions || selectedOptions.length === 0) {
      toast.warning("Please select at least one compliance option.");
      return;
    }
    if (selectedType === "PO" && !selectedUnit?.value) {
      toast.warning("Please select a unit.");
      return;
    }

    try {
      const checkParams = new URLSearchParams({
        type: "view",
        month: selectedMonth,
        year: selectedYear,
        rc_no: selectedRows[0]?.rc_no || "",
        poNo: selectedRows[0]?.purchasing_doc_no || "",
        status: "SUBMITTED",
      }).toString();

      const checkResponse = await apiCallBack("GET", `${hrUrl}?${checkParams}`, null, token);

      if (checkResponse?.status && checkResponse.data?.length > 0) {
        const result = await Swal.fire({
          title: "Already Submitted",
          text: `Compliance for ${monthOptions.find((m) => m.value === selectedMonth)?.label} ${selectedYear} already exists. Are you sure you want to submit again?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Submit Anyway",
          cancelButtonText: "Cancel",
          customClass: {
            popup: "custom-swal-popup",
            title: "custom-swal-title",
            content: "custom-swal-content",
            confirmButton: "custom-swal-confirm-btn",
            cancelButton: "custom-swal-cancel-btn",
          },
        });

        if (!result.isConfirmed) {
          return; // User clicked Cancel
        }
      }

      const complianceFor = selectedOptions.map((option) => option.value);
      const payload = {
        type: selectedType.toLowerCase(),
        compliance_data:
          selectedType.toLowerCase() === "po"
            ? [
                {
                  purchasing_doc_no: selectedRows[0].purchasing_doc_no || "",
                  rc_no: selectedRows[0].rc_no || "",
                  unit: selectedUnit?.value || "",
                  compliances: complianceFor,
                  compliance_month: selectedMonth,
                  compliance_year: selectedYear,
                  file1: uploadResponse.data.filePath,
                },
              ]
            : selectedRows.map((row) => ({
                purchasing_doc_no: row.purchasing_doc_no || "",
                rc_no: row.rc_no || "",
                unit: row.unit || "",
                compliances: complianceFor,
                compliance_month: selectedMonth,
                compliance_year: selectedYear,
                file1: uploadResponse.data.filePath,
              })),
      };

      const response = await apiCallBack("POST", hrUrl, payload, token);
      if (response?.status) {
        toast.success(response?.data?.[0]?.message || "Data submitted successfully.");
        await fetchTableData();
        resetFormFields();
        closeModal();
        setSelectedRows([]);
        setSelectAll(false);
        setShowTable(false);
      } else {
        toast.error(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      toast.warning("An error occurred while submitting the data. Please try again.");
    }
  };

  const handleActionClick = () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    const statuses = selectedRows.map((row) => showStatus(row));
    const hasHold = statuses.includes("HOLD_BY_HR") || statuses.includes("HOLD_BY_HR_RECIPIENT");
    const hasOtherStatus = statuses.some((status) => status !== "HOLD_BY_HR" && status !== "HOLD_BY_HR_RECIPIENT" && status !== "--");

    if (hasHold && hasOtherStatus) {
      toast.error("You cannot proceed with HOLD status mixed with other statuses.");
      return;
    }

    setShowModal(true);
  };

  const handleHoldActionClick = () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    const statuses = selectedRows.map((row) => showStatus(row));
    if (!statuses.every((status) => status === "HOLD_BY_HR" || status === "HOLD_BY_HR_RECIPIENT")) {
      toast.warning("Please select only rows with HOLD BY HR or HOLD BY HR RECIPIENT status to proceed.");
      return;
    }
    setShowModalSupportingDoc(true);
  };

  const handleHoldClick = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }

    const payload = {
      action: "update",
      compliance_data: selectedRows.map((row) => ({
        compliance_group_id: row.compliance_group_id || "",
        status: "HOLD_BY_HR",
      })),
    };

    try {
      const response = await apiCallBack("POST", `${hrUrl}/update`, payload, token);
      if (response?.status) {
        toast.success(response.message || "Hold status updated successfully!");
        await fetchTableData();
        setSelectedRows([]);
        setSelectAll(false);
        setHasHoldStatus(true);
        setIsActionDisabled(false);
      } else {
        toast.error(response.message || "Failed to update hold status.");
      }
    } catch (error) {
      toast.error("An error occurred while updating hold status.");
    }
  };

  const handleActionClickHR = () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    setShowModalhr(true);
  };

  const handleSubmitHR = async () => {
    if (!selectedOptionsHr) {
      toast.warning("Please select a status (APPROVED, REJECTED, or HOLD).");
      return;
    }
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }

    const payload = {
      action: "update",
      compliance_data: selectedRows.map((row) => ({
        compliance_group_id: row.compliance_group_id || "",
        status: selectedOptionsHr.value,
        remarks: remarks || "",
      })),
    };

    try {
      const response = await apiCallBack("POST", `${hrUrl}/update`, payload, token);
      if (response?.status) {
        toast.success(response.message || "Status updated successfully!");
        await fetchComplianceView();
        setSelectedRows([]);
        setSelectAll(false);
        setShowModalhr(false);
        setSelectedOptionsHr(null);
        setRemarks("");
        setIsActionDisabled(false);
      } else {
        toast.error(response.message || "Failed to update status.");
      }
    } catch (error) {
      toast.error("An error occurred while updating status.");
    }
  };

  const handleActionClickRetailer = () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    setShowModalretailer(true);
  };

  const handleSubmitRetailer = async () => {
    if (!selectedOptionsRetailer) {
      toast.warning("Please select a status (RECOMMEND, NOT_RECOMMEND, or HOLD).");
      return;
    }
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }

    const payload = {
      action: "update",
      compliance_data: selectedRows.map((row) => ({
        compliance_group_id: row.compliance_group_id || "",
        status: selectedOptionsRetailer.value,
        remarks: remarks || "",
      })),
    };

    try {
      const response = await apiCallBack("POST", `${hrUrl}/update`, payload, token);
      if (response?.status) {
        toast.success(response.message || "Retailer status updated successfully!");
        await fetchComplianceView();
        setSelectedRows([]);
        setSelectAll(false);
        setShowModalretailer(false);
        setSelectedOptionsRetailer(null);
        setRemarks("");
        setIsActionDisabled(false);
      } else {
        toast.error(response.message || "Failed to update retailer status.");
      }
    } catch (error) {
      toast.error("An error occurred while updating retailer status.");
    }
  };

  const closeModal = () => {
    resetFormFields();
    setShowModal(false);
  };

  const closeModalHR = () => {
    setSelectedOptionsHr(null);
    setRemarks("");
    setShowModalhr(false);
  };

  const closeModalRetailer = () => {
    setSelectedOptionsRetailer(null);
    setRemarks("");
    setShowModalretailer(false);
  };

  const closeModalSupportingDoc = () => {
    setShowModalSupportingDoc(false);
    setSelectedFile(null);
    setSupportingDocUploadResponse(null);
  };

  const resetFormFields = () => {
    setSelectedOptions([]);
    setSelectedMonth("");
    setSelectedYear("");
    setUploadResponse(null);
    setSelectedUnit(null);
    setSelectedFile(null);
    setComplianceFile(null);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setHasHoldStatus(false);
      setSelectAll(false);
      setIsActionDisabled(false);
    } else {
      const statuses = tableData.map((row) => showStatus(row));
      const hasHold = statuses.includes("HOLD_BY_HR") || statuses.includes("HOLD_BY_HR_RECIPIENT");
      const hasOtherStatus = statuses.some((status) => status !== "HOLD_BY_HR" && status !== "HOLD_BY_HR_RECIPIENT");
      const hasApprovedOrRejected = statuses.includes("APPROVED") || statuses.includes("REJECTED");

      if (hasHold && hasOtherStatus) {
        toast.error("You cannot select HOLD BY HR or HOLD BY HR RECIPIENT status with other statuses at the same time.");
        return;
      }

      const newSelectedRows = tableData.map((row, index) => ({ ...row, index }));
      setSelectedRows(newSelectedRows);
      setHasHoldStatus(hasHold);
      setSelectAll(true);
      setIsActionDisabled(hasApprovedOrRejected);
      if (hasApprovedOrRejected) {
        toast.warning("Selected rows are already APPROVED or REJECTED, so you cannot take further action.");
      }
    }
  };

  const handleViewSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
      setHasHoldStatus(false);
      setIsActionDisabled(false);
    } else {
      const newSelectedRows = viewApi.map((row, index) => ({ ...row, index }));
      const hasApprovedOrRejected = newSelectedRows.some((row) => showStatus(row) === "APPROVED" || showStatus(row) === "REJECTED");
      const hasHold = newSelectedRows.some((row) => showStatus(row) === "HOLD_BY_HR" || showStatus(row) === "HOLD_BY_HR_RECIPIENT");
      setSelectedRows(newSelectedRows);
      setHasHoldStatus(hasHold);
      setSelectAll(true);
      setIsActionDisabled(hasApprovedOrRejected);
      if (hasApprovedOrRejected) {
        toast.warning("Selected rows are already APPROVED or REJECTED, so you cannot take further action.");
      }
    }
  };

  const handleRowSelect = (index, row) => {
    setSelectedRows((prevSelectedRows) => {
      let updatedSelectedRows;
      const rowStatus = showStatus(row);
      if (prevSelectedRows.some((item) => item.index === index)) {
        updatedSelectedRows = prevSelectedRows.filter((item) => item.index !== index);
      } else {
        const existingStatuses = prevSelectedRows.map((r) => showStatus(r));
        if ((rowStatus === "HOLD_BY_HR" || rowStatus === "HOLD_BY_HR_RECIPIENT") && existingStatuses.some((s) => s !== "HOLD_BY_HR" && s !== "HOLD_BY_HR_RECIPIENT")) {
          toast.error("You cannot select HOLD BY HR or HOLD BY HR RECIPIENT status with other statuses at the same time.");
          return prevSelectedRows;
        }
        if (rowStatus !== "HOLD_BY_HR" && rowStatus !== "HOLD_BY_HR_RECIPIENT" && (existingStatuses.includes("HOLD_BY_HR") || existingStatuses.includes("HOLD_BY_HR_RECIPIENT"))) {
          toast.error("You cannot select HOLD BY HR or HOLD BY HR RECIPIENT status with other statuses at the same time.");
          return prevSelectedRows;
        }
        updatedSelectedRows = [...prevSelectedRows, { ...row, index }];
      }
      const hasHold = updatedSelectedRows.some((selectedRow) => showStatus(selectedRow) === "HOLD_BY_HR" || showStatus(selectedRow) === "HOLD_BY_HR_RECIPIENT");
      const hasApprovedOrRejected = updatedSelectedRows.some((selectedRow) => showStatus(selectedRow) === "APPROVED" || showStatus(selectedRow) === "REJECTED");
      setHasHoldStatus(hasHold);
      setSelectAll(updatedSelectedRows.length === (showTable ? tableData.length : viewApi.length));
      if (hasApprovedOrRejected && !isActionDisabled) {
        toast.warning("Selected rows are already APPROVED or REJECTED, so you cannot take further action.");
      }
      setIsActionDisabled(hasApprovedOrRejected);
      return updatedSelectedRows;
    });
  };

  const sortTableData = (data) => {
    const statusOrder = {
      SUBMITTED: 1,
      RECOMMEND: 2,
      NOT_RECOMMEND: 3,
      REJECTED: 4,
      APPROVED: 5,
      HOLD_BY_HR: 6,
      HOLD_BY_HR_RECIPIENT: 7,
      "--": 8,
    };
    return [...data].sort((a, b) => {
      const statusA = showStatus(a);
      const statusB = showStatus(b);
      const orderA = statusOrder[statusA] || 8;
      const orderB = statusOrder[statusB] || 8;
      return orderA - orderB;
    });
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", `${hrUrl}/list?type=list&pageSize=20000&pageNo=1`, null, token);
      if (response?.status) {
        setUploadedFile(response.data || []);
      } else {
        // toast.error("Failed to fetch initial data.");
      }
    } catch (error) {
      toast.error(`Error fetching initial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async () => {
    try {
      if (!selectedCategory.trim() && !searchQuery.trim()) {
        setTableData([]);
        return;
      }

      const queryParams = new URLSearchParams({
        type: selectedType.toLowerCase(),
        docNo: selectedCategory,
        ...(selectedType === "PO" && selectedUnit?.value && { unit: selectedUnit.value }),
        ...(searchQuery && { search: searchQuery }),
      }).toString();

      const data = await apiCallBack("GET", `${hrUrl}?${queryParams}`, null, token);
      if (data?.status) {
        setTableData(data.data || []);
      } else {
        setTableData([]);
        toast.error("No data found for the given category and unit.");
      }
    } catch (error) {
      toast.error("An error occurred while fetching data.");
    }
  };

  const fetchUnits = async (category) => {
    try {
      if (!category) {
        setUnits([]);
        return;
      }
      const data = await apiCallBack("GET", `${hrUrl}?type=rc&docNo=${category}`, null, token);
      if (data?.status) {
        const uniqueUnits = Array.from(new Set(data.data.map((item) => item.unit))).map((unit) => ({
          value: unit,
          label: unit,
        }));
        setUnits(uniqueUnits);
      } else {
        setUnits([]);
        toast.error("No units found for the selected RC number.");
      }
    } catch (error) {
      toast.error("Error fetching units.");
    }
  };

  // Updated fetchComplianceView with pagination
  const fetchComplianceView = async () => {
    let query = "?type=view";
    if (filterMonth) query += `&month=${filterMonth}`;
    if (filterYear) query += `&year=${filterYear}`;
    if (filterRcNo) query += `&rc_no=${filterRcNo}`;
    if (filterStatus) query += `&status=${filterStatus}`;
    if (filterPoNo) query += `&poNo=${filterPoNo}`;
    if (filtervendor_code) query += `&vendor_code=${filtervendor_code}`;
    if (filterUnit) query += `&unit=${filterUnit}`;
    if (searchQuery) query += `&search=${searchQuery}`;

    // Add pagination parameters
    if (itemsPerPageView !== "All") {
      query += `&pageNo=${currentPageView + 1}&pageSize=${itemsPerPageView}`;
    }

    try {
      const data = await apiCallBack("GET", `${hrUrl}${query}`, null, token);
      if (data?.status) {
        const rows = Array.isArray(data.data) ? data.data : [];
        setViewApi(rows);
        // Some APIs send count=0 even when rows exist; treat non-positive count as unknown and fallback to rows.length
        const total = typeof data.count === "number" && data.count > 0 ? data.count : rows.length;
        setTotalCountView(total);
      } else {
        setViewApi([]);
        setTotalCountView(0);
        toast.error("No compliance data found.");
      }
    } catch (error) {
      toast.error("Error fetching compliance view.");
      setViewApi([]);
      setTotalCountView(0);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    debouncedFetchTableData(query);
  };

  const handleRecordsPerPageChange = (e) => {
    setItemsPerPageView(e.target.value);
    setCurrentPageView(0);
  };

  const handlePageClick = (event) => {
    setCurrentPageView(event.selected);
  };

  // Debounced fetchComplianceView to prevent excessive API calls
  const debouncedFetchComplianceView = debounce(async () => {
    let query = "?type=view";
    if (filterMonth) query += `&month=${filterMonth}`;
    if (filterYear) query += `&year=${filterYear}`;
    if (filterRcNo) query += `&rc_no=${filterRcNo}`;
    if (filterStatus) query += `&status=${filterStatus}`;
    if (filterPoNo) query += `&poNo=${filterPoNo}`;
    if (filtervendor_code) query += `&vendor_code=${filtervendor_code}`;
    if (filterUnit) query += `&unit=${filterUnit}`;

    if (itemsPerPageView !== "All") {
      query += `&pageNo=${currentPageView + 1}&pageSize=${itemsPerPageView}`;
    }

    try {
      const data = await apiCallBack("GET", `${hrUrl}${query}`, null, token);
      if (data?.status) {
        const rows = Array.isArray(data.data) ? data.data : [];
        setViewApi(rows);
        const total = typeof data.count === "number" && data.count > 0 ? data.count : rows.length;
        setTotalCountView(total);
      } else {
        setViewApi([]);
        setTotalCountView(0);
        toast.error("No compliance data found.");
      }
    } catch (error) {
      toast.error("Error fetching compliance view.");
      setViewApi([]);
      setTotalCountView(0);
    }
  }, 2000);

  // Updated useEffect to trigger fetchComplianceView on filter changes with pagination
  useEffect(() => {
    if (user?.department_id === USER_HSL_CONTRACT && !isViewOnlyUser) {
      fetchInitialData();
    }
    if (!showTable && user?.department_id === USER_HSL_CONTRACT) {
      debouncedFetchComplianceView();
    }
    return () => debouncedFetchComplianceView.cancel(); // Cleanup debounce on unmount
  }, [
    user?.department_id,
    token,
    isViewOnlyUser,
    showTable,
    filterStatus,
    filterPoNo,
    filtervendor_code,
    filterUnit,
    filterRcNo,
    filterMonth,
    filterYear,
    currentPageView,
    itemsPerPageView,
  ]);

  useEffect(() => {
    if (user?.user_type === USER_VENDOR && selectedType === "PO" && selectedCategory.trim()) {
      fetchUnits(selectedCategory);
    } else {
      setUnits([]);
    }
  }, [selectedType, selectedCategory, token, user?.user_type]);

  useEffect(() => {
    if (user?.user_type === USER_VENDOR && selectedType && (selectedCategory || searchQuery)) {
      debouncedFetchTableData(searchQuery);
    }
  }, [selectedType, selectedCategory, selectedUnit, searchQuery, token, user?.user_type]);

  useEffect(() => {
    if (user?.user_type === USER_VENDOR && !showTable) {
      fetchComplianceView();
    }
  }, [showTable, token, user?.user_type, currentPageView, itemsPerPageView]);

  useEffect(() => {
    if (user?.user_type === USER_VENDOR && !showTable) {
      const timer = setTimeout(() => {
        fetchComplianceView();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [filterMonth, filterYear, filterRcNo, filterStatus, filterPoNo, filtervendor_code, filterUnit, searchQuery, showTable, token, user?.user_type]);

  useEffect(() => {
    if (user?.department_id === USER_HSL_HR) {
      fetchComplianceView();
    }
  }, [user?.department_id, token, currentPageView, itemsPerPageView]);

  useEffect(() => {
    if (user?.department_id === USER_HSL_HR) {
      const timer = setTimeout(() => {
        fetchComplianceView();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [filterMonth, filterYear, filterRcNo, filterStatus, filterPoNo, filtervendor_code, filterUnit, searchQuery, user?.department_id, token]);

  const filteredData = tableData.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (row.rc_no?.toLowerCase() || "").includes(query) || (row.unit?.toLowerCase() || "").includes(query) || (row.purchasing_doc_no?.toLowerCase() || "").includes(query);
  });

  const handleBackToSearch = () => {
    setShowTable(true);
    setSelectedType("");
    setSelectedCategory("");
    setSelectedUnit(null);
    setTableData([]);
    setSelectedRows([]);
    setSelectAll(false);
    setSearchQuery("");
    setIsActionDisabled(false);
  };
  useEffect(() => {
    console.log("User Department:", user?.department_id);
    console.log("isViewOnlyUser:", isViewOnlyUser);
    console.log("isContractUploadUser:", isContractUploadUser);
  }, [user]);

  // Render HrContractvendorViewOnly for view-only users
  if (isViewOnlyUser) {
    return <HrContractvendorViewOnly />;
  }

  // Render original interface for other authorized users
  if (!isAuthorized) {
    return (
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title="HR COMPLIANCE" />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8 mt-5">
                    <div className="col-12">
                      <div className="card p-4">
                        <h4 className="mb-4 fw-bold">Access Denied</h4>
                        <p>You do not have permission to access this page. Please contact the administrator.</p>
                        <Link to="/" className="btn btn-primary">
                          Go to Home
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Footer />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="HR COMPLIANCE" />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container-fluid px-4 py-2">
                {/* Rate Contract Master Data Upload - Only for CONTRACT department (non-viewonly) */}
                {isContractUploadUser && (
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card p-4" style={{ maxWidth: "600px", margin: "0 auto" }}>
                        <h4 className="mb-4 fw-bold">Rate Contract Master Data</h4>
                        <div className="d-flex align-items-center gap-3">
                          <input type="file" className="form-control" accept=".xls,.xlsx" ref={fileInputRef} onChange={handleFileChange} />
                          <FileUploadInfoIcon />
                          <button className="btn btn-sm btn-primary fw-bold" onClick={handleUpload} disabled={loading || !file}>
                            {loading ? "Uploading..." : "Upload"}
                          </button>
                          {file && (
                            <button
                              className="btn btn-sm btn-danger fw-bold d-flex align-items-center"
                              onClick={() => {
                                setFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                            >
                              <IoClose className="me-1" />
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="mt-4 d-flex gap-3">
                          <button className="btn btn-sm btn-secondary fw-bold" onClick={handleDownloadSample}>
                            Download Sample File
                          </button>
                          <button className="btn btn-sm btn-success fw-bold" onClick={() => setShowTable(false)}>
                            VIEW
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isContractUploadUser && showTable && (
                  <div className="row g-5 g-xl-8 mt-3">
                    <div className="col-12">
                      <div className="card p-4">
                        <h4 className="mb-4 fw-bold">Rate Contract Master Data</h4>
                        <div style={{ overflowX: "auto" }}>
                          <table className="custom-table custom-table-bordered mt-4">
                            <thead className="custom-table-header">
                              <tr>
                                <th>Rc No</th>
                                <th>Unit</th>
                                <th>PO</th>
                                <th>Created Date</th>
                                <th>Message</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uploadedFile?.length > 0 ? (
                                uploadedFile.map((row, index) => (
                                  <tr key={index}>
                                    <td>{row?.rc_no || "--"}</td>
                                    <td>{row?.unit || "--"}</td>
                                    <td>{row?.purchasing_doc_no || "--"}</td>
                                    <td>{row?.created_at && formatDate(row?.created_at)}</td>
                                    <td
                                      className={
                                        row?.message === "Action taken successfully!"
                                          ? "success-message"
                                          : row?.message === "No such unit present"
                                            ? "error-message"
                                            : "default-message"
                                      }
                                    >
                                      {row?.message || "--"}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" className="text-center no-data-message">
                                    No Data Found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {user?.department_id === USER_HSL_CONTRACT && !showTable && (
                  <div className="row g-5 g-xl-8 mt-3">
                    <div className="col-12">
                      <div className="card p-4">
                        <h4 className="mb-4 fw-bold">Compliance View</h4>
                        <div className="d-flex justify-content-between mb-4">
                          <button className="btn btn-primary" onClick={() => setShowTable(true)}>
                            BACK TO UPLOAD
                          </button>
                        </div>
                        {/* Filter Card (ViewOnly-style) */}
                        <div className="card mb-3 border-0" style={{ backgroundColor: "#2a2d93", borderRadius: "12px" }}>
                          <div className="card-body py-3">
                            <div className="row g-3 align-items-end">
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Vendor Code</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filtervendor_code}
                                  onChange={(e) => {
                                    console.log("Vendor Code filter changed to:", e.target.value);
                                    setFiltervendor_code(e.target.value);
                                  }}
                                  placeholder="Vendor Code"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">PO No</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterPoNo}
                                  onChange={(e) => {
                                    console.log("PO No filter changed to:", e.target.value);
                                    setFilterPoNo(e.target.value);
                                  }}
                                  placeholder="PO No"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Unit</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterUnit}
                                  onChange={(e) => {
                                    console.log("Unit filter changed to:", e.target.value);
                                    setFilterUnit(e.target.value);
                                  }}
                                  placeholder="Unit"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">RC No</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterRcNo}
                                  onChange={(e) => {
                                    console.log("RC No filter changed to:", e.target.value);
                                    setFilterRcNo(e.target.value);
                                  }}
                                  placeholder="RC No"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Month</label>
                                <HrSearchableSelect
                                  options={monthOptions}
                                  value={filterMonth}
                                  onChange={(option) => setFilterMonth(option ? option.value : "")}
                                  placeholder="Month"
                                  isClearable={true}
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Year</label>
                                <HrSearchableSelect
                                  options={yearOptions}
                                  value={filterYear}
                                  onChange={(option) => setFilterYear(option ? option.value : "")}
                                  placeholder="Year"
                                  isClearable={true}
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Status</label>
                                <HrSearchableSelect
                                  options={statusOptions}
                                  value={filterStatus}
                                  onChange={(option) => setFilterStatus(option ? option.value : "")}
                                  placeholder="Status"
                                  isClearable={true}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Table Card (ViewOnly-style) */}
                        <div className="card">
                          <div className="d-flex align-items-center justify-content-between m-2">
                            <span className="fw-bold">Total Records: {totalCountView}</span>
                            <select className="form-select" style={{ width: "100px" }} value={itemsPerPageView} onChange={handleRecordsPerPageChange}>
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                              <option value="All">All</option>
                            </select>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-hover table-bordered mb-0 align-middle small">
                              <thead className="table-light">
                                <tr>
                                  <th>
                                    <input type="checkbox" checked={selectAll} onChange={handleViewSelectAll} />
                                  </th>
                                  <th>Vendor Code</th>
                                  <th>PO Number</th>
                                  <th>Unit</th>
                                  <th>RC No</th>
                                  <th>Compl Month</th>
                                  <th>Compl Year</th>
                                  <th>PF</th>
                                  <th>ESI</th>
                                  <th>WAGES</th>
                                  <th>EL</th>
                                  <th>BONUS</th>
                                  <th>OTHERS</th>
                                  <th>File</th>
                                  <th>Supp Doc</th>
                                  <th className="px-2 py-2">Submission Date</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {viewApi.length > 0 ? (
                                  viewApi.map((row, index) => (
                                    <tr key={index}>
                                      <td>
                                        <input type="checkbox" checked={selectedRows.some((item) => item.index === index)} onChange={() => handleRowSelect(index, row)} />
                                      </td>
                                      <td>{row.vendor_code || "--"}</td>
                                      <td>{row.purchasing_doc_no || "--"}</td>
                                      <td>{row.unit || "--"}</td>
                                      <td>{row.rc_no || "--"}</td>
                                      <td>{monthOptions.find((opt) => opt.value === row.compliance_month)?.label || "--"}</td>
                                      <td>{row.compliance_year || "--"}</td>
                                      <td>{row.pf === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.esi === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.wages === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.leave_salary === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.bonus === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.others === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>
                                        {row.file1 ? (
                                          /\.(pdf)$/i.test(row.file1) ? (
                                            <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} target="_blank" rel="noopener noreferrer">
                                              View
                                            </a>
                                          ) : (
                                            <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} download>
                                              View
                                            </a>
                                          )
                                        ) : (
                                          "--"
                                        )}
                                      </td>
                                      <td>
                                        {(() => {
                                          let supportingDocs = [];
                                          try {
                                            supportingDocs = row.supporting_doc ? JSON.parse(row.supporting_doc) : [];
                                            if (!Array.isArray(supportingDocs)) {
                                              supportingDocs = [];
                                            }
                                          } catch (error) {
                                            supportingDocs = [];
                                          }
                                          return supportingDocs.length > 0
                                            ? supportingDocs.map((doc, docIndex) => (
                                                <div key={docIndex}>
                                                  {/\.(pdf)$/i.test(doc) ? (
                                                    <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} target="_blank" rel="noopener noreferrer">
                                                      View {docIndex + 1}
                                                    </a>
                                                  ) : (
                                                    <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} download>
                                                      Download {docIndex + 1}
                                                    </a>
                                                  )}
                                                </div>
                                              ))
                                            : "--";
                                        })()}
                                      </td>
                                      <td>{formatDate(row.created_at)}</td>
                                      <td>
                                        {showStatus(row)}
                                        {showRemarks(row) && (
                                          <BsChatRightText
                                            size={15}
                                            className="text-primary cursor-pointer"
                                            onClick={() => {
                                              setSelectedRowRemarks(showRemarks(row));
                                              setShowRemarksModal(true);
                                            }}
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="15" className="text-center no-data-message">
                                      No Compliance Data Found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Pagination (ViewOnly-style placement) */}
                        {itemsPerPageView !== "All" && (
                          <ReactPaginate
                            breakLabel="..."
                            nextLabel="Next >"
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={3}
                            marginPagesDisplayed={2}
                            pageCount={Math.max(1, Math.ceil((totalCountView || viewApi.length) / Number(itemsPerPageView || 1)))}
                            previousLabel="< Prev"
                            renderOnZeroPageCount={null}
                            containerClassName="pagination"
                            activeClassName="active"
                            previousClassName="prev"
                            nextClassName="next"
                            disabledClassName="disabled"
                            breakClassName="break"
                            forcePage={currentPageView}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {user?.user_type === USER_VENDOR && (
                  <div className="row g-5 g-xl-8 mt-3">
                    <div className="col-12">
                      <div className="card p-4">
                        <h4 className="mb-4 fw-bold">{showTable ? "Submit Statutory Compliances" : "Compliance View"}</h4>
                        {showTable ? (
                          <>
                            <div className="d-flex align-items-center justify-content-between">
                              <div style={{ width: "40%" }}>
                                <label className="form-label fw-bold">Contract Type</label>
                                <select
                                  className="form-select form-select-small"
                                  value={selectedType}
                                  onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    setSelectedCategory("");
                                    setSelectedUnit(null);
                                    setTableData([]);
                                    setSearchQuery("");
                                    setIsActionDisabled(false);
                                    setUnits([]);
                                  }}
                                >
                                  <option value="">Choose PO/RC</option>
                                  <option value="PO">Purchase Order (PO)</option>
                                  <option value="RC">Rate Contract (RC)</option>
                                </select>
                              </div>
                              {!hasHoldStatus && (
                                <button className="btn btn-primary" onClick={handleActionClick} style={{ marginRight: "10px", marginLeft: "auto" }} disabled={isActionDisabled}>
                                  ACTION
                                </button>
                              )}
                              {hasHoldStatus && (
                                <button className="btn btn-primary" onClick={handleHoldActionClick} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                  HOLD ACTION
                                </button>
                              )}
                              <button className="btn btn-secondary" style={{ backgroundColor: "green", color: "white" }} onClick={() => setShowTable(false)}>
                                VIEW
                              </button>
                            </div>
                            {selectedType !== "" && (
                              <div className="mb-3">
                                <label className="form-label fw-bold">Search {selectedType === "PO" ? "Purchase Order" : "RC Number"}</label>
                                <div className="d-flex align-items-center">
                                  <input
                                    type="text"
                                    className="form-control"
                                    style={{ width: "40%" }}
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    placeholder={`Search by ${selectedType === "PO" ? "PO" : "RC"} number, Unit, or PO`}
                                  />
                                </div>
                              </div>
                            )}
                            <div style={{ overflowX: "auto" }}>
                              <table className="custom-table custom-table-bordered mt-4">
                                <thead className="custom-table-header">
                                  <tr>
                                    <th>
                                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                                    </th>
                                    {/* <th>Vendor Code</th> */}
                                    <th>RC No</th>
                                    <th>Unit</th>
                                    <th>PO</th>
                                    <th>PF</th>
                                    <th>ESI</th>
                                    <th>WAGES</th>
                                    <th>EL</th>
                                    <th>BONUS</th>
                                    <th>OTHERS</th>
                                    <th>Comp Upto</th>
                                    <th>New Comp Date</th>
                                    <th>Status</th>
                                    <th>File</th>
                                    <th>Supporting Doc</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredData.length > 0 ? (
                                    sortTableData(filteredData).map((row, index) => {
                                      const complianceList = {
                                        PF: row.pf_compliance,
                                        ESI: row.esi_compliance,
                                        WAGES: row.wages_compliance,
                                        LEAVE_SALARY: row.leave_salary_compliance,
                                        BONUS: row.bonus_compliance,
                                        OTHERS: row.others_compliance,
                                      };
                                      return (
                                        <tr key={index}>
                                          <td>
                                            <input type="checkbox" checked={selectedRows.some((item) => item.index === index)} onChange={() => handleRowSelect(index, row)} />
                                          </td>
                                          {/* <td>{row.vendor_code || "--"}</td> */}
                                          <td>{row?.rc_no || "--"}</td>
                                          <td>{row?.unit || "--"}</td>
                                          <td>{row.purchasing_doc_no || "--"}</td>
                                          {Object.keys(complianceList).map((header) => (
                                            <td key={header} className="text-center">
                                              {complianceList[header] === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}
                                            </td>
                                          ))}
                                          <td>{(row?.last_complient_date && formatDate(row?.last_complient_date)) || "--"}</td>
                                          <td>{(row?.compliance_till_date && formatDate(row?.compliance_till_date)) || "--"}</td>
                                          <td>
                                            {showStatus(row)}
                                            {showRemarks(row) && (
                                              <BsChatRightText
                                                size={15}
                                                className="text-primary cursor-pointer"
                                                onClick={() => {
                                                  setSelectedRowRemarks(showRemarks(row));
                                                  setShowRemarksModal(true);
                                                }}
                                              />
                                            )}
                                          </td>
                                          <td>
                                            {row.file1 ? (
                                              /\.(pdf)$/i.test(row.file1) ? (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} target="_blank" rel="noopener noreferrer">
                                                  View
                                                </a>
                                              ) : (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} download>
                                                  View
                                                </a>
                                              )
                                            ) : (
                                              "--"
                                            )}
                                          </td>
                                          <td>
                                            {(() => {
                                              let supportingDocs = [];
                                              try {
                                                supportingDocs = row.supporting_doc ? JSON.parse(row.supporting_doc) : [];
                                                if (!Array.isArray(supportingDocs)) {
                                                  supportingDocs = [];
                                                }
                                              } catch (error) {
                                                supportingDocs = [];
                                              }
                                              return supportingDocs.length > 0
                                                ? supportingDocs.map((doc, docIndex) => (
                                                    <div key={docIndex}>
                                                      {/\.(pdf)$/i.test(doc) ? (
                                                        <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} target="_blank" rel="noopener noreferrer">
                                                          View {docIndex + 1}
                                                        </a>
                                                      ) : (
                                                        <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} download>
                                                          Download {docIndex + 1}
                                                        </a>
                                                      )}
                                                    </div>
                                                  ))
                                                : "--";
                                            })()}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr>
                                      <td colSpan="15" className="text-center no-data-message">
                                        No Data Found
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="d-flex justify-content-between mb-4">
                              <button className="btn btn-primary" onClick={handleBackToSearch}>
                                NEW
                              </button>
                              {user?.user_type === USER_VENDOR && hasHoldStatus && (
                                <button className="btn btn-primary" onClick={handleHoldActionClick} disabled={isActionDisabled}>
                                  HOLD ACTION
                                </button>
                              )}
                            </div>

                            {/* Filter Card (ViewOnly-style) */}
                            <div className="card mb-3 border-0" style={{ backgroundColor: "#2a2d93", borderRadius: "12px" }}>
                              <div className="card-body py-3">
                                <div className="row g-3 align-items-end">
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">Vendor Code</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={filtervendor_code}
                                      onChange={(e) => {
                                        console.log("Vendor Code filter changed to:", e.target.value);
                                        setFiltervendor_code(e.target.value);
                                      }}
                                      placeholder="Vendor Code"
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">PO No</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={filterPoNo}
                                      onChange={(e) => {
                                        console.log("PO No filter changed to:", e.target.value);
                                        setFilterPoNo(e.target.value);
                                      }}
                                      placeholder="PO No"
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">Unit</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={filterUnit}
                                      onChange={(e) => {
                                        console.log("Unit filter changed to:", e.target.value);
                                        setFilterUnit(e.target.value);
                                      }}
                                      placeholder="Unit"
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">RC No</label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      value={filterRcNo}
                                      onChange={(e) => {
                                        console.log("RC No filter changed to:", e.target.value);
                                        setFilterRcNo(e.target.value);
                                      }}
                                      placeholder="RC No"
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">Month</label>
                                    <HrSearchableSelect
                                      options={monthOptions}
                                      value={filterMonth}
                                      onChange={(option) => setFilterMonth(option ? option.value : "")}
                                      placeholder="Month"
                                      isClearable={true}
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">Year</label>
                                    <HrSearchableSelect
                                      options={yearOptions}
                                      value={filterYear}
                                      onChange={(option) => setFilterYear(option ? option.value : "")}
                                      placeholder="Year"
                                      isClearable={true}
                                    />
                                  </div>
                                  <div className="col-md-2">
                                    <label className="form-label fw-semibold small mb-1 text-white">Status</label>
                                    <HrSearchableSelect
                                      options={statusOptions}
                                      value={filterStatus}
                                      onChange={(option) => setFilterStatus(option ? option.value : "")}
                                      placeholder="Status"
                                      isClearable={true}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Table Card (ViewOnly-style) */}
                            <div className="card">
                              <div className="d-flex align-items-center justify-content-between m-2">
                                <span className="fw-bold">Total Records: {totalCountView}</span>
                                <select className="form-select" style={{ width: "100px" }} value={itemsPerPageView} onChange={handleRecordsPerPageChange}>
                                  <option value="10">10</option>
                                  <option value="20">20</option>
                                  <option value="50">50</option>
                                  <option value="100">100</option>
                                  <option value="All">All</option>
                                </select>
                              </div>
                              <div className="table-responsive">
                                <table className="table table-hover table-bordered mb-0 align-middle small">
                                  <thead className="table-light">
                                    <tr>
                                      <th>
                                        <input type="checkbox" checked={selectAll} onChange={handleViewSelectAll} />
                                      </th>
                                      <th>Vendor Code</th>
                                      <th>PO No</th>
                                      <th>Unit</th>
                                      <th>RC No</th>
                                      <th>Compl Month</th>
                                      <th>Compl Year</th>
                                      <th>PF</th>
                                      <th>ESI</th>
                                      <th>WAGES</th>
                                      <th>EL</th>
                                      <th>BONUS</th>
                                      <th>OTHERS</th>
                                      <th>File</th>
                                      <th>Supp Doc</th>
                                      <th className="px-2 py-2">Submission Date</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {viewApi.length > 0 ? (
                                      viewApi.map((row, index) => (
                                        <tr key={index}>
                                          <td>
                                            <input type="checkbox" checked={selectedRows.some((item) => item.index === index)} onChange={() => handleRowSelect(index, row)} />
                                          </td>
                                          <td>{row.vendor_code || "--"}</td>
                                          <td>{row.purchasing_doc_no || "--"}</td>
                                          <td>{row.unit || "--"}</td>
                                          <td>{row.rc_no || "--"}</td>
                                          <td>{monthOptions.find((opt) => opt.value === row.compliance_month)?.label || "--"}</td>
                                          <td>{row.compliance_year || "--"}</td>
                                          <td>{row.pf === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>{row.esi === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>{row.wages === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>{row.leave_salary === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>{row.bonus === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>{row.others === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                          <td>
                                            {row.file1 ? (
                                              /\.(pdf)$/i.test(row.file1) ? (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} target="_blank" rel="noopener noreferrer">
                                                  View
                                                </a>
                                              ) : (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} download>
                                                  View
                                                </a>
                                              )
                                            ) : (
                                              "--"
                                            )}
                                          </td>
                                          <td>
                                            {(() => {
                                              let supportingDocs = [];
                                              try {
                                                supportingDocs = row.supporting_doc ? JSON.parse(row.supporting_doc) : [];
                                                if (!Array.isArray(supportingDocs)) {
                                                  supportingDocs = [];
                                                }
                                              } catch (error) {
                                                supportingDocs = [];
                                              }
                                              return supportingDocs.length > 0
                                                ? supportingDocs.map((doc, docIndex) => (
                                                    <div key={docIndex}>
                                                      {/\.(pdf)$/i.test(doc) ? (
                                                        <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} target="_blank" rel="noopener noreferrer">
                                                          View {docIndex + 1}
                                                        </a>
                                                      ) : (
                                                        <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} download>
                                                          Download {docIndex + 1}
                                                        </a>
                                                      )}
                                                    </div>
                                                  ))
                                                : "--";
                                            })()}
                                          </td>
                                          <td>{formatDate(row.created_at)}</td>
                                          <td>
                                            {showStatus(row)}
                                            {showRemarks(row) && (
                                              <BsChatRightText
                                                size={15}
                                                className="text-primary cursor-pointer"
                                                onClick={() => {
                                                  setSelectedRowRemarks(showRemarks(row));
                                                  setShowRemarksModal(true);
                                                }}
                                              />
                                            )}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="15" className="text-center no-data-message">
                                          No Compliance Data Found
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                              {itemsPerPageView !== "All" && (
                                <div className="d-flex justify-content-center mt-3">
                                  <ReactPaginate
                                    breakLabel="..."
                                    nextLabel="Next >"
                                    onPageChange={handlePageClick}
                                    pageRangeDisplayed={3}
                                    marginPagesDisplayed={2}
                                    pageCount={Math.max(1, Math.ceil((totalCountView || viewApi.length) / Number(itemsPerPageView || 1)))}
                                    previousLabel="< Prev"
                                    renderOnZeroPageCount={null}
                                    containerClassName="pagination"
                                    activeClassName="active"
                                    previousClassName="prev"
                                    nextClassName="next"
                                    disabledClassName="disabled"
                                    breakClassName="break"
                                    forcePage={currentPageView}
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        <Modal show={showModal} onHide={closeModal} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>Compliances</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <Form>
                              <Form.Group className="mb-3">
                                <Form.Label>Compliance Options</Form.Label>
                                <MultiSearchableSelect
                                  options={complianceOptions}
                                  value={selectedOptions}
                                  onChange={setSelectedOptions}
                                  placeholder="Select compliance options..."
                                />
                              </Form.Group>
                              {/* <Form.Group className="mb-3 d-flex align-items-center">
                                <div style={{ flex: 1 }}>
                                  <Form.Label>Support File (PDF)</Form.Label>
                                  <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                                </div>
                                <Button variant="primary" onClick={handleSubmitr} disabled={isUploading} style={{ marginLeft: "10px", marginTop: "32px" }}>
                                  {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                              </Form.Group> */}
                              <Form.Group className="mb-3">
                                <Form.Label className="d-flex align-items-center gap-2">
                                  Support File (PDF)
                                  <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                </Form.Label>
                                <div className="d-flex align-items-start gap-2">
                                  <div style={{ flex: 1 }}>
                                    <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                                    <FileUploadProgressBar file={complianceFile} isUploading={isUploading} />
                                  </div>
                                  <Button variant="primary" onClick={handleSubmitr} disabled={isUploading} style={{ marginTop: "1px", whiteSpace: "nowrap" }}>
                                    {isUploading ? "Uploading..." : "Upload"}
                                  </Button>
                                </div>
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Unit</Form.Label>
                                <HrSearchableSelect
                                  options={unitOptions}
                                  value={selectedUnit ? selectedUnit.value : ""}
                                  onChange={(option) => setSelectedUnit(option)}
                                  placeholder="Select Units..."
                                  isDisabled={selectedType === "RC"}
                                />
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Compliance Month</Form.Label>
                                <HrSearchableSelect
                                  options={monthOptions}
                                  value={selectedMonth}
                                  onChange={(option) => setSelectedMonth(option ? option.value : "")}
                                  placeholder="Select Month..."
                                />
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Compliance Year</Form.Label>
                                <HrSearchableSelect
                                  options={yearOptions}
                                  value={selectedYear}
                                  onChange={(option) => setSelectedYear(option ? option.value : "")}
                                  placeholder="Select Year..."
                                />
                              </Form.Group>
                            </Form>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={closeModal}>
                              Close
                            </Button>
                            <Button variant="primary" onClick={handleSubmit}>
                              Submit
                            </Button>
                          </Modal.Footer>
                        </Modal>
                        <Modal show={showRemarksModal} onHide={() => setShowRemarksModal(false)} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>Remarks</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <p>{selectedRowRemarks || "No remarks available."}</p>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowRemarksModal(false)}>
                              Close
                            </Button>
                          </Modal.Footer>
                        </Modal>
                        <Modal show={showModalSupportingDoc} onHide={closeModalSupportingDoc} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>Upload Supporting Document</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <Form>
                              <Form.Group className="mb-3 d-flex align-items-center">
                                <div style={{ flex: 1 }}>
                                  <Form.Label className="d-flex align-items-center gap-2">
                                    Supporting Document (PDF or ZIP)
                                    <FileUploadInfoIcon />
                                  </Form.Label>
                                  <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                                </div>
                                <Button variant="primary" onClick={handleSupportingDocUpload} disabled={isUploading} style={{ marginLeft: "10px", marginTop: "32px" }}>
                                  {isUploading ? "Uploading..." : "Upload"}
                                </Button>
                              </Form.Group>
                            </Form>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={closeModalSupportingDoc}>
                              Close
                            </Button>
                            <Button variant="primary" onClick={handleSupportingDocSubmit} disabled={!supportingDocUploadResponse?.data?.filePath}>
                              Submit
                            </Button>
                          </Modal.Footer>
                        </Modal>
                      </div>
                    </div>
                  </div>
                )}
                {user?.department_id === USER_HSL_HR && (user?.internal_role_id === ASSIGNER || user?.internal_role_id === STAFF) && (
                  <div className="row g-5 g-xl-8 mt-3">
                    <div className="col-12">
                      <div className="card p-4">
                        <h4 className="mb-4 fw-bold">Compliance View</h4>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                          {user?.internal_role_id === ASSIGNER && (
                            <button className="btn btn-primary" onClick={handleActionClickHR} style={{ marginRight: "10px" }} disabled={isActionDisabled}>
                              ACTION
                            </button>
                          )}
                          {user?.internal_role_id === STAFF && (
                            <button className="btn btn-primary" onClick={handleActionClickRetailer} style={{ marginRight: "10px" }} disabled={isActionDisabled}>
                              ACTION
                            </button>
                          )}
                        </div>

                        {/* Filter Card (ViewOnly-style) */}
                        <div className="card mb-3 border-0" style={{ backgroundColor: "#2a2d93", borderRadius: "12px" }}>
                          <div className="card-body py-3">
                            <div className="row g-3 align-items-end">
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Vendor Code</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filtervendor_code}
                                  onChange={(e) => {
                                    console.log("Vendor Code filter changed to:", e.target.value);
                                    setFiltervendor_code(e.target.value);
                                  }}
                                  placeholder="Vendor Code"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">PO No</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterPoNo}
                                  onChange={(e) => {
                                    console.log("PO No filter changed to:", e.target.value);
                                    setFilterPoNo(e.target.value);
                                  }}
                                  placeholder="PO No"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Unit</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterUnit}
                                  onChange={(e) => {
                                    console.log("Unit filter changed to:", e.target.value);
                                    setFilterUnit(e.target.value);
                                  }}
                                  placeholder="Unit"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">RC No</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={filterRcNo}
                                  onChange={(e) => {
                                    console.log("RC No filter changed to:", e.target.value);
                                    setFilterRcNo(e.target.value);
                                  }}
                                  placeholder="RC No"
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Month</label>
                                <HrSearchableSelect
                                  options={monthOptions}
                                  value={filterMonth}
                                  onChange={(option) => setFilterMonth(option ? option.value : "")}
                                  placeholder="Month"
                                  isClearable={true}
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Year</label>
                                <HrSearchableSelect
                                  options={yearOptions}
                                  value={filterYear}
                                  onChange={(option) => setFilterYear(option ? option.value : "")}
                                  placeholder="Year"
                                  isClearable={true}
                                />
                              </div>
                              <div className="col-md-2">
                                <label className="form-label fw-semibold small mb-1 text-white">Status</label>
                                <HrSearchableSelect
                                  options={statusOptions}
                                  value={filterStatus}
                                  onChange={(option) => setFilterStatus(option ? option.value : "")}
                                  placeholder="Status"
                                  isClearable={true}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Table Card (ViewOnly-style) */}
                        <div className="card">
                          <div className="d-flex align-items-center justify-content-between m-2">
                            <span className="fw-bold">Total Records: {totalCountView}</span>
                            <select className="form-select" style={{ width: "100px" }} value={itemsPerPageView} onChange={handleRecordsPerPageChange}>
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                              <option value="All">All</option>
                            </select>
                          </div>
                          <div className="table-responsive">
                            <table className="table table-hover table-bordered mb-0 align-middle small">
                              <thead className="table-light">
                                <tr>
                                  <th>
                                    <input type="checkbox" checked={selectAll} onChange={handleViewSelectAll} />
                                  </th>
                                  <th>Vendor Code</th>
                                  <th>PO Number</th>
                                  <th>Unit</th>
                                  <th>RC No</th>
                                  <th>Compl Month</th>
                                  <th>Compl Year</th>
                                  <th>PF</th>
                                  <th>ESI</th>
                                  <th>WAGES</th>
                                  <th>EL</th>
                                  <th>BONUS</th>
                                  <th>OTHERS</th>
                                  <th>File</th>
                                  <th>Supp Doc</th>
                                  <th className="px-2 py-2">Submission Date</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {viewApi.length > 0 ? (
                                  viewApi.map((row, index) => (
                                    <tr key={index}>
                                      <td>
                                        <input type="checkbox" checked={selectedRows.some((item) => item.index === index)} onChange={() => handleRowSelect(index, row)} />
                                      </td>
                                      <td>{row.vendor_code || "--"}</td>
                                      <td>{row.purchasing_doc_no || "--"}</td>
                                      <td>{row.unit || "--"}</td>
                                      <td>{row.rc_no || "--"}</td>
                                      <td>{monthOptions.find((opt) => opt.value === row.compliance_month)?.label || "--"}</td>
                                      <td>{row.compliance_year || "--"}</td>
                                      <td>{row.pf === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.esi === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.wages === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.leave_salary === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.bonus === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>{row.others === "Y" ? <span className="compliance-check">✔</span> : <span className="compliance-cross">✘</span>}</td>
                                      <td>
                                        {row.file1 ? (
                                          /\.(pdf)$/i.test(row.file1) ? (
                                            <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} target="_blank" rel="noopener noreferrer">
                                              View
                                            </a>
                                          ) : (
                                            <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} download>
                                              View
                                            </a>
                                          )
                                        ) : (
                                          "--"
                                        )}
                                      </td>
                                      <td>
                                        {(() => {
                                          let supportingDocs = [];
                                          try {
                                            supportingDocs = row.supporting_doc ? JSON.parse(row.supporting_doc) : [];
                                            if (!Array.isArray(supportingDocs)) {
                                              supportingDocs = [];
                                            }
                                          } catch (error) {
                                            supportingDocs = [];
                                          }
                                          return supportingDocs.length > 0
                                            ? supportingDocs.map((doc, docIndex) => (
                                                <div key={docIndex}>
                                                  {/\.(pdf)$/i.test(doc) ? (
                                                    <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} target="_blank" rel="noopener noreferrer">
                                                      View {docIndex + 1}
                                                    </a>
                                                  ) : (
                                                    <a href={`${process.env.REACT_APP_PDF_URL}/${doc}`} download>
                                                      Download {docIndex + 1}
                                                    </a>
                                                  )}
                                                </div>
                                              ))
                                            : "--";
                                        })()}
                                      </td>
                                      <td>{formatDate(row.created_at)}</td>
                                      <td>
                                        {showStatus(row)}
                                        {showRemarks(row) && (
                                          <BsChatRightText
                                            size={15}
                                            className="text-primary cursor-pointer"
                                            onClick={() => {
                                              setSelectedRowRemarks(showRemarks(row));
                                              setShowRemarksModal(true);
                                            }}
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan="15" className="text-center no-data-message">
                                      No Compliance Data Found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          {itemsPerPageView !== "All" && (
                            <div className="d-flex justify-content-center mt-3">
                              <ReactPaginate
                                breakLabel="..."
                                nextLabel="Next >"
                                onPageChange={handlePageClick}
                                pageRangeDisplayed={3}
                                marginPagesDisplayed={2}
                                pageCount={Math.max(1, Math.ceil((totalCountView || viewApi.length) / Number(itemsPerPageView || 1)))}
                                previousLabel="< Prev"
                                renderOnZeroPageCount={null}
                                containerClassName="pagination"
                                activeClassName="active"
                                previousClassName="prev"
                                nextClassName="next"
                                disabledClassName="disabled"
                                breakClassName="break"
                                forcePage={currentPageView}
                              />
                            </div>
                          )}
                        </div>
                        <Modal show={showModalhr} onHide={closeModalHR} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>HR</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <Form>
                              <Form.Group className="mb-3">
                                <Form.Label>HR Approval Process</Form.Label>
                                <HrSearchableSelect
                                  options={[
                                    { value: "APPROVED", label: "APPROVED" },
                                    { value: "REJECTED", label: "REJECTED" },
                                    { value: "HOLD_BY_HR", label: "HOLD" },
                                  ]}
                                  value={selectedOptionsHr ? selectedOptionsHr.value : ""}
                                  onChange={(option) => setSelectedOptionsHr(option)}
                                  placeholder="Select compliance options..."
                                />
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Remarks</Form.Label>
                                <Form.Control as="textarea" rows={3} placeholder="Enter remarks here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                              </Form.Group>
                            </Form>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={closeModalHR}>
                              Close
                            </Button>
                            <Button variant="primary" onClick={handleSubmitHR}>
                              Submit
                            </Button>
                          </Modal.Footer>
                        </Modal>
                        <Modal show={showModalretailer} onHide={closeModalRetailer} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>RETAILER ENTRY</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <Form>
                              <Form.Group className="mb-3">
                                <Form.Label>RETAILER ENTRY</Form.Label>
                                <HrSearchableSelect
                                  options={[
                                    { value: "RECOMMEND", label: "RECOMMEND" },
                                    { value: "NOT_RECOMMEND", label: "NOT RECOMMEND" },
                                    { value: "HOLD_BY_HR_RECIPIENT", label: "HOLD" },
                                  ]}
                                  value={selectedOptionsRetailer ? selectedOptionsRetailer.value : ""}
                                  onChange={(option) => setSelectedOptionsRetailer(option)}
                                  placeholder="Select compliance options..."
                                />
                              </Form.Group>
                              <Form.Group className="mb-3">
                                <Form.Label>Remarks</Form.Label>
                                <Form.Control as="textarea" rows={3} placeholder="Enter remarks here..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                              </Form.Group>
                            </Form>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={closeModalRetailer}>
                              Close
                            </Button>
                            <Button variant="primary" onClick={handleSubmitRetailer}>
                              Submit
                            </Button>
                          </Modal.Footer>
                        </Modal>
                        <Modal show={showRemarksModal} onHide={() => setShowRemarksModal(false)} centered>
                          <Modal.Header closeButton>
                            <Modal.Title>Remarks</Modal.Title>
                          </Modal.Header>
                          <Modal.Body>
                            <p>{selectedRowRemarks || "No remarks available."}</p>
                          </Modal.Body>
                          <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowRemarksModal(false)}>
                              Close
                            </Button>
                          </Modal.Footer>
                        </Modal>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrContractvendor;
