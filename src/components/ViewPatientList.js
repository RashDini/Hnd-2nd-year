import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ViewPatientList.css";


/*
const patientQueue = [
  {
    id: 1,
    tokenNo: "D-001",
    patientName: "Dini Perera",
    nic: "199512345V",
    dentalReason: "Tooth pain",
    liveQueueStatus: "Now Treating"
  },
  {
    id: 2,
    tokenNo: "D-002",
    patientName: "Amal Silva",
    nic: "199256789V",
    dentalReason: "Dental cleaning",
    liveQueueStatus: "Waiting"
  },
  {
    id: 3,
    tokenNo: "D-003",
    patientName: "Nimali Fernando",
    nic: "200012345678",
    dentalReason: "Gum swelling",
    liveQueueStatus: "Waiting"
  },
  {
    id: 4,
    tokenNo: "D-004",
    patientName: "Kasun Jayasinghe",
    nic: "199875432V",
    dentalReason: "Broken filling",
    liveQueueStatus: "Completed"
  }
];
*/
function ViewPatientList({ onExit }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [patientQueue, setPatientQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  //const [statusFilter, setStatusFilter] = useState("All");
  

  useEffect(() => {
    axios.get("http://localhost:5000/api/patients")
      .then((res) => setPatientQueue(res.data.patients))
      .catch((err) => setError(err.response?.data?.error || "Failed to load patients."))
      .finally(() => setLoading(false));
  }, []);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return patientQueue.filter((patient) => {
      const tokenNo = (patient.tokenNo || "").toLowerCase();
      const fullName = (patient.fullName || "").toLowerCase();
      const nic = (patient.nic || "").toLowerCase();

      return (
        tokenNo.includes(query) ||
        fullName.includes(query) ||
        nic.includes(query)
      );
    });
  }, [searchTerm, patientQueue]);

  


   /*patient.tokenNo.toLowerCase().includes(query) ||
      patient.patientName.toLowerCase().includes(query) ||
      patient.nic.toLowerCase().includes(query)
      */

  const statusClass = (status) => (status || "waiting").toLowerCase().replace(/\s+/g, "-");
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
  
 

  return (
    <div className="view-patient-panel">
      <div className="patient-list-header">
        <div>
          <h2>View Patient List</h2>
          <p>Today's live active queue registry</p>
        </div>
        <button className="exit-btn" type="button" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="patient-list-card">
        <div className="patient-toolbar">
          <div className="patient-search-wrapper">
            <span className="search-icon" aria-hidden="true">&#128269;</span>
            <input
              type="text"
              placeholder="Search by Token, Name or NIC"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="patient-table-wrapper">
          {loading ? (
            <p>Loading patients...</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
            <table className="patient-list-table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Patient Name</th>
                  <th>NIC</th>
                  <th>Dental Reason</th>
                  <th>Live Queue Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr key={patient.tokenId}>
                      <td>{patient.tokenNo}</td>
                      <td>{patient.fullName}</td>
                      <td>{patient.nic}</td>
                      <td>{formatReasons(patient.dentalReasons)}</td>
                      <td>
                        <span className={`patient-status ${statusClass(patient.status)}`}>
                          {patient.status || "Waiting"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="empty-patient-table" colSpan="5">
                      No patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default ViewPatientList;