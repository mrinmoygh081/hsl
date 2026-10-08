import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft } from "react-icons/fa";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { toast } from "react-toastify";
import { formatFilePathBTNNO } from "../../utils/getDateTimeNow";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const AnyOtherClaim = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const [gstData, setGstData] = useState();
  const [viewedFiles, setViewedFiles] = useState({});

  const [formData, setFormData] = useState({
    ref_invoice1_no: "",
    ref_invoice1_amount: "",
    ref_invoice1_remarks: "",
    ref_invoice1_filename: null,
    ref_invoice1_file_path: null,
    ref_invoice2_no: "",
    ref_invoice2_amount: "",
    ref_invoice2_remarks: "",
    ref_invoice2_filename: null,
    ref_invoice2_file_path: null,
    ref_invoice3_no: "",
    ref_invoice3_amount: "",
    ref_invoice3_remarks: "",
    ref_invoice3_filename: null,
    ref_invoice3_file_path: null,
    ref_invoice4_no: "",
    ref_invoice4_amount: "",
    ref_invoice4_remarks: "",
    ref_invoice4_filename: null,
    ref_invoice4_file_path: null,
    claimType: "",
    invoiceReferenceNo: "",
    invoiceDate: null,
    invoice_file: null,
  });

  const getData = async () => {
    try {
      const response = await apiCallBack("GET", `po/btn/getGstnByPo?poNo=${id}`, null, token);
      if (response?.status) {
        setGstData(response?.data[0]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: files ? files[0] : value,
    }));
  };

  const viewInvoiceFile = async (invoiceNo, index) => {
    if (!invoiceNo) {
      toast.error("Please enter an Invoice Number to view.");
      return;
    }
    try {
      const response = await apiCallBack("GET", `po/btn/check-invoice?invoice_no=${invoiceNo}&poNo=${id}`, null, token);
      if (response?.status && response.data?.invoice_file_path) {
        const rawFilePath = response.data.invoice_file_path;
        const fileUrl = formatFilePathBTNNO(rawFilePath);
        const fileName = rawFilePath.split("\\").pop();

        setViewedFiles((prev) => ({ ...prev, [index]: fileUrl }));
        setFormData((prevData) => ({
          ...prevData,
          [`ref_invoice${index}_filename`]: fileName,
          [`ref_invoice${index}_file_path`]: rawFilePath,
        }));
      } else {
        setViewedFiles((prev) => ({ ...prev, [index]: null }));
        setFormData((prevData) => ({
          ...prevData,
          [`ref_invoice${index}_filename`]: null,
          [`ref_invoice${index}_file_path`]: null,
        }));
        toast.info("No file found for this invoice.");
      }
    } catch (error) {
      console.error("Error fetching invoice file:", error);
      toast.error("Failed to fetch invoice file.");
    }
  };

  const handleSubmit = async () => {
    const refInvoices = [
      {
        no: formData.ref_invoice1_no,
        amount: formData.ref_invoice1_amount,
        filename: formData.ref_invoice1_filename,
        file_path: formData.ref_invoice1_file_path,
        remarks: formData.ref_invoice1_remarks,
      },
      {
        no: formData.ref_invoice2_no,
        amount: formData.ref_invoice2_amount,
        filename: formData.ref_invoice2_filename,
        file_path: formData.ref_invoice2_file_path,
        remarks: formData.ref_invoice2_remarks,
      },
      {
        no: formData.ref_invoice3_no,
        amount: formData.ref_invoice3_amount,
        filename: formData.ref_invoice3_filename,
        file_path: formData.ref_invoice3_file_path,
        remarks: formData.ref_invoice3_remarks,
      },
      {
        no: formData.ref_invoice4_no,
        amount: formData.ref_invoice4_amount,
        filename: formData.ref_invoice4_filename,
        file_path: formData.ref_invoice4_file_path,
        remarks: formData.ref_invoice4_remarks,
      },
    ];

    const isAnyInvoiceFilled = refInvoices.some((invoice) => invoice.no);
    if (!isAnyInvoiceFilled) {
      toast.error("At least one Reference Invoice No is required.");
      return;
    }

    for (let i = 0; i < refInvoices.length; i++) {
      const invoice = refInvoices[i];
      if (invoice.no && (!invoice.amount || !invoice.filename || !invoice.file_path || !invoice.remarks)) {
        toast.error(`Claim Amount, Invoice File (via View), File Path, and Remarks are mandatory for Reference Invoice No ${i + 1}.`);
        return;
      }
    }

    if (!formData.claimType) {
      toast.error("Claim Type is required.");
      return;
    }

    if (!formData.invoiceReferenceNo) {
      toast.error("Invoice/Letter Reference No. is required.");
      return;
    }

    if (!formData.invoiceDate) {
      toast.error("Invoice/Letter Date is required.");
      return;
    }

    const fDToSend = new FormData();
    fDToSend.append("purchasing_doc_no", id);
    fDToSend.append("ref_invoice1_no", formData.ref_invoice1_no);
    fDToSend.append("ref_invoice1_amount", formData.ref_invoice1_amount);
    fDToSend.append("ref_invoice1_filename", formData.ref_invoice1_filename);
    fDToSend.append("ref_invoice1_file_path", formData.ref_invoice1_file_path);
    fDToSend.append("ref_invoice1_remarks", formData.ref_invoice1_remarks);
    fDToSend.append("ref_invoice2_no", formData.ref_invoice2_no);
    fDToSend.append("ref_invoice2_amount", formData.ref_invoice2_amount);
    fDToSend.append("ref_invoice2_filename", formData.ref_invoice2_filename);
    fDToSend.append("ref_invoice2_file_path", formData.ref_invoice2_file_path);
    fDToSend.append("ref_invoice2_remarks", formData.ref_invoice2_remarks);
    fDToSend.append("ref_invoice3_no", formData.ref_invoice3_no);
    fDToSend.append("ref_invoice3_amount", formData.ref_invoice3_amount);
    fDToSend.append("ref_invoice3_filename", formData.ref_invoice3_filename);
    fDToSend.append("ref_invoice3_file_path", formData.ref_invoice3_file_path);
    fDToSend.append("ref_invoice3_remarks", formData.ref_invoice3_remarks);
    fDToSend.append("ref_invoice4_no", formData.ref_invoice4_no);
    fDToSend.append("ref_invoice4_amount", formData.ref_invoice4_amount);
    fDToSend.append("ref_invoice4_filename", formData.ref_invoice4_filename);
    fDToSend.append("ref_invoice4_file_path", formData.ref_invoice4_file_path);
    fDToSend.append("ref_invoice4_remarks", formData.ref_invoice4_remarks);
    fDToSend.append("letter_reference_no", formData.invoiceReferenceNo);
    fDToSend.append("letter_date", formData.invoiceDate ? Math.floor(new Date(formData.invoiceDate).getTime() / 1000) : "");
    fDToSend.append("total_claim_amount", totalClaimAmount);
    fDToSend.append("btn_type", formData.claimType);
    fDToSend.append("invoice_file", formData.invoice_file);

    try {
      const response = await apiCallBack("POST", "po/btn/submitIncorrectDuct", fDToSend, token);
      toast.success("Success:", response.data);
      navigate(`/invoice-and-payment-process/${id}`);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form.");
    }
  };

  const totalClaimAmount = (
    Number(formData.ref_invoice1_amount || 0) +
    Number(formData.ref_invoice2_amount || 0) +
    Number(formData.ref_invoice3_amount || 0) +
    Number(formData.ref_invoice4_amount || 0)
  ).toFixed(2);

  const renderInvoiceRows = () => {
    const rows = [];
    for (let i = 1; i <= 4; i++) {
      rows.push(
        <tr key={i}>
          <td>
            <div className="d-flex align-items-center">
              <input
                type="text"
                name={`ref_invoice${i}_no`}
                className="form-control me-2"
                placeholder={`Enter Invoice No ${i}`}
                value={formData[`ref_invoice${i}_no`]}
                onChange={handleChange}
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={() => viewInvoiceFile(formData[`ref_invoice${i}_no`], i)}>
                Click
              </button>
            </div>
          </td>
          <td>
            <input
              type="number"
              name={`ref_invoice${i}_amount`}
              className="form-control"
              placeholder={`Enter Claim Amount ${i}`}
              value={formData[`ref_invoice${i}_amount`]}
              onChange={handleChange}
            />
          </td>
          <td>
            <textarea
              name={`ref_invoice${i}_remarks`}
              className="form-control"
              placeholder={`Enter Remarks ${i}`}
              value={formData[`ref_invoice${i}_remarks`]}
              onChange={handleChange}
            />
          </td>
          <td>
            {viewedFiles[i] ? (
              <a href={viewedFiles[i]} target="_blank" rel="noopener noreferrer">
                VIEW
              </a>
            ) : (
              <span>No File</span>
            )}
          </td>
        </tr>,
      );
    }
    return rows;
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Checklist for Any Other Claims"} id={id} />
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
                            </button>
                            References - PO No:{id}
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody>
                                    <tr>
                                      <td>Claim Type:</td>
                                      <td className="btn_value">
                                        <select
                                          name="claimType"
                                          className="form-select"
                                          style={{ width: "85%", fontSize: "13px", padding: "13px" }}
                                          value={formData.claimType}
                                          onChange={handleChange}
                                        >
                                          <option value="">Choose Your Claim Type</option>
                                          <option value="bill-incorrect-deductions">Excess Deductions</option>
                                          <option value="other-retentions">Other Retentions</option>
                                          <option value="ld-penalty-refund">LD-Penalty Refund</option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Name :</td>
                                      <td className="btn_value">{gstData?.name1 || ""}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code :</td>
                                      <td className="btn_value">{gstData?.lifnr || ""}</td>
                                    </tr>
                                    <tr>
                                      <td>GSTIN (Registration no) :</td>
                                      <td className="btn_value">{gstData?.stcd3 || "No GSTIN number"}</td>
                                    </tr>
                                    <tr>
                                      <td>Invoice/Letter Reference No. :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          name="invoiceReferenceNo"
                                          className="form-control me-2"
                                          placeholder="Enter Reference No"
                                          value={formData.invoiceReferenceNo}
                                          onChange={handleChange}
                                        />
                                        <input type="file" className="form-control" name="invoice_file" accept=".pdf" onChange={handleChange} />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Invoice/Letter Date:</td>
                                      <td className="btn_value">
                                        <ReactDatePicker
                                          selected={formData.invoiceDate}
                                          onChange={(date) => setFormData((prevData) => ({ ...prevData, invoiceDate: date }))}
                                          dateFormat="dd/MM/yyyy"
                                          className="form-control"
                                          placeholderText="DD/MM/YYYY"
                                        />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table className="table table-striped table-bordered table_height">
                                  <thead>
                                    <tr>
                                      <th>Reference NO (Invoice No/Jcc)</th>
                                      <th>Claim Amount</th>
                                      <th>Remarks</th>
                                      <th>Invoice File</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {renderInvoiceRows()}
                                    <tr>
                                      <td colSpan={3} className="text-end">
                                        <strong>Total Claim Amount:</strong>
                                      </td>
                                      <td>
                                        <b>{totalClaimAmount}</b>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="text-center">
                                {user?.user_type === USER_VENDOR && (
                                  <button type="button" className="btn fw-bold btn-primary me-3" onClick={handleSubmit}>
                                    SUBMIT
                                  </button>
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
    </>
  );
};

export default AnyOtherClaim;
