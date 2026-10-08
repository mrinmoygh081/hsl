import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { inputFileChange, inputTypeChange } from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { actionHandlerAdvancebillPayment } from "../../Helpers/BTNChecklist";
import { USER_VENDOR } from "../../constants/userConstants";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCaretLeft } from "react-icons/fa";
import DynamicButton from "../../Helpers/DynamicButton";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const AdvanceBillPayment = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    invoice_no: "",
    invoice_date: null,
    invoice_value: "",
    net_claim_amount: "",
    invoice_type: "",
    invoice_filename: null,
    suppoting_invoice_filename: null,
    yard: "",
    stage: "",
    hsn_gstn_taxrate: false,
    cgst: "",
    sgst: "",
    igst: "",
    vendor_code: "",
    vendor_name: "",
    vendor_gstno: "",
    bg_file_path: "", // New field for BG file path
  });

  // Calculate net claim amount
  const calculateNetClaimAmount = () => {
    const invoiceValue = parseFloat(form.invoice_value) || 0;
    const netClaimAmount = invoiceValue;

    setForm((prevForm) => ({
      ...prevForm,
      net_claim_amount: netClaimAmount.toFixed(2),
    }));
  };

  useEffect(() => {
    calculateNetClaimAmount();
  }, [form.invoice_value]);

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/adv-bill-against-bg?type=init&poNo=${id}`, null, token);

      if (response?.status && response?.data) {
        const bgFilePath = response.data.bgData && response.data.bgData.length > 0 ? response.data.bgData[0].file_path : "";

        setForm((prevForm) => ({
          ...prevForm,
          vendor_code: response.data.vendor_code || "",
          vendor_name: response.data.vendor_name || "",
          vendor_gstno: response.data.vendor_gstno || "",
          bg_file_path: bgFilePath,
        }));
      } else {
        console.error("API response failed:", response?.message);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <SideBar />
        <div className="wrapper d-flex flex-column flex-row-fluid">
          <Header title={"Bills for Advance Payment"} id={id} />
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
                          </button>{" "}
                          References - PO No:{id}
                        </h3>
                        <div className="card-body p-3">
                          <div className="tab-content">
                            <div className="table-responsive">
                              <table className="table table-striped table-bordered table_height">
                                <tbody style={{ maxHeight: "100%" }}>
                                  <tr>
                                    <td>Vendor Name:</td>
                                    <td className="btn_value">
                                      <p>{form.vendor_name || "Loading..."}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Vendor</td>
                                    <td>
                                      <div>
                                        <b>Code: {form?.vendor_code || form?.vendor_code || "Loading..."}</b>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Vendor GSTIN No:</td>
                                    <td className="btn_value">
                                      <p>{form.vendor_gstno || "Loading..."}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Yard No:</td>
                                    <td className="btn_value">
                                      <input
                                        type="number"
                                        className="form-control"
                                        onWheel={inputOnWheelPrevent}
                                        name="yard"
                                        value={form.yard}
                                        onChange={(e) => inputTypeChange(e, form, setForm)}
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Choose Invoice Type:</td>
                                    <td className="btn_value">
                                      <select name="invoice_type" className="form-select" value={form.invoice_type} onChange={(e) => inputTypeChange(e, form, setForm)}>
                                        <option value="">Choose Invoice Type</option>
                                        <option value={D_S_INVOICE}>Digitally Signed Invoice</option>
                                        <option value={E_INVOICE}>EInvoice</option>
                                      </select>
                                    </td>
                                  </tr>
                                  {(form.invoice_type === D_S_INVOICE || form.invoice_type === E_INVOICE) && (
                                    <>
                                      <tr>
                                        <td>{form.invoice_type === D_S_INVOICE ? "Digitally Signed Invoice:" : "E-Invoice No:"}</td>
                                        <td className="btn_value">
                                          <div className="me-4 mb-2">
                                            <label htmlFor="invoice_no">Invoice Number</label>
                                            <input
                                              type="text"
                                              className="form-control"
                                              name="invoice_no"
                                              value={form.invoice_no}
                                              placeholder="Invoice number"
                                              onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Invoice File:</td>
                                        <td className="btn_value">
                                          <div className="d-flex align-items-center gap-2">
                                          <input type="file" className="form-control" name="invoice_filename" onChange={(e) => inputFileChange(e, form, setForm)} accept=".pdf" />
                                          <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Supporting Documents:</td>
                                        <td className="btn_value">
                                          <div className="d-flex align-items-center gap-2">
                                          <input
                                            type="file"
                                            className="form-control"
                                            name="suppoting_invoice_filename"
                                            onChange={(e) => inputFileChange(e, form, setForm)}
                                            accept=".pdf"
                                          />
                                          <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                          </div>
                                        </td>
                                      </tr>
                                    </>
                                  )}
                                  <tr>
                                    <td>Basic Value:</td>
                                    <td className="btn_value">
                                      <input
                                        type="number"
                                        className="form-control"
                                        onWheel={inputOnWheelPrevent}
                                        name="invoice_value"
                                        value={form.invoice_value}
                                        onChange={(e) => inputTypeChange(e, form, setForm)}
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Invoice Date:</td>
                                    <td className="btn_value">
                                      <ReactDatePicker
                                        dateFormat="dd/MM/yyyy"
                                        selected={form.invoice_date}
                                        onChange={(date) => setForm({ ...form, invoice_date: date })}
                                        className="form-control"
                                        placeholderText="DD/MM/YYYY"
                                      />
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Net Claim Amount:</td>
                                    <td className="btn_value">
                                      <b>{form.net_claim_amount}</b>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Submission of Advance Security (BG/IB):</td>
                                    <td className="btn_value">
                                      {form.bg_file_path ? (
                                        <a
                                          href={`${process.env.REACT_APP_PDF_URL}/${form.bg_file_path.replace(/\\/g, "/")}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-outline-primary"
                                          style={{ borderRadius: "8px" }}
                                        >
                                          View BG File
                                        </a>
                                      ) : (
                                        <p>No BG file</p>
                                      )}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>HSN Code, GSTIN, Tax Rate as per PO:</td>
                                    <td className="btn_value">
                                      <div className="form-check">
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          id="hsn_gstn_taxrate"
                                          name="hsn_gstn_taxrate"
                                          checked={form.hsn_gstn_taxrate}
                                          onChange={() =>
                                            setForm({
                                              ...form,
                                              hsn_gstn_taxrate: !form.hsn_gstn_taxrate,
                                            })
                                          }
                                        />
                                        <label className="form-check-label" htmlFor="hsn_gstn_taxrate">
                                          Confirm HSN code, GSTIN, Tax rate is as per PO
                                        </label>
                                      </div>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div className="text-center">
                              {user?.user_type === USER_VENDOR && (
                                <DynamicButton
                                  label="SUBMIT"
                                  onClick={() => actionHandlerAdvancebillPayment("AdvanceBillPayment", token, id, form, setForm, navigate)}
                                  className="btn fw-bold btn-primary me-3"
                                  type="submit"
                                />
                              )}
                              <button className="btn fw-bold btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                BACK
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default AdvanceBillPayment;
