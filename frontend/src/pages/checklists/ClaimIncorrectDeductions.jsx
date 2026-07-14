import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft } from "react-icons/fa";
import ReactDatePicker from "react-datepicker";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { toast } from "react-toastify";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const ClaimIncorrectDeductions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  console.log(user, "useruser");
  const [gstData, setGstData] = useState();
  console.log(gstData, "gstData");

  const [formData, setFormData] = useState({
    ref_invoice1_no: "",
    ref_invoice1_amount: "",
    ref_invoice1_remarks: "",
    ref_invoice1_file: null,
    ref_invoice2_no: "",
    ref_invoice2_amount: "",
    ref_invoice2_remarks: "",
    ref_invoice2_file: null,
    ref_invoice3_no: "",
    ref_invoice3_amount: "",
    ref_invoice3_remarks: "",
    ref_invoice3_file: null,
    ref_invoice4_no: "",
    ref_invoice4_amount: "",
    ref_invoice4_remarks: "",
    ref_invoice4_file: null,
    claimType: "",
    invoiceReferenceNo: "",
    invoiceDate: null,
  });

  const getData = async () => {
    try {
      const response = await apiCallBack(
        "GET",
        `getFilteredData?$tableName=lfa1&$select=ort02&$filter={"lifnr":"${user?.vendor_code}"}`,
        null,
        token
      );
      if (response?.status) {
        setGstData(response?.data[0]);

        // setInvoiceData(JSON.parse(response?.data[0]?.icgrn_nos));
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

  const handleSubmit = async () => {
    // Validation: At least one Reference Invoice No must be filled
    const refInvoices = [
      {
        no: formData.ref_invoice1_no,
        amount: formData.ref_invoice1_amount,
        file: formData.ref_invoice1_file,
        remarks: formData.ref_invoice1_remarks,
      },
      {
        no: formData.ref_invoice2_no,
        amount: formData.ref_invoice2_amount,
        file: formData.ref_invoice2_file,
        remarks: formData.ref_invoice2_remarks,
      },
      {
        no: formData.ref_invoice3_no,
        amount: formData.ref_invoice3_amount,
        file: formData.ref_invoice3_file,
        remarks: formData.ref_invoice3_remarks,
      },
      {
        no: formData.ref_invoice4_no,
        amount: formData.ref_invoice4_amount,
        file: formData.ref_invoice4_file,
        remarks: formData.ref_invoice4_remarks,
      },
    ];

    // Check if at least one Reference Invoice No is filled
    const isAnyInvoiceFilled = refInvoices.some((invoice) => invoice.no);

    if (!isAnyInvoiceFilled) {
      toast.error("At least one Reference Invoice No is required.");
      return;
    }

    // Check for mandatory fields when a Reference Invoice No is provided
    for (let i = 0; i < refInvoices.length; i++) {
      const invoice = refInvoices[i];
      if (
        invoice.no &&
        (!invoice.amount || !invoice.file || !invoice.remarks)
      ) {
        toast.error(
          `Claim Amount, Invoice File, and Remarks are mandatory for Reference Invoice No ${
            i + 1
          }.`
        );
        return;
      }
    }

    // Create a new FormData object
    const fDToSend = new FormData();

    // Append all form fields to FormData
    fDToSend.append("purchasing_doc_no", id);
    fDToSend.append("ref_invoice1_no", formData.ref_invoice1_no);
    fDToSend.append("ref_invoice1_amount", formData.ref_invoice1_amount);
    fDToSend.append("ref_invoice1_file", formData.ref_invoice1_file);
    fDToSend.append("ref_invoice1_remarks", formData.ref_invoice1_remarks);

    fDToSend.append("ref_invoice2_no", formData.ref_invoice2_no);
    fDToSend.append("ref_invoice2_amount", formData.ref_invoice2_amount);
    fDToSend.append("ref_invoice2_file", formData.ref_invoice2_file);
    fDToSend.append("ref_invoice2_remarks", formData.ref_invoice2_remarks);

    fDToSend.append("ref_invoice3_no", formData.ref_invoice3_no);
    fDToSend.append("ref_invoice3_amount", formData.ref_invoice3_amount);
    fDToSend.append("ref_invoice3_file", formData.ref_invoice3_file);
    fDToSend.append("ref_invoice3_remarks", formData.ref_invoice3_remarks);

    fDToSend.append("ref_invoice4_no", formData.ref_invoice4_no);
    fDToSend.append("ref_invoice4_amount", formData.ref_invoice4_amount);
    fDToSend.append("ref_invoice4_file", formData.ref_invoice4_file);
    fDToSend.append("ref_invoice4_remarks", formData.ref_invoice4_remarks);

    fDToSend.append("letter_reference_no", formData.invoiceReferenceNo);
    fDToSend.append(
      "letter_date",
      formData.invoiceDate
        ? Math.floor(new Date(formData.invoiceDate).getTime() / 1000)
        : ""
    );

    fDToSend.append("total_claim_amount", totalClaimAmount);
    fDToSend.append("btn_type", formData.claimType);

    try {
      // Send form-data to API
      const response = await apiCallBack(
        "POST",
        "po/btn/submitIncorrectDuct",
        fDToSend,
        token
      );

      // Handle successful response
      toast.success("Success:", response.data);
      navigate(`/invoice-and-payment-process/${id}`);
    } catch (error) {
      // Handle error
      console.error("Error submitting form:", error);
    }
  };

  // Calculate total claim amount
  const totalClaimAmount =
    Number(formData.ref_invoice1_amount || 0) +
    Number(formData.ref_invoice2_amount || 0) +
    Number(formData.ref_invoice3_amount || 0) +
    Number(formData.ref_invoice4_amount || 0);

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
                            <button
                              className="btn_icon me-3"
                              type="button"
                              onClick={() =>
                                navigate(`/invoice-and-payment-process/${id}`)
                              }
                            >
                              <FaCaretLeft className="fs-20" />
                            </button>{" "}
                            Checklist for Any Other Claims:
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
                                          <option value="">
                                            Choose Your Claim Type
                                          </option>
                                          <option value="bill-incorrect-deductions">
                                            Checklist for Incorrect Deductions
                                          </option>
                                          <option value="ld-penalty-refund">
                                            Checklist for LD-Penalty Refund
                                          </option>
                                          <option value="other-retentions">
                                            Other Retentions
                                          </option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Name :</td>
                                      <td className="btn_value">
                                        {user?.name}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code :</td>
                                      <td className="btn_value">
                                        {user?.vendor_code}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>GSTIN (Registration no) :</td>
                                      <td className="btn_value">
                                        {gstData?.ort02
                                          ? gstData.ort02
                                          : "No GSTIN number"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Invoice/Letter Reference No. :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          name="invoiceReferenceNo"
                                          className="form-control"
                                          placeholder="Enter Reference No"
                                          value={formData.invoiceReferenceNo}
                                          onChange={handleChange}
                                        />
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
                                      <th>Invoice File</th>
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
                                        <input
                                          type="file"
                                          name="ref_invoice1_file"
                                          className="form-control"
                                          onChange={handleChange}
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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
                                        <input
                                          type="file"
                                          name="ref_invoice2_file"
                                          className="form-control"
                                          onChange={handleChange}
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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
                                        <input
                                          type="file"
                                          name="ref_invoice3_file"
                                          className="form-control"
                                          onChange={handleChange}
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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
                                        <input
                                          type="file"
                                          name="ref_invoice4_file"
                                          className="form-control"
                                          onChange={handleChange}
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
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
                                  <button
                                    type="button"
                                    className="btn fw-bold btn-primary me-3"
                                    onClick={() => handleSubmit()}
                                  >
                                    SUBMIT
                                  </button>
                                )}
                                <button
                                  className="btn fw-bold btn-primary me-3"
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/invoice-and-payment-process/${id}`
                                    )
                                  }
                                >
                                  BACK
                                </button>
                              </div>

                              {/* <div className="text-center">
                                <button
                                  className="btn btn-sm btn-primary me-3"
                                  type="button"
                                  onClick={() =>
                                    navigate(`/bill-other-claims/${id}`)
                                  }
                                >
                                  BACK
                                </button>
                                <button
                                  className="btn btn-sm btn-success"
                                  type="submit"
                                  onClick={() => handleSubmit()}
                                >
                                  SUBMIT
                                </button>
                              </div> */}
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

export default ClaimIncorrectDeductions;
