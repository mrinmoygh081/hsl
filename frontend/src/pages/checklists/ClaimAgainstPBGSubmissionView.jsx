import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { checkTypeArr } from "../../utils/smallFun";
import { FaCaretLeft } from "react-icons/fa";
import { formatFilePath, formatEpochToDate } from "../../utils/getDateTimeNow";

const ClaimAgainstPBGSubmissionView = () => {
  const [data, setData] = useState(null);
  const [datapbg, setDatapbg] = useState(null);
  const { state } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch Data Function
  const getData = async () => {
    try {
      console.log("Fetching data for btn_num:", state, "with token:", token);
      const response = await apiCallBack("GET", `po/btn/pbg?btn_num=${state}`, null, token);
      console.log("API Response:", response);
      if (response?.statusCode === 200) {
        setData(response.data); // Response is an object
        console.log("Data set successfully:", response.data);
      } else {
        console.log("API failed with statusCode:", response?.statusCode, "Response:", response);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getDatapbg = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      console.log("PBG Data Response:", d);
      if (d?.statusCode === 200) {
        setDatapbg(d?.data);
        console.log("PBG Data set successfully:", d?.data);
      }
    } catch (error) {
      console.error("Error fetching PBG data:", error);
    }
  };

  useEffect(() => {
    if (state && token) {
      getData();
    } else {
      console.log("Missing state or token:", { state, token });
    }
    if (id && token) {
      getDatapbg();
    }
  }, [state, id, token]);

  console.log("Current Data State:", data);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Claim Against PBG Submission"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <form>
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card">
                          <h3 className="d-flex align-items-center m-3">
                            <button className="btn_icon me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                              <FaCaretLeft className="fs-20" />
                            </button>
                            <span className="header-title">
                              References - PO No: <strong>{id}</strong>
                            </span>
                            <span className="header-space"></span>
                            <span className="header-subtitle ms-4">
                              BTN NO: <strong>{state || data?.btn_num || "-"}</strong>
                            </span>
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Balance Claim Invoice :</td>
                                      <td className="btn_value">
                                        {data?.invoice_no || "-"}
                                        {data?.invoice_file_path && (
                                          <a href={formatFilePath(data.invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                                            View File
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Balance Claim Invoice Date:</td>
                                      <td className="btn_value">{data?.invoice_date ? formatEpochToDate(data.invoice_date) : "-"}</td>
                                    </tr>
                                    <tr>
                                      <td>Original Invoice No :</td>
                                      <td className="btn_value">
                                        {data?.original_invoice_no || "-"}
                                        {data?.original_invoice_file_path && (
                                          <a href={formatFilePath(data.original_invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                                            View File
                                          </a>
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Claim Amount :</td>
                                      <td className="btn_value">{data?.net_claim_amount || "0"}</td>
                                    </tr>
                                    <tr>
                                      <td>PBG</td>
                                      <td className="btn_value">
                                        {data?.pbg_files && checkTypeArr(JSON.parse(data.pbg_files))
                                          ? JSON.parse(data.pbg_files).map((item, i) => (
                                              <a key={i} href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                                                VIEW
                                              </a>
                                            ))
                                          : "PBG NOT SUBMITTED"}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-center mt-4">
                      <button className="btn btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                        BACK
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default ClaimAgainstPBGSubmissionView;
