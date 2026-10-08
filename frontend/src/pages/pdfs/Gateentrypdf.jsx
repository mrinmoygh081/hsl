import React, { useEffect, useState } from "react";
import logo from "../../images/image001.jpg";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";
import { formatDate } from "../../utils/getDateTimeNow";

function Gateentrypdf() {
  const location = useLocation();
  const [apiData, setApiData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useSelector((state) => state.auth);
  const searchParams = new URLSearchParams(location.search);

  const poNumber = searchParams.get("po");

  console.log(poNumber, "abhinit");

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
  console.log("payload iss params--", payloadData);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const path = `${process.env.REACT_APP_BACKEND_API}sap/document/gateentryReport`;
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

  console.log("Api data --??..>>", apiData);

  return (
    <div className="container-fluid pt-4">
      <div className="row table_heading_container m-0 p-0 mb-2 ">
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
            43/46, (Garden Reach Road / Kolkata)
          </p>
        </div>
      </div>

      <div className="row  mb-4 mt-3">
        <h5 className=" text-center m-0 pb-3 underline gatrentrycall">Gate Entry</h5>
        {isLoading ? (
          <h4>Loading...</h4>
        ) : (
          <>
            <div className="col-6 d-flex justify-content-start top_info_table">
              <table className="w-75 h-75" style={{ fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td width={"60%"}>Gate Entry No</td>
                    <td className="text-start" width={"5%"}>
                      :
                    </td>
                    <td>{apiData?.gate_entry_no}</td>
                  </tr>
                  <tr>
                    <td>Date</td>
                    <td className="text-start">:</td>
                    <td>
                      {" "}
                      {formatDate(apiData?.entry_date)}
                    </td>
                  </tr>

                  <tr>
                    <td>Vendor</td>
                    <td>:</td>
                    <td>{apiData?.vendor_name}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="col-6 d-flex justify-content-start top_info_table">
              <table className="w-75 h-75" style={{ fontSize: "14px" }}>
                <tbody>
                  <tr>
                    <td> Vehicle No</td>
                    <td className="text-start">:</td>
                    <td>{apiData?.vehicle_no}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="row" style={{ minHeight: "300px" }}>
        <div className="col-12">
          <table className="table table_container_1">
            <thead>
              <tr>
                <th>PO NO</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Challan Quantity</th>
                <th>Material Code</th>
                <th>Material Description</th>
                <th>Invoice No</th>
              </tr>
            </thead>
            {isLoading ? (
              <h4>Loading....</h4>
            ) : (
              <tbody>
                {apiData?.line_items?.map((item, index) => (
                  <tr key={index}>
                    <td>{item?.purchising_doc_no}</td>
                    <td>{item?.po_line_item_no}</td>
                    <td>{item?.quantity}</td>
                    <td>{item?.chalan_quantity}</td>
                    <td>{item?.material_code}</td>
                    <td>{item?.material_desc}</td>
                    <td>{item?.invoice_number}</td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        <div className="col-12 text-center">
          <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
            BACK
          </Link>
        </div>
      </div>

      <div className="row diflex justify-content-center mt-2 mb-5">
        <button className="print_btn" onClick={handlePrint} style={{ position: "absolute", top: "30px", right: "50px" }}>
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

export default Gateentrypdf;
