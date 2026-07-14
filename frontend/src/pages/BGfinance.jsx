import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import MainHeader from "../components/MainHeader";
import SidebarDashboard from "../components/SidebarDashboard";
import Footer from "../components/Footer";
import { apiCallBack } from "../utils/fetchAPIs";
import { checkTypeArr } from "../utils/smallFun";
import { poHandler } from "../redux/slices/poSlice";
import { FiSearch } from "react-icons/fi";
import { formatDate } from "../utils/getDateTimeNow";
import SkeletonLoader from "../loader/SkeletonLoader";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { APPROVED, FORWARD_TO_FINANCE, HOLD } from "../constants/BGconstants";
import { clrLegend } from "../utils/clrLegend";
import ReactPaginate from "react-paginate";
import useDebounce from "../customhooks/useDebounce";

const BGfinance = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);
  const [paymentdata, setPaymentdata] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const debouncedSearchQuery = useDebounce(searchQuery, 800);

  const createPayment = async (page, pageSize) => {
    setLoading(true);
    try {
      const query =
        pageSize === "All"
          ? `?search=${encodeURIComponent(debouncedSearchQuery)}&status=${encodeURIComponent(selectedStatus)}`
          : `?pageNo=${page + 1}&pageSize=${pageSize}&search=${encodeURIComponent(debouncedSearchQuery)}&status=${encodeURIComponent(selectedStatus)}`;

      const response = await apiCallBack("GET", `stat/bg${query}`, null, token);
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

  useEffect(() => {
    if (token) createPayment(currentPage, recordsPerPage);
  }, [token, currentPage, recordsPerPage, debouncedSearchQuery, selectedStatus]);

  const handleRowClick = (poNumber) => {
    let po = {
      poNumber,
      // poType
    };
    dispatch(poHandler(po));
    navigate(`/sdbg/${poNumber}`);
  };

  // const filteredData = paymentdata.filter((file) => {
  //   console.log(file.status === selectedStatus);
  //   console.log("selectedStatus", selectedStatus === "All");
  //   console.log("jkfld");
  //   return (
  //     ((file.bg_file_no &&
  //       file.bg_file_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
  //       (file.reference_no &&
  //         file.reference_no
  //           .toLowerCase()
  //           .includes(searchQuery.toLowerCase())) ||
  //       (file.purchasing_doc_no &&
  //         file.purchasing_doc_no
  //           .toLowerCase()
  //           .includes(searchQuery.toLowerCase()))) &&
  //     (selectedStatus === "All" || file.status === selectedStatus)
  //   );
  // });

  const filteredData = paymentdata.sort((a, b) => {
    const dateA = new Date(Number(a.created_at));
    const dateB = new Date(Number(b.created_at));
    return dateB - dateA;
  });

  const handleRecordsPerPageChange = (e) => {
    setRecordsPerPage(e.target.value);
    setCurrentPage(0);
  };

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  const paginatedData = filteredData;

  const generateExcel = () => {
    const data = [
      [
        "BG Ref No",
        "BG File No",
        "Confirmation",
        "Status",
        "PO No",
        "Bank Guarantee No",
        "BG Date",
        "BG Amount",
        "Validity Date",
        "Claim Date",
        "BG Received Date",
      ],
      ...filteredData.map((file) => [
        file.reference_no,
        file.bg_file_no,
        file.status === FORWARD_TO_FINANCE || file.status === HOLD
          ? "NO"
          : file.status === APPROVED
          ? "YES"
          : "",
        file.status,
        file.purchasing_doc_no,
        file.bg_no,
        formatDatee(file.bg_date),
        file.bg_ammount,
        formatDatee(file.validity_date),
        formatDatee(file.claim_priod),
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
    downloadLink.download = "bg_dashboard.xlsx";

    downloadLink.click();
  };

  return (
    <div className="d-flex flex-column flex-row-fluid">
      <div className="page d-flex flex-row flex-column-fluid">
        {/* <SidebarDashboard /> */}
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title="BG Dashboard" id={id} />
          <div className="card">
            <div className="searchfun">
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="">Search</label>
                  </div>
                  <div className="input_search">
                    <input
                      type="text"
                      className="form-control"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                    />
                    <button className="search_btn">
                      <FiSearch />
                    </button>
                  </div>
                </div>
              </div>
              <div className="card_headline">
                <div>
                  <button
                    onClick={generateExcel}
                    className="btn fw-bold btn-primary"
                  >
                    Download BG
                  </button>
                </div>
              </div>
              <div className="card_headline">
                <div>
                  <div className="search_top">
                    <label htmlFor="">Select Current Status</label>
                  </div>
                  <div className="input_search">
                    <select
                      className="form-select"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="All">All</option>
                      <option value="FORWARD_TO_FINANCE">
                        FORWARD_TO_FINANCE
                      </option>
                      <option value="HOLD">HOLD</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="APPROVED">APPROVED</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center justify-content-between m-2">
              <span className="fw-bold">Number of BG: {totalRecords || filteredData.length}</span>
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
                    <td colSpan={11} style={{ textAlign: "left" }}>
                      {" "}
                      Number of BG {filteredData.length}{" "}
                      {filteredData.length === 1 ? "" : ""}
                    </td>
                  </tr>
                  <tr className="border-0">
                    <th className="min-w-150px">BG Ref No</th>
                    <th className="min-w-150px">BG File No</th>
                    <th className="min-w-150px">Confirmation</th>
                    <th className="min-w-150px">Status</th>
                    <th className="min-w-150px">PO No</th>
                    <th className="min-w-150px">Bank Guarantee No</th>
                    <th className="min-w-150px">BG Date</th>
                    <th className="min-w-150px">BG Amount</th>
                    <th className="min-w-150px">Validity Date</th>
                    <th className="min-w-150px">Claim Date</th>
                    <th className="min-w-150px">BG Received Date</th>
                  </tr>
                </thead>
                <tbody style={{ maxHeight: "100%" }}>
                  {loading ? (
                    <>
                      <tr></tr>
                      <tr>
                        <td colSpan={10}>
                          <SkeletonLoader col={11} row={6} />
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      {paginatedData.map((file, index) => (
                        <tr key={index}>
                          <td>
                            <button
                              onClick={() =>
                                handleRowClick(file.purchasing_doc_no)
                              }
                              className="btn_simple"
                            >
                              <u>{file.reference_no}</u>
                            </button>
                          </td>
                          <td>{file.bg_file_no}</td>
                          <td>
                            {(file.status === FORWARD_TO_FINANCE ||
                              file.status === HOLD) &&
                              "NO"}
                            {file.status === APPROVED && "YES"}
                          </td>
                          <td className={`${clrLegend(file?.status)} bold`}>
                            {file.status}
                          </td>
                          <td>{file.purchasing_doc_no}</td>
                          <td>{file.bg_no}</td>
                          <td>{formatDatee(file.bg_date)}</td>
                          <td>{file.bg_ammount}</td>
                          <td>{formatDatee(file.validity_date)}</td>
                          <td>{formatDatee(file.claim_priod)}</td>
                          <td>{formatDatee(file.bg_recived_date)}</td>
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

export default BGfinance;
