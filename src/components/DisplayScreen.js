import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./DisplayScreen.css";

/*
const statusTypeMap = {
  "Next In Line": "next",
  "Preparing Next": "preparing",
  "Waiting": "waiting",
};
*/

const DisplayScreen = ({ embedded = false }) => {
  const [queuePatients, setQueuePatients] = useState([]);

  const fetchQueue = () => {
    axios.get("http://localhost:5000/api/patients")
      .then((res) => setQueuePatients(res.data.patients))
      .catch((err) => console.error("Failed to load queue:", err));
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // auto-refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const { currentPatient, lobbyPatients } = useMemo(() => {
    const activePatient = queuePatients.find((p) => p.status === "Now Treating");
    const remainingQueue = queuePatients.filter(
      (p) => p.status !== "Now Treating" && p.status !== "Completed" && p.status !== "Absent at Call"
    );

    /*
  const { currentPatient, lobbyPatients } = useMemo(() => {
    // 1. Find the patient currently inside with the doctor
    const activePatient = queuePatients.find((p) => p.status === "Now Treating");

    // 2. Filter out the treated patient to handle the lobby list
    const remainingQueue = queuePatients.filter((p) => p.status !== "Now Treating");
  */
    const waitingPatients = [];
    for (let i = 0; i < 3; i++) {
      if (remainingQueue[i]) {
        let calculatedStatus = "Waiting";
        if (i === 0) calculatedStatus = "Next In Line";
        if (i === 1) calculatedStatus = "Preparing Next";

        waitingPatients.push({
          ...remainingQueue[i],
          displayStatus: calculatedStatus,
        });
      } else {
        waitingPatients.push({
          tokenId: `empty-${i}`,
          tokenNo: "-",
          displayStatus: "Waiting",
        });
      }
    }

return {
  currentPatient: activePatient || {
    tokenNo: "-",
    room: "Dental Unit 01",
    assignedDoctor: "Active Dental Surgeon",
  },
  lobbyPatients: waitingPatients,
};
  }, [queuePatients]);

  return (
    <div className={`display-screen-container ${embedded ? "display-screen-embedded" : ""}`}>
      <header className="display-header">
        <div className="display-header-inner">
          <div className="header-title-group">
            <div className="header-name-row">
              <div className="display-logo-frame">
                <img src="/gov-logo.jpg" alt="Government Logo" className="gov-logo" />
              </div>
              <h1>WIJAYA KUMARATUNGA MEMORIAL HOSPITAL</h1>
            </div>
            <h2>DENTAL UNIT QUEUE SYSTEM</h2>
          </div>
        </div>
      </header>

      <main className="display-main-content">
        <section className="current-patient-section" aria-label="Current Patient">
          <h3 className="section-title-label">Current Patient</h3>
          <div className="current-patient-card">
            <div className="current-row">
              <span className="current-field-label">Token:</span>
              <strong className="current-token">{currentPatient.tokenNo}</strong>
            </div>
            <div className="current-row">
              <span className="current-field-label">Room:</span>
              <span>{currentPatient.room || "Dental Unit 01"}</span>
            </div>
           <div className="current-row">
            <span className="current-field-label">Surgeon:</span>
            <span>{currentPatient.assignedDoctor || "Active Dental Surgeon"}</span>
          </div>
          </div>
        </section>

        <section className="queue-lobby-section" aria-label="Next Patients in Queue Lobby">
          <h3 className="lobby-heading-title">Next Patients in Queue Lobby</h3>
          <div className="queue-lobby-grid">
            {lobbyPatients.map((patient, index) => {
              return (
                <div key={patient.tokenId || index} className="lobby-card">
                  <h4>{patient.displayStatus}</h4>
                  <div className="lobby-detail-row">
                    <span>Token:</span>
                    <strong>{patient.tokenNo}</strong>
                  </div>
                  <div className="lobby-detail-row">
                    <span>Status:</span>
                    <span className={`status-badge badge-${(patient.status || "waiting").toLowerCase()}`}>
                      {patient.status || "Waiting"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DisplayScreen;