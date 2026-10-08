import React, { useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import logoone from "../images/image001.jpg";
import "../App1.css";

const WDCattach = () => {
  const { id } = useParams();

  // State to manage form data
  const [formData, setFormData] = useState({
    wdcRefNo: "", // Set default values if needed
    workTitle: "",
    poRefNo: "",
    workDoneBy: "",
    jobLocation: "",
    scheduleStartDate: "",
    actualStartDate: "",
    delay: "",
    inspectionNoteRef: "",
    date: "",
    scheduleCompletion: "",
    actualCompletionDate: "",
  });

  // Function to handle changes in form inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const formDataFirstSection = [
    { label: "WDC Ref. No.:", name: "wdcRefNo", column: "col-8" },
    { label: "Work Title:", name: "workTitle", column: "col-4" },
    { label: "P.O. Ref. No. & Dated:", name: "poRefNo", column: "col-12" },
    { label: "Work Done By:", name: "workDoneBy", column: "col-12" },
    {
      label: "Job Location / Yard No.:",
      name: "jobLocation",
      column: "col-12",
    },
    {
      label: "Schedule Date of Starting:",
      name: "scheduleStartDate",
      column: "col-6",
    },
    {
      label: "Schedule Completion:",
      name: "scheduleCompletion",
      column: "col-6",
    },
    {
      label: "Actual Date of Starting:",
      name: "actualStartDate",
      column: "col-6",
    },
    {
      label: "Actual Date of Completion",
      name: "scheduleComDate",
      column: "col-6",
    },
    {
      label: "Total delay in job Completion (if applicable):",
      name: "delay",
      column: "col-12",
    },
    {
      label: "Inspection Note Ref. No. (if applicable):",
      name: "inspectionNoteRef",
      column: "col-12",
    },
  ];

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"WDC Attach"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  {/* Header Box */}
                  <div className="header-box">
                    {/* Box Container */}
                    <div className="box-container">
                      {/* Logo Container (Left Side) */}
                      <div className="logo-container">
                        <img src={logoone} alt="Company Logo" className="logo" />
                      </div>
                      {/* Company Info (Right Side) */}
                      <div className="company-info">
                        <h2>Garden Reach Shipbuilders & Engineers Limited</h2>
                        <p>(A GOVT OF INDIA UNDERTAKING)</p>
                        <p>43/46 Garden Reach Road, Kolkata – 700024</p>
                        <p>Phone. 2469 8100~8113/EXTN | Fax. 2469 2020/8150</p>
                      </div>
                    </div>
                  </div>
                  <div className="form-box work_done">
                    <h3>WORK DONE CERTIFICATE</h3>
                    <form>
                      <div className="container">
                        <div className="row">
                          {formDataFirstSection.map((item, index) => (
                            <div className={`${item?.column}`}>
                              <div className="form-part" key={index}>
                                <label>{item.label}</label>
                                <input type="text" className="form-control" name={item.name} value={formData[item.name]} onChange={handleInputChange} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Add other key-value pairs as needed */}
                    </form>
                  </div>

                  <div className="row">
                    <div className="col-12">
                      <div className="table_content">
                        <table style={{ width: "100%" }}>
                          <tr>
                            <th>Sl. No</th>
                            <th>
                              <u>Item Description</u>
                            </th>
                            <th>
                              <u>Unit</u>
                            </th>
                            <th>
                              <u>Measurement</u>
                            </th>
                            <th>
                              <u>Quantity</u>
                            </th>
                          </tr>
                          <tr style={{ height: "200px" }}>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={4} style={{ textAlign: "center" }}>
                              <b> Total Quantity</b>
                            </td>
                          </tr>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="row">
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

export default WDCattach;
