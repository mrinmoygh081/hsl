import React, { useEffect, useRef, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";
import SkeletonLoader from "../loader/SkeletonLoader";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const InspectionCall = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [inspectioncall, setInspectioncall] = useState([]);
  const { id } = useParams();
  const inputFileRef = useRef(null);

  const { user, token } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    actionType: "",
    InspectioncallFile: null,
    remarks: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const getData = async () => {
    setIsLoading(true);
    try {
      const data = await apiCallBack(
        "GET",
        `po/inspectioncallletter/list?poNo=${id}`,
        null,
        token
      );
      if (data?.status) {
        setInspectioncall(data?.data);
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

  const updateInspectionCall = async () => {
    const { user_type } = user;
    const { InspectioncallFile, remarks, actionType } = formData;
    if (user_type === 1) {
      if (!InspectioncallFile || remarks === "" || actionType === "") {
        return toast.warn("All fields are required!");
      }
    }
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      formDataToSend.append("file", InspectioncallFile);
      formDataToSend.append("remarks", remarks);
      formDataToSend.append("action_type", actionType);

      const response = await apiCallBack(
        "POST",
        "po/inspectionCallLetter/insp",
        formDataToSend,
        token
      );

      if (response?.status) {
        toast.success("Data sent successfully!");
        setIsPopup(false);
        setFormData({
          InspectioncallFile: null,
          remarks: "",
          actionType: "",
        });
        inputFileRef.current.value = null;
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error uploading data:", error);
    }
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Inspection Call Letter"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {user?.user_type === 1 && (
                          <button
                            onClick={() => setIsPopup(true)}
                            className="btn fw-bold btn-primary"
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
                                  <th>DateTime </th>
                                  <th>File Info</th>
                                  <th>Action By</th>
                                  <th>Action Type</th>
                                  <th className="min-w-150px">Remarks</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={5} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {checkTypeArr(inspectioncall) &&
                                      inspectioncall.map((inspection) => (
                                        <tr key={inspection.id}>
                                          <td className="table_center">
                                            {/* {inspection?.created_at &&
                                          new Date(
                                            inspection?.created_at
                                          ).toLocaleString()} */}
                                            {inspection.created_at &&
                                              formatDate(inspection.created_at)}
                                          </td>
                                          <td>
                                            {inspection.file_name && (
                                              <a
                                                href={formatFilePath(
                                                  inspection.file_path
                                                )}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                View File
                                              </a>
                                            )}
                                          </td>
                                          <td>
                                            {inspection.updated_by} (
                                            {inspection.created_by_id})
                                          </td>
                                          <td>{inspection.action_type}</td>
                                          <td>{inspection.remarks}</td>
                                        </tr>
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

      {user?.user_type === 1 && (
        <>
          <div className={isPopup ? "popup active" : "popup"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5 pb-3">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">
                    Take Your Action
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
                    <div className="mb-3">
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
                        <option value="RM INSPECTION CALL LETTER">
                          RM INSPECTION CALL LETTER
                        </option>
                        <option value="TEST WITNESS INSPECTION CALL LETTER">
                          TEST WITNESS INSPECTION CALL LETTER
                        </option>
                        <option value="FINAL INSPECTION/FATS CALL LETTER">
                          FINAL INSPECTION/FATS CALL LETTER
                        </option>
                        <option value="REMARKS">REMARKS</option>
                        <option value="OTHERS">OTHERS</option>
                      </select>
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
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            InspectioncallFile: e.target.files[0],
                          })
                        }
                        ref={inputFileRef}
                        accept=".pdf"
                      />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Remarks &nbsp;
                        <span className="mandatorystart">*</span>
                      </label>
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
                      {/* <button
                        onClick={() => updateInspectionCall()}
                        className="btn fw-bold btn-primary"
                        type="button"
                      >
                        SUBMIT
                      </button> */}
                      <DynamicButton
                        label="SUBMIT"
                        onClick={() => updateInspectionCall()}
                        className="btn fw-bold btn-primary"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default InspectionCall;
