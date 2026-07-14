import React, { useState } from "react";
import FileUploadInfoPopup from "./FileUploadInfoPopup";

// Ye export bahut saari files mein use ho raha hai - isko mat hatao
export const BTN_UPLOAD_WARNING = (
  <>
    Please upload only valid and relevant documents.
    <br />
    Incorrect, incomplete, or unclear files may result in
    <br />
    rejection, processing delays, or requests for re-submission.
  </>
);

const FileUploadInfoIcon = ({ warningText = BTN_UPLOAD_WARNING }) => {
  const [showInfo, setShowInfo] = useState(false);

  const handleOpen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowInfo(true);
  };

  const handleClose = () => setShowInfo(false);

  return (
    <>
      <span
        onClick={handleOpen}
        style={{
          cursor: "pointer",
          color: "#6b7280",
          display: "inline-flex",
          alignItems: "center",
          padding: "2px",
          marginLeft: "6px",
        }}
        title="View upload instructions"
        role="button"
        aria-label="Show file upload instructions"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShowInfo(true);
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>

      <FileUploadInfoPopup show={showInfo} onClose={handleClose} warningText={warningText} />
    </>
  );
};

export default FileUploadInfoIcon;
