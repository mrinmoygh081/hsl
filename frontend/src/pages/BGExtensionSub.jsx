import React, { useEffect, useState } from "react";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import SkeletonLoader from "../loader/SkeletonLoader";
import DynamicButton from "../Helpers/DynamicButton";
import { DEPT_FI } from "../constants/userConstants";

const BGExtensionSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [remarkstext, setRemarkstext] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [loading, setLoading] = useState(false);
  const { token, user } = useSelector((state) => state.auth);

  const isFinance = user?.department_id === DEPT_FI;

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", `bg-extension`, {}, token);
      setTableData(response?.data || []);
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, []);

  const handleAction = (index) => {
    setSelectedRow(index);
    setRemarkstext("");
    setSelectedAction("");
    setIsPopup(true);
  };

  const handlePopupSave = async () => {
    if (!selectedAction || !remarkstext) {
      toast.warning("Please select an action and enter remarks.");
      return;
    }

    const row = tableData[selectedRow];
    let response;

    if (isFinance) {
      response = await apiCallBack(
        "POST",
        "bg-extension/fi",
        { reference_no: row.reference_no, fi_status: selectedAction, remarks: remarkstext },
        token
      );
    } else {
      response = await apiCallBack(
        "POST",
        "bg-extension/do",
        { reference_no: row.reference_no, status: selectedAction, remarks: remarkstext },
        token
      );
    }

    if (response?.status) {
      toast.success(response.message || "Success");
      setIsPopup(false);
      fetchTableData();
    } else {
      toast.warning(response?.message || "An error occurred");
    }
  };

  const formatDatee = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US");
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title={"BG Extension/Release"} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <p className="text-muted">
                          {isFinance
                            ? "Extension/Release requests forwarded by the Dealing Officer, pending Finance action."
                            : "Extension/Release requests submitted by vendors against an accepted Bank Guarantee, pending your review."}
                        </p>
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table_height">
                            <thead>
                              <tr className="border-0">
                                <th>PO Num</th>
                                <th>Request Ref No</th>
                                <th>Original BG Ref No</th>
                                <th>Action Type</th>
                                <th>New Validity Date</th>
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr>
                                  <td colSpan="8">
                                    <SkeletonLoader />
                                  </td>
                                </tr>
                              ) : tableData?.length > 0 ? (
                                tableData.map((item, index) => (
                                  <tr key={index}>
                                    <td className="table_center">{item.purchasing_doc_no}</td>
                                    <td>{item.reference_no}</td>
                                    <td>{item.sdbg_reference_no}</td>
                                    <td>{item.action_type}</td>
                                    <td>{formatDatee(item.validity_date)}</td>
                                    <td>{item.reason || ""}</td>
                                    <td>{item.status || ""}</td>
                                    <td>
                                      <DynamicButton label="ACTION" onClick={() => handleAction(index)} className="btn-primary btn-sm" />
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="8" className="text-center">
                                    No pending requests.
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
            </div>
            <Footer />
          </div>
        </div>
      </div>
      {isPopup && (
        <div className="popup active">
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">{isFinance ? "Finance Action" : "Dealing Officer Action"}</span>
              </h3>
              <button className="btn fw-bold btn-danger" onClick={() => setIsPopup(false)} aria-label="Close Popup">
                Close
              </button>
            </div>
            <form>
              <div className="row">
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Action <span className="star">*</span>
                    </label>
                    <select className="form-select" value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
                      <option value="">Select Action</option>
                      {isFinance ? (
                        <>
                          <option value="APPROVED">Approve</option>
                          <option value="REJECTED">Reject</option>
                        </>
                      ) : (
                        <>
                          <option value="FORWARD_TO_FINANCE">Forward to Finance</option>
                          <option value="REJECTED">Reject</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Remarks <span className="star">*</span>
                    </label>
                    <textarea value={remarkstext} onChange={(e) => setRemarkstext(e.target.value)} className="form-control" aria-label="Remarks" rows="3" />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <DynamicButton label="submit" onClick={handlePopupSave} className="btn-primary" />
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default BGExtensionSub;
