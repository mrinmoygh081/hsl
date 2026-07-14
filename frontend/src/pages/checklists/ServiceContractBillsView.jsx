import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { checkTypeArr } from "../../utils/smallFun";
import { apiCallBack } from "../../utils/fetchAPIs";
import { FaCaretLeft } from "react-icons/fa";
import BTNServiceVendor from "../../components/BTNServiceVendor";
import { initialDataService } from "../../data/btnData";

const ServiceContractBillsView = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const { state } = useLocation();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [form, setForm] = useState(initialDataService);

  console.log("data: ", data);
  console.log("form: ", form);
  console.log("invoiceData: ", invoiceData);

  const getData = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/initServiceHybrid?poNo=${id}`, null, token);
      if (d?.status) {
        setData((prevData) => ({
          ...prevData,
          initial: d?.data,
        }));
      }
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  // const getForm = async (btn) => {
  //   try {
  //     const d = await apiCallBack("GET", `po/btn/getServiceBtnData?type=sbtn-details&btn_num=${btn}`);
  //     if (d?.status) {
  //       setForm(d?.data);
  //       // Check if wdc_details is available in the form response
  //       if (d?.data?.wdc_details) {
  //         setData((prevData) => ({
  //           ...prevData,
  //           wdcDetails: d.data.wdc_details,
  //         }));
  //       } else {
  //         // Fallback to API call if wdc_details is not in form response
  //         checkWDCDetails(d?.data?.wdc_number);
  //       }
  //     }
  //   } catch (error) {
  //     console.error("Error fetching form data:", error);
  //   }
  // };

  // const checkWDCDetails = async (wdc_number) => {
  //   if (!wdc_number) return;

  //   try {
  //     const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid?reference_no=${wdc_number}`, null, token);
  //     if (d?.status) {
  //       setData((prevData) => ({
  //         ...prevData,
  //         wdcDetails: d?.data,
  //       }));
  //     }
  //   } catch (error) {
  //     console.error("Error fetching WDC details:", error);
  //   }
  // };

  const getForm = async (btn) => {
    try {
      const d = await apiCallBack("GET", `po/btn/getServiceBtnData?type=sbtn-details&btn_num=${btn}`);
      if (d?.status) {
        setForm(d?.data);

        if (d?.data?.wdc_details) {
          setData((prevData) => ({ ...prevData, wdcDetails: d.data.wdc_details }));
        }

        checkWDCDetails(d?.data);
      }
    } catch (error) {
      console.error("Error fetching form data:", error);
    }
  };

  const checkWDCDetails = async (formData) => {
    if (!formData?.wdc_number) return;

    try {
      const wdcNumberArr = Array.isArray(formData.wdc_number)
        ? formData.wdc_number
        : formData.wdc_number
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      // units string parse karo → [{ value: "MAIN", label: "MAIN" }]
      let parsedUnits = [];
      if (Array.isArray(formData.units)) {
        parsedUnits = formData.units;
      } else if (typeof formData.units === "string" && formData.units) {
        try {
          const cleaned = JSON.parse(formData.units); // pehli layer
          const arr = Array.isArray(cleaned) ? cleaned : JSON.parse(cleaned); // doosri layer
          parsedUnits = arr.map((u) => ({ value: u, label: u }));
        } catch {
          parsedUnits = [];
        }
      }

      const payload = {
        outside: formData.outside === true || formData.outside === "true",
        units: parsedUnits,
        wdc_number_no: wdcNumberArr,
      };

      const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid`, payload, token);
      if (d?.status) {
        setData((prevData) => ({
          ...prevData,
          wdcDetails: {
            ...prevData?.wdcDetails,
            ...d?.data,
          },
        }));
      }
    } catch (error) {
      console.error("Error fetching WDC details:", error);
    }
  };

  // const checkWDCDetails = async (formData) => {
  //   if (!formData?.wdc_number) return;

  //   try {
  //     // wdc_number string ho sakta hai comma-separated, array banana padega
  //     const wdcNumberArr = Array.isArray(formData.wdc_number)
  //       ? formData.wdc_number
  //       : formData.wdc_number
  //           .split(",")
  //           .map((s) => s.trim())
  //           .filter(Boolean);

  //     const payload = {
  //       outside: formData.outside === true || formData.outside === "true",
  //       units: Array.isArray(formData.units) ? formData.units : [],
  //       wdc_number_no: wdcNumberArr,
  //     };

  //     const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid`, payload, token);
  //     if (d?.status) {
  //       setData((prevData) => ({
  //         ...prevData,
  //         wdcDetails: d?.data,
  //       }));
  //     }
  //   } catch (error) {
  //     console.error("Error fetching WDC details:", error);
  //   }
  // };

  const checkInvoiceDate = async () => {
    try {
      const response = await apiCallBack("GET", `po/hr/compliance/check?invoice_date=${form?.invoice_date}&purchasing_doc_no=${id}`, null, token);

      if (response?.status && response?.data) {
        setInvoiceData(response.data);
      } else {
        setInvoiceData(null);
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
    }
  };

  useEffect(() => {
    if (form?.invoice_date && id) {
      checkInvoiceDate();
    }
  }, [form?.invoice_date, id, token]);

  useEffect(() => {
    if (state) {
      getForm(state);
    }
  }, [state]);

  // Get initial data when component mounts
  useEffect(() => {
    if (id) {
      getData();
    }
  }, [id]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Service Contract Bills"} id={id} />
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
                            <span className="header-title">
                              References - PO No: <strong>{id}</strong>
                            </span>
                            <span className="header-space"></span>
                            <span className="header-subtitle ms-4">
                              BTN NO: <strong>{state}</strong>
                            </span>
                          </h3>
                          <BTNServiceVendor data={data} form={form} invoiceData={invoiceData} />
                        </div>
                      </div>

                      {form?.btn_num && form?.net_payable_amount && (
                        <div className="col-12">
                          <div className="card">
                            <h3 className="m-3">ENTRY BY CERTIFYING AUTHORITY:</h3>
                            <div className="card-body p-3">
                              <div className="tab-content">
                                <div className="table-responsive">
                                  <table className="table table-striped table-bordered table_height">
                                    <tbody style={{ maxHeight: "100%" }}>
                                      <tr>
                                        <td>Finance Authority</td>
                                        <td className="btn_value">
                                          <b>{form?.assign_to || "N/A"}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>BTN Number:</td>
                                        <td className="btn_value">
                                          <b>{form?.btn_num || "N/A"}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>{form?.entry_type || "Entry Type"}</td>
                                        <td>
                                          <div className="btn_value">
                                            <b>{form?.entry_number || "N/A"}</b>
                                          </div>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Total Amount</td>
                                        <td>
                                          <b>₹{data?.wdcDetails?.total_amount ? parseFloat(data.wdcDetails.total_amount).toFixed(3) : "0.000"}</b>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>

                                  {/* Line Items Table */}
                                  {checkTypeArr(data?.wdcDetails?.line_item_array) ? (
                                    <table className="table table-striped table-bordered table_height">
                                      <thead>
                                        <tr>
                                          <th>LI</th>
                                          <th>Sub-LI</th>
                                          <th>Service Code</th>
                                          <th>Description</th>
                                          <th>UOM</th>
                                          <th>Claim Qty</th>
                                          <th>Claim Amount</th>
                                          <th>Delay</th>
                                          <th>LD</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {data.wdcDetails.line_item_array.map((item, i) => (
                                          <tr key={i}>
                                            <td>{item?.lineitem || "N/A"}</td>
                                            <td>{item?.sublineitem || "N/A"}</td>
                                            <td>{item?.service_code || "N/A"}</td>
                                            <td>{item?.description || "N/A"}</td>
                                            <td>{item?.unit || "N/A"}</td>
                                            <td>{item?.claim_qty || "0"}</td>
                                            <td>₹{parseFloat(item?.claim_amount || 0).toFixed(3)}</td>
                                            <td>{item?.delay || "0"}</td>
                                            <td>{item?.lineLD || "0"}</td>
                                          </tr>
                                        ))}
                                        <tr>
                                          <td colSpan={6}>Total:</td>
                                          <td colSpan={3}>
                                            <b>₹{parseFloat(data?.wdcDetails?.total_amount || 0).toFixed(3)}</b>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="alert alert-info">No line items available</div>
                                  )}

                                  <table className="table table-striped table-bordered table_height">
                                    <tbody>
                                      <tr>
                                        <td>Max LD</td>
                                        <td>
                                          <b>{form?.max_ld || "0"}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Estimated Total LD</td>
                                        <td>{form?.estimated_ld || "0"}</td>
                                      </tr>
                                      <tr>
                                        <td>Retension if any (%)</td>
                                        <td className="btn_value">
                                          <b>{form?.retension_rate || "0"}</b>
                                          <span className="ms-1">%</span>
                                          <span className="ms-2">Retension Amount: {form?.retension_amount || "0"}</span>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Remarks for Retension</td>
                                        <td>
                                          <b>{form?.retension_remarks || "N/A"}</b>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Other Deduction</td>
                                        <td className="btn_value">
                                          <b>{form?.other_deduction || "0"}</b>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Deduction Remarks</td>
                                        <td>
                                          <b>{form?.deduction_remarks || "N/A"}</b>
                                        </td>
                                      </tr>

                                      <tr>
                                        <td>Total deductions</td>
                                        <td>
                                          <b>&#8377; {form?.total_deduction || "0"}</b>
                                        </td>
                                      </tr>
                                      <tr>
                                        <td>Net payable amount</td>
                                        <td>
                                          <b>&#8377; {form?.net_payable_amount || "0"}</b>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                                <p>Certified that Invoice has been verified w.r.t PO and recommanded for release of payment subject to satutatory deduction.</p>
                                <div className="row">
                                  <div className="col-6 text-start">
                                    <button className="btn btn-sm btn-primary me-3" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                                      BACK
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
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

export default ServiceContractBillsView;
