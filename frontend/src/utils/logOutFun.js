export const logOutFun = (dispatch, logoutHandler, poRemoveHandler) => {
  dispatch(logoutHandler());
  dispatch(poRemoveHandler());
  // window.location.href = "/";
  // Persistor.pause();
  // Persistor.flush().then(() => {
  //   return Persistor.purge();
  // });
};
