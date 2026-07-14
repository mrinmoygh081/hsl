import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiCallBack } from "../../utils/fetchAPIs";
import SideBar from "../../components/SideBar";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { FaCaretLeft } from "react-icons/fa";
import { formatDate } from "../../utils/getDateTimeNow";

const ClaimIncorrectDeductionsview = () => {
  const [data, setData] = useState(null);
  const [InvoiceData, setInvoiceData] = useState(null);
  const { state } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  const [gstData, setGstData] = useState();

  const getData = async () => {
    try {
      const response = await apiCallBack(
        "GET",
        `getFilteredData?$tableName=btn_any_other_claim&$filter={"btn_num":"${state}"}`,
        null,
        token
      );
      if (response?.status) {
        setData(response?.data[0]);

        setInvoiceData(JSON.parse(response?.data[0]?.icgrn_nos));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const getGstData = async () => {
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
    getGstData();
  }, []);
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
                                        {data?.btn_type}
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
                                        {data?.letter_reference_no}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td>Invoice/Letter Date:</td>
                                      <td className="btn_value">
                                        {formatDate(data?.letter_date * 1000)}
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
                                          {data?.ref_invoice1_no}
                                        </div>
                                      </td>
                                      <td>{data?.ref_invoice1_amount}</td>
                                      <td>{data?.ref_invoice1_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice1_file && (
                                          <div style={{ marginTop: "8px" }}>
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}btns/${data?.ref_invoice1_file}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          </div>
                                        )}
                                      </td>
                                    </tr>

                                    {/* Repeat similar rows for Invoice 2, 3, and 4 */}
                                    {/* Row 2 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          {data?.ref_invoice2_no}
                                        </div>
                                      </td>
                                      <td>{data?.ref_invoice2_amount}</td>
                                      <td>{data?.ref_invoice2_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice2_file && (
                                          <div style={{ marginTop: "8px" }}>
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}btns/${data?.ref_invoice2_file}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Row 3 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          {data?.ref_invoice3_no}
                                        </div>
                                      </td>
                                      <td>{data?.ref_invoice3_amount}</td>
                                      <td>{data?.ref_invoice3_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice3_file && (
                                          <div style={{ marginTop: "8px" }}>
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}btns/${data?.ref_invoice3_file}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                    {/* Row 4 */}
                                    <tr>
                                      <td>
                                        <div className="btn_value">
                                          {data?.ref_invoice4_no}
                                        </div>
                                      </td>
                                      <td>{data?.ref_invoice4_amount}</td>
                                      <td>{data?.ref_invoice4_remarks}</td>
                                      <td>
                                        {" "}
                                        {data?.ref_invoice4_file && (
                                          <div style={{ marginTop: "8px" }}>
                                            <a
                                              href={`${process.env.REACT_APP_PDF_URL}btns/${data?.ref_invoice4_file}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              VIEW
                                            </a>
                                          </div>
                                        )}
                                      </td>
                                    </tr>

                                    {/* Total Claim Amount */}
                                    <tr>
                                      <td colSpan={3} className="text-end">
                                        <strong>Total Claim Amount:</strong>
                                      </td>
                                      <td>
                                        {<b>{data?.total_claim_amount}</b>}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              {/* <div className="text-center">
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
                                  </div> */}

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

export default ClaimIncorrectDeductionsview;
