import React, { Fragment, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiSearch, FiRefreshCw } from "react-icons/fi";
import { FaTimes, FaUpload } from "react-icons/fa";
import MainHeader from "../components/MainHeader";
import SkeletonLoader from "../loader/SkeletonLoader";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { apiCallBack } from "../utils/fetchAPIs";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import { clrLegend } from "../utils/clrLegend";
import { groupedByRefNo } from "../utils/groupedByReq";
import { uploadFileStream } from "../utils/uploadFile";
import { USER_VENDOR } from "../constants/userConstants";

const NonPoBills = () => {
  const { user, token, userType } = useSelector((state) => state.auth);
  const isVendor = userType === 1 || user?.user_type === 1 || userType === USER_VENDOR;

  const [billList, setBillList] = useState([]);
  const [groupedBills, setGroupedBills] = useState({});
  const [commercialOfficers, setCommercialOfficers] = useState([]);
  const [financeOfficers, setFinanceOfficers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // DO (Dealing Officer / Commercial Officer) check - DO should not see Submit Bill button
  const isDO =
    !isVendor &&
    (commercialOfficers.some((off) => String(off.vendor_code).trim() === String(user?.vendor_code).trim()) ||
      user?.department_id === 17 ||
      (Number(user?.user_type) === 2 && Number(user?.department_id) !== 15));

  // Vendor / Officer Submit Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);
  const billFileRef = useRef(null);
  const supportingDocRef = useRef(null);
  const [billFile, setBillFile] = useState(null);
  const [pendingSupportingFiles, setPendingSupportingFiles] = useState([]);
  const [isSupportingUploading, setIsSupportingUploading] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    vendor_code: "",
    assign_to: "",
    remarks: "",
    supporting_doc: [],
  });

  // Officer Action Modal state
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionForm, setActionForm] = useState({
    reference_no: "",
    status: "",
    assign_to: "",
    remarks: "",
    current_status: "",
    current_action_to: "",
    current_assigned_to: "",
  });

  // Fetch Commercial Officers list
  const fetchCommercialOfficers = async () => {
    try {
      const res = await apiCallBack("GET", "nonPo/commercial-officer-list", null, token);
      if (res?.status && Array.isArray(res.data)) {
        setCommercialOfficers(res.data);
      }
    } catch (error) {
      console.error("Error fetching commercial officers:", error);
    }
  };

  // Fetch Finance Officers list
  const fetchFinanceOfficers = async () => {
    try {
      const res = await apiCallBack("GET", "nonPo/finance-officer-list", null, token);
      if (res?.status && Array.isArray(res.data)) {
        setFinanceOfficers(res.data);
      }
    } catch (error) {
      console.error("Error fetching finance officers:", error);
    }
  };

  // Fetch Bill List
  const fetchBillList = async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", "nonPo/bill/list", null, token);
      if (res?.status && Array.isArray(res.data)) {
        setBillList(res.data);
      } else {
        setBillList([]);
      }
    } catch (error) {
      console.error("Error fetching Non-PO bill list:", error);
      toast.error("Failed to load Non-PO bills");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBillList();
      fetchCommercialOfficers();
      fetchFinanceOfficers();
    }
  }, [token]);

  // Group bills by reference_no & apply search & status filter
  useEffect(() => {
    let filtered = billList;

    if (selectedStatusFilter !== "All") {
      filtered = filtered.filter((b) => (b?.status || "").toUpperCase() === selectedStatusFilter.toUpperCase());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((b) => {
        return (
          b?.reference_no?.toLowerCase().includes(query) ||
          b?.remarks?.toLowerCase().includes(query) ||
          b?.status?.toLowerCase().includes(query) ||
          b?.action_by_name?.toLowerCase().includes(query) ||
          b?.action_to_name?.toLowerCase().includes(query) ||
          b?.vendor_code?.toLowerCase().includes(query)
        );
      });
    }

    if (filtered && filtered.length > 0) {
      const g = groupedByRefNo(filtered);
      setGroupedBills(g);
    } else {
      setGroupedBills({});
    }
  }, [billList, searchQuery, selectedStatusFilter]);

  // ----------------------------------------------------
  // Vendor Supporting Documents Upload
  // ----------------------------------------------------
  const handleSupportingFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (submitForm.supporting_doc.length + files.length > 5) {
      toast.warning("Maximum 5 supporting documents allowed!");
      if (supportingDocRef.current) supportingDocRef.current.value = null;
      return;
    }
    setPendingSupportingFiles(files);
  };

  const handleSupportingFileUpload = async () => {
    if (!pendingSupportingFiles.length) {
      toast.warning("Please select supporting files to upload!");
      return;
    }

    setIsSupportingUploading(true);
    const uploaded = [];

    for (const f of pendingSupportingFiles) {
      if (f.type !== "application/pdf") {
        toast.error(`"${f.name}" is not a PDF file. Only PDF is allowed.`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 5MB limit.`);
        continue;
      }

      const res = await uploadFileStream({
        file: f,
        token,
        vendorCode: isVendor ? user?.vendor_code : (submitForm.vendor_code?.trim() || user?.vendor_code || "OFFICER"),
        type: "NONPO",
        onSuccess: (data) => {
          uploaded.push(data);
        },
      });
      if (!res) {
        toast.error(`Failed to upload "${f.name}".`);
      }
    }

    if (uploaded.length > 0) {
      setSubmitForm((prev) => ({
        ...prev,
        supporting_doc: [...prev.supporting_doc, ...uploaded],
      }));
      setPendingSupportingFiles([]);
      if (supportingDocRef.current) supportingDocRef.current.value = null;
      toast.success(`${uploaded.length} supporting document(s) uploaded!`);
    }
    setIsSupportingUploading(false);
  };

  const removeSupportingDoc = (idx) => {
    setSubmitForm((prev) => ({
      ...prev,
      supporting_doc: prev.supporting_doc.filter((_, i) => i !== idx),
    }));
  };

  // ----------------------------------------------------
  // Submit Non-PO Bill (Vendor or HSL Employee)
  // ----------------------------------------------------
  const handleSubmitBill = async (e) => {
    e.preventDefault();

    if (!isVendor && !submitForm.vendor_code?.trim()) {
      toast.warn("Please enter a Vendor Code!");
      return;
    }
    if (!billFile) {
      toast.warn("Please select a Bill PDF file!");
      return;
    }
    if (!submitForm.assign_to) {
      toast.warn("Please select a Commercial Officer to assign!");
      return;
    }
    if (!submitForm.remarks.trim()) {
      toast.warn("Please enter remarks!");
      return;
    }

    setIsSubmittingBill(true);
    try {
      const formData = new FormData();
      formData.append("file", billFile);
      formData.append("status", "SUBMITTED");
      formData.append("assign_to", submitForm.assign_to);
      formData.append("remarks", submitForm.remarks.trim());
      if (!isVendor && submitForm.vendor_code?.trim()) {
        formData.append("vendor_code", submitForm.vendor_code.trim());
      }
      formData.append("supporting_doc", JSON.stringify(submitForm.supporting_doc || []));

      const res = await apiCallBack("POST", "nonPo/bill/submit", formData, token);

      if (res?.status) {
        toast.success(res.message || "Non-PO Bill submitted successfully!");
        setIsSubmitModalOpen(false);
        setBillFile(null);
        setSubmitForm({ vendor_code: "", assign_to: "", remarks: "", supporting_doc: [] });
        setPendingSupportingFiles([]);
        if (billFileRef.current) billFileRef.current.value = null;
        if (supportingDocRef.current) supportingDocRef.current.value = null;
        fetchBillList();
      } else {
        toast.error(res?.message || "Failed to submit Non-PO Bill");
      }
    } catch (error) {
      console.error("Error submitting bill:", error);
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // ----------------------------------------------------
  // Officer Action Modal Handlers
  // ----------------------------------------------------
  const openActionModal = (refNo, items) => {
    const latest = items.reduce((a, b) => (Number(b.id || b.created_at) >= Number(a.id || a.created_at) ? b : a), items[0]);
    const latestStatus = (latest?.status || "").toUpperCase();

    let defaultAction = "";
    if (latestStatus === "SUBMITTED") {
      defaultAction = "FORWARD";
    } else if (latestStatus === "FORWARDED_TO_FINANCE" || latestStatus === "ASSIGNED_TO_FINANCE") {
      defaultAction = "ASSIGN";
    }

    setActionForm({
      reference_no: refNo,
      status: defaultAction,
      assign_to: "",
      remarks: "",
      current_status: latestStatus,
      current_action_to: latest?.action_to || "",
      current_assigned_to: latest?.assigned_to || "",
    });
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();

    if (!actionForm.status) {
      toast.warn("Please select an Action Status!");
      return;
    }

    if ((actionForm.status === "FORWARD" || actionForm.status === "ASSIGN") && !actionForm.assign_to) {
      toast.warn("Please select a Finance Officer!");
      return;
    }

    if (!actionForm.remarks.trim()) {
      toast.warn("Please enter Remarks!");
      return;
    }

    setIsSubmittingAction(true);
    try {
      let res;

      if (actionForm.status === "ASSIGN") {
        // Calls POST /nonPo/bill/assign
        const payload = {
          reference_no: actionForm.reference_no,
          assign_to: actionForm.assign_to,
          remarks: actionForm.remarks.trim(),
        };
        res = await apiCallBack("POST", "nonPo/bill/assign", payload, token);
      } else if (actionForm.status === "FORWARD") {
        // Calls POST /nonPo/bill/action with assign_to
        const payload = {
          reference_no: actionForm.reference_no,
          status: "FORWARD",
          assign_to: actionForm.assign_to,
          remarks: actionForm.remarks.trim(),
        };
        res = await apiCallBack("POST", "nonPo/bill/action", payload, token);
      } else {
        // APPROVE or REJECT -> calls POST /nonPo/bill/action
        const payload = {
          reference_no: actionForm.reference_no,
          status: actionForm.status,
          remarks: actionForm.remarks.trim(),
        };
        res = await apiCallBack("POST", "nonPo/bill/action", payload, token);
      }

      if (res?.status) {
        toast.success(res.message || `Action ${actionForm.status} completed successfully!`);
        setIsActionModalOpen(false);
        setActionForm({
          reference_no: "",
          status: "",
          assign_to: "",
          remarks: "",
          current_status: "",
          current_action_to: "",
          current_assigned_to: "",
        });
        fetchBillList();
      } else {
        toast.error(res?.message || "Action failed. Please try again.");
      }
    } catch (error) {
      console.error("Error taking action:", error);
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Check if current officer can take action on this reference
  const canOfficerActOnBill = (items) => {
    if (isVendor) return false;
    const latest = items.reduce((a, b) => (Number(b.id || b.created_at) >= Number(a.id || a.created_at) ? b : a), items[0]);
    const latestStatus = (latest?.status || "").toUpperCase();

    if (latestStatus === "APPROVED" || latestStatus === "REJECTED") return false;

    const userCode = String(user?.vendor_code || "").trim();
    const actionTo = String(latest?.action_to || "").trim();
    const assignedTo = String(latest?.assigned_to || "").trim();

    const isDirectlyAssigned = (actionTo && actionTo === userCode) || (assignedTo && assignedTo === userCode);

    if (latestStatus === "SUBMITTED") {
      return isDirectlyAssigned || user?.department_id === 17 || user?.user_type === 2;
    }

    if (latestStatus === "FORWARDED_TO_FINANCE" || latestStatus === "ASSIGNED_TO_FINANCE") {
      return isDirectlyAssigned || user?.department_id === 15 || user?.user_type === 2;
    }

    return isDirectlyAssigned || user?.user_type === 2;
  };

  return (
    <>
      <MainHeader title={"Non-PO Bills"} />

      <div className="w-99 m-auto" style={{ marginTop: "15px", marginBottom: "30px" }}>
        <div className="card shadow-sm border-0">
          {/* Header Bar matching POs.jsx exactly */}
          <div className="searchfun">
            {/* Search input */}
            <div className="card_headline">
              <div className="d-flex align-items-end gap-2">
                <div>
                  <div className="search_top">
                    <label htmlFor="searchInput">Search</label>
                  </div>
                  <div className="input_search">
                    <input
                      id="searchInput"
                      type="text"
                      className="form-control"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Reference, Officer, Status..."
                      style={{ minWidth: "260px" }}
                    />
                    <button className="search_btn" aria-label="Search">
                      <FiSearch />
                    </button>
                  </div>
                </div>
                <button className="btn fw-bold btn-primary" onClick={fetchBillList} title="Refresh Data" disabled={isLoading}>
                  <FiRefreshCw className={isLoading ? "spinner-border spinner-border-sm me-1" : "me-1"} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Submit Bill Button (Vendor & HSL Officer, hidden for DO) */}
            {!isDO && (
              <div className="card_headline d-flex align-items-end">
                <button
                  onClick={() => {
                    setBillFile(null);
                    setSubmitForm({ vendor_code: "", assign_to: "", remarks: "", supporting_doc: [] });
                    setPendingSupportingFiles([]);
                    if (billFileRef.current) billFileRef.current.value = null;
                    if (supportingDocRef.current) supportingDocRef.current.value = null;
                    setIsSubmitModalOpen(true);
                  }}
                  className="btn fw-bold btn-primary"
                >
                  + SUBMIT NON-PO BILL
                </button>
              </div>
            )}

            {/* Status Filter Dropdown */}
            <div className="card_headline">
              <div className="d-flex align-items-end gap-2">
                <div>
                  <div className="search_top">
                    <label htmlFor="statusFilter">Status Filter</label>
                  </div>
                  <div className="input_search">
                    <select id="statusFilter" className="form-select" value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)}>
                      <option value="All">All Statuses</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="FORWARDED_TO_FINANCE">FORWARDED_TO_FINANCE</option>
                      <option value="ASSIGNED_TO_FINANCE">ASSIGNED_TO_FINANCE</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Records Counter */}
          <div className="d-flex align-items-center justify-content-between m-2 px-2">
            <span className="fw-bold">Total Bills: {Object.keys(groupedBills).length}</span>
          </div>

          {/* Table Container */}
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table className="table table-bordered table-hover table-striped table_styled mb-0">
              <thead>
                <tr>
                  <th style={{ minWidth: "140px" }}>DateTime</th>
                  <th style={{ minWidth: "120px" }}>Bill File</th>
                  <th style={{ minWidth: "180px" }}>Supporting Documents</th>
                  <th style={{ minWidth: "200px" }}>Action By</th>
                  <th style={{ minWidth: "200px" }}>Action To / Assigned</th>
                  <th style={{ minWidth: "220px" }}>Remarks</th>
                  <th style={{ minWidth: "120px" }}>Status</th>
                  {!isVendor && <th style={{ minWidth: "100px" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={!isVendor ? 8 : 7} className="text-center py-5">
                      <SkeletonLoader col={!isVendor ? 8 : 7} row={6} />
                    </td>
                  </tr>
                ) : Object.keys(groupedBills).length === 0 ? (
                  <tr>
                    <td colSpan={!isVendor ? 8 : 7} className="text-center py-5 text-muted">
                      No Non-PO Bills found.
                    </td>
                  </tr>
                ) : (
                  Object.keys(groupedBills).map((refNo, idx) => {
                    const items = groupedBills[refNo] || [];
                    const latest = items.reduce((a, b) => (Number(b.id || b.created_at) >= Number(a.id || a.created_at) ? b : a), items[0]);
                    const canAct = canOfficerActOnBill(items);

                    return (
                      <Fragment key={idx}>
                        {/* Reference Group Header Row */}
                        <tr style={{ backgroundColor: "#eaeaf5" }}>
                          <td colSpan={!isVendor ? 7 : 7} className="align-middle py-2 ps-3">
                            <b>Reference No: </b>
                            <span className="badge bg-primary px-3 py-1 fs-6 me-3">{refNo}</span>
                            <span className="me-3">
                              <b>Vendor: </b> {latest?.vendor_code || "-"}
                            </span>
                            {latest?.submitted_by && (
                              <span className="me-3 text-muted">
                                <b>Submitted By: </b> {latest?.submitted_by_name ? `${latest.submitted_by_name} (${latest.submitted_by})` : latest.submitted_by}
                              </span>
                            )}
                            <span>
                              <b>Current Status: </b>
                              <span className={`${clrLegend(latest?.status)} bold`}>{latest?.status || "-"}</span>
                            </span>
                          </td>
                          {!isVendor && (
                            <td className="align-middle text-center py-2">
                              {canAct && (
                                <button onClick={() => openActionModal(refNo, items)} className="btn btn-sm fw-bold btn-primary">
                                  ACTION
                                </button>
                              )}
                            </td>
                          )}
                        </tr>

                        {/* History Rows under this Reference */}
                        {items.map((item, i) => (
                          <tr key={i}>
                            <td className="text-nowrap">{formatDate(item?.action_on || item?.created_at)}</td>
                            <td>
                              {item?.file_path ? (
                                <button className="btn_simple">
                                  <a href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer" className="text-primary">
                                    <u>View Bill</u>
                                  </a>
                                </button>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td>
                              {(() => {
                                try {
                                  let docs = item?.supporting_doc;
                                  if (typeof docs === "string" && docs.trim()) {
                                    docs = JSON.parse(docs);
                                    if (typeof docs === "string") docs = JSON.parse(docs);
                                  }
                                  if (Array.isArray(docs) && docs.length > 0) {
                                    return docs.map((doc, docIdx) => (
                                      <div key={docIdx}>
                                        <button className="btn_simple">
                                          <a href={formatFilePath(doc.file_path || doc.filePath)} target="_blank" rel="noreferrer" className="text-primary">
                                            <u>{doc.file_name || doc.fileName || `Document #${docIdx + 1}`}</u>
                                          </a>
                                        </button>
                                      </div>
                                    ));
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                                return "-";
                              })()}
                            </td>
                            <td>{item?.action_by_name ? `${item.action_by_name} (${item.action_by || item.created_by_id})` : item?.action_by || item?.created_by_name || "-"}</td>
                            <td>
                              {item?.action_to_name
                                ? `${item.action_to_name} (${item.action_to})`
                                : item?.action_to
                                  ? item.action_to
                                  : item?.assigned_to
                                    ? (() => {
                                        const fo = financeOfficers.find((f) => String(f.vendor_code) === String(item.assigned_to));
                                        return fo?.name ? `Assigned: ${fo.name} (${item.assigned_to})` : `Assigned: ${item.assigned_to}`;
                                      })()
                                    : "-"}
                            </td>
                            <td>{item?.remarks || "-"}</td>
                            <td>
                              <span className={`${clrLegend(item?.status)} bold`}>{item?.status || "-"}</span>
                            </td>
                            {!isVendor && <td></td>}
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 1. VENDOR: SUBMIT NON-PO BILL MODAL                  */}
      {/* ==================================================== */}
      {isSubmitModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "650px",
              maxWidth: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom"
              style={{ backgroundColor: "#2a2d93", color: "#ffffff", borderRadius: "8px 8px 0 0" }}
            >
              <h5 className="m-0 fw-bold text-white">Submit Non-PO Bill</h5>
              <button
                type="button"
                className="btn btn-sm text-white"
                style={{ fontSize: "18px", border: "none", background: "none", cursor: "pointer" }}
                onClick={() => setIsSubmitModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitBill} className="p-4">
              <div className="row g-3">
                {/* Vendor Code (Required when submitted by HSL Employee) */}
                {!isVendor && (
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold">
                      Vendor Code <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Vendor Code (e.g. 50007545)"
                      value={submitForm.vendor_code}
                      onChange={(e) => setSubmitForm({ ...submitForm, vendor_code: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Commercial Officer */}
                <div className="col-12 col-md-6">
                  <label className="form-label fw-bold">
                    Commercial Officer <span className="text-danger">*</span>
                  </label>
                  <select className="form-select" value={submitForm.assign_to} onChange={(e) => setSubmitForm({ ...submitForm, assign_to: e.target.value })} required>
                    <option value="">Choose Commercial Officer</option>
                    {commercialOfficers.map((off, idx) => (
                      <option key={idx} value={off.vendor_code}>
                        {off.name} ({off.vendor_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bill File (PDF) */}
                <div className="col-12 col-md-6">
                  <label className="form-label fw-bold">
                    Bill Document (PDF) <span className="text-danger">*</span>
                    <FileUploadInfoIcon />
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".pdf"
                    ref={billFileRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type !== "application/pdf") {
                          toast.error("Only PDF files are allowed!");
                          e.target.value = null;
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("File size cannot exceed 10MB!");
                          e.target.value = null;
                          return;
                        }
                        setBillFile(file);
                      }
                    }}
                    required
                  />
                </div>

                {/* Supporting Documents (Optional) */}
                <div className="col-12">
                  <label className="form-label fw-bold">
                    Supporting Documents <span className="text-muted">(Optional, PDF only, Max 5)</span>
                    <FileUploadInfoIcon />
                  </label>
                  <div className="d-flex align-items-center gap-2">
                    <input type="file" className="form-control" accept=".pdf" multiple ref={supportingDocRef} onChange={handleSupportingFileSelect} />
                    <button
                      type="button"
                      className="btn btn-secondary text-nowrap d-inline-flex align-items-center gap-1"
                      onClick={handleSupportingFileUpload}
                      disabled={isSupportingUploading || !pendingSupportingFiles.length}
                    >
                      <FaUpload />
                      {isSupportingUploading ? "Uploading..." : "Upload"}
                    </button>
                  </div>

                  {/* Uploaded Supporting Files List */}
                  {submitForm.supporting_doc.length > 0 && (
                    <div className="mt-2 p-2 border rounded bg-light">
                      <small className="fw-bold d-block mb-1 text-muted">Uploaded Supporting Documents:</small>
                      <ul className="list-unstyled mb-0">
                        {submitForm.supporting_doc.map((doc, idx) => (
                          <li key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                            <a href={formatFilePath(doc.file_path || doc.filePath)} target="_blank" rel="noreferrer" className="text-primary text-decoration-underline">
                              {doc.file_name || doc.fileName || `Document ${idx + 1}`}
                            </a>
                            <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeSupportingDoc(idx)}>
                              <FaTimes />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div className="col-12">
                  <label className="form-label fw-bold">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Enter remarks..."
                    value={submitForm.remarks}
                    onChange={(e) => setSubmitForm({ ...submitForm, remarks: e.target.value })}
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="col-12 d-flex justify-content-end gap-2 pt-3 border-top">
                  <button type="button" className="btn btn-light" onClick={() => setIsSubmitModalOpen(false)} disabled={isSubmittingBill}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2" disabled={isSubmittingBill}>
                    {isSubmittingBill ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Bill"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. OFFICER: TAKE ACTION MODAL (FORWARD / ASSIGN / APPROVE / REJECT) */}
      {/* ==================================================== */}
      {isActionModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setIsActionModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              width: "550px",
              maxWidth: "92%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom"
              style={{ backgroundColor: "#2a2d93", color: "#ffffff", borderRadius: "8px 8px 0 0" }}
            >
              <h5 className="m-0 fw-bold text-white">Take Action for {actionForm.reference_no}</h5>
              <button
                type="button"
                className="btn btn-sm text-white"
                style={{ fontSize: "18px", border: "none", background: "none", cursor: "pointer" }}
                onClick={() => setIsActionModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-4">
              <div className="row g-3">
                {/* Reference & Current Status Info */}
                <div className="col-12 bg-light p-3 rounded border">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      Reference: <b>{actionForm.reference_no}</b>
                    </span>
                    <span>
                      Current Status: <b className={clrLegend(actionForm.current_status)}>{actionForm.current_status}</b>
                    </span>
                  </div>
                  {(actionForm.current_action_to || actionForm.current_assigned_to) && (
                    <div className="mt-2 text-muted small">
                      <b>Currently With: </b>
                      {actionForm.current_action_to || actionForm.current_assigned_to}
                    </div>
                  )}
                </div>

                {/* Action Type Dropdown */}
                <div className="col-12">
                  <label className="form-label fw-bold">
                    Action Status <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={actionForm.status}
                    onChange={(e) => setActionForm({ ...actionForm, status: e.target.value, assign_to: "" })}
                    required
                  >
                    <option value="">Choose Action</option>
                    {actionForm.current_status === "SUBMITTED" && (
                      <>
                        <option value="FORWARD">FORWARD (Forward to Finance Officer)</option>
                        <option value="REJECT">REJECT (Reject Bill)</option>
                      </>
                    )}
                    {(actionForm.current_status === "FORWARDED_TO_FINANCE" || actionForm.current_status === "ASSIGNED_TO_FINANCE") && (
                      <>
                        <option value="ASSIGN">ASSIGN (Assign / Reassign to Finance Officer)</option>
                        <option value="APPROVE">APPROVE (Approve Bill)</option>
                        <option value="REJECT">REJECT (Reject Bill)</option>
                      </>
                    )}
                    {actionForm.current_status !== "SUBMITTED" &&
                      actionForm.current_status !== "FORWARDED_TO_FINANCE" &&
                      actionForm.current_status !== "ASSIGNED_TO_FINANCE" && (
                        <>
                          <option value="FORWARD">FORWARD (Forward to Finance Officer)</option>
                          <option value="ASSIGN">ASSIGN (Assign / Reassign to Finance Officer)</option>
                          <option value="APPROVE">APPROVE (Approve Bill)</option>
                          <option value="REJECT">REJECT (Reject Bill)</option>
                        </>
                      )}
                  </select>
                </div>

                {/* Finance Officer Selection for FORWARD or ASSIGN */}
                {(actionForm.status === "FORWARD" || actionForm.status === "ASSIGN") && (
                  <div className="col-12">
                    <label className="form-label fw-bold">
                      Finance Officer <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={actionForm.assign_to}
                      onChange={(e) => setActionForm({ ...actionForm, assign_to: e.target.value })}
                      required
                    >
                      <option value="">Choose Finance Officer</option>
                      {financeOfficers
                        .filter((off) => String(off.vendor_code) !== String(user?.vendor_code))
                        .map((off, idx) => (
                          <option key={idx} value={off.vendor_code}>
                            {off.name} ({off.vendor_code})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Remarks */}
                <div className="col-12">
                  <label className="form-label fw-bold">
                    Remarks <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder={
                      actionForm.status === "FORWARD"
                        ? "e.g. Forwarded to Finance"
                        : actionForm.status === "ASSIGN"
                          ? "e.g. Assigned to Finance Lower Officer for verification."
                          : actionForm.status === "APPROVE"
                            ? "e.g. Approved by Finance"
                            : actionForm.status === "REJECT"
                              ? "e.g. Bill rejected due to incorrect supporting documents"
                              : "Enter remarks..."
                    }
                    value={actionForm.remarks}
                    onChange={(e) => setActionForm({ ...actionForm, remarks: e.target.value })}
                    required
                  />
                </div>

                {/* Submit Buttons */}
                <div className="col-12 d-flex justify-content-end gap-2 pt-3 border-top">
                  <button type="button" className="btn btn-light" onClick={() => setIsActionModalOpen(false)} disabled={isSubmittingAction}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary fw-bold d-inline-flex align-items-center gap-2" disabled={isSubmittingAction}>
                    {isSubmittingAction ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                        Processing...
                      </>
                    ) : (
                      "Submit Action"
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NonPoBills;
