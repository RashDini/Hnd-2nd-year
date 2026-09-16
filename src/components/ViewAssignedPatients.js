import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./ViewAssignedPatients.css";


function ViewAssignedPatients({ onExit }) {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    axios.get("http://localhost:5000/api/patients")
      .then((res) => setAssignedPatients(res.data.patients))
      .catch((err) => setError(err.response?.data?.error || "Failed to load patients."))
      .finally(() => setLoading(false));
  }, []);

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


   const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return assignedPatients.filter((patient) => {
      const tokenNo = (patient.tokenNo || "").toLowerCase();
      const fullName = (patient.fullName || "").toLowerCase();
      const nic = (patient.nic || "").toLowerCase();

  const matchesSearch =
        tokenNo.includes(query) ||
        fullName.includes(query) ||
        nic.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Absent" ? patient.status === "Absent at Call" : patient.status === statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, assignedPatients]);

const statusClass = (status) => (status || "waiting").toLowerCase().replace(/\s+/g, "-");

      

  return (
    <div className="assigned-patients-panel">
      <div className="assigned-header">
        <div>
          <h2>View Assigned Patients</h2>
          <p>Today's doctor assigned patients</p>
        </div>
        <button className="exit-btn" type="button" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="assigned-card">
        <div className="assigned-toolbar">
          <div className="assigned-search-wrapper">
            <span className="search-icon" aria-hidden="true">&#128269;</span>
            <input
              type="text"
              placeholder="Search by token, name or NIC"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="assigned-filter-group" aria-label="Filter queue status">
            {["All", "Waiting", "Now Treating", "Completed", "Absent"].map((status) => (
              <button
                key={status}
                type="button"
                className={statusFilter === status ? "active" : ""}
                onClick={() => setStatusFilter(status)}
              >
                {status === "All" ? "All Patients" : status}
              </button>
            ))}
          </div>
        </div>

        <h3>Schedule Breakdown</h3>

        <div className="assigned-table-wrapper">
          {loading ? (
            <p>Loading patients...</p>
          ) : error ? (
            <p>{error}</p>
          ) : (
          <table className="assigned-patients-table">
            <thead>
              <tr>
                <th>Token No</th>
                <th>Full Name</th>
                <th>NIC</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Contact No</th>
                <th>Address</th>
                <th>Clinical Reason</th>
                <th>Intake Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr key={patient.tokenId}>
                    <td>{patient.tokenNo}</td>
                    <td>{patient.fullName}</td>
                    <td>{patient.nic}</td>
                    <td>{patient.age}</td>
                    <td>{patient.gender}</td>
                    <td>{patient.contactNumber}</td>
                    <td>{patient.address}</td>
                    <td>{formatReasons(patient.dentalReasons)}</td>
                    <td>{formatTime(patient.createdAt)}</td>
                    <td>
                      <span className={`assigned-status ${statusClass(patient.status)}`}>
                        {patient.status || "Waiting"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="empty-assigned-table" colSpan="10">
                    No assigned patients found.
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

export default ViewAssignedPatients;