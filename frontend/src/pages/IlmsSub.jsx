import React, { Fragment, useEffect, useState, useMemo } from "react";
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

const IlmsSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [allData, setAllData] = useState([]);
  const [referenceNo, setreferenceNo] = useState("");
  const [formData, setFormData] = useState({ drawingFile: null, remarks: "" });
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
      return;
    }
    setFormData({ ...formData, drawingFile: file });
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

      const response = await apiCallBack("POST", "po/ilms/submitILMS", formDataToSend, token);
      if (response?.status) {
        toast.success(response.message);
        setIsPopup(false);
        setFormData({ drawingFile: null, remarks: "" });
        setSelectedActionTypeName("");
        setreferenceNo("");
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
      // A reference is closed once ACCEPTED / REJECTED (backend refuses further action on it).
      const isClosed = items.some((it) => it.status === "ACCEPTED" || it.status === "REJECTED");
      // Vendor keeps ACTION on an open reference so they can upload again; officer acts once the vendor has submitted.
      const canAct = !isClosed && (isVendor || (isIlmsOfficer && firstItem.status === "SUBMITTED"));
      return (
        <Fragment key={index}>
          <tr>
            <td colSpan={showActionCol ? 6 : 5}>
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
                {item.file_name && (
                  <a href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer">
                    View File
                  </a>
                )}
              </td>
              <td className="tdrowadd">
                {item?.action_by_name} {item?.action_by && `(${item.action_by})`}
              </td>

              <td className="tdrowadd">
                {item?.action_on_name} {item?.action_on && `(${item.action_on})`}
              </td>
              <td>{item?.remarks}</td>
              <td className={`${clrLegend(item?.status)} bold`}>{item.status}</td>
              <td></td>
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
                                <th>Action By</th>
                                <th>Action To</th>
                                <th className="min-w-150px">Remarks</th>
                                <th>Status</th>
                                {showActionCol && <th>Action</th>}
                              </tr>
                            </thead>
                            <tbody style={{ maxHeight: "100%" }}>
                              {isLoading ? (
                                <tr>
                                  <td colSpan={showActionCol ? 6 : 5}>
                                    <SkeletonLoader col={showActionCol ? 6 : 5} row={6} />
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
        <div className={isPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">UPLOAD ILMS</span>
              </h3>
              <DynamicButton
                label="Close"
                onClick={() => {
                  setIsPopup(false);
                  setFormData({ drawingFile: null, remarks: "" });
                  setSelectedActionTypeName("");
                  setreferenceNo("");
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
                    <input type="file" className="form-control" onChange={handleFileChange} accept=".pdf" aria-label="Upload ILMS PDF file" />
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
                    <DynamicButton label="SUBMIT" onClick={() => submitHandler("SUBMITTED")} className="btn fw-bold btn-primary" />
                    {userType !== 1 && user.department_id === 17 && (
                      <div className="d-flex gap-3">
                        <DynamicButton
                          label="ACCEPTED"
                          onClick={() => reConfirm({ file: true }, () => submitHandler("ACCEPTED"), "You're approving the ILMS. Please confirm!")}
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