import { useCallback, useEffect, useState } from "react";
import { HiOutlineRefresh } from "react-icons/hi";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";

export default function Captcha({ onChange, onRef = {} }) {
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaValue, setCaptchaValue] = useState("");
  const [sessionId, setSessionId] = useState("");

  const loadCaptcha = useCallback(async () => {
    try {
      const res = await apiCallBack("GET", "auth2/captcha", null, null);
      if (res?.status && res?.data) {
        setCaptchaSvg(res.data?.captchaSvg);
        setSessionId(res.data?.sessionId);

        // send updated values to parent
        onChange({
          captchaValue,
          sessionId: res.data?.sessionId,
        });
      }
    } catch (err) {
      toast.error("Error loading captcha");
    }
  }, []);

  useEffect(() => {
    if (onRef) {
      onRef.current = loadCaptcha;
    }
  }, [loadCaptcha]);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleCaptchaInput = (e) => {
    const val = e.target.value;
    setCaptchaValue(val);

    // pass values to parent
    onChange({
      captchaValue: val,
      sessionId,
    });
  };

  return (
    <div className="fv-row mb-3">
      <label className="form-label fw-bolder text-dark fs-6">Captcha</label>

      <div className="row justify-content-center">
        <div className="col-10">
          <div className="border p-2 mb-2" dangerouslySetInnerHTML={{ __html: captchaSvg }} />
        </div>
        <div className="col-2">
          <button type="button" className="btn btn-link p-0 mb-2 fs-20" onClick={loadCaptcha}>
            <HiOutlineRefresh />
          </button>
        </div>
      </div>

      <input className="form-control form-control-lg form-control-solid" type="text" placeholder="Enter Captcha" value={captchaValue} onChange={handleCaptchaInput} />
    </div>
  );
}
