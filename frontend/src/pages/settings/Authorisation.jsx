import React, { useEffect, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import Footer from "../../components/Footer";
import MainHeader from "../../components/MainHeader";
import SkeletonLoader from "../../loader/SkeletonLoader";
import { checkTypeArr } from "../../utils/smallFun";
import { apiCallBack } from "../../utils/fetchAPIs";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { FaCheck, FaTimes } from "react-icons/fa";
import DynamicButton from "../../Helpers/DynamicButton";

const Authorisation = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const { token } = useSelector((state) => state.auth);

  const getData = async () => {
    setLoading(true);
    const d = await apiCallBack("GET", "auth2/getListPendingEmp", null, token);
    setLoading(false);
    if (d?.status) {
      setData(d.data);
    } else {
      toast.info(d.message);
    }
  };

  const handleAction = async (user_code, status) => {
    setLoading(true);
    const payload = { user_code, status };
    const d = await apiCallBack(
      "POST",
      "auth2/acceptedPendingEmp",
      payload,
      token
    );
    setLoading(false);
    if (d?.status) {
      toast.success("Action successful!");
      getData();
    } else {
      toast.error(d.message);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <div className="d-flex flex-column flex-row-fluid">
            <MainHeader title={"Authorisation"} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="table-responsive">
                          <table className="table table-striped table-bordered table_height">
                            <thead>
                              <tr className="border-0">
                                <th>Name</th>
                                <th>Department Name</th>
                                <th>Email</th>
                                <th>Internal Role</th>
                                <th>Vendor Code</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loading ? (
                                <tr>
                                  <td colSpan="6">
                                    <SkeletonLoader />
                                  </td>
                                </tr>
                              ) : checkTypeArr(data) && data.length > 0 ? (
                                data.map((item, index) => (
                                  <tr key={index}>
                                    <td>{item.name}</td>
                                    <td>{item.depertment_name}</td>
                                    <td>{item.email || ""}</td>
                                    <td>{item.internal_role || ""}</td>
                                    <td>{item.vendor_code || ""}</td>
                                    <td>
                                      <DynamicButton
                                        label={<FaCheck />}
                                        onClick={() =>
                                          handleAction(item.vendor_code, 1)
                                        }
                                        className="btn btn-sm btn-success me-2"
                                        confirmMessage="Are you sure you want to approve this user?"
                                      />

                                      <DynamicButton
                                        label={<FaTimes />}
                                        onClick={() =>
                                          handleAction(item.vendor_code, 2)
                                        }
                                        className="btn btn-sm btn-danger"
                                        confirmMessage="Are you sure you want to reject this user?"
                                      />
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="6" className="text-center">
                                    No data available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
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

export default Authorisation;
