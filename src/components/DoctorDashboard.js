import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import DashboardFooter from "./DashboardFooter";
import DisplayScreen from "./DisplayScreen";
import ViewAssignedPatients from "./ViewAssignedPatients";
import "./AdminDashboard.css";
import "./DoctorDashboard.css";




function DoctorDashboard({ onLogout, onSubmitResetRequest }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

   const fetchPatients = () => {
    setLoading(true);
    axios.get("http://localhost:5000/api/patients")
      .then((res) => setPatients(res.data.patients))
      .catch((err) => setError(err.response?.data?.error || "Failed to load patients."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const activePatient = patients.find((patient) => patient.status === "Now Treating");

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
return patients.filter((patient) => {
      const tokenNo = (patient.tokenNo || "").toLowerCase();
      const fullName = (patient.fullName || "").toLowerCase();
      return tokenNo.includes(query) || fullName.includes(query);
    });
  }, [patients, searchTerm]);

  const updatePatientStatus = async (tokenId, status) => {
    try {
      await axios.put(`http://localhost:5000/api/tokens/${tokenId}/status`, { status });
      fetchPatients();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status.");
    }
  };

  const callNextPatient = () => {
    const nextWaiting = patients.find((patient) => patient.status === "Waiting");

    if (!nextWaiting) {
      alert("No waiting patients in the queue.");
      return;
    }
updatePatientStatus(nextWaiting.tokenId, "Now Treating");
  };

  const formatReasons = (reasons) => {
    if (Array.isArray(reasons)) return reasons.join(", ");
    if (typeof reasons === "string") {
      try {
        const parsed = JSON.parse(reasons);
        if (Array.isArray(parsed)) return parsed.join(", ");
      } catch (e) {
        return reasons;
      }
    }
    return reasons || "-";
  };

   const formatTime = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
              <h2>DOCTOR DASHBOARD</h2>
            </div>
          </div>

          <nav className="nav-menu">
            <button
              className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
              type="button"
              onClick={() => setCurrentView("dashboard")}
            >
              Doctor Dashboard
            </button>
            <button
              className={`nav-btn ${currentView === "assigned-patients" ? "active" : ""}`}
              type="button"
              onClick={() => setCurrentView("assigned-patients")}
            >
              View Assigned Patients
            </button>
            <button
              className={`nav-btn ${currentView === "display-screen" ? "active" : ""}`}
              type="button"
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
            Welcome, <strong>Doctor</strong>
            
           
          </div>
        </header>

        <div className="main-scroll">
          {currentView === "assigned-patients" ? (
            <section className="dashboard-main">
              <ViewAssignedPatients onExit={() => setCurrentView("dashboard")} />
            </section>
          ) : currentView === "display-screen" ? (
            <DisplayScreen
              embedded
              onLogout={() => setCurrentView("dashboard")}
            />
          ) : (
          <section className="dashboard-main">
            <div className="doctor-patient-panel">
              <div className="doctor-panel-header">
                <div>
                  <h2>Doctor Dashboard</h2>
                  <p>Today's doctor assigned patients</p>
                </div>
                <span>{new Date().toLocaleDateString()}</span>
              </div>

              {loading ? (
                <p>Loading patients...</p>
              ) : error ? (
                <p>{error}</p>
              ) : (
              <div className="doctor-content-card">
                <section className="doctor-current-patient-section">
                  <div className="section-title-row">
                    <h3>Section 1 : Current Active Patient</h3>
                    <span className="doctor-date-label">{new Date().toLocaleDateString()}</span>
                  </div>

                  <div className="current-patient-layout">
                    <div className="current-patient-fields">
                      <label>
                        Now Treating Token
                        <input value={activePatient?.tokenNo || "-"} readOnly />
                      </label>
                      <label>
                        Patient Demographics
                        <input
                          value={
                            activePatient
                              ? `${activePatient.fullName} | ${activePatient.age} | ${activePatient.gender}`
                              : "-"
                          }
                          readOnly
                        />
                      </label>
                      <label>
                        Clinical / Dental Reason
                        <input value={activePatient ? formatReasons(activePatient.dentalReasons) : "-"} readOnly />
                      </label>
                      <label>
                        Notes from Intake
                        <textarea
                          value={
                            activePatient
                              ? `${activePatient.fullName} arrived at ${formatTime(activePatient.createdAt)}.`
                              : "No active patient selected."
                          }
                          readOnly
                        />
                      </label>
                    </div>

                    <div className="doctor-touch-actions">
                      <button
                        type="button"
                        className="btn-call-next"
                        onClick={callNextPatient}
                      >
                        Mark as Called
                      </button>
                      <button
                        type="button"
                        className="btn-complete"
                        disabled={!activePatient}
                        onClick={() => activePatient && updatePatientStatus(activePatient.tokenId, "Completed")}
                      >
                        Mark as Completed
                      </button>
                      <button
                        type="button"
                        className="btn-absent"
                        disabled={!activePatient}
                        onClick={() => activePatient && updatePatientStatus(activePatient.tokenId, "Absent at Call")}
                      >
                        Mark as Absent
                      </button>
                    </div>
                  </div>
                </section>

                <section className="assigned-patients-section">
                  <div className="section-title-row">
                    <h3>Section 2 : All Assigned Patients Waiting in Queue</h3>
                    <span>{patients.length} Patients</span>
                  </div>

                  <div className="doctor-toolbar">
                    <input
                      type="text"
                      placeholder="Search by token or name"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                  </div>

                  <div className="doctor-table-wrapper">
                    <table className="doctor-patient-table">
                      <thead>
                        <tr>
                          <th>Token No</th>
                          <th>Assigned Patient Name</th>
                          <th>Intake Time</th>
                          <th>Treatment</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPatients.length > 0 ? (
                          filteredPatients.map((patient) => (
                            <tr key={patient.tokenId}>
                              <td>{patient.tokenNo}</td>
                              <td>{patient.fullName}</td>
                              <td>{formatTime(patient.createdAt)}</td>
                              <td>{formatReasons(patient.dentalReasons)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn-touch"
                                  disabled={patient.status !== "Waiting"}
                                  onClick={() => updatePatientStatus(patient.tokenId, "Now Treating")}
                                >
                                  Call Next
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="empty-doctor-table" colSpan="5">
                              No assigned patients found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              )}
            </div>
          </section>
          )}

          {currentView !== "display-screen" && <DashboardFooter />}
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboard;