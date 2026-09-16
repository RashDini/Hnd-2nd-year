import React, { useCallback, useState, useEffect } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

// 1. IMPORT REACT-TOASTIFY COMPONENTS AND STYLES
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import LoginPortal from "./components/LoginPortal";
import AdminSecureLogin  from "./components/AdminSecureLogin";
import AdminDashboard from "./components/AdminDashboard";
import ReceptionistDashboard from "./components/ReceptionistDashboard";
import DoctorDashboard from "./components/DoctorDashboard";

const apiBaseUrlRaw = process.env.REACT_APP_API_BASE_URL || "";
const API_BASE_URL = apiBaseUrlRaw && apiBaseUrlRaw.startsWith("http")
  ? apiBaseUrlRaw.replace(/\/+$/, "")
  : "";

const getResetRequestsUrl = () => `${API_BASE_URL}/api/reset-requests`;
const getResetRequestUrl = (id) => `${API_BASE_URL}/api/reset-requests/${id}`;

console.log("=== App.js Configuration ===");
console.log("REACT_APP_API_BASE_URL env var:", apiBaseUrlRaw);
console.log("API_BASE_URL being used:", API_BASE_URL || "(proxy /api)");
console.log("window.location.hostname:", window.location.hostname);
console.log("=============================");

const adminLoginHosts = (process.env.REACT_APP_ADMIN_LOGIN_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

function isPrivateIpHost(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

const isLocalHost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "::1";

const isAdminLoginHost =
  !isLocalHost &&
  (adminLoginHosts.includes(window.location.hostname) || isPrivateIpHost(window.location.hostname));

function App() {
  const [user, setUser] = useState(null);
  const [resetRequests, setResetRequests] = useState([]);

  const handleLoginSuccess = (userData) => {
    setUser(typeof userData === "string" ? { role: userData } : userData);
  };

  const handleAddResetRequest = async (request) => {
    try {
      console.log("Submitting reset request:", request);
      const response = await fetch(`${API_BASE_URL}/api/reset-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to save reset request:", response.status, errorData.error || response.statusText);
        return false;
      }

      const data = await response.json();
      console.log("Reset request saved:", data);
      if (data && data.request) {
        setResetRequests((currentRequests) => [data.request, ...currentRequests]);
        return data.request;
      }

      return false;
    } catch (error) {
      console.error("Unable to submit reset request:", error);
      return false;
    }
  };

  const fetchResetRequests = useCallback(async () => {
    try {
      const url = getResetRequestsUrl();
      console.log("Fetching reset requests from:", url);
      const response = await fetch(url);
      if (!response.ok) {
        console.error("Failed to load reset requests:", response.status, response.statusText);
        return false;
      }

      const data = await response.json();
      console.log("Reset requests loaded:", data);
      if (data && Array.isArray(data.requests)) {
        setResetRequests(data.requests);
        return data.requests;
      }

      return false;
    } catch (error) {
      console.error("Unable to fetch reset requests:", error);
      return false;
    }
  }, []);

  const handleProcessResetRequest = async (requestId) => {
    try {
      const response = await fetch(getResetRequestUrl(requestId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed" })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to process reset request:", errorData.error || response.statusText);
        return;
      }

      const data = await response.json();
      if (data && data.request) {
        setResetRequests((currentRequests) =>
          currentRequests.map((request) =>
            request.id === requestId ? data.request : request
          )
        );
      }
    } catch (error) {
      console.error("Unable to process reset request:", error);
    }
  };

  useEffect(() => {
    fetchResetRequests();
  }, [fetchResetRequests]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleSwitchRole = (role) => {
    setUser((currentUser) => ({
      ...(currentUser || {}),
      role
    }));
  };

  const renderDashboard = () => {
    if (!user) {
      return <Navigate to="/" replace />;
    }

    if (user.role === "Admin") {
      return (
        <AdminDashboard
          user={user}
          role={user.role}
          onLogout={handleLogout}
          onSwitchRole={handleSwitchRole}
          resetRequests={resetRequests}
          onRefreshResetRequests={fetchResetRequests}
          onProcessResetRequest={handleProcessResetRequest}
        />
      );
    }

    if (user.role === "Doctor") {
      return <DoctorDashboard user={user} onLogout={handleLogout} onSubmitResetRequest={handleAddResetRequest} />;
    }

    if (user.role === "Receptionist") {
      return <ReceptionistDashboard user={user} onLogout={handleLogout} onSubmitResetRequest={handleAddResetRequest} />;
    }

    return <Navigate to="/" replace />;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : isAdminLoginHost ? (
              <AdminSecureLogin onLogin={handleLoginSuccess} />
            ) : (
              <LoginPortal onLogin={handleLoginSuccess} onSubmitResetRequest={handleAddResetRequest} />
            )
          }
        />
        <Route
          path="/admin-login"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : isAdminLoginHost ? (
              <AdminSecureLogin onLogin={handleLoginSuccess} />
            ) : (
              <LoginPortal onLogin={handleLoginSuccess} onSubmitResetRequest={handleAddResetRequest} />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : isAdminLoginHost ? (
              <AdminSecureLogin onLogin={handleLoginSuccess} />
            ) : (
              <LoginPortal onLogin={handleLoginSuccess} onSubmitResetRequest={handleAddResetRequest} />
            )
          }
        />
        <Route path="/dashboard" element={renderDashboard()} />
      </Routes>{/* 2. PLACE THE TOASTCONTAINER HERE TO ENABLE TOASTS ACROSS ALL DASHBOARDS */}
      <ToastContainer 
        position="top-right" 
        autoClose={4000} 
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </Router>
  );
}

export default App;