import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaCaretLeft, FaCloudUploadAlt, FaFileExcel, FaInfoCircle, FaTimes, FaCheckCircle } from "react-icons/fa";
import MainHeader from "../components/MainHeader";
import Footer from "../components/Footer";
import DynamicButton from "../Helpers/DynamicButton";
import { DEPT_FI, DEPT_IT } from "../constants/userConstants";

const GstUpload = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Check if current user belongs to Finance or IT / dev admin
  const isFinance =
    Number(user?.department_id) === DEPT_FI ||
    Number(user?.user_type) === DEPT_FI ||
    user?.department_id === DEPT_IT ||
    user?.vendor_code === "601824" ||
    user?.vendor_code === "600233" ||
    user?.vendor_code === "602717";

  const handleFileValidation = (file) => {
    if (!file) return false;
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileName = file.name?.toLowerCase() || "";
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      toast.error("Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.");
      if (fileInputRef.current) fileInputRef.current.value = null;
      return false;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File size exceeds 25MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = null;
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && handleFileValidation(file)) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file && handleFileValidation(file)) {
      setSelectedFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      toast.warning("Please choose an Excel file to upload.");
      return;
    }

    setIsUploading(true);

    try {
      /*
        NOTE: Backend API for Excel upload pending.
        Jab backend API provide karega:
        const formData = new FormData();
        formData.append("file", selectedFile);
        const response = await apiCallBack("POST", "po/gst/upload-records", formData, token);
        if (response?.status || response?.success) {
          toast.success(response?.message || "GST records uploaded successfully!");
          handleRemoveFile();
        } else {
          toast.error(response?.message || "Failed to upload GST records.");
        }
      */

      setTimeout(() => {
        toast.info(
          `File "${selectedFile.name}" selected successfully! Upload API integration will be enabled as soon as the backend endpoint is provided.`,
          { autoClose: 5000 }
        );
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error("GST upload error:", error);
      toast.error("Error uploading file: " + (error?.message || "Unknown error"));
      setIsUploading(false);
    }
  };

  if (!isFinance) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <MainHeader title="GST Upload" />
        <div className="container py-5 text-center flex-grow-1">
          <div className="card shadow-sm p-5 mx-auto" style={{ maxWidth: "600px" }}>
            <h4 className="text-danger mb-3">Access Restricted</h4>
            <p className="text-muted">GST Upload functionality is only accessible to Finance Department users.</p>
            <div className="mt-3">
              <button className="btn btn-primary" onClick={() => navigate("/po")}>
                Back to PO List
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <MainHeader title="GST Upload" />

      <div className="content d-flex flex-column flex-column-fluid">
        <div className="container py-4 flex-grow-1">
          {/* Header Bar */}
          <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
            <div className="d-flex align-items-center">
              <button
                className="btn btn-sm btn-outline-secondary me-3 d-inline-flex align-items-center"
                type="button"
                onClick={() => navigate("/po")}
                title="Back to PO List"
              >
                <FaCaretLeft className="fs-5 me-1" /> Back
              </button>
              <div>
                <h3 className="mb-0 fw-bold text-dark">GST Records - Excel Upload</h3>
                <small className="text-muted">Finance Department Portal for Bulk GST Records Management</small>
              </div>
            </div>
          </div>

          <div className="row g-4 justify-content-center">
            {/* Upload Card */}
            <div className="col-12 col-lg-8">
              <div className="card shadow-sm border-0">
                <div className="card-header bg-white py-3 border-bottom">
                  <h5 className="card-title mb-0 fw-semibold text-primary d-flex align-items-center gap-2">
                    <FaFileExcel className="text-success" /> Upload GST Records File
                  </h5>
                </div>

                <div className="card-body p-4">
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: isDragging ? "2px dashed #0d6efd" : "2px dashed #cbd5e1",
                      backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
                      borderRadius: "12px",
                      padding: "40px 20px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease-in-out",
                    }}
                    className="mb-4"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".xlsx, .xls, .csv"
                      style={{ display: "none" }}
                    />
                    <FaCloudUploadAlt size={54} className={isDragging ? "text-primary mb-3" : "text-secondary mb-3"} />
                    <h6 className="fw-bold mb-1">
                      {isDragging ? "Drop your Excel file here" : "Click to select or drag and drop your Excel file here"}
                    </h6>
                    <p className="text-muted small mb-0">Supported formats: Microsoft Excel (.xlsx, .xls) or CSV (.csv)</p>
                  </div>

                  {/* Selected File Details */}
                  {selectedFile && (
                    <div className="alert alert-light border d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="d-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle"
                          style={{ width: "42px", height: "42px" }}
                        >
                          <FaFileExcel size={22} className="text-success" />
                        </div>
                        <div>
                          <div className="fw-bold text-dark">{selectedFile.name}</div>
                          <small className="text-muted">{formatFileSize(selectedFile.size)}</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile();
                        }}
                      >
                        <FaTimes /> Remove
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4"
                      onClick={handleRemoveFile}
                      disabled={!selectedFile || isUploading}
                    >
                      Clear
                    </button>
                    <DynamicButton
                      label={isUploading ? "UPLOADING..." : "UPLOAD EXCEL"}
                      onClick={handleUploadSubmit}
                      className="btn btn-primary px-4 fw-bold"
                      disabled={!selectedFile || isUploading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Information & Guidelines Card */}
            <div className="col-12 col-lg-4">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="card-title mb-0 fw-semibold d-flex align-items-center gap-2 text-secondary">
                    <FaInfoCircle className="text-info" /> Excel Format Guidelines
                  </h6>
                </div>
                <div className="card-body p-4">
                  <p className="text-muted small mb-3">
                    Ensure your Excel spreadsheet contains the necessary columns for GST records:
                  </p>
                  <ul className="list-group list-group-flush small mb-3">
                    <li className="list-group-item px-0 py-2 d-flex justify-content-between">
                      <span className="fw-semibold">gst_no</span>
                      <span className="text-muted">Vendor GSTIN (15 chars)</span>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex justify-content-between">
                      <span className="fw-semibold">vendor_code</span>
                      <span className="text-muted">Vendor Code</span>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex justify-content-between">
                      <span className="fw-semibold">vendor_name</span>
                      <span className="text-muted">Company Name</span>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex justify-content-between">
                      <span className="fw-semibold">gstr_start_date</span>
                      <span className="text-muted">Start Date (YYYY-MM-DD)</span>
                    </li>
                    <li className="list-group-item px-0 py-2 d-flex justify-content-between">
                      <span className="fw-semibold">gstr_end_date</span>
                      <span className="text-muted">End Date (YYYY-MM-DD)</span>
                    </li>
                  </ul>
                  <div className="alert alert-info py-2 px-3 small mb-0">
                    <FaCheckCircle className="me-1" /> Verified records in this sheet will be matched automatically during invoice verification.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GstUpload;
