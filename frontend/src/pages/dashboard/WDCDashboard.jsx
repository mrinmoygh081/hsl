import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import * as XLSX from "xlsx";
import { BsChatRightText } from "react-icons/bs";
import ReactPaginate from "react-paginate";
import SkeletonLoader from "../../loader/SkeletonLoader";
import { clrLegend } from "../../utils/clrLegend";
import useDebounce from "../../customhooks/useDebounce";
import MainHeader from "../../components/MainHeader";
import Footer from "../../components/Footer";
import { apiCallBack } from "../../utils/fetchAPIs";
import { poHandler } from "../../redux/slices/poSlice";

const WDCDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  const [wdcData, setWdcData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const popupRef = useRef(null);
  const remarksRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // ---------- Filter States ----------
  const [wdcNumSearch, setWdcNumSearch] = useState("");
  const [poNoSearch, setPoNoSearch] = useState("");
  const [vendorCodeSearch, setVendorCodeSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Debounced versions
  const debouncedWdcNum = useDebounce(wdcNumSearch, 800);
  const debouncedPoNo = useDebounce(poNoSearch, 800);
  const debouncedVendorCode = useDebounce(vendorCodeSearch, 800);

  // Build query string
  const buildQuery = (page, pageSize) => {
    const params = new URLSearchParams();
    if (pageSize !== "All") {
      params.append("pageNo", page + 1);
      params.append("pageSize", pageSize);
    }
    if (debouncedWdcNum) params.append("reference_no", debouncedWdcNum);
    if (debouncedPoNo) params.append("poNo", debouncedPoNo);
    if (debouncedVendorCode) params.append("vendor_code", debouncedVendorCode);
    if (selectedStatus && selectedStatus !== "All") params.append("status", selectedStatus);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  };

  const fetchWDCData = async (page, pageSize) => {
    setLoading(true);
    try {
      const query = buildQuery(page, pageSize);
      const response = await apiCallBack("GET", `stat/wdc${query}`, null, token);
      if (response?.status) {
        const rows = Array.isArray(response.data) ? response.data : [];
        setWdcData(rows);
        setTotalRecords(typeof response.count === "number" ? response.count : rows.length);
      } else {
        setError("Error fetching data: " + response.message);
        setWdcData([]);
        setTotalRecords(0);
      }
    } catch (err) {
      setError("Error fetching data: " + err.message);
      setWdcData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchWDCData(currentPage, recordsPerPage);
  }, [token, currentPage, recordsPerPage, debouncedWdcNum, debouncedPoNo, debouncedVendorCode, selectedStatus]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedWdcNum, debouncedPoNo, debouncedVendorCode, selectedStatus, recordsPerPage]);

  const handleRowClick = (poNumber, referenceNo) => {
    dispatch(poHandler({ poNumber }));
    navigate(`/wdc/${poNumber}`, {
      state: { highlightWdcNum: referenceNo },
    });
  };

  const filteredData = [...wdcData].sort((a, b) => {
    if (a.reference_no && b.reference_no) return b.reference_no.localeCompare(a.reference_no);
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
      ["WDC Ref No", "PO No", "Vendor Code", "Unit", "Work Title", "Action Type", "Status"],
      ...filteredData.map((file) => [file.reference_no, file.purchasing_doc_no, file.vendor_code, file.unit, file.work_title, file.action_type, file.status]),
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "WDC Details");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const excelBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(excelBlob);
    downloadLink.download = "wdc_dashboard.xlsx";
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
          <MainHeader title="WDC Dashboard" id={id} />

          <div className="card">
            {/* ========== FILTER INPUTS ========== */}
            <div className="searchfun" style={{ gap: "1rem", flexWrap: "wrap" }}>
              {/* WDC Ref No Filter */}
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>WDC Ref No</label>
                  </div>
                  <div className="input_search">
                    <input type="text" className="form-control" value={wdcNumSearch} onChange={(e) => setWdcNumSearch(e.target.value)} placeholder="Search by WDC Ref..." />
                  </div>
                </div>
              </div>

              {/* PO No Filter */}
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

              {/* Vendor Code Filter */}
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>Vendor Code</label>
                  </div>
                  <div className="input_search">
                    <input
                      type="text"
                      className="form-control"
                      value={vendorCodeSearch}
                      onChange={(e) => setVendorCodeSearch(e.target.value)}
                      placeholder="Search by Vendor Code..."
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label>Status</label>
                  </div>
                  <div className="input_search">
                    <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      <option value="All">All</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="RECOMMEND">RECOMMEND</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="CANCEL_REQUESTED">CANCEL_REQUESTED</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="card_headline">
                <div>
                  <button onClick={generateExcel} className="btn fw-bold btn-primary">
                    Download WDC
                  </button>
                </div>
              </div>
            </div>

            {/* Records count + page size selector */}
            <div className="d-flex align-items-center justify-content-between m-2">
              <span className="fw-bold">Number of WDC: {totalRecords || filteredData.length}</span>
              <select className="form-select" style={{ width: "100px" }} value={recordsPerPage} onChange={handleRecordsPerPageChange}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="All">All</option>
              </select>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-striped table-bordered table_height">
                <thead>
                  <tr className="row-count">
                    <td colSpan={7} style={{ textAlign: "left" }}>
                      Number of WDC: {totalRecords || filteredData.length}
                    </td>
                  </tr>
                  <tr className="border-0">
                    <th className="min-w-200px">WDC Ref No</th>
                    <th className="min-w-150px">PO No.</th>
                    <th className="min-w-150px">Vendor Code</th>
                    <th className="min-w-100px">Unit</th>
                    <th className="min-w-200px">Work Title</th>
                    <th className="min-w-120px">Action Type</th>
                    <th className="min-w-150px">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7}>
                        <SkeletonLoader col={7} row={6} />
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No WDC records found.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((file, index) => (
                      <tr key={index}>
                        {/* WDC Ref No - clickable */}
                        <td>
                          <button onClick={() => handleRowClick(file.purchasing_doc_no, file.reference_no)} className="btn_simple">
                            <u>{file.reference_no}</u>
                          </button>
                        </td>
                        <td>{file.purchasing_doc_no}</td>
                        <td>
                          {file.vendor_code}
                          {file?.vendor_type?.toLowerCase() === "msme" && (
                            <span
                              style={{
                                display: "inline-block",
                                marginLeft: "6px",
                                padding: "1px 7px",
                                fontSize: "10px",
                                fontWeight: "bold",
                                color: "#fff",
                                backgroundColor: "#28a745",
                                borderRadius: "10px",
                                textTransform: "uppercase",
                                verticalAlign: "middle",
                              }}
                            >
                              MSME
                            </span>
                          )}
                        </td>
                        <td>{file.unit}</td>
                        <td>{file.work_title}</td>
                        <td>{file.action_type}</td>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Remarks Popup */}
              <div
                ref={popupRef}
                style={{
                  display: "none",
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "white",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.3)",
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
                  backgroundColor: "rgba(0,0,0,0.5)",
                  zIndex: 999,
                }}
                onClick={closePopup}
              />
            </div>

            {/* Pagination */}
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

export default WDCDashboard;
