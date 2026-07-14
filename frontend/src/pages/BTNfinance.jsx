import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainHeader from "../components/MainHeader";
import SidebarDashboard from "../components/SidebarDashboard";
import Footer from "../components/Footer";
import { apiCallBack } from "../utils/fetchAPIs";
import { checkTypeArr } from "../utils/smallFun";
import { poHandler, doHandler } from "../redux/slices/poSlice";
import { FiSearch } from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa";
import SkeletonLoader from "../loader/SkeletonLoader";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { clrLegend } from "../utils/clrLegend";
import { formatFilePath, formatFilePathBTN } from "../utils/getDateTimeNow";
import { BsChatRightText } from "react-icons/bs";
import ReactPaginate from "react-paginate";
import useDebounce from "../customhooks/useDebounce";
import { toast } from "react-toastify";

const BTNfinance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [paymentdata, setPaymentdata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const remarksRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [btnNumSearch, setBtnNumSearch] = useState("");
  const [poNoSearch, setPoNoSearch] = useState("");
  const [assignToSearch, setAssignToSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  const debouncedBtnNum = useDebounce(btnNumSearch, 800);
  const debouncedPoNo = useDebounce(poNoSearch, 800);
  const debouncedAssignTo = useDebounce(assignToSearch, 800);

  const buildQuery = (page, pageSize) => {
    const params = new URLSearchParams();

    if (pageSize !== "All") {
      params.append("pageNo", page + 1);
      params.append("pageSize", pageSize);
    }

    if (debouncedBtnNum) params.append("btn_num", debouncedBtnNum);
    if (debouncedPoNo) params.append("poNo", debouncedPoNo);
    if (debouncedAssignTo) params.append("assign_to", debouncedAssignTo);
    if (selectedStatus && selectedStatus !== "All") params.append("status", selectedStatus);

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const createPayment = async (page, pageSize) => {
    setLoading(true);
    try {
      const query = buildQuery(page, pageSize);
      const response = await apiCallBack("GET", `stat/btn${query}`, null, token);
      if (response?.status) {
        const rows = Array.isArray(response.data) ? response.data : [];
        setPaymentdata(rows);
        setTotalRecords(typeof response.count === "number" ? response.count : rows.length);
      } else {
        setError("Error fetching data: " + response.message);
        setPaymentdata([]);
        setTotalRecords(0);
      }
    } catch (error) {
      setError("Error fetching data: " + error.message);
      setPaymentdata([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) createPayment(currentPage, recordsPerPage);
  }, [token, currentPage, recordsPerPage, debouncedBtnNum, debouncedPoNo, debouncedAssignTo, selectedStatus]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedBtnNum, debouncedPoNo, debouncedAssignTo, selectedStatus, recordsPerPage]);

  // ✅ Fetch PO details aur isDO check karo
  const checkIsDO = async (poNumber) => {
    try {
      const response = await apiCallBack("GET", `po/details?id=${poNumber}`, null, token);

      console.log("🔍 PO Details API Response:", response);

      if (response?.status && response?.data && Array.isArray(response.data) && response.data.length > 0) {
        const poData = response.data[0];
        const isDOValue = poData.isDO || false;

        console.log("✅ isDO Value Found:", {
          poNumber,
          isDOValue,
          doInfo: poData.doInfo,
        });

        dispatch(doHandler(isDOValue));
        return isDOValue;
      } else {
        console.warn("⚠️ No PO data found:", poNumber);
        dispatch(doHandler(false));
        return false;
      }
    } catch (error) {
      console.error("❌ Error checking isDO:", error);
      dispatch(doHandler(false));
      return false;
    }
  };

  // ✅ Fetch BTN details to get btn_type
  const getBTNDetails = async (poNumber, btnNum) => {
    try {
      const response = await apiCallBack("GET", `po/btn?id=${poNumber}`, null, token);

      console.log("🔍 BTN Details API Response:", response);

      if (response?.status && response?.data && Array.isArray(response.data)) {
        // Find the specific BTN
        const btnData = response.data.find((item) => item.btn_num === btnNum);

        if (btnData) {
          console.log("✅ BTN Data Found:", btnData);
          return btnData;
        } else {
          console.warn("⚠️ BTN not found in data:", btnNum);
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error("❌ Error fetching BTN details:", error);
      return null;
    }
  };

  // ✅ Check if Action button should be available
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

    const result = isMaterialBillAction || isServiceBillAction;

    console.log("🔍 Action Button Check:", {
      btnNum: btnData.btn_num,
      btnType: btnData.btn_type,
      isDO: isDOValue,
      isMaterialBillAction,
      isServiceBillAction,
      finalResult: result,
    });

    return result;
  };

  // ✅ MAIN FUNCTION: Direct navigation to Action/View page
  const handleRowClick = async (poNumber, btnNum) => {
    console.log("🎯 BTN Click Started:", { poNumber, btnNum });

    // Show loading toast
    const loadingToast = toast.loading("Loading BTN details...");

    try {
      // 1. Set PO in Redux
      let po = { poNumber };
      dispatch(poHandler(po));

      // 2. Fetch isDO
      const isDOValue = await checkIsDO(poNumber);

      // 3. Fetch BTN details
      const btnData = await getBTNDetails(poNumber, btnNum);

      if (!btnData) {
        toast.dismiss(loadingToast);
        toast.error("BTN details not found!");
        return;
      }

      // 4. Check if Action button available
      const hasActionButton = shouldShowActionButton(btnData, isDOValue);

      console.log("🚀 Navigation Decision:", {
        btnNum,
        btnType: btnData.btn_type,
        hasActionButton,
        willNavigateTo: hasActionButton ? "EDIT PAGE" : "VIEW PAGE",
      });

      let navigationPath = "";
      let navigationState = {};

      if (hasActionButton) {
        // ===== ACTION PAGE (EDIT) =====
        let type = btnData.btn_type;

        if (btnData.btn_type === "bill-incorrect-deductions" || btnData.btn_type === "other-retentions") {
          type = "any-other";
        }

        if (btnData.btn_type === "service-contract-bills") {
          navigationPath = `/checklist/bill-service/edit/${poNumber}`;
          navigationState = {
            btn_num: btnData.btn_num,
            bill_ca: btnData.bill_certifing_authority,
          };
        } else {
          navigationPath = `/checklist/${type}/edit/${poNumber}`;
          navigationState = btnData.btn_num;
        }
      } else {
        // ===== VIEW PAGE =====
        let type = "";

        if (btnData.btn_type === "hybrid-bill-material") {
          type = "hybrid-bill-material";
        } else if (btnData.btn_type === "service-contract-bills") {
          type = "bill-service";
        } else if (btnData.btn_type === "advance-bill") {
          type = "advance-bill";
        } else if (btnData.btn_type === "claim-against-pbg") {
          type = "claim-against-pbg";
        } else if (btnData.btn_type === "bill-incorrect-deductions") {
          type = "any-other";
        } else if (btnData.btn_type === "other-retentions") {
          type = "any-other";
        } else if (btnData.btn_type === "claim-against-jcc") {
          type = "claim-against-jcc";
        } else if (btnData.btn_type === "ld-penalty-refund") {
          type = "ld-penalty-refund";
        }

        navigationPath = `/checklist/${type}/view/${poNumber}`;
        navigationState = `${btnData.btn_num}`;
      }

      console.log("✅ Navigating to:", { navigationPath, navigationState });

      toast.dismiss(loadingToast);
      toast.success(`Opening ${hasActionButton ? "Action" : "View"} page...`);

      // Navigate directly to Action/View page
      navigate(navigationPath, {
        state: navigationState,
      });
    } catch (error) {
      console.error("❌ Error in handleRowClick:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to load BTN details!");
    }
  };

  const filteredData = paymentdata.sort((a, b) => {
    if (a.btn_num && b.btn_num) return b.btn_num.localeCompare(a.btn_num);
    return 0;
  });

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(e.target.value);
    setCurrentPage(0);
  };

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  const generateExcel = () => {
    const data = [
      ["BTN Num", "Vendor Name", "Vendor Code", "PO No", "Invoice No", "Yard No", "Status"],
      ...filteredData.map((file) => [file.btn_num, file.vendor_name, file.vendor_code, file.purchasing_doc_no, file.invoice_no, file.yard, file.status]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Po Details");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const excelBlob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(excelBlob);
    downloadLink.download = "btn_dashboard.xlsx";
    downloadLink.click();
  };

  const handleButtonClick = (remarks) => {
    if (popupRef.current) {
      popupRef.current.style.display = "block";
      remarksRef.current.textContent = remarks;
    }
  };

  const closePopup = () => {
    if (popupRef.current) {
      popupRef.current.style.display = "none";
      remarksRef.current.textContent = "";
    }
  };

  return (
    <div className="d-flex flex-column flex-row-fluid">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="BTN Dashboard" id={id} />
          <div className="card">
            <div className="searchfun" style={{ gap: "1rem", flexWrap: "wrap" }}>
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>BTN Num</label>
                  </div>
                  <div className="input_search">
                    <input type="text" className="form-control" value={btnNumSearch} onChange={(e) => setBtnNumSearch(e.target.value)} placeholder="Search by BTN..." />
                  </div>
                </div>
              </div>

              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>PO No</label>
                  </div>
                  <div className="input_search">
                    <input type="text" className="form-control" value={poNoSearch} onChange={(e) => setPoNoSearch(e.target.value)} placeholder="Search by PO No..." />
                  </div>
                </div>
              </div>

              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>Assign To</label>
                  </div>
                  <div className="input_search">
                    <input type="text" className="form-control" value={assignToSearch} onChange={(e) => setAssignToSearch(e.target.value)} placeholder="Search by Assign To..." />
                  </div>
                </div>
              </div>

              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>Status</label>
                  </div>
                  <div className="input_search">
                    <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      <option value="All">All</option>
                      <option value="RECEIVED">RECEIVED</option>
                      <option value="SUBMITTED_BY_VENDOR">SUBMITTED_BY_VENDOR</option>
                      <option value="SUBMITTED_BY_DO">SUBMITTED_BY_DO</option>
                      <option value="RETURN_TO_DO">RETURN_TO_DO</option>
                      <option value="PAYMENT DONE">PAYMENT DONE</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="BANK">BANK</option>
                      <option value="HOLD">HOLD</option>
                      <option value="PROCESS">PROCESS</option>
                      <option value="D-RETURN">D-RETURN</option>
                      <option value="APPROVE">APPROVE</option>
                      <option value="RECOMMEND">RECOMMEND</option>
                      <option value="DELEGATED">DELEGATED</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card_headline">
                <div>
                  <button onClick={generateExcel} className="btn fw-bold btn-primary">
                    Download BTN
                  </button>
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between m-2">
              <span className="fw-bold">Number of BTN: {totalRecords || filteredData.length}</span>
              <select className="form-select" style={{ width: "100px" }} value={recordsPerPage} onChange={handleRecordsPerPageChange}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="All">All</option>
              </select>
            </div>

            <div className="table-responsive">
              <table className="table table-striped table-bordered table_height">
                <thead>
                  <tr className="row-count">
                    <td colSpan={8} style={{ textAlign: "left" }}>
                      Number of BTN {totalRecords || filteredData.length}
                    </td>
                  </tr>
                  <tr className="border-0">
                    <th className="min-w-150px">BTN Num</th>
                    <th className="min-w-150px">Vendor Name</th>
                    <th className="min-w-150px">Vendor Code</th>
                    <th className="min-w-150px">PO No.</th>
                    <th className="min-w-150px">Invoice No.</th>
                    <th className="min-w-150px">Yard No</th>
                    <th className="min-w-150px">Status</th>
                    <th className="min-w-150px">Invoice View Option</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10}>
                        <SkeletonLoader col={8} row={6} />
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((file, index) => (
                      <tr key={index}>
                        <td>
                          <button onClick={() => handleRowClick(file.purchasing_doc_no, file.btn_num)} className="btn_simple">
                            <u>{file.btn_num}</u>
                          </button>
                        </td>
                        <td>{file.vendor_name}</td>
                        <td>{file.vendor_code}</td>
                        <td>{file.purchasing_doc_no}</td>
                        <td>{file.invoice_no}</td>
                        <td>{file.yard}</td>
                        <td className={`${clrLegend(file?.status)} bold`}>
                          <div className="d-flex align-items-center">
                            <span>{file?.status}</span>
                            {file.remarks && (
                              <div className="icon-container" style={{ position: "relative" }}>
                                <BsChatRightText className="ms-2" size={15} style={{ cursor: "pointer", color: "blue" }} onClick={() => handleButtonClick(file.remarks)} />
                                <div className="tooltip">Comments</div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {file?.invoice_file_path ? (
                            <a href={formatFilePath(file?.invoice_file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                              VIEW
                            </a>
                          ) : file?.invoice_filename ? (
                            <a href={formatFilePathBTN(file?.invoice_filename)} target="_blank" rel="noreferrer">
                              VIEW
                            </a>
                          ) : (
                            "NA"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div
                ref={popupRef}
                style={{
                  display: "none",
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "white",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
                  padding: "30px",
                  zIndex: 1000,
                  borderRadius: "8px",
                  width: "380px",
                  maxWidth: "90%",
                }}
              >
                <h4>Comments</h4>
                <p ref={remarksRef}></p>
                <button className="btn btn-danger" onClick={closePopup} style={{ marginTop: "10px", fontSize: "14px", padding: "5px 10px" }}>
                  Close
                </button>
              </div>
              <div
                style={{
                  display: "none",
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  zIndex: 999,
                }}
                onClick={closePopup}
              />
            </div>

            <ReactPaginate
              breakLabel="..."
              nextLabel="Next >"
              onPageChange={handlePageClick}
              pageRangeDisplayed={3}
              marginPagesDisplayed={2}
              pageCount={recordsPerPage === "All" ? 1 : Math.ceil((totalRecords || filteredData.length) / Number(recordsPerPage || 1))}
              previousLabel="< Prev"
              renderOnZeroPageCount={null}
              containerClassName="pagination"
              activeClassName="active"
              previousClassName="prev"
              nextClassName="next"
              disabledClassName="disabled"
              breakClassName="break"
              forcePage={currentPage}
            />
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default BTNfinance;
