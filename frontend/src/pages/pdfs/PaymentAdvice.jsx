import React, { useEffect, useState } from "react";
import logo from "../../images/image001.jpg";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";

function PaymentAdvice() {
  const location = useLocation();
  const [apiData, setApiData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useSelector((state) => state.auth);
  const searchParams = new URLSearchParams(location.search);

  const poNumber = searchParams.get("po");

  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
  };
  const { payload } = useParams();
  const payloadData = JSON.parse(payload);
  console.log("payloadData", payloadData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const path = `${process.env.REACT_APP_BACKEND_API}sap/payment/ztfi_bil_deface_report`;
        const config = {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payloadData),
        };
        setIsLoading(true);
        const response = await fetch(path, config);
        const data = await response.json();
        setApiData(data.data[0] || {});
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  console.log("apiData-->>", apiData);

  return (
    <div className="container-fluid">
      <section className="Table-1" style={{ minHeight: "970px" }}>
        <div className="row table_heading_container m-0 p-0 pt-2 mb-2 ">
          <div className="col-2">
            <img src={logo} alt="" className="table_logo" />
          </div>
          <div className="col-10">
            <h3 className="m-0 text-center" style={{ width: "90%" }}>
              Hindustan Shipyard Limited
            </h3>
            <p className="m-0 text-center" style={{ fontSize: "18px", width: "90%" }}>
              (A govt. of india undertaking)
            </p>

            <h4 className="text-center mt-3" style={{ width: "90%" }}>
              Payment Advice
            </h4>
          </div>
        </div>
        {isLoading ? (
          <h4 className="text-center">Loading...</h4>
        ) : (
          <>
            <div className="row mt-4">
              <div className="col-6">
                <p>
                  M/S <br />
                  HYDRODYNE TEIKOKU (INDIA) PVT.LTD. <br />
                  SURVEY NO. 18, H. NO.3,4&5 OF VILLAGE <br />
                  GHODBUNDAR, <br />
                  MIRA BHYANDAR ROAD , MIRA ROAD EAST <br />
                  401107 THANE
                </p>
              </div>
              <div className="col-6 d-flex justify-content-end top_info_table">
                <table className="h-75 w-100" style={{ fontSize: "14px" }}>
                  <tbody>
                    <tr>
                      <td width={"30%"} className="fw-bold">
                        Pymt Doc. No.
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td width={"30%"}>4900757635</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Payment Method</td>
                      <td className="text-start">:</td>
                      <td>NEFT Payment</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Payment Date</td>
                      <td className="text-start">:</td>
                      <td>07.03.2024</td>
                    </tr>
                    <tr>
                      <td className="fw-bold">Bank Name</td>
                      <td>:</td>
                      <td>AXIS BANK #KOLKATA</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="row">
              <div className="col-12">
                <table className="w-100 payment_advice_table" style={{ fontSize: "15px" }}>
                  <thead>
                    <tr>
                      <th>Your Bill Ref.</th>
                      <th className="text-center">Our Doc Ref.</th>
                      <th>Gross Amount</th>
                      <th>Retention</th>
                      <th>TDS</th>
                      <th>Net Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td width={"15%"} className="p-1">
                        230/DOM/23/24,DT:21.09.2023,LD@5%
                      </td>
                      <td className="text-center p-1">1700006657</td>
                      <td className="p-1">196,600.00-</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">196,600.00</td>
                    </tr>
                    <tr>
                      <td width={"15%"} className="p-1">
                        230/DOM/23/24,DT:21.09.2023,LD@5%
                      </td>
                      <td className="text-center p-1">1700006657</td>
                      <td className="p-1">196,600.00-</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">196,600.00</td>
                    </tr>
                    <tr>
                      <td width={"15%"} className="p-1">
                        230/DOM/23/24,DT:21.09.2023,LD@5%
                      </td>
                      <td className="text-center p-1">1700006657</td>
                      <td className="p-1">196,600.00-</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">196,600.00</td>
                    </tr>
                    <tr>
                      <td width={"15%"} className="p-1">
                        230/DOM/23/24,DT:21.09.2023,LD@5%
                      </td>
                      <td className="text-center p-1">1700006657</td>
                      <td className="p-1">196,600.00-</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">0.00</td>
                      <td className="p-1">196,600.00</td>
                    </tr>

                    {/* Total Calculation Row  */}
                    <tr
                      style={{
                        borderTop: "1px solid black",
                        borderStyle: "dotted",
                      }}
                    >
                      <td className="pt-2"></td>
                      <td className="fw-bold pt-2 text-center">Total : </td>
                      <td className="pt-2">322,545.40</td>
                      <td className="pt-2">120,000.00</td>
                      <td className="pt-2">16,800.00</td>
                      <td className="pt-2">186,344.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <h5 className="m-0 mt-4">This is system generated and doesnot require signature.</h5>
      </section>
      <section className="Table-2">
        <div className="row table_heading_container m-0 p-0 pt-2 mb-2 ">
          <div className="col-2">
            <img src={logo} alt="" className="table_logo" />
          </div>
          <div className="col-10">
            <h3 className="m-0 text-center" style={{ width: "90%" }}>
              Hindustan Shipyard Limited
            </h3>
            <p className="m-0 text-center" style={{ fontSize: "18px", width: "90%" }}>
              (A govt. of india undertaking)
            </p>
            <p className="m-0 text-center" style={{ fontSize: "18px", width: "90%" }}>
              Regd Office : 43/46, (Garden Reach Road / Kolkata)
            </p>
            <h5 className="text-center pe-5 mt-2">CIN: U35111WB1934GOI007891 &nbsp;&nbsp;&nbsp;&ensp;&nbsp; PHONE NO.-(033)2469-8100 TO 8113 </h5>
            <h5 className="text-center">
              FAX NO.-(033)2469-8150 &nbsp;&nbsp;&nbsp;&ensp;&nbsp;Website: <a href="">www.grse.in</a>{" "}
            </h5>
          </div>
        </div>
        {isLoading ? (
          <h4>Loading...</h4>
        ) : (
          <>
            <div className="row mt-2">
              <h5 className="mb-3">The E-payment against your Invoice no 2510033212 has been made.</h5>
              <div className="col-6 d-flex justify-content-e top_info_table mb-3">
                <table className="w-75" style={{ fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td width={"20%"}>BTN</td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td>{apiData?.btn}</td>
                    </tr>
                    <tr>
                      <td>BTN Date</td>
                      <td className="text-start">:</td>
                      <td>
                        {apiData.btnDate &&
                          new Date(apiData.btnDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                      </td>
                    </tr>
                    <tr>
                      <td>PO</td>
                      <td className="text-start">:</td>
                      <td>{apiData?.purchesing_doc_no}</td>
                    </tr>
                    <tr>
                      <td className="">Vendor</td>
                      <td>:</td>
                      <td>{apiData?.vendor_code}</td>
                      <td>LINDE INDIA LIMITED</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="row mb-2">
              <h5>The payment details are following:</h5>
              <div className="col-10 d-flex top_info_table mb-3">
                <table className="w-100" style={{ fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td width={"50%"}>Mat/ser Value</td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.matValue}</td>
                    </tr>
                    <tr>
                      <td>No GR/SR Entry</td>
                      <td className="text-start">:</td>
                      <td className="text-end">{apiData.nogrsrValue}</td>
                    </tr>
                    <tr>
                      <td>Net Value</td>
                      <td className="text-start">:</td>
                      <td className="text-end">{apiData.netValue}</td>
                    </tr>
                    <tr>
                      <td className="">
                        Taxes and Duties <span className="ps-3">{apiData.taxesAndDutiesText}</span>
                      </td>
                      <td>:</td>
                      <td className="text-end">{apiData.taxesAndDutiesValue}</td>
                    </tr>

                    <tr>
                      <td className="">Total value with Taxes & Duties</td>
                      <td>:</td>
                      <td className="text-end">{apiData.totalValWithTaxDutiesValue}</td>
                    </tr>
                    <tr>
                      <td className="">
                        Any other charges payable <span className="ps-5 ms-2">{apiData.anyOtherPaybleText}</span>{" "}
                      </td>
                      <td>:</td>
                      <td className="text-end">{apiData.anyOtherPaybleValue}</td>
                    </tr>
                    <tr>
                      <td className="">Gross Value</td>
                      <td>:</td>
                      <td className="text-end">{apiData.grossValue}</td>
                    </tr>
                    <tr>
                      <td className="">Adjustment of Advance</td>
                      <td>:</td>
                      <td className="text-end">{apiData.adjustmentOfAdvance}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="row mb-2">
              <h5>Retention:</h5>
              <div className="col-10 d-flex top_info_table mb-3">
                <table className="w-100" style={{ fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td width={"50%"} className="d-flex gap-5">
                        <p className="m-0">PBG</p>
                        <p className="m-0 ps-5">{apiData.pbgValue}</p>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.pbg}</td>
                    </tr>
                    <tr>
                      <td width={"50%"} className="d-flex gap-5">
                        <p className="m-0">SD</p>
                        <p className="m-0 ps-5">{apiData.sdText}</p>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.sdValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        Others <span className="ps-4">{apiData.otherText}</span>{" "}
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.otherValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>Total Retentions</td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.totalRetentions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="row mb-2">
              <h5>Deduction :</h5>
              <div className="col-10 d-flex top_info_table mb-3">
                <table className="w-100" style={{ fontSize: "12px" }}>
                  <tbody>
                    <tr>
                      <td width={"50%"}>
                        Income TAX TDS <span className="ps-5 ms-2">{apiData.incomeTaxTDSText}</span>{" "}
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.incomeTaxTDSValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"} className="d-flex gap-5">
                        <p className="m-0">GST TDS</p>
                        <p className="m-0 ps-5">{apiData.gstTdsText}</p>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.gstTdsValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        Cost of Consumables & Paints <span className="ps-5 ms-2">{apiData.costOfConPaintText}</span>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.costOfConPaintValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        LD <span className="ps-5 ms-2">{apiData.ldText}</span>{" "}
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.ldValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        Penalty <span className="ps-5 ms-2">{apiData.penaltyText}</span>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.penaltyValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        Interest Charges <span className="ps-5 ms-2">{apiData.interestChargeText}</span>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.interestChargeValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>
                        Other Deduction <span className="ps-5 ms-2">{apiData.otherDeductionText}</span>
                      </td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.otherDeductionValue}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>Total Deduction</td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.totalDeduction}</td>
                    </tr>
                    <tr>
                      <td width={"50%"}>Net Payment</td>
                      <td className="text-start" width={"5%"}>
                        :
                      </td>
                      <td className="text-end">{apiData.netPayment}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <h5 className="m-0">This is system generated and doesnot require signature.</h5>
            </div>
            <div className="col-12 text-center">
              <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
                BACK
              </Link>
            </div>
          </>
        )}
      </section>

      {/* Print Button  */}
      <div className="row diflex justify-content-center mt-5">
        <button className="print_btn" style={{ position: "absolute", top: "30px", right: "50px" }} onClick={handlePrint}>
          Print
        </button>
      </div>

      {/* Date Time And Page No  */}
      <div className="date_time_container" style={{ position: "fixed", top: 0, right: 0, fontSize: "10px" }}>
        <p className="m-0 p-0">Date: {currentDate}</p>
        <p className="m-0 p-0">Time: {currentTime}</p>
      </div>
    </div>
  );
}

export default PaymentAdvice;
