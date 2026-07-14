import { store } from "../redux/store";
import { refreshTokenHandler, logoutHandler } from "../redux/slices/loginSlice";
import { toast } from "react-toastify";
import { apiCallBack } from "./fetchAPIs";

// Get token validity from environment (default 25 minutes)
const TOKEN_VALIDITY_MINUTES = parseInt(process.env.REACT_APP_ACCESS_TOKEN_VALIDITY || "25", 10);
// Refresh token 1 minute before expiry (24 minutes for 25 min validity)
const REFRESH_INTERVAL_MINUTES = TOKEN_VALIDITY_MINUTES - 1;
const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_MINUTES * 60 * 1000; // Convert to milliseconds

let refreshTimer = null;

/**
 * Refresh Token API Function
 */
export const refreshTokenAPI = async (refreshToken) => {
  try {
    const payload = {
      refreshToken: refreshToken,
    };

    const response = await apiCallBack("POST", "auth2/refresh-token", payload, null);
    return response;
  } catch (error) {
    console.error("Refresh Token API Error:", error);
    throw error;
  }
};

/**
 * Internal function to refresh token
 */
export const performTokenRefresh = async () => {
  try {
    const state = store.getState();
    const currentRefreshToken = state.auth?.refreshToken;

    if (!currentRefreshToken) {
      console.warn("No refresh token available");
      return;
    }

    console.log("🔄 Auto refreshing token...");
    const response = await refreshTokenAPI(currentRefreshToken);

    if (response?.status && response?.token) {
      const { accessToken, refreshToken: newRefreshToken } = response.token;

      // Update Redux store with new tokens
      store.dispatch(
        refreshTokenHandler({
          token: {
            accessToken: accessToken,
            refreshToken: newRefreshToken || currentRefreshToken,
          },
        })
      );

      console.log("✅ Token refreshed successfully");
    } else {
      throw new Error("Invalid refresh token response");
    }
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    // If refresh fails, logout user
    store.dispatch(logoutHandler());
    toast.error("Session expired. Please login again.");
    // Redirect to login page for auto-logout UX
    window.location.href = "/";
  }
};

/**
 * Start automatic token refresh
 */
export const startAutoTokenRefresh = () => {
  // Clear existing timer if any
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  const state = store.getState();
  const isLoggedIn = state.auth?.isLoggedIn;
  const refreshToken = state.auth?.refreshToken;

  // Only start if user is logged in and has refresh token
  if (!isLoggedIn || !refreshToken) {
    return;
  }

  console.log(`🔄 Auto token refresh started (refreshing every ${REFRESH_INTERVAL_MINUTES} minutes)`);

  // Refresh token at intervals
  refreshTimer = setInterval(() => {
    const currentState = store.getState();
    const isStillLoggedIn = currentState.auth?.isLoggedIn;
    const stillHasRefreshToken = currentState.auth?.refreshToken;

    if (isStillLoggedIn && stillHasRefreshToken) {
      performTokenRefresh();
    } else {
      // Stop if user logged out
      stopAutoTokenRefresh();
    }
  }, REFRESH_INTERVAL_MS);
};

/**
 * Stop automatic token refresh
 */
export const stopAutoTokenRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
    console.log("🛑 Auto token refresh stopped");
  }
};

/**
 * Initialize token refresh on app load (call this in App.js or index.js)
 */
export const initializeTokenRefresh = () => {
  const state = store.getState();
  const isLoggedIn = state.auth?.isLoggedIn;

  if (isLoggedIn) {
    startAutoTokenRefresh();
  }

  // Subscribe to store changes to start/stop refresh based on login status
  store.subscribe(() => {
    const currentState = store.getState();
    const isCurrentlyLoggedIn = currentState.auth?.isLoggedIn;

    if (isCurrentlyLoggedIn && !refreshTimer) {
      startAutoTokenRefresh();
    } else if (!isCurrentlyLoggedIn && refreshTimer) {
      stopAutoTokenRefresh();
    }
  });
};
