import React, { Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import MainHeader from "../../components/MainHeader";
import { apiCallBack } from "../../utils/fetchAPIs";
import { doHandler, poHandler } from "../../redux/slices/poSlice";
import Footer from "../../components/Footer";
import { FiSearch } from "react-icons/fi";
import SkeletonLoader from "../../loader/SkeletonLoader";
import { formatDate } from "../../utils/getDateTimeNow";
import { clrLegend } from "../../utils/clrLegend";

const TaskList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await apiCallBack("GET", "po/task", null, token);
      if (response?.status && Array.isArray(response.data)) {
        setData(response.data);
      } else {
        setError("Error fetching tasks: " + (response?.message || "Unknown error"));
      }
    } catch (error) {
      setError("Error fetching tasks: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDatee = (timestamp) => {
    if (!timestamp || timestamp === "0") return "";
    const ms = Number(timestamp) * (timestamp < 10000000000 ? 1000 : 1);
    const date = new Date(ms);
    return isNaN(date)
      ? ""
      : date.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  };

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  // ✅ isDO check karne ke liye (BTNfinance.jsx wali same logic)
  const checkIsDO = async (poNumber) => {
    try {
      const response = await apiCallBack("GET", `po/details?id=${poNumber}`, null, token);
      if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const poData = response.data[0];
        const isDOValue = poData.isDO || false;
        dispatch(doHandler(isDOValue));
        return isDOValue;
      } else {
        dispatch(doHandler(false));
        return false;
      }
    } catch (error) {
      console.error("Error checking isDO:", error);
      dispatch(doHandler(false));
      return false;
    }
  };

  // ✅ BTN details fetch karne ke liye (btn_type nikalne ke liye)
  const getBTNDetails = async (poNumber, btnNum) => {
    try {
      const response = await apiCallBack("GET", `po/btn?id=${poNumber}`, null, token);
      if (response?.status && response?.data && Array.isArray(response.data)) {
        const btnData = response.data.find((item) => item.btn_num === btnNum);
        return btnData || null;
      }
      return null;
    } catch (error) {
      console.error("Error fetching BTN details:", error);
      return null;
    }
  };

  // ✅ Action button available hai ya nahi check karne ke liye
  const shouldShowActionButton = (btnData, isDOValue) => {
    if (!btnData) return false;

    const isMaterialBillAction =
      isDOValue &&
      ["hybrid-bill-material", "advance-bill", "claim-against-pbg", "bill-incorrect-deductions", "ld-penalty-refund", "other-retentions", "claim-against-jcc"].includes(
        btnData.btn_type,
      );

    const isServiceBillAction =
      btnData.btn_type === "service-contract-bills" &&
      (user?.vendor_code === btnData?.bill_certifing_authority || isDOValue || (user?.vendor_code && btnData?.delegate_to && user.vendor_code === btnData.delegate_to));

    return isMaterialBillAction || isServiceBillAction;
  };

  const handleRowClick = async (row) => {
    if (!row?.purchasing_doc_no || !row?.doc_type) {
      console.error("Invalid row:", row);
      return;
    }
    const po = { poNumber: row.purchasing_doc_no };
    const docTypeLower = row.doc_type.toLowerCase();

    // ✅ BTN ke liye: seedha Action/View page pe navigate karo, Checklist list page pe nahi
    if (docTypeLower === "btn") {
      dispatch(poHandler(po));
      const loadingToast = toast.loading("Loading BTN details...");

      try {
        const isDOValue = await checkIsDO(row.purchasing_doc_no);
        const btnData = await getBTNDetails(row.purchasing_doc_no, row.btn_num);

        if (!btnData) {
          toast.dismiss(loadingToast);
          toast.error("BTN details not found!");
          return;
        }

        const hasActionButton = shouldShowActionButton(btnData, isDOValue);
        let navigationPath = "";
        let navigationState = {};

        if (hasActionButton) {
          let type = btnData.btn_type;

          if (btnData.btn_type === "bill-incorrect-deductions" || btnData.btn_type === "other-retentions") {
            type = "any-other";
          }

          if (btnData.btn_type === "service-contract-bills") {
            navigationPath = `/checklist/bill-service/edit/${row.purchasing_doc_no}`;
            navigationState = {
              btn_num: btnData.btn_num,
              bill_ca: btnData.bill_certifing_authority,
            };
          } else {
            navigationPath = `/checklist/${type}/edit/${row.purchasing_doc_no}`;
            navigationState = btnData.btn_num;
          }
        } else {
          let type = "";

          if (btnData.btn_type === "hybrid-bill-material") type = "hybrid-bill-material";
          else if (btnData.btn_type === "service-contract-bills") type = "bill-service";
          else if (btnData.btn_type === "advance-bill") type = "advance-bill";
          else if (btnData.btn_type === "claim-against-pbg") type = "claim-against-pbg";
          else if (btnData.btn_type === "bill-incorrect-deductions") type = "any-other";
          else if (btnData.btn_type === "other-retentions") type = "any-other";
          else if (btnData.btn_type === "claim-against-jcc") type = "claim-against-jcc";
          else if (btnData.btn_type === "ld-penalty-refund") type = "ld-penalty-refund";

          navigationPath = `/checklist/${type}/view/${row.purchasing_doc_no}`;
          navigationState = `${btnData.btn_num}`;
        }

        toast.dismiss(loadingToast);
        navigate(navigationPath, { state: navigationState });
      } catch (error) {
        console.error("Error in BTN handleRowClick:", error);
        toast.dismiss(loadingToast);
        toast.error("Failed to load BTN details!");
      }
      return;
    }

    // ✅ Baaki doc types (wdc, jcc, sdbg, drawing, qap, ilms) ke liye purana behavior same rahega
    const pathMap = {
      wdc: "wdc",
      jcc: "wdc", // JCC bhi WDC route pe jayega
      sdbg: "sdbg",
      drawing: "drawing",
      qap: "qap",
      ilms: "ilms",
      default: "po",
    };

    const path = pathMap[docTypeLower] || pathMap.default;
    dispatch(poHandler(po));
    dispatch(doHandler(row?.isDO));
    const targetPath = `/${path}/${po.poNumber}`;
    navigate(targetPath);
  };

  const toggleGroup = (docType) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [docType]: !prev[docType],
    }));
  };

  // Color palette for group headers
  const groupColors = {
    BTN: "#e3f2fd", // Light blue
    WDC: "#e8f5e9", // Light green (WDC + JCC dono ke liye)
    SDBG: "#f3e5f5", // Light purple
    DRAWING: "#ffebee", // Light red
    QAP: "#e8eaf6", // Light indigo
    ILMS: "#fce4ec", // Light pink
    Unknown: "#f5f5f5", // Light gray
  };

  // Group and filter data
  const filteredData = data
    .filter((file) => {
      const search = searchQuery.toLowerCase();
      return (
        ((file.btn_num || "").toLowerCase().includes(search) ||
          (file.purchasing_doc_no || "").toLowerCase().includes(search) ||
          (file.assign_by || "").toLowerCase().includes(search)) &&
        (selectedStatus === "All" || file.status === selectedStatus)
      );
    })
    .sort((a, b) => new Date(Number(b.created_at)) - new Date(Number(a.created_at)));

  // JCC ko WDC mein merge karna (grouping ke liye) - UPPERCASE mein normalize karo
  const normalizedData = filteredData.map((file) => {
    const docTypeLower = (file.doc_type || "").toLowerCase().trim();

    // JCC ko WDC ke saath merge karo, baaki sab uppercase mein
    let groupKey;
    if (docTypeLower === "jcc" || docTypeLower === "wdc") {
      groupKey = "WDC";
    } else if (docTypeLower) {
      groupKey = file.doc_type.toUpperCase().trim();
    } else {
      groupKey = "Unknown";
    }

    return {
      ...file,
      groupKey, // Grouping ke liye
      // doc_type original hi rahega display ke liye
    };
  });

  const groupedData = normalizedData.reduce((acc, file) => {
    const docType = file.groupKey; // Grouping ke liye groupKey use karo
    if (!acc[docType]) acc[docType] = [];
    acc[docType].push(file);
    return acc;
  }, {});

  const groupedDataArray = Object.keys(groupedData)
    .sort() // Alphabetically sort karo
    .map((docType) => ({
      docType,
      items: groupedData[docType],
    }));

  return (
    <div className="d-flex flex-column flex-row-fluid">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="MyTask" id={id} />
          <div className="card">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            <div className="searchfun ">
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="">Search</label>
                  </div>
                  <div className="input_search">
                    <input type="text" className="form-control" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." />
                    <button className="search_btn">
                      <FiSearch />
                    </button>
                  </div>
                </div>
              </div>
              <div className="card_headline">{/* Placeholder for download button or other controls */}</div>
              <div className="card_headline">
                <div className="search_top">
                  <label htmlFor="statusSelect" className="form-label">
                    Select Current Status
                  </label>
                </div>
                <div className="input_search">
                  <select id="statusSelect" className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                    <option value="All">All</option>
                    <option value="FORWARD_TO_FINANCE">Forward to Finance</option>
                    <option value="HOLD">Hold</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
              <table className="table table-striped table-bordered table_height">
                <thead>
                  <tr className="border-0">
                    <th className="min-w-150px">Document No</th>
                    <th className="min-w-150px">Type</th>
                    <th className="min-w-150px">PO</th>
                    <th className="min-w-150px">Action Date</th>
                    <th className="min-w-150px">Action By</th>
                    <th className="min-w-150px">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <>
                      <tr></tr>
                      <tr>
                        <td colSpan={6}>
                          <SkeletonLoader col={6} row={6} />
                        </td>
                      </tr>
                    </>
                  ) : groupedDataArray.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "40px 20px",
                            gap: "12px",
                          }}
                        >
                          <div style={{ fontSize: "40px" }}>📋</div>
                          <h5 style={{ fontWeight: "600", color: "#344054", margin: 0 }}>No Tasks Assigned</h5>
                          <p style={{ color: "#667085", fontSize: "14px", margin: 0, textAlign: "center", maxWidth: "380px" }}>
                            No Pending Tasks at This Time. You will be notified here as soon as a new task is assigned to you.
                          </p>
                          <button className="btn btn-primary btn-sm mt-2" onClick={() => navigate("/po")}>
                            Go to PO List →
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groupedDataArray.map((group, groupIndex) => (
                      <React.Fragment key={groupIndex}>
                        <tr
                          className="group-header fw-bold cursor-pointer"
                          style={{
                            backgroundColor: groupColors[group.docType.toUpperCase()] || groupColors.Unknown,
                            transition: "background-color 0.2s",
                          }}
                          onClick={() => toggleGroup(group.docType)}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#e0e0e0")}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = groupColors[group.docType.toUpperCase()] || groupColors.Unknown)}
                          aria-expanded={expandedGroups[group.docType] || false}
                        >
                          <td colSpan={6} className="fw-bold">
                            {group.docType.toUpperCase()} ({group.items.length} {group.items.length === 1 ? "item" : "items"})
                          </td>
                        </tr>
                        {expandedGroups[group.docType] &&
                          group.items.map((file, index) => (
                            <tr key={`${groupIndex}-${index}`}>
                              <td>
                                <button onClick={() => handleRowClick(file)} className="btn_simple text-primary text-decoration-underline">
                                  {file?.doc_no || "N/A"}
                                </button>
                              </td>
                              <td>{file.doc_type || "Unknown"}</td>
                              <td>{file.purchasing_doc_no || "N/A"}</td>
                              <td>{formatDate(file.created_at)}</td>
                              <td>{file.assign_by || "N/A"}</td>
                              <td className={`${clrLegend(file?.status)} fw-bold`}>{file.status || "N/A"}</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default TaskList;
