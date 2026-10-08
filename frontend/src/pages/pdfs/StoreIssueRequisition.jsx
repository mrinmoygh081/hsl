import React, { useEffect, useState } from "react";
import logo from "../../images/image001.jpg";
import { useSelector } from "react-redux";
import { Link, useLocation, useParams } from "react-router-dom";

function StoreIssueRequisition() {
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
        const path = `${process.env.REACT_APP_BACKEND_API}sap/user/reservationReport`;
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

  console.log("apiData--->>", apiData);

  return (
    <div className="container-fluid pt-4">
      <div className="row table_heading_container m-0 p-0 mb-2">
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
          <p className="w-75 text-end">Date: 06.03.2024</p>
        </div>
      </div>

      <div className="row" style={{ minHeight: "300px" }}>
        <div className="col-12">
          <table className="table table_container_1">
            <thead>
              <tr>
                <th>RES. No.</th>
                <th>Item No</th>
                <th>Material No</th>
                <th>Material Description</th>
                <th>UOM</th>
                <th>Qty</th>
                <th>Storage Location</th>
                <th>WBS/Order</th>
                <th>WBS Description</th>
                <th>Activity</th>
                <th>Activity Desc.</th>
                <th>Plant</th>
                <th>Qty to Withdraw</th>
                <th>PO Number</th>
              </tr>
            </thead>
            <tbody>
              {apiData?.lineItem?.map((item, index) => (
                <tr key={index}>
                  <td>{item.reservationNumber}</td>
                  <td>{item.itemNumber}</td>
                  <td>{item?.materialNubmer}</td>
                  <td>{item?.materialDescription}</td>
                  <td></td>
                  <td>{item.unit}</td>
                  <td>{item.requirementQty}</td>
                  <td>{item.storageLocation}</td>
                  <td>{item.wbs}</td>
                  <td>{item.wbsDescription}</td>
                  <td></td>
                  <td></td>
                  <td>{item.plant}</td>
                  <td>{item.quantWithdrawal}</td>
                  <td>{item.purchasing_doc_no}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="col-12">
            <h6 className="m-0">Remarks:-</h6>
            <p className="m-0 w-75" style={{ wordWrap: "break-word", fontSize: "14px" }}></p>
          </div>

          <div className="row d-flex mt-5 pt-2">
            <h6 className="col-6">Depatment:-</h6>
            <h6 className="col-6">Authorized by:-</h6>
          </div>
          <div className="row mt-5 pt-2">
            <h6 className="col-6">Signature G.R.S.E. REP :-</h6>
            <h6 className="col-6">WOT. Kolkata</h6>
          </div>
        </div>
        <div className="col-12 text-center">
          <Link className="no_print btn-primary btn" to={`/display-store-actions/${poNumber}`}>
            BACK
          </Link>
        </div>
      </div>

      <div className="row diflex justify-content-center mt-5">
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

export default StoreIssueRequisition;
