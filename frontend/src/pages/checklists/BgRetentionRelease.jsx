import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Footer from "../../components/Footer";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import SkeletonLoader from "../../loader/SkeletonLoader";
import DynamicButton from "../../Helpers/DynamicButton";
import HrSearchableSelect from "../../components/HrSearchableSelect";
import { apiCallBack } from "../../utils/fetchAPIs";
import { formatFilePath } from "../../utils/getDateTimeNow";
import { ASSIGNER, DEPT_FI, USER_VENDOR } from "../../constants/userConstants";

const STATUS_SUBMITTED = "SUBMITTED_BY_VENDOR";
const STATUS_RECOMMENDED = "RECOMMENDED_BY_DO";
const STATUS_ASSIGNED = "ASSIGNED_TO_FI";

const DOC_FIELDS = [
  { key: "warranty_cert", label: "Warranty Completion Certificate (issued/recommended by User Department)", required: true },
  { key: "wcc", label: "WCC copies", required: false },
  { key: "no_due_cert", label: "No Due Certificate", required: true },
  { key: "other_doc", label: "Any other document prescribed by HSL", required: false },
];

const fmtDate = (sec) => (sec && sec !== "0" ? new Date(Number(sec) * 1000).toLocaleDateString("en-GB") : "");
const warrantyText = (row) => {
  const w = fmtDate(row?.warranty_expiry_date);
  const closed = row?.po_closed === true ? "PO closed" : row?.po_closed === false ? "PO open" : "";
  return [w ? `Warranty till ${w}` : "Warranty: N/A", closed].filter(Boolean).join(" · ");
};

// BG Retention Release claim (To-Be 6.22.2): Contractor -> Commercial (DO) -> Finance -> Payment Section
const BgRetentionRelease = () => {
  const { id } = useParams();
  const { state, pathname } = useLocation();
  const navigate = useNavigate();
  const { user, token } = useSelector((s) => s.auth);
  const { isDO } = useSelector((s) => s.selectedPO);
  const btn_num = typeof state === "string" ? state : state?.btn_num;
  const isNew = !btn_num && !pathname.includes("/view/") && !pathname.includes("/edit/");
  const isVendor = user?.user_type === USER_VENDOR;
  const isFinance = user?.department_id === DEPT_FI;
  const isNodal = isFinance && user?.internal_role_id === ASSIGNER;

  const [loading, setLoading] = useState(false);
  // new claim
  const [bgs, setBgs] = useState([]);
  const [selected, setSelected] = useState({}); // sdbg_reference_no -> claim_amount
  const [files, setFiles] = useState({});
  const [remarks, setRemarks] = useState("");
  // existing claim
  const [claim, setClaim] = useState(null);
  const [actionRemarks, setActionRemarks] = useState("");
  const [fiStaff, setFiStaff] = useState([]);
  const [assignTo, setAssignTo] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [misc, setMisc] = useState({ applicable: false, amount: "", remarks: "" });

  const loadInit = async () => {
    setLoading(true);
    const res = await apiCallBack("GET", "po/btn/bg-retention?type=init", null, token);
    if (res?.status) setBgs(res.data?.bgs || []);
    setLoading(false);
  };

  const loadClaim = async () => {
    setLoading(true);
    const res = await apiCallBack("GET", `po/btn/bg-retention?type=details&btn_num=${btn_num}`, null, token);
    if (res?.status) {
      setClaim(res.data);
      const d = {};
      (res.data?.lines || []).forEach((l) => {
        d[l.id] = { fi_status: l.fi_status || "", approved_amount: l.approved_amount ?? l.claim_amount, fi_remarks: l.fi_remarks || "" };
      });
      setDecisions(d);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isNew) {
      if (isVendor) loadInit();
    } else if (btn_num) {
      loadClaim();
    }
    if (isNodal) {
      apiCallBack("GET", "po/btn/bg-retention?type=fi-staff", null, token).then((res) => {
        if (res?.status) setFiStaff((res.data || []).map((e) => ({ value: e.emp_id, label: `${e.cname} (${e.emp_id})` })));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [btn_num]);

  const totalClaim = useMemo(() => Object.values(selected).reduce((s, v) => s + (Number(v) || 0), 0), [selected]);

  const toggleBg = (bg) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (bg.sdbg_reference_no in next) delete next[bg.sdbg_reference_no];
      else next[bg.sdbg_reference_no] = bg.bg_ammount || "";
      return next;
    });
  };

  const submitClaim = async () => {
    const refs = Object.keys(selected);
    if (!refs.length) return toast.warn("Please select at least one BG.");
    if (refs.some((r) => !(Number(selected[r]) > 0))) return toast.warn("Please enter a claim amount for each selected BG.");
    const missing = DOC_FIELDS.filter((f) => f.required && !files[f.key]);
    if (missing.length) return toast.warn(`Please upload: ${missing.map((m) => m.label.split(" (")[0]).join(", ")}`);

    const lines = refs.map((ref) => {
      const bg = bgs.find((b) => b.sdbg_reference_no === ref);
      return { purchasing_doc_no: bg.purchasing_doc_no, sdbg_reference_no: ref, claim_amount: Number(selected[ref]) };
    });
    const fd = new FormData();
    fd.append("lines", JSON.stringify(lines));
    fd.append("remarks", remarks);
    DOC_FIELDS.forEach((f) => files[f.key] && fd.append(`${f.key}_filename`, files[f.key]));

    const res = await apiCallBack("POST", "po/btn/submit-bg-retention", fd, token);
    if (res?.status) {
      toast.success(`BTN ${res.data?.btn_num} created successfully.`);
      navigate(`/invoice-and-payment-process/${id}`);
    } else {
      toast.warn(res?.message);
    }
  };

  const doAction = async (status) => {
    if (!actionRemarks.trim()) return toast.warn("Please enter remarks.");
    const res = await apiCallBack("POST", "po/btn/submit-bg-retention-do", { btn_num, status, remarks: actionRemarks }, token);
    res?.status ? toast.success(res.message) : toast.warn(res?.message);
    if (res?.status) loadClaim();
  };

  const assignFi = async () => {
    if (!assignTo) return toast.warn("Please choose a Finance Officer.");
    const res = await apiCallBack("POST", "po/btn/submit-bg-retention-fi", { btn_num, action: "ASSIGN", assign_to: assignTo }, token);
    res?.status ? toast.success(res.message) : toast.warn(res?.message);
    if (res?.status) loadClaim();
  };

  const fiDecide = async () => {
    const lines = (claim?.lines || []).map((l) => ({ id: l.id, ...decisions[l.id] }));
    if (lines.some((l) => !l.fi_status)) return toast.warn("Please accept or reject every line.");
    const res = await apiCallBack(
      "POST",
      "po/btn/submit-bg-retention-fi",
      {
        btn_num,
        action: "DECIDE",
        lines,
        remarks: actionRemarks,
        misc_recovery_applicable: misc.applicable,
        misc_recovery_amount: misc.applicable ? Number(misc.amount || 0) : 0,
        misc_recovery_remarks: misc.remarks,
      },
      token,
    );
    res?.status ? toast.success(res.message) : toast.warn(res?.message);
    if (res?.status) loadClaim();
  };

  const acceptedTotal = (claim?.lines || []).reduce((s, l) => s + (decisions[l.id]?.fi_status === "APPROVED" ? Number(decisions[l.id]?.approved_amount || 0) : 0), 0);
  const canDecide = isFinance && claim?.status === STATUS_ASSIGNED && claim?.fi_officer === user?.vendor_code;

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="wrapper d-flex flex-column flex-row-fluid">
          <Header title={"BG Retention Release"} id={id} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                {loading ? (
                  <SkeletonLoader col={4} row={6} />
                ) : isNew ? (
                  isVendor ? (
                    <div className="card-body p-3">
                      <h5>Select BG(s) to claim retention release (single or multiple POs)</h5>
                      <div className="table-responsive">
                        <table className="table table-striped table-bordered">
                          <thead>
                            <tr>
                              <th></th>
                              <th>PO</th>
                              <th>BG No</th>
                              <th>BG Type</th>
                              <th>BG Amount</th>
                              <th>Validity</th>
                              <th>Warranty / PO</th>
                              <th>Claim Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bgs.length ? (
                              bgs.map((bg) => (
                                <tr key={bg.sdbg_reference_no}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      disabled={!!bg.open_claim_btn_num}
                                      checked={bg.sdbg_reference_no in selected}
                                      onChange={() => toggleBg(bg)}
                                    />
                                  </td>
                                  <td>{bg.purchasing_doc_no}</td>
                                  <td>
                                    {bg.bg_no}
                                    {bg.open_claim_btn_num && <small className="d-block text-muted">Open claim: {bg.open_claim_btn_num}</small>}
                                  </td>
                                  <td>{bg.bg_type}</td>
                                  <td>
                                    {bg.bg_ammount} {bg.currency}
                                  </td>
                                  <td>{fmtDate(bg.validity_date)}</td>
                                  <td>{warrantyText(bg)}</td>
                                  <td>
                                    {bg.sdbg_reference_no in selected && (
                                      <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={selected[bg.sdbg_reference_no]}
                                        onChange={(e) => setSelected({ ...selected, [bg.sdbg_reference_no]: e.target.value })}
                                      />
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8} className="text-center">
                                  No accepted BGs available for retention release.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p>
                        <b>Total Claim Amount:</b> {totalClaim.toFixed(2)}
                      </p>
                      <div className="row">
                        {DOC_FIELDS.map((f) => (
                          <div className="col-md-6 col-12 mb-3" key={f.key}>
                            <label className="form-label">
                              {f.label} {f.required && <span className="mandatorystart">*</span>}
                            </label>
                            <input type="file" className="form-control" accept=".pdf" onChange={(e) => setFiles({ ...files, [f.key]: e.target.files[0] })} />
                          </div>
                        ))}
                        <div className="col-12 mb-3">
                          <label className="form-label">Remarks</label>
                          <textarea className="form-control" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                        </div>
                        <div className="col-12">
                          <DynamicButton label="SUBMIT CLAIM" onClick={submitClaim} className="btn-primary" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="p-3">Only vendors can raise a BG Retention Release claim.</p>
                  )
                ) : !claim?.btn_num ? (
                  <p className="p-3">Claim not found.</p>
                ) : (
                  <div className="card-body p-3">
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <b>BTN No:</b> {claim.btn_num}
                      </div>
                      <div className="col-md-4">
                        <b>Status:</b> {claim.status?.replace(/_/g, " ")}
                      </div>
                      <div className="col-md-4">
                        <b>Net Claim:</b> {claim.net_claim_amount}
                      </div>
                      {claim.net_payable_amount && (
                        <div className="col-md-4">
                          <b>Net Payable:</b> {claim.net_payable_amount}
                        </div>
                      )}
                      {claim.fi_officer && (
                        <div className="col-md-4">
                          <b>Finance Officer:</b> {claim.fi_officer_name} ({claim.fi_officer})
                        </div>
                      )}
                      {claim.remarks && (
                        <div className="col-12">
                          <b>Vendor Remarks:</b> {claim.remarks}
                        </div>
                      )}
                      {claim.do_remarks && (
                        <div className="col-12">
                          <b>DO Remarks:</b> {claim.do_remarks}
                        </div>
                      )}
                      {claim.fi_remarks && (
                        <div className="col-12">
                          <b>Finance Remarks:</b> {claim.fi_remarks}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      {DOC_FIELDS.map(
                        (f) =>
                          claim[`${f.key}_file_path`] && (
                            <a key={f.key} className="me-3" href={formatFilePath(claim[`${f.key}_file_path`])} target="_blank" rel="noreferrer">
                              {f.label.split(" (")[0]}
                            </a>
                          ),
                      )}
                    </div>

                    <div className="table-responsive">
                      <table className="table table-striped table-bordered">
                        <thead>
                          <tr>
                            <th>PO</th>
                            <th>BG No</th>
                            <th>Warranty / PO</th>
                            <th>Claimed</th>
                            <th>Finance Decision</th>
                            <th>Accepted Amount</th>
                            <th>Finance Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(claim.lines || []).map((l) => (
                            <tr key={l.id}>
                              <td>{l.purchasing_doc_no}</td>
                              <td>{l.bg_no}</td>
                              <td>{warrantyText(l)}</td>
                              <td>{l.claim_amount}</td>
                              <td>
                                {canDecide ? (
                                  <select
                                    className="form-select form-select-sm"
                                    value={decisions[l.id]?.fi_status || ""}
                                    onChange={(e) => setDecisions({ ...decisions, [l.id]: { ...decisions[l.id], fi_status: e.target.value } })}
                                  >
                                    <option value="">Select</option>
                                    <option value="APPROVED">Accept</option>
                                    <option value="REJECTED">Reject</option>
                                  </select>
                                ) : (
                                  l.fi_status || "-"
                                )}
                              </td>
                              <td>
                                {canDecide && decisions[l.id]?.fi_status === "APPROVED" ? (
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={decisions[l.id]?.approved_amount}
                                    onChange={(e) => setDecisions({ ...decisions, [l.id]: { ...decisions[l.id], approved_amount: e.target.value } })}
                                  />
                                ) : (
                                  l.approved_amount ?? "-"
                                )}
                              </td>
                              <td>
                                {canDecide ? (
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={decisions[l.id]?.fi_remarks || ""}
                                    onChange={(e) => setDecisions({ ...decisions, [l.id]: { ...decisions[l.id], fi_remarks: e.target.value } })}
                                  />
                                ) : (
                                  l.fi_remarks || ""
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Commercial / Dealing Officer: verify and recommend */}
                    {isDO && claim.status === STATUS_SUBMITTED && (
                      <div className="row">
                        <div className="col-12 mb-3">
                          <label className="form-label">
                            Verification Remarks <span className="mandatorystart">*</span>
                          </label>
                          <textarea className="form-control" rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} />
                        </div>
                        <div className="col-12 d-flex gap-3">
                          <DynamicButton
                            label="RECOMMEND TO FINANCE"
                            onClick={() => doAction(STATUS_RECOMMENDED)}
                            className="btn-primary"
                            confirmMessage="You're going to recommend this claim to Finance. Please confirm!"
                          />
                          <DynamicButton label="REJECT" onClick={() => doAction("REJECTED")} className="btn-danger" confirmMessage="You're going to reject this claim. Please confirm!" />
                        </div>
                      </div>
                    )}

                    {/* Finance nodal point: assign Finance Officer */}
                    {isNodal && (claim.status === STATUS_RECOMMENDED || claim.status === STATUS_ASSIGNED) && (
                      <div className="row" style={{ overflow: "unset" }}>
                        <div className="col-md-6 col-12 mb-3">
                          <label className="form-label">Assign Finance Officer</label>
                          <HrSearchableSelect options={fiStaff} value={assignTo} onChange={(v) => setAssignTo(v ? v.value : null)} placeholder="Select officer" isClearable />
                        </div>
                        <div className="col-md-2 col-12 mb-3 d-flex align-items-end">
                          <DynamicButton label="ASSIGN" onClick={assignFi} className="btn-primary" />
                        </div>
                      </div>
                    )}

                    {/* Finance Officer: accept / reject fully or per line, misc. recoveries */}
                    {canDecide && (
                      <div className="row">
                        <div className="col-12 mb-2">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="miscRecovery"
                              checked={misc.applicable}
                              onChange={(e) => setMisc({ ...misc, applicable: e.target.checked })}
                            />
                            <label className="form-check-label" htmlFor="miscRecovery">
                              Misc. recoveries
                            </label>
                          </div>
                        </div>
                        {misc.applicable && (
                          <>
                            <div className="col-md-4 col-12 mb-3">
                              <label className="form-label">Recovery Amount</label>
                              <input type="number" className="form-control" value={misc.amount} onChange={(e) => setMisc({ ...misc, amount: e.target.value })} />
                            </div>
                            <div className="col-md-8 col-12 mb-3">
                              <label className="form-label">Recovery Remarks</label>
                              <input type="text" className="form-control" value={misc.remarks} onChange={(e) => setMisc({ ...misc, remarks: e.target.value })} />
                            </div>
                          </>
                        )}
                        <div className="col-12 mb-2">
                          <b>Net Payable:</b> {(acceptedTotal - (misc.applicable ? Number(misc.amount || 0) : 0)).toFixed(2)}
                        </div>
                        <div className="col-12 mb-3">
                          <label className="form-label">Remarks</label>
                          <textarea className="form-control" rows={3} value={actionRemarks} onChange={(e) => setActionRemarks(e.target.value)} />
                        </div>
                        <div className="col-12">
                          <DynamicButton label="SUBMIT DECISION" onClick={fiDecide} className="btn-primary" confirmMessage="You're going to submit the Finance decision. Please confirm!" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default BgRetentionRelease;
