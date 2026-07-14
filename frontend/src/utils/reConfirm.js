import Swal from "sweetalert2";

export const reConfirm = (recheck, handleFun, warningText) => {
  const { file } = recheck;

  if (file) {
    Swal.fire({
      title: "Are you sure?",
      text: warningText,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "custom-swal-popup",
        title: "custom-swal-title",
        content: "custom-swal-content",
        confirmButton: "custom-swal-confirm-btn",
        cancelButton: "custom-swal-cancel-btn",
      },
    }).then((result) => {
      if (result.isConfirmed) {
        handleFun();
      }
    });
  } else {
    Swal.fire({
      title: "Warning",
      text: warningText,
      icon: "warning",
      confirmButtonText: "OK",
      customClass: {
        popup: "custom-swal-popup",
        title: "custom-swal-title",
        content: "custom-swal-content",
        confirmButton: "custom-swal-confirm-btn",
      },
    });
  }
};
