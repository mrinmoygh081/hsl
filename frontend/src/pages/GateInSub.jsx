import React, { useEffect, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import moment from "moment";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const GateInSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [icgrnData, setIcgrnData] = useState([]);
  const { id } = useParams();
  const { token } = useSelector((state) => state.auth);

  const getIcgrnData = async () => {
    try {
      const data = await apiCallBack(
        "GET",
        `po/ListOfIcgrn?poNo=${id}`,
        null,
        token
      );
      if (data?.status) {
        setIcgrnData(data?.data);
      }
    } catch (error) {
      console.error("Error fetching ICGRN list:", error);
    }
  };
  useEffect(() => {
    getIcgrnData();
  }, [id, token]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Gate In Entry / Goods receipt / ICGRN"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  <th>DateTime </th>
                                  <th>Document</th>
                                  <th>Document Type</th>
                                  <th>Action By</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                <tr>
                                  <td className="table_center">03-01-2024</td>
                                  <td>
                                    <a
                                      href={"#"}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Check File
                                    </a>
                                  </td>
                                  <td>Gate In Entry</td>
                                  <td>Mrinmoy Ghosh(65432)</td>
                                </tr>
                                <tr>
                                  <td className="table_center">08-01-2024</td>
                                  <td>
                                    <a
                                      href={"#"}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Check File
                                    </a>
                                  </td>
                                  <td>Goods Receipt</td>
                                  <td>Mrinmoy Ghosh(65432)</td>
                                </tr>
                                <tr>
                                  <td className="table_center">10-01-2024</td>
                                  <td>
                                    <a
                                      href={"#"}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Check File
                                    </a>
                                  </td>
                                  <td>ICGRN Report</td>
                                  <td>Mrinmoy Ghosh(65432)</td>
                                </tr>
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
      <div className={isPopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">
                Upload Shipping documents
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
                  <label className="form-label">
                    Shipping File Type <span className="star">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    Shipping File <span className="star">*</span>
                    <FileUploadInfoIcon />
                  </label>
                  <input type="file" className="form-control" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">Remarks</label>
                  <textarea
                    name=""
                    id=""
                    rows="4"
                    className="form-control"
                  ></textarea>
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <button className="btn fw-bold btn-primary">UPDATE</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default GateInSub;
