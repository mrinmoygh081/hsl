import React, { useEffect, useState } from "react";
import logo from "../../images/image001.jpg";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";

function GoodsIssueSlip() {
  const location = useLocation();
  const [apiData, setApiData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const { token } = useSelector((state) => state.auth);
  const searchParams = new URLSearchParams(location.search);

  const poNumber = searchParams.get("po");

  const handlePrint = () => {
    window.print();
  };

  // let payloadData = location.state;
  const { payload } = useParams();
  const payloadData = JSON.parse(payload);
  // console.log("payloadData",payloadData)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const path = `${process.env.REACT_APP_BACKEND_API}po/material/issue/list`;
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
        setApiData(data.data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token]);

  console.log("apidata---", apiData);

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

      <div className="row mt-3">
        <div className="col-6">
          <p className="m-0">Plant: Palnt Bailey bridge</p>
          <p className="m-0">Address: 61 Garden Reach Road , Kolkata, Pin - 700024</p>
          <p className="m-0">State: West Bengal , GSTIN: 19AAACG9371K1J4</p>
        </div>
        <div className="col-6 d-flex justify-content-end top_info_table">
          <table className="w-75" style={{ fontSize: "14px" }}>
            <tbody>
              <tr>
                <td width={"40%"}>Issue No</td>
                <td className="text-start" width={"5%"}>
                  :
                </td>
                <td>{apiData.issueNo}</td>
              </tr>
              <tr>
                <td>Issue Date</td>
                <td className="text-start">:</td>
                {/* <td>{apiData.issuDate}</td> */}
                <td>
                  {" "}
                  {apiData.issuDate &&
                    new Date(apiData.issuDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                </td>
              </tr>
              <tr>
                <td>Reservation No</td>
                <td className="text-start">:</td>
                <td>{apiData.reservationNo}</td>
              </tr>
              <tr>
                <td>Reservation Date</td>
                <td>:</td>
                <td> </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="row">
        <h4 className="text-center">GOODS ISSUE SLIP</h4>
        <div className="col-12">
          {isLoading ? (
            <h4 className="text-center mt-5 text-secondary">Loading....</h4>
          ) : (
            <table className="table table_container_1">
              <thead>
                <tr>
                  <th>SR.N0/SIR Item</th>
                  <th>Material Code</th>
                  <th>Material Description</th>
                  <th>UOM</th>
                  <th>Batch No.</th>
                  <th>Required Qty</th>
                  <th>Issued Qty</th>
                  <th>Cost Center</th>
                  <th>WBS Element</th>
                </tr>
              </thead>
              <tbody>
                {apiData?.lineItem?.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1} / 0001</td>
                    <td>{item.materialNumber}</td>
                    <td>{item.materialDescription}</td>
                    <td>{item.unit}</td>
                    <td>{item.batchNo}</td>
                    <td>{item.requiredQty}</td>
                    <td>{item.issueQty}</td>
                    <td>{item.costCenter}</td>
                    <td>{}</td>
                  </tr>
                ))}

                <tr>
                  <td colSpan={9}></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>
                    <h6 className="text-center pb-3">Issued To</h6>
                    <h6 className="text-center"></h6>
                  </td>
                  <td colSpan={1}>
                    <h6 className="text-center pb-3">Issued By</h6>
                    <h6 className="text-center"></h6>
                  </td>
                  <td colSpan={3}>
                    <h6 className="text-center pb-3">Authorized By</h6>
                    <h6 className="text-center"></h6>
                  </td>
                  <td colSpan={3}>
                    <h6 className="text-center pb-3">Received By</h6>
                    <h6 className="text-center"></h6>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <div className="col-12 text-center">
          <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
            BACK
          </Link>
        </div>
      </div>

      <div className="row diflex justify-content-center mt-5">
        <button className="print_btn" style={{ position: "absolute", top: "30px", right: "50px" }} onClick={handlePrint}>
          Print
        </button>
      </div>

      {/* Date Time And Page No  */}
      <div className="date_time_container" style={{ position: "fixed", top: 0, right: 0, fontSize: "10px" }}>
        <p className="m-0 p-0">Date: {currentDate}</p>
        <p className="m-0 p-0">Time: {currentTime}</p>
        {/* <p className="m-0 p-0">page 1/2</p> */}
      </div>
    </div>
  );
}

export default GoodsIssueSlip;
