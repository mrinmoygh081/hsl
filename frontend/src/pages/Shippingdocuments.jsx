import React, { Fragment, useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import moment from "moment";
import { REQUESTED, SUBMITTED } from "../constants/BGconstants";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import SkeletonLoader from "../loader/SkeletonLoader";
import { groupedByShippingdocu } from "../utils/groupedByReq";
import { clrLegend } from "../utils/clrLegend";
import { reConfirm } from "../utils/reConfirm";
import { DEPT_RIC, DEPT_STORE } from "../constants/userConstants";

const Shippingdocuments = () => {
  const inputFileRef = useRef(null);
  const [isPopup, setIsPopup] = useState(false);
  const [isPopupstore, setIsPopupstore] = useState(false);
  const [data, setData] = useState([]);
  const [referenceNo, setreferenceNo] = useState("");
  const [groupedIlms, setGroupeIlms] = useState([]);
  const { id } = useParams();

  const { user, token, userType } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    dataFile: null,
    remarks: "",
  });
  const [selectedFileType, setSelectedFileType] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const optionss = [
    {
      file_type_name: "Invoice",
    },
    {
      file_type_name: "Packing list",
    },
    {
      file_type_name: "Delivery challan",
    },
    {
      file_type_name: "Lorry Receipt (LR)",
    },
    {
      file_type_name: "Inspection note",
    },
    {
      file_type_name: "Manufacturers test certificates",
    },
    {
      file_type_name: "Guarantee certificate",
    },
    {
      file_type_name: "Certificate of compliance",
    },
    {
      file_type_name: "Preservation certificate",
    },
    {
      file_type_name: "E-way Bill",
    },
    {
      file_type_name: "Undertaking",
    },
    {
      file_type_name: "Remarks",
    },
  ];

  const getData = async () => {
    try {
      const data = await apiCallBack(
        "GET",
        `po/ListOfShippingDocuments?poNo=${id}`,
        null,
        token
      );
      if (data?.status) {
        setData(data?.data);
      }
    } catch (error) {
      console.error("Error fetching drawing list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (data && data.length > 0) {
      const gData = groupedByShippingdocu(data);
      setGroupeIlms(gData);
    }
  }, [data]);

  useEffect(() => {
    getData();
  }, [id, token]);
  const SUBMITTED = "SUBMITTED";
  const APPROVED = "APPROVED";
  const REJECTED = "REJECTED";
  const REQUESTED = "REQUESTED";

  const shippingdocumentsBtn = async (flag) => {
    const { dataFile, remarks } = formData;

    // Field validation for SUBMITTED status
    if (
      flag === SUBMITTED &&
      (!dataFile || selectedFileType.trim() === "" || remarks.trim() === "")
    ) {
      return toast.warn("Please fill all the required fields!");
    }

    // Field validation for REQUESTED, APPROVED, or REJECTED status
    if (
      (flag === REQUESTED || flag === APPROVED || flag === REJECTED) &&
      remarks.trim() === ""
    ) {
      return toast.warn("Remarks are required!");
    }

    try {
      // Prepare form data
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      formDataToSend.append("file", dataFile || "");
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("status", flag);
      formDataToSend.append("reference_no", referenceNo);

      // Check if groupedIlms and referenceNo are valid
      const groupData = groupedIlms[referenceNo];

      // Check if groupData is an array before calling .filter()
      const fileTypeNames = (Array.isArray(groupData) ? groupData : [])
        .filter((item) => item.updated_by === "VENDOR")
        .map((item) => item.file_type_name)
        .filter((name) => name);

      if (fileTypeNames.length > 0) {
        formDataToSend.append("file_type_name", fileTypeNames.join(", "));
      } else {
        formDataToSend.append("file_type_name", selectedFileType);
      }

      // Log the form data before making the API request
      console.log("Form Data to send:", formDataToSend);

      // Make the API call
      const response = await apiCallBack(
        "POST",
        "po/shippingDocuments/sdoc",
        formDataToSend,
        token
      );

      // Handle the response
      if (response?.status) {
        toast.success(response.message || "Action completed successfully!");
        setIsPopup(false);
        setFormData({
          dataFile: null,
          remarks: "",
        });
        setSelectedFileType("");
        setIsPopupstore(false);

        if (flag === SUBMITTED || flag === APPROVED || flag === REJECTED) {
          inputFileRef.current.value = null;
        }

        getData();
      } else {
        toast.error(response.message || "Failed to complete the action!");
      }
    } catch (error) {
      console.error("Error processing action:", error);
      toast.error("An unexpected error occurred while processing the action.");
    }
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Shipping Documents"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {user?.user_type === 1 && (
                          <>
                            <button
                              onClick={() => setIsPopup(true)}
                              className="btn fw-bold btn-primary me-3"
                            >
                              ACTION
                            </button>
                          </>
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
                                  <th>DateTime</th>
                                  <th>Shipping Documents</th>
                                  <th>Action Type</th>
                                  <th>Action By</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th className="min-w-150px">Status</th>
                                  {(user.department_id === DEPT_STORE ||
                                    user.department_id === DEPT_RIC) && (
                                    <th>Action</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={7} row={7} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>

                                    {Object.keys(groupedIlms).map(
                                      (it, index) => {
                                        let items = groupedIlms[it];
                                        let firstItem = items[0];
                                        return (
                                          <Fragment key={index}>
                                            <tr>
                                              <td colSpan={6}>
                                                <b>{it}</b>
                                              </td>
                                              {(user.department_id === 5 ||
                                                user.department_id === 16) &&
                                                firstItem.status ===
                                                  "SUBMITTED" && (
                                                  <td>
                                                    <button
                                                      onClick={() => {
                                                        setIsPopup(true);
                                                        setreferenceNo(
                                                          firstItem.reference_no
                                                        );
                                                      }}
                                                      className="btn fw-bold btn-primary mx-3"
                                                    >
                                                      ACTION
                                                    </button>
                                                  </td>
                                                )}
                                            </tr>
                                            {items.map((item, i) => (
                                              <tr key={i}>
                                                <td
                                                  style={{
                                                    border: "none",
                                                    background: "none",
                                                  }}
                                                >
                                                  {formatDate(item?.created_at)}
                                                </td>
                                                <td>
                                                  {item.file_name && (
                                                    <a
                                                      href={formatFilePath(
                                                        item.file_path
                                                      )}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                    >
                                                      View File
                                                    </a>
                                                  )}
                                                </td>
                                                <td>{item?.file_type_name}</td>
                                                <td>{item?.updated_by}</td>
                                                <td>{item?.remarks}</td>
                                                <td
                                                  className={`${clrLegend(
                                                    item?.status
                                                  )} bold`}
                                                >
                                                  {item.status}
                                                </td>
                                                <td></td>
                                              </tr>
                                            ))}
                                          </Fragment>
                                        );
                                      }
                                    )}
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

      {/* vendor */}
      {(user?.user_type === 1 ||
        user?.department_id === 5 ||
        user?.department_id === 16) && (
        <div className={isPopup ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5 pb-3">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">
                  Upload Shipping Documents
                </span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() => setIsPopup(false)}
              >
                Close
              </button>
            </div>
            <form>
              <div className="row">
                <div className="col-12">
                  {!(
                    user?.department_id === 5 || user?.department_id === 16
                  ) && (
                    <div className="mb-3">
                      <select
                        name=""
                        id=""
                        className="form-select"
                        onChange={(e) => {
                          setSelectedFileType(e.target.value);
                        }}
                        value={selectedFileType}
                      >
                        <option value="">Select...</option>

                        {optionss.map((option, i) => (
                          <option key={i} value={option.selectedFileTypeName}>
                            {option.file_type_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label d-flex align-items-center gap-2">
                      Shipping Documents File
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
                          dataFile: e.target.files[0],
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
                      value={formData?.remarks}
                      onChange={(e) =>
                        setFormData({ ...formData, remarks: e.target.value })
                      }
                    ></textarea>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3 d-flex justify-content-between">
                    <DynamicButton
                      label="SUBMIT"
                      onClick={() => shippingdocumentsBtn("SUBMITTED")}
                      className="btn fw-bold btn-primary"
                    />

                    <div className="d-flex gap-3">
                      {userType !== 1 && (
                        <button
                          onClick={() =>
                            reConfirm(
                              { file: true },
                              () => shippingdocumentsBtn("APPROVED"),
                              "You're approving the ILMS. Please confirm!"
                            )
                          }
                          className="btn fw-bold btn-success"
                          type="button"
                        >
                          APPROVE
                        </button>
                      )}

                      {userType !== 1 && (
                        <button
                          onClick={() =>
                            reConfirm(
                              { file: true },
                              () => shippingdocumentsBtn("REJECTED"),
                              "The ILMS file is rejected"
                            )
                          }
                          className="btn fw-bold btn-danger"
                          type="button"
                        >
                          REJECT
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* store  ric*/}
    </>
  );
};

export default Shippingdocuments;
