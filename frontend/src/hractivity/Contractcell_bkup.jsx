import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import sampleFile from "../samplefile/sample.xlsx";
import { Modal, Button, Form } from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDate } from "../utils/getDateTimeNow";
import { ASSIGNER, STAFF, USER_HSL_CONTRACT, USER_HSL_HR, USER_VENDOR } from "../constants/userConstants";

const Contractcell = () => {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [uploadedFilepopup, setUploadedFilepopup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
  const { token, user } = useSelector((state) => state.auth);
  const fileInputRef = useRef();
  const hrUrl = "po/hr/compliance";

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

  //model code popup f
  const complianceOptions = [
    { value: "PF", label: "PF" },
    { value: "ESI", label: "ESI" },
    { value: "WAGES", label: "WAGES" },
    { value: "LEAVE_SALARY", label: "LEAVE_SALARY" },
    { value: "BONUS", label: "BONUS" },
    { value: "OTHERS", label: "OTHERS" },
  ];

  ////handle popup vendor uplod file date put
  const handleFileChangepopup = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === "application/pdf" || file.type === "application/zip")) {
      setSelectedFile(file);
    } else {
      toast.warning("Only PDF and ZIP files are allowed.");
    }
  };

  const handleSubmitr = async () => {
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
  useEffect(() => {
    if (uploadResponse?.data?.filePath) {
      console.log("filePath is available:", uploadResponse.data.filePath);
    }
  }, [uploadResponse]);

  const handleSubmit = async () => {
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

    // Constructing payload with all necessary fields
    const payload = selectedRows.map((row) => {
      return {
        id: row.id,
        file1: uploadResponse.data.filePath,
        compliance_till_date: new Date(selectedDate).getTime(),
        compliance_for: complianceFor,
        rc_no: row.rc_no,
        unit: row.unit,
        purchasing_doc_no: row.purchasing_doc_no,
        type: row.type,
      };
    });

    console.log("Payload being submitted:", payload);

    try {
      const response = await apiCallBack("POST", "po/hr/compliance/entry", payload, token);

      if (response?.status) {
        console.log("Data submitted successfully:", response?.message);
        const responseMessage = response?.data?.[0]?.message || "Data submitted successfully.";
        fetchTableData();
        resetFormFields();
        closeModal();
        toast.success(responseMessage);
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
    setSelectedRows([]);
    setUploadResponse(null);
  };

  //HR SUBMIT
  const handleSubmitHR = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!selectedOptionsHr || !remarks) {
      toast.warning("Please select an option and enter remarks.");
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

        fetchTableData();
        setSelectedOptionsHr(null);
        setRemarks("");
        closeModalHR();
        closeModalHR();
        toast.success(responseMessage);
      } else {
        toast.error(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.error("An error occurred while submitting the data. Please try again.");
    }

    console.log("Submitting Payload:", payload);
  };

  //HR RETALOR
  const handleSubmitRetailer = async () => {
    if (!selectedRows || selectedRows.length === 0) {
      toast.warning("Please select at least one row to proceed.");
      return;
    }
    if (!selectedOptionsRetailer || !remarks) {
      toast.warning("Please select an option and enter remarks.");
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
        fetchTableData();
        setSelectedOptionsRetailer(null);
        setRemarks("");
        closeModalRetailer();
        toast.success(responseMessage);
      } else {
        toast.warning(response?.message || "Failed to submit data. Please check the data and try again.");
      }
    } catch (error) {
      console.error("Data submission failed:", error);
      toast.error("An error occurred while submitting the data. Please try again.");
    }

    console.log("Submitting Payload:", payload);
  };

  //popup close
  const handleActionClick = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    resetFormFields();
    setShowModal(false);
  };

  const handleActionClickHR = () => {
    setShowModalhr(true);
  };

  const closeModalHR = () => {
    setSelectedOptionsHr(null);
    setRemarks("");
    setShowModalhr(false);
  };

  const handleActionClickRetailer = () => {
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
    } else {
      setSelectedRows(tableData.map((row, index) => ({ ...row, index })));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (index, row) => {
    if (selectedRows.some((item) => item.index === index)) {
      setSelectedRows(selectedRows.filter((row) => row.index !== index));
    } else {
      setSelectedRows([...selectedRows, { ...row, index }]);
    }
  };
  console.log("selectedRows", selectedRows);

  //tbale url

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

  useEffect(() => {
    const fetchUnits = async (category) => {
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

    fetchUnits();
  }, [token]);

  const fetchTableData = useCallback(async () => {
    try {
      if (!selectedCategory.trim()) {
        return;
      }

      if (selectedType === "RC" && !selectedUnit.trim()) {
        return;
      }

      const queryParams = new URLSearchParams({
        type: selectedType.toLowerCase(),
        pageSize: "10",
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
  }, [selectedType, selectedCategory, selectedUnit, token]);

  useEffect(() => {
    fetchTableData();
  }, [fetchTableData]);

  useEffect(() => {
    if (user?.department_id !== 0) {
      fetchInitialData();
    }
  }, [user?.department_id]);

  // Fetch Initial Data
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

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title="HR Activity / Contract Cell" />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  {/* File Upload Section */}
                  {user?.department_id === USER_HSL_CONTRACT && (
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card p-4" style={{ maxWidth: "600px", margin: "0 auto" }}>
                          <h4 className="mb-4 fw-bold">Rate Contract Master Data</h4>
                          <div className="d-flex align-items-center gap-3">
                            <input type="file" className="form-control" accept=".xls, .xlsx" ref={fileInputRef} onChange={handleFileChange} />
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

                  {showTable ? (
                    <>
                      <div className="row g-5 g-xl-8 mt-5">
                        <div className="col-12">
                          <div className="card p-4">
                            <h4 className="mb-4 fw-bold">Submit Statutory Compliances</h4>
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
                                    <th>Last Compliances Date</th>
                                    <th>Compliances Upto</th>
                                    {user?.user_type !== USER_VENDOR && <th>Is Recommended</th>}
                                    <th>Status</th>
                                    {/* {user?.internal_role_id === 1 && <th>Vendor Status</th>} */}
                                    {user?.internal_role_id === 1 && user?.department_id !== 0 && <th>Vendor Status</th>}
                                    <th>File View</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Viewapi.length > 0 ? (
                                    Viewapi.map((row, index) => {
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
                                          <td>{row?.rc_no || "--"}</td>
                                          <td>{row?.unit || "--"}</td>
                                          <td>{row.purchasing_doc_no || "--"}</td>
                                          {Object.keys(complianceList).map((header) => (
                                            <td key={header} className="text-center">
                                              {complianceList[header] === "Y" ? <span className="compliance-check">YES ✔</span> : <span className="compliance-cross">NO ✘</span>}
                                            </td>
                                          ))}
                                          <td>{(row?.last_complient_date && formatDate(row?.last_complient_date)) || "--"}</td>
                                          <td>{(row?.compliance_till_date && formatDate(row?.compliance_till_date)) || "--"}</td>

                                          {(user?.department_id === USER_HSL_HR && user.internal_role_id === STAFF) ||
                                            (user.user_type === USER_VENDOR && (
                                              <td
                                                style={{
                                                  color: row.vendor_status === "SUBMITTED" ? "green" : row.vendor_status === "SUBMITTED" ? "red" : "inherit",
                                                }}
                                              >
                                                {row.vendor_status || "--"}
                                              </td>
                                            ))}

                                          {user?.department_id === USER_HSL_HR && (
                                            <>
                                              <td
                                                style={{
                                                  color: row.hr_retailer_status === "RECOMMEND" ? "green" : row.hr_retailer_status === "NOT_RECOMEND" ? "red" : "inherit",
                                                }}
                                              >
                                                {row.hr_retailer_status || "--"}
                                              </td>
                                            </>
                                          )}
                                          {user?.user_type === USER_VENDOR && (
                                            <td
                                              style={{
                                                color: row.hr_status === "APPROVED" ? "green" : row.hr_status === "REJECTED" ? "red" : "inherit",
                                              }}
                                            >
                                              {row.hr_status || "--"}
                                            </td>
                                          )}

                                          <td>
                                            {row.file1 ? (
                                              /\.(pdf)$/i.test(row.file1) ? (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} target="_blank" rel="noopener noreferrer">
                                                  View
                                                </a>
                                              ) : (
                                                <a href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`} download>
                                                  Download Zip File
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
                    </>
                  ) : (
                    <>
                      {/* View Table */}
                      <div className="row g-5 g-xl-8 mt-5">
                        <div className="col-12">
                          <div className="card p-4">
                            <h4 className="mb-4 fw-bold">Submit Statutory Compliances</h4>

                            {/* Select Type */}
                            <div className="d-flex align-items-center justify-content-between">
                              <div style={{ width: "40%" }}>
                                <label className="form-label fw-bold">Contrast Type</label>
                                <select
                                  className="form-select form-select-small"
                                  value={selectedType}
                                  onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    setSelectedCategory("");
                                    setSelectedUnit("");
                                    setTableData([]);
                                  }}
                                >
                                  <option value="">Choose PO/RC</option>
                                  <option value="PO">Purchase Order (PO)</option>
                                  <option value="RC">Rate Contrast (RC)</option>
                                </select>
                              </div>
                              {user?.user_type === USER_VENDOR && (
                                <button className="btn btn-primary" onClick={handleActionClick} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                  ACTION
                                </button>
                              )}

                              {user?.internal_role_id === ASSIGNER && user?.department_id === USER_HSL_HR && (
                                <button className="btn btn-primary" onClick={handleActionClickHR} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                  ACTION
                                </button>
                              )}

                              {user?.internal_role_id === STAFF && user?.department_id === USER_HSL_HR && (
                                <button className="btn btn-primary md-2" onClick={handleActionClickRetailer} style={{ marginRight: "10px", marginLeft: "auto" }}>
                                  ACTION
                                </button>
                              )}
                              <button className="btn btn-secondary" style={{ backgroundColor: "green", color: "white" }} onClick={() => setShowTable(true)}>
                                VIEW
                              </button>
                            </div>

                            {/* Enter Category */}
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

                            {/* Dynamic Unit Dropdown */}
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
                            {/* Table */}
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
                                    <th>LEAVE SALARY</th>
                                    <th>BONUS</th>
                                    <th>OTHERS</th>
                                    <th>Compliances Upto</th>
                                    <th>New Compliances Date</th>
                                    {(user?.department_id === USER_HSL_HR && user.internal_role_id === STAFF) || (user.user_type === USER_VENDOR && <th>Vendor Status</th>)}
                                    {user?.department_id === USER_HSL_HR && <th>Is Recommended</th>}
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tableData.length > 0 ? (
                                    tableData.map((row, index) => {
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

                                          {(user?.department_id === USER_HSL_HR && user.internal_role_id === STAFF) ||
                                            (user.user_type === USER_VENDOR && (
                                              <td
                                                style={{
                                                  color: row.vendor_status === "SUBMITTED" ? "green" : row.vendor_status === "SUBMITTED" ? "red" : "inherit",
                                                }}
                                              >
                                                {row.vendor_status || "--"}
                                              </td>
                                            ))}

                                          {user?.department_id === USER_HSL_HR && (
                                            <>
                                              <td
                                                style={{
                                                  color: row.hr_retailer_status === "RECOMMEND" ? "green" : row.hr_retailer_status === "NOT_RECOMEND" ? "red" : "inherit",
                                                }}
                                              >
                                                {row.hr_retailer_status || "--"}
                                              </td>
                                            </>
                                          )}
                                          {user?.user_type === USER_VENDOR && (
                                            <td
                                              style={{
                                                color: row.hr_status === "APPROVED" ? "green" : row.hr_status === "REJECTED" ? "red" : "inherit",
                                              }}
                                            >
                                              {row.hr_status || "--"}
                                            </td>
                                          )}
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
                                    <Select
                                      options={complianceOptions}
                                      isMulti
                                      isSearchable
                                      onChange={setSelectedOptions}
                                      value={selectedOptions}
                                      placeholder="Select compliance options..."
                                    />
                                  </Form.Group>

                                  <Form.Group className="mb-3 d-flex align-items-center">
                                    <div style={{ flex: 1 }}>
                                      <Form.Label>Support File (PDF or ZIP)</Form.Label>
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
                            {/* hr model*/}
                            <Modal show={showModalhr} onHide={closeModalHR} centered>
                              <Modal.Header closeButton>
                                <Modal.Title>HR</Modal.Title>
                              </Modal.Header>
                              <Modal.Body>
                                <Form>
                                  {/* Compliance Dropdown */}
                                  <Form.Group className="mb-3">
                                    <Form.Label>HR Approval Process</Form.Label>
                                    <Select
                                      isSearchable
                                      options={[
                                        { value: "APPROVED", label: "APPROVED" },
                                        { value: "REJECTED", label: "REJECTED" },
                                      ]}
                                      onChange={(selectedOption) => setSelectedOptionsHr(selectedOption)}
                                      value={selectedOptionsHr}
                                      placeholder="Select compliance options..."
                                    />
                                  </Form.Group>

                                  {/* Remarks Input */}
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

                            {/* Retailer model*/}
                            <Modal show={showModalretailer} onHide={closeModalRetailer} centered>
                              <Modal.Header closeButton>
                                <Modal.Title>RETAILER ENTRY</Modal.Title>
                              </Modal.Header>
                              <Modal.Body>
                                <Form>
                                  {/* Compliance Dropdown */}
                                  <Form.Group className="mb-3">
                                    <Form.Label>RETAILER ENTRY</Form.Label>
                                    <Select
                                      isSearchable
                                      options={[
                                        { value: "RECOMEND", label: "RECOMEND" },
                                        { value: "NOT_RECOMEND", label: "NOT RECOMEND" },
                                      ]}
                                      onChange={(selectedOption) => setSelectedOptionsRetailer(selectedOption)}
                                      value={selectedOptionsRetailer}
                                      placeholder="Select compliance options..."
                                    />
                                  </Form.Group>

                                  {/* Remarks Input */}
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
                    </>
                  )}
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
