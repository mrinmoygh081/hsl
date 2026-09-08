import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutHandler } from "../redux/slices/loginSlice";
import { Link, Outlet } from "react-router-dom";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { reConfirm } from "../utils/reConfirm";
import { sidebarDashboardData } from "../data/sidebarDashboard";

const SidebarDashboard = ({ title }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const getSidebarDashboardData = (department_id) => {
    if (department_id === 3) {
      return sidebarDashboardData.filter((item) => item.title === "QA");
    } else if (department_id === 15) {
      return sidebarDashboardData.filter((item) => item.title === "BG" || item.title === "BTN");
    } else if (department_id === 2) {
      return sidebarDashboardData.filter((item) => item.title === "DRAWING" || item.title === "QA");
    } else {
      return sidebarDashboardData;
    }
  };

  const sidebarData = getSidebarDashboardData(user?.department_id);

  const logOutFun = () => {
    dispatch(logoutHandler());
    dispatch(poRemoveHandler());
    // window.location.href = "/";
  };

  return (
    <div id="kt_aside" className="aside aside-dark aside-hoverable">
      <div className="aside-logo flex-column-auto" onClick={() => dispatch(poRemoveHandler())}>
        <Link to="/po" className="logo_link">
          <img src={require("../images/image001.jpg")} alt="" className="img-fluid" style={{ width: "80px" }} />
          {/* <span>HSL</span> */}
        </Link>
      </div>
      <div className="aside-menu flex-column-fluid">
        <div className="hover-scroll-overlay-y mt-lg-3" style={{ height: "calc(100vh - 100px)", paddingBottom: "40px" }}>
          <div className="menu menu-column menu-title-gray-800 menu-state-title-primary menu-state-icon-primary menu-state-bullet-primary menu-arrow-gray-500">
            {sidebarData &&
              sidebarData.map((item, i) => (
                <div className="menu-item" key={i}>
                  <Link to={item?.link} className="menu-link">
                    <span className="menu-icon">
                      <span className="svg-icon svg-icon-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" />
                          <rect opacity="0.3" x="13" y="2" width="9" height="9" rx="2" fill="currentColor" />
                          <rect opacity="0.3" x="13" y="13" width="9" height="9" rx="2" fill="currentColor" />
                          <rect opacity="0.3" x="2" y="13" width="9" height="9" rx="2" fill="currentColor" />
                        </svg>
                      </span>
                    </span>
                    <span className="menu-title">{item?.title}</span>
                  </Link>
                </div>
              ))}
            <div className="menu-item">
              <div className="menu-content pt-8 pb-2">
                <span className="menu-section text-muted text-uppercase fs-8 ls-1">LogOut</span>
              </div>
            </div>
            <div data-kt-menu-trigger="click" className="menu-item">
              <Link href={"#"} onClick={() => reConfirm({ file: true }, logOutFun, "You're going to Logout!")} className="menu-link">
                <span className="menu-icon">
                  <span className="svg-icon svg-icon-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="2" width="9" height="9" rx="2" fill="currentColor" />
                      <rect opacity="0.3" x="13" y="2" width="9" height="9" rx="2" fill="currentColor" />
                      <rect opacity="0.3" x="13" y="13" width="9" height="9" rx="2" fill="currentColor" />
                      <rect opacity="0.3" x="2" y="13" width="9" height="9" rx="2" fill="currentColor" />
                    </svg>
                  </span>
                </span>
                <span className="menu-title">Log Out</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarDashboard;
