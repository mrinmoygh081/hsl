import React from "react";
import { checkTypeArr } from "../utils/smallFun";
import { ESI_COMP, LEAVE_COMP, PF_COMP, WAGE_COMP } from "../constants/constants";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import { D_S_INVOICE, E_INVOICE } from "../constants/BTNContants";

const BTNServiceVendor = ({ data, form, invoiceData }) => {
  // Safe data access with fallbacks
  const initialData = data?.initial || {};
  const wdcDetails = data?.wdcDetails || {};
  const lineItems = checkTypeArr(wdcDetails?.line_item_array) ? wdcDetails.line_item_array : [];

  // Calculate total from line items if not provided
  const totalAmount = form?.net_claim_amount || wdcDetails?.total_amount || lineItems.reduce((sum, item) => sum + parseFloat(item?.claim_amount || 0), 0);

  // Function to add line breaks for comma separated values
  const formatWithLineBreaks = (text) => {
    if (!text) return "N/A";
    return text.split(",").map((item, index) => <div key={index}>{item.trim()}</div>);
  };

  return (
    <>
      <div className="card-body p-3">
        <div className="tab-content">
          <div className="table-responsive">
            {/* Vendor Information Table */}
            <table className="table table-striped table-bordered table_height">
              <tbody style={{ maxHeight: "100%" }}>
                <tr>
                  <td>Vendor Name</td>
                  <td className="btn_value">
                    <b>{initialData.vendor_name || "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Vendor Code</td>
                  <td className="btn_value">
                    <b>{initialData.vendor_code || "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>GSTIN (Registration no)</td>
                  <td className="btn_value">
                    <b>{initialData.vendor_gstno || "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>WDC no:</td>
                  <td className="btn_value">
                    <b>{formatWithLineBreaks(form?.wdc_number)}</b>
                  </td>
                </tr>
                <tr>
                  <td>Yard No:</td>
                  <td className="btn_value">
                    <b>{wdcDetails.yard_no || "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Stage:</td>
                  <td className="btn_value">
                    <b>{wdcDetails.stage_details || "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>HR Compliance Applicable (Y/N):</td>
                  <td className="btn_value">
                    <b>{form?.outside === "true" ? "N" : "Y"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Work Title:</td>
                  <td className="btn_value">
                    <b>{formatWithLineBreaks(wdcDetails.work_title)}</b>
                  </td>
                </tr>
                <tr>
                  <td>WDC Certifying Authority:</td>
                  <td className="btn_value">
                    <b>{formatWithLineBreaks(wdcDetails.assigned_to) || "N/A"}</b>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Rest of the component remains the same */}
            {/* Line Items Table */}
            {lineItems.length > 0 ? (
              <table className="table table-striped table-bordered table_height">
                <thead>
                  <tr>
                    <th>LI</th>
                    <th>Sub-LI</th>
                    <th>Description</th>
                    <th>UOM</th>
                    <th>Claim Qty</th>
                    <th>Total Claim</th>
                    <th>Delay</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item?.lineitem || "N/A"}</td>
                      <td>{item?.sublineitem || "N/A"}</td>
                      <td>{item?.description || "N/A"}</td>
                      <td>{item?.unit || "N/A"}</td>
                      <td>{item?.claim_qty || "0"}</td>
                      <td>&#8377;{parseFloat(item?.claim_amount || 0).toFixed(3)}</td>
                      <td>{item?.delay || "0"}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={5}>Total:</td>
                    <td colSpan={2}>
                      <b>&#8377;{parseFloat(totalAmount).toFixed(3)}</b>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="alert alert-info">No line items found</div>
            )}

            {/* Invoice and Compliance Details Table */}
            <table className="table table-striped table-bordered table_height">
              <tbody>
                <tr>
                  <td>Choose Invoice Type</td>
                  <td className="btn_value">
                    <b>{form?.invoice_type || "N/A"}</b>
                  </td>
                </tr>

                {form?.invoice_type === D_S_INVOICE && (
                  <tr>
                    <td>Digitally Signed Invoice:</td>
                    <td>
                      <div className="btn_value">
                        <div className="me-3">
                          <label>Invoice Number&nbsp;&nbsp;</label>
                          <p>
                            <b>{form?.invoice_no || "N/A"}</b>
                          </p>
                        </div>
                        <div>
                          <label>Invoice Date&nbsp;&nbsp;</label>
                          <p>
                            <b>{form?.invoice_date && formatDate(form?.invoice_date)}</b>
                          </p>
                        </div>
                      </div>
                      <div className="btn_value">
                        <div className="me-4">
                          <label htmlFor="">Invoice File</label>{" "}
                          <p>
                            <a href={formatFilePath(form?.invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                              View File
                            </a>
                          </p>
                        </div>
                        <div>
                          <label htmlFor="">Supporting Documents</label>
                          <p>
                            {form?.suppoting_invoice_file_path ? (
                              <a href={formatFilePath(form?.suppoting_invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                                View File
                              </a>
                            ) : (
                              "NA"
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {form?.invoice_type === E_INVOICE && (
                  <tr>
                    <td>E-Invoice No :</td>
                    <td>
                      <div className="btn_value">
                        <div className="me-3">
                          <label>Invoice Number&nbsp;&nbsp;</label>
                          <b>{form?.invoice_no || "N/A"}</b>
                        </div>
                        <div>
                          <label>Invoice Date&nbsp;&nbsp;</label>
                          <b>{form?.invoice_date && formatDate(form?.invoice_date)}</b>
                        </div>
                      </div>
                      <div className="btn_value">
                        <div className="me-4">
                          <label htmlFor="">Invoice File</label>
                          <p>
                            <a href={formatFilePath(form?.invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                              View File
                            </a>
                          </p>
                        </div>
                        <div>
                          <label htmlFor="">Supporting Documents</label>
                          <p>
                            {form?.suppoting_invoice_file_path ? (
                              <a href={formatFilePath(form?.suppoting_invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                                View File
                              </a>
                            ) : (
                              "NA"
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                <tr>
                  <td>Basic value:</td>
                  <td className="btn_value">
                    <b>&#8377;{form?.invoice_value || "0"}</b>
                  </td>
                </tr>

                <tr>
                  <td>Debit/Credit Note:</td>
                  <td className="btn_value">
                    {form?.debit_credit_file_path ? (
                      <a href={formatFilePath(form?.debit_credit_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                        View File
                      </a>
                    ) : (
                      "NA"
                    )}
                  </td>
                </tr>
                <tr>
                  <td>Debit Note value:</td>
                  <td className="btn_value">
                    <b>{form?.debit_note || "0"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Credit Note value:</td>
                  <td className="btn_value">
                    <b>{form?.credit_note || "0"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Net Claim Amount: </td>
                  <td className="btn_value">
                    <b>&#8377;{form?.net_claim_amount || "0"}</b>
                  </td>
                </tr>
                <tr>
                  <td>CGST:</td>
                  <td className="btn_value">
                    <b>
                      {form?.cgst || "0"}
                      <span className="ms-1">%</span>
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>SGST:</td>
                  <td className="btn_value">
                    <b>
                      {form?.sgst || "0"}
                      <span className="ms-1">%</span>
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>IGST:</td>
                  <td className="btn_value">
                    <b>
                      {form?.igst || "0"}
                      <span className="ms-1">%</span>
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>Net Claim Amount with GST:</td>
                  <td className="btn_value">
                    <b>&#8377;{form?.net_claim_amt_gst || "0"}</b>
                  </td>
                </tr>

                <tr>
                  <td>Contractual SDBG Submission Date</td>
                  <td className="btn_value">
                    <b className="me-3">{initialData.c_sdbg_date && formatDate(initialData.c_sdbg_date)}</b>
                  </td>
                </tr>
                <tr>
                  <td>Actual SDBG Submission Date</td>
                  <td className="btn_value">
                    <b className="me-3">{initialData.a_sdbg_date && formatDate(initialData.a_sdbg_date)}</b>
                  </td>
                </tr>
                <tr>
                  <td>Hinderance register certified by berth/user</td>
                  <td className="btn_value">
                    <b className="me-3">
                      {wdcDetails?.file_hinderence_report_cerified_by_berth ? (
                        <a href={`${process.env.REACT_APP_PDF_URL}wdc/${wdcDetails?.file_hinderence_report_cerified_by_berth}`} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : (
                        "NOT SUBMITTED"
                      )}
                    </b>
                  </td>
                </tr>

                <tr>
                  <td>PBG if any</td>
                  <td className="btn_value">
                    {checkTypeArr(initialData.pbg_filename)
                      ? initialData.pbg_filename.map((item, i) => (
                          <a key={i} href={`${process.env.REACT_APP_PDF_URL}btns/${item?.file_name}`} target="_blank" rel="noreferrer">
                            VIEW
                          </a>
                        ))
                      : "PBG NOT SUBMITTED"}
                  </td>
                </tr>
                {/* HR Compliance Rows */}
                <tr>
                  <td>ESI Compliance Certified By HR</td>
                  <td className="btn_value">
                    <b>
                      {wdcDetails?.esi_compliance === "Y" ? "ESI COMPLIANT" : wdcDetails?.esi_compliance === "NA" ? "NA" : wdcDetails?.esi_compliance ? "NOT COMPLIANT" : "N/A"}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>PF Compliance Certified By HR</td>
                  <td className="btn_value">
                    <b>{wdcDetails?.pf_compliance === "Y" ? "PF COMPLIANT" : wdcDetails?.pf_compliance === "NA" ? "NA" : wdcDetails?.pf_compliance ? "NOT COMPLIANT" : "N/A"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Wage Compliance Certified By HR</td>
                  <td className="btn_value">
                    <b>
                      {wdcDetails?.wages_compliance === "Y"
                        ? "WAGES COMPLIANT"
                        : wdcDetails?.wages_compliance === "NA"
                          ? "NA"
                          : wdcDetails?.wages_compliance
                            ? "NOT COMPLIANT"
                            : "N/A"}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>Leave Salary Certified By HR</td>
                  <td className="btn_value">
                    <b>
                      {wdcDetails?.leave_salary_compliance === "Y"
                        ? "LEAVE SALARY COMPLIANT"
                        : wdcDetails?.leave_salary_compliance === "NA"
                          ? "NA"
                          : wdcDetails?.leave_salary_compliance
                            ? "NOT COMPLIANT"
                            : "N/A"}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>Bonus Compliance Certified By HR</td>
                  <td className="btn_value">
                    <b>
                      {wdcDetails?.bonus_compliance === "Y"
                        ? "BONUS COMPLIANT"
                        : wdcDetails?.bonus_compliance === "NA"
                          ? "NA"
                          : wdcDetails?.bonus_compliance
                            ? "NOT COMPLIANT"
                            : "N/A"}
                    </b>
                  </td>
                </tr>
                <tr>
                  <td>Bill Certifying Authority</td>
                  <td className="btn_value">
                    <b>
                      {form?.bill_certifing_authority_name || "N/A"} ({form?.bill_certifing_authority || "N/A"})
                    </b>
                  </td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="hsn_gstn_icgrn" name="hsn_gstn_icgrn" defaultChecked={true} />
                      <label className="form-check-label" htmlFor="hsn_gstn_icgrn">
                        Whether HSN code, GSTIN, Tax rate is as per PO
                      </label>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="agree_to_declaration" name="agree_to_declaration" defaultChecked={true} />
                      <label className="form-check-label" htmlFor="agree_to_declaration">
                        I hereby declare that all the entries are correct.
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default BTNServiceVendor;
