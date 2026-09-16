import React, { useEffect } from "react";
import "./ManageResets.css";

function ManageResets({ onExit, resetRequests = [], onRefreshRequests, onProcessRequest }) {
  useEffect(() => {
    if (typeof onRefreshRequests === "function") {
      onRefreshRequests();
    }
  }, [onRefreshRequests]);

  return (
    <div className="manage-resets-panel">
      <div className="reset-header">
        <h2>Password Reset Requests</h2>
        <button className="exit-btn" type="button" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="reset-card">
        <table className="reset-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Username</th>
              <th>Requested Time</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {resetRequests.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-requests">
                  No password reset requests yet.
                </td>
              </tr>
            ) : (
              resetRequests.map((request) => (
                <tr key={request.id}>
                  <td>{request.name}</td>
                  <td>{request.role}</td>
                  <td>{request.username}</td>
                  <td>{request.requestedAt}</td>
                  <td>
                    <span className="reset-status">{request.status}</span>
                  </td>
                  <td>
                    <button
                      className="btn-reset-action"
                      type="button"
                      disabled={request.status !== "Pending"}
                      onClick={() => onProcessRequest(request.id)}
                    >
                      {request.status === "Pending" ? "Process" : "Completed"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ManageResets;
