import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { actionHandlerServiceBTN } from "../../Helpers/BTNChecklist";
import { checkTypeArr, inputFileChange, inputTypeChange } from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { convertToEpoch, formatDate } from "../../utils/getDateTimeNow";
import { FaCaretLeft } from "react-icons/fa";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import { initialDataService } from "../../data/btnData";
import DynamicButton from "../../Helpers/DynamicButton";
import { toast } from "react-toastify";
import ReactDatePicker from "react-datepicker";
import HrSearchableSelect from "../../components/HrSearchableSelect";
import MultiSearchableSelect from "../../components/MultiSearchableSelect";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const ServiceContractBills = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const [data, setData] = useState({
    wdcDetails: null,
    initial: null,
  });
  const [emp, setEmp] = useState([]);
  // Ensure wdc_number and units are arrays
  const [form, setForm] = useState(() => ({
    ...initialDataService,
    wdc_number: Array.isArray(initialDataService.wdc_number) ? initialDataService.wdc_number : [],
    units: Array.isArray(initialDataService.units) ? initialDataService.units : [],
  }));
  const [wdcNo, setWdcNo] = useState([]);
  const [isUnitsChecked, setIsUnitsChecked] = useState(false);

  const calNetClaimAmount = (invoice_value, debit_note, credit_note) => {
    invoice_value = Number(invoice_value) || 0;
    debit_note = Number(debit_note) || 0;
    credit_note = Number(credit_note) || 0;

    const net_claim_amount = invoice_value + debit_note - credit_note;

    setForm((prevForm) => ({
      ...prevForm,
      net_claim_amount: net_claim_amount,
    }));
  };

  useEffect(() => {
    const { invoice_value, debit_note, credit_note } = form;
    if (invoice_value || debit_note || credit_note) {
      calNetClaimAmount(invoice_value, debit_note, credit_note);
    }
  }, [form?.invoice_value, form?.debit_note, form?.credit_note]);

  const calNetClaimAmountwithGST = (net_claim_amount, cgst, sgst, igst) => {
    cgst = parseFloat(cgst) || 0;
    sgst = parseFloat(sgst) || 0;
    igst = parseFloat(igst) || 0;

    const totalGST = (cgst + sgst + igst) / 100;
    let netWithGST = net_claim_amount * (1 + totalGST);
    netWithGST = parseFloat(netWithGST.toFixed(2));
    setForm((prevForm) => ({
      ...prevForm,
      net_claim_amt_gst: netWithGST,
    }));
  };

  useEffect(() => {
    const { net_claim_amount, cgst, sgst, igst } = form;
    if (net_claim_amount || cgst || sgst || igst) {
      calNetClaimAmountwithGST(net_claim_amount, cgst, sgst, igst);
    }
  }, [form?.net_claim_amount, form?.cgst, form?.sgst, form?.igst]);

  useEffect(() => {
    if (data?.wdcDetails?.total_amount) {
      setForm({ ...form, total_price: Number(data?.wdcDetails?.total_amount) });
    }
  }, [data?.wdcDetails?.line_item_array]);

  const getWDCList = async () => {
    const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid?type=list&purchasing_doc_no=${id}`, null, null);
    if (d?.status) {
      let options = d?.data.map((item) => ({
        value: item.reference_no,
        label: item.reference_no,
      }));
      setWdcNo(options);
    } else {
      toast.info("WDC Not Found!");
    }
  };

  const getData = async () => {
    const d = await apiCallBack("GET", `po/btn/initServiceHybrid?poNo=${id}`, null, token);
    if (d?.status) {
      setData({ ...data, initial: d?.data });
    }
  };

  const getEmp = async () => {
    try {
      const data = await apiCallBack("GET", `po/wdc/grseEmpList`, null, token);
      if (data?.status) {
        let options = data.data.map((item) => ({
          value: item.code,
          label: `${item.name} (${item.code})`,
        }));
        setEmp(options);
      }
    } catch (error) {
      console.error("Error fetching Employee list:", error);
    }
  };

  useEffect(() => {
    getData();
    getWDCList();
    getEmp();
  }, []);

  const checkWDCDetails = async () => {
    if (!form.wdc_number || form.wdc_number.length === 0) {
      return toast.info("Select at least one WDC Number");
    }
    if (!form?.outside && form?.units.length === 0) {
      return toast.info("Please select the units or choose OUTSIDE GRSE.");
    }
    let fd = {
      outside: form?.outside,
      units: form?.units,
      wdc_number_no: form.wdc_number,
    };
    const d = await apiCallBack("POST", `po/btn/getWdcInfoServiceHybrid`, fd, token);
    if (d?.status) {
      setData({ ...data, wdcDetails: d?.data });
      setIsUnitsChecked(true);
    } else {
      setData({ ...data, wdcDetails: null });
      toast.info(d.message);
    }
  };

  const resetUnits = () => {
    setIsUnitsChecked(false);
    setForm({
      ...form,
      wdc_number: [],
      units: [],
      outside: false,
    });
    setData({ ...data, wdcDetails: null });
    window.location.reload();
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Bills for Service PO"} id={id} />
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
                            References - PO No: {id}
                          </h3>
                          <div className="card-body p-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>Vendor Name</td>
                                      <td className="btn_value">
                                        <b>{data?.initial?.vendor_name}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor Code</td>
                                      <td className="btn_value">
                                        <b>{data?.initial?.vendor_code}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>GSTIN (Registration no)</td>
                                      <td className="btn_value">
                                        <b>{data?.initial?.vendor_gstno}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>WDC/JCC no:</td>
                                      <td className="btn_value">
                                        <MultiSearchableSelect
                                          options={wdcNo}
                                          value={Array.isArray(form?.wdc_number) ? form.wdc_number.map((val) => ({ value: val, label: val })) : []}
                                          onChange={(val) =>
                                            setForm({
                                              ...form,
                                              wdc_number: val ? val.map((item) => item.value) : [],
                                            })
                                          }
                                          placeholder="Select WDC number(s)"
                                          isDisabled={isUnitsChecked}
                                        />
                                        <div className="ms-4 d-flex align-items-center">
                                          <input
                                            type="checkbox"
                                            className="form-check-input me-2"
                                            checked={form.outside}
                                            id="outside"
                                            onChange={(e) =>
                                              setForm({
                                                ...form,
                                                outside: e.target.checked,
                                                units: e.target.checked ? [] : form.units,
                                              })
                                            }
                                          />
                                          <label className="form-check-label me-2 mb-0" htmlFor="outside">
                                            OUTSIDE GRSE
                                          </label>
                                          {!form.outside && (
                                            <div className="d-flex align-items-center">
                                              <MultiSearchableSelect
                                                options={[
                                                  { value: "MAIN", label: "MAIN" },
                                                  { value: "FOJ", label: "FOJ" },
                                                  { value: "RBD", label: "RBD" },
                                                  { value: "61PARK", label: "61PARK" },
                                                  { value: "TU", label: "TU" },
                                                  { value: "DEP", label: "DEP" },
                                                ]}
                                                value={form.units}
                                                onChange={(options) =>
                                                  setForm({
                                                    ...form,
                                                    units: options || [],
                                                  })
                                                }
                                                placeholder="Select Units..."
                                                isDisabled={isUnitsChecked}
                                              />
                                              {isUnitsChecked && <DynamicButton label="RESET" onClick={resetUnits} className="btn btn-danger btn-sm ms-2" />}
                                            </div>
                                          )}
                                        </div>
                                        <DynamicButton label="CHECK" onClick={checkWDCDetails} className="btn btn-primary btn-sm ms-2" disabled={isUnitsChecked} />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Yard No:</td>
                                      <td className="btn_value">
                                        <b>{data?.wdcDetails?.yard_no}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Stage:</td>
                                      <td className="btn_value">
                                        <b>{data?.wdcDetails?.stage_details}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Work Title:</td>
                                      <td className="btn_value">
                                        <b>{data?.wdcDetails?.work_title}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>WDC Certifying Authority:</td>
                                      <td className="btn_value">
                                        <b>
                                          {data?.wdcDetails?.assigned_to_name} ({data?.wdcDetails?.assigned_to})
                                        </b>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
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
                                    {checkTypeArr(data?.wdcDetails?.line_item_array) &&
                                      data?.wdcDetails?.line_item_array.map((item, i) => (
                                        <tr key={i}>
                                          <td>{item?.lineitem}</td>
                                          <td>{item?.sublineitem || "--"}</td>
                                          <td>{item?.description}</td>
                                          <td>{item?.unit}</td>
                                          <td>{item?.claim_qty}</td>
                                          <td>{parseFloat(item?.claim_amount).toFixed(3)}</td>
                                          <td>{item?.delay || "0"}</td>
                                        </tr>
                                      ))}
                                    <tr>
                                      <td colSpan={5}>Total:</td>
                                      <td colSpan={2}>
                                        <b>{parseFloat(data?.wdcDetails?.total_amount).toFixed(3)}</b>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table className="table table-striped table-bordered table_height" style={{ marginBottom: "120px" }}>
                                  <tbody>
                                    <tr>
                                      <td>Choose Invoice Type</td>
                                      <td className="btn_value">
                                        <select name="invoice_type" className="form-select" onChange={(e) => inputTypeChange(e, form, setForm)}>
                                          <option value="">Choose Invoice Type</option>
                                          <option value={D_S_INVOICE}>Digitally signed Invoice</option>
                                          <option value={E_INVOICE}>E-Invoice</option>
                                        </select>
                                      </td>
                                    </tr>
                                    {form?.invoice_type === D_S_INVOICE && (
                                      <tr>
                                        <td>Digitally Signed Invoice:</td>
                                        <td>
                                          <div className="btn_value">
                                            <div className="me-4">
                                              <label>Invoice Number</label>
                                              <input
                                                type="text"
                                                className="form-control me-3"
                                                name="invoice_no"
                                                value={form?.invoice_no}
                                                placeholder="invoice number"
                                                onChange={(e) => inputTypeChange(e, form, setForm)}
                                              />
                                            </div>
                                            <div>
                                              <label>Invoice Date</label>
                                              <ReactDatePicker
                                                selected={form.invoice_date ? new Date(form.invoice_date) : null}
                                                onChange={(date) => {
                                                  setForm((prev) => ({
                                                    ...prev,
                                                    invoice_date: convertToEpoch(date) * 1000,
                                                  }));
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                className="form-control"
                                              />
                                            </div>
                                          </div>
                                          <div className="btn_value">
                                            <div className="me-4">
                                              <label className="d-flex align-items-center gap-2">Invoice File<FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} /></label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_filename"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
                                            </div>
                                            <div>
                                              <label className="d-flex align-items-center gap-2">Supporting Documents<FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} /></label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="suppoting_invoice_filename"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
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
                                            <div className="me-4">
                                              <label>Invoice Number</label>
                                              <input
                                                type="text"
                                                className="form-control me-3"
                                                name="invoice_no"
                                                value={form?.invoice_no}
                                                placeholder="invoice number"
                                                onChange={(e) => inputTypeChange(e, form, setForm)}
                                              />
                                            </div>
                                            <div>
                                              <label>Invoice Date</label>
                                              <ReactDatePicker
                                                selected={form.invoice_date ? new Date(form.invoice_date) : null}
                                                onChange={(date) => {
                                                  setForm((prev) => ({
                                                    ...prev,
                                                    invoice_date: convertToEpoch(date) * 1000,
                                                  }));
                                                }}
                                                dateFormat="dd/MM/yyyy"
                                                className="form-control"
                                              />
                                            </div>
                                          </div>
                                          <div className="btn_value">
                                            <div className="me-4">
                                              <label className="d-flex align-items-center gap-2">Invoice File<FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} /></label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_filename"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
                                            </div>
                                            <div>
                                              <label className="d-flex align-items-center gap-2">Supporting Documents<FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} /></label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="suppoting_invoice_filename"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                    <tr>
                                      <td>Basic value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="invoice_value"
                                          value={form?.invoice_value}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Debit/Credit Note:</td>
                                      <td className="btn_value">
                                        <div className="d-flex align-items-center gap-2">
                                        <input
                                          type="file"
                                          className="form-control"
                                          name="debit_credit_filename"
                                          onChange={(e) => inputFileChange(e, form, setForm)}
                                          accept=".pdf"
                                        />
                                        <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Debit Note value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="debit_note"
                                          value={form?.debit_note}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Credit Note value:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="credit_note"
                                          value={form?.credit_note}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Net Claim Amount: </td>
                                      <td className="btn_value">
                                        <b>{form?.net_claim_amount}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>CGST:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="cgst"
                                          value={form?.cgst}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                        <span className="ms-1">%</span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>SGST:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="sgst"
                                          value={form?.sgst}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                        <span className="ms-1">%</span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>IGST:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="igst"
                                          value={form?.igst}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                        <span className="ms-1">%</span>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Net Claim Amount with GST:</td>
                                      <td className="btn_value">
                                        <b>{form?.net_claim_amt_gst}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">{data?.initial?.c_sdbg_date && formatDate(data?.initial?.c_sdbg_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">{data?.initial?.a_sdbg_date && formatDate(data?.initial?.a_sdbg_date)}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Hinderance register certified by berth/user</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.file_hinderence_report_cerified_by_berth ? (
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}wdc/${data?.wdcDetails?.file_hinderence_report_cerified_by_berth}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          ) : (
                                            "NOT SUBMITTED"
                                          )}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>ESI Compliance Certified By HR</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.esi_compliance === "Y" ? "ESI COMPLIANT" : data?.wdcDetails?.esi_compliance === "NA" ? "NA" : "NOT COMPLIANT"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PF Compliance Certified By HR</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.pf_compliance === "Y" ? "PF COMPLIANT" : data?.wdcDetails?.pf_compliance === "NA" ? "NA" : "NOT COMPLIANT"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Wage Compliance Certified By HR</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.wages_compliance === "Y" ? "WAGES COMPLIANT" : data?.wdcDetails?.wages_compliance === "NA" ? "NA" : "NOT COMPLIANT"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Leave Salary Certified By HR</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.leave_salary_compliance === "Y"
                                            ? "LEAVE SALARY COMPLIANT"
                                            : data?.wdcDetails?.leave_salary_compliance === "NA"
                                              ? "NA"
                                              : "NOT COMPLIANT"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Bonus Compliance certified by HR</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {data?.wdcDetails?.bonus_compliance === "Y" ? "BONUS COMPLIANT" : data?.wdcDetails?.bonus_compliance === "NA" ? "NA" : "NOT COMPLIANT"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PBG if any</td>
                                      <td className="btn_value">
                                        {checkTypeArr(data?.initial?.pbg_filename)
                                          ? data?.initial?.pbg_filename.map((item, i) => (
                                              <a key={i} href={`${process.env.REACT_APP_PDF_URL}submitSDBG/${item?.file_name}`} target="_blank" rel="noreferrer">
                                                VIEW
                                              </a>
                                            ))
                                          : "PBG NOT SUBMITTED"}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Bill Certifying Authority</td>
                                      <td className="btn_value">
                                        <HrSearchableSelect
                                          options={emp}
                                          value={form?.bill_certifing_authority}
                                          onChange={(val) =>
                                            setForm({
                                              ...form,
                                              bill_certifing_authority: val ? val.value : null,
                                            })
                                          }
                                          placeholder="Select Bill Certifying Authority"
                                          isClearable={true}
                                          className="w-100"
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan="2">
                                        <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="hsn_gstn_icgrn"
                                            name="hsn_gstn_icgrn"
                                            checked={form?.hsn_gstn_icgrn || false}
                                            onChange={(e) =>
                                              setForm({
                                                ...form,
                                                hsn_gstn_icgrn: e.target.checked,
                                              })
                                            }
                                          />
                                          <label className="form-check-label" htmlFor="hsn_gstn_icgrn">
                                            Whether HSN code, GSTIN, Tax rate is as per PO
                                          </label>
                                        </div>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan="2">
                                        <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="agree_to_declaration"
                                            name="agree_to_declaration"
                                            checked={form?.agree_to_declaration || false}
                                            required
                                            onChange={(e) =>
                                              setForm({
                                                ...form,
                                                agree_to_declaration: e.target.checked,
                                              })
                                            }
                                          />
                                          <label className="form-check-label" htmlFor="agree_to_declaration">
                                            I hereby declare that all the entries are correct.
                                          </label>
                                        </div>
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
                                    onClick={() => actionHandlerServiceBTN("ServiceBills", token, user, id, form, setForm, data, navigate)}
                                  >
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

export default ServiceContractBills;
