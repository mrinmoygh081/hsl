import React, { useState, useEffect } from "react";

import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import MainHeadery from "../components/MainHeader";
import moment from "moment";

const ReportComponent = () => {
  const [tableData, setTableData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [logCount, setLogCount] = useState(0);
  const [choosedept, setChoosedept] = useState(null);
  const [selectedDept, setSelectedDept] = useState("");
  const { token, user } = useSelector((state) => state.auth);
  const [employeeList, setEmployeeList] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    (async () => {
      const data = await apiCallBack(
        "GET",
        `po/dashboard/subdeptlist`,
        null,
        token
      );
      if (data?.status) {
        setChoosedept(data?.data);
      }
    })();
  }, [token]);

  useEffect(() => {
    const fetchEmployeeList = async () => {
      const payload = {
        department_id: user.department_id,
        sub_dept_id: selectedDept,
      };
      try {
        const empListData = await apiCallBack(
          "POST",
          `po/dashboard/empList`,
          payload,
          token
        );

        if (empListData?.status) {
          setEmployeeList(empListData?.data);
        }
      } catch (error) {
        console.error("Error fetching employee list:", error.message);
      }
    };

    if (selectedDept) {
      fetchEmployeeList();
    }
  }, [selectedDept, token]);

  const handleSearch = async () => {
    try {
      const formDataToSend = {
        page: currentPage,
        limit: 2,
        depertment: user?.department_id,
      };

      const response = await apiCallBack(
        "POST",
        "po/dashboard",
        formDataToSend,
        token
      );

      setTableData(response.data.result);
      setLogCount(response.data.logCount);
    } catch (error) {
      console.error("Error fetching log data:", error.message);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const filteredTableData = tableData.filter((row) =>
    row.purchasing_doc_no.includes(searchInput)
  );

  return (
    <>
      <MainHeadery title="DASHBOARD" />
      <div className="d-flex flex-column flex-row-fluid">
        <div className="container mt-4">
          <div className="report-box">
            <div className="row mt-4 justify-content-center">
              <div className="col-12">
                <form>
                  <div className="row mb-3">
                    {user?.department_id === 3 ? (
                      <div className="col">
                        <div className="form-group">
                          <label htmlFor="searchInput">Choose SubDept</label>
                          <select
                            name="dept"
                            id="dept"
                            className="form-control"
                            value={selectedDept}
                            onChange={(e) => {
                              setSelectedDept(e.target.value);
                              setSelectedEmployee("");
                            }}
                          >
                            <option value="">All Depts</option>
                            {choosedept &&
                              choosedept.map((dept, index) => (
                                <option key={index} value={dept.id}>
                                  {dept.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )}

                    {user?.department_id === 3 || user?.department_id === 1 ? (
                      <div className="col">
                        <div className="form-group">
                          <label htmlFor="searchInput">Choose Employee</label>
                          <select
                            name="employee"
                            id="employee"
                            className="form-control"
                            value={selectedEmployee}
                            onChange={(e) => {
                              setSelectedEmployee(e.target.value);
                            }}
                          >
                            <option value="">All</option>
                            {employeeList &&
                              employeeList.map((employee, index) => (
                                <option key={index} value={employee.emp_id}>
                                  {employee.emp_name} ({employee.emp_id})
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )}
                    <div className="col">
                      <div className="form-group">
                        <label htmlFor="searchInput">Status</label>
                        <select name="" id="" className="form-control">
                          <option value="">All</option>
                          <option value="">PENDING</option>
                          <option value="">ACCEPTED</option>
                          <option value="">REJECTED</option>
                          <option value="">APPROVED</option>
                        </select>
                      </div>
                    </div>
                    <div className="col">
                      <div className="form-group">
                        <label htmlFor="searchInput">Start Date</label>
                        <input
                          type="date"
                          className="form-control"
                          id="startDate"
                        />
                      </div>
                    </div>
                    <div className="col">
                      <div className="form-group">
                        <label htmlFor="searchInput">End Date</label>
                        <input
                          type="date"
                          className="form-control"
                          id="endDate"
                        />
                      </div>
                    </div>
                    <div className="col">
                      <div className="form-group">
                        <label htmlFor="searchInput">Search PO</label>
                        <input
                          type="text"
                          className="form-control"
                          id="searchInput"
                          placeholder="Search by PO Number..."
                          value={searchInput}
                          onChange={(e) => setSearchInput(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>

            </div>

            <div className="row mt-4">
              <div className="col">
                <table className="table table-striped table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>PO Number</th>
                      <th>File</th>
                      <th>Remarks</th>
                      <th>Status</th>
                      <th>Action By</th>
                      <th>Is email triggered?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableData.map((row, index) => (
                      <tr key={index}>
                        <td>
                          {row && row.datetime
                            ? moment(row.datetime * 1000).format(
                                "DD/MM/YY HH:mm "
                              )
                            : "N/A"}
                        </td>
                        <td>{row?.purchasing_doc_no}</td>
                        <td>
                          {row?.depertment === "3" ? (
                            <>
                              <a
                                href={`${process.env.REACT_APP_PDF_URL}/qap/${row?.file_name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View
                              </a>
                            </>
                          ) : (
                            <></>
                          )}
                        </td>
                        <td>{row.remarks}</td>
                        <td>{row.status}</td>
                        <td>
                          {row?.name} ({row?.id})
                        </td>
                        <td>
                          <span style={{ color: "red" }}>Failed</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="row mt-3">
              <div className="col">
                <nav aria-label="Page navigation">
                  <ul className="pagination justify-content-center">
                    <li
                      className={`page-item ${
                        currentPage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: Math.ceil(logCount / 2) }).map(
                      (_, index) => (
                        <li
                          key={index}
                          className={`page-item ${
                            currentPage === index + 1 ? "active" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(index + 1)}
                          >
                            {index + 1}
                          </button>
                        </li>
                      )
                    )}
                    <li
                      className={`page-item ${
                        currentPage === Math.ceil(logCount / 2)
                          ? "disabled"
                          : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportComponent;
