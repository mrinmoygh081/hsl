import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate } from "../utils/getDateTimeNow";
import { clrLegend } from "../utils/clrLegend";
import * as XLSX from "xlsx";
import { groupedByBtnNum } from "../utils/groupedByReq";
import { activityOptions } from "../data/btnData";
import SkeletonLoader from "../loader/SkeletonLoader";
import DynamicButton from "../Helpers/DynamicButton";
import { BsChatRightText } from "react-icons/bs";
import { ASSIGNER, DEPT_FI, USER_VENDOR } from "../constants/userConstants";
import { PAYMENT_STATUS } from "../constants/BTNContants";
import HrSearchableSelect from "../components/HrSearchableSelect";

const Checklist = () => {
  const { id } = useParams();
  const { isDO } = useSelector((state) => state.selectedPO);
  const { user, token } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [groupedBG, setGroupedBG] = useState([]);
  const [xlsxData, setXlsxData] = useState([]);
  const { pathname, state } = useLocation();
  const [isAssignPopup, setIsAssignPopup] = useState(false);
  const [empOption, setEmpOption] = useState([]);
  const [assign, setAssign] = useState({
    purchasing_doc_no: id,
    assign_to_fi: null,
    btn_num: "",
    activity: "",
  });
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [paymentData, setPaymentData] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [checkuser, setCheckuser] = useState([]);
  const popupRef = useRef(null);
  const remarksRef = useRef(null);

  const highlightBtnNum = useRef(state?.highlightBtnNum || null).current;
  const autoNavigate = useRef(state?.autoNavigate || false).current;
  const hasAutoNavigated = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      await getEmpList();
      await getData();
      await createPayment();
      await getSDBGcheckuser();
      setLoading(false);
    };

    fetchData();
  }, [id, token, pathname]);

  useEffect(() => {
    if (data && data.length > 0) {
      const gData = groupedByBtnNum(data);
      setGroupedBG(gData);
    }
  }, [data]);

  useEffect(() => {
    if (!loading && autoNavigate && highlightBtnNum && groupedBG[highlightBtnNum] && !hasAutoNavigated.current) {
      const firstItem = groupedBG[highlightBtnNum][0];
      if (firstItem) {
        hasAutoNavigated.current = true;

        setTimeout(() => {
          handleBTNClick(firstItem);
        }, 10);
      }
    }
  }, [loading, groupedBG]);

  const NewBillHandler = () => {
    if (slug) {
      navigate(`/checklist/${slug}/${id}`);
    } else {
      toast.warn("Please choose what type of checklist you want to add.");
    }
  };

  const getEmpList = async () => {
    try {
      const res = await apiCallBack("GET", `po/wdc/grseEmpList`, null, token);
      if (res?.status) {
        const options = res?.data?.map((item) => ({
          value: item.code,
          label: `${item.name} (${item.code})`,
        }));
        setEmpOption(options);
      }
    } catch (error) {
      console.error("Error fetching employee list:", error);
    }
  };

  const getSDBGcheckuser = async () => {
    const data = await apiCallBack("GET", `po/sdbg/checkIsDEO?manNo=${user?.vendor_code}`, null, token);
    if (data?.status) {
      setCheckuser(data?.data);
    }
  };

  const assignSDBGByFinance = async () => {
    if (assign.assign_to_fi) {
      try {
        let uri;
        if (assign?.btn_type === "service-contract-bills") {
          uri = "submitSBtnByFAuthorty";
        } else {
          uri = "assignToFiStaff";
        }
        const res = await apiCallBack("POST", `po/btn/${uri}`, assign, token);
        if (res?.status) {
          setIsAssignPopup(false);
          toast.success(`Successfully assigned to ${assign.assign_to_fi}`);
          getData();
        } else {
          toast.warn(res?.message);
        }
      } catch (error) {
        console.error("Error assigning to FI staff:", error);
      }
    } else {
      toast.warn("Please choose an employee to assign!");
    }
  };

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn?id=${id}`, null, token);
      if (response?.status) {
        setData(response?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  const createPayment = async () => {
    try {
      const response = await apiCallBack("POST", `po/download/paymentAdvices?purchasing_doc_no=${id}`, null, token);
      if (response?.status) {
        setPaymentData(response.data);
      }
    } catch (error) {
      console.error("Error creating invoice number:", error);
    }
  };

  // ✅ Reusable helper - last item nikalne ke liye
  const getLastItem = (items) => {
    if (!items || items.length === 0) return null;
    const sortedItems = [...items].sort((a, b) => Number(a.created_at) - Number(b.created_at));
    return sortedItems[sortedItems.length - 1];
  };

  // ACTION button logic
  const shouldShowActionButton = (items) => {
    if (!items || items.length === 0) return false;

    // department_id === 15 wale ko ACTION button nahi dikhega
    if (user?.department_id === 15) return false;
    if (user?.user_type === USER_VENDOR) return false;

    const lastItem = getLastItem(items);

    const isAssignedToMe = lastItem?.assign_to && user?.vendor_code && String(lastItem.assign_to) === String(user.vendor_code);

    console.log("=== Action Button Check ===", {
      btnNum: lastItem?.btn_num,
      lastAssignTo: lastItem?.assign_to,
      loggedInVendorCode: user?.vendor_code,
      departmentId: user?.department_id,
      isAssignedToMe,
    });

    return isAssignedToMe;
  };

  // ✅ ASSIGN button logic
  const shouldShowAssignButton = (items) => {
    if (!items || items.length === 0) return false;

    // department_id === 15 hona chahiye
    if (user?.department_id !== 15) return false;

    const lastItem = getLastItem(items);

    // last row ka assign_to === logged in vendor_code bhi match hona chahiye
    const isAssignedToMe = lastItem?.assign_to && user?.vendor_code && String(lastItem.assign_to) === String(user.vendor_code);

    console.log("=== Assign Button Check ===", {
      btnNum: lastItem?.btn_num,
      lastAssignTo: lastItem?.assign_to,
      loggedInVendorCode: user?.vendor_code,
      departmentId: user?.department_id,
      isAssignedToMe,
    });

    return isAssignedToMe;
  };

  // BTN Number click handler — items array lega ab
  const handleBTNClick = (items) => {
    if (!items || items.length === 0) return;

    const firstItem = items[0]; // navigate ke liye btn_type etc. firstItem se hi lenge

    const hasActionButton = shouldShowActionButton(items);

    if (hasActionButton) {
      let type = firstItem.btn_type;

      if (firstItem.btn_type === "bill-incorrect-deductions" || firstItem.btn_type === "other-retentions") {
        type = "any-other";
      }

      if (firstItem.btn_type === "service-contract-bills") {
        navigate(`/checklist/bill-service/edit/${id}`, {
          state: {
            btn_num: firstItem?.btn_num,
            bill_ca: firstItem?.bill_certifing_authority,
          },
        });
      } else if (id) {
        navigate(`/checklist/${type}/edit/${id}`, {
          state: firstItem?.btn_num,
        });
      }
    } else {
      let type = "";

      if (firstItem.btn_type === "hybrid-bill-material") type = "hybrid-bill-material";
      else if (firstItem.btn_type === "service-contract-bills") type = "bill-service";
      else if (firstItem.btn_type === "advance-bill") type = "advance-bill";
      else if (firstItem.btn_type === "claim-against-pbg") type = "claim-against-pbg";
      else if (firstItem.btn_type === "bill-incorrect-deductions") type = "any-other";
      else if (firstItem.btn_type === "other-retentions") type = "any-other";
      else if (firstItem.btn_type === "claim-against-jcc") type = "claim-against-jcc";
      else if (firstItem.btn_type === "ld-penalty-refund") type = "ld-penalty-refund";

      navigate(`/checklist/${type}/view/${id}`, {
        state: `${firstItem?.btn_num}`,
      });
    }
  };

  const filteredGroupedBG = Object.keys(groupedBG)
    .filter((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (highlightBtnNum) {
        if (a === highlightBtnNum) return -1;
        if (b === highlightBtnNum) return 1;
      }
      return 0;
    })
    .reduce((acc, key) => {
      acc[key] = groupedBG[key];
      return acc;
    }, {});

  const formatDatee = (timestamp) => {
    if (!timestamp || timestamp === "0") return "";
    const date = new Date(Number(timestamp));
    return date.toLocaleDateString("en-US");
  };

  useEffect(() => {
    if (data) {
      const latestByBtnNum = new Map();
      data.forEach((item) => {
        const existing = latestByBtnNum.get(item.btn_num);
        if (!existing || item.created_at > existing.created_at) {
          latestByBtnNum.set(item.btn_num, item);
        }
      });

      const result = Array.from(latestByBtnNum.values());
      setXlsxData(result);
    }
  }, [data]);

  const downloadXLSX = () => {
    if (xlsxData) {
      let data = [
        ["PO No", "BTN No", "Invoice No", "Status", "Net Claim Amt (Excl. GST)", "Total Deduction Amt", "Payable Amt (Incl. GST)", "Payment date"],
        ...xlsxData.map((file) => [
          file.purchasing_doc_no,
          file.btn_num,
          file.invoice_no,
          file.status,
          file.net_claim_amount,
          file.net_payable_amount - file.net_claim_amount > 0 ? file.net_payable_amount - file.net_claim_amount : 0,
          file.net_payable_amount,
          file.status === PAYMENT_STATUS ? formatDatee(file.created_at) : "--",
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, "MIS");

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const excelBlob = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(excelBlob);
      downloadLink.download = `MIS-${id}.xlsx`;
      downloadLink.click();
    } else {
      toast.error("Something went wrong. Please try again!");
    }
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
    <div className="wrapper d-flex flex-column flex-row-fluid">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="d-flex flex-column flex-row-fluid">
          <Header title="Invoice And Payment Process" id={id} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                <div className="row g-5 g-xl-8">
                  <div className="col-12">
                    <div className="card-body p-3">
                      <div className="tab-content">
                        <label htmlFor="checklistDropdown" className="mr-2">
                          Select Checklist:
                        </label>
                        <div className="d-flex align-items-center w-50">
                          <div className="mb-3 w-100">
                            <select id="checklistDropdown" className="form-select w-100" onChange={(e) => setSlug(e.target.value)}>
                              <option value="">Select</option>
                              <option value="hybrid-bill-material">Checklist for Material Bill</option>
                              <option value="contract-bill-service">Checklist for Service Bill</option>
                              <option value="claim-against-pbg">Checklist for Claim Against PBG</option>
                              <option value="claim-against-jcc">Checklist for Claim Against JCC</option>
                              <option value="any-other">Checklist for Any Other Claims</option>
                              <option value="advance-bill">Checklist for Advance Bill Payment(Adv BG)</option>
                            </select>
                          </div>
                          <button className="btn btn-sm btn-primary mx-3 mb-3" onClick={NewBillHandler}>
                            ADD
                          </button>
                        </div>
                        <div className="search-bar mb-4 d-flex align-items-center justify-content-end">
                          <button className="btn btn-secondary btn-sm me-2" onClick={downloadXLSX}>
                            DOWNLOAD MIS
                          </button>
                          <input className="searchui" type="text" placeholder="Search BTN No..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                        <div className="table-responsive position-relative" style={{ overflowX: "auto" }}>
                          <table className="table table-striped table-bordered table_height" style={{ whiteSpace: "nowrap" }}>
                            <thead>
                              <tr className="border-0">
                                <th>DATE</th>
                                <th>ACTION BY</th>
                                <th>ACTION ON (NEXT)</th>
                                <th>STATUS</th>
                                <th>ACTION</th>
                              </tr>
                            </thead>
                            <tbody style={{ maxHeight: "100%" }}>
                              {loading ? (
                                <>
                                  <tr></tr>
                                  <tr>
                                    <td colSpan={10}>
                                      <SkeletonLoader col={4} row={6} />
                                    </td>
                                  </tr>
                                </>
                              ) : (
                                <>
                                  {Object.keys(filteredGroupedBG).map((it, index) => {
                                    let items = filteredGroupedBG[it];
                                    let firstItem = items[0];
                                    items = [...items].sort((a, b) => Number(a.created_at) - Number(b.created_at));

                                    const showActionButton = shouldShowActionButton(items); // existing
                                    const showAssignButton = shouldShowAssignButton(items); // ✅ new

                                    return (
                                      <Fragment key={index}>
                                        <tr
                                          style={{
                                            backgroundColor: it === highlightBtnNum ? "#fff3cd" : "transparent",
                                            outline: it === highlightBtnNum ? "2px solid #ffc107" : "none",
                                          }}
                                        >
                                          <td colSpan={4} style={{ whiteSpace: "pre-wrap", padding: "10px 0" }}>
                                            <b>BTN No:</b>{" "}
                                            <button
                                              onClick={() => handleBTNClick(items)} // ✅ items pass karo
                                              className="btn_simple"
                                              style={{
                                                textDecoration: "underline",
                                                color: "#0d6efd",
                                                cursor: "pointer",
                                                fontWeight: "bold",
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                fontSize: "inherit",
                                              }}
                                              title="Click to view/edit BTN details"
                                            >
                                              {it}
                                            </button>{" "}
                                            &nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;
                                            <b>Invoice Number:</b> {groupedBG[it][0]?.invoice_no || "NA"}
                                            &nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;
                                            <b>BTN Type:</b> {groupedBG[it][0]?.btn_type || "NA"}
                                            &nbsp;&nbsp;&nbsp;||&nbsp;&nbsp;&nbsp;
                                            <b>Net Claim Amount:</b> {groupedBG[it][0]?.net_claim_amount ? `₹ ${groupedBG[it][0]?.net_claim_amount}` : "NA"} (without GST)
                                          </td>

                                          <td>
                                            <div className="view-button-container">
                                              {/* VIEW button — same as before */}
                                              <button
                                                className="btn btn-sm btn-secondary m-1"
                                                onClick={() => {
                                                  let type = "";
                                                  if (firstItem.btn_type === "hybrid-bill-material") type = "hybrid-bill-material";
                                                  else if (firstItem.btn_type === "service-contract-bills") type = "bill-service";
                                                  else if (firstItem.btn_type === "advance-bill") type = "advance-bill";
                                                  else if (firstItem.btn_type === "claim-against-pbg") type = "claim-against-pbg";
                                                  else if (firstItem.btn_type === "bill-incorrect-deductions") type = "any-other";
                                                  else if (firstItem.btn_type === "other-retentions") type = "any-other";
                                                  else if (firstItem.btn_type === "claim-against-jcc") type = "claim-against-jcc";
                                                  else if (firstItem.btn_type === "ld-penalty-refund") type = "ld-penalty-refund";
                                                  navigate(`/checklist/${type}/view/${id}`, {
                                                    state: `${firstItem?.btn_num}`,
                                                  });
                                                }}
                                              >
                                                VIEW
                                              </button>

                                              {/* ✅ ASSIGN button — department_id === 15 */}
                                              {showAssignButton && (
                                                <button
                                                  onClick={() => {
                                                    setAssign({
                                                      ...assign,
                                                      btn_num: firstItem?.btn_num,
                                                      btn_type: firstItem?.btn_type,
                                                    });
                                                    setIsAssignPopup(true);
                                                  }}
                                                  className="btn fw-bold btn-sm btn-primary me-3 m-1"
                                                >
                                                  ASSIGN
                                                </button>
                                              )}

                                              {/* ✅ ACTION button — last row assign_to === logged in vendor_code */}
                                              {showActionButton && (
                                                <button
                                                  className="btn btn-sm btn-warning m-1"
                                                  onClick={() => {
                                                    let type = firstItem.btn_type;
                                                    if (firstItem.btn_type === "bill-incorrect-deductions" || firstItem.btn_type === "other-retentions") {
                                                      type = "any-other";
                                                    }
                                                    if (firstItem.btn_type === "service-contract-bills") {
                                                      navigate(`/checklist/bill-service/edit/${id}`, {
                                                        state: {
                                                          btn_num: firstItem?.btn_num,
                                                          bill_ca: firstItem?.bill_certifing_authority,
                                                        },
                                                      });
                                                    } else if (id) {
                                                      navigate(`/checklist/${type}/edit/${id}`, {
                                                        state: firstItem?.btn_num,
                                                      });
                                                    }
                                                  }}
                                                >
                                                  Action
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Sub rows — same as before */}
                                        {items.map((item, i) => (
                                          <tr key={i}>
                                            <td>{formatDate(item?.created_at)}</td>
                                            <td className="tdrowadd">
                                              {item?.assign_by_name} {item?.assign_by && `(${item.assign_by})`}
                                            </td>
                                            <td className="tdrowadd">
                                              {item?.assign_to_name} {item?.assign_to && `(${item.assign_to})`}
                                            </td>
                                            <td className={`${clrLegend(item?.status)} bold`}>
                                              <div className="d-flex align-items-center">
                                                <span>{item?.status}</span>
                                                {item.remarks && (
                                                  <div className="icon-container" style={{ position: "relative" }}>
                                                    <BsChatRightText
                                                      className="ms-2"
                                                      size={15}
                                                      style={{ cursor: "pointer", color: "blue" }}
                                                      onClick={() => handleButtonClick(item.remarks)}
                                                    />
                                                    <div className="tooltip">Message</div>
                                                  </div>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </Fragment>
                                    );
                                  })}
                                </>
                              )}
                            </tbody>
                          </table>

                          {/* Popups remain same... */}
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
                            <h4>Message</h4>
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

                          {isAssignPopup && (
                            <div className="popup active">
                              <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                                <div className="card-header border-0 pt-5">
                                  <h3 className="card-title align-items-start flex-column">
                                    <span className="card-label fw-bold fs-3 mb-1">ASSIGN</span>
                                  </h3>
                                  <button className="btn fw-bold btn-danger" onClick={() => setIsAssignPopup(false)}>
                                    Close
                                  </button>
                                </div>
                                <form>
                                  <div className="row" style={{ overflow: "unset" }}>
                                    <div className="col-12">
                                      <div className="mb-3">
                                        <label htmlFor="empName">Employee Name</label>
                                        <HrSearchableSelect
                                          options={empOption}
                                          value={assign.assign_to_fi}
                                          onChange={(val) =>
                                            setAssign({
                                              ...assign,
                                              assign_to_fi: val?.value,
                                            })
                                          }
                                          placeholder="Select employee"
                                          isClearable={true}
                                        />
                                      </div>
                                    </div>
                                    <div className="col-12">
                                      <div className="mb-3">
                                        <label htmlFor="activity">Activity</label>
                                        <HrSearchableSelect
                                          options={activityOptions}
                                          value={assign.activity}
                                          onChange={(val) =>
                                            setAssign({
                                              ...assign,
                                              activity: val?.value,
                                            })
                                          }
                                          placeholder="Select activity"
                                          isClearable={true}
                                        />
                                      </div>
                                    </div>
                                    <div className="col-12">
                                      <div className="mb-3 d-flex justify-content-between">
                                        <DynamicButton label="ASSIGN" onClick={assignSDBGByFinance} className="btn fw-bold btn-primary" />
                                      </div>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="page_heading mt-5 mb-3">
                              <h3>PAYMENT ADVICE</h3>
                            </div>
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  <th>BTN Number</th>
                                  <th>VIEW DOCUMENT</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {loading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={4} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {checkTypeArr(paymentData) &&
                                      paymentData.map((item, index) => (
                                        <Fragment key={index}>
                                          {item?.file_path && (
                                            <tr>
                                              <td>{item.btn_num}</td>
                                              <td>
                                                <a href={`${process.env.REACT_APP_ROOT_URL}${item?.file_path}`} target="_blank" rel="noreferrer">
                                                  VIEW
                                                </a>
                                              </td>
                                            </tr>
                                          )}
                                        </Fragment>
                                      ))}
                                  </>
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
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checklist;
