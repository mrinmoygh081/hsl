import React, { useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { FaPlus, FaTrash } from "react-icons/fa";
import HrSearchableSelect from "../components/HrSearchableSelect";

const RaiseDemand = () => {
  const [isPopup, setIsPopup] = useState(false);
  const [dynamicFields, setDynamicFields] = useState([{ bank: null, quantity: "" }]);

  const { id } = useParams();

  const bankOptions = [
    { value: "102", label: "50" },
    { value: "103", label: "60" },
  ];

  const handleBankChange = (selectedOption, index) => {
    const updatedDynamicFields = [...dynamicFields];
    updatedDynamicFields[index].bank = selectedOption; // selectedOption is full object or null
    setDynamicFields(updatedDynamicFields);
  };

  const handleTransactionIdChange = (event, index) => {
    const enteredValue = event.target.value;

    // Check if the entered value is negative
    if (enteredValue < 0) {
      // You can show a message or handle the case as needed
      // For now, preventing the state update for negative values
      return;
    }

    const updatedDynamicFields = [...dynamicFields];
    updatedDynamicFields[index].quantity = enteredValue;
    setDynamicFields(updatedDynamicFields);
  };

  const handleAddField = () => {
    setDynamicFields([...dynamicFields, { bank: null, quantity: "" }]);
  };

  const handleRemoveField = (index) => {
    console.log(index, "indexindex");
    const updatedDynamicFields = [...dynamicFields];
    updatedDynamicFields.splice(index, 1);
    setDynamicFields(updatedDynamicFields);
  };

  const handleClosePopup = () => {
    setIsPopup(false);
    setDynamicFields([{ bank: null, quantity: "" }]);
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Raise Demand"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        <button onClick={() => setIsPopup(true)} className="btn fw-bold btn-primary">
                          Raise Demand
                        </button>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  <th>Item number </th>
                                  <th>Material code</th>
                                  <th>Description</th>
                                  <th>Quanity</th>
                                  <th>UOM</th>
                                  <th className="min-w-150px"> Contractual delivery date</th>
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                <tr>
                                  <td className="table_center">{"10"}</td>
                                  <td>{"32"}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>

      <div className={isPopup ? "popup active" : "popup"}>
        <div className="card card-xxl-stretch mb-5 mb-xxl-8">
          <div className="card-header border-0 pt-5">
            <h3 className="card-title align-items-start flex-column">
              <span className="card-label fw-bold fs-3 mb-1">Raise Demand</span>
            </h3>
            <button className="btn fw-bold btn-danger" onClick={handleClosePopup}>
              Close
            </button>
          </div>

          {dynamicFields.map((field, index) => (
            <div className="row" key={index}>
              <div className="col-md-6 col-12">
                <div className="mb-3">
                  <label className="form-label">Select Item</label>
                  <HrSearchableSelect
                    options={bankOptions}
                    value={field.bank ? field.bank.value : ""}
                    onChange={(selectedOption) => handleBankChange(selectedOption, index)}
                    placeholder="Select item"
                    isClearable={true}
                  />
                </div>
              </div>
              <div className="col-md-5 col-11">
                <div className="mb-3">
                  <label className="form-label">Quantity</label>
                  <input type="number" className="form-control" value={field.quantity} onChange={(event) => handleTransactionIdChange(event, index)} />
                </div>
              </div>
              <div className="col-md-1 col-1 align-self-center">
                {dynamicFields.length > 1 && (
                  <>
                    <FaTrash className="cursor-pointer" onClick={() => handleRemoveField(index)} />
                    &nbsp;&nbsp;
                  </>
                )}
                <FaPlus className="cursor-pointer" onClick={handleAddField} />
              </div>
            </div>
          ))}

          <div className="row">
            <div className="col-12">
              <div className="mb-3 d-flex justify-content-between">
                <button className="btn fw-bold btn-primary" type="submit">
                  UPDATE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RaiseDemand;
