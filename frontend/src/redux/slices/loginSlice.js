import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  token: null,
  refreshToken: null,
  isLoggedIn: false,
  user: null,
  userType: null,
};

export const loginStage = createSlice({
  name: "loginStage",
  initialState,
  reducers: {
    loginHandler: (state, action) => {
      console.log(action, "action");
      state.token = action.payload.token.accessToken;
      state.refreshToken = action.payload.token.refreshToken || null;
      state.isLoggedIn = true;
      state.user = action.payload.data.user;
      state.userType = action.payload.data.user.user_type;
    },
    logoutHandler: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.isLoggedIn = false;
      state.user = null;
      state.userType = null;
    },
    refreshTokenHandler: (state, action) => {
      state.token = action.payload.token.accessToken;
      state.refreshToken = action.payload.token.refreshToken || state.refreshToken;
    },
  },
});

// Action creators are generated for each case reducer function
export const { loginHandler, logoutHandler, refreshTokenHandler } = loginStage.actions;

export default loginStage.reducer;
