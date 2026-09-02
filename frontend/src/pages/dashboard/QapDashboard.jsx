import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainHeader from "../../components/MainHeader";
import SidebarDashboard from "../../components/SidebarDashboard";
import Footer from "../../components/Footer";

import { FiSearch } from "react-icons/fi";

import "jspdf-autotable";
import * as XLSX from "xlsx";
import { APPROVED, FORWARD_TO_FINANCE, HOLD } from "../../constants/BGconstants";
import { clrLegend } from "../../utils/clrLegend";
import SkeletonLoader from "../../loader/SkeletonLoader";
import { poHandler } from "../../redux/slices/poSlice";
import { apiCallBack } from "../../utils/fetchAPIs";
import { formatDate } from "../../utils/getDateTimeNow";
import ReactPaginate from "react-paginate";
import useDebounce from "../../customhooks/useDebounce";

const QapDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [paymentdata, setPaymentdata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedVendorType, setSelectedVendorType] = useState("All");
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const debouncedSearchQuery = useDebounce(searchQuery, 800);

  const createPayment = async (page, pageSize) => {
    setLoading(true);
    try {
      const vendorTypeParam = selectedVendorType !== "All" ? `&vendor_type=${selectedVendorType}` : "";
      const pageQuery = `/qap?pageNo=${page + 1}&pageSize=${pageSize}&search=${encodeURIComponent(debouncedSearchQuery)}&status=${encodeURIComponent(selectedStatus)}${vendorTypeParam}`;
      // const pageQuery =
      //   pageSize === "All"
      //     ? `?type=qap_submission&search=${encodeURIComponent(debouncedSearchQuery)}&status=${encodeURIComponent(selectedStatus)}`
      //     : `?type=qap_submissin&pageNo=${page + 1}&pageSize=${pageSize}&search=${encodeURIComponent(debouncedSearchQuery)}&status=${encodeURIComponent(selectedStatus)}`;

      const response = await apiCallBack("GET", `stat${pageQuery}`, null, token);

      if (response?.status) {
        const rows = Array.isArray(response.data) ? response.data : [];
        const sortedData = rows.sort((a, b) => b.created_at - a.created_at);
        setPaymentdata(sortedData);
        setTotalRecords(typeof response.count === "number" ? response.count : sortedData.length);
      } else {
        setError("Error fetching payment data: " + response.message);
        setPaymentdata([]);
        setTotalRecords(0);
      }
    } catch (error) {
      setError("Error fetching payment data: " + error.message);
      setPaymentdata([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const formatDatee = (timestamp) => {
    if (!timestamp || timestamp === "0") return "";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US");
  };
  const formatDateassign = (date) => {
    if (isNaN(date)) return "N/A";
    return date.toLocaleDateString("en-GB");
  };

  useEffect(() => {
    if (token) createPayment(currentPage, recordsPerPage);
  }, [token, currentPage, recordsPerPage, debouncedSearchQuery, selectedStatus, selectedVendorType]);

  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery, selectedStatus, selectedVendorType]);

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(e.target.value);
    setCurrentPage(0);
  };

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  const handleVendorTypeChange = (e) => {
    setSelectedVendorType(e.target.value);
    setCurrentPage(0);
  };

  const handleRowClick = (poNumber) => {
    let po = {
      poNumber,
      // poType
    };
    dispatch(poHandler(po));
    navigate(`/qap/${poNumber}`);
  };

  const filteredData = paymentdata.filter((file) => {
    if (selectedVendorType !== "All") {
      return file?.vendor_type?.toLowerCase() === selectedVendorType.toLowerCase();
    }
    return true;
  });

  const generateExcel = () => {
    const data = [
      ["Sl.NO.", "QAP NO.", "PO Number", "Material Description", "Vendor Name", "Assigned To", "Assigned on", "Accepted on", "Current status", "Status Date", "Time taken"],
      ...filteredData.map((file, index) => [
        index + 1,
        file.reference_no,
        file.bg_file_no,
        file.purchasing_doc_no,
        "",
        file.vendor_name,
        file.assigned_to,
        formatDatee(file.bg_date),
        formatDatee(file.bg_recived_date),
        file.status,
        formatDate(file.created_at),
        formatDatee(file.bg_recived_date),
      ]),
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
    downloadLink.download = "qa_dashboard.xlsx";
    downloadLink.click();
  };

  return (
    <div className="d-flex flex-column flex-row-fluid">
      <div className="page d-flex flex-row flex-column-fluid">
        {/* <SidebarDashboard /> */}
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="QA Dashboard" id={id} />
          <div className="card">
            <div className="searchfun">
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
              <div className="card_headline">
                <div>
                  <button onClick={generateExcel} className="btn fw-bold btn-primary">
                    Download QA
                  </button>
                </div>
              </div>
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="vendorTypeSelect">Select Vendor Type</label>
                  </div>
                  <div className="input_search">
                    <select id="vendorTypeSelect" className="form-select" value={selectedVendorType} onChange={handleVendorTypeChange}>
                      <option value="All">All</option>
                      <option value="msme">MSME</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="">Select Current Status</label>
                  </div>
                  <div className="input_search">
                    <select className="form-select" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                      <option value="">All</option>

                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="">Advance Search</label>
                  </div>
                  <div className="input_search">
                    <select className="form-select">
                      <option value="All">All</option>

                      <option value="ascending ">Ascending </option>
                      <option value="descending ">Descending </option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between m-2">
              <span className="fw-bold">Number of QA: {totalRecords || filteredData.length}</span>
              <select className="form-select" style={{ width: "100px" }} value={recordsPerPage} onChange={handleRecordsPerPageChange}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="All">All</option>
              </select>
            </div>
            {/* <div className="table-info">
              {loading ? (
                <SkeletonLoader />
              ) : (
                <tr className="row-count">
                  <td colSpan={10}>
                    {" "}
                    Number of AG {filteredData.length}{" "}
                    {filteredData.length === 1 ? "row" : "rows"}
                  </td>
                </tr>
              )}
            </div> */}
            <div className="table-responsive">
              <table className="table table-striped table-bordered table_height">
                <thead>
                  <tr className="row-count">
                    <td colSpan={10} style={{ textAlign: "left" }}>
                      {" "}
                      Number of QA {totalRecords || filteredData.length} {filteredData.length === 1 ? "" : ""}
                    </td>
                  </tr>
                  <tr className="border-0">
                    <th className="min-w-150px">QAP NO.</th>
                    <th className="min-w-150px">PO Number</th>
                    {/* <th className="min-w-150px">Material Description</th> */}
                    <th className="min-w-150px">Vendor Name</th>
                    <th className="min-w-150px">Vendor Code</th>
                    <th className="min-w-150px">Assigned To</th>
                    <th className="min-w-150px">Assigned on</th>
                    <th className="min-w-150px">Accepted on</th>
                    <th className="min-w-150px">Current status</th>
                    <th className="min-w-150px">Status Date</th>
                    <th className="min-w-150px">Time taken</th>
                  </tr>
                </thead>
                <tbody style={{ maxHeight: "100%" }}>
                  {loading ? (
                    <>
                      <tr></tr>
                      <tr>
                        <td colSpan={10}>
                          <SkeletonLoader col={10} row={6} />
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {filteredData.map((file, index) => (
                        <tr key={index}>
                          <td>
                            <button onClick={() => handleRowClick(file.purchasing_doc_no)} className="btn_simple">
                              <u>{file.reference_no}</u>
                            </button>
                          </td>

                          <td>{file.purchasing_doc_no}</td>
                          {/* <td>{""}</td> */}
                          <td>{file.vendor_name}</td>
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
                          <td>{file.assigned_to}</td>
                          <td>{file.assigned_on ? formatDateassign(new Date(parseInt(file.assigned_on, 10))) : "N/A"}</td>

                          {/* <td>{file.accepted_on}</td> */}
                          <td>{file.accepted_on ? formatDateassign(new Date(parseInt(file.accepted_on, 10))) : "N/A"}</td>
                          <td className={`${clrLegend(file?.status)} bold`}>{file.status}</td>
                          <td>{formatDate(file.created_at)}</td>
                          <td>{file.time_taken}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
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
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default QapDashboard;
