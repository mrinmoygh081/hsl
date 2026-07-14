import React from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";

const BillVendorAttach = () => {
  const { id } = useParams();

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"CHECK LIST FOR VENDOR BILL"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <tbody>
                                <tr className="table_center">
                                  <th colSpan={3}>
                                    Checklist for Vendor bills
                                  </th>
                                </tr>
                                <tr className="table_center">
                                  <td colSpan={3}>
                                    (Filled up checklist to be enclosed with
                                    every bill before submitting to Finance)
                                  </td>
                                </tr>
                                <tr className="table_center">
                                  <th className="w_50">A</th>
                                  <th colSpan={2}>GENERAL PARTICULARS:</th>
                                </tr>
                                <tr>
                                  <td className="w_50">A.1</td>
                                  <td className="w_400">PO No:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.2</td>
                                  <td className="w_400">Vendor Name:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.3</td>
                                  <td className="w_400">Vendor Code:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.4</td>
                                  <td className="w_400">BTN:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.5</td>
                                  <td className="w_400">Invoice no:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.6</td>
                                  <td className="w_400">
                                    Ink signed PO (Required in case of 1st time
                                    invoicing & on every amendment)
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.7</td>
                                  <td className="w_400">
                                    Whether Bill has been forwarded through BTS
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.8</td>
                                  <td className="w_400">
                                    Whether E-Invoice is provided, if applicable
                                    for the vendor (Y/N)
                                  </td>
                                  <td>
                                    <select className="form-control">
                                      <option>Choose options...</option>
                                      <option value="Y">Yes</option>
                                      <option value="N">No</option>
                                    </select>
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.9</td>
                                  <td className="w_400">
                                    Whether HSN code is as per PO
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.10</td>
                                  <td className="w_400">
                                    Whether GSTIN is as per PO
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td>A.11</td>
                                  <td className="w_400">
                                    Whether Tax rate is as per PO
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="table-responsive mt-4">
                            <table className="table table-striped table-bordered table_height">
                              <tbody>
                                <tr className="table_center">
                                  <th colSpan={2}>Documents enclosed</th>
                                  <th>Yes</th>
                                  <th>No</th>
                                  <th>NA</th>
                                </tr>
                                <tr>
                                  <th className="table_center w_50">B</th>
                                  <th>MATERIAL SUPPLY BILLS:</th>
                                  <th className="table_center"></th>
                                  <th className="table_center"></th>
                                  <th className="table_center"></th>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 1</td>
                                  <td>Signed Original Tax Invoice</td>
                                  <td>
                                    <input type="radio" name="idB1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB1" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 2</td>
                                  <td>
                                    QAP/ BD schedule submission date as per
                                    PO-(DD/MM/YY)
                                  </td>
                                  <td>
                                    <input type="radio" name="idB2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB2" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 3</td>
                                  <td>
                                    QAP/BD Actual date (DD/MM/YY) (Documents in
                                    support)
                                  </td>
                                  <td>
                                    <input type="radio" name="idB3" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB3" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB3" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 4</td>
                                  <td>Pre-despatch Inspection certificate</td>
                                  <td>
                                    <input type="radio" name="idB4" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB4" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB4" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 5</td>
                                  <td>Packing list</td>
                                  <td>
                                    <input type="radio" name="idB5" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB5" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB5" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 6</td>
                                  <td>
                                    Weight Certificate & Preservation cert.
                                  </td>
                                  <td>
                                    <input type="radio" name="idB6" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB6" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB6" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 7</td>
                                  <td>
                                    GRSE Gate/Stores receipted challan/Service
                                    Entry Sheet
                                  </td>
                                  <td>
                                    <input type="radio" name="idB7" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB7" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB7" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 8</td>
                                  <td>
                                    Lot no in case delivery terms is in lots
                                  </td>
                                  <td>
                                    <input type="radio" name="idB8" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB8" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB8" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 9</td>
                                  <td>
                                    Whether SDBG/CPBG submitted (If Yes, BG no
                                    is to be mentioned)
                                  </td>
                                  <td>
                                    <input type="radio" name="idB9" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB9" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB9" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 10</td>
                                  <td>
                                    Whether PBG Submitted for entire PO value
                                    (single BG is to be submitted for total PO
                                    value to release 100% payment)
                                  </td>
                                  <td>
                                    <input type="radio" name="idB10" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB10" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB10" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 11</td>
                                  <td>
                                    Any other documents as per payment terms
                                  </td>
                                  <td>
                                    <input type="radio" name="idB11" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB11" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB11" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 12</td>
                                  <td>Clear ICGRN</td>
                                  <td>
                                    <input type="radio" name="idB12" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB12" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idB12" />
                                  </td>
                                </tr>
                                <tr className="table_center">
                                  <th colSpan={2}>RECOMMENDATION</th>
                                  <th></th>
                                  <th></th>
                                  <th></th>
                                </tr>
                                <tr>
                                  <td className="table_center">C. 1</td>
                                  <td>Liquidated damage (if any)</td>
                                  <td>
                                    <input type="radio" name="idC1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idC1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idC1" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">C. 2</td>
                                  <td>Penalty (if any)</td>
                                  <td>
                                    <input type="radio" name="idC2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idC2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="idC2" />
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={5}>
                                    <b>Note:</b> Invoice will be accepted on the
                                    basis of checklist submitted.
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
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
};

export default BillVendorAttach;
