import React, { useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const ChecklistSubEdit = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const { id } = useParams();

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Invoice, PBG Copy & Checklist"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <form>
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="card">
                          <h3 className="m-3">GENERAL PARTICULARS:</h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Invoice no:</td>
                                      <td>456788</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Whether Bill has been forwarded through
                                        BTS:
                                      </td>
                                      <td>456788</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Whether E-Invoice is provided, if
                                        applicable for the vendor (Y/N):
                                      </td>
                                      <td>
                                        <select className="form-control">
                                          <option value="Y">Y</option>
                                          <option value="N">N</option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Whether HSN code is as per PO:</td>
                                      <td>
                                        <select className="form-control">
                                          <option value="Y">Y</option>
                                          <option value="N">N</option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Whether GSTIN is as per PO</td>
                                      <td>
                                        <select className="form-control">
                                          <option value="Y">Y</option>
                                          <option value="N">N</option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Whether Tax rate is as per PO</td>
                                      <td>
                                        <select className="form-control">
                                          <option value="Y">Y</option>
                                          <option value="N">N</option>
                                        </select>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="card">
                          <h3 className="m-3">MATERIAL SUPPLY BILLS:</h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Signed Original Tax Invoice:</td>
                                      <td>
                                        <input
                                          type="text"
                                          className="form-control"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        QAP/ BD schedule submission date as per
                                        PO-(DD/MM/YY)
                                      </td>
                                      <td>
                                        <input
                                          type="date"
                                          className="form-control"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        QAP/BD Actual date (DD/MM/YY) (Documents
                                        in support)
                                      </td>
                                      <td>
                                        <input
                                          type="date"
                                          className="form-control"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Pre-despatch Inspection certificate
                                      </td>
                                      <td>456788</td>
                                    </tr>
                                    <tr>
                                      <td>Packing list</td>
                                      <td>Y</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Weight Certificate & Preservation cert.
                                      </td>
                                      <td>656790</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        GRSE Gate/Stores receipted
                                        challan/Service Entry Sheet
                                      </td>
                                      <td>325687</td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Lot no in case delivery terms is in lots
                                      </td>
                                      <td>65</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="card">
                          <h3 className="m-3">RECOMMENDATION:</h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Liquidated damage (if any):</td>
                                      <td>NA</td>
                                    </tr>
                                    <tr>
                                      <td>Penalty (if any):</td>
                                      <td>NA</td>
                                    </tr>
                                    <tr>
                                      <td>Whether Tax rate is as per PO</td>
                                      <td>Y</td>
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

export default ChecklistSubEdit;
