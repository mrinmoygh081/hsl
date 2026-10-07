import React, { useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useNavigate, useParams } from "react-router-dom";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const PBGuploadSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const [isthreePopup, setIsthreePopup] = useState(false);
  const [selectedFileTypeId, setSelectedFileTypeId] = useState("");
  const [selectedFileTypeName, setSelectedFileTypeName] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();

  const optionss = [
    {
      file_type_name: "Upload of PBG",
      file_type_id: 1,
    },
    {
      file_type_name: "Upload Claim Letter",
      file_type_id: 2,
    },
    {
      file_type_name: "Remarks",
      file_type_id: 3,
    },
    {
      file_type_name: "Others",
      file_type_id: 4,
    },
  ];

  const ChecklistHandler = () => {
    navigate(`/checklistedit/${id}`);
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"PBG Upload"} id={id} />
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
                          Action
                        </button>
                        <button
                          onClick={ChecklistHandler}
                          className="btn fw-bold btn-primary me-3"
                        >
                          Checklist
                        </button>
                        <button
                          onClick={() => setIsSecPopup(true)}
                          className="btn fw-bold btn-primary me-3"
                        >
                          Generate BTN
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
                                  <th>Document Type</th>

                                  <th>Action By</th>
                                  <th className="min-w-150px">Remarks</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                <tr>
                                  <td className="table_center">
                                    01/11/2023-10:30AM
                                  </td>
                                  <td>
                                  </td>
                                  <td>Claim Letter</td>

                                  <td>XYZ Pvt. Ltd.</td>
                                  <td>Uploading of Claim Letter</td>
                                </tr>
                                <tr>
                                  <td className="table_center">
                                    01/11/2023-10:30AM
                                  </td>
                                  <td>
                                  </td>
                                  <td>Upload of PBG</td>

                                  <td>XYZ Pvt. Ltd.</td>
                                  <td>Uploading of PBG</td>
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
                Upload of PBG
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
                    onChange={(e) => {
                      setSelectedFileTypeId(e.target.value);
                      setSelectedFileTypeName(
                        e.target.options[e.target.selectedIndex].text
                      );
                    }}
                  >
                    <option value="">Choose File Type</option>
                    {optionss.map((option) => (
                      <option
                        key={option.file_type_id}
                        value={option.file_type_id}
                      >
                        {option.file_type_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    File <span className="star">*</span>
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

      <div className={isthreePopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">
                Upload Claim Letter
              </span>
            </h3>
            <button
              className="btn fw-bold btn-danger"
              onClick={() => setIsthreePopup(false)}
            >
              Close
            </button>
          </div>
          <form>
            <div className="row">
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    File <span className="star">*</span>
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
      {console.log(isSecPopup)}
      <div className={isSecPopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">
                Bill Registration
              </span>
            </h3>
            <button
              className="btn fw-bold btn-danger"
              onClick={() => setIsSecPopup(false)}
            >
              Close
            </button>
          </div>
          <form>
            <div className="row">
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label">
                    Invoice Number <span className="star">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    Upload File <span className="star">*</span>
                    <FileUploadInfoIcon />
                  </label>
                  <input type="file" className="form-control" />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Vendor Bill Date <span className="star">*</span>
                </label>
                <input type="text" className="form-control" />
              </div>
              <div className="mb-3">
                <label className="form-label">
                  Bill Submitted To<span className="star">*</span>
                </label>
                <input type="text" className="form-control" />
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

export default PBGuploadSub;
