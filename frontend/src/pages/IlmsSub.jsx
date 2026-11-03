import React, { Fragment, useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import { groupedByIlms } from "../utils/groupedByReq";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import { clrLegend } from "../utils/clrLegend";
import { reConfirm } from "../utils/reConfirm";
import Header from "../components/Header";
import SideBar from "../components/SideBar";
import Footer from "../components/Footer";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { uploadFileStream } from "../utils/uploadFile";

const IlmsSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [allData, setAllData] = useState([]);
  const [referenceNo, setreferenceNo] = useState("");
  const ilmsFileRef = useRef(null);
  const supportingDocRef = useRef(null);
  const [isSupportingUploading, setIsSupportingUploading] = useState(false);
  const [pendingSupportingFiles, setPendingSupportingFiles] = useState([]);
  const initialData = { drawingFile: null, remarks: "", supporting_doc: [] };
  const [formData, setFormData] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedActionTypeName, setSelectedActionTypeName] = useState("");
  const { id } = useParams();
  const { user, token, userType } = useSelector((state) => state.auth);
  const isVendor = userType === 1;
  const isIlmsOfficer = user?.department_id === 17;
  const showActionCol = isVendor || isIlmsOfficer;

  const optionss = [{ file_type_name: "Upload ILMS" }, { file_type_name: "Remarks" }, { file_type_name: "Others" }];

  // Fetch ILMS data
  const getData = async () => {
    setIsLoading(true);
    try {
      const data = await apiCallBack("GET", `po/ilms/list?poNo=${id}`, null, token);
      if (data?.status) {
        setAllData(data?.data);
      } else {
        toast.error(data?.message || "Failed to fetch ILMS data");
      }
    } catch (error) {
      toast.error(`Error fetching ILMS data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize grouped data
  const groupedIlms = useMemo(() => groupedByIlms(allData), [allData]);

  useEffect(() => {
    getData();
  }, [id, token]);

  // Handle file input with validation
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== "application/pdf") {
      toast.warn("Please upload a valid PDF file!");
      if (ilmsFileRef.current) ilmsFileRef.current.value = null;
      return;
    }
    setFormData((prev) => ({ ...prev, drawingFile: file }));
  };

  const handleSupportingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (formData.supporting_doc.length + files.length > 5) {
      toast.warning("Maximum 5 supporting documents allowed!");
      if (supportingDocRef.current) supportingDocRef.current.value = null;
      return;
    }
    setPendingSupportingFiles(files);
  };

  const handleSupportingFileUpload = async () => {
    if (pendingSupportingFiles.length === 0) {
      toast.warning("Please select files to upload!");
      return;
    }

    setIsSupportingUploading(true);
    const uploadedFiles = [];

    for (const file of pendingSupportingFiles) {
      if (file.type !== "application/pdf") {
        toast.warning(`${file.name} is not a PDF file!`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.warning(`${file.name} exceeds 5MB size limit!`);
        continue;
      }

      if (formData.supporting_doc.some((d) => d.file_name === file.name)) {
        toast.warning(`${file.name} already uploaded!`);
        continue;
      }

      const result = await uploadFileStream({
        file,
        token,
        vendorCode: user?.vendor_code,
      });

      if (result?.filePath) {
        uploadedFiles.push({
          file_name: file.name,
          file_path: result.filePath,
        });
      }
    }

    setFormData((prev) => ({
      ...prev,
      supporting_doc: [...prev.supporting_doc, ...uploadedFiles],
    }));

    setPendingSupportingFiles([]);
    setIsSupportingUploading(false);
    if (supportingDocRef.current) supportingDocRef.current.value = null;
  };

  const removeSupportingFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      supporting_doc: prev.supporting_doc.filter((_, i) => i !== index),
    }));
  };

  // Handle form submission with mandatory field validation
  const submitHandler = async (flag) => {
    if (!selectedActionTypeName) {
      toast.warn("Please choose an action type!");
      return;
    }
    if (userType === 1 && !formData.drawingFile) {
      toast.warn("Please upload an ILMS file!");
      return;
    }
    if (!formData.remarks.trim()) {
      toast.warn("Please provide remarks!");
      return;
    }
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      if (formData.drawingFile) {
        formDataToSend.append("file", formData.drawingFile);
      }
      formDataToSend.append("remarks", formData.remarks);
      formDataToSend.append("status", flag);
      formDataToSend.append("type", selectedActionTypeName);
      formDataToSend.append("reference_no", referenceNo);
      formDataToSend.append("supporting_doc", JSON.stringify(formData.supporting_doc || []));

      const response = await apiCallBack("POST", "po/ilms/submitILMS", formDataToSend, token);
      if (response?.status) {
        toast.success(response.message);
        setIsPopup(false);
        setFormData(initialData);
        setSelectedActionTypeName("");
        setreferenceNo("");
        setPendingSupportingFiles([]);
        if (ilmsFileRef.current) ilmsFileRef.current.value = null;
        if (supportingDocRef.current) supportingDocRef.current.value = null;
        getData();
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error(`Error uploading ILMS: ${error.message}`);
    }
  };

  // Render table rows
  const renderIlmsRows = () => {
    return Object.keys(groupedIlms).map((groupKey, index) => {
      const items = groupedIlms[groupKey];
      const firstItem = items[0];
      const latestStatus = (items[items.length - 1]?.status || "").toUpperCase();
      const isApprovedOrRejected =
        latestStatus === "APPROVED" ||
        latestStatus === "REJECTED" ||
        items.some((it) => {
          const s = (it?.status || "").toUpperCase();
          return s === "APPROVED" || s === "REJECTED";
        });
      const canAct = !isApprovedOrRejected;
      return (
        <Fragment key={index}>
          <tr>
            <td colSpan={7}>
              <b>{groupKey}</b>
            </td>
            {showActionCol && (
              <td>
                {canAct && (
                  <DynamicButton
                    label="ACTION"
                    onClick={() => {
                      setIsPopup(true);
                      setreferenceNo(firstItem.reference_no);
                      setFormData(initialData);
                      setSelectedActionTypeName("");
                      setPendingSupportingFiles([]);
                      if (ilmsFileRef.current) ilmsFileRef.current.value = null;
                      if (supportingDocRef.current) supportingDocRef.current.value = null;
                    }}
                    className="btn fw-bold btn-primary mx-3"
                  />
                )}
              </td>
            )}
          </tr>
          {items.map((item, i) => (
            <tr key={i}>
              <td style={{ border: "none", background: "none" }}>{formatDate(item?.created_at)}</td>
              <td>
                {item.file_name ? (
                  <a href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer">
                    View File
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td>
                {(() => {
                  try {
                    let docs = item.supporting_doc;
                    if (typeof docs === "string" && docs.trim()) {
                      docs = JSON.parse(docs);
                      if (typeof docs === "string") docs = JSON.parse(docs);
                    }
                    if (Array.isArray(docs) && docs.length > 0) {
                      return docs.map((doc, docIdx) => (
                        <div key={docIdx}>
                          <a href={formatFilePath(doc.file_path)} target="_blank" rel="noreferrer">
                            View File
                          </a>
                        </div>
                      ));
                    }
                  } catch (e) {
                    console.error(e);
                  }
                  return "-";
                })()}
              </td>
              {/* Action By */}
              <td className="min-w-200px text-nowrap">
                {item?.action_by_name
                  ? `${item.action_by_name} ${item?.action_by || item?.created_by_id ? `(${item.action_by || item.created_by_id})` : ""}`.trim()
                  : item?.action_by || item?.created_by_id || "-"}
              </td>

              {/* Action To */}
              <td className="min-w-200px text-nowrap">
                {item?.action_to_name ? `${item.action_to_name} ${item?.action_to ? `(${item.action_to})` : ""}`.trim() : item?.action_to || "-"}
              </td>
              <td>{item?.remarks}</td>
              <td className={`${clrLegend(item?.status)} bold`}>{item.status}</td>
              {showActionCol && <td></td>}
            </tr>
          ))}
        </Fragment>
      );
    });
  };

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="wrapper d-flex flex-column flex-row-fluid">
          <Header title="ILMS Submission" id={id} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                <div className="row g-5 g-xl-8">
                  <div className="col-12">
                    <div className="screen_header">
                      {isVendor && (
                        <DynamicButton
                          label="ACTION"
                          onClick={() => {
                            setreferenceNo("");
                            setFormData(initialData);
                            setSelectedActionTypeName("");
                            setPendingSupportingFiles([]);
                            if (ilmsFileRef.current) ilmsFileRef.current.value = null;
                            if (supportingDocRef.current) supportingDocRef.current.value = null;
                            setIsPopup(true);
                          }}
                          className="btn fw-bold btn-primary mx-3"
                        />
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
                                <th>DateTime</th>
                                <th>ILMS File</th>
                                <th>Supporting Documents</th>
                                <th className="min-w-200px">Action By</th>
                                <th className="min-w-200px">Action To</th>
                                <th className="min-w-150px">Remarks</th>
                                <th>Status</th>
                                {showActionCol && <th>Action</th>}
                              </tr>
                            </thead>
                            <tbody style={{ maxHeight: "100%" }}>
                              {isLoading ? (
                                <tr>
                                  <td colSpan={showActionCol ? 8 : 7}>
                                    <SkeletonLoader col={showActionCol ? 8 : 7} row={6} />
                                  </td>
                                </tr>
                              ) : (
                                renderIlmsRows()
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
            <Footer />
          </div>
        </div>
      </div>

      {(userType === 1 || user.department_id === 17) && (
        <div className={isPopup ? "popup active" : "popup"} style={{ maxWidth: "850px", width: "min(850px, 92%)" }}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">UPLOAD ILMS</span>
              </h3>
              <DynamicButton
                label="Close"
                onClick={() => {
                  setIsPopup(false);
                  setFormData(initialData);
                  setSelectedActionTypeName("");
                  setreferenceNo("");
                  setPendingSupportingFiles([]);
                  if (ilmsFileRef.current) ilmsFileRef.current.value = null;
                  if (supportingDocRef.current) supportingDocRef.current.value = null;
                }}
                className="btn fw-bold btn-danger"
              />
            </div>
            <form>
              <div className="row">
                <div className="col-12">
                  <div className="my-3">
                    <label className="form-label">
                      Action Type <span className="mandatorystart">*</span>
                    </label>
                    <select className="form-select" onChange={(e) => setSelectedActionTypeName(e.target.value)} value={selectedActionTypeName} aria-label="Select ILMS action type">
                      <option value="">Choose Action Type</option>
                      {optionss.map((option, i) => (
                        <option key={i} value={option.file_type_name}>
                          {option.file_type_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center gap-2">
                      ILMS File {userType === 1 && <span className="mandatorystart">*</span>}
                      <FileUploadInfoIcon />
                    </label>
                    <input type="file" ref={ilmsFileRef} className="form-control" onChange={handleFileChange} accept=".pdf" aria-label="Upload ILMS PDF file" />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="ilms_supporting_doc" className="form-label d-flex align-items-center gap-2">
                      Supporting Documents
                      <FileUploadInfoIcon />
                    </label>
                    <div className="d-flex align-items-center">
                      <input
                        id="ilms_supporting_doc"
                        type="file"
                        className="form-control me-2"
                        multiple
                        ref={supportingDocRef}
                        onChange={handleSupportingFileSelect}
                        accept=".pdf"
                        disabled={isSupportingUploading}
                        aria-describedby="ilms_supporting_doc_help"
                      />
                      <DynamicButton
                        label="Upload"
                        onClick={handleSupportingFileUpload}
                        className="btn btn-primary btn-sm"
                        disabled={isSupportingUploading}
                      />
                    </div>
                    <small id="ilms_supporting_doc_help" className="form-text text-muted">
                      Upload up to 5 PDF files, each up to 5MB.
                    </small>
                    {isSupportingUploading && <p className="text-muted mt-2">Uploading files...</p>}
                    {pendingSupportingFiles.length > 0 && (
                      <div className="mt-2">
                        <p className="fw-bold">Selected Files:</p>
                        {pendingSupportingFiles.map((file, idx) => (
                          <div key={idx} className="d-flex justify-content-between align-items-center mt-1">
                            <span>{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.supporting_doc?.length > 0 && (
                      <div className="mt-2">
                        <p className="fw-bold">Uploaded Files:</p>
                        {formData.supporting_doc.map((doc, idx) => (
                          <div key={idx} className="d-flex justify-content-between align-items-center mt-1">
                            <span>{doc.file_name}</span>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeSupportingFile(idx)}
                              disabled={isSupportingUploading}
                              aria-label={`Remove ${doc.file_name}`}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Remarks <span className="mandatorystart">*</span>
                    </label>
                    <textarea
                      rows="4"
                      className="form-control"
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      value={formData.remarks}
                      aria-label="Remarks for ILMS submission"
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    {userType === 1 ? (
                      <DynamicButton label="SUBMIT" onClick={() => submitHandler("SUBMITTED")} className="btn fw-bold btn-primary" />
                    ) : (
                      <DynamicButton label="ACCEPT" onClick={() => submitHandler("ACCEPTED")} className="btn fw-bold btn-primary" />
                    )}
                    {userType !== 1 && user.department_id === 17 && (
                      <div className="d-flex gap-3">
                        <DynamicButton
                          label="APPROVE"
                          onClick={() => reConfirm({ file: true }, () => submitHandler("APPROVED"), "You're approving the ILMS. Please confirm!")}
                          className="btn fw-bold btn-success"
                        />
                        <DynamicButton
                          label="REJECT"
                          onClick={() => reConfirm({ file: true }, () => submitHandler("REJECTED"), "The ILMS file is rejected")}
                          className="btn fw-bold btn-danger"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IlmsSub;
