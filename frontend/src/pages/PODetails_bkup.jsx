import React, { useEffect, useState } from "react";
// import Select from "react-select";
// import makeAnimated from "react-select/animated";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useParams } from "react-router-dom";
import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import moment from "moment";

// const animatedComponents = makeAnimated();

const PODetails = () => {
  const [poDetails, setPoDetails] = useState([]);
  const { id } = useParams();
  const { token } = useSelector((state) => state.auth);

  useEffect(() => {
    (async () => {
      const data = await apiCallBack("GET", `po/details?id=${id}`, null, token);
      if (data?.status) {
        setPoDetails(data?.data);
      }
    })();
  }, [id, token]);

  return (
    <>
      <main>
        <div className="d-flex flex-column flex-root">
          <div className="page d-flex flex-row flex-column-fluid">
            <SideBar id={id} />
            <div className="wrapper d-flex flex-column flex-row-fluid">
              <Header title={"Dashboard"} id={id} />
              <div className="content d-flex flex-column flex-column-fluid" id="kt_content">
                <div className="post d-flex flex-column-fluid">
                  <div className="container-xxl">
                    <div className="row g-5 g-xl-8">
                      <div className="col-12">
                        <div className="screen_header">
                          <div className="screen_header_top">
                            {/* <h2>
                              Welcome <span>Admin</span>
                            </h2> */}
                          </div>
                        </div>
                        <div>
                          <h1>Purchase Order Details</h1>
                          {poDetails.map((po) => (
                            <div key={po.EBELN}>
                              <div className="row">
                                <div className="col-6">
                                  <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                                    <div className="card-body py-3">
                                      <div className="card_header_data">
                                        <span className="label">PO Number:</span>
                                        <span className="label_data">{po.EBELN}</span>
                                      </div>
                                      <div className="card_header_data">
                                        <span className="label">PO Date:</span>
                                        <span className="label_data">
                                          {moment(po.AEDAT).utc().format("DD/MM/YY (HH:mm)")}
                                          {/* {po.AEDAT} */}
                                        </span>
                                      </div>
                                      <div className="card_header_data">
                                        <span className="label">MAN:</span>
                                        <span className="label_data">{po.ERNAM}</span>
                                      </div>
                                      <div className="card_header_data">
                                        <span className="label">Vendor Name:</span>
                                        <span className="label_data">
                                          {po.LIFNR} (<span>{po.NAME1}</span>)
                                        </span>
                                      </div>
                                      <div className="card_header_data">
                                        <span className="label">Purchase Group:</span>
                                        <span className="label_data">{po.EKGRP}</span>
                                      </div>
                                      <div className="card_header_data">
                                        <span className="label_data">{/* PO Acceptance Date */}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {po.timeline == "" ? (
                                  ""
                                ) : (
                                  <div className="col-6">
                                    <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                                      <div className="card-body py-3">
                                        <div className="card_header_data">
                                          <span className="label">
                                            {/* Contractual SDBG/IB submission date: */}
                                            {po?.timeline?.[0]?.MTEXT} :
                                          </span>
                                          <span className="label_data">{moment(po?.timeline?.[0]?.PLAN_DATE).format("YYYY-MM-DD")}</span>
                                        </div>
                                        <div className="card_header_data">
                                          <span className="label">
                                            {/* Contractual drawing submission date: */}
                                            {po.timeline[1]?.MTEXT} :
                                          </span>
                                          <span className="label_data">{moment(po?.timeline?.[1]?.PLAN_DATE).format("YYYY-MM-DD")}</span>
                                        </div>
                                        <div className="card_header_data">
                                          <span className="label">
                                            {/* Contractual QAP submission date: */}
                                            {po?.timeline?.[2]?.MTEXT} :
                                          </span>
                                          <span className="label_data">{moment(po?.timeline[2]?.PLAN_DATE).format("YYYY-MM-DD")}</span>
                                        </div>
                                        <div className="card_header_data">
                                          {/* <span className="label">
                                          Raw material stamping date/Test
                                          witness date:
                                        </span> */}
                                          <span className="label_data">{/* Stamping/Test witness date */}</span>
                                        </div>
                                        <div className="card_header_data">
                                          {/* <span className="label">
                                          Final inspection date/FAT:
                                        </span> */}
                                          <span className="label_data">{/* Final inspection date */}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="card card-xxl-stretch mb-5 mb-xxl-8 customer_feedback">{/* Add customer feedback information here */}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="col-12 customer_feedback">
                        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
                          {/* <div className="card-header border-0 pt-5 justify-content-between">
                            <h3 className="card-title align-items-start flex-column">
                              <span className="card-label fw-bold fs-3 mb-1">
                                POs
                              </span>
                            </h3>
                          </div> */}

                          <div className="card-body py-3">
                            <div className="tab-content">
                              <div className="table-responsive">
                                <table className="table table-striped table-bordered table_height">
                                  <thead>
                                    <tr className="border-0">
                                      <th className="">Item number</th>
                                      <th>Material code</th>
                                      <th>Description</th>
                                      <th>Quanity</th>
                                      <th>UOM</th>
                                      <th>Contractual delivery date </th>
                                    </tr>
                                  </thead>
                                  {/* <tbody style={{ maxHeight: "100%" }}>
                                    {poDetails.MAT_DETAILS ? (
                                      poDetails.MAT_DETAILS.map((material) => (
                                        <tr key={material.EBELP}>
                                          <td>{material.EBELP}</td>
                                          <td>{material.MATNR}</td>
                                          <td>{material.TXZ01}</td>
                                          <td>{material.MENGE}</td>
                                          <td>{material.MEINS}</td>
                                          <td>{material.KTMNG}</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan="6">
                                          No material details available.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody> */}
                                  <tbody style={{ maxHeight: "100%" }}>
                                    <tr>
                                      <td>10</td>
                                      <td>3D330</td>
                                      <td>Sheet Metal</td>
                                      <td>50</td>
                                      <td>Meter Square</td>
                                      <td>12/08/2023</td>
                                    </tr>
                                    <tr>
                                      <td>20</td>
                                      <td>3D330</td>
                                      <td>AC</td>
                                      <td>10</td>
                                      <td>Kg</td>
                                      <td>12/08/2023</td>
                                    </tr>
                                    <tr>
                                      <td>30</td>
                                      <td>3D330</td>
                                      <td>Compressor</td>
                                      <td>30</td>
                                      <td>Kg</td>
                                      <td>12/08/2023</td>
                                    </tr>
                                  </tbody>
                                </table>
                                {/* <div className="d-flex align-items-center justify-content-between py-3">
                                  <button className="btn fw-bold btn-info">
                                    ADD NEW
                                  </button>
                                  <div>
                                    <button className="btn fw-bold btn-primary mx-3">
                                      Stop
                                    </button>
                                    <button className="btn fw-bold btn-primary">
                                      Send
                                    </button>
                                  </div>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Footer />
            </div>
          </div>
        </div>
        {/* <div className={isPopup.isPop ? "popup active" : "popup"}>
          <div className="card card-xxl-stretch mb-5 mb-xxl-8">
            <div className="card-header border-0 pt-5">
              <h3 className="card-title align-items-start flex-column">
                <span className="card-label fw-bold fs-3 mb-1">
                  Instructions
                </span>
                <span className="text-muted mt-1 fw-semibold fs-7">
                  {imagesData && `Total ${imagesData.length} Instructions`}
                </span>
              </h3>
              <button
                className="btn fw-bold btn-danger"
                onClick={() =>
                  setIsPopup({
                    isPop: false,
                    itemNo: null,
                  })
                }
              >
                Close
              </button>
            </div>
            <div className="row">
              {imagesData &&
                imagesData.length > 0 &&
                imagesData.map((item, index) => (
                  <div className="col-12 col-md-3" key={index}>
                    <div
                      className={
                        selected.image == item?.instruction_id
                          ? "image_list active"
                          : "image_list"
                      }
                      onClick={() => handleSelectImg(item)}
                    >
                      <Image
                        loader={({ src }) => {
                          return `uploads/${src}`;
                        }}
                        src={item?.instruction_img}
                        alt=""
                        width={300}
                        height={150}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div> */}
      </main>
    </>
  );
};

export default PODetails;
