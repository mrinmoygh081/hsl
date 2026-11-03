import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import { clrLegend } from "../utils/clrLegend";
import { groupedByRefNo } from "../utils/groupedByReq";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { checkTypeArr, inputFileChange, inputTypeChange } from "../utils/smallFun";
import { ASSIGNER, DEPT_DESIGN, USER_VENDOR } from "../constants/userConstants";
import HrSearchableSelect from "../components/HrSearchableSelect";
import { uploadFileStream } from "../utils/uploadFile";

const DrawingSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const inputFileRef = useRef(null);
  const supportingDocRef = useRef(null);
  const [isSupportingUploading, setIsSupportingUploading] = useState(false);
  const [pendingSupportingFiles, setPendingSupportingFiles] = useState([]);
  const [alldrawing, setAlldrawing] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const initialData = {
    drawingFile: null,
    remarks: "",
    assign_to: "",
    actionType: "",
    supporting_doc: [],
  };
  const [formData, setFormData] = useState(initialData);
  const { id } = useParams();
  const { user, token, userType } = useSelector((state) => state.auth);
  const { poType } = useSelector((state) => state.selectedPO);
  const [isAssignPopup, setIsAssignPopup] = useState(false);
  const [referenceNo, setreferenceNo] = useState("");
  const [hasContractualDate, setHasContractualDate] = useState(false);
  const [isContractualChecking, setIsContractualChecking] = useState(true);

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
  const [isLoading, setIsLoading] = useState(false);

  const [assign, setAssign] = useState({
    purchasing_doc_no: id,
    assign_to: null,
    remarks: "Assigned to Drawing Employee",
    status: "ASSIGNED",
  });
  const [empOption, setEmpOption] = useState([]);
  const [currentAssign, setCurrentAssign] = useState([]);

  const getAssign = async () => {
    const data = await apiCallBack("GET", `po/drawing/getCurrentAssignee?poNo=${id}`, null, token);
    if (data?.status) {
      setCurrentAssign(data?.data);
    } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
    }
  };
  useEffect(() => {
    getAssign();
    getData();
  }, []);
  const getEmpList = async () => {
    const res = await apiCallBack("GET", `po/drawing/assigneeList`, null, token);
    if (res?.status) {
      let options =
        res?.data &&
        res.data.map((item, index) => {
          return {
            value: item.emp_id,
            label: `${item.cname} (${item.emp_id})`,
          };
        });
      setEmpOption(options || []);
    }
  };

  const getData = async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", `po/drawing/drawingList?poNo=${id}`, null, token);
      if (res?.status && checkTypeArr(res?.data)) {
        setAlldrawing(res?.data || []);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching drawing list:", error);
      setIsLoading(false);
    }
  };

  const checkDrawingContractualDate = async () => {
    setIsContractualChecking(true);
    try {
      // 1. Check via po/poList?search=${id} (exactly matches http://localhost:3000/po table logic)
      const res = await apiCallBack("GET", `po/poList?search=${id}`, null, token);
      if (res?.status && Array.isArray(res?.data) && res.data.length > 0) {
        const matchedPo = res.data.find((p) => String(p.poNumber).trim() === String(id).trim()) || res.data[0];
        const date = matchedPo?.drawing?.contractualSubmissionDate;
        if (date && date !== "--" && date !== "0" && date !== 0) {
          setHasContractualDate(true);
          return;
        }
      }

      // 2. Fallback check via po/details?id=${id}
      const detailsRes = await apiCallBack("GET", `po/details?id=${id}`, null, token);
      if (detailsRes?.status) {
        const poData = Array.isArray(detailsRes.data) ? detailsRes.data[0] : detailsRes.data;
        const timeline = poData?.timeline || [];
        const drawingMilestone = timeline.find(
          (t) => String(t.mid) === "02" || String(t.mid) === "2" || String(t.flag) === "02" || t?.mtext?.toLowerCase()?.includes("drawing")
        );
        if (drawingMilestone?.plan_date && drawingMilestone.plan_date !== "--" && drawingMilestone.plan_date !== "0" && drawingMilestone.plan_date !== 0) {
          setHasContractualDate(true);
          return;
        }
      }

      setHasContractualDate(false);
    } catch (error) {
      console.error("Error checking drawing contractual date:", error);
      setHasContractualDate(false);
    } finally {
      setIsContractualChecking(false);
    }
  };

  useEffect(() => {
    getEmpList();
    getData();
    if (id && token) {
      checkDrawingContractualDate();
    }
  }, [id, token]);

  const assignDrawing = async (flag) => {
    if (assign?.assign_to) {
      const res = await apiCallBack("POST", "po/drawing/submitDrawing", assign, token);
      if (res?.status) {
        setIsAssignPopup(false);
        toast.success(`Successfully assigned to ${assign?.assign_to}`);
        getAssign();
        getData();
      } else {
        toast.warn(res?.message);
      }
    } else {
      toast.warn("Please choose an employee to Assign!");
    }
  };

  const updateDrawing = async (flag) => {
    const { drawingFile, remarks, assign_to, actionType } = formData;

    // Validation checks
    if (flag === "SUBMITTED") {
      // New reference (top ACTION button): drawing file and officer are mandatory.
      // Existing reference (row ACTION button): only action type is mandatory.
      const isNewReference = !referenceNo;
      if (actionType.trim() === "") return toast.warn("Please select action type!");
      if (isNewReference && !drawingFile) return toast.warn("Please upload drawing file!");
      if (isNewReference && assign_to.trim() === "") return toast.warn("Please select an officer to assign!");
    }

    let isApproved = flag;
    let uType;
    if (userType === 1) {
      uType = "VENDOR";
    } else {
      uType = "HSL";
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("status", isApproved);
      formDataToSend.append("reference_no", referenceNo);

      if (flag === "SUBMITTED") {
        if (drawingFile) formDataToSend.append("file", drawingFile);
        formDataToSend.append("updated_by", uType);
        formDataToSend.append("vendor_code", user.vendor_code);
        formDataToSend.append("action_by_name", user.name);
        formDataToSend.append("action_by_id", user.email);
        formDataToSend.append("actionType", actionType);
        formDataToSend.append("assign_to", assign_to);
      }
      formDataToSend.append("supporting_doc", JSON.stringify(formData.supporting_doc || []));

      let slug = "";
      if (userType === USER_VENDOR) {
        slug = "po/drawing/submit";
      } else if (user?.department_id === DEPT_DESIGN) {
        slug = "po/drawing/update";
      } else {
        return toast.success("Only Design department can process it.");
      }

      const response = await apiCallBack("POST", slug, formDataToSend, token);

      if (response?.status) {
        toast.success(response.message);
        setIsPopup(false);
        setFormData(initialData);
        setreferenceNo("");
        setPendingSupportingFiles([]);
        if (inputFileRef.current) inputFileRef.current.value = null;
        if (supportingDocRef.current) supportingDocRef.current.value = null;
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      toast.error(`Error: ${error}`);
    }
  };

  const isVendor = userType === USER_VENDOR;
  const showActionCol = (isVendor && (hasContractualDate || isContractualChecking)) || user?.department_id === DEPT_DESIGN;

  // open the action popup for one reference (vendor re-uploads under the same reference)
  const openActionFor = (refNo, items) => {
    const latest = items.reduce((a, b) => (Number(b.created_at) >= Number(a.created_at) ? b : a), items[0]);
    const assignedOfficer = items.find((x) => x.assign_to)?.assign_to || latest?.assign_to || "";
    setreferenceNo(refNo);
    setFormData({ ...initialData, assign_to: isVendor ? assignedOfficer : "" });
    setPendingSupportingFiles([]);
    if (inputFileRef.current) inputFileRef.current.value = null;
    if (supportingDocRef.current) supportingDocRef.current.value = null;
    setIsPopup(true);
  };

  useEffect(() => {
    if (alldrawing && alldrawing.length > 0) {
      const gData = groupedByRefNo(alldrawing);
      setGroupedData(gData);
    }
  }, [alldrawing]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Drawing Submission"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {userType === 1 && (
                          isContractualChecking ? (
                            <button
                              className="btn fw-bold btn-primary mx-3 d-inline-flex align-items-center"
                              disabled
                              style={{
                                opacity: 0.85,
                                cursor: "wait",
                              }}
                              title="Checking Action..."
                            >
                              <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              ACTION
                            </button>
                          ) : hasContractualDate ? (
                            <button
                              onClick={() => {
                                setreferenceNo("");
                                setFormData(initialData);
                                setPendingSupportingFiles([]);
                                if (inputFileRef.current) inputFileRef.current.value = null;
                                if (supportingDocRef.current) supportingDocRef.current.value = null;
                                setIsPopup(true);
                              }}
                              className="btn fw-bold btn-primary mx-3"
                            >
                              ACTION
                            </button>
                          ) : null
                        )}

                        {user?.user_type !== 1 && (
                          <>
                            {/* Finance Head (deptid = 15 and internal_role_Id 1) */}
                            {user?.department_id === 2 && user?.internal_role_id === 1 && (
                              <>
                                <p className="m-0 p-2">{!currentAssign?.assign_to ? "(Not Assigned!)" : `Assigned to ${currentAssign.assign_to}`}</p>
                                <button onClick={() => setIsAssignPopup(true)} className="btn fw-bold btn-primary me-3">
                                  ASSIGN
                                </button>
                              </>
                            )}
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
                                  <th>DateTime </th>
                                  <th>Drawing File</th>
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
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={showActionCol ? 8 : 7} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {Object.keys(groupedData).map((it, index) => {
                                      let items = groupedData[it];
                                      const isAssignGroup = it === "DRAWING ASSIGNED";
                                      const latest = items.reduce((a, b) => (Number(b.created_at) >= Number(a.created_at) ? b : a), items[0]);
                                      const latestStatus = (latest?.status || "").toUpperCase();
                                      const hasApproved = items.some((x) => {
                                        const s = (x?.status || "").toUpperCase();
                                        return s === "APPROVED" || s === "ACKNOWLEDGED";
                                      });
                                      const isAllowedStatus = !hasApproved && (latestStatus === "SUBMITTED" || latestStatus === "ACCEPTED");
                                      const assignedOfficer = items.find((x) => x.assign_to)?.assign_to || currentAssign?.assign_to || latest?.assign_to;
                                      const isAssignedOfficer = !assignedOfficer || String(user?.vendor_code).trim() === String(assignedOfficer).trim();
                                      const canVendorAct = isVendor && hasContractualDate && !isAssignGroup && isAllowedStatus;
                                      const canOfficerAct = user?.department_id === DEPT_DESIGN && !isAssignGroup && isAllowedStatus && isAssignedOfficer;
                                      return (
                                        <Fragment key={index}>
                                          <tr>
                                            <td colSpan={7}>
                                              <b>{it}</b>
                                            </td>
                                            {showActionCol && (
                                              <td>
                                                {(canVendorAct || canOfficerAct) && (
                                                  <button onClick={() => openActionFor(it, items)} className="btn fw-bold btn-primary mx-3">
                                                    ACTION
                                                  </button>
                                                )}
                                              </td>
                                            )}
                                          </tr>
                                          {items &&
                                            items.map((item, i) => (
                                              <tr key={i}>
                                                <td className="table_center">{formatDate(item?.created_at)}</td>
                                                <td className="table_center">
                                                  {item.file_path ? (
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
                                                <td className="align-middle">{item.remarks}</td>
                                                <td className={`${clrLegend(item?.status)} bold`}>{item.status}</td>
                                                {showActionCol && <td></td>}
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

      {/* for finance officer and Assigner  */}
      {userType !== USER_VENDOR && user.department_id === DEPT_DESIGN && user.internal_role_id === ASSIGNER && (
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
                      value={assign.assign_to}
                      onChange={(val) =>
                        setAssign({
                          ...assign,
                          assign_to: val ? val.value : null,
                        })
                      }
                      placeholder="Select employee"
                      isClearable={true}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    <DynamicButton label="ASSIGN" onClick={() => assignDrawing()} className="btn fw-bold btn-primary" />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {
        <div className={isPopup ? "popup active" : "popup"} style={{ maxWidth: "850px", width: "min(850px, 92%)" }}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Take Action {referenceNo && `for ${referenceNo}`}</span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setIsPopup(false);
                  setFormData(initialData);
                  setreferenceNo("");
                  setPendingSupportingFiles([]);
                  if (inputFileRef.current) inputFileRef.current.value = null;
                  if (supportingDocRef.current) supportingDocRef.current.value = null;
                }}
              >
                Close
              </button>
            </div>
            <form>
              <div className="row">
                {userType === USER_VENDOR && (
                  <>
                    <div className="col-12 col-md-6 mb-3">
                      <label htmlFor="actionType" className="form-label">
                        Action Type <span className="mandatorystart">*</span>
                      </label>
                      <select name="actionType" id="actionType" className="form-select" value={formData?.actionType} onChange={(e) => inputTypeChange(e, formData, setFormData)}>
                        <option value="">Choose Action Type</option>
                        <option value="Upload Drawing ail Chain">Upload Drawing Covering Letter</option>
                        <option value="Acknowledgement/Remarks">Acknowledgement / Remarks</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label d-flex align-items-center gap-2">
                        Drawing File
                        {!referenceNo && <span className="mandatorystart">*</span>}
                        <FileUploadInfoIcon />
                      </label>
                      <input type="file" className="form-control" ref={inputFileRef} name="drawingFile" onChange={(e) => inputFileChange(e, formData, setFormData)} accept=".pdf" />
                    </div>

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

                    <div className="col-12 col-md-6 mb-3">
                      <label className="form-label">
                        Assign Officer &nbsp;&nbsp;
                        {!referenceNo && <span className="mandatorystart">*</span>}
                      </label>
                      <HrSearchableSelect
                        options={empOption}
                        value={formData?.assign_to}
                        onChange={(val) =>
                          setFormData({
                            ...formData,
                            assign_to: val?.value || "",
                          })
                        }
                        placeholder="Select officer"
                        isClearable={!referenceNo}
                        isDisabled={Boolean(referenceNo)}
                      />
                    </div>
                  </>
                )}

                <div className="col-12 mb-3">
                  <label className="form-label">Remarks</label>
                  <textarea
                    name="remarks"
                    id="remarks"
                    rows="4"
                    className="form-control"
                    onChange={(e) => inputTypeChange(e, formData, setFormData)}
                    value={formData?.remarks}
                  ></textarea>
                </div>

                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    {userType === USER_VENDOR ? <DynamicButton label="SUBMIT" onClick={() => updateDrawing("SUBMITTED")} className="btn fw-bold btn-primary" /> : <div></div>}

                    <div className="d-flex gap-3">
                      {userType === 2 && user?.department_id === 2 && (
                        <>
                          <DynamicButton
                            label="ACCEPT"
                            onClick={() => updateDrawing("ACCEPTED")}
                            className="btn fw-bold btn-primary"
                            confirmMessage="Please confirm accepting the drawing."
                          />
                          <DynamicButton
                            label="APPROVE"
                            onClick={() => updateDrawing("APPROVED")}
                            className="btn fw-bold btn-success"
                            confirmMessage="Please confirm your approving the drawing."
                          />
                          <DynamicButton label="REJECT" onClick={() => updateDrawing("REJECTED")} className="btn fw-bold btn-danger" confirmMessage="Drawing file rejected!!" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      }
    </>
  );
};

export default DrawingSub;
