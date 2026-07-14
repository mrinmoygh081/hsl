import React, { Fragment, useEffect, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { checkTypeArr } from "../utils/smallFun";

const POArchived = () => {
  const { id } = useParams();
  const [data, setData] = useState([]);
  const { user, token } = useSelector((state) => state.auth);

  const getData = async () => {
    try {
      const data = await apiCallBack(
        "GET",
        `po/download/getPoFileList?poNo=${id}`,
        null,
        token
      );
      if (data?.status) {
        setData(data?.data);
      }
    } catch (error) {
      console.error("Error fetching drawing list:", error);
    }
  };

  useEffect(() => {
    getData();
  }, [id, token]);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"PO Archived"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            {data && data.length > 0 ? (
                              <table
                                className="table table-striped table-bordered table_height"
                                style={{ maxWidth: "50%" }}
                              >
                                <thead>
                                  <tr className="border-0">
                                    <th>File Name</th>
                                    <th>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {checkTypeArr(data) &&
                                    data.map((item, index) => (
                                      <Fragment key={index}>
                                        <tr>
                                          <td className="table_center">
                                            {item.fileName}
                                          </td>
                                          <td className="table_center">
                                            {item.fileName && (
                                              <a
                                                href={`${process.env.REACT_APP_ROOT_URL}sapuploads/po/${item.fileName}`}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                Click Here
                                              </a>
                                            )}
                                          </td>
                                        </tr>
                                      </Fragment>
                                    ))}
                                </tbody>
                              </table>
                            ) : (
                              <p>No data found</p>
                            )}
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
    </>
  );
};

export default POArchived;
