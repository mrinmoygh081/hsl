import axios from "axios";
import { toast } from "react-toastify";
import { store } from "../redux/store";
import { logoutHandler } from "../redux/slices/loginSlice";
import { poRemoveHandler } from "../redux/slices/poSlice";

let isUnauthorizedRedirecting = false;

const handleUnauthorized = () => {
  if (isUnauthorizedRedirecting) return;
  isUnauthorizedRedirecting = true;

  try {
    const isLoggedIn = store.getState()?.auth?.isLoggedIn;
    if (isLoggedIn) {
      store.dispatch(logoutHandler());
      store.dispatch(poRemoveHandler());
    }
  } catch (e) {
    // Ignore redux dispatch errors during logout/redirect
  }

  toast.error("Session expired. Please login again.");
  window.location.href = "/";
};

export const postAPI = (path, body, token) => {
  // console.log(`${process.env.REACT_APP_BACKEND_API}/${path}`);

  let config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${process.env.REACT_APP_BACKEND_API}${path}`,
    withCredentials: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    data: JSON.stringify(body),
  };

  return axios(config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return { error, success: false, message: "Unauthorized" };
      }
      toast.error("Something went wrong! Please contact to the administrator");
      console.log(error);
      return { error, success: false, message: error?.response?.data?.message || "Something went wrong!" };
    });
};

// Refresh Token API Function - Moved to tokenRefresh.js

export const apiCallBack = async (method, slug, payload, token) => {
  let path = `${process.env.REACT_APP_BACKEND_API}${slug}`;

  let config = {
    method: method,
    maxBodyLength: Infinity,
    url: path,
    withCredentials: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Conditionally set the Content-Type based on the payload
    ...(payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : { "Content-Type": "application/json" }),
    data: payload,
  };

  return axios
    .request(config)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      console.log("eror", error);
      if (error?.response?.status === 401) {
        handleUnauthorized();
        return { error, success: false, message: "Unauthorized" };
      }
      return { error, success: false, message: error?.response?.data?.message || "Something went wrong! Please try again later." };
    });
};

// export const getAPI = (path, token) => {
//   let config = {
//     method: "GET",
//     maxBodyLength: Infinity,
//     url: `${process.env.REACT_APP_BACKEND_API}/${path}`,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//   };

//   return axios(config)
//     .then((response) => {
//       return response.data;
//     })
//     .catch((error) => {
//       console.log(error.response.data.errors);
//       toast.error(
//         "Something went wrong! Please contact to the administrator",
//         error.response.data.errors
//       );
//     });
// };

// export const putAPI = (path, body, token) => {
//   let config = {
//     method: "PUT",
//     maxBodyLength: Infinity,
//     url: `${process.env.REACT_APP_BACKEND_API}/${path}`,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//     data: JSON.stringify(body),
//   };

//   return axios(config)
//     .then((response) => {
//       return response.data;
//     })
//     .catch((error) => {
//       toast.error("Something went wrong! Please contact to the administrator");
//       console.log(error);
//     });
// };

// export const deleteAPI = (path, token) => {
//   let config = {
//     method: "DELETE",
//     url: `${process.env.REACT_APP_BACKEND_API}/${path}`,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${token}`,
//     },
//   };

//   return axios(config)
//     .then((response) => {
//       return response.data;
//     })
//     .catch((error) => {
//       toast.error("Something went wrong! Please contact to the administrator");
//       console.log(error);
//     });
// };
