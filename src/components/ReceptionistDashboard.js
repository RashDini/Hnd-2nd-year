import React, { useEffect, useState } from "react";
import axios from "axios";
import DashboardFooter from "./DashboardFooter";
import DisplayScreen from "./DisplayScreen";
import RegisterDoctor from "./RegisterDoctor";
import ManageDoctor from "./ManageDoctor";
import RegisterPatient from "./RegisterPatient";
import ViewPatientList from "./ViewPatientList";
import "./AdminDashboard.css";
import "./ReceptionistDashboard.css";

export default function ReceptionistDashboard({ onLogout, onSubmitResetRequest }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetFormData, setResetFormData] = useState({ employeeId: "", fullName: "", email: "" });
  const [queuePatients, setQueuePatients] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  
  // New state added to store the current active doctor's name on duty
  const [activeDoctorName, setActiveDoctorName] = useState("None Active");

  const fetchDashboardData = () => {
    // 1. Fetch patients queue list
    axios.get("http://localhost:5000/api/patients")
      .then((res) => setQueuePatients(res.data.patients || []))
      .catch((err) => console.error("Failed to load queue:", err))
      .finally(() => setLoadingQueue(false));

    // 2. Fetch doctors list to track who is currently active on duty
    axios.get("http://localhost:5000/api/doctors")
      .then((res) => {
        const doctorsData = Array.isArray(res.data) ? res.data : res.data.doctors || [];
        // Look for the first doctor with account_status explicitly marked 'Active'
        const activeDoctorRecord = doctorsData.find(
          (doc) => (doc.account_status || "").toLowerCase() === "active"
        );
        
        if (activeDoctorRecord) {
          setActiveDoctorName(activeDoctorRecord.full_name || activeDoctorRecord.fullName);
        } else {
          setActiveDoctorName("None Active");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch active doctor configuration context:", err);
      });
  };

  useEffect(() => {
    if (currentView !== "dashboard") return;
    
    // Immediate call on mount/view modification
    fetchDashboardData();
    
    // Polling setup at 5-second interval cycles
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, [currentView]);

  const waitingCount = queuePatients.filter((p) => p.status === "Waiting").length;
  const absentCount = queuePatients.filter((p) => p.status === "Absent at Call").length;
  const totalIssued = queuePatients.length;

  const activeQueue = queuePatients.filter(
    (p) => p.status === "Waiting" || p.status === "Now Treating"
  );
 
  const formatTime = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const elapsedTime = (isoString) => {
    if (!isoString) return "-";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}m`;
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
              <h2>RECEPTIONIST DASHBOARD</h2>
            </div>
          </div>
        
          <nav className="nav-menu">
            <button
              className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
              onClick={() => setCurrentView("dashboard")}
            >
              Dashboard Home
            </button>
            <button
              className={`nav-btn ${currentView === "register-doctor" ? "active" : ""}`}
              onClick={() => setCurrentView("register-doctor")}
            >
              Register Doctor
            </button>
            <button
              className={`nav-btn ${currentView === "manage-doctor" ? "active" : ""}`}
              onClick={() => setCurrentView("manage-doctor")}
            >
              Manage Doctor
            </button>
            <button
              className={`nav-btn ${currentView === "register-patient" ? "active" : ""}`}
              onClick={() => setCurrentView("register-patient")}
            >
              Register Patients
            </button>
            <button
              className={`nav-btn ${currentView === "view-patient-list" ? "active" : ""}`}
              onClick={() => setCurrentView("view-patient-list")}
            >
              View Patient List
            </button>
            <button
              className={`nav-btn ${currentView === "display-screen" ? "active" : ""}`}
              onClick={() => setCurrentView("display-screen")}
            >
              Display Screen
            </button>
          </nav>
        </div>

        <button className="logout-btn" type="button" onClick={onLogout}>
          Log Out
        </button>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <div>
            <h1>WIJAYA KUMARATUNGA MEMORIAL HOSPITAL - DENTAL UNIT QUEUE SYSTEM</h1>
          </div>
          <div className="user-profile">
            {showResetForm && (
              <div className="password-request-overlay" role="dialog" aria-modal="true">
                <form
                  className="password-request-panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (typeof onSubmitResetRequest === "function") {
                      const requestData = {
                        role: "Receptionist",
                        name: resetFormData.fullName,
                        username: resetFormData.employeeId,
                        email: resetFormData.email
                      };
                      try {
                        onSubmitResetRequest(requestData);
                      } catch (err) {
                        console.error('onSubmitResetRequest threw error:', err);
                      }
                      alert("✓ Password reset request submitted successfully! Admin will review it shortly.");
                      setResetFormData({ employeeId: "", fullName: "", email: "" });
                    } else {
                      alert("Error: Unable to submit request. Please try again.");
                    }
                    setShowResetForm(false);
                  }}
                >
                  <div className="password-request-header">
                    <h3>Password Reset Request</h3>
                    <button
                      type="button"
                      className="password-request-close"
                      aria-label="Close password reset request form"
                      onClick={() => setShowResetForm(false)}
                    >
                      x
                    </button>
                  </div>

                  <label>Employee ID</label>
                  <input
                    name="employeeId"
                    value={resetFormData.employeeId}
                    onChange={(e) => setResetFormData((s) => ({ ...s, employeeId: e.target.value }))}
                    required
                  />

                  <label>Full Name</label>
                  <input
                    name="fullName"
                    value={resetFormData.fullName}
                    onChange={(e) => setResetFormData((s) => ({ ...s, fullName: e.target.value }))}
                    required
                  />

                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={resetFormData.email}
                    onChange={(e) => setResetFormData((s) => ({ ...s, email: e.target.value }))}
                    required
                  />

                  <div className="password-request-actions">
                    <button type="submit">Submit Request</button>
                    <button type="button" onClick={() => setShowResetForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            Welcome, <strong>Receptionist</strong>
          </div>
        </header>

        <div className="main-scroll">
          {currentView === "dashboard" ? (
            <section className="dashboard-main">
              {/* Corrected implementation displaying active doctor state directly */}
              <div className="active-doctor-panel">
                Active Dental Surgeon: <strong>{activeDoctorName}</strong>
              </div>

              <div className="dashboard-cards">
                <div className="card">
                  <h3>Total Tokens Run</h3>
                  <p>{loadingQueue ? "-" : totalIssued}</p>
                </div>
                <div className="card">
                  <h3>Patients in Lobby</h3>
                  <p>{loadingQueue ? "-" : waitingCount}</p>
                </div>
                <div className="card">
                  <h3>Total Patients Absent</h3>
                  <p>{loadingQueue ? "-" : absentCount}</p>
                </div>
              </div>

              <div className="activities-panel">
                <div className="panel-header">
                  <h2>Current Queue</h2>
                </div>
                <div className="table-container">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>Token No</th>
                        <th>Token Printed Time</th>
                        <th>Elapsed Wait Time</th>
                        <th>Current Token State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingQueue ? (
                        <tr>
                          <td colSpan="4" className="empty-table">Loading queue...</td>
                        </tr>
                      ) : activeQueue.length > 0 ? (
                        activeQueue.map((patient) => (
                          <tr key={patient.tokenId}>
                            <td>{patient.tokenNo}</td>
                            <td>{formatTime(patient.createdAt)}</td>
                            <td>{elapsedTime(patient.createdAt)}</td>
                            <td>{patient.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="empty-table">
                            No active tokens in queue
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : currentView === "register-doctor" ? (
            <section className="dashboard-main">
              <RegisterDoctor onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "manage-doctor" ? (
            <section className="dashboard-main">
              <ManageDoctor onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "register-patient" ? (
            <section className="dashboard-main">
              <RegisterPatient onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "view-patient-list" ? (
            <section className="dashboard-main">
              <ViewPatientList
                userRole="Receptionist"
                onExit={() => setCurrentView("dashboard")}
              />
            </section>
          ) : currentView === "display-screen" ? (
            <DisplayScreen
              embedded
              onLogout={() => setCurrentView("dashboard")}
            />
          ) : (
            <section className="dashboard-main">
              <div className="activities-panel">
                <h2>Coming Soon</h2>
                <p>This section is under construction.</p>
              </div>
            </section>
          )}

          {currentView !== "dashboard" && currentView !== "display-screen" && <DashboardFooter />}
        </div>

        {currentView === "dashboard" && <DashboardFooter />}
      </main>
    </div>
  );
}