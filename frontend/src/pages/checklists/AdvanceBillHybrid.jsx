import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  checkTypeArr,
  inputFileChange,
  inputTypeChange,
} from "../../utils/smallFun";
import { inputOnWheelPrevent } from "../../utils/inputOnWheelPrevent";
import { apiCallBack } from "../../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { actionHandlerAdvancebill } from "../../Helpers/BTNChecklist";
import { USER_VENDOR } from "../../constants/userConstants";
import DynamicButton from "../../Helpers/DynamicButton";
import { D_S_INVOICE, E_INVOICE } from "../../constants/BTNContants";
import { FaPlus } from "react-icons/fa";
import { initialDataAdvance } from "../../data/btnData";
import { formatDate } from "../../utils/getDateTimeNow";
import FileUploadInfoIcon, { BTN_UPLOAD_WARNING } from "../../Helpers/FileUploadInfoIcon";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
const AdvanceBillHybrid = () => {
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialDataAdvance);
  const [data, setData] = useState(null);

  //calclation
  const calNetClaimAmount = (invoice_value) => {
    invoice_value = parseFloat(invoice_value) || 0;

    const net_claim_amount = invoice_value;

    setForm((prevForm) => ({
      ...prevForm,
      net_claim_amount: net_claim_amount,
    }));
  };
  useEffect(() => {
    const { invoice_value } = form;
    if (invoice_value) {
      calNetClaimAmount(invoice_value);
    }
  }, [form?.invoice_value]);

  const getData = async () => {
    try {
      const d = await apiCallBack(
        "GET",
        `po/btn/abh?type=init&poNo=${id}`,
        null,
        token
      );
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

  // useEffect(() => {
  //   if (data) {
  //     const firstEntry = data[0];
  //     setForm({
  //       ...form,
  //       purchasing_doc_no: firstEntry.purchasing_doc_no,
  //       vendor_code: firstEntry.vendor_code,
  //       vendor_name: firstEntry.vendor_name,
  //       a_sdbg_date: firstEntry.a_sdbg_sub_date,
  //       c_sdbg_date: firstEntry.c_sdbg_sub_date,
  //       c_sdbg_filename: firstEntry.c_sdbg_filename,
  //       c_sdbg_file_path: firstEntry.c_sdbg_file_path,
  //     });
  //   }
  // }, [data]);

  // calculate gst function
  useEffect(() => {
    calculateNetClaimAmountWithGST();
  }, [form.invoice_value, form.cgst, form.sgst, form.igst]);

  const calculateNetClaimAmountWithGST = () => {
    const invoiceValue = parseFloat(form.invoice_value) || 0;
    const cgst = parseFloat(form.cgst) || 0;
    const sgst = parseFloat(form.sgst) || 0;
    const igst = parseFloat(form.igst) || 0;

    const totalGST = ((cgst + sgst + igst) / 100) * invoiceValue;
    const netClaimAmountWithGST = invoiceValue + totalGST;

    setForm((prevForm) => ({
      ...prevForm,
      net_with_gst: netClaimAmountWithGST.toFixed(2),
    }));
  };

  console.log("form", form);

  return (
    <>
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
                          <h3 className="m-3">Bills for Advance Payment:</h3>
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
                                          onChange={(e) =>
                                            inputTypeChange(e, form, setForm)
                                          }
                                        />
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Stage:</td>
                                      <td className="btn_value">
                                        <select
                                          name="stage"
                                          id=""
                                          className="form-select"
                                          onChange={(e) =>
                                            inputTypeChange(e, form, setForm)
                                          }
                                        >
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
                                      <td>Vendor</td>
                                      <td>
                                        <b>
                                          {`${data?.vendor_name} (${data?.vendor_code})`}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Vendor GSTIN No</td>
                                      <td>
                                        <b> {`${data?.vendor_gstno}`}</b>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Additional PO:</td>
                                      <td className="btn_value">
                                        {checkTypeArr(form?.associated_po) &&
                                          form.associated_po.map((item, i) => (
                                            <input
                                              type="text"
                                              className="form-control"
                                              name="associated_po"
                                              value={item?.a_po}
                                              onChange={(e) => {
                                                item.a_po = e.target.value;
                                                setForm({
                                                  ...form,
                                                  associated_po:
                                                    form.associated_po,
                                                });
                                              }}
                                              key={i}
                                            />
                                          ))}
                                        <button
                                          className="btn btn-sm btn-primary d-flex align-items-center ms-2"
                                          style={{ fontSize: "16px" }}
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
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Choose Invoice Type</td>
                                      <td className="btn_value">
                                        <select
                                          name="invoice_type"
                                          id=""
                                          className="form-select"
                                          onChange={(e) =>
                                            inputTypeChange(e, form, setForm)
                                          }
                                        >
                                          <option value="">
                                            Choose Invoice Type
                                          </option>
                                          <option value={D_S_INVOICE}>
                                            Digitally Signed Invoice
                                          </option>
                                          <option value={E_INVOICE}>
                                            EInvoice
                                          </option>
                                        </select>
                                      </td>
                                    </tr>
                                    {(form?.invoice_type === D_S_INVOICE ||
                                      form?.invoice_type === E_INVOICE) && (
                                      <tr>
                                        <td>
                                          {form?.invoice_type === D_S_INVOICE &&
                                            "Digitally Signed Invoice: "}{" "}
                                          {form?.invoice_type === E_INVOICE &&
                                            "E-Invoice No: "}
                                        </td>
                                        <td>
                                          <div className="btn_value">
                                            <div className="me-4 mb-2">
                                              <label htmlFor="">
                                                Invoice Number
                                              </label>
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
                                            </div>
                                          </div>
                                          <div className="btn_value">
                                            <div className="me-4">
                                              <label htmlFor="" className="d-flex align-items-center gap-2">
                                                Invoice File
                                                <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                              </label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_filename"
                                                onChange={(e) =>
                                                  inputFileChange(
                                                    e,
                                                    form,
                                                    setForm
                                                  )
                                                }
                                                accept=".pdf"
                                              />
                                            </div>
                                            <div>
                                              <label htmlFor="" className="d-flex align-items-center gap-2">
                                                Supporting Documents
                                                <FileUploadInfoIcon warningText={BTN_UPLOAD_WARNING} />
                                              </label>
                                              <input
                                                type="file"
                                                className="form-control"
                                                name="invoice_supporting_filename"
                                                onChange={(e) =>
                                                  inputFileChange(
                                                    e,
                                                    form,
                                                    setForm
                                                  )
                                                }
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
                                          onChange={(e) =>
                                            inputTypeChange(e, form, setForm)
                                          }
                                        />
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Invoice Date:</td>
                                      <td className="btn_value">
                                        <ReactDatePicker
                                          dateFormat="dd/MM/yyyy"
                                          selected={form?.invoice_date}
                                          onChange={(date) =>
                                            setForm({
                                              ...form,
                                              invoice_date: date,
                                            })
                                          }
                                          className="form-control"
                                          placeholderText="DD/MM/YYYY"
                                        />
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Net Claim Amount:</td>
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
                                    <tr>
                                      <td>Net claim amount with GST:</td>
                                      <td className="btn_value">
                                        <b>{form?.net_with_gst}</b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>
                                        Contractual Submission of Drawing:
                                      </td>
                                      <td className="btn_value">
                                        <b>
                                          {data?.c_drawing_date
                                            ? formatDate(data.c_drawing_date)
                                            : "NA"}
                                        </b>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Actual Submission of Drawing:</td>
                                      <td className="btn_value">
                                        <b>
                                          {data?.a_drawing_date
                                            ? formatDate(data.a_drawing_date)
                                            : "NA"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Submission of Advance BG / IB:</td>
                                      <td className="btn_value">
                                        <b>
                                          {data?.abgFileName && (
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}submitSDBG/${data?.abgFileName}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          )}
                                          &nbsp;&nbsp;
                                          {data?.ibFileName && (
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}submitSDBG/${data?.ibFileName}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          )}
                                          {!data?.abgFileName &&
                                            !data?.ibFileName &&
                                            "Not Uploaded"}
                                        </b>
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan="2">
                                        <div
                                          className="form-check"
                                          onClick={() =>
                                            setForm({
                                              ...form,
                                              hsn_gstn_icgrn:
                                                !form?.hsn_gstn_icgrn,
                                            })
                                          }
                                        >
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="hsn_gstn_icgrn"
                                            name="hsn_gstn_icgrn"
                                            checked={form?.hsn_gstn_icgrn}
                                            onChange={(e) =>
                                              e.stopPropagation()
                                            }
                                          />
                                          <label
                                            className="form-check-label"
                                            htmlFor="hsn_gstn_icgrn"
                                          >
                                            Whether HSN code, GSTIN, Tax rate is
                                            as per PO
                                          </label>
                                        </div>

                                        {/* <div className="form-check">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="hsn_gstn_tax"
                                            name="hsn_gstn_tax"
                                            value={form?.hsn_gstn_tax}
                                            onClick={(e) =>
                                              setForm({
                                                ...form,
                                                hsn_gstn_tax: e.target.checked,
                                              })
                                            }
                                          />
                                          <label
                                            className="form-check-label"
                                            htmlFor="hsn_gstn_icgrn"
                                            onClick={() =>
                                              setForm({
                                                ...form,
                                                hsn_gstn_tax:
                                                  !form?.hsn_gstn_tax,
                                              })
                                            }
                                          >
                                            Whether HSN code, GSTIN, Tax rate is
                                            as per PO
                                          </label>
                                        </div> */}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <div className="text-center">
                                {user?.user_type === USER_VENDOR && (
                                  <>
                                    <DynamicButton
                                      label="SUBMIT"
                                      onClick={() =>
                                        actionHandlerAdvancebill(
                                          "AdvanceBill",
                                          token,
                                          id,
                                          form,
                                          setForm,
                                          navigate
                                        )
                                      }
                                      className="btn fw-bold btn-primary me-3"
                                      type="submit"
                                    />
                                  </>
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

export default AdvanceBillHybrid;
