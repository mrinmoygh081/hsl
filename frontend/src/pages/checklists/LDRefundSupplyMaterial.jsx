import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft, FaPlus } from "react-icons/fa";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { toast } from "react-toastify";
import { Button } from "react-bootstrap";
import DynamicButton from "../../Helpers/DynamicButton";
import * as XLSX from "xlsx";
import { IoClose } from "react-icons/io5";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const LDRefundSupplyMaterial = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  console.log(user, "useruser");
  const [gstData, setGstData] = useState();
  const [fileUploaded, setFileUploaded] = useState(false);

  const [formData, setFormData] = useState({
    ref_invoice1_no: "",
    ref_invoice1_amount: "",
    ref_invoice1_remarks: "",
    ref_invoice2_no: "",
    ref_invoice2_amount: "",
    ref_invoice2_remarks: "",
    ref_invoice3_no: "",
    ref_invoice3_amount: "",
    ref_invoice3_remarks: "",
    ref_invoice4_no: "",
    ref_invoice4_amount: "",
    ref_invoice4_remarks: "",
    claimType: "",
    invoiceReferenceNo: "",
    invoiceDate: null,
  });
  const [fileUploadResponses, setFileUploadResponses] = useState({
    invoice_file: null,
    worksheet_excel_file: null,
    po_amendment_file: null,
    ref_invoice1_file: null,
    ref_invoice2_file: null,
    ref_invoice3_file: null,
    ref_invoice4_file: null,
  });

  const handleDownloadTemplate = () => {
    // Define a blank worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Column 1", "Column 2", "Column 3"], // Headers for the template
      ["", "", ""], // Empty row for data entry
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, "Worksheet_Template.xlsx");
  };

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

  const handleChange = async (e) => {
    const { name, value, files } = e.target;

    // Update formData for regular inputs or file selection
    setFormData((prevData) => ({
      ...prevData,
      [name]: files ? files[0] : value,
    }));

    // If files are selected, initiate file upload
    if (files) {
      await handleFileUpload(name, files[0]);
    }
  };

  const handleFileUpload = async (fileName, fileToUpload) => {
    if (!fileToUpload) {
      console.error(`No file selected for ${fileName}`);
      toast.error(`Please select a file for ${fileName}`);
      return;
    }

    const uploadData = new FormData();
    uploadData.append(fileName, fileToUpload);

    try {
      const response = await apiCallBack("POST", "po/btn/fileUpload", uploadData, token);

      if (response?.status) {
        // Fix path and generate file URL
        const filePath = response.data.path.replace(/\\/g, "/");
        const fileUrl = `${process.env.REACT_APP_PDF_URL}${filePath.startsWith("uploads/") ? filePath.slice("uploads/".length) : "uploads/" + filePath}`;

        // Save file details in fileUploadResponses state
        setFileUploadResponses((prevResponses) => ({
          ...prevResponses,
          [fileName]: { filename: response.data.filename, fileUrl: fileUrl },
        }));

        toast.success(response.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("File upload failed. Please try again.");
    }
  };

  const handleSubmit = async () => {
    const payload = {
      purchasing_doc_no: id,
      btn_type: "ld-penalty-refund",
      total_claim_amount: totalClaimAmount,
      letter_reference_no: formData.letter_reference_no,
      letter_date: formData.invoiceDate ? Math.floor(new Date(formData.invoiceDate).getTime() / 1000) : "",

      invoice_file: fileUploadResponses.invoice_file?.filename,
      worksheet_excel_file: fileUploadResponses.worksheet_excel_file?.filename,
      po_amendment_file: fileUploadResponses.po_amendment_file?.filename,

      ref_invoice1_no: formData.ref_invoice1_no,
      ref_invoice1_amount: formData.ref_invoice1_amount,
      ref_invoice1_file: fileUploadResponses.ref_invoice1_file?.filename,
      ref_invoice1_remarks: formData.ref_invoice1_remarks,

      ref_invoice2_no: formData.ref_invoice2_no,
      ref_invoice2_amount: formData.ref_invoice2_amount,
      ref_invoice2_file: fileUploadResponses.ref_invoice2_file?.filename,
      ref_invoice2_remarks: formData.ref_invoice2_remarks,

      ref_invoice3_no: formData.ref_invoice3_no,
      ref_invoice3_amount: formData.ref_invoice3_amount,
      ref_invoice3_file: fileUploadResponses.ref_invoice3_file?.filename,
      ref_invoice3_remarks: formData.ref_invoice3_remarks,

      ref_invoice4_no: formData.ref_invoice4_no,
      ref_invoice4_amount: formData.ref_invoice4_amount,
      ref_invoice4_file: fileUploadResponses.ref_invoice4_file?.filename,
      ref_invoice4_remarks: formData.ref_invoice4_remarks,
    };

    try {
      const response = await apiCallBack("POST", "po/btn/submitLd", payload, token);
      if (response?.status) {
        toast.success("Form submitted successfully!");
        navigate(`/invoice-and-payment-process/${id}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Form submission failed. Please try again.");
    }
  };

  const totalClaimAmount = (
    Number(formData.ref_invoice1_amount || 0) +
    Number(formData.ref_invoice2_amount || 0) +
    Number(formData.ref_invoice3_amount || 0) +
    Number(formData.ref_invoice4_amount || 0)
  ).toFixed(2);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"checklist for LD REFUND"} id={id} />
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
                                  <tbody>
                                    <tr>
                                      <td>Claim Type:</td>
                                      <td className="btn_value">
                                        <select
                                          name="claimType"
                                          className="form-select"
                                          style={{
                                            width: "85%",
                                            fontSize: "10px",
                                            padding: "13px",
                                          }}
                                          value={formData.claimType}
                                          onChange={handleChange}
                                        >
                                          <option value="ld-penalty-refund">Checklist for LD-Penalty Refund</option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Name :</td>
                                      <td className="btn_value">{gstData?.name1 ? gstData.name1 : ""}</td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code :</td>
                                      <td className="btn_value">{gstData?.lifnr ? gstData.lifnr : ""}</td>
                                    </tr>
                                    <tr>
                                      <td>GSTIN (Registration no) :</td>
                                      <td className="btn_value">{gstData?.stcd3 ? gstData.stcd3 : "No GSTIN number"}</td>
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

                                        {!fileUploadResponses.invoice_file ? (
                                          <div className="d-flex align-items-center gap-2">
                                            <input type="file" name="invoice_file" className="form-control me-3" onChange={handleChange} accept=".pdf,.xlsx" />
                                            <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                          </div>
                                        ) : (
                                          <div className="d-flex align-items-center">
                                            <a href={fileUploadResponses.invoice_file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm me-2">
                                              View Uploaded File
                                            </a>
                                            <button
                                              className="btn btn-sm fw-bold btn-danger"
                                              onClick={() =>
                                                setFileUploadResponses((prevResponses) => ({
                                                  ...prevResponses,
                                                  invoice_file: null,
                                                }))
                                              }
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Invoice/Letter Date:</td>
                                      <td className="btn_value">
                                        <ReactDatePicker
                                          selected={formData.invoiceDate}
                                          onChange={(date) =>
                                            setFormData((prevData) => ({
                                              ...prevData,
                                              invoiceDate: date,
                                            }))
                                          }
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
                                      <th>Reference Invoice No</th>
                                      <th>Claim Amount</th>
                                      <th>Remarks</th>
                                      <th>File(Only Excel):</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Row 1 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          <input
                                            type="text"
                                            name="ref_invoice1_no"
                                            className="form-control"
                                            placeholder="Enter Invoice No 1"
                                            value={formData.ref_invoice1_no}
                                            onChange={handleChange}
                                          />
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          name="ref_invoice1_amount"
                                          className="form-control"
                                          placeholder="Enter Claim Amount 1"
                                          value={formData.ref_invoice1_amount}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          name="ref_invoice1_remarks"
                                          className="form-control"
                                          placeholder="Enter Remarks 1"
                                          value={formData.ref_invoice1_remarks}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <div className="btn_value">
                                          {!fileUploadResponses.ref_invoice1_file ? (
                                            <div className="d-flex align-items-center gap-2">
                                              <input type="file" name="ref_invoice1_file" className="form-control me-3" onChange={handleChange} />
                                              <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center">
                                              <a href={fileUploadResponses.ref_invoice1_file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm me-2">
                                                View Uploaded File
                                              </a>
                                              <button
                                                className="btn btn-sm fw-bold btn-danger"
                                                onClick={() =>
                                                  setFileUploadResponses((prevResponses) => ({
                                                    ...prevResponses,
                                                    ref_invoice1_file: null,
                                                  }))
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Repeat similar rows for Invoice 2, 3, and 4 */}
                                    {/* Row 2 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          <input
                                            type="text"
                                            name="ref_invoice2_no"
                                            className="form-control"
                                            placeholder="Enter Invoice No 2"
                                            value={formData.ref_invoice2_no}
                                            onChange={handleChange}
                                          />
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          name="ref_invoice2_amount"
                                          className="form-control"
                                          placeholder="Enter Claim Amount 2"
                                          value={formData.ref_invoice2_amount}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          name="ref_invoice2_remarks"
                                          className="form-control"
                                          placeholder="Enter Remarks 2"
                                          value={formData.ref_invoice2_remarks}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <div className="btn_value">
                                          {!fileUploadResponses.ref_invoice2_file ? (
                                            <div className="d-flex align-items-center gap-2">
                                              <input type="file" name="ref_invoice2_file" className="form-control me-3" onChange={handleChange} />
                                              <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center">
                                              <a href={fileUploadResponses.ref_invoice2_file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm me-2">
                                                View Uploaded File
                                              </a>
                                              <button
                                                className="btn btn-sm fw-bold btn-danger"
                                                onClick={() =>
                                                  setFileUploadResponses((prevResponses) => ({
                                                    ...prevResponses,
                                                    ref_invoice2_file: null,
                                                  }))
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Row 3 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          <input
                                            type="text"
                                            name="ref_invoice3_no"
                                            className="form-control"
                                            placeholder="Enter Invoice No 3"
                                            value={formData.ref_invoice3_no}
                                            onChange={handleChange}
                                          />
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          name="ref_invoice3_amount"
                                          className="form-control"
                                          placeholder="Enter Claim Amount 3"
                                          value={formData.ref_invoice3_amount}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          name="ref_invoice3_remarks"
                                          className="form-control"
                                          placeholder="Enter Remarks 3"
                                          value={formData.ref_invoice3_remarks}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <div className="btn_value">
                                          {!fileUploadResponses.ref_invoice3_file ? (
                                            <div className="d-flex align-items-center gap-2">
                                              <input type="file" name="ref_invoice3_file" className="form-control me-3" onChange={handleChange} />
                                              <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center">
                                              <a href={fileUploadResponses.ref_invoice3_file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm me-2">
                                                View Uploaded File
                                              </a>
                                              <button
                                                className="btn btn-sm fw-bold btn-danger"
                                                onClick={() =>
                                                  setFileUploadResponses((prevResponses) => ({
                                                    ...prevResponses,
                                                    ref_invoice3_file: null,
                                                  }))
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Row 4 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          <input
                                            type="text"
                                            name="ref_invoice4_no"
                                            className="form-control"
                                            placeholder="Enter Invoice No 4"
                                            value={formData.ref_invoice4_no}
                                            onChange={handleChange}
                                          />
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          name="ref_invoice4_amount"
                                          className="form-control"
                                          placeholder="Enter Claim Amount 4"
                                          value={formData.ref_invoice4_amount}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          name="ref_invoice4_remarks"
                                          className="form-control"
                                          placeholder="Enter Remarks 4"
                                          value={formData.ref_invoice4_remarks}
                                          onChange={handleChange}
                                        />
                                      </td>
                                      <td>
                                        <div className="btn_value">
                                          {!fileUploadResponses.ref_invoice4_file ? (
                                            <div className="d-flex align-items-center gap-2">
                                              <input type="file" name="ref_invoice4_file" className="form-control me-3" onChange={handleChange} />
                                              <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                            </div>
                                          ) : (
                                            <div className="d-flex align-items-center">
                                              <a href={fileUploadResponses.ref_invoice4_file.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm me-2">
                                                View Uploaded File
                                              </a>
                                              <button
                                                className="btn btn-sm fw-bold btn-danger"
                                                onClick={() =>
                                                  setFileUploadResponses((prevResponses) => ({
                                                    ...prevResponses,
                                                    ref_invoice4_file: null,
                                                  }))
                                                }
                                              >
                                                Remove
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Total Claim Amount */}
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
                                  <button type="button" className="btn fw-bold btn-primary me-3" onClick={() => handleSubmit()}>
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

export default LDRefundSupplyMaterial;
