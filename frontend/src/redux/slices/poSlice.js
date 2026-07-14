import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  po: null,
  poType: null,
  isDO: false,
};

export const selectedPO = createSlice({
  name: "selectedPO",
  initialState,
  reducers: {
    poHandler: (state, action) => {
      state.po = action.payload?.poNumber;
      state.poType = action.payload?.poType;
    },
    doHandler: (state, action) => {
      state.isDO = action.payload;
    },
    poRemoveHandler: (state, action) => {
      state.po = null;
      state.poType = null;
      state.isDO = false;
    },
  },
});

// Action creators are generated for each case reducer function
export const { poHandler, doHandler, poRemoveHandler } = selectedPO.actions;

export default selectedPO.reducer;
