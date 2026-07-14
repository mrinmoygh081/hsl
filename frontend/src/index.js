import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { persistor, store } from "./redux/store";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { PersistGate } from "redux-persist/integration/react";
import LoadingView from "./components/LoadingView";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <PersistGate loading={<LoadingView />} persistor={persistor}>
      <App />
      <ToastContainer />
    </PersistGate>
  </Provider>
);
