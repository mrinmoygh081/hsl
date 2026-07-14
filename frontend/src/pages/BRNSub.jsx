import React, { useEffect, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import DynamicButton from "../Helpers/DynamicButton";
import HrSearchableSelect from "../components/HrSearchableSelect";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const BRNSub = () => {
  const [isPopup, setIsPopup] = useState(false);
  const { id } = useParams();
  const { token, user } = useSelector((state) => state.auth);
  const [billOfficers, setBillOfficers] = useState([]);
  const [file, setFile] = useState(null);
  console.log(user, "user");
  useEffect(() => {
    (async () => {
      const data = await apiCallBack("GET", `bill/officers`, null, token);
      if (data?.status) {
        setBillOfficers(data?.data);
      }
    })();
  }, [token]);

  const [formData, setFormData] = useState({
    invoiceNumber: "",
    vendorBillDate: null,
    billSubmittedTo: "",
    remarks: "",
  });

  const billSubmittedToOptions = billOfficers.map((officer) => ({
    value: officer.email,
    label: officer.email,
  }));

  const selectedOfficer = billOfficers.find((officer) => officer.email === formData.billSubmittedTo);
  const handleDateChange = (date) => {
    setFormData((prevData) => ({
      ...prevData,
      vendorBillDate: date,
    }));
  };

  // Function to handle changes in form fields
  const handleChange = (e) => {
    const { name, value, type } = e.target;

    if (type === "file") {
      setFile(e.target.files[0]);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.vendorBillDate) {
        toast.error("Vendor Bill Date is required.");
        return;
      }

      const formDataObject = new FormData();
      formDataObject.append("file", file);

      // Add other form fields to the formDataObject
      Object.entries({
        purchasing_doc_no: id,
        invoice_no: formData.invoiceNumber,
        bill_submit_date: formData.vendorBillDate.toISOString().split("T")[0],
        bill_submit_time: new Date().toLocaleTimeString(),
        bill_submit_to_name: selectedOfficer?.name || "",
        bill_submit_to_email: formData.billSubmittedTo,
        remarks: formData.remarks,
        vendor_code: user.vendor_code,
        vendor_name: user.name,
        vendor_email: user.email,
        action_by_id: user.user_type,
        action_by_name: user.name,
      }).forEach(([key, value]) => {
        formDataObject.append(key, value);
      });

      const response = await apiCallBack("POST", "bill/registration", formDataObject, token);

      if (response?.status) {
        toast.success("Form submitted successfully!");

        // Reset form data
        setFormData({
          invoiceNumber: "",
          vendorBillDate: null,
          billSubmittedTo: "",
          remarks: "",
        });

        // Reset file
        setFile(null);
      } else {
        toast.error("Form submission failed:", response?.message);
      }
    } catch (error) {
      toast.error("Error submitting form:", error);
    }
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Bill Registration Number"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="border rounded p-3 mb-3">
                    <div className="row gx-5 mb-3">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Invoice Number <span className="star">*</span>
                        </label>
                        <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className="form-control" />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label d-flex align-items-center gap-2">
                          Upload File <span className="star">*</span>
                          <FileUploadInfoIcon />
                        </label>
                        <input type="file" name="uploadFile" onChange={handleChange} className="form-control" />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Vendor Bill Date <span className="star">*</span>
                        </label>
                        <DatePicker selected={formData.vendorBillDate} onChange={handleDateChange} className="form-control" />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Bill Submitted To<span className="star">*</span>
                        </label>
                        <HrSearchableSelect
                          options={billSubmittedToOptions}
                          value={formData.billSubmittedTo}
                          onChange={(selectedOption) => {
                            setFormData((prevData) => ({
                              ...prevData,
                              billSubmittedTo: selectedOption ? selectedOption.value : "",
                            }));
                          }}
                          placeholder="Select an email"
                          isClearable={false}
                        />
                        {selectedOfficer && <p className="mt-2">Selected Officer: {selectedOfficer.name}</p>}
                      </div>
                      <div className="col-md-8 mb-3">
                        <label className="form-label">Remarks</label>
                        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="4" className="form-control"></textarea>
                      </div>
                      <div className="col-12 mt-3">
                        <DynamicButton label="SUBMIT" className="btn btn-primary" onClick={handleSubmit} />
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

      {/* Popup (unused) */}
      <div className={isPopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">Upload Shipping documents</span>
            </h3>
            <button className="btn fw-bold btn-danger" onClick={() => setIsPopup(false)}>
              Close
            </button>
          </div>
          <form>
            <div className="row">
              <div className="col-12 mb-3">
                <label className="form-label">
                  Shipping File Type <span className="star">*</span>
                </label>
                <input type="text" className="form-control" />
              </div>
              <div className="col-12 mb-3">
                <label className="form-label d-flex align-items-center gap-2">
                  Shipping File <span className="star">*</span>
                  <FileUploadInfoIcon />
                </label>
                <input type="file" className="form-control" />
              </div>
              <div className="col-12 mb-3">
                <label className="form-label">Remarks</label>
                <textarea name="" id="" rows="4" className="form-control"></textarea>
              </div>
              <div className="col-12 mb-3">
                <button className="btn fw-bold btn-primary">UPDATE</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default BRNSub;
