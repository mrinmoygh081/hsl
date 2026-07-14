import React, { useEffect, useState } from "react";

const FileUploadProgressBar = ({ file, isUploading }) => {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // file change hone par reset
    setProgress(0);
    setDone(false);
  }, [file]);

  useEffect(() => {
    if (!isUploading) return;

    setProgress(0);
    setDone(false);

    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15 + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setDone(true);
      }
      setProgress(Math.floor(current));
    }, 120);

    return () => clearInterval(interval);
  }, [isUploading]);

  if (!file) return null;

  const maxSizeMB = 5;
  const fileSizeMB = file.size / (1024 * 1024);
  const isOverLimit = fileSizeMB > maxSizeMB;

  const barColor = isOverLimit ? "#ef4444" : done ? "#22c55e" : "#2563eb";
  const label = isOverLimit
    ? `⚠ File too large! (${fileSizeMB.toFixed(2)} MB / ${maxSizeMB} MB max)`
    : !isUploading && !done
      ? `${fileSizeMB.toFixed(2)} MB — Click Upload to proceed`
      : done
        ? `✔ Uploaded successfully (${fileSizeMB.toFixed(2)} MB)`
        : `Uploading... ${progress}%`;

  return (
    <div style={{ marginTop: "6px" }}>
      <div
        style={{
          height: "6px",
          backgroundColor: "#e5e7eb",
          borderRadius: "999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: isOverLimit ? "100%" : !isUploading && !done ? "0%" : `${progress}%`,
            backgroundColor: barColor,
            borderRadius: "999px",
            transition: "width 0.15s ease",
          }}
        />
      </div>
      <div
        style={{
          fontSize: "11px",
          marginTop: "3px",
          fontWeight: 500,
          color: isOverLimit ? "#ef4444" : done ? "#16a34a" : "#2563eb",
        }}
      >
        {label}
      </div>
    </div>
  );
};

export default FileUploadProgressBar;
