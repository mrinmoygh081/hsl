import React, { Fragment, useEffect, useState } from "react";
import Footer from "../components/Footer";
import SideBar from "../components/SideBar";
import Header from "../components/Header";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiCallBack } from "../utils/fetchAPIs";
import { toast } from "react-toastify";
import { USER_PPNC_DEPARTMENT } from "../constants/userConstants";
import { checkTypeArr } from "../utils/smallFun";
import { convertToEpoch, formatDate } from "../utils/getDateTimeNow";
import ReactDatePicker from "react-datepicker";
import { groupedByRefNo } from "../utils/groupedByReq";
import { clrLegend } from "../utils/clrLegend";
import { FaMinus, FaPlus } from "react-icons/fa";
import SkeletonLoader from "../loader/SkeletonLoader";
import DynamicButton from "../Helpers/DynamicButton";
import "react-datepicker/dist/react-datepicker.css";

const DemandManagement = () => {
  let line_item_fields = {
    line_item_no: "",
    request_amount: "",
  };

  let initialFormData = {
    action_type: "",
    remarks: "",
    status: "",
    delivery_date: "",
    demand: [line_item_fields],
  };

  const [isPopup, setIsPopup] = useState(false);
  const [isSecPopup, setIsSecPopup] = useState(false);
  const [data, setData] = useState([]);
  const [lineItemData, setLineItemData] = useState([]);
  const [availableAmount, setAvailableAmount] = useState(null);
  const [description, setDescription] = useState("");
  const [materialCode, setMaterialCode] = useState("");
  const [unit, setUnit] = useState("");
  const [viewData, setViewData] = useState(null);
  const { id } = useParams();
  const [groupedData, setGroupedData] = useState([]);
  // const [dynamicFields, setDynamicFields] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([line_item_fields]);
  const [isLoading, setIsLoading] = useState(false);

  const { user, token } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState(initialFormData);

  const getData = async () => {
    setIsLoading(true);
    try {
      const data = await apiCallBack(
        "GET",
        `po/demandeManagement/list?poNo=${id}`,
        null,
        token
      );
      if (data?.status) {
        setData(data?.data);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error fetching drawing list:", error);
      setIsLoading(false);
    }
  };

  const getPOLineItemData = async () => {
    try {
      const data = await apiCallBack("GET", `po/details?id=${id}`, null, token);
      if (data?.status) {
        let lineItem = data?.data[0]?.materialResult;
        setLineItemData(lineItem);
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
    }
  };

  // const getAvailableAmount = async (item) => {
  //   try {
  //     const data = await apiCallBack(
  //       "GET",
  //       `po/demandeManagement/getRestAmount?po_no=${id}&line_item_no=${item}`,
  //       null,
  //       token
  //     );
  //     if (data?.status) {
  //       setAvailableAmount(data?.data?.rest_amount);
  //       setDescription(data?.data?.description);
  //       setMaterialCode(data?.data?.matarial_code);
  //       setUnit(data?.data?.unit);
  //     }
  //   } catch (error) {
  //     console.error("Error fetching WDC list:", error);
  //   }
  // };

  const getAvailableAmount = async (item) => {
    try {
      const res = await apiCallBack(
        "GET",
        `po/demandeManagement/getRestAmount?po_no=${id}&line_item_no=${item}`,
        null,
        token
      );
      if (res?.status) {
        return {
          description: res?.data?.description,
          rest_amount: res?.data?.rest_amount,
          unit: res?.data?.unit,
          matarial_code: res?.data?.matarial_code,
        };
      }
    } catch (error) {
      console.error("Error fetching WDC list:", error);
      return null;
    }
  };

  useEffect(() => {
    getData();
    getPOLineItemData();
  }, [id, token]);

  useEffect(() => {
    if (formData?.line_item_no !== "") {
      getAvailableAmount(formData?.line_item_no);
    }
  }, [formData?.line_item_no]);

  useEffect(() => {
    if (data && data.length > 0) {
      const gData = groupedByRefNo(data);
      setGroupedData(gData);
    }
  }, [data]);

  const actionHandler = async (flag) => {
    try {
      const { action_type, remarks, delivery_date, request_amount } = formData;

      if (action_type.trim() === "") {
        return toast.warn("Action Type is required!");
      }

      if (parseInt(request_amount) > parseInt(availableAmount)) {
        return toast.warn(
          "Demand quantity should be less than or equal to available quantity!"
        );
      }

      // Prepare demand array
      const demand = dynamicFields.map((field) => ({
        line_item_no: field.line_item_no,
        request_amount: field.request_amount,
      }));

      const formObj = {
        purchasing_doc_no: id,
        demand,
        delivery_date: convertToEpoch(delivery_date),
        status: flag,
        action_type,
        remarks,
      };

      const response = await apiCallBack(
        "POST",
        "po/demandeManagement/insert",
        formObj,
        token
      );

      if (response?.status) {
        toast.success(response?.message);
        setIsPopup(false);
        setFormData({
          action_type: "",
          remarks: "",
          line_item_no: "",
          request_amount: "",
          delivery_date: "",
        });
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error uploading:", error);
    }
  };

  const actionHandlerReceiver = async (flag) => {
    try {
      const { recived_quantity, remarks } = formData;

      // Parse the JSON string into an array of objects
      const demandArray = JSON.parse(viewData.demand);

      // Check if demandArray is an array
      if (!Array.isArray(demandArray)) {
        console.error("viewData.demand is not a valid array:", demandArray);
        return;
      }

      // Map over the demandArray to create the demand array
      const demand = demandArray.map((item) => ({
        line_item_no: item.line_item_no,
        recived_quantity: item.request_amount,
      }));

      // Prepare the payload
      const payload = {
        reference_no: viewData.reference_no,
        purchasing_doc_no: id,
        demand,
        status: "RECEIVED",
        remarks,
        recived_quantity: recived_quantity,
      };

      // Call the API with the payload
      const response = await apiCallBack(
        "POST",
        "po/demandeManagement/insert",
        payload,
        token
      );

      if (response?.status) {
        toast.success(response?.message);
        setIsSecPopup(false);
        // Reset form data
        setFormData({
          ...formData,
          recived_quantity: "",
          remarks: "",
        });
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error uploading:", error);
    }
  };

  const addNewField = () => {
    setDynamicFields([
      ...dynamicFields,
      {
        line_item_no: "",
        request_amount: "",
        availableAmount: "",
        description: "",
        materialCode: "",
        unit: "",
      },
    ]);

    // Also call setFormData to check if the new request_amount is valid
    setFormData({
      ...formData,
      request_amount: "", // Clear request_amount in formData
    });
  };

  // Function to fetch and set values for Available Amount, Description, Material Code, and Unit
  const setDynamicValues = async (index, line_item_no) => {
    try {
      const data = await apiCallBack(
        "GET",
        `po/demandeManagement/getRestAmount?po_no=${id}&line_item_no=${line_item_no}`,
        null,
        token
      );
      if (data?.status) {
        const updatedFields = [...dynamicFields];
        updatedFields[index].availableAmount = data?.data?.rest_amount;
        updatedFields[index].description = data?.data?.description;
        updatedFields[index].materialCode = data?.data?.matarial_code;
        updatedFields[index].unit = data?.data?.unit;
        setDynamicFields(updatedFields);
      } else {
        // If data is not available or API call fails, set availableAmount to null
        const updatedFields = [...dynamicFields];
        updatedFields[index].availableAmount = null;
        updatedFields[index].description = "";
        updatedFields[index].materialCode = "";
        updatedFields[index].unit = "";
        setDynamicFields(updatedFields);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleFieldChange = async (index, fieldName, value) => {
    const updatedFields = [...dynamicFields];
    updatedFields[index][fieldName] = value;

    // Fetch and update Description, Open PO Qty, and UOM when Line Item No changes
    if (fieldName === "line_item_no") {
      const lineItemNo = value;
      // Fetch corresponding data for the selected Line Item No
      let getRestData = await getAvailableAmount(lineItemNo);
      // Update the corresponding fields in the state
      updatedFields[index].description = getRestData?.description;
      updatedFields[index].rest_amount = getRestData?.rest_amount;
      updatedFields[index].unit = getRestData?.unit;
      updatedFields[index].matarial_code = getRestData?.matarial_code;

      // Update the state with the modified dynamic fields
      setDynamicFields(updatedFields);
    } else {
      // Update the state with the modified dynamic fields
      setDynamicFields(updatedFields);
    }
  };

  const submitHandler = async (flag) => {
    try {
      const formDataCopy = { ...formData };

      if (formDataCopy.action_type.trim() === "") {
        return toast.warn("Action Type is required!");
      }

      if (parseInt(formDataCopy.request_amount) > parseInt(availableAmount)) {
        return toast.warn(
          "Demand quantity should be less than or equal to available quantity!"
        );
      }
      formDataCopy.demand = dynamicFields;
      const formObj = {
        purchasing_doc_no: id,
        demand: formDataCopy.demand,
        delivery_date: convertToEpoch(formDataCopy.delivery_date),
        status: flag,
        action_type: formDataCopy.action_type,
        remarks: formDataCopy.remarks,
      };

      const response = await apiCallBack(
        "POST",
        "po/demandeManagement/insert",
        formObj,
        token
      );

      if (response?.status) {
        toast.success(response?.message);
        setIsPopup(false);
        setFormData({
          action_type: "",
          remarks: "",
          line_item_no: "",
          request_amount: "",
          delivery_date: "",
          demand: [{ line_item_no: "", request_amount: "" }],
        });
        getData();
      } else {
        toast.error(response?.message);
      }
    } catch (error) {
      console.error("Error uploading:", error);
    }
  };

  return (
    <>
      <div className="d-flex flex-column flex-root">
        <div className="page d-flex flex-row flex-column-fluid">
          <SideBar />
          <div className="wrapper d-flex flex-column flex-row-fluid">
            <Header title={"Demand Management"} id={id} />
            <div className="content d-flex flex-column flex-column-fluid">
              <div className="post d-flex flex-column-fluid">
                <div className="container">
                  <div className="row g-5 g-xl-8">
                    <div className="col-12">
                      <div className="screen_header">
                        {user?.department_id === USER_PPNC_DEPARTMENT && (
                          <>
                            {/* <button className="btn fw-bold btn-primary me-2">
                              Print
                            </button> */}
                            <button
                              onClick={() => setIsPopup(true)}
                              className="btn fw-bold btn-primary"
                            >
                              ACTION
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="card-body p-3">
                        <div className="tab-content">
                          <div className="table-responsive">
                            <table className="table table-striped table-bordered table_height">
                              <thead>
                                <tr className="border-0">
                                  <th>DateTime</th>
                                  <th>Action Type</th>
                                  <th>PO Line Item </th>
                                  <th>Action By</th>
                                  <th>Request Quantity</th>
                                  <th>Received Quantity</th>
                                  <th>Delivery Date</th>
                                  <th className="min-w-150px">Remarks</th>
                                  <th>Status</th>
                                  {/* <th>Action</th> */}
                                </tr>
                              </thead>
                              <tbody style={{ maxHeight: "100%" }}>
                                {isLoading ? (
                                  <>
                                    <tr></tr>
                                    <tr>
                                      <td colSpan={10}>
                                        <SkeletonLoader col={4} row={6} />
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {Object.keys(groupedData).map(
                                      (it, index) => {
                                        let items = groupedData[it];

                                        return (
                                          <Fragment key={index}>
                                            <tr>
                                              <td colSpan={10}>
                                                <b>{it}</b>
                                              </td>
                                            </tr>
                                            {items &&
                                              items.map((item, i) => (
                                                <tr key={i}>
                                                  <td className="table_center">
                                                    {/* {item?.created_at &&
                                                new Date(
                                                  item?.created_at
                                                ).toLocaleString()} */}
                                                    {item.created_at &&
                                                      formatDate(
                                                        item.created_at
                                                      )}
                                                  </td>
                                                  <td>{item?.action_type}</td>
                                                  <td>
                                                    {" "}
                                                    {JSON.parse(
                                                      item.demand
                                                    ).map(
                                                      (demandItem, index) => (
                                                        <li key={index}>
                                                          {
                                                            demandItem.line_item_no
                                                          }
                                                        </li>
                                                      )
                                                    )}
                                                  </td>
                                                  <td>{item.created_by_id}</td>
                                                  <td>
                                                    {" "}
                                                    {JSON.parse(
                                                      item.demand
                                                    ).map(
                                                      (demandItem, index) => (
                                                        <li key={index}>
                                                          {
                                                            demandItem.request_amount
                                                          }
                                                        </li>
                                                      )
                                                    )}
                                                  </td>
                                                  <td>
                                                    {" "}
                                                    {JSON.parse(
                                                      item.demand
                                                    ).map(
                                                      (demandItem, index) => (
                                                        <li key={index}>
                                                          {
                                                            demandItem.recived_quantity
                                                          }
                                                        </li>
                                                      )
                                                    )}
                                                  </td>
                                                  <td>
                                                    {/* {item.delivery_date &&
                                                new Date(
                                                  item.delivery_date
                                                ).toLocaleDateString()} */}
                                                    {/* {item?.delivery_date &&
                                                formatDate(item?.delivery_date)} */}

                                                    {item.delivery_date &&
                                                      formatDate(
                                                        item.delivery_date *
                                                          1000
                                                      )}
                                                  </td>
                                                  <td>{item.remarks}</td>
                                                  <td
                                                    className={`${clrLegend(
                                                      item?.status
                                                    )} bold`}
                                                  >
                                                    {item.status}
                                                  </td>
                                                  {/* <td>
                                              {item.status === "SUBMITTED" && (
                                                <>
                                                  <button
                                                    onClick={() => {
                                                      setViewData(item);
                                                      setIsSecPopup(true);
                                                    }}
                                                    className="btn fw-bold btn-primary"
                                                    type="button"
                                                  >
                                                    Action
                                                  </button>
                                                </>
                                              )}
                                            </td> */}
                                                </tr>
                                              ))}
                                          </Fragment>
                                        );
                                      }
                                    )}
                                  </>
                                )}
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
      {user?.department_id === USER_PPNC_DEPARTMENT && (
        <>
          <div className={isPopup ? "popup popup_lg active" : "popup popup_lg"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5 pb-3">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">
                    Take Your Action{" "}
                    {formData?.action_type === "Material Requirement"
                      ? "( Material Requirement)"
                      : formData?.action_type === "Service Engineer Requirement"
                      ? "( Service Engineer Requirement)"
                      : ""}
                  </span>
                </h3>
                <button
                  className="btn fw-bold btn-danger"
                  onClick={() => setIsPopup(false)}
                >
                  Close
                </button>
              </div>
              <form>
                <div className="row">
                  <div className="col-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Action Type <span className="red">*</span>{" "}
                      </label>
                      <select
                        name=""
                        id=""
                        className="form-select"
                        value={formData?.action_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            action_type: e.target.value,
                          })
                        }
                      >
                        <option value="">Choose Action Type</option>
                        <option value="Material Requirement">
                          Material Requirement
                        </option>
                        <option value="Service Engineer Requirement">
                          Service Engineer Requirement
                        </option>
                      </select>
                    </div>
                  </div>
                  {formData?.action_type === "Material Requirement" && (
                    <>
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th>PO LineItem</th>
                            <th>Description</th>
                            <th>Available</th>
                            <th>Material Code</th>
                            <th>Demand Quantity *</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicFields.map((field, index) => (
                            <Fragment key={index}>
                              <tr>
                                <td>
                                  <select
                                    className="form-select"
                                    value={field.line_item_no}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        index,
                                        "line_item_no",
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">
                                      Choose PO Line Item
                                    </option>
                                    {lineItemData.map((item, i) => (
                                      <option
                                        value={item?.material_item_number}
                                        key={i}
                                      >
                                        {item?.material_item_number}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>{field.description}</td>
                                <td>
                                  {field.rest_amount} {field.unit}
                                </td>
                                <td>{field.matarial_code}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={field.request_amount}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        index,
                                        "request_amount",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  {index === dynamicFields.length - 1 && (
                                    <FaPlus
                                      onClick={() =>
                                        setDynamicFields([
                                          ...dynamicFields,
                                          {
                                            line_item_no: "",
                                            request_amount: "",
                                          },
                                        ])
                                      }
                                    />
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Delivery Date <span className="red">*</span>{" "}
                          </label>
                          <ReactDatePicker
                            selected={formData?.delivery_date}
                            onChange={(date) =>
                              setFormData({
                                ...formData,
                                delivery_date: date,
                              })
                            }
                            dateFormat="dd/MM/yyyy"
                            className="form-control"
                            placeholderText="DD/MM/YYYY"
                          />
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Remarks <span className="red">*</span>{" "}
                          </label>
                          <textarea
                            rows="4"
                            className="form-control"
                            value={formData?.remarks}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                remarks: e.target.value,
                              })
                            }
                          ></textarea>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="mb-3 d-flex justify-content-between">
                          {/* <button
                            onClick={() => submitHandler("SUBMITTED")}
                            className="btn fw-bold btn-primary"
                            type="button"
                          >
                            SUBMIT
                          </button> */}
                          <DynamicButton
                            label="SUBMIT"
                            onClick={() => submitHandler("SUBMITTED")}
                            className="btn fw-bold btn-primary"
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {formData?.action_type === "Service Engineer Requirement" && (
                    <>
                      <table className="table table-bordered table-striped">
                        <thead>
                          <tr>
                            <th>PO LineItem</th>
                            <th>Demand Quantity *</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dynamicFields.map((field, index) => (
                            <Fragment key={index}>
                              <tr>
                                <td>
                                  <select
                                    className="form-select"
                                    value={field.line_item_no}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        index,
                                        "line_item_no",
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">
                                      Choose PO Line Item
                                    </option>
                                    {lineItemData.map((item, i) => (
                                      <option
                                        value={item?.material_item_number}
                                        key={i}
                                      >
                                        {item?.material_item_number}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                <td>
                                  <input
                                    type="number"
                                    className="form-control"
                                    value={field.request_amount}
                                    onChange={(e) =>
                                      handleFieldChange(
                                        index,
                                        "request_amount",
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  {index === dynamicFields.length - 1 && (
                                    <FaPlus
                                      onClick={() =>
                                        setDynamicFields([
                                          ...dynamicFields,
                                          {
                                            line_item_no: "",
                                            request_amount: "",
                                          },
                                        ])
                                      }
                                    />
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Delivery Date <span className="red">*</span>{" "}
                          </label>
                          <ReactDatePicker
                            selected={formData?.delivery_date}
                            onChange={(date) =>
                              setFormData({
                                ...formData,
                                delivery_date: date,
                              })
                            }
                            dateFormat="dd/MM/yyyy"
                            className="form-control"
                            placeholderText="DD/MM/YYYY"
                          />
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Remarks <span className="red">*</span>{" "}
                          </label>
                          <textarea
                            rows="4"
                            className="form-control"
                            value={formData?.remarks}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                remarks: e.target.value,
                              })
                            }
                          ></textarea>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="mb-3 d-flex justify-content-between">
                          {/* <button
                            onClick={() => submitHandler("SUBMITTED")}
                            className="btn fw-bold btn-primary"
                            type="button"
                          >
                            SUBMIT
                          </button> */}
                          <DynamicButton
                            label="SUBMIT"
                            onClick={() => submitHandler("SUBMITTED")}
                            className="btn fw-bold btn-primary"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ///////////////////////////// */}
          {/* <div className={isSecPopup ? "popup active" : "popup"}>
            <div className="card card-xxl-stretch mb-5 mb-xxl-8">
              <div className="card-header border-0 pt-5 pb-3">
                <h3 className="card-title align-items-start flex-column">
                  <span className="card-label fw-bold fs-3 mb-1">
                    Take Your Action
                  </span>
                </h3>
                <button
                  className="btn fw-bold btn-danger"
                  onClick={() => {
                    setIsSecPopup(false);
                    setViewData(null);
                  }}
                >
                  Close
                </button>
              </div>
              <form>
                <div className="row">
                  {viewData?.demand &&
                    JSON.parse(viewData.demand).map((item, i) => (
                      <div className="row" key={i}>
                        <div className="col-12 col-md-4">
                          <div className="mb-3">
                            <label className="form-label">
                              PO Line Item <span className="red">*</span>{" "}
                            </label>
                            <p>{item?.line_item_no}</p>
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="mb-3">
                            <label className="form-label">
                              Requested Quantity <span className="red">*</span>{" "}
                            </label>
                            <p>{item?.request_amount}</p>
                          </div>
                        </div>
                        <div className="col-12 col-md-4">
                          <div className="mb-3">
                            <label className="form-label">
                              Received Quantity <span className="red">*</span>{" "}
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              value={formData?.recived_quantity[i] || ""}
                              onChange={(e) => {
                                const newReceivedQuantities = [
                                  ...formData.recived_quantity,
                                ];
                                newReceivedQuantities[i] = e.target.value;
                                setFormData({
                                  ...formData,
                                  recived_quantity: newReceivedQuantities,
                                });
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">Remarks</label>&nbsp;&nbsp;
                      <span className="mandatorystart">*</span>
                      <textarea
                        name=""
                        id=""
                        rows="4"
                        className="form-control"
                        value={formData?.remarks}
                        onChange={(e) =>
                          setFormData({ ...formData, remarks: e.target.value })
                        }
                      ></textarea>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="mb-3 d-flex justify-content-between">
                      <button
                        onClick={() => actionHandlerReceiver("RECEIVED")}
                        className="btn fw-bold btn-primary"
                        type="button"
                      >
                        SUBMIT
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div> */}
        </>
      )}
    </>
  );
};

export default DemandManagement;
