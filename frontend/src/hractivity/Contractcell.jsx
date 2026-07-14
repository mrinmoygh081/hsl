import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import sampleFile from "../samplefile/excel_file_hr2 (3).xlsx";
import { Modal, Button, Form } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDate } from "../utils/getDateTimeNow";
import { ASSIGNER, STAFF, USER_GRSE_CONTRACT, USER_GRSE_HR, USER_VENDOR } from "../constants/userConstants";
import { BsChatRightText } from "react-icons/bs";
import MultiSearchableSelect from "../components/MultiSearchableSelect";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import HrSearchableSelect from "../components/HrSearchableSelect";

const Contractcell = () => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedunit, setSelectedunit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showModalHold, setShowModalHold] = useState(false);
  const [showModalhr, setShowModalhr] = useState(false);
  const [showModalretailer, setShowModalretailer] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [tableData, setTableData] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOptionsHr, setSelectedOptionsHr] = useState(null);
  const [selectedOptionsRetailer, setSelectedOptionsRetailer] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [Viewapi, setViewapi] = useState("");
  const [showTable, setShowTable] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRowRemarks, setSelectedRowRemarks] = useState("");
  const [hasHoldStatus, setHasHoldStatus] = useState(false);
  const { token, user } = useSelector((state) => state.auth);
  const fileInputRef = useRef();
  const hrUrl = "po/hr/compliance";
  const [showHoldRemarksModal, setShowHoldRemarksModal] = useState(false);
  const [isRemarksAcknowledged, setIsRemarksAcknowledged] = useState(false);

  function showStatus(row) {
    return row.hr_status || row.hr_retailer_status || row.vendor_status || "--";
  }

  function showRemarks(row) {
    return row.hr_retailer_remarks || row.hr_remarks || null;
  }

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
      const response = await apiCallBack("POST", hrUrl + "/upload", formData, token);
      if (response?.status) {
        toast.success(response.message || "File uploaded successfully!");
        setUploadedFile(response.data);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast.warning(response.message || "File upload failed.");
      }
    } catch (error) {
      toast.error("Error uploading file: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const complianceOptions = [
    { value: "PF", label: "PF" },
    { value: "ESI", label: "ESI" },
    { value: "WAGES", label: "WAGES" },
    { value: "LEAVE_SALARY", label: "LEAVE_SALARY" },
    { value: "BONUS", label: "BONUS" },
    { value: "OTHERS", label: "OTHERS" },
  ];

  const options = [
    { value: "MAIN", label: "MAIN" },
    { value: "FOJ", label: "FOJ" },
    { value: "RBD", label: "RBD" },
    { value: "61PARK", label: "61PARK" },
    { value: "TU", label: "TU" },
    { value: "DEP", label: "DEP" },
  ];

  const mandatoryOptions = ["PF", "ESI", "WAGES"];

  const isMandatorySelected = () => {
    return mandatoryOptions.every((option) => selectedOptions?.some((selected) => selected.value === option));
  };

  const handleFileChangepopup = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "application/pdf" || file.type === "application/zip")) {
      setSelectedFile(file);
    } else {
      toast.warning("Only PDF and ZIP files are allowed.");
    }
  };

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
      const response = await apiCallBack("POST", "upload/pdf", formData, token);
      console.log(response, "response uplod");
      setUploadResponse(response);
      if (response.data?.filePath) {
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

  const handleSubmitHold = async () => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("type", "hr");
    formData.append("ref", user?.vendor_code);
    formData.append("file", selectedFile);
    try {
      const response = await apiCallBack("POST", "upload/pdf", formData, token);
      console.log(response, "response uplod");
      setUploadResponse(response);
      if (response.data?.filePath) {
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

  useEffect(() => {
    if (uploadResponse?.data?.filePath) {
      console.log("filePath is available:", uploadResponse.data.filePath);
    }
  }, [uploadResponse]);

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
    if (!selectedDate) {
      toast.warning("Please select a compliance till date.");
      return;
    }
    if (!selectedOptions || selectedOptions.length === 0) {
      toast.warning("Please select at least one compliance option.");
      return;
    }
    const complianceFor = selectedOptions.map((option) => option.value);
    const payload = selectedRows.map((row) => ({
      id: row.id,
      file1: uploadResponse.data.filePath,
      compliance_till_date: new Date(selectedDate).getTime(),
      compliance_for: complianceFor,
      rc_no: row.rc_no,
      unit: selectedunit.value,
      purchasing_doc_no: row.purchasing_doc_no,
      type: row.type,
    }));
    console.log("Payload being submitted:", payload);
    try {
      const response = await apiCallBack("POST", "po/hr/compliance/entry", payload, token);
      if (response?.status) {
        console.log("Data submitted successfully:", response?.message);
        const responseMessage = response?.data?.[0]?.message || "Data submitted successfully.";
        await fetchTableDataTWO();
        resetFormFields();
        closeModal();
        toast.success(responseMessage);
        setSelectedRows([]);
        setSelectAll(false);
      } else {
        toast.error(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.warning("An error occurred while submitting the data. Please try again.");
    }
  };

  const handleSubmitHoldFucn = async () => {
    if (!isRemarksAcknowledged) {
      toast.warning("Please acknowledge the remarks by clicking OK before uploading.");
      return;
    }
    if (!uploadResponse?.data?.filePath) {
      toast.warning("Please upload a file first using the Upload button in the modal.");
      return;
    }
    const payload = selectedRows.map((row) => ({
      id: row.id,
      supporting_doc: uploadResponse.data.filePath,
      type: "SU_DOC",
    }));
    try {
      const response = await apiCallBack("POST", "po/hr/compliance/entry", payload, token);
      if (response?.status) {
        const responseMessage = response?.data?.[0]?.message || "Data submitted successfully.";
        await fetchTableDataTWO();
        fetchTableData();
        closeModalHold();
        toast.success(responseMessage);
        setSelectedRows([]);
        setSelectAll(false);
        setHasHoldStatus(false);
      } else {
        toast.error(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.warning("An error occurred while submitting the data. Please try again.");
    }
  };

  const resetFormFields = () => {
    setSelectedOptions([]);
    setSelectedDate(null);
    setUploadResponse(null);
  };

  const handleSubmitHR = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!selectedOptionsHr) {
      toast.warning("Please select an option");
      return;
    }
    const payload = selectedRows.map((row) => ({
      id: row.id,
      hr_status: selectedOptionsHr.value,
      hr_remarks: remarks,
      rc_no: row.rc_no,
      unit: row.unit,
      purchasing_doc_no: row.purchasing_doc_no,
    }));
    try {
      const response = await apiCallBack("POST", "po/hr/compliance/entry", payload, token);
      if (response?.status) {
        console.log("Data submitted successfully:", response);
        const responseMessage = response?.data?.[0]?.message || "Data submitted successfully.";
        await fetchTableDataTWO();
        setSelectedOptionsHr(null);
        setRemarks("");
        closeModalHR();
        toast.success(responseMessage);
        setSelectedRows([]);
        setSelectAll(false);
      } else {
        toast.error(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.error("An error occurred while submitting the data. Please try again.");
    }
    console.log("Submitting Payload:", payload);
  };

  const handleSubmitRetailer = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!selectedOptionsRetailer) {
      toast.warning("Please select an option.");
      return;
    }
    const payload = selectedRows.map((row) => ({
      id: row.id,
      hr_retailer_status: selectedOptionsRetailer.value,
      hr_retailer_remarks: remarks,
      rc_no: row.rc_no,
      unit: row.unit,
      purchasing_doc_no: row.purchasing_doc_no,
    }));
    try {
      const response = await apiCallBack("POST", "po/hr/compliance/entry", payload, token);
      if (response?.status) {
        console.log("Data submitted successfully:", response);
        const responseMessage = response?.data?.[0]?.message || "Data submitted successfully.";
        await fetchTableDataTWO();
        setSelectedOptionsRetailer(null);
        setRemarks("");
        closeModalRetailer();
        toast.success(responseMessage);
        setSelectedRows([]);
        setSelectAll(false);
      } else {
        toast.warning(response?.message || "Failed to submit data. Please try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.error("An error occurred while submitting the data. Please try again.");
    }
    console.log("Submitting Payload:", payload);
  };

  const handleActionClick = () => {
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one checkbox before proceeding!");
      return;
    }
    const statuses = selectedRows.map((row) => showStatus(row));
    const hasHold = statuses.includes("HOLD");
    const hasOtherStatus = statuses.some((status) => status !== "HOLD" && status !== "--");
    if (hasHold && hasOtherStatus) {
      toast.error("You cannot proceed with HOLD status mixed with other statuses.");
      return;
    }
    setShowModal(true);
  };

  const handleHoldClick = () => {
    if (!hasHoldStatus) {
      toast.warning("Please select at least one row with HOLD status to proceed.");
      return;
    }
    setShowHoldRemarksModal(true);
    setIsRemarksAcknowledged(false);
  };

  const closeModal = () => {
    resetFormFields();
    setShowModal(false);
  };

  const closeModalHold = () => {
    setShowModalHold(false);
  };

  const handleActionClickHR = () => {
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one checkbox before proceeding!");
      return;
    }
    setShowModalhr(true);
  };

  const closeModalHR = () => {
    setSelectedOptionsHr(null);
    setRemarks("");
    setShowModalhr(false);
  };

  const handleActionClickRetailer = () => {
    if (selectedRows.length === 0) {
      toast.warning("Please select at least one checkbox before proceeding!");
      return;
    }
    setShowModalretailer(true);
  };

  const closeModalRetailer = () => {
    setSelectedOptionsRetailer(null);
    setRemarks("");
    setShowModalretailer(false);
  };

  const handleDownloadSample = () => {
    const link = document.createElement("a");
    link.href = sampleFile;
    link.download = "sample.xlsx";
    link.click();
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setHasHoldStatus(false);
    } else {
      const statuses = tableData.map((row) => showStatus(row));
      const hasHold = statuses.includes("HOLD");
      const hasOtherStatus = statuses.some((status) => status !== "HOLD");
      if (hasHold && hasOtherStatus) {
        toast.error("You cannot select HOLD status with other statuses at the same time.");
        return;
      }
      setSelectedRows(tableData.map((row, index) => ({ ...row, index })));
      setHasHoldStatus(hasHold);
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (index, row) => {
    setSelectedRows((prevSelectedRows) => {
      let updatedSelectedRows;
      if (prevSelectedRows.some((item) => item.index === index)) {
        updatedSelectedRows = prevSelectedRows.filter((item) => item.index !== index);
      } else {
        const newRowStatus = showStatus(row);
        const existingStatuses = prevSelectedRows.map((r) => showStatus(r));
        if (newRowStatus === "HOLD" && existingStatuses.some((s) => s !== "HOLD")) {
          toast.error("You cannot select HOLD status with other statuses at the same time.");
          return prevSelectedRows;
        }
        if (newRowStatus !== "HOLD" && existingStatuses.includes("HOLD")) {
          toast.error("You cannot select HOLD status with other statuses at the same time.");
          return prevSelectedRows;
        }
        updatedSelectedRows = [...prevSelectedRows, { ...row, index }];
      }
      const hasHold = updatedSelectedRows.some((selectedRow) => showStatus(selectedRow) === "HOLD");
      setHasHoldStatus(hasHold);
      setSelectAll(updatedSelectedRows.length === tableData.length);
      return updatedSelectedRows;
    });
  };

  console.log("selectedRows", selectedRows);

  useEffect(() => {
    const fetchUnits = async (category) => {
      try {
        if (!category) {
          console.error("Category (RC number) is required to fetch units.");
          return;
        }
        const data = await apiCallBack("GET", `po/hr/compliance/list?type=rc&docNo=${category}`, null, token);
        if (data?.status) {
          const uniqueUnits = Array.from(new Set(data.data.map((item) => item.unit))).map((unit) => ({
            id: unit,
            name: `${unit}`,
          }));
          setUnits(uniqueUnits);
        } else {
          setUnits([]);
          toast.error("No units found for the selected RC number.");
        }
      } catch (error) {
        console.error("Error fetching units:", error);
      }
    };
    if (selectedType === "RC" && selectedCategory.trim()) {
      fetchUnits(selectedCategory);
    }
  }, [selectedType, selectedCategory, token]);

  const sortTableData = (data) => {
    const statusOrder = {
      SUBMITTED: 1,
      RECOMMEND: 2,
      NOT_RECOMMEND: 3,
      REJECTED: 4,
      APPROVED: 5,
      HOLD: 6,
      "--": 7,
    };
    return [...data].sort((a, b) => {
      const statusA = showStatus(a);
      const statusB = showStatus(b);
      const orderA = statusOrder[statusA] || 7;
      const orderB = statusOrder[statusB] || 7;
      return orderA - orderB;
    });
  };

  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const data = await apiCallBack("GET", `po/hr/compliance/list?type=view&pageSize=20000&pageNo=1`, null, token);
        console.log(data, "PABKAG");
        if (data?.status) {
          setViewapi(data?.data);
        } else {
          setViewapi([]);
          toast.error("No units found for the selected RC number.");
        }
      } catch (error) {
        console.error("Error fetching units:", error);
      }
    };
    if (showTable) {
      fetchUnits();
    }
  }, [showTable, token]);

  const fetchTableData = async () => {
    try {
      if (!selectedCategory.trim()) {
        return;
      }
      if (selectedType === "RC" && !selectedUnit.trim()) {
        return;
      }
      const queryParams = new URLSearchParams({
        type: selectedType.toLowerCase(),
        pageSize: "20000",
        docNo: selectedCategory,
        pageNo: "1",
        ...(selectedType === "RC" && { unit: selectedUnit }),
      }).toString();
      const data = await apiCallBack("GET", `po/hr/compliance/list?${queryParams}`, null, token);
      if (data?.status) {
        setTableData(data.data || []);
      } else {
        setTableData([]);
        toast.error("No data found for the given category and unit.");
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error("An error occurred while fetching data.");
    }
  };

  const fetchTableDataTWO = async () => {
    try {
      const queryParams = new URLSearchParams({
        type: selectedType.toLowerCase(),
        pageSize: "20000",
        docNo: selectedCategory,
        pageNo: "1",
        ...(selectedType === "RC" && { unit: selectedUnit }),
      }).toString();
      const data = await apiCallBack("GET", `po/hr/compliance/list?${queryParams}`, null, token);
      if (data?.status) {
        setTableData(data.data || []);
      } else {
        setTableData([]);
        toast.error("No data found for the given category and unit.");
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error("An error occurred while fetching data.");
    }
  };

  useEffect(() => {
    if (selectedType && selectedCategory) {
      fetchTableData();
    }
  }, [selectedType, selectedCategory, selectedUnit, token]);

  useEffect(() => {
    if (user?.department_id !== 0) {
      fetchInitialData();
    }
  }, [user?.department_id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", "po/hr/compliance/list?type=list&pageSize=20000&pageNo=1", null, token);
      if (response?.status) {
        setTableData(response.data || []);
      } else {
        toast.error("Failed to fetch initial data.");
      }
    } catch (error) {
      toast.error("Error fetching initial data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = tableData.filter((row) => {
    const query = searchQuery.toLowerCase();
    return (row.rc_no?.toLowerCase() || "").includes(query) || (row.unit?.toLowerCase() || "").includes(query) || (row.purchasing_doc_no?.toLowerCase() || "").includes(query);
  });

  console.log("!isMandatorySelected() && isUploading", isMandatorySelected(), isUploading);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title="HR Activity / Contract Cell" />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  {/* Rate Contract Master Data Section for USER_GRSE_CONTRACT */}
                  {user?.department_id === USER_GRSE_CONTRACT && (
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card p-4" style={{ maxWidth: "600px", margin: "0 auto" }}>
                          <h4 className="mb-4 fw-bold">Rate Contract Master Data</h4>
                          <div className="d-flex align-items-center gap-3">
                            <input type="file" className="form-control" accept=".xls, .xlsx" ref={fileInputRef} onChange={handleFileChange} />
                            <FileUploadInfoIcon />
                            <button className="btn btn-sm btn-primary fw-bold" onClick={handleUpload} disabled={loading || !file}>
                              {loading ? "Uploading..." : "Upload"}
                            </button>
                            {file && (
                              <button
                                className="btn btn-sm btn-danger fw-bold d-flex align-items-center"
                                onClick={() => {
                                  setFile(null);
                                  if (fileInputRef.current) {
                                    fileInputRef.current.value = "";
                                  }
                                }}
                              >
                                <IoClose className="me-1" />
                                Clear
                              </button>
                            )}
                          </div>
                          <div className="mt-4">
                            <button className="btn btn-sm btn-secondary fw-bold" onClick={handleDownloadSample}>
                              Download Sample File
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Statutory Compliances Section for all users */}
                  {user?.internal_role_id === STAFF || user?.department_id === USER_GRSE_HR || user?.department_id === USER_GRSE_CONTRACT ? (
                    <div className="row g-5 g-xl-8 mt-5">
                      <div className="col-12">
                        <div className="card p-4">
                          <h4 className="mb-4 fw-bold">Submit Statutory Compliances main</h4>
                          <div className="d-flex align-items-center justify-content-between">
                            <div style={{ width: "40%" }}>
                              <input className="searchui" type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            {user?.user_type === USER_VENDOR && (
                              <button className="btn btn-primary" onClick={handleActionClick} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                            {user?.internal_role_id === ASSIGNER && user?.department_id === USER_GRSE_HR && (
                              <button className="btn btn-primary" onClick={handleActionClickHR} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                            {user?.internal_role_id === STAFF && user?.department_id === USER_GRSE_HR && (
                              <button className="btn btn-primary md-2" onClick={handleActionClickRetailer} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                          </div>
                          <div style={{ overflowX: "auto" }}>
                            <table className="custom-table custom-table-bordered mt-4">
                              <thead className="custom-table-header">
                                <tr>
                                  <th>
                                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                                  </th>
                                  <th>RC No</th>
                                  <th>Unit</th>
                                  <th>PO</th>
                                  <th>PF</th>
                                  <th>ESI</th>
                                  <th>WAGES</th>
                                  <th>EL</th>
                                  <th>BONUS</th>
                                  <th>OTHERS</th>
                                  <th>comp Upto</th>
                                  <th>New comp Date</th>
                                  <th>Status</th>
                                  <th>file</th>
                                  <th>supporting doc</th>
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
                                            <div
                                              className="icon-container"
                                              style={{
                                                position: "relative",
                                              }}
                                            >
                                              <BsChatRightText
                                                size={15}
                                                className="text-primary cursor-pointer"
                                                onClick={() => {
                                                  console.log("Icon clicked for row:", row);
                                                  setSelectedRowRemarks(showRemarks(row));
                                                  setShowRemarksModal(true);
                                                }}
                                              />
                                            </div>
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
                                          {row.supporting_doc ? (
                                            /\.(pdf)$/i.test(row.supporting_doc) ? (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} target="_blank" rel="noopener noreferrer">
                                                View
                                              </a>
                                            ) : (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} download>
                                                View
                                              </a>
                                            )
                                          ) : (
                                            "--"
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="7" className="text-center no-data-message">
                                      No Data Found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>

                          {/* Modals */}
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
                                <Form.Group className="mb-3 d-flex align-items-center">
                                  <div style={{ flex: 1 }}>
                                    <Form.Label className="d-flex align-items-center gap-2">Support File (PDF or ZIP)<FileUploadInfoIcon /></Form.Label>
                                    <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                                  </div>
                                  <Button variant="primary" onClick={handleSubmitr} disabled={isUploading} style={{ marginLeft: "10px", marginTop: "32px" }}>
                                    {isUploading ? "Uploading..." : "Upload"}
                                  </Button>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                  <Form.Label>Compliances Date Upto</Form.Label>
                                  <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    placeholderText="Choose a date"
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
                                      { value: "HOLD", label: "HOLD" },
                                    ]}
                                    value={selectedOptionsHr ? selectedOptionsHr.value : ""}
                                    onChange={(option) => setSelectedOptionsHr(option)}
                                    placeholder="Select compliance options..."
                                    isClearable={false}
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
                                      { value: "HOLD", label: "HOLD" },
                                    ]}
                                    value={selectedOptionsRetailer ? selectedOptionsRetailer.value : ""}
                                    onChange={(option) => setSelectedOptionsRetailer(option)}
                                    placeholder="Select compliance options..."
                                    isClearable={false}
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
                        </div>
                      </div>
                    </div>
                  ) : showTable ? (
                    <div className="row g-5 g-xl-8 mt-5">
                      <div className="col-12">
                        <div className="card p-4">
                          <h4 className="mb-4 fw-bold">Statutory Compliances</h4>
                          <div className="d-flex align-items-center justify-content-between">
                            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setShowTable(false)}>
                              NEW
                            </button>
                          </div>
                          <div style={{ overflowX: "auto" }}>
                            <table className="custom-table custom-table-bordered mt-4">
                              <thead className="custom-table-header">
                                <tr>
                                  <th>RC No</th>
                                  <th>Unit</th>
                                  <th>PO</th>
                                  <th>PF</th>
                                  <th>ESI</th>
                                  <th>WAGES</th>
                                  <th>LEAVE SALARY</th>
                                  <th>BONUS</th>
                                  <th>OTHERS</th>
                                  <th>Last comp Date</th>
                                  <th>comp Upto</th>
                                  <th>Status</th>
                                  <th>file View</th>
                                  <th>supporting doc</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Viewapi.length > 0 ? (
                                  sortTableData(Viewapi).map((row, index) => {
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
                                        {console.log(row, "row-------------------")}
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
                                            <div
                                              className="icon-container"
                                              style={{
                                                position: "relative",
                                              }}
                                            >
                                              <BsChatRightText
                                                size={15}
                                                className="text-primary cursor-pointer"
                                                onClick={() => {
                                                  console.log("Icon clicked for row:", row);
                                                  setSelectedRowRemarks(showRemarks(row));
                                                  setShowRemarksModal(true);
                                                }}
                                              />
                                            </div>
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
                                          {row.supporting_doc ? (
                                            /\.(pdf)$/i.test(row.supporting_doc) ? (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} target="_blank" rel="noopener noreferrer">
                                                View
                                              </a>
                                            ) : (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} download>
                                                View
                                              </a>
                                            )
                                          ) : (
                                            "--"
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="7" className="text-center no-data-message">
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
                  ) : (
                    <div className="row g-5 g-xl-8 mt-5">
                      <div className="col-12">
                        <div className="card p-4">
                          <h4 className="mb-4 fw-bold">Submit Statutory Compliances main</h4>
                          <div className="d-flex align-items-center justify-content-between">
                            <div style={{ width: "40%" }}>
                              <label className="form-label fw-bold">Contract Type</label>
                              <select
                                className="form-select form-select-small"
                                value={selectedType}
                                onChange={(e) => {
                                  setSelectedType(e.target.value);
                                  setSelectedCategory("");
                                  setSelectedUnit("");
                                }}
                              >
                                <option value="">Choose PO/RC</option>
                                <option value="PO">Purchase Order (PO)</option>
                                <option value="RC">Rate Contract (RC)</option>
                              </select>
                            </div>
                            {!hasHoldStatus && user?.user_type === USER_VENDOR && (
                              <button className="btn btn-primary" onClick={handleActionClick} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                            {user?.user_type === USER_VENDOR && hasHoldStatus && (
                              <button className="btn btn-primary" onClick={handleHoldClick} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                HOLD ACTION
                              </button>
                            )}
                            {user?.internal_role_id === ASSIGNER && user?.department_id === USER_GRSE_HR && (
                              <button className="btn btn-primary" onClick={handleActionClickHR} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                            {user?.internal_role_id === STAFF && user?.department_id === USER_GRSE_HR && (
                              <button className="btn btn-primary md-2" onClick={handleActionClickRetailer} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                ACTION
                              </button>
                            )}
                            <button className="btn btn-secondary" style={{ backgroundColor: "green", color: "white" }} onClick={() => setShowTable(true)}>
                              BACK
                            </button>
                          </div>
                          {selectedType !== "" && (
                            <div className="mb-3">
                              <label className="form-label fw-bold">{selectedType === "PO" ? "Enter Purchase Order" : "Enter RC Number"}</label>
                              <div className="d-flex align-items-center">
                                <input
                                  type="text"
                                  className="form-control"
                                  style={{ width: "40%" }}
                                  value={selectedCategory}
                                  onChange={(e) => setSelectedCategory(e.target.value)}
                                  placeholder={`Enter ${selectedType === "PO" ? "PO" : "RC"} number`}
                                />
                              </div>
                            </div>
                          )}
                          {selectedType === "RC" && (
                            <div className="mb-3">
                              <label className="form-label fw-bold">Select Unit</label>
                              <select className="form-select form-select-small" style={{ width: "40%" }} value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
                                <option value="">Select Unit</option>
                                {units.length > 0 ? (
                                  units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                      {unit.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    No units available
                                  </option>
                                )}
                              </select>
                            </div>
                          )}
                          <div style={{ overflowX: "auto" }}>
                            <table className="custom-table custom-table-bordered mt-4">
                              <thead className="custom-table-header">
                                <tr>
                                  <th>
                                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
                                  </th>
                                  <th>RC No</th>
                                  <th>Unit</th>
                                  <th>PO</th>
                                  <th>PF</th>
                                  <th>ESI</th>
                                  <th>WAGES</th>
                                  <th>EL</th>
                                  <th>BONUS</th>
                                  <th>OTHERS</th>
                                  <th>comp Upto</th>
                                  <th>New comp Date</th>
                                  <th>Status</th>
                                  <th>file</th>
                                  <th>supporting doc</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tableData.length > 0 ? (
                                  sortTableData(tableData).map((row, index) => {
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
                                            <div
                                              className="icon-container"
                                              style={{
                                                position: "relative",
                                              }}
                                            >
                                              <BsChatRightText
                                                size={15}
                                                className="text-primary cursor-pointer"
                                                onClick={() => {
                                                  console.log("Icon clicked for row:", row);
                                                  setSelectedRowRemarks(showRemarks(row));
                                                  setShowRemarksModal(true);
                                                }}
                                              />
                                            </div>
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
                                          {row.supporting_doc ? (
                                            /\.(pdf)$/i.test(row.supporting_doc) ? (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} target="_blank" rel="noopener noreferrer">
                                                View
                                              </a>
                                            ) : (
                                              <a href={`${process.env.REACT_APP_PDF_URL}/${row.supporting_doc}`} download>
                                                View
                                              </a>
                                            )
                                          ) : (
                                            "--"
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="7" className="text-center no-data-message">
                                      No Data Found
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
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
                                <Form.Group className="mb-3 d-flex align-items-center">
                                  <div style={{ flex: 1 }}>
                                    <Form.Label className="d-flex align-items-center gap-2">Support File (PDF or ZIP)<FileUploadInfoIcon /></Form.Label>
                                    <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                                  </div>
                                  <Button variant="primary" onClick={handleSubmitr} disabled={isUploading} style={{ marginLeft: "10px", marginTop: "32px" }}>
                                    {isUploading ? "Uploading..." : "Upload"}
                                  </Button>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                  <Form.Label>Unit</Form.Label>
                                  <HrSearchableSelect
                                    options={options}
                                    value={selectedunit ? selectedunit.value : ""}
                                    onChange={(option) => setSelectedunit(option)}
                                    placeholder="Select Units..."
                                    isClearable={true}
                                  />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                  <Form.Label>Compliances Date Upto</Form.Label>
                                  <DatePicker
                                    selected={selectedDate}
                                    onChange={(date) => setSelectedDate(date)}
                                    dateFormat="yyyy-MM-dd"
                                    className="form-control"
                                    placeholderText="Choose a date"
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
                                    ]}
                                    value={selectedOptionsHr ? selectedOptionsHr.value : ""}
                                    onChange={(option) => setSelectedOptionsHr(option)}
                                    placeholder="Select compliance options..."
                                    isClearable={false}
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
                                    ]}
                                    value={selectedOptionsRetailer ? selectedOptionsRetailer.value : ""}
                                    onChange={(option) => setSelectedOptionsRetailer(option)}
                                    placeholder="Select compliance options..."
                                    isClearable={false}
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
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rate Contract Master Data Table for USER_GRSE_CONTRACT */}
                  {user?.department_id === USER_GRSE_CONTRACT && (
                    <div className="row g-5 g-xl-8 mt-5">
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
                                    <td colSpan="4" className="text-center no-data-message">
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

                  <Modal show={showHoldRemarksModal} onHide={() => {}} centered backdrop="static" keyboard={false}>
                    <Modal.Header>
                      <Modal.Title>HOLD Remarks</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <p>You have to upload supporting documents for all remarks listed below at once. You won’t get another chance to upload later.</p>
                      <div>
                        {selectedRows.length > 0 ? (
                          selectedRows
                            .filter((row) => showStatus(row) === "HOLD")
                            .map((row, index) => {
                              const remarks = showRemarks(row);
                              return remarks ? (
                                <p key={index}>
                                  <strong>Row {index + 1}:</strong> {remarks}
                                </p>
                              ) : null;
                            })
                            .filter(Boolean)
                        ) : (
                          <p>No remarks available for selected HOLD rows.</p>
                        )}
                      </div>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setShowHoldRemarksModal(false);
                          setIsRemarksAcknowledged(true);
                          setShowModalHold(true);
                        }}
                      >
                        OK
                      </Button>
                    </Modal.Footer>
                  </Modal>

                  <Modal show={showModalHold} onHide={closeModalHold} centered>
                    <Modal.Header closeButton>
                      <Modal.Title>Supporting Documents</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                      <Form>
                        <Form.Group className="mb-3 d-flex align-items-center">
                          <div style={{ flex: 1 }}>
                            <Form.Label className="d-flex align-items-center gap-2">Supporting Documents(PDF or ZIP)<FileUploadInfoIcon /></Form.Label>
                            <Form.Control type="file" accept=".pdf,.zip" onChange={handleFileChangepopup} />
                          </div>
                          <Button variant="primary" onClick={handleSubmitHold} disabled={isUploading} style={{ marginLeft: "10px", marginTop: "32px" }}>
                            {isUploading ? "Uploading..." : "Upload"}
                          </Button>
                        </Form.Group>
                      </Form>
                    </Modal.Body>
                    <Modal.Footer>
                      <Button variant="secondary" onClick={closeModal}>
                        Close
                      </Button>
                      <Button variant="primary" onClick={handleSubmitHoldFucn}>
                        Submit
                      </Button>
                    </Modal.Footer>
                  </Modal>
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

export default Contractcell;
