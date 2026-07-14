import React, { useState } from "react";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import Footer from "../components/Footer";
import MainHeader from "../components/MainHeader";
import DynamicButton from "../Helpers/DynamicButton";

const Pofetch = () => {
  const [loading, setLoading] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const { token } = useSelector((state) => state.auth);

  const handlePoFetch = async () => {
    if (!poNumber) {
      toast.error("Please enter a PO number");
      return;
    }

    setLoading(true);
    try {
      const response = await apiCallBack("POST", "sap/pull/po", { docNo: poNumber }, token);
      if (response.status) {
        toast.success("PO fetched successfully");
      } else {
        toast.error(response.message || "Failed to fetch PO");
      }
    } catch (error) {
      toast.error("Error fetching PO: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <MainHeader title="PO PULL" />
      <div className="flex flex-col items-center justify-center flex-grow px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 ">
            <input
              id="poNumber"
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter PO Number"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <DynamicButton
              label={loading ? "FETCHING..." : "SUBMIT"}
              onClick={handlePoFetch}
              className="btn fw-bold btn-primary w-full sm:w-auto px-6 py-2 xxxx"
              disabled={loading}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Pofetch;
