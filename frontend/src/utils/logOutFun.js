export const logOutFun = (dispatch, logoutHandler, poRemoveHandler) => {
  dispatch(logoutHandler());
  dispatch(poRemoveHandler());
};
