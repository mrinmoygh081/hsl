import React, { useState } from "react";
// import bg from "assets/media/illustrations/sketchy-1/14-dark.png";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
// import { postAPI } from "../utils/fetchAPIs";
import { logoutHandler } from "../redux/slices/loginSlice";
// import { loginHandler } from "../redux/slices/loginSlice";
import { useNavigate } from "react-router-dom";

export default function WBS() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    type: "",
    val: "",
  });

  console.log(form);
  const submitHandler = async (e) => {
    e.preventDefault();
    const { type, val } = form;
    if (type === "" && val === "") {
      toast.warn("Please fill all fields!");
      return;
    }
    // navigate(`/pos`);

    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  return (
    <>
      <div className="d-flex flex-column flex-root" style={{ height: "100vh" }}>
        <div className="d-flex flex-column flex-column-fluid bgi-position-y-bottom position-x-center bgi-no-repeat bgi-size-contain bgi-attachment-fixed">
          <div className="d-flex flex-center flex-column flex-column-fluid p-10 pb-lg-20">
            <div className="w-lg-500px bg-body rounded shadow-sm p-10 p-lg-15 mx-auto border">
              <form onSubmit={submitHandler} className="form w-100">
                <div className="text-center mb-5">
                  {/* <img
                    src={require("../images/logo.png")}
                    alt=""
                    className="img-fluid"
                    style={{ width: "120px" }}
                  />*/}
                  <h3 className="text-dark">WBS / Project Code</h3>
                </div>
                <div className="fv-row mb-3">
                  <label className="form-label fs-6 fw-bolder text-dark">
                    Choose your option
                  </label>

                  <select
                    className="form-control form-control-lg form-control-solid"
                    name="type"
                    onChange={handleInputChange}
                  >
                    <option value="">Choose the type</option>
                    <option value="WBSELEMENT">WBS element</option>
                    <option value="PROJECTCODE">Project Code</option>
                  </select>
                </div>
                <div className="fv-row mb-3">
                  <input
                    className="form-control form-control-lg form-control-solid"
                    type="text"
                    name="val"
                    autoComplete="off"
                    onChange={handleInputChange}
                  />
                </div>
                <div className="text-center">
                  <button
                    type="submit"
                    className="btn btn-lg btn-primary w-100 mb-5"
                  >
                    {!isLoading ? (
                      <span className="indicator-label">Continue</span>
                    ) : (
                      <span className="indicator-label">Please wait...</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="pos_bottom">
        <button
          className="btn btn-danger"
          onClick={() => dispatch(logoutHandler())}
        >
          Log Out
        </button>
      </div> */}
    </>
  );
}
