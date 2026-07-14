import React, { useEffect } from "react";

const DEFAULT_TYPES = ["PDF"];

const FileUploadInfoPopup = ({
  show,
  onClose,
  title = "File Upload Instructions",
  allowedTypes = DEFAULT_TYPES,
  maxSizeMB = 5,
  warningText = "Uploading incorrect or unrelated documents may lead to rejection. Please ensure the document is relevant to the field being filled.",
}) => {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  if (!show) return null;

  const instructions = [
    `Maximum file size allowed is ${maxSizeMB} MB per upload.`,
    "File name should not contain spaces or special characters.",
    <>
      Please ensure that the document is clearly scanned, fully legible,
      <br />
      and properly sanitized before submission.
    </>,
    "Only one file can be uploaded at a time.",
    "Delete and re-upload if any correction is needed.",
  ];

  return (
    <>
      <style>
        {`
          .upload-info-overlay{
            position:fixed;
            inset:0;
            background:rgba(0,0,0,.45);
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:9999;
          }

          .upload-info-modal{
            width:450px;
            max-width:90vw;
            background:#fff;
            border-radius:12px;
            overflow:hidden;
            box-shadow:0 10px 30px rgba(0,0,0,.25);
          }

          .upload-info-header{
            padding:14px 16px;
            display:flex;
            align-items:center;
            justify-content:space-between;
            border-bottom:1px solid #e5e7eb;
            background:#f8fafc;
          }

          .upload-info-title-wrap{
            display:flex;
            align-items:center;
            gap:10px;
          }

          .upload-info-icon{
            font-size:22px;
          }

          .upload-title{
            margin:0;
            font-size:18px;
            font-weight:600;
            color:#1e293b;
          }

          .upload-subtitle{
            font-size:12px;
            color:#64748b;
          }

          .upload-close{
            border:none;
            background:none;
            font-size:20px;
            cursor:pointer;
            color:#64748b;
          }

          .upload-info-body{
            padding:16px;
          }

          .upload-section{
            font-size:12px;
            font-weight:700;
            color:#64748b;
            margin-bottom:10px;
            text-transform:uppercase;
          }

          .upload-chip{
            display:inline-block;
            padding:6px 12px;
            background:#eff6ff;
            color:#2563eb;
            border-radius:20px;
            font-size:13px;
            font-weight:600;
          }

          .upload-divider{
            border:none;
            border-top:1px solid #e5e7eb;
            margin:14px 0;
          }

          .upload-row{
            display:flex;
            gap:10px;
            margin-bottom:10px;
          }

          .upload-check{
            color:#2563eb;
            font-weight:bold;
            flex-shrink:0;
          }

          .upload-row p{
            margin:0;
            font-size:13px;
            color:#334155;
            line-height:1.5;
          }

          .upload-warning{
            margin-top:14px;
            padding:12px;
            background:#fff8e6;
            border:1px solid #facc15;
            border-radius:8px;
            display:flex;
            gap:8px;
          }

          .upload-warning p{
            margin:0;
            font-size:12px;
            line-height:1.5;
            color:#92400e;
          }

          .upload-info-footer{
            padding:12px 16px;
            border-top:1px solid #e5e7eb;
            text-align:right;
          }

          .upload-btn{
            padding:8px 20px;
            border:none;
            border-radius:6px;
            background:#2563eb;
            color:white;
            cursor:pointer;
            font-size:13px;
            font-weight:600;
          }

          .upload-btn:hover{
            background:#1d4ed8;
          }
        `}
      </style>

      <div
        className="upload-info-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="upload-info-modal">
          <div className="upload-info-header">
            <div className="upload-info-title-wrap">
              <span className="upload-info-icon">📄</span>

              <div>
                <h3 className="upload-title">{title}</h3>
                <div className="upload-subtitle">Please read before uploading</div>
              </div>
            </div>

            <button className="upload-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="upload-info-body">
            <div className="upload-section">Allowed File Types</div>

            <span className="upload-chip">{allowedTypes.join(", ")}</span>

            <hr className="upload-divider" />

            <div className="upload-section">Instructions</div>

            {instructions.map((item, index) => (
              <div key={index} className="upload-row">
                <span className="upload-check">✓</span>
                <p>{item}</p>
              </div>
            ))}

            <div className="upload-warning">
              <span>⚠️</span>
              <p>{warningText}</p>
            </div>
          </div>

          <div className="upload-info-footer">
            <button className="upload-btn" onClick={onClose}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileUploadInfoPopup;
