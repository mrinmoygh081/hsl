import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { reConfirm } from "../utils/reConfirm";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Header({ title, id }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const location = useLocation();
  const logOutFun = () => {
    dispatch(logoutHandler());
    dispatch(poRemoveHandler());
  };

  useEffect(() => {
    (async () => {
      if (id === "null") {
        dispatch(poRemoveHandler());
        navigate("/");
      }
    })();
  }, [id]);

  const isOnPODetail = location.pathname.includes("/po/");

  return (
    <>
      <div id="kt_header" className="header align-items-stretch shadow" style={{ borderBottom: "2px solid #e8ecf0" }}>
        <div className="container-fluid d-flex align-items-stretch justify-content-between">
          {/* ── Mobile hamburger (unchanged) ── */}
          <div className="d-flex align-items-center d-lg-none ms-n2 me-2" title="Show aside menu">
            <div className="btn btn-icon btn-active-light-primary w-30px h-30px w-md-40px h-md-40px" id="kt_aside_mobile_toggle">
              <span className="svg-icon svg-icon-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 7H3C2.4 7 2 6.6 2 6V4C2 3.4 2.4 3 3 3H21C21.6 3 22 3.4 22 4V6C22 6.6 21.6 7 21 7Z" fill="currentColor" />
                  <path
                    opacity="0.3"
                    d="M21 14H3C2.4 14 2 13.6 2 13V11C2 10.4 2.4 10 3 10H21C21.6 10 22 10.4 22 11V13C22 13.6 21.6 14 21 14ZM22 20V18C22 17.4 21.6 17 21 17H3C2.4 17 2 17.4 2 18V20C2 20.6 2.4 21 3 21H21C21.6 21 22 20.6 22 20Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* ── Main header row ── */}
          <div className="d-flex align-items-stretch justify-content-between w-100">
            <div className="header-menu align-items-stretch justify-content-between w-100">
              {/* LEFT — breadcrumb */}
              <div className="menu menu-lg-rounded menu-column menu-lg-row menu-state-bg menu-title-gray-700 menu-state-title-primary menu-state-icon-primary menu-state-bullet-primary menu-arrow-gray-400 fw-bold my-5 my-lg-0 align-items-stretch">
                <div className="menu-item here show menu-lg-down-accordion me-lg-1">
                  <span className="menu-link py-3">
                    <span className="menu-title d-flex align-items-center gap-2">
                      <span onClick={() => dispatch(poRemoveHandler())}>
                        <Link className="menu-title" to="/po">
                          Dashboard
                        </Link>
                      </span>
                      {!isOnPODetail && title && (
                        <>
                          <span style={{ color: "#b0bac4", fontSize: "13px" }}>›</span>
                          <span className="menu-title">{title}</span>
                        </>
                      )}
                    </span>
                    <span className="menu-arrow d-lg-none" />
                  </span>
                </div>
              </div>

              {/* RIGHT — PO chip + user pill */}
              <div className="d-flex align-items-center gap-3 justify-content-end">
                {/* PO Number chip */}
                {id && id !== "null" && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      background: "#f0f4f8",
                      borderRadius: "10px",
                      border: "1px solid #dce3ea",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {/* PO icon circle — mirrors user avatar */}
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #1a3c5e 0%, #2d6a9f 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {/* File/document SVG icon */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>

                    {/* Label + value */}
                    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                      <span style={{ fontSize: "10px", color: "#8a96a8", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>PO Number</span>
                      <span style={{ fontSize: "12px", color: "#1a3c5e", fontWeight: 700 }}>{id}</span>
                    </div>
                  </div>
                )}

                {/* User pill — grows with name, no truncation */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    background: "#f0f4f8",
                    borderRadius: "10px",
                    border: "1px solid #dce3ea",
                    whiteSpace: "nowrap",
                  }}
                >
                  {/* Avatar circle */}
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1a3c5e 0%, #2d6a9f 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>{user?.user?.name ? user.user.name.charAt(0).toUpperCase() : "U"}</span>
                  </div>

                  {/* Name */}
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                    <span style={{ fontSize: "10px", color: "#8a96a8", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase" }}>Logged In</span>
                    <span style={{ fontSize: "12px", color: "#1a3c5e", fontWeight: 600 }}>{user?.user?.name ? user.user.name : ""}</span>
                  </div>

                  {/* Divider */}
                  <div style={{ width: "1px", height: "28px", background: "#dce3ea", flexShrink: 0 }} />

                  {/* Logout button */}
                  <span
                    onClick={() => reConfirm({ file: true }, logOutFun, "You're going to Logout!")}
                    style={{
                      fontSize: "12px",
                      color: "#e05252",
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                      userSelect: "none",
                      flexShrink: 0,
                    }}
                  >
                    Logout
                  </span>
                </div>
              </div>
              {/* end RIGHT */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
