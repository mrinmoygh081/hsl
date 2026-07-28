import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { toast } from "react-toastify";

import Captcha from "../components/Captcha";

import { apiCallBack } from "../utils/fetchAPIs";
import { formatTime } from "../utils/smallFun";
import { checkPasswordStrength, validatePassword } from "../utils/registrationUtils";
import { getEncryptedPasswordForAPI } from "../utils/encryptionUtils";

export default function Registration() {
  const OTP_VALIDITY = 60;
  const captchaRef = useRef(null);
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // ✅ Read SERVER_ENV from environment variables
  // If you use REACT_APP_SERVER_ENV in your .env file, it will be available.
  // Otherwise, adjust to process.env.SERVER_ENV if your build exposes it.
  const serverEnv = process.env.REACT_APP_SERVER_ENV;
  const isNICEnv = serverEnv === "NIC";

  // State Variables
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [regData, setRegData] = useState({
    user_type: "",
    department: "",
    role: "",
    vendor_code: "",
    otp: "",
    password: "",
    confirmPassword: "",
    subDepartment: "",
  });
  const [canResend, setCanResend] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [subDepartments, setSubDepartments] = useState([]);
  const [timer, setTimer] = useState(OTP_VALIDITY);
  const [captchaData, setCaptchaData] = useState({
    captchaValue: "",
    sessionId: "",
  });
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: "text-secondary",
  });
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showConfirmPasswordField, setShowConfirmPasswordField] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendCaptchaData, setResendCaptchaData] = useState({
    captchaValue: "",
    sessionId: "",
  });
  const resendCaptchaRef = useRef(null);

  // Effects
  useEffect(() => {
    if (regData.department === "3") {
      fetchSubDepartments();
    }
  }, [regData.department]);

  useEffect(() => {
    let interval;
    if (showOtp && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showOtp, timer]);

  useEffect(() => {
    if (regData.password) {
      const strength = checkPasswordStrength(regData.password, regData.vendor_code);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({
        score: 0,
        message: "",
        color: "text-secondary",
      });
    }
  }, [regData.password, regData.vendor_code]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  // API Functions
  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", "auth2/department-master-list", null, token);
      if (res?.status) {
        setDepartments(res.data);
      } else {
        toast.warn(res?.message);
      }
    } catch (error) {
      toast.error("Failed to fetch departments");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await apiCallBack("GET", "po/internalDepartmentList", null, token);
      if (res?.status) {
        setSubDepartments(res.data);
      } else {
        toast.warn(res?.message);
      }
    } catch (error) {
      toast.error("Failed to fetch sub-departments");
    } finally {
      setIsLoading(false);
    }
  };

  // Form Submission Handlers
  const regSubmit = async (e, is_resend = "n") => {
    e.preventDefault();

    if (!captchaData.captchaValue && is_resend !== "y") {
      toast.error("Please enter captcha");
      return;
    }

    setIsLoading(true);
    let payload = buildRegPayload(is_resend);

    try {
      const res = await apiCallBack("POST", "auth2/sendOtp", payload, token);
      if (res?.status) {
        toast.success("OTP sent via mail. Please check your inbox.");
        setShowOtp(true);
        setTimer(OTP_VALIDITY);
        setCanResend(false);
        setCaptchaData({ captchaValue: "", sessionId: "" });
        if (captchaRef.current) captchaRef.current();

        if (is_resend === "y") {
          setShowResendModal(false);
          setResendCaptchaData({ captchaValue: "", sessionId: "" });
        }
      } else {
        toast.warn(res?.message);
        setCaptchaData({ captchaValue: "", sessionId: "" });
      }
    } catch (error) {
      toast.error("Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const otpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = { user_code: regData.vendor_code, otp: regData.otp };
      const res = await apiCallBack("POST", "auth2/otpVefify", payload, token);

      if (res?.status) {
        toast.success("OTP verified successfully");
        setShowPassword(true);
      } else {
        toast.warn(res?.message);
      }
    } catch (error) {
      toast.error("Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordSubmit = async (e) => {
    e.preventDefault();

    // Validate password match
    if (regData.password !== regData.confirmPassword) {
      toast.warn("Passwords do not match. Please check.");
      return;
    }

    // Validate password policy
    if (!validatePassword(regData.password, regData.vendor_code, toast)) {
      return;
    }

    // Check password strength
    if (passwordStrength.score < 3) {
      toast.warn("Password is too weak. Please choose a stronger password.");
      return;
    }

    setIsLoading(true);

    try {
      // ✅ Encrypt the password using AES-CBC (same as login)
      const encryptedPassword = getEncryptedPasswordForAPI(regData.password, "AES_CBC");

      const payload = {
        user_code: regData.vendor_code,
        password: encryptedPassword,
        otp: regData.otp,
        status: "CREATE",
        password_strength: passwordStrength.score,
        encryption_type: "aes_cbc_pkcs7",
      };

      console.log("📤 Registration Payload:", {
        user_code: payload.user_code,
        passwordPreview: payload.password.substring(0, 30) + "...",
      });

      const res = await apiCallBack("POST", "auth2/setPassword", payload, token);

      if (res?.status) {
        toast.success("Password set successfully! Please login with your new credentials.");
        toast.info("Remember: You'll need to change your password every 90 days for security.");
        navigate("/login");
      } else {
        toast.warn(res?.message);
      }
    } catch (error) {
      console.error("❌ Registration Error:", error);
      toast.error("Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper Functions
  const buildRegPayload = (is_resend) => {
    let payload = {
      user_type: regData.user_type,
      user_code: regData.vendor_code,
      captchaValue: is_resend === "y" ? resendCaptchaData.captchaValue : captchaData.captchaValue,
      sessionId: is_resend === "y" ? resendCaptchaData.sessionId : captchaData.sessionId,
      is_resend,
    };

    if (regData.user_type === "GRSE") {
      payload.functional_area = regData.department;
      payload.role = regData.role;

      if (regData.department === "3") {
        payload.sub_dept_id = regData.subDepartment;
      }
    }

    return payload;
  };

  // Event Handlers
  const handleResendOTP = () => {
    setShowResendModal(true);
  };

  const handleResendWithCaptcha = async (e) => {
    e.preventDefault();

    if (!resendCaptchaData.captchaValue) {
      toast.error("Please enter captcha");
      return;
    }

    setResendLoading(true);
    await regSubmit(e, "y");
    setResendLoading(false);
  };

  const handleChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
  };

  const handleCaptchaChange = ({ captchaValue, sessionId }) => {
    setCaptchaData({ captchaValue, sessionId });
  };

  const handleResendCaptchaChange = ({ captchaValue, sessionId }) => {
    setResendCaptchaData({ captchaValue, sessionId });
  };

  const togglePasswordVisibility = () => {
    setShowPasswordField(!showPasswordField);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPasswordField(!showConfirmPasswordField);
  };

  // Render Functions
  const renderUserTypeSection = () => (
    <>
      <div className="fv-row mb-3">
        <label className="form-label fs-6 fw-bolder text-dark">User Type</label>
        <select className="form-select form-control-lg form-control-solid" name="user_type" value={regData.user_type} onChange={handleChange}>
          <option value="">Choose User Type</option>
          {/* ✅ Show Vendor option only when SERVER_ENV = NIC */}
          {isNICEnv && <option value="vendor">Vendor</option>}
          {!isNICEnv && <option value="GRSE">GRSE Employee</option>}
        </select>
      </div>
      {regData.user_type !== "" && (
        <>
          {regData.user_type === "GRSE" && renderGRSEFields()}
          <div className="fv-row mb-3">
            <label className="form-label fs-6 fw-bolder text-dark">{regData.user_type !== "GRSE" ? "Vendor Code" : "MAN Number"}</label>
            <input
              className="form-control form-control-lg form-control-solid"
              type="text"
              name="vendor_code"
              value={regData.vendor_code}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <Captcha onChange={handleCaptchaChange} onRef={captchaRef} />
        </>
      )}
    </>
  );

  const renderGRSEFields = () => (
    <>
      <div className="fv-row mb-3">
        <label className="form-label fs-6 fw-bolder text-dark">Functional Area</label>
        <select className="form-select form-control-lg form-control-solid" name="department" value={regData.department} onChange={handleChange}>
          <option value="">Choose Department Type</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
      {regData.department === "3" && (
        <div className="fv-row mb-3">
          <label className="form-label fs-6 fw-bolder text-dark">Sub Department</label>
          <select className="form-select form-control-lg form-control-solid" name="subDepartment" value={regData.subDepartment} onChange={handleChange}>
            <option value="">Choose Sub Department</option>
            {subDepartments.map((subDept, index) => (
              <option key={index} value={subDept.id}>
                {subDept.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="fv-row mb-3">
        <label className="form-label fs-6 fw-bolder text-dark">Role</label>
        <select className="form-select form-control-lg form-control-solid" name="role" value={regData.role} onChange={handleChange}>
          <option value="">Choose Role</option>
          <option value="1">Nodal Officer</option>
          <option value="2">General User</option>
        </select>
      </div>
    </>
  );

  const renderPasswordField = () => (
    <div className="fv-row mb-3">
      <label className="form-label fs-6 fw-bolder text-dark">Password</label>
      <div className="position-relative">
        <input
          className="form-control form-control-lg form-control-solid input-with-eye-icon"
          type={showPasswordField ? "text" : "password"}
          name="password"
          value={regData.password}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Enter strong password"
        />
        <button type="button" className="eye-icon-button" onClick={togglePasswordVisibility} aria-label={showPasswordField ? "Hide password" : "Show password"}>
          <i className={`fas ${showPasswordField ? "fa-eye-slash" : "fa-eye"}`}></i>
        </button>
      </div>
      {renderPasswordStrength()}
    </div>
  );

  const renderPasswordStrength = () =>
    regData.password && (
      <>
        <div className="mt-2">
          <div className="progress password-strength-progress">
            <div
              className={`progress-bar ${passwordStrength.color.replace("text-", "bg-")}`}
              role="progressbar"
              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              aria-valuenow={passwordStrength.score}
              aria-valuemin="0"
              aria-valuemax="5"
            ></div>
          </div>
          <small className={`mt-1 ${passwordStrength.color}`}>
            <i className={`fas fa-${passwordStrength.score <= 2 ? "exclamation-triangle" : passwordStrength.score <= 3 ? "info-circle" : "check-circle"} me-1`}></i>
            {passwordStrength.message}
          </small>
        </div>
        <div className="mt-2">
          <small className="text-muted">Password must contain:</small>
          <ul className="small text-muted mb-0 ps-3 password-requirements">
            <li className={regData.password.length >= 8 ? "text-success" : ""}>
              <i className={`fas fa-${regData.password.length >= 8 ? "check" : "times"} me-1`}></i>
              Minimum 8 characters
            </li>
            <li className={/[A-Z]/.test(regData.password) ? "text-success" : ""}>
              <i className={`fas fa-${/[A-Z]/.test(regData.password) ? "check" : "times"} me-1`}></i>
              One uppercase letter (A-Z)
            </li>
            <li className={/[a-z]/.test(regData.password) ? "text-success" : ""}>
              <i className={`fas fa-${/[a-z]/.test(regData.password) ? "check" : "times"} me-1`}></i>
              One lowercase letter (a-z)
            </li>
            <li className={/[0-9]/.test(regData.password) ? "text-success" : ""}>
              <i className={`fas fa-${/[0-9]/.test(regData.password) ? "check" : "times"} me-1`}></i>
              One number (0-9)
            </li>
            <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regData.password) ? "text-success" : ""}>
              <i className={`fas fa-${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(regData.password) ? "check" : "times"} me-1`}></i>
              One special character
            </li>
          </ul>
        </div>
      </>
    );

  const renderConfirmPasswordField = () => (
    <div className="fv-row mb-3">
      <label className="form-label fs-6 fw-bolder text-dark">Confirm Password</label>
      <div className="position-relative">
        <input
          className={`form-control form-control-lg form-control-solid input-with-eye-icon ${
            regData.confirmPassword && regData.password !== regData.confirmPassword ? "is-invalid" : ""
          }`}
          type={showConfirmPasswordField ? "text" : "password"}
          name="confirmPassword"
          value={regData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          placeholder="Confirm your password"
        />
        <button
          type="button"
          className="eye-icon-button"
          onClick={toggleConfirmPasswordVisibility}
          aria-label={showConfirmPasswordField ? "Hide confirm password" : "Show confirm password"}
        >
          <i className={`fas ${showConfirmPasswordField ? "fa-eye-slash" : "fa-eye"}`}></i>
        </button>
      </div>
      {regData.confirmPassword && regData.password !== regData.confirmPassword && (
        <div className="invalid-feedback d-block">
          <small>
            <i className="fas fa-exclamation-triangle me-1"></i>Passwords do not match
          </small>
        </div>
      )}
    </div>
  );

  const renderOTPTimer = () => (
    <div className="text-center mb-3">
      <div className={`timer-container ${timer < 10 ? "timer-expired" : ""}`}>
        {!canResend ? (
          <div>
            <span className="text-dark">⏰ Time Remaining: </span>
            <span className={`fw-bold ${timer < 10 ? "text-danger" : "text-primary"}`}>{formatTime(timer)}</span>
            <div className="mt-1">
              <small className="text-muted">Resend OTP available after timer expires</small>
            </div>
          </div>
        ) : (
          <div>
            <span className="text-dark">⌛ OTP Expired</span>
            <div className="mt-2">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleResendOTP}>
                Resend OTP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="d-flex flex-column flex-root registration-page">
      <div className="d-flex flex-column flex-column-fluid bgi-position-y-bottom position-x-center bgi-no-repeat bgi-size-contain bgi-attachment-fixed">
        <div className="d-flex flex-center flex-column flex-column-fluid p-10 pb-lg-20">
          <h3 className="text-center">
            Hindustan Shipyard Limited <br /> (A GOVT.OF INDIA UNDERTAKING)
          </h3>
          <div className="registration-container p-10 p-lg-15 mx-auto">
            <form onSubmit={showPassword ? passwordSubmit : showOtp ? otpSubmit : regSubmit} className="registration-form form w-100">
              <div className="text-center mb-3">
                <img src={require("../images/image001.jpg")} alt="GRSE Logo" className="img-fluid mb-2 company-logo" />
                <h3 className="text-dark registration-header">Registration Request for OBPS Portal</h3>
              </div>

              {!showOtp && !showPassword && renderUserTypeSection()}
              {showOtp && !showPassword && (
                <>
                  <div className="fv-row mb-3">
                    <label className="form-label fs-6 fw-bolder text-dark">OTP</label>
                    <input
                      className="form-control form-control-lg form-control-solid"
                      type="text"
                      name="otp"
                      value={regData.otp}
                      onChange={handleChange}
                      autoComplete="off"
                      placeholder="Enter 6-digit OTP"
                      maxLength="6"
                    />
                  </div>
                  {renderOTPTimer()}
                </>
              )}
              {showPassword && (
                <>
                  {renderPasswordField()}
                  {renderConfirmPasswordField()}
                  <div className="alert alert-info security-alert">
                    <small>
                      <i className="fas fa-shield-alt me-2"></i>
                      <strong>Security Policy:</strong> Password must be changed every 90 days. Avoid using personal information.
                    </small>
                  </div>
                </>
              )}

              <div className="text-center">
                <button type="submit" className="btn btn-lg btn-primary fw-bolder me-3 my-2 mb-5 w-100" disabled={isLoading || (showPassword && passwordStrength.score < 3)}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm loading-spinner"></span>
                      Loading...
                    </>
                  ) : showPassword ? (
                    "SET SECURE PASSWORD"
                  ) : showOtp ? (
                    "VERIFY OTP"
                  ) : (
                    "REGISTER"
                  )}
                </button>

                <p className="fs-16">
                  If you're already registered, Please{" "}
                  <button type="button" className="btn_simple" onClick={() => navigate("/login")}>
                    <u>LOGIN</u>
                  </button>
                  .
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Resend OTP Modal */}
      <Modal show={showResendModal} onHide={() => setShowResendModal(false)} centered size="sm" className="registration-modal">
        <Modal.Header closeButton className="border-bottom-0 pb-0">
          <Modal.Title className="text-center w-100">
            <div className="text-primary">
              <i className="fas fa-redo-alt fa-lg mb-2"></i>
            </div>
            <h5 className="mb-0">Resend OTP</h5>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <div className="text-center mb-3">
            <p className="text-muted mb-0">Please verify you're not a robot</p>
          </div>
          <form onSubmit={handleResendWithCaptcha}>
            <div className="mb-3">
              <Captcha onChange={handleResendCaptchaChange} onRef={resendCaptchaRef} compact={true} />
            </div>
            <div className="d-flex justify-content-center gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary px-4" onClick={() => setShowResendModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-4" disabled={resendLoading}>
                {resendLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane me-2"></i>
                    Resend OTP
                  </>
                )}
              </button>
            </div>
          </form>
          <div className="text-center mt-3">
            <small className="text-muted">New OTP will be valid for {OTP_VALIDITY} seconds</small>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
