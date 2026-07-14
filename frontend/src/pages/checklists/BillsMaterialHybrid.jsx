import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCaretLeft, FaMinus } from "react-icons/fa";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useSelector } from "react-redux";
import { USER_VENDOR } from "../../constants/userConstants";
import { actionHandlerBTN, getGrnIcgrnByInvoice } from "../../Helpers/BTNChecklist";
import { FaPlus } from "react-icons/fa";
import { checkTypeArr, inputFileChange, inputTypeChange } from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { convertToEpoch, formatDate, formatFilePath } from "../../utils/getDateTimeNow";
import { toast } from "react-toastify";
import { initialData } from "../../data/btnData";
import DynamicButton from "../../Helpers/DynamicButton";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import MultiSearchableSelect from "../../components/MultiSearchableSelect";
import FileUploadWithProgress from "../../utils/FileUploadWithProgress";
import { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";

const BillsMaterialHybrid = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(() => structuredClone(initialData || {}));
  const [associated, setAssociated] = useState([]);

  const calNetClaimAmount = (invoice_value, debit_note, credit_note) => {
    invoice_value = parseFloat(invoice_value) || 0;
    debit_note = parseFloat(debit_note) || 0;
    credit_note = parseFloat(credit_note) || 0;

    const net_claim_amount = Number((invoice_value + debit_note - credit_note).toFixed(2));

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
      net_with_gst: netWithGST,
    }));
  };
  useEffect(() => {
    const { net_claim_amount, cgst, sgst, igst } = form;
    if (net_claim_amount || cgst || sgst || igst) {
      calNetClaimAmountwithGST(net_claim_amount, cgst, sgst, igst);
    }
  }, [form?.net_claim_amount, form?.cgst, form?.sgst, form?.igst]);

  const getData = async () => {
    // setLoading(true);
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setData(d?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    if (data) {
      setForm({
        ...form,
        c_sdbg_date: data?.c_sdbg_date || "",
        c_drawing_date: data?.c_drawing_date || "",
        c_qap_date: data?.c_qap_date || "",
        c_ilms_date: data?.c_ilms_date || "",
        a_sdbg_date: data?.a_sdbg_date || "",
        a_drawing_date: data?.a_drawing_date || "",
        a_qap_date: data?.a_qap_date || "",
        a_ilms_date: data?.a_ilms_date || "",
      });
    }
  }, [data]);

  const getGrnIcgrnHandler = async () => {
    try {
      let inv_no = form.invoice_no;
      let response = await getGrnIcgrnByInvoice(id, inv_no, token);

      if (response && response.status && response.data) {
        const { gate_entry_no, grn_nos, icgrn_nos, gate_entry_date, total_price, invoice_date, CAPEX_IND } = response.data;
        setForm({
          ...form,
          gate_entry_no,
          gate_entry_date: formatDate(gate_entry_date),
          grn_nos,
          icgrn_nos,
          total_price,
          invoice_date: formatDate(invoice_date),
          CAPEX_IND, // Added CAPEX_IND to form state
        });
        setData({
          ...data,
          invoice_date: formatDate(invoice_date),
          CAPEX_IND, // Added CAPEX_IND to data state
        });

        let options =
          checkTypeArr(response?.data?.associatePoList) &&
          response?.data?.associatePoList.map((item, index) => {
            return {
              value: item.purchasing_doc_no,
              label: item.purchasing_doc_no,
            };
          });

        setAssociated(options || []);
        toast.success(response.message);
      } else if (response && response.message) {
        toast.warn(response.message);
      } else {
        toast.warn("Unexpected response structure");
      }
    } catch (error) {
      console.error("Error fetching data", error);
      toast.error("Error fetching data");
    }
  };
  useEffect(() => {
    setForm({
      ...form,
      invoice_no: "",
      invoice_filename: "",
      invoice_value: "",
      gate_entry_no: "",
      gate_entry_date: "",
      get_entry_filename: "",
      total_icgrn_value: "",
      grn_nos: "",
      icgrn_nos: "",
    });
  }, [form?.invoice_type]);

  console.log("form", form);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Bills for Material PO"} id={id} />
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
                                      <td>Yard No:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="yard"
                                          value={form?.yard}
                                          onChange={(e) => inputTypeChange(e, form, setForm)}
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Stage:</td>
                                      <td className="btn_value">
                                        <select name="stage" id="" className="form-select" onChange={(e) => inputTypeChange(e, form, setForm)}>
                                          <option value="1"> 1 </option>
                                          <option value="2"> 2 </option>
                                          <option value="3"> 3 </option>
                                          <option value="4"> 4 </option>
                                          <option value="5"> 5 </option>
                                          <option value="6"> 6 </option>
                                          <option value="7"> 7 </option>
                                          <option value="8"> 8 </option>
                                          <option value="9"> 9 </option>
                                          <option value="10"> 10 </option>
                                          <option value="11"> 11 </option>
                                          <option value="12"> 12 </option>
                                          <option value="13"> 13 </option>
                                          <option value="14"> 14 </option>
                                          <option value="15"> 15 </option>
                                          <option value="16"> 16 </option>
                                          <option value="17"> 17 </option>
                                          <option value="18"> 18 </option>
                                          <option value="19"> 19 </option>
                                          <option value="20"> 20 </option>
                                          <option value="21"> 21 </option>
                                          <option value="22"> 22 </option>
                                          <option value="23"> 23 </option>
                                          <option value="24"> 24 </option>
                                          <option value="25"> 25 </option>
                                          <option value="26"> 26 </option>
                                          <option value="27"> 27 </option>
                                          <option value="28"> 28 </option>
                                          <option value="29"> 29 </option>
                                          <option value="30"> 30 </option>
                                        </select>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Choose Invoice Type</td>
                                      <td className="btn_value">
                                        <select name="invoice_type" id="" className="form-select" onChange={(e) => inputTypeChange(e, form, setForm)}>
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
                                            <input
                                              type="text"
                                              className="form-control me-3"
                                              name="invoice_no"
                                              value={form?.invoice_no}
                                              placeholder="invoice number"
                                              onChange={(e) =>
                                                setForm({
                                                  ...form,
                                                  invoice_no: e.target.value,
                                                })
                                              }
                                            />
                                            <DynamicButton label="CHECK" onClick={getGrnIcgrnHandler} className="btn btn-primary btn-sm m-4" />
                                          </div>
                                          <div className="btn_value">
                                            <div className="me-4">
                                              <label htmlFor="">Invoice File</label>
                                              <FileUploadWithProgress
                                                warningText={BTN_UPLOAD_WARNING}
                                                token={token}
                                                vendorCode={id}
                                                uploadedFile={form?.invoice_filename || null}
                                                 onUploadSuccess={(response) => {
                                                   const fileData = {
                                                     file_id: response?.id || response?.data?.id || response?.file_id || "",
                                                     fileName: response?.fileName || response?.data?.fileName || "",
                                                     filePath: response?.filePath || response?.data?.filePath || "",
                                                     file_name: response?.file_name || response?.data?.originalName || "",
                                                     file_path: response?.file_path || response?.data?.filePath || "",
                                                   };
                                                   setForm((prev) => ({ ...prev, invoice_filename: fileData }));
                                                 }}
                                                 onDelete={() => setForm((prev) => ({ ...prev, invoice_filename: null }))}
                                              />
                                            </div>
                                            <div>
                                              <label htmlFor="">Supporting Documents</label>
                                              <FileUploadWithProgress
                                                warningText={BTN_UPLOAD_WARNING}
                                                token={token}
                                                vendorCode={id}
                                                uploadedFile={form?.invoice_supporting_doc || null}
                                                onUploadSuccess={(response) => {
                                                  const fileData = {
                                                    file_id: response?.id || response?.data?.id || response?.file_id || "",
                                                    fileName: response?.fileName || response?.data?.fileName || "",
                                                    filePath: response?.filePath || response?.data?.filePath || "",
                                                    file_name: response?.file_name || response?.data?.originalName || "",
                                                    file_path: response?.file_path || response?.data?.filePath || "",
                                                  };
                                                  setForm((prev) => ({ ...prev, invoice_supporting_doc: fileData }));
                                                }}
                                                onDelete={() => setForm((prev) => ({ ...prev, invoice_supporting_doc: null }))}
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
                                            <input
                                              type="text"
                                              className="form-control me-2"
                                              name="invoice_no"
                                              placeholder="E-Invoice number"
                                              value={form?.invoice_no}
                                              onChange={(e) => inputTypeChange(e, form, setForm)}
                                            />
                                            <DynamicButton label="CHECK" onClick={getGrnIcgrnHandler} className="btn btn-primary btn-sm m-4" />
                                          </div>
                                          <div className="btn_value">
                                            {/* <div className="me-4">
                                              <label htmlFor="">Invoice File</label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_filename"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
                                            </div>
                                            <div>
                                              <label htmlFor="">Supporting Documents</label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_supporting_doc"
                                                onChange={(e) => inputFileChange(e, form, setForm)}
                                                accept=".pdf"
                                              />
                                            </div> */}

                                            <div className="me-4">
                                              <label htmlFor="">Invoice File</label>
                                              <FileUploadWithProgress
                                                warningText={BTN_UPLOAD_WARNING}
                                                token={token}
                                                vendorCode={id}
                                                uploadedFile={form?.invoice_filename || null}
                                                onUploadSuccess={(file) => setForm({ ...form, invoice_filename: file })}
                                                onDelete={() => setForm({ ...form, invoice_filename: null })}
                                              />
                                            </div>
                                            <div>
                                              <label htmlFor="">Supporting Documents</label>
                                              <FileUploadWithProgress
                                                warningText={BTN_UPLOAD_WARNING}
                                                token={token}
                                                vendorCode={id}
                                                uploadedFile={form?.invoice_supporting_doc || null}
                                                onUploadSuccess={(file) => setForm({ ...form, invoice_supporting_doc: file })}
                                                onDelete={() => setForm({ ...form, invoice_supporting_doc: null })}
                                              />
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    <tr>
                                      <td>Invoice Date:</td>
                                      <td className="btn_value">
                                        {data?.invoice_date && data?.invoice_date !== "--" ? (
                                          data?.invoice_date
                                        ) : (
                                          <DatePicker
                                            selected={form?.invoice_date && form?.invoice_date !== "--" ? new Date(form.invoice_date * 1000) : null}
                                            onChange={(date) => {
                                              setForm({
                                                ...form,
                                                invoice_date: convertToEpoch(date),
                                              });
                                            }}
                                            dateFormat="dd/MM/yyyy"
                                            className="form-control"
                                            placeholderText="Select invoice date"
                                            maxDate={new Date()}
                                          />
                                        )}
                                      </td>
                                    </tr>

                                    {checkTypeArr(associated) && (
                                      <tr>
                                        <td>Additional PO:</td>
                                        <td>
                                          {/* <Select
                                            className="basic-multi-select"
                                            classNamePrefix="select"
                                            isClearable={true}
                                            isSearchable={true}
                                            isMulti
                                            name="associated_po"
                                            id="associated_po"
                                            options={associated}
                                            value={associated?.filter((item) => form?.associated_po?.includes(item.value))}
                                            onChange={(selectedOptions) =>
                                              setForm({
                                                ...form,
                                                associated_po: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
                                              })
                                            }
                                          /> */}
                                          <MultiSearchableSelect
                                            options={associated}
                                            value={form?.associated_po?.map((val) => ({ value: val, label: val })) || []}
                                            onChange={(selectedOptions) =>
                                              setForm({
                                                ...form,
                                                associated_po: selectedOptions ? selectedOptions.map((opt) => opt.value) : [],
                                              })
                                            }
                                            placeholder="Select Additional PO(s)"
                                          />

                                          {/* <div className="d-flex align-items-start flex-column">
                                          {checkTypeArr(form?.associated_po) &&
                                            form.associated_po.map((item, i) => (
                                              <div key={i} className="d-flex align-items-center gap-1 mb-1">
                                                <input
                                                  type="text"
                                                  className="form-control"
                                                  name="associated_po"
                                                  value={item?.a_po}
                                                  onChange={(e) => {
                                                    const newValue = e.target.value;
                                                    if (newValue === id) {
                                                      toast.error("This PO value matches the existing PO and cannot be added!");
                                                      return;
                                                    }
                                                    const isDuplicate = form.associated_po.some((po, index) => po.a_po === newValue && index !== i);

                                                    if (isDuplicate) {
                                                      toast.error("Duplicate PO entry is not allowed!");
                                                      return;
                                                    }
                                                    const updatedPOs = [...form.associated_po];
                                                    updatedPOs[i].a_po = newValue;

                                                    setForm({
                                                      ...form,
                                                      associated_po: updatedPOs,
                                                    });
                                                  }}
                                                />
                                                {i > 0 && (
                                                  <button
                                                    className="btn btn-sm btn-danger d-flex align-items-center ms-2"
                                                    style={{
                                                      fontSize: "16px",
                                                    }}
                                                    type="button"
                                                    onClick={() => {
                                                      const updatedPOs = form.associated_po.filter((_, index) => index !== i);
                                                      setForm({
                                                        ...form,
                                                        associated_po: updatedPOs,
                                                      });
                                                    }}
                                                  >
                                                    <FaMinus />
                                                  </button>
                                                )}
                                                {form.associated_po.length - 1 === i && (
                                                  <button
                                                    className="btn btn-sm btn-primary d-flex align-items-center"
                                                    style={{
                                                      fontSize: "16px",
                                                    }}
                                                    type="button"
                                                    onClick={() =>
                                                      setForm({
                                                        ...form,
                                                        associated_po: [
                                                          ...form?.associated_po,
                                                          {
                                                            a_po: "",
                                                          },
                                                        ],
                                                      })
                                                    }
                                                  >
                                                    <FaPlus />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                        </div> */}
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
                                        <FileUploadWithProgress
                                          warningText={BTN_UPLOAD_WARNING}
                                          token={token}
                                          vendorCode={id}
                                          uploadedFile={form?.debit_credit_filename || null}
                                          onUploadSuccess={(response) => {
                                            const fileData = {
                                              file_id: response?.id || response?.data?.id || response?.file_id || "",
                                              fileName: response?.fileName || response?.data?.fileName || "",
                                              filePath: response?.filePath || response?.data?.filePath || "",
                                              file_name: response?.file_name || response?.data?.originalName || "",
                                              file_path: response?.file_path || response?.data?.filePath || "",
                                            };
                                            setForm((prev) => ({ ...prev, debit_credit_filename: fileData }));
                                          }}
                                          onDelete={() => setForm((prev) => ({ ...prev, debit_credit_filename: null }))}
                                        />
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
                                          onChange={(e) => {
                                            inputTypeChange(e, form, setForm);
                                          }}
                                        />
                                      </td>
                                    </tr>

                                    {/* <tr>
                                      <td>CGST:</td>
                                      <td className="btn_value">
                                        <input
                                          type="number"
                                          className="form-control"
                                          onWheel={inputOnWheelPrevent}
                                          name="cgst"
                                          value={form?.cgst}
                                          onChange={(e) => {
                                            inputTypeChange(e, form, setForm);
                                          }}
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
                                          onChange={(e) => {
                                            inputTypeChange(e, form, setForm);
                                          }}
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
                                          onChange={(e) => {
                                            inputTypeChange(e, form, setForm);
                                          }}
                                        />
                                        <span className="ms-1">%</span>
                                      </td>
                                    </tr> */}
                                    {!form?.CAPEX_IND && (
                                      <>
                                        <tr>
                                          <td>Net Basic amount:</td>
                                          <td className="btn_value">
                                            <b>{form?.net_claim_amount}</b>
                                            {console.log(form?.net_claim_amount, "form?.net_claim_amount")}
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
                                              onChange={(e) => {
                                                inputTypeChange(e, form, setForm);
                                              }}
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
                                              onChange={(e) => {
                                                inputTypeChange(e, form, setForm);
                                              }}
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
                                              onChange={(e) => {
                                                inputTypeChange(e, form, setForm);
                                              }}
                                            />
                                            <span className="ms-1">%</span>
                                          </td>
                                        </tr>
                                      </>
                                    )}
                                    <tr>
                                      <td>Net claim amount with GST:</td>
                                      <td className="btn_value">
                                        <b>{form?.net_with_gst}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">
                                          {form?.c_sdbg_date && formatDate(form?.c_sdbg_date)}
                                          {!form?.c_sdbg_date ? "NA" : form?.c_sdbg_date && !form?.a_sdbg_date ? "(NOT SUBMITTED)" : ""}
                                        </b>
                                        {checkTypeArr(data?.sdbg_filename)
                                          ? data?.sdbg_filename.map((item, i) => {
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
                                          : ""}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual SDBG Submission Date</td>
                                      <td className="btn_value">
                                        <b className="me-3">{form?.a_sdbg_date ? formatDate(form?.a_sdbg_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Demand Draft</td>
                                      <td>
                                        <b>
                                          {checkTypeArr(data?.dd_filename)
                                            ? data?.dd_filename.map((item, i) => {
                                                return (
                                                  <a
                                                    href={`${process.env.REACT_APP_PDF_URL}submitSDBG/${item?.file_name}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    key={i}
                                                    style={{
                                                      marginRight: "10px",
                                                    }}
                                                  >
                                                    VIEW
                                                  </a>
                                                );
                                              })
                                            : "NA"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Indeminity Bond</td>
                                      <td>
                                        <b>
                                          {checkTypeArr(data?.ib_filename)
                                            ? data?.ib_filename.map((item, i) => {
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
                                            : "NA"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Demand raised by production/PP&C if any</td>
                                      <td className="btn_value">
                                        <FileUploadWithProgress
                                          warningText={BTN_UPLOAD_WARNING}
                                          token={token}
                                          vendorCode={id}
                                          uploadedFile={form?.demand_raise_filename || null}
                                          onUploadSuccess={(response) => {
                                            const fileData = {
                                              file_id: response?.id || response?.data?.id || response?.file_id || "",
                                              fileName: response?.fileName || response?.data?.fileName || "",
                                              filePath: response?.filePath || response?.data?.filePath || "",
                                              file_name: response?.file_name || response?.data?.originalName || "",
                                              file_path: response?.file_path || response?.data?.filePath || "",
                                            };
                                            setForm((prev) => ({ ...prev, demand_raise_filename: fileData }));
                                          }}
                                          onDelete={() => setForm((prev) => ({ ...prev, demand_raise_filename: null }))}
                                        />
                                      </td>
                                    </tr>
                                    {/* <tr>
                                      <td>Gate Entry Acknowledgement no.</td>
                                      <td className="btn_value">
                                        {loading
                                          ? "Loading..."
                                          : form.gate_entry_no
                                          ? form.gate_entry_no
                                          : "NA"}
                                      </td>
                                    </tr> */}
                                    <tr>
                                      <td>Gate Entry Acknowledgement no.</td>
                                      <td className="btn_value">
                                        <b>{form.gate_entry_no && form.gate_entry_no}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Gate Entry Date</td>
                                      <td className="btn_value">
                                        <b>{form.gate_entry_date && form.gate_entry_date}</b>
                                      </td>
                                    </tr>
                                    {/* <tr>
                                      <td>GRN No </td>
                                      <td className="btn_value">
                                        <p>
                                          {checkTypeArr(form?.grn_nos) &&
                                            form?.grn_nos.map((item, i) => (
                                              <b key={i} className="mx-2">
                                                {item?.grn_no
                                                  ? item.grn_no
                                                  : "NA"}
                                              </b>
                                            ))}
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>ICGRN no </td>
                                      <td className="btn_value">
                                        <p>
                                          {checkTypeArr(form?.icgrn_nos) &&
                                            form?.icgrn_nos?.map((item, i) => (
                                              <b key={i} className="mx-2">
                                                {item?.grn_no
                                                  ? item.grn_no
                                                  : "NA"}
                                              </b>
                                            ))}
                                        </p>
                                      </td>
                                    </tr> */}
                                    <tr>
                                      <td>GRN No </td>
                                      <td className="btn_value">
                                        <p>
                                          {checkTypeArr(form?.grn_nos) &&
                                            [...new Set(form?.grn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                                              <b key={i} className="mx-2">
                                                {uniqueGrn}
                                              </b>
                                            ))}
                                        </p>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>ICGRN no </td>
                                      <td className="btn_value">
                                        <p>
                                          {checkTypeArr(form?.icgrn_nos) &&
                                            [...new Set(form?.icgrn_nos.map((item) => item?.grn_no || "NA"))].map((uniqueGrn, i) => (
                                              <b key={i} className="mx-2">
                                                {uniqueGrn}
                                              </b>
                                            ))}
                                        </p>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Total Value (GRN and ICGRN)</td>
                                      <td className="btn_value">
                                        <b>{form.total_price ? form.total_price : "NA"}</b>
                                        {console.log(form.total_price, "form.total_price")}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual Drawing submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.c_drawing_date ? formatDate(form.c_drawing_date) : "NA"}</b>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Actual Drawing submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.a_drawing_date ? formatDate(form.a_drawing_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual QAP submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.c_qap_date ? formatDate(form.c_qap_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual QAP submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.a_qap_date ? formatDate(form.a_qap_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Contractual ILMS submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.c_ilms_date ? formatDate(form.c_ilms_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Actual ILMS submission date</td>
                                      <td className="btn_value">
                                        <b>{form?.a_ilms_date ? formatDate(form.a_ilms_date) : "NA"}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>PBG</td>
                                      <td className="btn_value">
                                        {checkTypeArr(data?.pbg_filename)
                                          ? data?.pbg_filename.map((item, i) => {
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
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="agree_to_declaration"
                                            name="agree_to_declaration"
                                            value={form?.agree_to_declaration}
                                            required
                                            onClick={(e) =>
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
                                    <tr>
                                      <td colSpan="2">
                                        <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="hsn_gstn_icgrn"
                                            name="hsn_gstn_icgrn"
                                            required
                                            value={form?.hsn_gstn_icgrn}
                                            onClick={(e) =>
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
                                  </tbody>
                                </table>
                              </div>
                              <div className="text-center">
                                {user?.user_type === USER_VENDOR && (
                                  <DynamicButton
                                    label="SUBMIT"
                                    onClick={() => actionHandlerBTN("BillsMaterialHybrid", token, id, form, setForm, initialData, navigate)}
                                    className="btn fw-bold btn-primary me-3"
                                  />
                                )}
                                <button className="btn btn-sm btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
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

export default BillsMaterialHybrid;
