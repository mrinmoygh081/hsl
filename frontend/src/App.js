import "./App.css";
import Layout from "./Layout";
import { useEffect } from "react";
import { initializeTokenRefresh } from "./utils/tokenRefresh";
import "sweetalert2/dist/sweetalert2.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

function App() {
  useEffect(() => {
    // Initialize auto token refresh on app load
    initializeTokenRefresh();
  }, []);

  return (
    <>
      <Layout />
    </>
  );
}

export default App;
