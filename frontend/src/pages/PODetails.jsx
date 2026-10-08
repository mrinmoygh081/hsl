import React, { Fragment, useEffect, useState } from "react";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNavigate, useParams } from "react-router-dom";
import { apiCallBack } from "../utils/fetchAPIs";
import { useDispatch, useSelector } from "react-redux";
import { doHandler, poRemoveHandler } from "../redux/slices/poSlice";
import { toast } from "react-toastify";
import axios from "axios";
import { clrLegend } from "../utils/clrLegend";
import { logOutFun } from "../utils/logOutFun";
import { logoutHandler } from "../redux/slices/loginSlice";
import { Link } from "react-router-dom";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";
import { MdArchive } from "react-icons/md";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate } from "../utils/getDateTimeNow";
import DynamicButton from "../Helpers/DynamicButton";

const PODetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [poDetails, setPoDetails] = useState([]);
  const [file, setFile] = useState(null);
  const { id } = useParams();
  const { token, user } = useSelector((state) => state.auth);
  const [isPopup, setIsPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  window.addEventListener("popstate", () => {
    dispatch(poRemoveHandler());
  });

  const currentStage = poDetails?.[0]?.currentStage?.current;

  useEffect(() => {
    (async () => {
      if (id) {
        const data = await apiCallBack("GET", `po/details?id=${id}`, null, token);
        if (data?.status) {
          setPoDetails(data?.data || []);
          dispatch(doHandler(data?.data?.[0].isDO));
        } else if (data?.response?.data?.message === "INVALID_EXPIRED_TOKEN") {
          logOutFun(dispatch, logoutHandler, poRemoveHandler);
        }
      }
    })();
  }, [id, token]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleUploadTNCMinutes = async (event) => {
    event.preventDefault();
    setLoading(true); // Start loading

    try {
      const formData = new FormData();
      formData.append("purchasing_doc_no", id);
      formData.append("file", file);

      const response = await apiCallBack("POST", "upload/tncminutes", formData, token);

      if (response.status === true) {
        toast.success("TNC Minutes uploaded successfully!");
        setIsPopup(false);
      } else {
        toast.error("TNC Minutes not uploaded! Please try again.");
      }
    } catch (error) {
      console.error("Error uploading TNC Minutes:", error.message);
      toast.error("Error uploading TNC Minutes. Please try again.");
    } finally {
      setLoading(false); // Stop loading
    }
  };
  // Stop loading
  const handleViewTNCMinutes = async () => {
    try {
      // Step 1: Fetch file info JSON
      const apiUrl = `${process.env.REACT_APP_PDF_URL}/api/v1/po/download/tnc?purchesing_doc_no=${id}`;
      console.log("Fetching:", apiUrl);

      const infoResponse = await axios.get(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if API returned data correctly
      if (!infoResponse.data?.data || infoResponse.data.data.length === 0) {
        toast.warn("TNC Minutes not found!");
        return;
      }

      // Extract file path
      let filePath = infoResponse.data.data[0].full_file_path;

      // Replace backslash with forward slash
      filePath = filePath.replace(/\\/g, "/");

      // Final PDF URL
      const pdfUrl = `${process.env.REACT_APP_PDF_URL}/${filePath}`;
      console.log("PDF URL:", pdfUrl);

      // Direct open – NO BLOB
      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Error viewing TNC Minutes:", error);
      toast.error("Unable to view TNC Minutes. Please try again later.");
    }
  };

  const handleDownloadSAPPO = async () => {
    try {
      const response = await apiCallBack("GET", `po/download/latestDocFile?poNo=${id}`, null, token);
      if (response?.status) {
        const url = `${process.env.REACT_APP_ROOT_URL}sapuploads/po/${response?.data[0].file_name}`;
        window.open(url, "_blank");
      }
    } catch (error) {
      console.error("Error downloading SAP PO:", error.message);
      toast.warn("PO DOCUMENT NOT AVAILABLE.");
    }
  };

  const getData = async () => {
    try {
      const data = await apiCallBack("GET", `po/download/getPoFileList?poNo=${id}`, null, token);
      console.log(data);
      if (data?.status) {
        if (data?.data && data?.data.length > 0) {
          navigate(`/poarchive/${id}`);
        } else {
          toast.warn("PO AMMENDMENT NOT AVAILABLE.");
        }
      }
    } catch (error) {
      console.error("Error fetching drawing list:", error);
    }
  };

  return (
    <>
      <main>
        <div className="d-flex flex-column flex-root">
          <div className="page d-flex flex-row flex-column-fluid">
            <SideBar id={id} />
            <div className="wrapper d-flex flex-column flex-row-fluid">
              <Header title={""} id={id} />
              <div className="content d-flex flex-column flex-column-fluid" id="kt_content">
                <div className="post d-flex flex-column-fluid">
                  <div className="container-xxl">
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="screen_header">
                          <div className="screen_header_top">
                          </div>
                        </div>
                        <div>
                          <div className="d-flex align-items-center pb-3 justify-content-between">
                            <h1>Purchase Order Details</h1>
                            <div className="d-flex">
                              {console.log("poDetails", poDetails)}
                              <button
                                className="btn btn-primary me-3"
                                onClick={() => setIsPopup(true)}
                                style={{
                                  display: checkTypeArr(poDetails) && poDetails?.[0]?.isDO ? "inline-block" : "none",
                                }}
                              >
                                Upload TNC Minutes
                              </button>
                              <button className="btn btn-primary me-2" onClick={handleViewTNCMinutes}>
                                Document Attachement
                              </button>
                              <DynamicButton label="Download PO" className="btn  btn-primary me-2" onClick={handleDownloadSAPPO} />
                              {user?.user_type !== 1 && (
                                <>
                                  <button onClick={getData} className="btn btn-primary">
                                    <MdArchive style={{ fontSize: "20px" }} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          {poDetails &&
                            poDetails.length > 0 &&
                            poDetails.map((po, i) => (
                              <div key={i}>
                                <div className="row">
                                  <div className="col-4">
                                    <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                                      <div className="card-body py-3">
                                        <div className="card_header_data">
                                          <span className="label">PO Number:</span>
                                          <span className="label_data">{po.EBELN}</span>
                                        </div>
                                        <div className="card_header_data">
                                          <span className="label">PO Date:</span>
                                          <span className="label_data">

                                            {po?.AEDAT ? formatDate(po?.AEDAT) : "Not Updated"}

                                          </span>
                                        </div>
                                        <div className="card_header_data">
                                          <span className="label">Vendor:</span>
                                          <span className="label_data">
                                            {po?.NAME1} (<span>{po?.LIFNR}</span>)
                                          </span>
                                        </div>

                                        <div className="card_header_data">
                                          <span className="label">Dealing Officer:</span>
                                          <span className="label_data">
                                            {po?.doInfo?.CNAME} ({po?.doInfo?.ERNAM})
                                          </span>
                                        </div>
                                        {po?.vendor_type && (
                                          <div className="card_header_data">
                                            <span className="label">Vendor Type:</span>
                                            <span className="label_data" style={{ textTransform: "uppercase" }}>
                                              {po.vendor_type}
                                            </span>
                                          </div>
                                        )}
                                        <div className="card_header_data">
                                          <span className="label_data">{/* PO Acceptance Date */}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {po?.timeline === "" ? (
                                    ""
                                  ) : (
                                    <div className="col-8">
                                      <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                                        <div className="card-body py-3">
                                          <div className="card_header_data">
                                            <span className="label" style={{ fontSize: "medium" }}>
                                              Current Stage:
                                            </span>
                                            <span className="label_data" style={{ fontSize: "medium" }}>
                                              {currentStage || "Not available"}
                                            </span>
                                          </div>

                                          {po?.timeline &&
                                            checkTypeArr(po.timeline) &&
                                            po.timeline.map((item, i) => (
                                              <Fragment key={i}>
                                                {item?.mtext && item?.plan_date && (
                                                  <div className="card_header_data">
                                                    <span className="label">{item?.mtext} :</span>
                                                    <span className="label_data">
                                                      {item?.plan_date ? formatDate(item?.plan_date) : "Not Updated"}(
                                                      <span className={`${clrLegend(item?.current_status)} bold`}>{item?.current_status || "Not Uploaded"}</span>)
                                                    </span>
                                                  </div>
                                                )}

                                                {item?.milestonetext && item?.actualsubmissiondate && (
                                                  <div className="card_header_data">
                                                    <span className="label">{item?.milestonetext} :</span>
                                                    <span className="label_data">{item?.actualsubmissiondate ? formatDate(item?.actualsubmissiondate) : "Not Updated"} </span>
                                                  </div>
                                                )}

                                                {item?.acknowledgementnt_date && (
                                                  <div className="card_header_data">
                                                    <span className="label">RECEIVED DATE :</span>
                                                    <span className="label_data">{item?.acknowledgementnt_date ? formatDate(item?.acknowledgementnt_date) : "Not Updated"}</span>
                                                  </div>
                                                )}

                                                {item?.acknowledgement_text && (
                                                  <div className="card_header_data">
                                                    <span className="label">{item.acknowledgement_text} :</span>
                                                    <span className="label_data">{item.acknowledgement_date ? formatDate(item.acknowledgement_date) : "Not Updated"}</span>
                                                  </div>
                                                )}
                                              </Fragment>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="card card-xxl-stretch mb-5 mb-xxl-8 customer_feedback">{/* Add customer feedback information here */}</div>
                              </div>
                            ))}
                        </div>
                      </div>

                      <div className="col-12 customer_feedback">
                        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                          <div className="card-body py-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <thead>
                                    <tr className="border-0">
                                      <th className="">Item number</th>
                                      <th>Material code</th>
                                      <th>Description</th>
                                      <th>Quantity</th>
                                      <th>UOM</th>
                                      <th>Contractual delivery date </th>
                                    </tr>
                                  </thead>
                                  <tbody style={{ maxHeight: "100%" }}>
                                    {poDetails.length > 0 ? (
                                      poDetails.map((po) =>
                                        po.materialResult.map((item, index) => (
                                          <tr key={index}>
                                            <td>{item.material_item_number}</td>
                                            <td>{item.material_code}</td>
                                            <td>{item.mat_description}</td>
                                            <td>{item.material_quantity}</td>
                                            <td>{item.material_unit}</td>

                                            <td>{!item?.contractual_delivery_date ? "No date found" : formatDate(item?.contractual_delivery_date)}</td>
                                          </tr>
                                        ))
                                      )
                                    ) : (
                                      <tr>
                                        <td colSpan="6">Loading PO Details...</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={isPopup ? "popup active" : "popup"}>
                        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                          <div className="card-header border-0 pt-5">
                            <h3 className="card-title align-items-start flex-column">
                              <span className="card-label fw-bold fs-3 mb-1">Upload TNC Minutes</span>
                            </h3>
                            <button className="btn fw-bold btn-danger" onClick={() => setIsPopup(false)}>
                              Close
                            </button>
                          </div>
                          <form>
                            <div className="row">
                              <div className="col-12">
                                <div className="mb-3">
                                  <label className="form-label d-flex align-items-center gap-2">
                                    Choose File
                                    <FileUploadInfoIcon />
                                  </label>
                                  <input type="file" className="form-control" onChange={handleFileChange} accept=".pdf" />
                                </div>
                              </div>
                              <div className="col-12">
                                <div className="mb-3">
                                  <button className="btn fw-bold btn-primary" onClick={handleUploadTNCMinutes} disabled={loading}>
                                    {loading ? "Uploading..." : "UPDATE"}{" "}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </form>
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
      </main>
    </>
  );
};

export default PODetails;
