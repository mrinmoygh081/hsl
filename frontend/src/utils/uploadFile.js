import { toast } from "react-toastify";
import { apiCallBack } from "./fetchAPIs";

export const uploadFileStream = async ({ file, token, vendorCode, type = "QAP", onSuccess }) => {
  const FALLBACK_ERROR_MSG = "File not uploaded. Please try again.";

  const formData = new FormData();
  formData.append("type", type);
  formData.append("ref", vendorCode || "");
  formData.append("file", file);

  try {
    const res = await apiCallBack("POST", "upload/fileStream", formData, token);

    if (res?.status === true && res?.data?.filePath) {
      toast.success(`${res?.message} ✅`);

      onSuccess?.({
        file_name: file.name,
        fileName: res.data.fileName,
        file_path: res.data.filePath,
        filePath: res.data.filePath,
        file_id: res.data.id,
        id: res.data.id,
      });

      return res.data;
    }

    toast.error(res?.message || FALLBACK_ERROR_MSG);
    return null;
  } catch (error) {
    toast.error(FALLBACK_ERROR_MSG);
    return null;
  }
};
