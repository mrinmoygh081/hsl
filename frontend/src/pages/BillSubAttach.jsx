import React from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";

const BillSubAttach = () => {
  const { id } = useParams();

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"CHECK LIST FOR BILL SUBMISSION"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <tbody style={{ maxHeight: "100%" }}>
                                <tr>
                                  <th colSpan={3} className="table_center">
                                    CHECK LIST FOR BILL SUBMISSION - for Service
                                    Contracts
                                  </th>
                                </tr>
                                <tr>
                                  <td className="table_center w_50">A.</td>
                                  <th colSpan={2} className="table_center">
                                    GENERAL PARTICULARS: (to be checked and
                                    submitted by Contractor/Vendor)
                                  </th>
                                </tr>
                                <tr>
                                  <td className="table_center">A.1</td>
                                  <td className="w_400">
                                    BTN (as per BTS System){" "}
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.2</td>
                                  <td className="w_400">
                                    Invoice No. & Date / E-Invoice No. & Date
                                    (if applicable for the vendor) (Original &
                                    in triplicate)
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.6</td>
                                  <td className="w_400">WDC:</td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.3</td>
                                  <td className="w_400">PO Number </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.4</td>
                                  <td className="w_400">Name of Vendor </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-control"
                                    />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.5</td>
                                  <td className="w_400">Location of Work:</td>
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
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <tbody>
                                <tr className="table_center">
                                  <th colSpan={2}>
                                    I. For RA Bill (Running/Progressive bill)
                                  </th>
                                  <th>YES</th>
                                  <th>NO</th>
                                  <th>NA</th>
                                </tr>
                                <tr>
                                  <td className="table_center">A.6</td>
                                  <td>
                                    PO Number and date verified with Invoice:
                                  </td>
                                  <td>
                                    <input type="radio" name="id1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id1" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id1" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.7</td>
                                  <td>
                                    Vendor Name & Address in Invoice verified
                                    with Purchase Order:
                                  </td>
                                  <td>
                                    <input type="radio" name="id2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id2" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id2" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.8</td>
                                  <td>
                                    Vendor Code as in PO verified with Invoice:
                                  </td>
                                  <td>
                                    <input type="radio" name="id3" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id3" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id3" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.9</td>
                                  <td>Original certified WDC enclosed :</td>
                                  <td>
                                    <input type="radio" name="id9" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id9" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id9" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.10</td>
                                  <td>
                                    Whether WDC is Certified by the Authorized
                                    Person as per PO / SOTR with Rubber Stamp
                                  </td>
                                  <td>
                                    <input type="radio" name="id10" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id10" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id10" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.11</td>
                                  <td>HSN/SAC code is as per PO</td>
                                  <td>
                                    <input type="radio" name="id11" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id11" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id11" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.12</td>
                                  <td>GSTIN No. is as per PO</td>
                                  <td>
                                    <input type="radio" name="id12" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id12" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id12" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.13</td>
                                  <td>GST % is as per PO</td>
                                  <td>
                                    <input type="radio" name="id13" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id13" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id13" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.14</td>
                                  <td>
                                    Security Deposit (SD) submittded as per PO
                                  </td>
                                  <td>
                                    <input type="radio" name="id14" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id14" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id14" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.15</td>
                                  <td>
                                    PBG of equivalent amount submitted, as per
                                    PO
                                  </td>
                                  <td>
                                    <input type="radio" name="id15" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id15" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id15" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.16</td>
                                  <td>
                                    Compliance of Statutory Liabilities of
                                    labour as per PO
                                  </td>
                                  <td>
                                    <input type="radio" name="id16" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id16" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id16" />
                                  </td>
                                </tr>
                                <tr className="table_center">
                                  <th colSpan={2}>
                                    II. Applicable for Final/Balance Bill
                                  </th>
                                  <th></th>
                                  <th></th>
                                  <th></th>
                                </tr>
                                <tr>
                                  <td className="table_center">A.17</td>
                                  <td>
                                    Certified Job Completion Certificate (JCC)
                                    enclosed
                                  </td>
                                  <td>
                                    <input type="radio" name="id17" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id17" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id17" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.18</td>
                                  <td>
                                    MRS as per PO terms enclosed (If applicable)
                                  </td>
                                  <td>
                                    <input type="radio" name="id18" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id18" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id18" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.19</td>
                                  <td>
                                    Guarantee Period (GP) expired as per PO term
                                  </td>
                                  <td>
                                    <input type="radio" name="id19" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id19" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id19" />
                                  </td>
                                </tr>
                                <tr>
                                  <td className="table_center">A.20</td>
                                  <td>
                                    PBG of equivalent amount submitted, if GP is
                                    not over (If Yes, copy to enclose with the
                                    bill)
                                  </td>
                                  <td>
                                    <input type="radio" name="id20" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id20" />
                                  </td>
                                  <td>
                                    <input type="radio" name="id20" />
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={5}>
                                    <b>Note:</b> Transaction fee of Rs. 500.00
                                    for first return & Rs. 1000.00 for
                                    subsequent return of bill with inappropriate
                                    documents will be charged.
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div className="table-responsive mt-4">
                            <table className="table table-striped table-bordered table_height">
                              <tbody>
                                <tr className="table_center">
                                  <th colSpan={5}>For GRSE Use Only</th>
                                </tr>
                                <tr>
                                  <th className="table_center">B</th>
                                  <th>
                                    To be checked and verified by Bill
                                    certifying authority
                                  </th>
                                  <th className="table_center">YES</th>
                                  <th className="table_center">NO</th>
                                  <th className="table_center">NA</th>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 1</td>
                                  <td>
                                    Whether Bill has been forwarded through BTS
                                  </td>
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
                                    Whether WDC is Certified by the Authorized
                                    Person as per PO / SOTR with Rubber Stamp
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
                                    Job starting & Completion Date (Schedule &
                                    Actual) indicated in WDC
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
                                  <td>
                                    Certification of Penalty/ Recovery from bill
                                    indicated in WDC, if applicable
                                  </td>
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
                                  <td>
                                    Whether Bill is Certified by the Authorized
                                    Person as per PO / SOTR with Rubber Stamp
                                  </td>
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
                                    Certification of Penalty/ Recovery from bill
                                    as per WDC, if applicable
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
                                    Service Entry Sheet(SES)/GR in line with
                                    WDC, PO & Invoice
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
                                <tr className="table_center">
                                  <th colSpan={2}>For Final/Balance Bill</th>
                                  <th></th>
                                  <th></th>
                                  <th></th>
                                </tr>
                                <tr>
                                  <td className="table_center">B. 8</td>
                                  <td>
                                    Certified MRS copy as per PO terms enclosed
                                    (If applicable)
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
                                    Guarantee Period (GP) expired as per PO term
                                    and JCC
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
                                    PBG copy of equivalent amount till GP
                                    validity enclosed(if GP is not over)
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

export default BillSubAttach;
