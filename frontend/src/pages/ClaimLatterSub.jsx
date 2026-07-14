import React, { useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const ClaimLatterSub = () => {
  const { id } = useParams();
  const [isPopup, setIsPopup] = useState(false);
  const [form, setForm] = useState({
    btn: "",
    file: "",
    remarks: "",
  });

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Claim Letter"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        <button
                          onClick={() => setIsPopup(true)}
                          className="btn fw-bold btn-primary me-3"
                        >
                          ACTION
                        </button>
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
                                  <th>Document</th>
                                  <th>BTN Number</th>
                                  <th>Action By</th>
                                  <th className="min-w-150px">Remarks</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                <tr>
                                  <td className="table_center">01/11/2023</td>
                                  <td>Claim Letter</td>
                                  <td></td>
                                  <td>XYZ Pvt. Ltd.</td>
                                  <td>Uploading of Claim Letter</td>
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
                Upload Claim Letter
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
                    Choose BTN Number <span className="star">*</span>
                  </label>
                  <select
                    name=""
                    id=""
                    className="form-select"
                    onChange={(e) => {
                      setForm({ ...form, btn: e.target.value });
                    }}
                    value={form?.btn}
                  >
                    <option value="">Choose BTN Number</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    File Info <span className="star">*</span>
                    <FileUploadInfoIcon />
                  </label>
                  <input type="file" className="form-control" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">
                    Remarks <span className="star">*</span>
                  </label>
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
                  <button className="btn fw-bold btn-primary">SUBMIT</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ClaimLatterSub;
