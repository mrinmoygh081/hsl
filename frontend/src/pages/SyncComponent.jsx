import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";
import { reConfirm } from "../utils/reConfirm";
import { toast } from "react-toastify";
import { apiCallBack } from "../utils/fetchAPIs";
import DynamicButton from "../Helpers/DynamicButton";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SyncComponent = () => {
  const { user, token, userType } = useSelector((state) => state.auth);
  const [selectedDate, setSelectedDate] = useState({
    dataSync: new Date(new Date().setDate(new Date().getDate() - 1)),
    fileSync: new Date(new Date().setDate(new Date().getDate() - 1)),
  });
  const [selectedDateDown, setSelectedDateDown] = useState({
    datasync_date: new Date(new Date().setDate(new Date().getDate() - 1)),
    filesync_date: new Date(new Date().setDate(new Date().getDate() - 1)),
  });

  const dispatch = useDispatch();

  const logOutFun = () => {
    dispatch(logoutHandler());
    dispatch(poRemoveHandler());
  };

  const DataUploadHndlar = async () => {
    try {
      console.log("formData?.data", selectedDate?.dataSync);
      if (!selectedDate?.dataSync || selectedDate?.dataSync === "") {
        return toast.info("Zip File is mandatory.");
      }
      let payload = {
        from_date: selectedDate?.dataSync,
      };
      const resp = await apiCallBack("POST", "sync/sync_unzip", payload, token);
      if (resp.status) {
        console.log(resp, "resp file dataSync");
        toast.success(resp.message || "Data has been synced");
      } else {
        toast.info(resp.message);
      }
    } catch (error) {
      toast.error("Sync failed: " + (error.response?.data?.message || error.message));
    }
  };

  const fileDownloadHandler = async () => {
    try {
      // Directly access the sync_date field and convert it to the required format
      let payload = {
        sync_date: new Date(selectedDateDown.filesync_date).getTime(),
      };

      const response = await apiCallBack("POST", "sync/sync_file_zip", payload, token);

      // Show success message
      toast.success(response.data.message || "File sync successful");
    } catch (error) {
      // Show error message
      toast.error("File sync failed: " + (error.response?.data?.message || error.message));
    }
  };
  // downlod file
  const uplodFileDownloadHandler = async () => {
    try {
      // Directly access the sync_date field and convert it to the required format
      let payload = {
        datasync_date: new Date(selectedDateDown.datasync_date).getTime(),
      };

      const response = await apiCallBack("POST", "sync/sync_download ", payload, token);

      // Show success message
      toast.success(response.data.message || "File sync successful");
    } catch (error) {
      // Show error message
      toast.error("File sync failed: " + (error.response?.data?.message || error.message));
    }
  };

  const uploadFileHandler = async () => {
    try {
      if (!selectedDate?.fileSync || selectedDate?.fileSync === "") {
        return toast.info("Zip File is mandatory.");
      }
      let payload = {
        from_date: selectedDate?.fileSync,
      };
      console.log("payload", payload);
      const resp = await apiCallBack("POST", "sync/sync_file_upload", payload, token);
      if (resp.status) {
        console.log(resp, "resp file dataSync");
        toast.success(resp.message || "File has been synced");
      } else {
        toast.info(resp.message);
      }
    } catch (error) {
      toast.error("File sync failed: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="container mt-5">
      <div className="card">
        <div className="card-header text-center" style={{ margin: "20px auto" }}>
          <img src={require("../images/image001.jpg")} alt="Logo" className="img-fluid" style={{ width: "60px", marginRight: "10px" }} />
          <h1 className="card-title mt-3" style={{ marginBottom: "10px" }}>
            Hindustan Shipyard Limited <br /> (A GOVT.OF INDIA UNDERTAKING)
          </h1>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h3>Upload Unsynced Data</h3>
              <ol>
                <li>
                  Copy all required folders (named according to the date of the dump) stored on the other server in a specific path
                  (/var/www/html/obps/obps_backend/sync/unsyncedFiles/"DD-MM-YYYY").
                </li>
                <li>Transfer the folders from the other server to the server where this website is running.</li>
                <li>
                  Open a specific folder path to this server <br />
                  (/var/www/html/obps/obps_backend/sync/otherServerData/Data){" "}
                </li>
                <li>Paste the copied folders into the specified folder.</li>
              </ol>
              <label htmlFor="">Select From Date You want to Sync Data:</label>
              <DatePicker
                selected={selectedDate?.dataSync}
                onChange={(date) => setSelectedDate({ ...selectedDate, dataSync: date })}
                className="form-control my-2"
                placeholderText="Select Date"
                maxDate={new Date(new Date().setDate(new Date().getDate() - 1))}
              />
              <DynamicButton label="UPLOAD DATA" onClick={() => DataUploadHndlar()} className="btn btn-primary btn-sm mt-2" />
            </div>
            <div className="col-md-6">
              <h3>Upload Unsynced File</h3>
              <ol>
                <li>
                  Copy all required folders (named according to the date of the dump) stored on the other server in a specific path
                  (/var/www/html/obps/obps_backend/sync/unsyncedFiles/"DD-MM-YYYY").
                </li>
                <li>Transfer the folders from the other server to the server where this website is running.</li>
                <li>
                  Open a specific folder path to this server <br />
                  (/var/www/html/obps/obps_backend/sync/otherServerData/Files){" "}
                </li>
                <li>Paste the copied folders into the specified folder.</li>
              </ol>
              <label htmlFor="">Select From Date You want to Sync File:</label>
              <DatePicker
                selected={selectedDate?.fileSync}
                onChange={(date) => setSelectedDate({ ...selectedDate, fileSync: date })}
                className="form-control my-2"
                placeholderText="Select Date"
                maxDate={new Date(new Date().setDate(new Date().getDate() - 1))}
              />
              <DynamicButton label="UPLOAD FILE" onClick={uploadFileHandler} className="btn btn-primary btn-sm mt-2" />
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex mt-3">
        <button className="btn btn-danger ms-auto" onClick={() => reConfirm({ file: true }, logOutFun, "You're going to Logout!")}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default SyncComponent;
