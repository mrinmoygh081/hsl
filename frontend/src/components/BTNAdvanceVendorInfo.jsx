import React from "react";
import { USER_VENDOR } from "../constants/userConstants";
import { formatDate, formatFilePath } from "../utils/getDateTimeNow";
import { useSelector } from "react-redux";

const BTNAdvanceVendorInfo = ({ navigate, id, data, form }) => {
  const { user } = useSelector((state) => state.auth);

  console.log("data", data);
  console.log("form", form); // Debug के लिए

  // BG files को render करने के लिए function
  const renderBGFiles = () => {
    // पहले form object check करें, फिर bg_file_path check करें
    if (form?.bg_file_path) {
      return (
        <a
          href={`${process.env.REACT_APP_PDF_URL}/${form.bg_file_path.replace(/\\/g, "/")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline-primary"
          style={{ borderRadius: "8px" }}
        >
          View BG File
        </a>
      );
    }

    // फिर data.bgData array check करें (multiple files के लिए)
    if (!data?.bgData || data.bgData.length === 0) {
      return <p>No BG file</p>;
    }

    return (
      <div>
        {data.bgData.map((bgFile, index) => (
          <a
            key={index}
            href={`${process.env.REACT_APP_PDF_URL}/${bgFile.file_path.replace(/\\/g, "/")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline-primary me-2 mb-2"
            style={{ borderRadius: "8px" }}
          >
            View {bgFile.file_name || "BG File"} {data.bgData.length > 1 ? index + 1 : ""}
          </a>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="card-body p-3">
        <div className="tab-content">
          <div className="table-responsive">
            <table className="table table-striped table-bordered table_height">
              <tbody style={{ maxHeight: "100%" }}>
                <tr>
                  <td>BTN Number:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.btn_num || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Purchasing Document No:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.purchasing_doc_no || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Yard Number:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.yard || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Stage:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.stage || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Vendor</td>
                  <td>
                    <div>
                      <b>Code: {data?.vendor_code || form?.vendor_code || "NA"}</b>
                    </div>
                    <div>
                      <b>Name: {data?.vendor_name || form?.vendor_name || "NA"}</b>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>{data?.invoice_type || "Invoice"}:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.invoice_no || "NA"}</b>
                    <span style={{ marginLeft: "16px" }}>
                      <a
                        href={formatFilePath(data?.invoice_file_path)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          marginRight: "10px",
                        }}
                      >
                        View File
                      </a>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>Supporting Documents:</td>
                  <td className="btn_value">
                    <a
                      href={formatFilePath(data?.invoice_supporting_file_path)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        marginRight: "10px",
                      }}
                    >
                      View File
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Basic Value:</td>
                  <td className="btn_value">
                    <b className="me-3">₹ {data?.invoice_value || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Invoice Date:</td>
                  <td className="btn_value">
                    <b className="me-3">{data?.invoice_date ? formatDate(data.invoice_date) : "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Net Claim Amount:</td>
                  <td className="btn_value">
                    <b>₹ {data?.net_claim_amount || "NA"}</b>
                  </td>
                </tr>
                <tr>
                  <td>Submission of Advance BG / IB / Other Document:</td>
                  <td className="btn_value">{renderBGFiles()}</td>
                </tr>
                <tr>
                  <td colSpan="2">
                    <div className="form-check">
                      <input type="checkbox" className="form-check-input" id="hsn_gstn_icgrn" name="hsn_gstn_icgrn" defaultChecked={true} checked={true} disabled />
                      <label className="form-check-label" htmlFor="hsn_gstn_icgrn">
                        Whether HSN code, GSTIN, Tax rate is as per PO
                      </label>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="text-center">
            {user?.user_type === USER_VENDOR && (
              <button className="btn fw-bold btn-primary me-3" type="button" onClick={() => navigate(`/invoice-and-payment-process/${id}`)}>
                BACK
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BTNAdvanceVendorInfo;
