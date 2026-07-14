import React, { useEffect, useRef, useState } from "react";
import { apiCallBack } from "../utils/fetchAPIs";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Captcha from "../components/Captcha";
import { getEncryptedPasswordForAPI } from "../utils/encryptionUtils";
// 👇 Import password utilities
import { checkPasswordStrength, validatePassword } from "../utils/registrationUtils";
// Optional: import icons if you use react-icons; here we use Font Awesome via CDN (assumed available)
// If not, you can use simple text or install react-icons.

const ForgatePassword = () => {
  const OTP_VALIDITY = Number(process.env.REACT_APP_OTP_VALID) || 60; // ensure number
  const captchaRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    vendorCode: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [otpTimer, setOtpTimer] = useState(OTP_VALIDITY);
  const [canResend, setCanResend] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [captchaData, setCaptchaData] = useState({
    captchaValue: "",
    sessionId: "",
  });

  // 👇 New state for password strength and visibility
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    message: "",
    color: "text-secondary",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCaptchaChange = ({ captchaValue, sessionId }) => {
    setCaptchaData({ captchaValue, sessionId });
  };

  // Handle vendor code submission to request OTP
  const handleVendorCodeSubmit = async (e, is_resend = "n") => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      user_code: formData.vendorCode,
      captchaValue: captchaData.captchaValue,
      sessionId: captchaData.sessionId,
      is_resend,
    };
    const res = await apiCallBack("POST", "auth2/forgotPasswordOtp", payload, token);
    setIsLoading(false);

    if (res?.status) {
      toast.success("OTP sent successfully. Please check your email.");
      setOtpSent(true);
      setOtpTimer(OTP_VALIDITY);
      setCanResend(false);
    } else {
      toast.warn(res?.message);
    }
    // refresh captcha
    if (captchaRef.current) captchaRef.current();
  };

  // Handle OTP submission to verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = { user_code: formData.vendorCode, otp: formData.otp };
    const res = await apiCallBack("POST", "auth2/otpVefify", payload, token);
    setIsLoading(false);

    if (res?.status) {
      toast.success("OTP verified successfully.");
      setOtpVerified(true);
    } else {
      toast.warn(res?.message);
    }
  };

  // 👇 Effect to check password strength when newPassword changes
  useEffect(() => {
    if (formData.newPassword) {
      const strength = checkPasswordStrength(formData.newPassword, formData.vendorCode);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({
        score: 0,
        message: "",
        color: "text-secondary",
      });
    }
  }, [formData.newPassword, formData.vendorCode]);

  // Handle password reset submission (with validation + encryption)
  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // 1. Validate password match
    if (formData.newPassword !== formData.confirmPassword) {
      toast.warning("Passwords do not match. Please check!");
      setIsLoading(false);
      return;
    }

    // 2. Validate password policy using shared utility
    if (!validatePassword(formData.newPassword, formData.vendorCode, toast)) {
      setIsLoading(false);
      return;
    }

    // 3. Check password strength (minimum score 3)
    if (passwordStrength.score < 3) {
      toast.warn("Password is too weak. Please choose a stronger password.");
      setIsLoading(false);
      return;
    }

    try {
      // 🔐 Encrypt the new password before sending
      const encryptedPassword = getEncryptedPasswordForAPI(formData.newPassword, "AES_CBC");

      if (!encryptedPassword) {
        throw new Error("Password encryption failed");
      }

      const payload = {
        user_code: formData.vendorCode,
        password: encryptedPassword, // 👈 Send encrypted password
        otp: formData.otp,
        status: "UPDATE",
      };

      const res = await apiCallBack("POST", "auth2/setPassword", payload, token);

      if (res?.status) {
        toast.success(res.message);
        navigate("/login");
      } else {
        toast.warn(res?.message);
      }
    } catch (error) {
      console.error("❌ Password Reset Encryption Error:", error);
      toast.error("Error processing request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Timer effect for OTP
  useEffect(() => {
    let interval = null;

    if (otpSent && !canResend) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [otpSent, canResend]);

  // 👇 Render password strength indicator (similar to Registration)
  const renderPasswordStrength = () =>
    formData.newPassword && (
      <>
        <div className="mt-2">
          <div className="progress password-strength-progress" style={{ height: "6px" }}>
            <div
              className={`progress-bar ${passwordStrength.color.replace("text-", "bg-")}`}
              role="progressbar"
              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
              aria-valuenow={passwordStrength.score}
              aria-valuemin="0"
              aria-valuemax="5"
            ></div>
          </div>
          <small className={`mt-1 d-block ${passwordStrength.color}`}>
            <i className={`fas fa-${passwordStrength.score <= 2 ? "exclamation-triangle" : passwordStrength.score <= 3 ? "info-circle" : "check-circle"} me-1`}></i>
            {passwordStrength.message}
          </small>
        </div>
        <div className="mt-2">
          <small className="text-muted">Password must contain:</small>
          <ul className="small text-muted mb-0 ps-3 password-requirements">
            <li className={formData.newPassword.length >= 8 ? "text-success" : ""}>
              <i className={`fas fa-${formData.newPassword.length >= 8 ? "check" : "times"} me-1`}></i>
              Minimum 8 characters
            </li>
            <li className={/[A-Z]/.test(formData.newPassword) ? "text-success" : ""}>
              <i className={`fas fa-${/[A-Z]/.test(formData.newPassword) ? "check" : "times"} me-1`}></i>
              One uppercase letter (A-Z)
            </li>
            <li className={/[a-z]/.test(formData.newPassword) ? "text-success" : ""}>
              <i className={`fas fa-${/[a-z]/.test(formData.newPassword) ? "check" : "times"} me-1`}></i>
              One lowercase letter (a-z)
            </li>
            <li className={/[0-9]/.test(formData.newPassword) ? "text-success" : ""}>
              <i className={`fas fa-${/[0-9]/.test(formData.newPassword) ? "check" : "times"} me-1`}></i>
              One number (0-9)
            </li>
            <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword) ? "text-success" : ""}>
              <i className={`fas fa-${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.newPassword) ? "check" : "times"} me-1`}></i>
              One special character
            </li>
          </ul>
        </div>
      </>
    );

  return (
    <div className="d-flex flex-column flex-root" style={{ height: "100vh" }}>
      <div className="d-flex flex-column flex-column-fluid bgi-position-y-bottom position-x-center bgi-no-repeat bgi-size-contain bgi-attachment-fixed">
        <div className="d-flex flex-center flex-column flex-column-fluid p-10 pb-lg-20">
          <h3 className="text-center">
            Garden Reach Shipbuilders & Engineers Ltd. <br /> (A GOVT. OF INDIA UNDERTAKING)
          </h3>
          <div className="w-lg-500px bg-body rounded shadow-sm p-10 p-lg-15 mx-auto border">
            {!otpSent && (
              <form onSubmit={handleVendorCodeSubmit} className="form w-100">
                <div className="text-center mb-3">
                  <img src={require("../images/image001.jpg")} alt="" className="img-fluid mb-2" style={{ width: "120px" }} />
                  <h3 className="text-dark">Reset Your Password</h3>
                  <div className="fv-row mb-3 text-start">
                    <label className="form-label fs-6 fw-bolder">User Code</label>
                    <input
                      className="form-control form-control-lg form-control-solid"
                      type="text"
                      name="vendorCode"
                      autoComplete="off"
                      value={formData.vendorCode}
                      onChange={(e) => setFormData({ ...formData, vendorCode: e.target.value })}
                    />
                  </div>

                  <div className="text-start">
                    <Captcha onChange={handleCaptchaChange} onRef={captchaRef} />
                  </div>
                </div>
                <div className="text-center">
                  <button type="submit" className="btn btn-lg btn-primary w-100 mb-5" disabled={isLoading}>
                    {!isLoading ? <span className="indicator-label">SUBMIT</span> : <span className="indicator-label">Please wait...</span>}
                  </button>
                  <p className="fs-16">
                    If you don’t want to change your password,{" "}
                    <button type="button" className="btn_simple" onClick={() => navigate("/login")}>
                      <u>LOGIN</u>
                    </button>
                    .{" "}
                  </p>
                </div>
              </form>
            )}

            {otpSent && !otpVerified && (
              <form onSubmit={handleOtpSubmit} className="form w-100">
                <div className="fv-row mb-3">
                  <label className="form-label fs-6 fw-bolder text-dark">Enter OTP</label>
                  <input
                    className="form-control form-control-lg form-control-solid"
                    type="text"
                    name="otp"
                    autoComplete="off"
                    value={formData.otp}
                    onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  />
                  <div className="text-muted mt-2">OTP is valid for {`${OTP_VALIDITY / 60}`} minutes.</div>
                </div>
                <div className="text-center">
                  <button type="submit" className="btn btn-lg btn-primary w-100 mb-5" disabled={isLoading}>
                    {!isLoading ? <span className="indicator-label">VERIFY OTP</span> : <span className="indicator-label">Please wait...</span>}
                  </button>
                </div>
                <div className="text-center mt-3">
                  {!canResend ? (
                    <span className="text-muted">Resend OTP in {otpTimer}s</span>
                  ) : (
                    <button type="button" className="btn btn-link p-0" onClick={(e) => handleVendorCodeSubmit(e, "y")}>
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            )}

            {otpVerified && (
              <form onSubmit={handlePasswordResetSubmit} className="form w-100">
                {/* New Password field with visibility toggle */}
                <div className="fv-row mb-3">
                  <label className="form-label fs-6 fw-bolder text-dark">New Password</label>
                  <div className="position-relative">
                    <input
                      className="form-control form-control-lg form-control-solid input-with-eye-icon"
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      autoComplete="off"
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Enter strong password"
                    />
                    <button
                      type="button"
                      className="eye-icon-button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent" }}
                    >
                      <i className={`fas ${showNewPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {renderPasswordStrength()}
                </div>

                {/* Confirm Password field with visibility toggle */}
                <div className="fv-row mb-3">
                  <label className="form-label fs-6 fw-bolder text-dark">Confirm New Password</label>
                  <div className="position-relative">
                    <input
                      className={`form-control form-control-lg form-control-solid input-with-eye-icon ${
                        formData.confirmPassword && formData.newPassword !== formData.confirmPassword ? "is-invalid" : ""
                      }`}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      autoComplete="off"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="eye-icon-button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent" }}
                    >
                      <i className={`fas ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                  {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                    <div className="invalid-feedback d-block">
                      <small>
                        <i className="fas fa-exclamation-triangle me-1"></i>Passwords do not match
                      </small>
                    </div>
                  )}
                </div>

                {/* Security info alert */}
                <div className="alert alert-info security-alert">
                  <small>
                    <i className="fas fa-shield-alt me-2"></i>
                    <strong>Security Policy:</strong> Password must be changed every 90 days. Avoid using personal information.
                  </small>
                </div>

                <div className="text-center">
                  <button type="submit" className="btn btn-lg btn-primary w-100 mb-5" disabled={isLoading || (formData.newPassword && passwordStrength.score < 3)}>
                    {!isLoading ? <span className="indicator-label">RESET PASSWORD</span> : <span className="indicator-label">Please wait...</span>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgatePassword;
