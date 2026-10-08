import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const LDPenaltyRefund = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const { id } = useParams();
  console.log(id, "id");
  const navigate = useNavigate();

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Checklish for LD/Penalty Refund"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <form>
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card">
                          <h3 className="m-3">
                            Checklish for LD/Penalty Refund:
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Reference Invoice no :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="invoice_no"
                                          placeholder="Invoice No"
                                        />
                                        <input
                                          type="file"
                                          className="form-control"
                                          name="invoice_filename"
                                          accept=".pdf"
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Balance Claim Invoice :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="invoice_no"
                                          placeholder="Invoice No"
                                        />
                                        <input
                                          type="file"
                                          className="form-control"
                                          name="invoice_filename"
                                          accept=".pdf"
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Claim Amount :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="invoice_no"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Retension % Claim :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="invoice_no"
                                        />
                                        <span className="ms-1">%</span>
                                        <span className="ms-2">
                                          {/* Retension Amount:{" "} */}
                                        </span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PBG:</td>
                                      <td className="btn_value">{}</td>
                                    </tr>
                                    <tr>
                                      <td>ICGRN Nos:</td>
                                      <td className="btn_value">{}</td>
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
                      <button className="btn fw-bold btn-primary me-3">
                        SUBMIT
                      </button>
                      <button
                        className="btn btn-primary me-3"
                        type="button"
                        onClick={() =>
                          navigate(`/invoice-and-payment-process/${id}`)
                        }
                      >
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
      <div className={isPopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">
                Upload Invoice
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
                    Invoice Number <span className="star">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
              </div>
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label d-flex align-items-center gap-2">
                    Invoice <span className="star">*</span>
                    <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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
                Upload PBG Copy (optionals)
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
                    Invoice <span className="star">*</span>
                    <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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

export default LDPenaltyRefund;
