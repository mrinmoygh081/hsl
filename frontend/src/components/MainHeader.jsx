import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logoheader from "../images/image001.jpg";
import { useDispatch, useSelector } from "react-redux";
import { reConfirm } from "../utils/reConfirm";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { DEPT_DESIGN, DEPT_FI, DEPT_IT, DEPT_QAP, USER_HSL_CONTRACT, USER_HSL_HR, USER_HSL_PURCHASE, USER_VENDOR } from "../constants/userConstants";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import {
  FaCog,
  FaFileAlt,
  FaKey,
  FaUserTie,
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaChartLine,
  FaBuilding,
  FaPaintBrush,
  FaCheckCircle,
  FaTasks,
  FaFileContract,
  FaSignOutAlt,
  FaChevronDown,
  FaHeadset,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { checkPasswordStrength, validatePassword } from "../utils/registrationUtils";
import { getEncryptedPasswordForAPI } from "../utils/encryptionUtils";
import "../cssgrse/mainheader.css";

const MainHeader = ({ title }) => {
  const dispatch = useDispatch();
  const { user, isLoggedIn, token, refreshToken } = useSelector((state) => state.auth);
  const [ischangepasswordPopup, setIschangepasswordPopup] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old_pw: "", new_pw: "", confirm_pw: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: "", color: "text-secondary" });
  const [settingOpen, setSettingOpen] = useState(false);
  console.log(user, "user name");

  const logOutFun = async () => {
    try {
      if (refreshToken) await apiCallBack("POST", "auth2/logout", { refreshToken }, token);
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      dispatch(logoutHandler());
      dispatch(poRemoveHandler());
    }
  };

  useEffect(() => {
    if (passwordChanged) {
      const timer = setTimeout(() => handleAutoLogout(), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordChanged]);

  const handleAutoLogout = async () => {
    try {
      toast.info("Logging out after password change... Please login again.");
      if (refreshToken) await apiCallBack("POST", "auth2/logout", { refreshToken }, token);
    } catch (error) {
      console.error("Auto logout API error:", error);
    } finally {
      dispatch(logoutHandler());
      dispatch(poRemoveHandler());
      setPasswordChanged(false);
      setTimeout(() => toast.success("Password changed successfully! Please login with your new password."), 500);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) toast.warning("This user does not have permission to access the dashboard!");
  }, [isLoggedIn]);

  useEffect(() => {
    if (passwordForm.new_pw) {
      setPasswordStrength(checkPasswordStrength(passwordForm.new_pw, user?.vendor_code));
    } else {
      setPasswordStrength({ score: 0, message: "", color: "text-secondary" });
    }
  }, [passwordForm.new_pw, user?.vendor_code]);

  const handleInputChange = (e) => setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const PasswordchangeBtn = async () => {
    setIsSubmitting(true);
    if (passwordForm.new_pw !== passwordForm.confirm_pw) {
      toast.warn("New Password and Confirm Password do not match.");
      setIsSubmitting(false);
      return;
    }
    if (!validatePassword(passwordForm.new_pw, user?.vendor_code, toast)) {
      setIsSubmitting(false);
      return;
    }
    if (passwordStrength.score < 3) {
      toast.warn("Password is too weak. Please choose a stronger password.");
      setIsSubmitting(false);
      return;
    }
    try {
      const oldPasswordEncrypted = getEncryptedPasswordForAPI(passwordForm.old_pw, "AES_CBC");
      const newPasswordEncrypted = getEncryptedPasswordForAPI(passwordForm.new_pw, "AES_CBC");
      const payload = { user_code: user?.vendor_code, old_pw: oldPasswordEncrypted, new_pw: newPasswordEncrypted, encryption_type: "aes_cbc_pkcs7" };
      const res = await apiCallBack("POST", `auth2/updatePassword`, payload, token);
      if (res?.status) {
        setIschangepasswordPopup(false);
        setPasswordForm({ old_pw: "", new_pw: "", confirm_pw: "" });
        toast.success(
          <div>
            <div className="fw-bold">✅ Password Changed Successfully!</div>
            <small>You will be logged out automatically in 3 seconds...</small>
          </div>,
          { autoClose: 3000, closeButton: false },
        );
        setPasswordChanged(true);
      } else {
        toast.warn(res?.message || "Failed to change password.");
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("❌ Change Password Error:", error);
      toast.error("An error occurred while changing the password.");
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => reConfirm({ file: true }, logOutFun, "You're going to Logout!");

  const closePasswordPopup = () => {
    setIschangepasswordPopup(false);
    setPasswordForm({ old_pw: "", new_pw: "", confirm_pw: "" });
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const renderPasswordStrength = () =>
    passwordForm.new_pw && (
      <div className="mt-2">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">Password Strength:</small>
          <small className={`fw-bold ${passwordStrength.color}`}>
            {passwordStrength.score <= 2 ? "Weak" : passwordStrength.score <= 3 ? "Fair" : passwordStrength.score <= 4 ? "Good" : "Strong"}
          </small>
        </div>
        <div className="progress" style={{ height: "8px", borderRadius: "4px" }}>
          <div
            className={`progress-bar ${passwordStrength.color.replace("text-", "bg-")}`}
            role="progressbar"
            style={{ width: `${(passwordStrength.score / 5) * 100}%`, transition: "width 0.3s ease" }}
          ></div>
        </div>
        {passwordStrength.message && (
          <small className={`mt-1 d-block ${passwordStrength.color}`}>
            <i className={`fas fa-${passwordStrength.score <= 2 ? "exclamation-triangle" : "check-circle"} me-1`}></i>
            {passwordStrength.message}
          </small>
        )}
      </div>
    );

  const renderPasswordRequirements = () => (
    <div className="mt-3">
      <small className="text-muted fw-semibold d-block mb-2">Password Requirements:</small>
      <div className="row">
        <div className="col-6">
          {[
            { test: passwordForm.new_pw.length >= 8, label: "Min. 8 characters" },
            { test: /[A-Z]/.test(passwordForm.new_pw), label: "One uppercase (A-Z)" },
            { test: /[a-z]/.test(passwordForm.new_pw), label: "One lowercase (a-z)" },
          ].map(({ test, label }) => (
            <small key={label} className="d-flex align-items-center mb-1">
              <span className={`me-2 ${test ? "text-success" : "text-muted"}`}>
                <i className={`fas fa-${test ? "check-circle" : "circle"} fa-xs`}></i>
              </span>
              <span>{label}</span>
            </small>
          ))}
        </div>
        <div className="col-6">
          {[
            { test: /[0-9]/.test(passwordForm.new_pw), label: "One number (0-9)" },
            { test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passwordForm.new_pw), label: "Special character" },
          ].map(({ test, label }) => (
            <small key={label} className="d-flex align-items-center mb-1">
              <span className={`me-2 ${test ? "text-success" : "text-muted"}`}>
                <i className={`fas fa-${test ? "check-circle" : "circle"} fa-xs`}></i>
              </span>
              <span>{label}</span>
            </small>
          ))}
        </div>
      </div>
    </div>
  );

  const showQAP =
    user?.department_id === DEPT_IT || user?.department_id === DEPT_QAP || user?.vendor_code === "601824" || user?.vendor_code === "600233" || user?.vendor_code === "601824";
  const showBGBTN =
    user?.department_id === DEPT_IT || user?.department_id === DEPT_FI || user?.vendor_code === "601824" || user?.vendor_code === "600233" || user?.vendor_code === "601824";
  const showDrawing =
    user?.department_id === DEPT_IT || user?.department_id === DEPT_DESIGN || user?.vendor_code === "601824" || user?.vendor_code === "600233" || user?.vendor_code === "601824";
  const showBTN = user?.user_type !== USER_VENDOR;
  const showHR =
    user?.department_id === USER_HSL_PURCHASE ||
    user?.department_id === DEPT_FI ||
    user?.department_id === USER_HSL_HR ||
    user?.department_id === DEPT_IT ||
    user?.user_type === USER_VENDOR ||
    user?.department_id === USER_HSL_CONTRACT ||
    user?.vendor_code === "199609";

  return (
    <>
      <nav className="mh-navbar">
        <div className="mh-inner">
          {/* LOGO + TITLE */}
          <div className="mh-brand">
            <Link to="/">
              <img src={logoheader} alt="HSL Logo" className="mh-logo" />
            </Link>
            <div className="mh-title-block">
              <span className="mh-title">{title}</span>
            </div>
          </div>

          {/* NAV LINKS */}
          <div className="mh-nav">
            {/* MY TASK */}
            <Link to="/" className="mh-nav-item" onClick={() => dispatch(poRemoveHandler())}>
              <FaTasks className="mh-nav-icon" />
              <span>MY TASK</span>
            </Link>

            {/* PO LIST */}
            <Link to="/po" className="mh-nav-item">
              <FaFileAlt className="mh-nav-icon" />
              <span>PO LIST</span>
            </Link>

            {/* QAP */}
            {showQAP && (
              <Link to="/dashboard/qa" className="mh-nav-item mh-nav-item--qap">
                <FaCheckCircle className="mh-nav-icon" />
                <span>QAP</span>
              </Link>
            )}

            {/* BG */}
            {showBGBTN && (
              <Link to="/dashboard/bg" className="mh-nav-item mh-nav-item--bg">
                <FaBuilding className="mh-nav-icon" />
                <span>BG</span>
              </Link>
            )}

            {/* BTN */}
            {showBTN && (
              <Link to="/dashboard/btn" className="mh-nav-item mh-nav-item--btn">
                <FaChartLine className="mh-nav-icon" />
                <span>BTN</span>
              </Link>
            )}

            {/* WDC */}
            {showBGBTN && (
              <Link to="/dashboard/wdc" className="mh-nav-item mh-nav-item--wdc">
                <FaFileContract className="mh-nav-icon" />
                <span>WDC</span>
              </Link>
            )}

            {/* DRAWING */}
            {showDrawing && (
              <Link to="/dashboard/drawing" className="mh-nav-item mh-nav-item--drawing">
                <FaPaintBrush className="mh-nav-icon" />
                <span>DRAWING</span>
              </Link>
            )}

            {/* BG EXTENSION */}
            {user?.user_type === 0 && (
              <Link to="/bg-extension" className="mh-nav-item">
                <FaFileAlt className="mh-nav-icon" />
                <span>BG EXT</span>
              </Link>
            )}

            {/* HR COMP */}
            {showHR && (
              <Link to="/contract-cell" className="mh-nav-item mh-nav-item--hr">
                <FaUserTie className="mh-nav-icon" />
                <span>HR COMP</span>
              </Link>
            )}

            {/* SETTING DROPDOWN */}
            <div className="mh-dropdown" onMouseEnter={() => setSettingOpen(true)} onMouseLeave={() => setSettingOpen(false)}>
              <button className="mh-nav-item mh-dropdown-trigger">
                <FaCog className={`mh-nav-icon ${settingOpen ? "mh-cog-open" : "mh-cog-spin"}`} />
                <span>Setting</span>
                <FaChevronDown className={`mh-chevron ${settingOpen ? "mh-chevron-open" : ""}`} />
              </button>
              <div className={`mh-dropdown-menu ${settingOpen ? "mh-dropdown-menu--open" : ""}`}>
                {(user?.vendor_code === "600233" || user?.vendor_code === "602717") && (
                  <Link to="/authorisation" className="mh-dropdown-item">
                    <FaCog size={13} />
                    <span>Authorization</span>
                  </Link>
                )}
                <button className="mh-dropdown-item" onClick={() => setIschangepasswordPopup(true)}>
                  <FaKey size={13} />
                  <span>Change Password</span>
                </button>
              </div>
            </div>
            {/* <Link to="/support" className="mh-nav-item mh-nav-item--support">
              <FaHeadset className="mh-nav-icon" />
              <span>Support</span>
            </Link> */}
          </div>

          {/* USER INFO */}
          <div className="mh-user">
            <div className="mh-user-info">
              <span className="mh-user-label">Username:</span>
              <span className="mh-user-code">{user?.name}</span>
            </div>

            <button className="mh-logout-btn" onClick={handleLogout} title="Logout">
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ===== CHANGE PASSWORD MODAL ===== */}
      {ischangepasswordPopup && (
        <div className="change-password-overlay" onClick={closePasswordPopup}>
          <div className="change-password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FaKey className="me-2" /> Change Password
              </h3>
              <button className="modal-close-btn" onClick={closePasswordPopup}>
                <FaTimes />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                PasswordchangeBtn();
              }}
            >
              <div className="modal-body">
                <div className="form-group mb-3">
                  <label className="form-label">Old Password</label>
                  <div className="input-group">
                    <input
                      type={showOldPassword ? "text" : "password"}
                      name="old_pw"
                      className="form-control"
                      value={passwordForm.old_pw}
                      onChange={handleInputChange}
                      required
                      autoFocus
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowOldPassword(!showOldPassword)}>
                      {showOldPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">New Password</label>
                  <div className="input-group">
                    <input type={showNewPassword ? "text" : "password"} name="new_pw" className="form-control" value={passwordForm.new_pw} onChange={handleInputChange} required />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {renderPasswordStrength()}
                  {renderPasswordRequirements()}
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">Confirm Password</label>
                  <div className="input-group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_pw"
                      className="form-control"
                      value={passwordForm.confirm_pw}
                      onChange={handleInputChange}
                      required
                    />
                    <button type="button" className="btn btn-outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closePasswordPopup}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default MainHeader;
