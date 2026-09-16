import React, { useEffect, useState } from "react";
import axios from "axios";
import "./GenerateReport.css";

//const API_BASE = "http://localhost:5000/api";
// Automatically use the current network hostname (e.g. 192.168.8.171) instead of localhost
// Automatically use the current network hostname (e.g. 192.168.8.171) instead of localhost
const HOST = window.location.hostname || "localhost";
const API_BASE = `http://${HOST}:5000/api`;

function GenerateReport({ onExit }) {
  // ---- Criteria state ----
  const [timeRange, setTimeRange] = useState("daily"); // daily | weekly | monthly | custom
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [format, setFormat] = useState("pdf"); // pdf | excel

  // ---- Data state ----
  const [doctors, setDoctors] = useState([]);
  const [tokenRows, setTokenRows] = useState([]);
  const [totals, setTotals] = useState({ issued: 0, completed: 0, absent: 0 });

  // ---- UI state ----
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // Load the doctor list once, for the filter dropdown
  useEffect(() => {
    axios
      .get(`${API_BASE}/doctors`)
      .then((res) => {
        const allDoctors = res.data.doctors || [];
        
        // ✅ Filter only active doctors (adjust 'status' / 'Active' to match your DB schema)
        const activeDoctors = allDoctors.filter(
          (doc) => doc.account_status === "Active" || doc.account_status === "active" || doc.isActive === 1 || doc.isActive === true
        );

        setDoctors(activeDoctors);
      })
      .catch(() => setDoctors([]));
  }, []);

  const buildParams = () => {
    const params = { range: timeRange, doctor: doctorFilter, status: statusFilter };
    if (timeRange === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    } else {
      params.date = reportDate;
    }
    return params;
  };

  const handlePreview = () => {
    setLoading(true);
    setError("");
    setHasPreviewed(true);

    axios
      .get(`${API_BASE}/report`, { params: buildParams() })
      .then((res) => {
        setTokenRows(res.data.rows);
        setTotals(res.data.summary);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Failed to load report.");
        setTokenRows([]);
        setTotals({ issued: 0, completed: 0, absent: 0 });
      })
      .finally(() => setLoading(false));
  };

  const handleGenerate = async () => {
    setDownloading(true);
    setError("");

    try {
      const response = await axios.get(`${API_BASE}/report/export`, {
        params: { ...buildParams(), format },
        responseType: "blob",
      });

      const extension = format === "excel" ? "xlsx" : "pdf";
      const blob = new Blob([response.data], {
        type:
          format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `token-report-${timeRange}-${reportDate || startDate}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to generate the report file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="generate-report-panel">
      <div className="report-header">
        <div>
          <h2>Generate Report</h2>
        </div>
        <button className="exit-btn" type="button" onClick={onExit}>
          Exit
        </button>
      </div>

      <div className="report-card">
        {/* ---------------- Criteria selection ---------------- */}
        <div className="criteria-section">
          <div className="time-range-group" aria-label="Time range">
            <span>Time Range :</span>
            <label>
              <input
                type="radio"
                name="timeRange"
                value="daily"
                checked={timeRange === "daily"}
                onChange={(event) => setTimeRange(event.target.value)}
              />
              Daily
            </label>
            <label>
              <input
                type="radio"
                name="timeRange"
                value="weekly"
                checked={timeRange === "weekly"}
                onChange={(event) => setTimeRange(event.target.value)}
              />
              Weekly
            </label>
            <label>
              <input
                type="radio"
                name="timeRange"
                value="monthly"
                checked={timeRange === "monthly"}
                onChange={(event) => setTimeRange(event.target.value)}
              />
              Monthly
            </label>
            <label>
              <input
                type="radio"
                name="timeRange"
                value="custom"
                checked={timeRange === "custom"}
                onChange={(event) => setTimeRange(event.target.value)}
              />
              Custom Range
            </label>
          </div>

          <div className="criteria-grid">
            {timeRange === "custom" ? (
              <>
                <label className="field-control">
                  Start Date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label className="field-control">
                  End Date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="field-control">
                Date
                <input
                  type="date"
                  value={reportDate}
                  onChange={(event) => setReportDate(event.target.value)}
                />
              </label>
            )}

            <label className="field-control">
              Doctor
              <select value={doctorFilter} onChange={(event) => setDoctorFilter(event.target.value)}>
                <option value="all">All Doctors</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.full_name || doc.username}>
                    {doc.full_name || doc.username}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-control">
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="absent">Absent at Call</option>
                <option value="waiting">Waiting</option>
              </select>
            </label>

            <label className="field-control">
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="pdf">PDF</option>
                <option value="excel">Excel (.xlsx)</option>
              </select>
            </label>
          </div>

          <div className="criteria-actions">
            <button type="button" className="btn-preview" onClick={handlePreview} disabled={loading}>
              {loading ? "Loading..." : "Preview"}
            </button>
            <button type="button" className="btn-generate" onClick={handleGenerate} disabled={downloading}>
              {downloading ? "Generating..." : `Generate ${format === "excel" ? "Excel" : "PDF"} Report`}
            </button>
          </div>
        </div>

        {error && <p className="report-error">{error}</p>}

        {/* ---------------- Preview (only after user asks for it) ---------------- */}
        {hasPreviewed && !loading && !error && (
          <>
            <h3>Intake Volume Summary</h3>
            <div className="summary-grid">
              <div className="summary-box">
                <span>Total Token Issued</span>
                <strong>{totals.issued}</strong>
              </div>
              <div className="summary-box">
                <span>Sessions Completed</span>
                <strong>{totals.completed}</strong>
              </div>
              <div className="summary-box">
                <span>Absent at Call</span>
                <strong>{totals.absent}</strong>
              </div>
            </div>

            <div className="report-table-header">
              <h3>Token Breakdown Preview</h3>
              <span>{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Report</span>
            </div>

            <div className="report-table-wrapper">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Printed Time</th>
                    <th>Attend Doctor Name</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tokenRows.length > 0 ? (
                    tokenRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.tokenNo}</td>
                        <td>{formatTime(row.createdAt)}</td>
                        <td>{row.doctor}</td>
                        <td>
                          <span
                            className={`status-pill ${(row.status || "")
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        No tokens found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!hasPreviewed && !error && (
          <p className="report-hint">
           
          </p>
        )}
      </div>
    </div>
  );
}

export default GenerateReport;
