import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import { reConfirm } from "../utils/reConfirm";
import { clrLegend } from "../utils/clrLegend";
import { groupedByRefNo } from "../utils/groupedByReq";
import { ASSIGNER, USER_HSL_HR, USER_VENDOR } from "../constants/userConstants";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import DatePicker from "react-datepicker";
import { BONUS_COMP, ESI_COMP, LEAVE_COMP, PF_COMP, WAGE_COMP } from "../constants/constants";

const HrCompliance = () => {
  const inputFileRef = useRef(null);
  const { id } = useParams();
  const [isPopup, setIsPopup] = useState(false);
  const [data, setData] = useState([]);
  // const [groupedData, setGroupedData] = useState([]);
  const [formData, setFormData] = useState({
    fileData: null,
    remarks: "",
    actionType: "",
    compliance_date: null, // New state for compliance date
  });

  const [isLoading, setIsLoading] = useState(false);
  const { user, token } = useSelector((state) => state.auth);
  // const { poType } = useSelector((state) => state.selectedPO);
  // const [referenceNo, setreferenceNo] = useState("");
  // console.log("useruser", user);
  // console.log(poType, "poType");
  // console.log(userType, "userType");
  // console.log("referenceNo--", referenceNo);

  const getData = async () => {
    setIsLoading(true);
    try {
      const data = await apiCallBack("GET", `po/hr/complianceUploadedList?poNo=${id}`, null, token);
      // console.log(data);
      if (data?.status) {
        setData(data?.data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching drawing list:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, [id, token]);

  const actionHandler = async (flag) => {
    const { fileData, remarks, actionType, compliance_date } = formData; // Destructure compliance_date

    // Validation for compliance_date
    if (compliance_date === null || compliance_date === "") {
      return toast.warn("Compliance date is required!");
    }

    if (flag === "SUBMITTED" && (actionType === "" || !fileData || remarks.trim() === "")) {
      return toast.warn("Please fill all the required fields!");
    }

    if ((flag === "APPROVED" || flag === "REJECTED") && (actionType === "" || remarks.trim() === "")) {
      return toast.warn("Action Type and remarks are mandatory for approval or rejection!");
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      formDataToSend.append("action_type", actionType);
      formDataToSend.append("file", fileData);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("status", flag);
      formDataToSend.append("compliance_date", compliance_date);

      const response = await apiCallBack("POST", "po/hr/hrComplianceUpload", formDataToSend, token);

      if (response?.status) {
        toast.success("Data sent successfully");
        setIsPopup(false);
        setFormData({
          fileData: null,
          remarks: "",
          actionType: "",
          compliance_date: null,
        });
        inputFileRef.current.value = null;
        getData();
      }
    } catch (error) {
      toast.error("Error uploading drawing:", error);
    }
  };

  // useEffect(() => {
  //   if (data && data.length > 0) {
  //     const gData = groupedByRefNo(data);
  //     setGroupedData(gData);
  //   }
  // }, [data]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"HR Compliance"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {user?.department_id === USER_HSL_HR && (
                          <button
                            onClick={() => {
                              setIsPopup(true);
                            }}
                            className="btn fw-bold btn-primary mx-3"
                          >
                            ACTION
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  {/* <th>Reference No. </th> */}
                                  <th>DateTime </th>
                                  <th>File Info</th>
                                  <th>Action Type</th>
                                  <th>Action By</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th className="min-w-150px">Compliance Date</th>
                                  {/* <th>Status</th> */}
                                  {/* {user?.department_id === USER_HSL_HR && (
                                    <th>Action</th>
                                  )} */}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
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
                                    {checkTypeArr(data) &&
                                      data.map((item, index) => {
                                        return (
                                          <Fragment key={index}>
                                            <tr>
                                              <td className="table_center">
                                                {/* {item?.created_at &&
                                              new Date(
                                                item?.created_at
                                              ).toLocaleString()} */}
                                                {item.created_at && formatDate(item.created_at)}
                                              </td>
                                              <td className="table_center">
                                                {item.file_name && (
                                                  <a href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer">
                                                    View File
                                                  </a>
                                                )}
                                              </td>
                                              <td>{item?.action_type}</td>
                                              <td className="table_center">{item.created_by_id}</td>
                                              <td className="align-middle">{item.remarks}</td>
                                              <td className="align-middle">
                                                Year: {item.year}, Month: {item.month}
                                              </td>

                                              {/* <td
                                          className={`${clrLegend(
                                            item?.status
                                          )} bold`}
                                        >
                                          {item.status}
                                        </td> */}

                                              {/* {user.department_id ===
                                              USER_HSL_HR && (
                                              <td>
                                                {item.status ===
                                                  "SUBMITTED" && (
                                                  <button
                                                    onClick={() => {
                                                      setIsPopup(true);
                                                      setreferenceNo(
                                                        item.reference_no
                                                      );
                                                    }}
                                                    className="btn fw-bold btn-primary mx-3"
                                                  >
                                                    ACTION
                                                  </button>
                                                )}
                                              </td>
                                            )} */}
                                            </tr>
                                          </Fragment>
                                        );
                                      })}
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

      {user?.department_id === USER_HSL_HR && (
        <div className={isPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">Take Action</span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => {
                  setIsPopup(false);
                  setFormData({
                    fileData: null,
                    remarks: "",
                    actionType: "",
                    compliance_date: null,
                  });
                  if (inputFileRef.current) {
                    inputFileRef.current.value = "";
                  }
                }}
              >
                Close
              </button>
            </div>
            <form>
              <div className="row">
                <div className="col-12">
                  <div className="my-3">
                    <select
                      name=""
                      id=""
                      className="form-select"
                      value={formData?.actionType}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          actionType: e.target.value,
                        });
                      }}
                    >
                      <option value="">Choose Action Type</option>
                      <option value={PF_COMP}>{PF_COMP}</option>
                      <option value={ESI_COMP}>{ESI_COMP}</option>
                      <option value={WAGE_COMP}>{WAGE_COMP}</option>
                      <option value={LEAVE_COMP}>{LEAVE_COMP}</option>
                      <option value={BONUS_COMP}>{BONUS_COMP}</option>
                      <option value="Remarks">Remarks</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Compliance Date</label>
                    &nbsp;&nbsp;<span className="mandatorystart">*</span>
                    <DatePicker
                      dateFormat="dd/MM/yyyy"
                      className="form-control"
                      selected={formData?.compliance_date}
                      onChange={(date) => setFormData({ ...formData, compliance_date: date })}
                      placeholderText="Select Date"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center gap-2">
                      File Info
                      <span className="mandatorystart">*</span>
                      <FileUploadInfoIcon />
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      ref={inputFileRef}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          fileData: e.target.files[0],
                        })
                      }
                      accept=".pdf"
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Remarks</label>
                    &nbsp;&nbsp;
                    <span className="mandatorystart">*</span>
                    <textarea
                      name=""
                      id=""
                      rows="4"
                      className="form-control"
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      value={formData?.remarks}
                    ></textarea>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    {/* <button
                      onClick={() => actionHandler("SUBMITTED")}
                      className="btn fw-bold btn-primary"
                      type="button"
                    >
                      SUBMIT
                    </button> */}
                    <DynamicButton label="SUBMIT" onClick={() => actionHandler("SUBMITTED")} className="btn fw-bold btn-primary" />

                    {/* <div className="d-flex gap-3">
                      {userType !== USER_VENDOR &&
                        user?.department_id === USER_HSL_HR && (
                          <button
                            onClick={() =>
                              reConfirm(
                                { file: true },
                                () => actionHandler("APPROVED"),
                                "Please confirm your approving the drawing."
                              )
                            }
                            className="btn fw-bold btn-success"
                            type="button"
                          >
                            APPROVE
                          </button>
                        )}

                      {userType !== USER_VENDOR &&
                        user?.department_id === USER_HSL_HR &&
                        user?.internal_role_id === ASSIGNER && (
                          <button
                            onClick={() =>
                              reConfirm(
                                { file: true },
                                () => actionHandler("REJECTED"),
                                "Drawing file rejected!!"
                              )
                            }
                            className="btn fw-bold btn-danger"
                            type="button"
                          >
                            REJECT
                          </button>
                        )}
                    </div> */}
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

export default HrCompliance;
