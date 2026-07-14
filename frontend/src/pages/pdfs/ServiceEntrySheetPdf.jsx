import React, { useEffect, useState } from "react";
// import logo from "../../images/logo.png";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";

function ServiceEntrySheetPdf() {
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
        const path = `${process.env.REACT_APP_BACKEND_API}sap/document/serviceEntryReport`;
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
        <div className="row table_heading_container m-0 p-0 pt-2 mb-2 "></div>
        {isLoading ? (
          <h4 className="text-center">Loading...</h4>
        ) : (
          <>
            <div className="row mt-4">
              <div className="col-6">
                <p>
                  {apiData?.vendorName}, <br />
                  {apiData?.vendor_code}, <br />
                  {apiData?.vendorCity} , {apiData?.vendorDistrict} <br />
                  {apiData?.vendorPinCode}
                  <br />
                </p>
              </div>
              <div className="row">
                <div className="col-6"></div> {/* Empty column */}
                <div className="col-6 d-flex flex-column justify-content-start align-items-end top_info_table">
                  <div className="entrysheetpdf">Entry Sheet for services Performed</div>
                  <div className="square-box">
                    <table className="h-75 w-100" style={{ fontSize: "14px" }}>
                      <tbody>
                        <tr>
                          <td className="fw-bold">Date</td>
                          <td className="text-start" width={"5%"}>
                            :
                          </td>
                          <td>
                            {apiData?.completionDate &&
                              new Date(apiData?.completionDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Purchase Order itemDate</td>
                          <td className="text-start">:</td>
                          <td>{apiData?.purchising_doc_no}</td>
                        </tr>
                        <tr>
                          <td className="fw-bold">Your vender number us</td>
                          <td className="text-start">:</td>
                          <td>{apiData?.vendor_code}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <hr className="section-divider" />

            {/* Updated Table Section */}
            <div className="row">
              <div className="col-12">
                <table className="w-100 payment_advice_table" style={{ fontSize: "15px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #000" }}>
                      <th className="p-2 text-center">Line</th>
                      <th className="p-2 text-center">Sub Line </th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-center">Description</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-center">Unit Price (INR)</th>
                      <th className="p-2 text-center">Net Value (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiData?.line_item_array && apiData.line_item_array.length > 0 ? (
                      apiData.line_item_array.map((item, index) => (
                        <tr key={index} className="section-divider" style={{ borderBottom: "1px solid #ccc" }}>
                          <td width="15%" className="p-1 text-center">
                            {item.lineitem || "--"}
                          </td>
                          <td className="p-1 text-center">{item.sublineitem || "--"}</td>
                          <td className="p-1 text-center">{item.claim_qty || "--"}</td>
                          <td className="p-1">{item.description || "--"}</td>
                          <td className="p-1 text-center">{item.unit || "--"}</td>
                          <td className="p-1 text-center">{item.claim_amount || "--"}</td>
                          <td className="p-1 text-center">{(parseFloat(item.claim_qty || 0) * parseFloat(item.claim_amount || 0)).toFixed(2) || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="p-2 text-center">
                          No data available
                        </td>
                      </tr>
                    )}

                    {/* Total Calculation Row */}
                    <tr style={{ borderTop: "1px solid black", borderStyle: "dotted" }}>
                      <td colSpan="6" className="pt-2 text-end fw-bold">
                        Total Value (excl. tax INR):
                      </td>
                      <td className="pt-2 text-center fw-bold">
                        {apiData?.line_item_array
                          ? apiData.line_item_array.reduce((total, item) => total + parseFloat(item.claim_qty || 0) * parseFloat(item.claim_amount || 0), 0).toFixed(2)
                          : "--"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-12 text-center">
              <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
                BACK
              </Link>
            </div>
          </>
        )}
      </section>

      <div className="print-button-containerone">
        <button className="print_btn" onClick={handlePrint}>
          Print
        </button>
      </div>
    </div>
  );
}

export default ServiceEntrySheetPdf;
