import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { MdDeleteOutline } from "react-icons/md";
import { uploadFileStream } from "../utils/uploadFile";
import { apiCallBack } from "../utils/fetchAPIs";
import Swal from "sweetalert2";
import FileUploadInfoIcon from "../Helpers/FileUploadInfoIcon";

const FileUploadWithProgress = ({ token, vendorCode, onUploadSuccess, onDelete, uploadedFile, showInfoIcon = true, warningText }) => {
  const fileRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.warning("Please upload a PDF file!");
      fileRef.current.value = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("File exceeds 5MB size limit!");
      fileRef.current.value = null;
      return;
    }

    setIsUploading(true);
    setProgress(0);

    // Progress animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const result = await uploadFileStream({
        file,
        token,
        vendorCode,
        type: "BTN",
        onSuccess: (uploadedFile) => {
          clearInterval(interval);
          setProgress(100);
          onUploadSuccess(uploadedFile);
        },
      });

      if (!result) {
        clearInterval(interval);
        setProgress(0);
      }
    } catch (error) {
      clearInterval(interval);
      setProgress(0);
      toast.error("Upload failed!");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = null;
    }
  };

  const handleDelete = async () => {
    if (!uploadedFile?.file_id) {
      toast.error("File ID not found!");
      return;
    }

    // SweetAlert2 Confirmation
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This file will be permanently deleted and cannot be recovered!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      const res = await apiCallBack("POST", "upload/delete", { id: uploadedFile.file_id }, token);

      if (res?.status) {
        Swal.fire({
          title: "Deleted!",
          text: "File has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
        setProgress(0);
        onDelete();
      } else {
        Swal.fire({
          title: "Failed!",
          text: res?.message || "Failed to delete file!",
          icon: "error",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Error!",
        text: "Something went wrong while deleting the file.",
        icon: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ minWidth: "220px" }}>
      {!uploadedFile && (
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <small className="text-muted">PDF only, max 5MB</small>
            {showInfoIcon && <FileUploadInfoIcon warningText={warningText} />}
          </div>
          <input type="file" ref={fileRef} accept=".pdf" className="form-control form-control-sm" onChange={handleFileSelect} disabled={isUploading} />
        </div>
      )}

      {/* Progress Bar - sirf uploading ke waqt dikhega */}
      {isUploading && (
        <div className="mt-2">
          <div
            style={{
              width: "100%",
              height: "6px",
              backgroundColor: "#e0e0e0",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                backgroundColor: progress < 40 ? "#f44336" : progress < 70 ? "#ff9800" : progress < 100 ? "#2196f3" : "#4caf50",
                borderRadius: "10px",
                transition: "width 0.2s ease, background-color 0.3s ease",
              }}
            />
          </div>
          <small className="text-muted mt-1 d-block">Uploading... {progress}%</small>
        </div>
      )}

      {/* Uploaded File - sirf tab dikhega jab upload ho gaya */}
      {uploadedFile && !isUploading && (
        <div
          className="d-flex align-items-center justify-content-between mt-1 p-2"
          style={{
            backgroundColor: "#f0fff4",
            border: "1px solid #c3e6cb",
            borderRadius: "6px",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            {/* Green checkmark */}
            <span
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: "#28a745",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#155724",
                maxWidth: "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={uploadedFile.file_name}
            >
              {uploadedFile.file_name}
            </span>
          </div>

          {/* Delete Icon - sirf uploaded file ke saath dikhega */}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              background: "none",
              border: "none",
              cursor: isDeleting ? "not-allowed" : "pointer",
              color: isDeleting ? "#aaa" : "#dc3545",
              padding: "0 4px",
            }}
            title="Delete file"
          >
            {isDeleting ? <span className="spinner-border spinner-border-sm" role="status" /> : <MdDeleteOutline size={20} />}
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploadWithProgress;
