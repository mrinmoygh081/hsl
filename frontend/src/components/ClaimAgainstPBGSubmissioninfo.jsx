import React, { useEffect, useState } from "react";
import Footer from "./Footer";
import { checkTypeArr } from "../utils/smallFun";
import SideBar from "./SideBar";
import Header from "./Header";
import { FaCaretLeft } from "react-icons/fa";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { TailSpin } from "react-loader-spinner";
import { formatEpochToDate, formatFilePath } from "../utils/getDateTimeNow";

const ClaimAgainstPBGSubmissioninfo = ({ setNetPayableAmount }) => {
  const [data, setData] = useState(null);
  const [datapbg, setDatapbg] = useState(null);
  const [InvoiceData, setInvoiceData] = useState(null);
  const [loadingtable, setLoadingtable] = useState(false);
  const { state } = useLocation();
  const { user, token } = useSelector((state) => state.auth);
  const { id } = useParams();
  const navigate = useNavigate();
  console.log(datapbg, "datapbg");

  // const getData = async () => {
  //   setLoadingtable(true);
  //   try {
  //     const response = await apiCallBack(
  //       "GET",
  //       `getFilteredData?$tableName=btn_pbg&$filter={"btn_num":"${state}"}`,
  //       null,
  //       token
  //     );
  //     if (response?.status) {
  //       // setData(response?.data[0]);
  //       const fetchedData = response?.data[0];
  //       setData(fetchedData);
  //       setInvoiceData(JSON.parse(response?.data[0]?.icgrn_nos));
  //       setNetPayableAmount(fetchedData?.claim_amount);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching data:", error);
  //   } finally {
  //     setLoadingtable(false);
  //   }
  // };

  const getData = async () => {
    try {
      console.log("Fetching data for btn_num:", state, "with token:", token);
      const response = await apiCallBack("GET", `po/btn/pbg?btn_num=${state}`, null, token);
      console.log("API Response:", response);
      if (response?.statusCode === 200) {
        setData(response.data); // Response is an object
        console.log("Data set successfully:", response.data);
      } else {
        console.log("API failed with statusCode:", response?.statusCode, "Response:", response);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  const getDataPBG = async () => {
    try {
      const d = await apiCallBack("GET", `po/btn/getBTNData?id=${id}`, null, token);
      if (d?.status) {
        setDatapbg(d?.data);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  // useEffect(() => {
  //   getData();
  //   getDataPBG();
  // }, []);
  useEffect(() => {
    if (state && token) {
      getData();
    } else {
      console.log("Missing state or token:", { state, token });
    }
    if (id && token) {
      getDataPBG();
    }
  }, [state, id, token]);

  return (
    <>
      {loadingtable ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <TailSpin height="80" width="80" color="#4fa94d" ariaLabel="loading" radius="1" wrapperStyle={{}} wrapperClass="" visible={true} />
        </div>
      ) : (
        <div className="card-body p-3">
          <div className="tab-content">
            <div className="table-responsive">
              <table className="table table-striped table-bordered table_height">
                <tbody style={{ maxHeight: "100%" }}>
                  <tr>
                    <td>Balance Claim Invoice :</td>
                    <td className="btn_value">
                      {data?.invoice_no || "-"}
                      {data?.invoice_file_path && (
                        <a href={formatFilePath(data.invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                          View File
                        </a>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Balance Claim Invoice Date:</td>
                    <td className="btn_value">{data?.invoice_date ? formatEpochToDate(data.invoice_date) : "-"}</td>
                  </tr>
                  <tr>
                    <td>Original Invoice No :</td>
                    <td className="btn_value">
                      {data?.original_invoice_no || "-"}
                      {data?.original_invoice_file_path && (
                        <a href={formatFilePath(data.original_invoice_file_path)} target="_blank" rel="noreferrer" className="ms-2">
                          View File
                        </a>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Claim Amount :</td>
                    <td className="btn_value">{data?.net_claim_amount || "0"}</td>
                  </tr>
                  <tr>
                    <td>PBG</td>
                    <td className="btn_value">
                      {data?.pbg_files && checkTypeArr(JSON.parse(data.pbg_files))
                        ? JSON.parse(data.pbg_files).map((item, i) => (
                            <a key={i} href={formatFilePath(item.file_path)} target="_blank" rel="noreferrer" style={{ marginRight: "10px" }}>
                              VIEW
                            </a>
                          ))
                        : "PBG NOT SUBMITTED"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClaimAgainstPBGSubmissioninfo;
