import React from "react";
import logo from "../../images/image001.jpg";

function DemandManagementPdf() {
  const handlePrint = () => {
    window.print();
  };

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

      <div className="row mt-5">
        <div className="col-12">
          <table className="table table_container_1">
            <thead>
              <tr>
                <th>Ref. No.</th>
                <th>Date</th>
                <th>Action Type</th>
                <th>Po Line item</th>
                <th>Updated By</th>
                <th>Request Qty</th>
                <th>Received Qty</th>
                <th>Delivery Date</th>
                <th>Remarks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>123456789</td>
                <td>16-09-2024</td>
                <td>Demand Management</td>
                <td>Demand Management</td>
                <td>10</td>
                <td>Mrinmoy Ghosh</td>
                <td>10</td>
                <td>9</td>
                <td>25-09-2024</td>
                <td>Approved</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <h6 className="m-0 mt-5">This is system generated and doesnot require signature.</h6>
      {/* Print Button  */}
      <div className="row diflex justify-content-center mt-5">
        <button className="print_btn" style={{ position: "absolute", top: "30px", right: "50px" }} onClick={handlePrint}>
          Print
        </button>
      </div>
    </div>
  );
}

export default DemandManagementPdf;
