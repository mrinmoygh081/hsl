import React, { Fragment, useEffect, useRef, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import { apiCallBack } from "../utils/fetchAPIs";
import { clrLegend } from "../utils/clrLegend";
import { groupedByRefNo } from "../utils/groupedByReq";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import { uploadFileStream } from "../utils/uploadFile";
import HrSearchableSelect from "../components/HrSearchableSelect";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { DEPT_DESIGN, DEPT_QAP, USER_VENDOR, ASSIGNER } from "../constants/userConstants";

const QAPSub = () => {
  const qapFileRef = useRef(null);
  const supportingDocRef = useRef(null);
  const { id } = useParams();
  const { user, token, userType } = useSelector((state) => state.auth);

  const isQapDeptOrDesign = user?.department_id === DEPT_QAP || user?.department_id === DEPT_DESIGN;
  const isQapHandler = userType === USER_VENDOR || isQapDeptOrDesign;
  const isQapAssigner = userType !== USER_VENDOR && isQapDeptOrDesign && user?.internal_role_id === ASSIGNER;

  const [isPopup, setIsPopup] = useState(false);
  const [isPopupAssign, setIsPopupAssign] = useState(false);
  const [allQap, setAllQap] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQapUploading, setIsQapUploading] = useState(false);
  const [isSupportingUploading, setIsSupportingUploading] = useState(false);
  const initialFormData = {
    reference_no: null,
    action_type: "",
    QapFile: null, // { file_name, file_path }
    remarks: "",
    supporting_doc: [], // [ { file_name, file_path }, ... ]
    assign_to: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [pendingSupportingFiles, setPendingSupportingFiles] = useState([]);
  const [empOption, setEmpOption] = useState([]);
  const [assignData, setAssignData] = useState({
    purchasing_doc_no: id,
    assigned_from: user?.vendor_code || "",
    assigned_to: null,
    remarksallqap: "",
  });
  const [empOptions, setEmpOptions] = useState({
    depts: [],
    emps: [],
  });
  const [selectedDept, setSelectedDept] = useState(null);

  const getEmpList = async () => {
    try {
      const res = await apiCallBack("GET", "po/drawing/assigneeList", null, token);
      if (res?.status) {
        let options =
          res?.data &&
          res.data.map((item) => ({
            value: item.emp_id,
            label: `${item.cname} (${item.emp_id})`,
          }));
        setEmpOption(options || []);
      }
    } catch (error) {
      console.error("Error fetching drawing assignee list:", error);
    }
  };

  const groupedData = useMemo(() => {
    return allQap.length > 0 ? groupedByRefNo(allQap) : {};
  }, [allQap]);

  const tableColumns = isQapHandler ? 8 : 7;

  const fetchDepartments = async () => {
    try {
      const res = await apiCallBack("GET", "po/internalDepartmentList", null, token);
      if (res?.status) {
        const options = res.data.map((dept) => ({
          value: dept.id,
          label: dept.name,
        }));
        setEmpOptions((prev) => ({ ...prev, depts: options }));
      } else {
        toast.error(res?.message || "Failed to fetch departments");
      }
    } catch (error) {
      toast.error("Error fetching departments");
    }
  };

  const fetchEmployees = async (deptId) => {
    try {
      const res = await apiCallBack("GET", `po/internalDepartmentEmpList?sub_dept_id=${deptId}`, null, token);
      if (res?.status) {
        const options = res.data.map((emp) => ({
          value: emp.emp_id,
          label: `${emp.empname} (${emp.emp_id})`,
        }));
        setEmpOptions((prev) => ({ ...prev, emps: options }));
      } else {
        toast.error(res?.message || "Failed to fetch employees");
      }
    } catch (error) {
      toast.error("Error fetching employees");
    }
  };

  const fetchQapList = async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", `po/qapList?poNo=${id}`, null, token);
      if (res?.status) {
        setAllQap(res.data || []);
      } else {
        toast.error(res?.message || "Failed to fetch QAP list");
      }
    } catch (error) {
      toast.error("Error fetching QAP list");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedQap = async () => {
    try {
      const res = await apiCallBack("GET", `po/getQapSave?reference_no=${formData.reference_no}`, null, token);
      if (res?.status && res.data?.length > 0) {
        const { remarks, action_type, QapFile, supporting_doc, assign_to, assigned_to } = res.data[0];
        let parsedQapFile = null;
        if (QapFile) {
          const parsed = JSON.parse(QapFile);
          parsedQapFile = {
            file_name: parsed.fileName,
            file_path: parsed.filePath,
          };
        }
        setFormData((prev) => ({
          ...prev,
          remarks: remarks || "",
          action_type: action_type || "",
          assign_to: assign_to || assigned_to || prev.assign_to || "",
          QapFile: parsedQapFile,
          supporting_doc: supporting_doc
            ? JSON.parse(supporting_doc).map((doc) => ({
                file_name: doc.file_name,
                file_path: doc.file_path,
              }))
            : [],
        }));
      } else {
        setFormData((prev) => ({
          ...initialFormData,
          reference_no: prev.reference_no,
        }));
      }
    } catch (error) {
      toast.error("Error fetching saved QAP data");
      setFormData((prev) => ({
        ...initialFormData,
        reference_no: prev.reference_no,
      }));
    }
  };

  const deleteSavedQap = async () => {
    try {
      const res = await apiCallBack("GET", `po/deleteQapSave?reference_no=${formData.reference_no}`, null, token);
      if (!res?.status) {
        toast.error(res?.message || "Failed to delete saved QAP");
      }
    } catch (error) {
      toast.error("Error deleting saved QAP");
    }
  };

  const handleQapFileUpload = async () => {
    const file = qapFileRef.current?.files[0];

    if (!file) {
      toast.warning("Please select a file to upload!");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.warning("Please upload a PDF file!");
      qapFileRef.current.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("File exceeds 5MB size limit!");
      qapFileRef.current.value = null;
      return;
    }

    setIsQapUploading(true);

    await uploadFileStream({
      file,
      token,
      vendorCode: user?.vendor_code,
      onSuccess: (uploadedFile) => {
        setFormData((prev) => ({
          ...prev,
          QapFile: uploadedFile,
        }));
      },
    });

    setIsQapUploading(false);
    qapFileRef.current.value = null;
  };
  const removeQapFile = () => {
    setFormData((prev) => ({ ...prev, QapFile: null }));
    if (qapFileRef.current) qapFileRef.current.value = null;
  };

  const handleSupportingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    if (formData.supporting_doc.length + files.length > 5) {
      toast.warning("Maximum 5 supporting documents allowed!");
      supportingDocRef.current.value = null;
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
    supportingDocRef.current.value = null;
  };

  const removeSupportingFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      supporting_doc: prev.supporting_doc.filter((_, i) => i !== index),
    }));
  };

  const updateQAP = async (status) => {
    const { action_type, QapFile, remarks, supporting_doc, reference_no, assign_to } = formData;

    if (!action_type.trim() || !remarks.trim()) {
      toast.warn("Action type and remarks are mandatory!");
      return;
    }

    if (userType === USER_VENDOR && !reference_no && !assign_to) {
      toast.warn("Please select an Assign Officer!");
      return;
    }

    try {
      await deleteSavedQap();
      const payload = {
        purchasing_doc_no: id,
        reference_no: reference_no || null,
        file: QapFile
          ? {
              fileName: QapFile.file_name,
              filePath: QapFile.file_path,
            }
          : null,
        remarks,
        status,
        updated_by: userType === 1 ? "VENDOR" : "HSL",
        vendor_code: user?.vendor_code || "",
        mailSendTo: user?.email || "default@example.com",
        action_by_name: user?.name || "",
        action_by_id: user?.email || "",
        action_type,
        supporting_doc,
        assign_to: assign_to || null,
        assigned_to: assign_to || null,
      };

      const res = await apiCallBack("POST", "po/qap", payload, token);
      if (res?.status) {
        toast.success("QAP uploaded successfully!");
        setIsPopup(false);
        setFormData(initialFormData);
        setPendingSupportingFiles([]);
        qapFileRef.current && (qapFileRef.current.value = null);
        supportingDocRef.current && (supportingDocRef.current.value = null);
        fetchQapList();
      } else {
        toast.warn(res?.message || "Failed to upload QAP");
      }
    } catch (error) {
      toast.error(`Error uploading QAP: ${error.message}`);
    }
  };

  const saveQAP = async () => {
    const { remarks, action_type, QapFile, supporting_doc, reference_no, assign_to } = formData;

    if (!id) {
      toast.error("PO Number is required!");
      return;
    }
    if (!action_type.trim()) {
      toast.warn("Action Type is mandatory!");
      return;
    }
    if (!remarks.trim()) {
      toast.warn("Remarks are mandatory!");
      return;
    }

    try {
      await deleteSavedQap();
      const payload = new FormData();
      payload.append("purchasing_doc_no", id);
      payload.append("remarks", remarks);
      payload.append("reference_no", reference_no || "");
      payload.append("action_type", action_type);
      if (assign_to) {
        payload.append("assign_to", assign_to);
        payload.append("assigned_to", assign_to);
      }
      if (QapFile) {
        payload.append(
          "file",
          JSON.stringify({
            fileName: QapFile.file_name,
            filePath: QapFile.file_path,
          }),
        );
      }
      payload.append("supporting_doc", JSON.stringify(supporting_doc));

      const res = await apiCallBack("POST", "po/insertQapSave", payload, token);
      if (res?.status) {
        toast.success("QAP saved successfully!");
        setFormData(initialFormData);
        setPendingSupportingFiles([]);
        qapFileRef.current && (qapFileRef.current.value = null);
        supportingDocRef.current && (supportingDocRef.current.value = null);
        setIsPopup(false);
        fetchQapList();
        fetchSavedQap();
      } else {
        toast.error(res?.message || "Failed to save QAP");
      }
    } catch (error) {
      toast.error(`Error saving QAP: ${error.message}`);
    }
  };

  const assignQAP = async () => {
    const { purchasing_doc_no, assigned_from, assigned_to, remarksallqap } = assignData;

    if (!purchasing_doc_no || !assigned_from || !assigned_to || !remarksallqap.trim()) {
      toast.error("All fields are required!");
      return;
    }

    const payload = {
      purchasing_doc_no,
      assigned_from,
      assigned_to,
      remarks: remarksallqap,
      status: "ASSIGNED",
    };

    try {
      const res = await apiCallBack("POST", "po/qap", payload, token); // assuming it sends JSON by default
      if (res?.status) {
        toast.success("QAP assigned successfully!");
        setIsPopupAssign(false);
        setAssignData({
          purchasing_doc_no: id,
          assigned_from: user?.vendor_code || "",
          assigned_to: null,
          remarksallqap: "",
        });
        fetchQapList();
      } else {
        toast.error(res?.message || "Failed to assign QAP");
      }
    } catch (error) {
      toast.error(`Error assigning QAP: ${error.message}`);
    }
  };

  const closePopup = () => {
    setIsPopup(false);
    setFormData(initialFormData);
    setPendingSupportingFiles([]);
    qapFileRef.current && (qapFileRef.current.value = null);
    supportingDocRef.current && (supportingDocRef.current.value = null);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    getEmpList();
  }, [token]);

  useEffect(() => {
    if (selectedDept) fetchEmployees(selectedDept);
  }, [selectedDept]);

  useEffect(() => {
    fetchQapList();
  }, [id, token]);

  useEffect(() => {
    if (formData.reference_no) fetchSavedQap();
  }, [formData.reference_no]);

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="wrapper d-flex flex-column flex-row-fluid">
          <Header title="QAP Submission" id={id} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                <div className="row g-5 g-xl-8">
                  <div className="col-12">
                    <div className="screen_header d-flex align-items-center">
                      {isQapAssigner && (
                        <>
                          <p className="m-0 p-2">
                            {allQap.length > 0 ? (!allQap[allQap.length - 1]?.assigned_to ? "(Not Assigned)" : `Assigned to ${allQap[allQap.length - 1]?.assigned_to}`) : ""}
                          </p>
                          <DynamicButton label="ASSIGN" onClick={() => setIsPopupAssign(true)} className="btn btn-sm fw-bold btn-primary me-2" />
                        </>
                      )}
                      {userType === 1 && (
                        <DynamicButton
                          label="ACTION"
                          onClick={() => {
                            setFormData({
                              ...initialFormData,
                              reference_no: null,
                            });
                            setIsPopup(true);
                          }}
                          className="btn btn-sm fw-bold btn-primary"
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="card-body p-3">
                      <div className="tab-content">
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table_height" aria-label="QAP Submission Table">
                            <thead>
                              <tr className="border-0">
                                <th scope="col">DateTime</th>
                                <th scope="col">Action Type</th>
                                <th scope="col">File Info</th>
                                <th scope="col">Supporting Documents</th>
                                <th scope="col">Action By</th>
                                <th scope="col" className="min-w-150px">
                                  Remarks
                                </th>
                                <th scope="col">Status</th>
                                {isQapHandler && (
                                  <th scope="col" className="min-w-150px">
                                    Action
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {isLoading ? (
                                <tr>
                                  <td colSpan={tableColumns}>
                                    <SkeletonLoader col={tableColumns} row={6} />
                                  </td>
                                </tr>
                              ) : Object.keys(groupedData).length > 0 ? (
                                Object.keys(groupedData).map((refNo, idx) => {
                                  const items = groupedData[refNo];
                                  const allAssigned = items.every((item) => item.status === "ASSIGNED");
                                  return (
                                    <Fragment key={idx}>
                                      <tr>
                                        <td colSpan={7}>
                                          <b>{refNo}</b>
                                        </td>
                                        {isQapHandler && !allAssigned && (
                                          <td>
                                            <DynamicButton
                                              label="ACTION"
                                              onClick={() => {
                                                const lastAssignedItem = items
                                                  .slice()
                                                  .reverse()
                                                  .find((item) => item.assigned_to);
                                                setIsPopup(true);
                                                setFormData((prev) => ({
                                                  ...prev,
                                                  reference_no: refNo,
                                                  assign_to: lastAssignedItem?.assigned_to || "",
                                                }));
                                              }}
                                              className="btn btn-sm fw-bold btn-primary"
                                            />
                                          </td>
                                        )}
                                      </tr>
                                      {items.map((qap, qapIdx) => (
                                        <tr key={qapIdx}>
                                          <td className="table_center">{formatDate(qap.created_at)}</td>
                                          <td>{qap.action_type || "-"}</td>
                                          <td>
                                            {qap.file_name ? (
                                              <a href={formatFilePath(qap.file_path)} target="_blank" rel="noreferrer">
                                                View File
                                              </a>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                          <td>
                                            {qap.supporting_doc && JSON.parse(qap.supporting_doc).length > 0
                                              ? JSON.parse(qap.supporting_doc).map((doc, docIdx) => (
                                                  <div key={docIdx}>
                                                    <a href={formatFilePath(doc.file_path)} target="_blank" rel="noreferrer">
                                                      {/* {doc.file_name} */}
                                                      View File
                                                    </a>
                                                  </div>
                                                ))
                                              : "-"}
                                          </td>
                                          <td>{qap.created_by_id || "-"}</td>
                                          <td>{qap.remarks || "-"}</td>
                                          <td className={`${clrLegend(qap.status)} bold`}>{qap.status || "-"}</td>
                                        </tr>
                                      ))}
                                    </Fragment>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={tableColumns}>No QAP data available</td>
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
            </div>
            <Footer />
          </div>
        </div>
      </div>

      {isQapHandler && (
        <div className={isPopup ? "popup active" : "popup"} style={{ maxWidth: "850px", width: "min(850px, 92%)" }} aria-hidden={!isPopup}>
          <div className="card card-xxl-stretch mb-5 mb-xl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">QAP Status {formData.reference_no ? `for ${formData.reference_no}` : ""}</span>
              </h3>
              <DynamicButton label="Close" onClick={closePopup} className="btn fw-bold btn-danger" />
            </div>
            <form aria-label="QAP Submission Form">
              <div className="row">
                {/* 1. Action Type */}
                <div className="col-12 col-md-6 mb-3">
                  <label htmlFor="action_type" className="form-label">
                    Action Type <span className="text-danger">*</span>
                  </label>
                  <select
                    id="action_type"
                    className="form-select"
                    value={formData.action_type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, action_type: e.target.value }))}
                    aria-required="true"
                  >
                    <option value="">Choose Action Type</option>
                    <option value="UPLOAD QAP File">Upload QAP File</option>
                    <option value="Add Remarks">Add Remarks</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {/* 2. File Info */}
                <div className="col-12 col-md-6 mb-3">
                  <label htmlFor="qap_file" className="form-label d-flex align-items-center gap-2">
                    File Info
                    <FileUploadInfoIcon />
                  </label>
                  <div className="d-flex align-items-center">
                    <input id="qap_file" type="file" className="form-control me-2" ref={qapFileRef} accept=".pdf" disabled={isQapUploading} aria-describedby="qap_file_help" />
                    <DynamicButton label="Upload" onClick={handleQapFileUpload} className="btn btn-primary btn-sm" disabled={isQapUploading} />
                  </div>
                  <small id="qap_file_help" className="form-text text-muted">
                    Upload a single PDF file, up to 5MB.
                  </small>
                  {isQapUploading && <p className="text-muted mt-2">Uploading file...</p>}
                  {formData.QapFile && (
                    <div className="mt-2">
                      <div className="d-flex justify-content-between align-items-center">
                        <span>{formData.QapFile.file_name}</span>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={removeQapFile}
                          disabled={isQapUploading}
                          aria-label={`Remove ${formData.QapFile.file_name}`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Supporting Documents */}
                <div className="col-12 col-md-6 mb-3">
                  <label htmlFor="supporting_doc" className="form-label d-flex align-items-center gap-2">
                    Supporting Documents
                    <FileUploadInfoIcon />
                  </label>
                  <div className="d-flex align-items-center">
                    <input
                      id="supporting_doc"
                      type="file"
                      className="form-control me-2"
                      multiple
                      ref={supportingDocRef}
                      onChange={handleSupportingFileSelect}
                      accept=".pdf"
                      disabled={isSupportingUploading}
                      aria-describedby="supporting_doc_help"
                    />
                    <DynamicButton label="Upload" onClick={handleSupportingFileUpload} className="btn btn-primary btn-sm" disabled={isSupportingUploading} />
                  </div>
                  <small id="supporting_doc_help" className="form-text text-muted">
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
                  {formData.supporting_doc.length > 0 && (
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

                {/* 4. Assign Officer */}
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">
                    Assign Officer
                    {!formData?.reference_no && <span className="text-danger">*</span>}
                  </label>
                  <HrSearchableSelect
                    options={empOption}
                    value={formData?.assign_to}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        assign_to: val?.value || "",
                      }))
                    }
                    placeholder="Select officer"
                    isClearable={true}
                  />
                </div>

                {/* 5. Remarks */}
                <div className="col-12 mb-3">
                  <label htmlFor="remarks" className="form-label">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="remarks"
                    className="form-control"
                    rows="4"
                    value={formData.remarks}
                    onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
                    aria-required="true"
                  />
                </div>

                {/* 6. Action Buttons */}
                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    {userType !== 1 ? (
                      <>
                        <div>
                          <DynamicButton label="SAVE" onClick={saveQAP} className="btn fw-bold btn-primary me-2" />
                          <DynamicButton
                            label="SUBMIT"
                            onClick={() => updateQAP("SUBMITTED")}
                            className="btn fw-bold btn-warning me-2"
                            confirmMessage="Confirm sending info to Vendor?"
                          />
                          {/* <DynamicButton
                            label="ACCEPT"
                            onClick={() => updateQAP("ACCEPTED")}
                            className="btn fw-bold btn-success me-2"
                            confirmMessage="Confirm accepting the QAP? (Not approving)"
                          /> */}
                          <DynamicButton label="REJECT" onClick={() => updateQAP("REJECTED")} className="btn fw-bold btn-danger" confirmMessage="Confirm rejecting the QAP?" />
                        </div>
                        <DynamicButton label="APPROVE" onClick={() => updateQAP("APPROVED")} className="btn fw-bold btn-success" confirmMessage="Confirm approving the QAP?" />
                      </>
                    ) : (
                      <DynamicButton label="SUBMIT" onClick={() => updateQAP("SUBMITTED")} className="btn fw-bold btn-primary" />
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isQapAssigner && (
        <div className={isPopupAssign ? "popup active" : "popup"} aria-hidden={!isPopupAssign}>
          <div className="card card-xxl-stretch mb-5 mb-xl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Assign QAP</span>
              </h3>
              <DynamicButton label="Close" onClick={() => setIsPopupAssign(false)} className="btn fw-bold btn-danger" />
            </div>
            <form aria-label="QAP Assignment Form">
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label htmlFor="empCategory" className="form-label">
                      Employee Category <span className="text-danger">*</span>
                    </label>
                    <HrSearchableSelect
                      id="empCategory"
                      options={empOptions.depts}
                      value={selectedDept}
                      onChange={(val) => setSelectedDept(val ? val.value : null)}
                      placeholder="Select department"
                      isClearable={true}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="empName" className="form-label">
                      Employee Name <span className="text-danger">*</span>
                    </label>
                    <HrSearchableSelect
                      id="empName"
                      options={empOptions.emps}
                      value={assignData.assigned_to}
                      onChange={(val) =>
                        setAssignData((prev) => ({
                          ...prev,
                          assigned_to: val ? val.value : null,
                        }))
                      }
                      placeholder="Select employee"
                      isClearable={true}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="assignRemarks" className="form-label">
                      Remarks <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="assignRemarks"
                      className="form-control"
                      rows="4"
                      value={assignData.remarksallqap}
                      onChange={(e) =>
                        setAssignData((prev) => ({
                          ...prev,
                          remarksallqap: e.target.value,
                        }))
                      }
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <DynamicButton label="ASSIGN" onClick={assignQAP} className="btn fw-bold btn-primary" />
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

export default QAPSub;
