import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import SkeletonLoader from "../loader/SkeletonLoader";
import DynamicButton from "../Helpers/DynamicButton";
import { apiCallBack } from "../utils/fetchAPIs";
import { reConfirm } from "../utils/reConfirm";
import { USER_HSL_HR } from "../constants/userConstants";

// Holiday calendar: maintained by HR, visible to everyone. Used for working-day BG expiry alerts.
const HolidayCalendar = () => {
  const { token, user } = useSelector((state) => state.auth);
  const isHR = user?.department_id === USER_HSL_HR;
  const fileRef = useRef(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ holiday_date: "", description: "" });
  const [file, setFile] = useState(null);

  const getHolidays = async () => {
    setLoading(true);
    const res = await apiCallBack("GET", `holiday?year=${year}`, null, token);
    setHolidays(res?.status ? res.data || [] : []);
    setLoading(false);
  };

  useEffect(() => {
    getHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const addHoliday = async () => {
    if (!form.holiday_date) return toast.warn("Please choose a date.");
    const res = await apiCallBack("POST", "holiday", form, token);
    if (res?.status) {
      toast.success(res.message);
      setForm({ holiday_date: "", description: "" });
      getHolidays();
    } else {
      toast.warn(res?.message);
    }
  };

  const uploadHolidays = async () => {
    if (!file) return toast.warn("Please choose an excel file.");
    const fd = new FormData();
    fd.append("file", file);
    const res = await apiCallBack("POST", "holiday/upload", fd, token);
    if (res?.status) {
      toast.success(res.message);
      setFile(null);
      if (fileRef.current) fileRef.current.value = null;
      getHolidays();
    } else {
      toast.warn(res?.message);
    }
  };

  const removeHoliday = async (id) => {
    const res = await apiCallBack("DELETE", `holiday/${id}`, null, token);
    if (res?.status) {
      toast.success(res.message);
      getHolidays();
    } else {
      toast.warn(res?.message);
    }
  };

  const formatDay = (d) => {
    const date = new Date(`${String(d).slice(0, 10)}T00:00:00`);
    return isNaN(date.getTime()) ? d : date.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="d-flex flex-column flex-root">
      <div className="page d-flex flex-row flex-column-fluid">
        <div className="d-flex flex-column flex-row-fluid">
          <MainHeader title={"Holiday Calendar"} />
          <div className="content d-flex flex-column flex-column-fluid">
            <div className="post d-flex flex-column-fluid">
              <div className="container">
                <div className="row g-5 g-xl-8">
                  {isHR && (
                    <div className="col-12">
                      <div className="card-body p-3 border rounded">
                        <div className="row">
                          <div className="col-md-3 col-12 mb-2">
                            <label className="form-label">Holiday Date</label>
                            <input type="date" className="form-control" value={form.holiday_date} onChange={(e) => setForm({ ...form, holiday_date: e.target.value })} />
                          </div>
                          <div className="col-md-5 col-12 mb-2">
                            <label className="form-label">Description</label>
                            <input type="text" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                          </div>
                          <div className="col-md-2 col-12 mb-2 d-flex align-items-end">
                            <DynamicButton label="ADD" onClick={addHoliday} className="btn-primary" />
                          </div>
                        </div>
                        <div className="row mt-2">
                          <div className="col-md-6 col-12 mb-2">
                            <label className="form-label">Bulk upload (Excel columns: holiday_date, description)</label>
                            <input type="file" ref={fileRef} className="form-control" accept=".xlsx" onChange={(e) => setFile(e.target.files[0])} />
                          </div>
                          <div className="col-md-2 col-12 mb-2 d-flex align-items-end">
                            <DynamicButton label="UPLOAD" onClick={uploadHolidays} className="btn-info" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="col-12">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <button className="btn btn-sm btn-light" onClick={() => setYear(year - 1)}>
                        ‹
                      </button>
                      <b>{year}</b>
                      <button className="btn btn-sm btn-light" onClick={() => setYear(year + 1)}>
                        ›
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-striped table-bordered table_height">
                        <thead>
                          <tr className="border-0">
                            <th>Date</th>
                            <th>Description</th>
                            {isHR && <th>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={3}>
                                <SkeletonLoader col={2} row={4} />
                              </td>
                            </tr>
                          ) : holidays.length ? (
                            holidays.map((h) => (
                              <tr key={h.id}>
                                <td>{formatDay(h.holiday_date)}</td>
                                <td>{h.description}</td>
                                {isHR && (
                                  <td>
                                    <button
                                      className="btn btn-sm btn-danger"
                                      onClick={() => reConfirm({ file: true }, () => removeHoliday(h.id), "You're going to remove this holiday. Please confirm!")}
                                    >
                                      REMOVE
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center">
                                No holidays for {year}.
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
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default HolidayCalendar;
