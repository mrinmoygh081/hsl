import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import { Modal, Button } from "react-bootstrap";
import { BsChatRightText } from "react-icons/bs";
import { DEPT_FI, DEPT_IT, USER_GRSE_CONTRACT, USER_GRSE_PURCHASE } from "../constants/userConstants";
import { Link } from "react-router-dom";
import ReactPaginate from "react-paginate";
import { formatDate } from "../utils/getDateTimeNow";
import useDebounce from "../customhooks/useDebounce";

const HrContractvendorViewOnly = () => {
  const [viewApi, setViewApi] = useState([]);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterRcNo, setFilterRcNo] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPoNo, setFilterPoNo] = useState("");
  const [filterVendorCode, setFilterVendorCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRowRemarks, setSelectedRowRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Debounced text filters
  const debouncedRcNo = useDebounce(filterRcNo, 800);
  const debouncedPoNo = useDebounce(filterPoNo, 800);
  const debouncedVendorCode = useDebounce(filterVendorCode, 800);
  const debouncedUnit = useDebounce(filterUnit, 800);
  const debouncedSearch = useDebounce(searchQuery, 800);

  const { token, user } = useSelector((state) => state.auth);
  const hrUrl = "po/hr/compliance";

  const isAuthorized =
    user?.vendor_code === "602717" ||
    user?.vendor_code === "600233" ||
    user?.vendor_code === "601824" ||
    user?.vendor_code === "199609" ||
    user?.department_id === USER_GRSE_CONTRACT ||
    user?.department_id === USER_GRSE_PURCHASE ||
    user?.department_id === DEPT_FI ||
    user?.department_id === DEPT_IT;

  const showStatus = (row) => row.status || row.hr_retailer_status || row.vendor_status || "--";
  const showRemarks = (row) => row.hr_remarks || row.hr_retailer_remarks || null;

  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const statusOptions = [
    { value: "SUBMITTED", label: "SUBMITTED" },
    { value: "RECOMMEND", label: "RECOMMEND" },
    { value: "NOT_RECOMMEND", label: "NOT RECOMMEND" },
    { value: "APPROVED", label: "APPROVED" },
    { value: "REJECTED", label: "REJECTED" },
    { value: "HOLD_BY_HR", label: "HOLD BY HR" },
    { value: "HOLD_BY_HR_RECIPIENT", label: "HOLD BY HR RECIPIENT" },
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "APPROVED":
        return "bg-success";
      case "SUBMITTED":
        return "bg-primary";
      case "REJECTED":
        return "bg-danger";
      case "HOLD_BY_HR":
      case "HOLD_BY_HR_RECIPIENT":
        return "bg-warning text-dark";
      case "RECOMMEND":
        return "bg-info text-dark";
      case "NOT_RECOMMEND":
        return "bg-secondary";
      default:
        return "bg-light text-dark border";
    }
  };

  // Filter change hone par page 0 reset
  useEffect(() => {
    setCurrentPage(0);
  }, [filterMonth, filterYear, filterStatus, debouncedRcNo, debouncedPoNo, debouncedVendorCode, debouncedUnit, debouncedSearch, itemsPerPage]);

  // Query builder
  const buildQuery = () => {
    let query = "?type=view";
    if (filterMonth) query += `&month=${encodeURIComponent(filterMonth)}`;
    if (filterYear) query += `&year=${encodeURIComponent(filterYear)}`;
    if (debouncedRcNo) query += `&rc_no=${encodeURIComponent(debouncedRcNo)}`;
    if (filterStatus) query += `&status=${encodeURIComponent(filterStatus)}`;
    if (debouncedPoNo) query += `&poNo=${encodeURIComponent(debouncedPoNo)}`;
    if (debouncedVendorCode) query += `&vendor_code=${encodeURIComponent(debouncedVendorCode)}`;
    if (debouncedUnit) query += `&unit=${encodeURIComponent(debouncedUnit)}`;
    if (debouncedSearch) query += `&search=${encodeURIComponent(debouncedSearch)}`;
    if (itemsPerPage !== "All") {
      query += `&pageNo=${currentPage + 1}&pageSize=${itemsPerPage}`;
    }
    return query;
  };

  // Fetch function
  const fetchComplianceView = async () => {
    setLoading(true);
    try {
      const query = buildQuery();
      const data = await apiCallBack("GET", `${hrUrl}${query}`, null, token);
      if (data?.status) {
        const rows = data.data || [];
        setViewApi(rows);
        const total = data.count || rows.length;
        setTotalCount(total);
      } else {
        setViewApi([]);
        setTotalCount(0);
        toast.error(data?.message || "No compliance data found.");
      }
    } catch (error) {
      toast.error("Error fetching compliance view.");
      setViewApi([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && token) fetchComplianceView();
  }, [token, isAuthorized, currentPage, itemsPerPage, filterMonth, filterYear, filterStatus, debouncedRcNo, debouncedPoNo, debouncedVendorCode, debouncedUnit, debouncedSearch]);

  const handleRecordsPerPageChange = (e) => {
    setItemsPerPage(e.target.value);
    setCurrentPage(0);
  };

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  if (!isAuthorized) {
    return (
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title="HR COMPLIANCE" />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="container mt-4">
                <div className="card p-4">
                  <h4 className="mb-4 fw-bold">Access Denied</h4>
                  <p>You do not have permission to access this page.</p>
                  <Link to="/" className="btn btn-primary">
                    Go to Home
                  </Link>
                </div>
              </div>
              <Footer />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="HR COMPLIANCE" />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="container-fluid px-4 py-2">
              {/* Filter Card */}
              <div className="card mb-4 border-0" style={{ backgroundColor: "#2a2d93", borderRadius: "12px" }}>
                <div className="card-body py-3">
                  <div className="row g-3 align-items-end">
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">Vendor Code</label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Vendor Code"
                        value={filterVendorCode}
                        onChange={(e) => setFilterVendorCode(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">PO No</label>
                      <input type="text" className="form-control form-control-sm" placeholder="PO No" value={filterPoNo} onChange={(e) => setFilterPoNo(e.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">Unit</label>
                      <input type="text" className="form-control form-control-sm" placeholder="Unit" value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">RC No</label>
                      <input type="text" className="form-control form-control-sm" placeholder="RC No" value={filterRcNo} onChange={(e) => setFilterRcNo(e.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">Month</label>
                      <select className="form-select form-select-sm" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
                        <option value="">All Months</option>
                        {monthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">Year</label>
                      <select className="form-select form-select-sm" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                        <option value="">All Years</option>
                        {yearOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label fw-semibold small mb-1 text-white">Status</label>
                      <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="">All Statuses</option>
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ Table Card — POs.jsx jaisa card structure */}
              <div className="card">
                {/* ✅ Total Records + Rows per page — POs.jsx jaisa exactly */}
                <div className="d-flex align-items-center justify-content-between m-2">
                  <span className="fw-bold">Total Records: {totalCount}</span>
                  <select className="form-select" style={{ width: "100px" }} value={itemsPerPage} onChange={handleRecordsPerPageChange}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="All">All</option>
                  </select>
                </div>

                {/* Table */}
                <div className="table-responsive">
                  <table className="table table-hover table-bordered mb-0 align-middle small">
                    <thead className="table-light">
                      <tr>
                        <th className="px-2 py-2">Vendor Code</th>
                        <th className="px-2 py-2">PO No</th>
                        <th className="px-2 py-2">Unit</th>
                        <th className="px-2 py-2">RC No</th>
                        <th className="px-2 py-2">Compl Month</th>
                        <th className="px-2 py-2">Compl Year</th>
                        <th className="px-2 py-2">PF</th>
                        <th className="px-2 py-2">ESI</th>
                        <th className="px-2 py-2">WAGES</th>
                        <th className="px-2 py-2">EL</th>
                        <th className="px-2 py-2">BONUS</th>
                        <th className="px-2 py-2">OTHERS</th>
                        <th className="px-2 py-2">File</th>
                        <th className="px-2 py-2">Supp Doc</th>
                        <th className="px-2 py-2">Submission Date</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <SkeletonTheme baseColor="#e9ecef" highlightColor="#f8f9fa">
                          {Array(5)
                            .fill()
                            .map((_, idx) => (
                              <tr key={idx}>
                                {Array(16)
                                  .fill()
                                  .map((_, ci) => (
                                    <td key={ci}>
                                      <Skeleton height={21} />
                                    </td>
                                  ))}
                              </tr>
                            ))}
                        </SkeletonTheme>
                      ) : viewApi.length > 0 ? (
                        viewApi.map((row, idx) => (
                          <tr key={idx}>
                            <td>{row.vendor_code || "--"}</td>
                            <td>{row.purchasing_doc_no || "--"}</td>
                            <td>{row.unit || "--"}</td>
                            <td>{row.rc_no || "--"}</td>
                            <td>{monthOptions.find((m) => m.value === row.compliance_month)?.label || "--"}</td>
                            <td>{row.compliance_year || "--"}</td>
                            <td>{row.pf === "Y" ? "✔" : "✘"}</td>
                            <td>{row.esi === "Y" ? "✔" : "✘"}</td>
                            <td>{row.wages === "Y" ? "✔" : "✘"}</td>
                            <td>{row.leave_salary === "Y" ? "✔" : "✘"}</td>
                            <td>{row.bonus === "Y" ? "✔" : "✘"}</td>
                            <td>{row.others === "Y" ? "✔" : "✘"}</td>
                            <td>
                              {row.file1 ? (
                                <a
                                  href={`${process.env.REACT_APP_PDF_URL}/${row.file1}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-secondary py-0 px-2"
                                >
                                  View
                                </a>
                              ) : (
                                "--"
                              )}
                            </td>
                            <td>
                              {(() => {
                                let docs = [];
                                try {
                                  docs = row.supporting_doc ? JSON.parse(row.supporting_doc) : [];
                                } catch (e) {
                                  docs = [];
                                }
                                return docs.length
                                  ? docs.map((doc, i) => (
                                      <a key={i} href={`${process.env.REACT_APP_PDF_URL}/${doc}`} target="_blank" rel="noopener noreferrer" className="d-block small">
                                        Doc {i + 1}
                                      </a>
                                    ))
                                  : "--";
                              })()}
                            </td>
                            <td>{formatDate(row.created_at)}</td>
                            <td>
                              <div className="d-flex align-items-center gap-1">
                                <span className={`badge ${getStatusBadgeClass(showStatus(row))} px-2 py-1 rounded-pill fw-normal`}>{showStatus(row)}</span>
                                {showRemarks(row) && (
                                  <BsChatRightText
                                    size={14}
                                    className="text-primary cursor-pointer"
                                    onClick={() => {
                                      setSelectedRowRemarks(showRemarks(row));
                                      setShowRemarksModal(true);
                                    }}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="16" className="text-center py-4 text-muted">
                            No Compliance Data Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ✅ Pagination — POs.jsx jaisa: card ke BAHAR, koi extra div/wrapper nahi */}
              <ReactPaginate
                breakLabel="..."
                nextLabel="Next >"
                onPageChange={handlePageClick}
                pageRangeDisplayed={3}
                marginPagesDisplayed={2}
                pageCount={itemsPerPage === "All" ? 1 : Math.ceil((totalCount || viewApi.length) / Number(itemsPerPage || 1))}
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
          </div>
          <Footer />
        </div>
      </div>

      {/* Remarks Modal */}
      <Modal show={showRemarksModal} onHide={() => setShowRemarksModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remarks</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{selectedRowRemarks || "No remarks available."}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemarksModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default HrContractvendorViewOnly;
