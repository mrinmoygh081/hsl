import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { checkTypeArr } from "../../utils/smallFun";
import DynamicButton from "../../Helpers/DynamicButton";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatFilePath } from "../../utils/getDateTimeNow";
import { FaCaretLeft } from "react-icons/fa";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const ClaimAgainstPBGSubmission = () => {
  const [formData, setFormData] = useState({
    invoiceNo: "",
    balanceClaimInvoice: "",
    claimAmount: "",
    percentageOfClaim: "",
    invoiceFile: null,
    balanceClaimInvoiceFile: null,
  });
  const [invoiceDate, setInvoiceDate] = useState(null);
  const [data, setData] = useState(null);
  const [invoiceFilePath, setInvoiceFilePath] = useState(null);
  const { user, token } = useSelector((state) => state.auth);

  const { id } = useParams();
  const navigate = useNavigate();

  const getData = async () => {
    try {
      console.log("Fetching data for poNo:", id, "with token:", token);
      const response = await apiCallBack("GET", `po/btn/pbg?poNo=${id}&type=init`, null, token);
      console.log("API Response:", response);
      if (response?.statusCode === 200) {
        // Fixed condition
        setData(response.data);
        console.log("Data set successfully:", response.data);
      } else {
        console.log("API failed with statusCode:", response?.statusCode, "Response:", response);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (id && token) {
      getData();
    } else {
      console.log("Missing id or token:", { id, token });
    }
  }, [id, token]);

  const getGrnIcgrnByInvoice = async () => {
    try {
      const invoiceNo = formData.invoiceNo;
      if (!invoiceNo) {
        toast.warn("Please enter an Original Invoice Number to check.");
        return;
      }
      const response = await apiCallBack("GET", `po/btn/check-invoice?invoice_no=${invoiceNo}&poNo=${id}`, null, token);
      console.log("Check Invoice Response:", response);
      if (response?.statusCode === 200) {
        if (response?.status === false) {
          toast.warn(response?.message);
        } else {
          toast.success(response?.message);
        }

        setInvoiceFilePath(response.data.invoice_file_path);
      } else {
        setInvoiceFilePath(null);
        toast.warn(response?.message);
      }
    } catch (error) {
      console.error("ERROR GETTING INVOICE DATA:", error);
      toast.error("Failed to fetch invoice data.");
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: files ? files[0] : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!checkTypeArr(data?.pbgFiles) || data?.pbgFiles.length === 0) {
      toast.warning("Please submit the PBG before proceeding.");
      return;
    }

    if (!formData.invoiceNo) {
      toast.error("Original Invoice No is required.");
      return;
    }

    if (!formData.claimAmount) {
      toast.error("Claim Amount is required.");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("purchasing_doc_no", id);
      formDataToSend.append("original_invoice_no", formData.invoiceNo);
      formDataToSend.append("invoice_no", formData.balanceClaimInvoice || null);
      formDataToSend.append("original_invoice_filename", invoiceFilePath ? invoiceFilePath.split("\\").pop() : null);
      formDataToSend.append("original_invoice_file_path", invoiceFilePath || null);
      formDataToSend.append("net_claim_amount", formData.claimAmount);
      formDataToSend.append("pbg_files", checkTypeArr(data?.pbgFiles) ? JSON.stringify(data.pbgFiles) : JSON.stringify([]));
      formDataToSend.append("btn_num", "null");
      formDataToSend.append("invoice_filename", formData.balanceClaimInvoiceFile ? formData.balanceClaimInvoiceFile : null);
      formDataToSend.append("invoice_date", invoiceDate ? Math.floor(new Date(invoiceDate).getTime() / 1000) : "");

      const response = await apiCallBack("POST", "po/btn/pbg", formDataToSend, token);
      if (response?.statusCode === 200) {
        // Fixed condition
        toast.success(response?.message);
        navigate(`/invoice-and-payment-process/${id}`);
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    }
  };

  console.log("Current Data State:", data);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Claim Against PBG Submission"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <form onSubmit={handleSubmit}>
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
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Balance Claim Invoice :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="balanceClaimInvoice"
                                          placeholder="Balance Claim Invoice"
                                          value={formData.balanceClaimInvoice}
                                          onChange={handleChange}
                                        />
                                        <input type="file" className="form-control" name="balanceClaimInvoiceFile" accept=".pdf" onChange={handleChange} />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Balance Claim Invoice Date:</td>
                                      <td className="btn_value">
                                        <ReactDatePicker
                                          dateFormat="dd/MM/yyyy"
                                          selected={invoiceDate}
                                          onChange={(date) => setInvoiceDate(date)}
                                          className="form-control"
                                          placeholderText="DD/MM/YYYY"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Original Invoice No :</td>
                                      <td className="btn_value">
                                        <input
                                          type="text"
                                          className="form-control me-2"
                                          name="invoiceNo"
                                          placeholder="Original Invoice No"
                                          value={formData.invoiceNo}
                                          onChange={handleChange}
                                        />
                                        <DynamicButton label="CHECK" onClick={getGrnIcgrnByInvoice} className="btn btn-primary btn-sm m-4" />
                                        {invoiceFilePath ? (
                                          <a href={formatFilePath(invoiceFilePath)} target="_blank" rel="noreferrer" className="btn_value">
                                            View File
                                          </a>
                                        ) : (
                                          <span>No File</span>
                                        )}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Claim Amount :</td>
                                      <td className="btn_value">
                                        <input type="text" className="form-control me-2" name="claimAmount" value={formData.claimAmount} onChange={handleChange} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PBG</td>
                                      <td className="btn_value">
                                        {data && data.pbgFiles && Array.isArray(data.pbgFiles) && data.pbgFiles.length > 0
                                          ? data.pbgFiles.map((item, i) => (
                                              <a
                                                key={i}
                                                href={formatFilePath(item.file_path)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn_value"
                                                style={{ marginRight: "10px" }}
                                              >
                                                View File
                                              </a>
                                            ))
                                          : "PBG NOT SUBMITTED"}
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

                    <div className="text-center mt-4">
                      <button className="btn btn-primary me-3" type="submit" disabled={!formData.invoiceNo}>
                        Submit
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
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
    </>
  );
};

export default ClaimAgainstPBGSubmission;
