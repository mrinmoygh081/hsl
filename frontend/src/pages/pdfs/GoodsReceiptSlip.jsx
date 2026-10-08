import React, { useEffect, useState } from "react";
import logo from "../../images/image001.jpg";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";
import { formatDate } from "../../utils/getDateTimeNow";

function GoodsReceiptSlip() {
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
        const path = `${process.env.REACT_APP_BACKEND_API}sap/document/grnReport`;
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
        setApiData(data.data || {});
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  return (
    <div className="container-fluid">
      <section className="Table-1" style={{ minHeight: "970px" }}>
        <div className="row table_heading_container m-0 p-0 pt-2 mb-2 ">
          <div className="col-10">
            <h3 className="m-0 goodreceptslip" style={{ width: "90%", fontFamily: "monospace" }}>
              <span className="goodreceptslip-font">GOODS RECEIPT SLIP </span> <span>No: {apiData.matDocNo}</span>
            </h3>
          </div>
        </div>

        {/* Section 1 */}
        <div className="section-container">
          <div className="row mt-4">
            <div className="col-6 d-flex justify-content-end top_info_table">
              <table className="h-75 w-100" style={{ fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td width={"30%"} className="fw-bold">
                      Goods receipt date.
                    </td>
                    <td className="text-start" width={"5%"}>
                      :
                    </td>
                    <td width={"30%"}>
                      {apiData.entryDate &&
                        new Date(apiData.entryDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Current date</td>
                    <td className="text-start">:</td>
                    <td>
                      {" "}
                      {apiData.entryDate &&
                        new Date(apiData.entryDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                    </td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Gate Entry Number</td>
                    <td className="text-start">:</td>
                    <td>{apiData?.gateEntryNo}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Invoice No</td>
                    <td className="text-start">:</td>
                    <td>{apiData.invoiceNo}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Invoice Date</td>
                    <td className="text-start">:</td>
                    <td>
                      {" "}
                      {apiData?.invoiceDate ? formatDate(apiData.invoiceDate) : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <hr className="section-divider" />

        {/* Section 2 */}
        <div className="section-container">
          <div className="row mt-4">
            <div className="col-6 d-flex justify-content-end top_info_table">
              <table className="h-75 w-100" style={{ fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td width={"30%"} className="fw-bold">
                      Plant.
                    </td>
                    <td className="text-start" width={"5%"}>
                      :
                    </td>
                    <td width={"30%"}>{apiData?.plant}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Vendor</td>
                    <td className="text-start">:</td>
                    <td>{apiData?.vendor_code}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Name</td>
                    <td>:</td>
                    <td>{apiData?.vendor_name}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">PO</td>
                    <td>:</td>
                    <td>{apiData?.purchasing_doc_no}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Pur. group</td>
                    <td>:</td>
                    <td>{apiData?.purchaseGroup}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-6 d-flex justify-content-end top_info_table">
              <table className="h-75 w-100" style={{ fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td width={"30%"} className="fw-bold">
                      Challan No.
                    </td>
                    <td className="text-start" width={"5%"}>
                      :
                    </td>
                    <td width={"30%"}>{apiData?.chalanNo}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">Bill Location</td>
                    <td className="text-start">:</td>
                    <td>{apiData?.headerText}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <hr className="section-divider" />

        {/* Section 3 */}
        <div className="section-container">
          <div className="row mt-4">
            <div className="col-6 d-flex justify-content-end top_info_table">
              <table className="h-75 w-100 custom-table" style={{ fontSize: "14px" }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Material </th>
                    <th>Description</th>
                    <th>Accounting Assignment</th>
                    <th>Quantity</th>
                    <th>UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {apiData?.lineItem &&
                    apiData?.lineItem.map((item, index) => (
                      <tr key={index}>
                        <td>{item.matDocNoLineItem}</td>
                        <td>{item.materialNumber}</td>
                        <td>{item.materialDesc}</td>
                        <td>{item.accountingAssegnment}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <hr className="section-divider" />
        <div className="col-12 text-center">
          <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
            BACK
          </Link>
        </div>
      </section>

      {/* Print Button  */}
      <div className="row diflex justify-content-center mt-5">
        <button className="print_btn" style={{ position: "absolute", top: "30px", right: "50px" }} onClick={handlePrint}>
          Print
        </button>
      </div>

      {/* Date Time And Page No  */}
    </div>
  );
}

export default GoodsReceiptSlip;
