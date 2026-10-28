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

const DrawingSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const inputFileRef = useRef(null);
  const [alldrawing, setAlldrawing] = useState([]);
  const [groupedData, setGroupedData] = useState([]);
  const initialData = {
    drawingFile: null,
    remarks: "",
    assign_to: "",
    actionType: "",
  };
  const [formData, setFormData] = useState(initialData);
  const { id } = useParams();
  const { user, token, userType } = useSelector((state) => state.auth);
  const { poType } = useSelector((state) => state.selectedPO);
  const [isAssignPopup, setIsAssignPopup] = useState(false);
  const [referenceNo, setreferenceNo] = useState("");
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

  useEffect(() => {
    getEmpList();
    getData();
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
    if (flag === "SUBMITTED" && (actionType.trim() === "" || assign_to.trim() === "" || !drawingFile)) {
      return toast.warn("Please fill all the required fields!");
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
        formDataToSend.append("file", drawingFile);
        formDataToSend.append("updated_by", uType);
        formDataToSend.append("vendor_code", user.vendor_code);
        formDataToSend.append("action_by_name", user.name);
        formDataToSend.append("action_by_id", user.email);
        formDataToSend.append("actionType", actionType);
        formDataToSend.append("assign_to", assign_to);
      }

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
        if (inputFileRef.current) inputFileRef.current.value = null;
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      toast.error(`Error: ${error}`);
    }
  };

  const isVendor = userType === USER_VENDOR;
  const isMaterialPo = poType === "material" || poType === "hybrid";
  const showActionCol = (isVendor && isMaterialPo) || (user?.department_id === DEPT_DESIGN && poType !== "service");

  // open the action popup for one reference (vendor re-uploads under the same reference)
  const openActionFor = (refNo, items) => {
    const latest = items.reduce((a, b) => (Number(b.created_at) >= Number(a.created_at) ? b : a), items[0]);
    setreferenceNo(refNo);
    setFormData({ ...initialData, assign_to: isVendor ? latest?.assign_to || "" : "" });
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
                        {userType === 1 && (poType === "material" || poType === "hybrid") ? (
                          <button
                            onClick={() => {
                              setreferenceNo("");
                              setFormData(initialData);
                              setIsPopup(true);
                            }}
                            className="btn fw-bold btn-primary mx-3"
                          >
                            ACTION
                          </button>
                        ) : null}

                        {user?.user_type !== 1 && poType !== "service" && (
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
                                  <th>Action By</th>
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
                                        <SkeletonLoader col={5} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {Object.keys(groupedData).map((it, index) => {
                                      let items = groupedData[it];
                                      const isAssignGroup = it === "DRAWING ASSIGNED";
                                      // APPROVED / ACKNOWLEDGED closes the reference. After REJECTED the vendor can upload again,
                                      // while the design officer waits for that new upload.
                                      const isFinal = items.some((x) => x.status === "APPROVED" || x.status === "ACKNOWLEDGED");
                                      const latest = items.reduce((a, b) => (Number(b.created_at) >= Number(a.created_at) ? b : a), items[0]);
                                      const canVendorAct = isVendor && isMaterialPo && !isAssignGroup && !isFinal;
                                      const canOfficerAct = user?.department_id === DEPT_DESIGN && poType !== "service" && !isAssignGroup && !isFinal && latest?.status === "SUBMITTED" && user?.vendor_code === latest?.assign_to;
                                      return (
                                        <Fragment key={index}>
                                          <tr>
                                            <td colSpan={showActionCol ? 5 : 6}>
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
                                                  <a href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer">
                                                    View File
                                                  </a>
                                                </td>
                                                <td className="table_center">{item.created_by_id}</td>
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
                        isClearable={true}
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
                        <DynamicButton
                          label="ACKNOWLEDGED"
                          onClick={() => updateDrawing("ACKNOWLEDGED")}
                          className="btn fw-bold btn-success"
                          confirmMessage="Please confirm your approving the drawing."
                        />
                      )}

                      {userType === 2 && user?.department_id === 2 && (
                        <DynamicButton label="REJECT" onClick={() => updateDrawing("REJECTED")} className="btn fw-bold btn-danger" confirmMessage="Drawing file rejected!!" />
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