import React from "react";

const SkeletonLoader = ({ col, row }) => {
  return (
    <div className="skeleton-loaderone">
      {Array.from({ length: row }, (_, i) => (
        <div className="skeleton-item" key={i}>
          {Array.from({ length: col }, (_, index) => (
            <div className="skeleton-cell" key={index}></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
