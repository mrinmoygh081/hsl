import Image from "next/image";
import React from "react";

function ScreenPreview({ imgSrc }) {
  return (
    <div className="screen_box shadow">
      {imgSrc ? (
        <div className="screen_img">
          <Image src={imgSrc} alt="" width={500} height={300} />
        </div>
      ) : (
        <div className="screen_img">
          <span>Screen Preview</span>
        </div>
      )}
      <p className="text-center">Screen Name 1</p>
    </div>
  );
}

export default ScreenPreview;
