import React, { useEffect, useState } from "react";
import { USER_VENDOR } from "../constants/userConstants";
import { checkTypeArr } from "../utils/smallFun";
import { formatDate, formatFilePath, formatFilePathBTN } from "../utils/getDateTimeNow";
import { apiCallBack } from "../utils/fetchAPIs";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { getGrnIcgrnByInvoice } from "../Helpers/BTNChecklist";
import { toast } from "react-toastify";
import { TailSpin } from "react-loader-spinner";

const BTNMaterialVendorInfo = ({ navigate, id }) => {
  const { state } = useLocation();
  const [data, setData] = useState(null);
  const [impDates, setImpDates] = useState(null);
  const { user, token } = useSelector((state) => state.auth);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  console.log(form, "form");

  const getDataByBTN = async () => {
    setLoading(true);
    try {
      const d = await apiCallBack("GET", `po/btn/btn_num?id=${id}&btn_num=${state}`, null, token);
      if (d?.status && checkTypeArr(d?.data)) {
        setData(d?.data[0]);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const getBTNData = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setImpDates(d?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  const getGrnIcgrnHandler = async (invoice_no) => {
    let response = await getGrnIcgrnByInvoice(id, invoice_no, token);
    if (response?.status) {
      const { gate_entry_no, grn_nos, icgrn_nos, gate_entry_date, total_price, CAPEX_IND } = response.data;
      setForm({
        ...form,
        gate_entry_no: gate_entry_no,
        gate_entry_date: formatDate(gate_entry_date),
        grn_nos: grn_nos,
        icgrn_nos: icgrn_nos,
        total_price: total_price,
        CAPEX_IND,
      });
    } else {
      toast.warn(response.message);
    }
  };

  useEffect(() => {
    getDataByBTN();
    getBTNData();
  }, []);

  useEffect(() => {
    if (data?.invoice_no) {
      getGrnIcgrnHandler(data?.invoice_no);
    }
  }, [data?.invoice_no]);

  return (
    <>
      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <TailSpin height="80" width="80" color="#4fa94d" ariaLabel="loading" radius="1" wrapperStyle={{}} wrapperClass="" visible={true} />
        </div>
      ) : (
        <div className="card-body p-3">
          <div className="tab-content">
            <div className="table-responsive">
              <table className="table table-striped table-bordered table_height">
                <tbody style={{ maxHeight: "100%" }}>
                  <tr>
                    <td>Yard Number:</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.yard ? data.yard : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Stage:</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.stage ? data.stage : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>{data?.invoice_type || "Digitally Signed Invoice / E-Invoice :"}</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.invoice_no ? data.invoice_no : "NA"}</b>
                      {data?.invoice_file_path ? (
                        <a
                          href={formatFilePath(data?.invoice_file_path)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            marginRight: "10px",
                          }}
                        >
                          View File
                        </a>
                      ) : data?.invoice_filename ? (
                        <a href={formatFilePathBTN(data?.invoice_filename)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : (
                        "NA"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Supporting Documents :</td>
                    <td className="btn_value">
                      {data?.suppoting_invoice_file_path ? (
                        <a href={formatFilePath(data?.suppoting_invoice_file_path)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : data?.suppoting_invoice_filename ? (
                        <a href={formatFilePathBTN(data?.suppoting_invoice_filename)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : (
                        "Not Submitted"
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Invoice Date:</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.invoice_date ? formatDate(data.invoice_date) : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Basic value:</td>
                    <td className="btn_value">
                      {/* <b className="me-3">{data?.invoice_value ? data.invoice_value : "NA"}</b> */}
                      <b className="me-3">{data?.invoice_value ? parseFloat(data.invoice_value).toFixed(2) : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Debit/Credit Note:</td>
                    <td className="btn_value">
                      {data?.debit_credit_file_path && data?.debit_credit_file_path !== "" ? (
                        <a href={formatFilePath(data?.debit_credit_file_path)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : data?.debit_credit_filename ? (
                        <a href={formatFilePathBTN(data?.debit_credit_filename)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : (
                        "NA"
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>Debit Note value:</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.debit_note ? data.debit_note : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Credit Note value:</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.credit_note ? data.credit_note : "NA"}</b>
                    </td>
                  </tr>
                  {!form?.CAPEX_IND && (
                    <>
                      <tr>
                        <td>Net claim amount:</td>
                        <td className="btn_value">
                          {/* <b> {data?.net_claim_amount ? data.net_claim_amount : "NA"}</b> */}
                          <b className="me-3">{data?.net_claim_amount ? parseFloat(data.net_claim_amount).toFixed(2) : "NA"}</b>
                        </td>
                      </tr>

                      <tr>
                        <td>CGST:</td>
                        <td className="btn_value">
                          <b>{data?.cgst ? data.cgst : "NA"}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>SGST:</td>
                        <td className="btn_value">
                          <b>{data?.sgst ? data.sgst : "NA"}</b>
                        </td>
                      </tr>
                      <tr>
                        <td>IGST:</td>
                        <td className="btn_value">
                          <b>{data?.igst ? data.igst : "NA"}</b>
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>Net Claim Amount with GST:</td>
                    <td className="btn_value">
                      {/* <b>{data?.net_with_gst ? data.net_with_gst : "NA"}</b> */}
                      <b className="me-3">{data?.net_with_gst ? parseFloat(data.net_with_gst).toFixed(2) : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Contractual SDBG Submission Date</td>
                    <td className="btn_value">
                      {/* <b className="me-3">
                      {impDates?.c_sdbg_date
                        ? formatDate(impDates.c_sdbg_date)
                        : "NA"}
                    </b> */}
                      <b className="me-3">
                        {impDates?.c_sdbg_date && formatDate(impDates?.c_sdbg_date)}
                        {!impDates?.c_sdbg_date ? "NA" : impDates?.c_sdbg_date && !impDates?.a_sdbg_date ? "(NOT SUBMITTED)" : ""}
                      </b>
                      {data?.c_sdbg_filename && data?.c_sdbg_filename !== "" && (
                        <a href={`${process.env.REACT_APP_PDF_URL}btns/${data?.c_sdbg_filename}`} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Actual SDBG Submission Date</td>
                    <td className="btn_value">
                      <b className="me-3">{impDates?.a_sdbg_date ? formatDate(impDates.a_sdbg_date) : "NA"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Demand raised by production/PP&C if any</td>
                    <td className="btn_value">
                      {data?.demand_raise_file_path && data.demand_raise_file_path !== "" ? (
                        <a href={formatFilePath(data?.demand_raise_file_path)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : data?.demand_raise_filename ? (
                        <a href={formatFilePathBTN(data?.demand_raise_filename)} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      ) : (
                        "NA"
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td>Gate Entry Acknowledgement no.</td>
                    <td className="btn_value">
                      <b className="me-3">
                        {/* {checkTypeArr(impDates?.gate_entry) &&
                        impDates?.gate_entry.map((item, i) => (
                          <span className="me-1" key={i}>
                            {item.acc_no}
                          </span>
                        ))} */}
                        {form?.gate_entry_no ? form.gate_entry_no : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>Gate Entry Date</td>
                    <td className="btn_value">
                      <b className="me-3">
                        {/* {checkTypeArr(impDates?.gate_entry) &&
                        impDates?.gate_entry.map((item, i) => (
                          <span className="me-1" key={i}>
                            {item.gate_date}
                          </span>
                        ))} */}
                        {form?.gate_entry_date ? form.gate_entry_date : "NA"}
                      </b>
                      {data?.get_entry_filename && data?.get_entry_filename !== "" && (
                        <a href={`${process.env.REACT_APP_PDF_URL}btns/${data?.get_entry_filename}`} target="_blank" rel="noreferrer">
                          VIEW
                        </a>
                      )}
                    </td>
                  </tr>
                  {/* <tr>
                    <td>GRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.icgrn_nos) &&
                        form?.icgrn_nos.map((item, i) => {
                          return (
                            <b className="me-3" key={i}>
                              {item?.grn_no ? item.grn_no : "NA"}
                            </b>
                          );
                        })}
                     
                    </td>
                  </tr>
                  <tr>
                    <td>ICGRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.icgrn_nos) &&
                        form?.icgrn_nos.map((item, i) => {
                          return (
                            <b className="me-3" key={i}>
                              {item?.grn_no ? item.grn_no : "NA"}
                            </b>
                          );
                        })}
                    </td>
                  </tr> */}
                  {/* <tr>
                    <td>GRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.grn_nos) &&
                        [...new Set(form?.grn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                          <b className="me-3" key={i}>
                            {uniqueGrn}
                          </b>
                        ))}
                    </td>
                  </tr>
                  <tr>
                    <td>ICGRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.icgrn_nos) &&
                        [...new Set(form?.icgrn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                          <b className="me-3" key={i}>
                            {uniqueGrn}
                          </b>
                        ))}
                    </td>
                  </tr> */}
                  <tr>
                    <td>GRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.grn_nos) && form?.grn_nos.length > 0 ? (
                        [...new Set(form?.grn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                          <b className="me-3" key={i}>
                            {uniqueGrn}
                          </b>
                        ))
                      ) : (
                        <span>NA</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>ICGRN No</td>
                    <td className="btn_value">
                      {checkTypeArr(form?.icgrn_nos) && form?.icgrn_nos.length > 0 ? (
                        [...new Set(form?.icgrn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                          <b className="me-3" key={i}>
                            {uniqueGrn}
                          </b>
                        ))
                      ) : (
                        <span>NA</span>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <td> Total Value (GRN and ICGRN)</td>
                    <td className="btn_value">
                      <b className="me-3">{data?.icgrn_total ? parseFloat(data.icgrn_total).toFixed(2) : "0.000"}</b>
                    </td>
                  </tr>
                  <tr>
                    <td>Contractual Drawing submission date</td>
                    <td className="btn_value">
                      <b>
                        {/* {impDates?.c_drawing_date &&
                        formatDate(impDates?.c_drawing_date)} */}
                        {impDates?.c_drawing_date ? formatDate(impDates.c_drawing_date) : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>Actual Drawing submission date</td>
                    <td className="btn_value">
                      <b>
                        {/* {impDates?.a_drawing_date &&
                        formatDate(impDates?.a_drawing_date)} */}
                        {impDates?.a_drawing_date ? formatDate(impDates.a_drawing_date) : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>Contractual QAP submission date</td>
                    <td className="btn_value">
                      <b>{impDates?.c_qap_date ? formatDate(impDates.c_qap_date) : "NA"}</b>
                    </td>
                  </tr>

                  <tr>
                    <td>Actual QAP submission date</td>
                    <td className="btn_value">
                      <b>
                        {/* {impDates?.a_qap_date && formatDate(impDates?.a_qap_date)} */}
                        {impDates?.a_qap_date ? formatDate(impDates.a_qap_date) : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>Contractual ILMS submission date</td>
                    <td className="btn_value">
                      <b>
                        {/* {impDates?.c_ilms_date &&
                        formatDate(impDates?.c_ilms_date)} */}
                        {impDates?.c_ilms_date ? formatDate(impDates.c_ilms_date) : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>Actual ILMS submission date</td>
                    <td className="btn_value">
                      <b>
                        {/* {impDates?.a_ilms_date &&
                        formatDate(impDates?.a_ilms_date)} */}
                        {impDates?.a_ilms_date ? formatDate(impDates.a_ilms_date) : "NA"}
                      </b>
                    </td>
                  </tr>
                  <tr>
                    <td>PBG</td>
                    <td className="btn_value">
                      {/* {data?.pbg_filename && data.pbg_filename !== "" ? (
                        <a
                          href={`${process.env.REACT_APP_PDF_URL}btns/${data.pbg_filename}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          VIEW
                        </a>
                      ) : (
                        "NA"
                      )} */}

                      {checkTypeArr(impDates?.pbg_filename)
                        ? impDates?.pbg_filename.map((item, i) => {
                            return (
                              <a
                                href={formatFilePath(item.file_path)}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  marginRight: "10px",
                                }}
                              >
                                View File
                              </a>
                            );
                          })
                        : "PBG NOT SUBMITTED"}
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
                </tbody>
              </table>
            </div>
            <div className="text-center">
              {user?.user_type === USER_VENDOR && (
                <button className="btn fw-bold btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                  BACK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BTNMaterialVendorInfo;
