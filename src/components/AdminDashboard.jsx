import React, { useEffect, useState } from "react";
import axios from "axios";
import RegisterAdmin from "./RegisterAdmin";
import ManageResets from "./ManageResets";
import ManageAdmin from "./ManageAdmin";
import RegisterReceptionist from "./RegisterReceptionist";
import ManageReceptionist from "./ManageReceptionist";
import GenerateReport from "./GenerateReport";
import DashboardFooter from "./DashboardFooter";

import "./AdminDashboard.css";

function AdminDashboard({ role, onLogout, onSwitchRole, resetRequests = [], onRefreshResetRequests, onProcessResetRequest }) {
  const [currentView, setCurrentView] = useState("dashboard");
 // const [totalAdmins, setTotalAdmins] = useState(null);
  const [totalReceptionists, setTotalReceptionits] = useState(null);
  const [totalDoctors, setTotalDoctors] = useState(null);
  const [tokensToday, setTokensToday] = useState(null);
  const [activities, setActivities] = useState([]);

  // Backend base URL
  const API_BASE = `http://${window.location.hostname}:5000`;

  const pendingCount = Array.isArray(resetRequests)
    ? resetRequests.filter((r) => r.status === "Pending").length
    : 0;

  useEffect(() => {
    if (currentView !== "dashboard") return;

    // Declared inside useEffect to eliminate the ESLint missing dependency warning safely
    const fetchStats = () => {
      // Fetch Admins Count
      axios.get(`${API_BASE}/api/receptionists`)
        .then((res) => setTotalReceptionits(res.data.receptionists.length))
        .catch((err) => console.error("Failed to load receptionist count:", err));

      // Fetch and Filter Active Doctors Count
      axios.get(`${API_BASE}/api/doctors`)
        .then((res) => {
          const doctorsList = res.data.doctors || [];
          
          // Filter using the exact field from your database object 
          // (e.g., doc.status === "Active" or doc.isActive === true)
          const activeDoctors = doctorsList.filter(
            (doc) => doc.account_status === "Active" 
          );
          
          setTotalDoctors(activeDoctors.length);
        })
        .catch((err) => console.error("Failed to load doctors count:", err));

      // Fetch and Filter Patient Tokens for Today
      axios.get(`${API_BASE}/api/patients`)
        .then((res) => {
          const today = new Date().toISOString().slice(0, 10);
          const todaysTokens = res.data.patients.filter((p) => {
            if (!p.createdAt) return false;
            return p.createdAt.slice(0, 10) === today;
          });
          setTokensToday(todaysTokens.length);
        })
        .catch((err) => console.error("Failed to load tokens count:", err));

      // Fetch Recent Activity Log
      axios.get(`${API_BASE}/api/activity-log`)
        .then((res) => setActivities(res.data.activities))
        .catch((err) => console.error("Failed to load activity log:", err));
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Polls every 10 seconds
    
    return () => clearInterval(interval);
  }, [currentView, API_BASE]); // Dependencies are now tracking correctly

  const handleProcessResetRequest = (requestId) => {
    if (typeof onProcessResetRequest === "function") {
      onProcessResetRequest(requestId);
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img
              src="/gov-logo.jpg"
              alt="Government Logo"
              className="government-image"
            />
            <div className="brand-text">
              <h2>ADMIN DASHBOARD</h2>
            </div>
          </div>

          <nav className="nav-menu">
            <button
              className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
              onClick={() => setCurrentView("dashboard")}
            >
              Admin Dashboard
            </button>
            <button
              className={`nav-btn ${currentView === "register-admin" ? "active" : ""}`}
              onClick={() => setCurrentView("register-admin")}
            >
              Register Administrator
            </button>
            <button
              className={`nav-btn ${currentView === "manage-admin" ? "active" : ""}`}
              onClick={() => setCurrentView("manage-admin")}
            >
              Manage Administrator
            </button>
            <button
              className={`nav-btn ${currentView === "register-receptionist" ? "active" : ""}`}
              onClick={() => setCurrentView("register-receptionist")}
            >
              Register Receptionist
            </button>

            <button
              className={`nav-btn ${currentView === "manage-receptionist" ? "active" : ""}`}
              onClick={() => setCurrentView("manage-receptionist")}
            >
              Manage Receptionist
            </button>

            <button
              className={`nav-btn ${currentView === "password_resets" ? "active" : ""}`}
              onClick={() => setCurrentView("password_resets")}
            >
              Reset Password Requests
              {pendingCount > 0 && (
                <span className="alert-badge-counter">{pendingCount}</span>
              )}
            </button>

            <button
              className={`nav-btn ${currentView === "generate-report" ? "active" : ""}`}
              onClick={() => setCurrentView("generate-report")}
            >
              Generate Report
            </button>
          </nav>
        </div>

        <button onClick={onLogout} className="logout-btn">
          Log Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>WIJAYA KUMARATUNGA MEMORIAL HOSPITAL - DENTAL UNIT QUEUE SYSTEM</h1>
          </div>
          <div className="user-profile">
            Welcome, <strong>{role}</strong>
          </div>
        </header>

        <div className="main-scroll">
          {currentView === "dashboard" ? (
            <section className="dashboard-main">
              <div className="dashboard-cards">
                <div className="card">
                  <h3>Total Receptionists</h3>
                  <p>{totalReceptionists === null ? "-" : totalReceptionists}</p>
                </div>
                <div className="card">
                  <h3>Total Tokens Today</h3>
                  <p>{tokensToday === null ? "-" : tokensToday}</p>
                </div>
                <div className="card">
                  <h3>Active Doctors</h3>
                  <p>{totalDoctors === null ? "-" : totalDoctors}</p>
                </div>
                <div className="card">
                  <h3>Pending Password Requests</h3>
                  <p>{pendingCount}</p>
                </div>
              </div>

              <div className="activities-panel">
                <div className="panel-header">
                  <h2>Recent System Activities</h2>
                </div>
                {activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <div className="activity-item" key={activity.id}>
                      {activity.message}
                      <span style={{ float: "right", color: "#888", fontSize: "12px" }}>
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="activity-item">No recent activity.</div>
                )}
              </div>
            </section>
          ) : currentView === "register-admin" ? (
            <section className="dashboard-main">
              <RegisterAdmin onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "manage-admin" ? (
            <section className="dashboard-main">
              <ManageAdmin onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "register-receptionist" ? (
            <section className="dashboard-main">
              <RegisterReceptionist onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "manage-receptionist" ? (
            <section className="dashboard-main">
              <ManageReceptionist onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "generate-report" ? (
            <section className="dashboard-main">
              <GenerateReport onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "password_resets" ? (
            <section className="dashboard-main">
              <ManageResets
                onExit={() => setCurrentView("dashboard")}
                resetRequests={resetRequests}
                onRefreshRequests={onRefreshResetRequests}
                onProcessRequest={handleProcessResetRequest}
              />
            </section>
          ) : (
            <section className="dashboard-main">
              <div className="activities-panel">
                <h2>Coming Soon</h2>
                <p>This section is under construction.</p>
              </div>
            </section>
          )}

          {currentView !== "dashboard" && <DashboardFooter />}
        </div>

        {currentView === "dashboard" && <DashboardFooter />}
      </main>
    </div>
  );
}

export default AdminDashboard;