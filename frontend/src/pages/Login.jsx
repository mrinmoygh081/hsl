import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { loginHandler } from "../redux/slices/loginSlice";
import { useNavigate } from "react-router-dom";
import Captcha from "../components/Captcha";
import { formatTimeOTP } from "../utils/smallFun";
import { apiCallBack } from "../utils/fetchAPIs";
import { getEncryptedPasswordForAPI } from "../utils/encryptionUtils";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const captchaRef = useRef(null);
  const TIMER_TIME_IN_SECOND = 90;

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: login details, 2: OTP verification
  const [timer, setTimer] = useState(TIMER_TIME_IN_SECOND); // 90 second in seconds
  const [canResend, setCanResend] = useState(false);
  const [isResendMode, setIsResendMode] = useState(false); // NEW: Track resend mode explicitly

  // Store user credentials for OTP verification
  const [userCredentials, setUserCredentials] = useState({
    user_code: "",
    encryptedPassword: "",
  });

  const [loginData, setLoginData] = useState({
    vendor_code: "",
    password: "",
    captchaValue: "",
    sessionId: "",
  });

  const [otpData, setOtpData] = useState({
    otp: "",
  });

  // Test encryption on component mount
  useEffect(() => {
    const testPassword = "test123";
    const encrypted = getEncryptedPasswordForAPI(testPassword, "AES_CBC");
    console.log("🔐 Crypto-JS Encryption Test:", {
      original: testPassword,
      encrypted: encrypted.substring(0, 40) + "...",
      keyLength: process.env.REACT_APP_ENCRYPTION_KEY?.length || 32,
      algorithm: "AES-CBC-PKCS7",
    });
  }, []);

  // Timer effect for OTP
  useEffect(() => {
    let intervalId;

    if (step === 2 && timer > 0) {
      intervalId = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer <= 0 && step === 2) {
      toast.warn("OTP has expired. Please request a new OTP.");
      setCanResend(true);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, timer]);

  const handleCaptchaChange = useCallback(({ captchaValue, sessionId }) => {
    setLoginData((prev) => ({
      ...prev,
      captchaValue,
      sessionId,
    }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Allow only numbers
    setOtpData({ otp: value });
  };

  const handleSendOtp = async (e, isResend = false) => {
    e.preventDefault();

    // Validation for step 1
    if (!loginData.vendor_code.trim()) {
      toast.error("Please enter your user code");
      return;
    }

    // Password validation skip for resend (already encrypted and stored)
    if (!isResend && !loginData.password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    if (!loginData.captchaValue.trim()) {
      toast.error("Please enter captcha");
      return;
    }

    setIsLoading(true);

    try {
      // For resend, use stored credentials; for initial send, encrypt fresh
      let encryptedPassword;

      if (isResend && userCredentials.encryptedPassword) {
        // Use previously encrypted password
        encryptedPassword = userCredentials.encryptedPassword;
      } else {
        // Fresh login - encrypt password
        encryptedPassword = getEncryptedPasswordForAPI(loginData.password, "AES_CBC");

        if (!encryptedPassword) {
          throw new Error("Encryption failed");
        }
      }

      // API payload
      const payload = {
        user_type: process.env.REACT_APP_ENV || "login",
        vendor_code: loginData.vendor_code.trim(),
        captchaValue: loginData.captchaValue.trim(),
        sessionId: loginData.sessionId,
        is_resend: isResend ? "y" : "n",
        password: encryptedPassword,
      };

      console.log("📤 Send OTP Payload:", {
        user_code: payload.vendor_code,
        passwordPreview: payload.password.substring(0, 30) + "...",
        isResend: payload.is_resend,
      });

      const res = await apiCallBack("POST", "auth2/login", payload, null);

      if (res?.status) {
        // SUCCESS: Store credentials only on successful OTP send
        setUserCredentials({
          user_code: loginData.vendor_code.trim(),
          encryptedPassword: encryptedPassword,
        });

        toast.success(res?.message || (isResend ? "OTP resent successfully" : "OTP sent to your registered email/phone"));
        setStep(2);
        setTimer(TIMER_TIME_IN_SECOND);
        setCanResend(false);
        setOtpData({ otp: "" });
        setIsResendMode(false); // Reset resend mode on success
      } else {
        toast.warn(res?.message || "Failed to send OTP");
        // Don't store credentials on failure
      }
    } catch (error) {
      console.error("❌ Send OTP Error:", error);
      toast.error("Error sending OTP. Please try again.");
      // Don't store credentials on error
    } finally {
      setIsLoading(false);
      // Refresh captcha
      if (captchaRef.current) {
        try {
          captchaRef.current();
        } catch (captchaError) {
          console.warn("Captcha refresh error:", captchaError);
        }
      }
      // Clear captcha data
      setLoginData((prev) => ({
        ...prev,
        captchaValue: "",
        sessionId: "",
      }));
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otpData.otp) {
      toast.error("Please enter OTP");
      return;
    }

    if (otpData.otp.length !== 6) {
      toast.error("Please enter valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Verify OTP using auth2/otpVefify
      const otpPayload = {
        vendor_code: userCredentials.user_code,
        otp: otpData.otp,
      };

      const loginRes = await apiCallBack("POST", "auth2/verify-login-otp", otpPayload, null);

      if (loginRes?.status) {
        dispatch(loginHandler(loginRes));
        toast.success("Login successful!");

        // Redirect after short delay to Task List dashboard
        setTimeout(() => {
          navigate("/dashboard/task-list", { replace: true });
        }, 500);
      } else {
        toast.warn(loginRes?.message || "Login failed after OTP verification");
      }
    } catch (error) {
      console.error("❌ Verify OTP Error:", error);

      let errorMessage = "Error verifying OTP. Please try again.";
      if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
        errorMessage = "Network error. Please check your internet connection.";
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      // Clear OTP field after verification attempt
      setOtpData({ otp: "" });
    }
  };

  const handleResendOtp = (e) => {
    if (canResend) {
      // Go back to step 1 to show captcha
      setStep(1);
      setTimer(TIMER_TIME_IN_SECOND);
      setCanResend(false);
      setOtpData({ otp: "" });
      setIsResendMode(true); // Set resend mode to true
      toast.info("Please verify captcha to resend OTP");
    }
  };

  const handleBackToLogin = () => {
    setStep(1);
    setTimer(TIMER_TIME_IN_SECOND);
    setCanResend(false);
    setOtpData({ otp: "" });
    setIsResendMode(false); // Reset resend mode
    setUserCredentials({
      user_code: "",
      encryptedPassword: "",
    });
    setLoginData({
      vendor_code: "",
      password: "",
      captchaValue: "",
      sessionId: "",
    });
  };

  return (
    <div className="d-flex flex-column flex-root" style={{ height: "100vh" }}>
      <div className="d-flex flex-column flex-column-fluid bgi-position-y-bottom position-x-center bgi-no-repeat bgi-size-contain bgi-attachment-fixed">
        <div className="d-flex flex-center flex-column flex-column-fluid p-10 pb-lg-20">
          <h3 className="text-center mb-4">
            Garden Reach Shipbuilders & Engineers Ltd. <br /> (A GOVT.OF INDIA UNDERTAKING)
          </h3>

          <div className="w-lg-500px bg-body rounded shadow-sm p-10 p-lg-15 mx-auto border">
            <div className="text-center mb-10">
              <img src={require("../images/image001.jpg")} alt="GRSE Logo" className="img-fluid mb-4" style={{ width: "120px", height: "auto" }} />
              <h3 className="text-dark mb-2">Login to OBPS Portal</h3>

              {/* Stepper */}
              <div className="d-flex justify-content-center mb-8">
                <div className="stepper-item me-4">
                  <div className={`stepper-circle ${step >= 1 ? "bg-primary" : "bg-secondary"}`}>1</div>
                  <div className="stepper-label">Credentials</div>
                </div>
                <div className="stepper-item">
                  <div className={`stepper-circle ${step >= 2 ? "bg-primary" : "bg-secondary"}`}>2</div>
                  <div className="stepper-label">OTP Verify</div>
                </div>
              </div>
            </div>

            <form onSubmit={step === 1 ? handleSendOtp : handleVerifyOtp} className="form w-100" noValidate>
              {/* Step 1: Login Details */}
              {step === 1 && (
                <>
                  {/* Resend OTP Indicator */}
                  {isResendMode && userCredentials.user_code && (
                    <div className="alert alert-warning mb-6 d-flex align-items-center">
                      <i className="fas fa-redo me-3 fs-4"></i>
                      <div>
                        <strong>Resending OTP</strong> for user: <strong>{userCredentials.user_code}</strong>
                        <br />
                        <small>Please verify captcha below to receive new OTP</small>
                      </div>
                    </div>
                  )}

                  <div className="fv-row mb-8">
                    <label className="form-label fs-6 fw-bolder text-dark required">User Code</label>
                    <input
                      className="form-control form-control-lg form-control-solid"
                      type="text"
                      name="vendor_code"
                      autoComplete="username"
                      value={loginData.vendor_code}
                      onChange={handleInputChange}
                      disabled={isLoading || (isResendMode && userCredentials.user_code)}
                      placeholder="Enter your user code"
                      required
                    />
                  </div>

                  {/* Show password field only for initial login, not for resend */}
                  {!isResendMode && (
                    <div className="fv-row mb-8">
                      <div className="d-flex justify-content-between mb-2">
                        <label className="form-label fw-bolder text-dark fs-6 mb-0 required">Password</label>
                        <button type="button" className="btn btn-link p-0" onClick={() => navigate("/forget-password")} disabled={isLoading}>
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        className="form-control form-control-lg form-control-solid"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={loginData.password}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                  )}

                  <div className="mb-10">
                    <Captcha onChange={handleCaptchaChange} onRef={captchaRef} disabled={isLoading} />
                  </div>
                </>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <>
                  <div className="text-center mb-8">
                    <div className="alert alert-info d-flex align-items-center">
                      <i className="fas fa-info-circle me-2 fs-4"></i>
                      <div>
                        <strong>OTP Sent!</strong>
                        <div className="small">Check your registered email/phone for the OTP</div>
                      </div>
                    </div>

                    <div className="text-dark mb-4">
                      <i className="fas fa-user me-2"></i>
                      Logging in as: <strong>{userCredentials.user_code}</strong>
                    </div>
                  </div>

                  <div className="fv-row mb-8">
                    <label className="form-label fs-6 fw-bolder text-dark required">Enter 6-Digit OTP</label>
                    <div className="otp-input-container">
                      <input
                        className="form-control form-control-lg form-control-solid text-center otp-input"
                        type="text"
                        name="otp"
                        value={otpData.otp}
                        onChange={handleOtpChange}
                        disabled={isLoading}
                        autoComplete="off"
                        required
                        placeholder="_ _ _ _ _ _"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </div>
                    <div className="text-muted mt-2 fs-7">
                      <i className="fas fa-shield-alt me-1"></i>
                      Enter the 6-digit OTP sent to your registered contact
                    </div>
                  </div>

                  {/* Timer and Resend Section */}
                  <div className="d-flex justify-content-between align-items-center mb-10 p-3 bg-light rounded">
                    <div className="text-dark fw-bold">
                      <i className="fas fa-clock me-2"></i>
                      <span className="timer-text">Time remaining:</span>
                      <span className="ms-2 text-danger fw-bold fs-5">{formatTimeOTP(timer)}</span>
                    </div>

                    <button
                      type="button"
                      className={`btn ${canResend ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={handleResendOtp}
                      disabled={(!canResend && timer > 0) || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Processing
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>
                          {canResend ? "Resend OTP" : "Resend Disabled"}
                        </>
                      )}
                    </button>
                  </div>

                  {timer <= 30 && timer > 0 && (
                    <div className="alert alert-warning mb-4">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      OTP will expire in {formatTimeOTP(timer)}. Verify soon!
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <button type="button" className="btn btn-outline-primary" onClick={handleBackToLogin} disabled={isLoading}>
                      <i className="fas fa-arrow-left me-2"></i>
                      Back to Credentials
                    </button>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="text-center mb-8">
                <button type="submit" className="btn btn-lg btn-primary w-100 mb-4 py-3" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {step === 1 ? "Sending OTP..." : "Verifying..."}
                    </>
                  ) : step === 1 ? (
                    <>
                      <i className="fas fa-paper-plane me-2"></i>
                      {isResendMode ? "RESEND OTP" : "SEND OTP FOR LOGIN"}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt me-2"></i>
                      VERIFY OTP & LOGIN
                    </>
                  )}
                </button>

                {step === 1 && (
                  <div className="text-muted fs-7 mt-2">
                    <i className="fas fa-lock me-1"></i>
                    Secure login with OTP verification
                  </div>
                )}
              </div>

              {/* Registration Link */}
              <div className="text-center border-top pt-6">
                <p className="fs-16 mb-2">
                  Don't have an account?{" "}
                  <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={() => navigate("/registration")} disabled={isLoading}>
                    <u className="fw-bold">REGISTER HERE</u>
                  </button>
                </p>
                <p className="fs-14 text-muted mb-0">
                  <i className="fas fa-question-circle me-1"></i>
                  Need help? Contact support
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Stepper CSS */}
      <style jsx>{`
        .stepper-item {
          text-align: center;
          position: relative;
          min-width: 120px;
        }
        .stepper-item:not(:last-child):after {
          content: "";
          position: absolute;
          top: 20px;
          left: 70px;
          width: 80px;
          height: 2px;
          background-color: #dee2e6;
          z-index: -1;
        }
        .stepper-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          margin: 0 auto 8px;
          border: 3px solid white;
          box-shadow: 0 0 0 2px #dee2e6;
          transition: all 0.3s ease;
        }
        .stepper-circle.bg-primary {
          box-shadow: 0 0 0 2px #0d6efd;
        }
        .stepper-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .required:after {
          content: " *";
          color: #dc3545;
        }

        /* OTP input styling */
        .otp-input-container {
          position: relative;
        }
        .otp-input {
          letter-spacing: 15px;
          font-size: 28px;
          font-weight: bold;
          padding: 10px 20px;
          background: #f8f9fa;
          border: 2px solid #dee2e6;
        }
        .otp-input:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
          background: white;
        }

        .timer-text {
          font-size: 14px;
        }

        @media (max-width: 576px) {
          .stepper-item:not(:last-child):after {
            width: 60px;
            left: 60px;
          }
          .otp-input {
            letter-spacing: 10px;
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}
