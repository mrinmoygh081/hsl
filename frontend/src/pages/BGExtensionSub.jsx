import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { convertToEpoch, formatDate } from "../utils/getDateTimeNow";
import { toast } from "react-toastify";
import SkeletonLoader from "../loader/SkeletonLoader";
import DynamicButton from "../Helpers/DynamicButton";
import HrSearchableSelect from "../components/HrSearchableSelect"; // import custom component

const BGExtensionSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [remarkstext, setRemarkstext] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState(""); // new state for range dropdown
  const { token, user } = useSelector((state) => state.auth);

  const handlePopupToggle = () => {
    setIsPopup(!isPopup);
  };

  const predefinedRanges = [
    { value: "upcomingOneMonth", label: "Upcoming One Month" },
    { value: "upcomingTwoMonths", label: "Upcoming Two Months" },
  ];

  const handleRangeChange = (selectedOption) => {
    if (!selectedOption) {
      setSelectedRange("");
      return;
    }
    setSelectedRange(selectedOption.value);
    const today = new Date();
    let start, end;

    if (selectedOption.value === "upcomingOneMonth") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (selectedOption.value === "upcomingTwoMonths") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    }

    setStartDate(start);
    setEndDate(end);
    handleSearch(start, end);
  };

  useEffect(() => {
    if (user.department_id === 15 && user.internal_role_id === 1) {
      fetchTableData();
    }
  }, [user.department_id, user.internal_role_id]);

  const fetchTableData = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", `po/sdbg/getBGForFinance`, {}, token);
      if (response?.data) {
        setTableData(response.data);
      } else {
        console.error("Error fetching data:", response.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (start = startDate, end = endDate) => {
    if (start && end) {
      setLoading(true);
      const payload = {
        startDate: convertToEpoch(new Date(start)),
        endDate: convertToEpoch(new Date(end)),
      };

      try {
        const empListData = await apiCallBack("POST", `po/sdbg/bger`, payload, token);
        if (empListData?.data) {
          setTableData(empListData.data);
        } else {
          console.error("Error fetching data:", empListData.message);
        }
      } catch (error) {
        console.error("Error fetching employee list:", error.message);
      } finally {
        setLoading(false);
      }
    } else {
      toast.warning("Please select both start and end dates.");
    }
  };

  const handleSave = (index) => {
    setSelectedRow(index);
    setIsPopup(true);
  };

  const handlePopupSave = async () => {
    if (!selectedAction || !remarkstext) {
      toast.warning("Please select an action and enter remarks.");
      return;
    }

    const selectedRowData = tableData[selectedRow];
    const payload = {
      reference_no: selectedRowData.reference_no,
      purchasing_doc_no: selectedRowData.purchasing_doc_no,
      bg_file_no: selectedRowData.bg_file_no,
      recommendation_type: selectedAction,
      remarks: remarkstext,
    };

    try {
      const response = await apiCallBack("POST", "po/sdbg/recommendationBger", payload, token);

      if (response?.status) {
        toast.success(response.message || "Success");
        setRemarkstext("");
      } else {
        toast.warning(response.message || "An error occurred");
        setRemarkstext("");
      }
    } catch (error) {
      toast.error("Error saving data: " + error.message);
    } finally {
      setIsPopup(false);
    }
  };

  const formatDatee = (timestamp) => {
    if (!timestamp || timestamp === "0") return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US");
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
                        {!(user.department_id === 15 && user.internal_role_id === 1) && (
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="d-flex">
                              <div className="me-2">
                                <DatePicker
                                  selected={startDate}
                                  onChange={(date) => setStartDate(date)}
                                  selectsStart
                                  startDate={startDate}
                                  endDate={endDate}
                                  className="form-control me-2"
                                  placeholderText="Start Date"
                                  aria-label="Start Date"
                                />
                              </div>
                              <div className="me-2">
                                <DatePicker
                                  selected={endDate}
                                  onChange={(date) => setEndDate(date)}
                                  selectsEnd
                                  startDate={startDate}
                                  endDate={endDate}
                                  minDate={startDate}
                                  className="form-control me-2"
                                  placeholderText="End Date"
                                  aria-label="End Date"
                                />
                              </div>
                              <DynamicButton label="SEARCH" onClick={() => handleSearch(startDate, endDate)} className="btn fw-bold btn-sm btn-primary me-2" />
                            </div>
                            <HrSearchableSelect
                              options={predefinedRanges}
                              value={selectedRange}
                              onChange={handleRangeChange}
                              placeholder="Select Range"
                              width="200px"
                              isClearable={false}
                            />
                          </div>
                        )}
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table_height">
                            <thead>
                              <tr className="border-0">
                                <th>PO Num</th>
                                <th>BG Ref Num</th>
                                <th>BG File No</th>
                                {user.department_id === 15 && user.internal_role_id === 1 && <th>Recommendation Type</th>}
                                {user.department_id === 15 && user.internal_role_id === 1 && <th>Remarks</th>}
                                {user.department_id === 15 && user.internal_role_id === 1 && <th>Status</th>}
                                {!(user.department_id === 15 && user.internal_role_id === 1) && <th>Validity Date</th>}
                                {!(user.department_id === 15 && user.internal_role_id === 1) && <th>Action</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr>
                                  <td colSpan="6">
                                    <SkeletonLoader />
                                  </td>
                                </tr>
                              ) : tableData?.length > 0 ? (
                                tableData.map((item, index) => (
                                  <tr key={index}>
                                    <td className="table_center">{item.purchasing_doc_no}</td>
                                    <td>{item.reference_no}</td>
                                    <td>{item.bg_file_no || ""}</td>
                                    {user.department_id === 15 && user.internal_role_id === 1 && <td>{item.recommendation_type || ""}</td>}
                                    {user.department_id === 15 && user.internal_role_id === 1 && <td>{item.remarks || ""}</td>}
                                    {user.department_id === 15 && user.internal_role_id === 1 && <td>{item.status || ""}</td>}
                                    {!(user.department_id === 15 && user.internal_role_id === 1) && <td>{item.validity_date && formatDatee(item.validity_date)}</td>}
                                    {!(user.department_id === 15 && user.internal_role_id === 1) && (
                                      <td>
                                        <div className="d-flex">
                                          <select name="action" className="form-select me-2" aria-label="Action" onChange={(e) => setSelectedAction(e.target.value)}>
                                            <option value="">Select Action</option>
                                            <option value="EXTENSION">Extension</option>
                                            <option value="RELEASE">Release</option>
                                          </select>
                                          <button className="btn btn-primary" onClick={() => handleSave(index)} aria-label="Save">
                                            SAVE
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="5" className="text-center">
                                    No data available
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
                <span className="card-label fw-bold fs-3 mb-1">{selectedAction}</span>
              </h3>
              <button className="btn fw-bold btn-danger" onClick={handlePopupToggle} aria-label="Close Popup">
                Close
              </button>
            </div>
            <form>
              <div className="row">
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
