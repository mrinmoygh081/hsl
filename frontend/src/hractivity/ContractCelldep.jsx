import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { IoClose } from "react-icons/io5";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import sampleFile from "../samplefile/excel_file_hr2 (3).xlsx";
import { USER_GRSE_CONTRACT } from "../constants/userConstants";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const ContractCelldep = () => {
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
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
      const response = await apiCallBack("POST", `${hrUrl}/upload`, formData, token);
      if (response?.status) {
        toast.success(response.message || "File uploaded successfully!");
        // localStorage.setItem("uploadedFile", JSON.stringify(response.data));
        setUploadedFile(response.data);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", `${hrUrl}/list?type=list&pageSize=20000&pageNo=1`, null, token);
      if (response?.status) {
        setUploadedFile(response.data || []);
      } else {
        toast.error("Failed to fetch initial data.");
      }
    } catch (error) {
      toast.error(`Error fetching initial data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.department_id === USER_GRSE_CONTRACT) {
      fetchInitialData();
    }
  }, [user?.department_id, token]);

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="HR Activity / Contract Cell" />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                {user?.department_id === USER_GRSE_CONTRACT && (
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
                        <div className="mt-4">
                          <button className="btn btn-sm btn-secondary fw-bold" onClick={handleDownloadSample}>
                            Download Sample File
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractCelldep;
