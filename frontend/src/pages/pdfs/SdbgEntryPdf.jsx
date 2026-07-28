import React from "react";
import logo from "../../images/image001.jpg";

function SdbgEntry() {
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
      <div className="row mt-4">
        <h4 className="mb-3 mt-2  text-center">SDBG Entry</h4>
        <div className="col-12 d-flex _info_table mb-3">
          <table className="w-100 " style={{ fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Reference No.</th>
                <th>PO No.</th>
                <th>Bankers Name</th>
                <th>Bankers Branch</th>
                <th>Bankers Address1</th>
                <th>Bankers Address2</th>
                <th>Bankers Address3</th>
                <th>Bankers City</th>
                <th>Bank Pincode</th>
                <th>Bank Guarantee No</th>
                <th>BG Date</th>
                <th>BG Amount</th>
                <th>Yard No</th>
                <th>Validity Date</th>
                <th>Claim Period</th>
                <th>BG Type</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>123456789</td>
                <td>123456789</td>
                <td>HDFC</td>
                <td>Kasba</td>
                <td>hdfc123,234 , durgapur , west bengal</td>
                <td>hdfc123,234</td>
                <td></td>
                <td>Kolkata</td>
                <td>700107</td>
                <td>123456789</td>
                <td>19-02-2024</td>
                <td>123456789</td>
                <td>123456789</td>
                <td>18-05-2024</td>
                <td>123456789</td>
                <td>SDBG</td>
              </tr>
            </tbody>
            {/* <tbody>
              <tr>
                <td width={"50%"}>Reference No.</td>
                <td className="text-center" width={"5%"}>
                  :
                </td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td width={"50%"}>PO No.</td>
                <td className="text-start" width={"5%"}>
                  :
                </td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td>Bankers Name </td>
                <td className="text-start">:</td>
                <td className="text-end">HDFC</td>
              </tr>
              <tr>
                <td>Bankers Branch</td>
                <td className="text-start">:</td>
                <td className="text-end">Kasba</td>
              </tr>
              <tr>
                <td className="">Bankers Address1</td>
                <td>:</td>
                <td className="text-end">123hdfc , 123 </td>
              </tr>
              <tr>
                <td className="">Bankers Address2</td>
                <td>:</td>
                <td className="text-end">hdfc123,234</td>
              </tr>
              <tr>
                <td className="">Bankers Address3</td>
                <td>:</td>
                <td className="text-end"></td>
              </tr>
              <tr>
                <td className="">Bankers City</td>
                <td>:</td>
                <td className="text-end">Kolkata</td>
              </tr>
              <tr>
                <td className="">Bank Pincode </td>
                <td>:</td>
                <td className="text-end">700107</td>
              </tr>
              <tr>
                <td className="">Bank Guarantee No</td>
                <td>:</td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td className="">BG Date</td>
                <td>:</td>
                <td className="text-end">19-02-2024</td>
              </tr>
              <tr>
                <td className="">BG Amount</td>
                <td>:</td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td className="">Yard No</td>
                <td>:</td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td className="">Validity Date </td>
                <td>:</td>
                <td className="text-end">18-05-2024</td>
              </tr>
              <tr>
                <td className="">Claim Period</td>
                <td>:</td>
                <td className="text-end">123456789</td>
              </tr>
              <tr>
                <td className="">BG Type</td>
                <td>:</td>
                <td className="text-end">SDBG</td>
              </tr>
            </tbody> */}
          </table>
        </div>
        <h5 className="m-0 mt-5">This is system generated and doesnot require signature.</h5>
        {/* Print Button  */}
        <div className="row diflex justify-content-center mt-5">
          <button className="print_btn" style={{ position: "absolute", top: "30px", right: "50px" }} onClick={handlePrint}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default SdbgEntry;
