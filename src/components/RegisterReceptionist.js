import React, { useState } from "react";
//import { toast } from 'react-toastify';
import "./RegisterAdmin.css";

const RegisterReceptionist = ({ onExit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    govEmployeeId: "",
    contactNumber: "",
    email: "",
    nic: "",
    gender: "",
    assignedWorkShift: "Weekdays Morning Shift",
    assignedUnit: "Dental Unit 01",
    username: "",
    password: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    if (!formData.username?.trim() || !formData.email?.trim() || !formData.nic?.trim()) {
      setErrorMessage("Username, Email, and NIC are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/register-receptionist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setStatusMessage(data.message || "Receptionist registered successfully.");
        setFormData({
          fullName: "",
          govEmployeeId: "",
          contactNumber: "",
          email: "",
          nic: "",
          gender: "",
          assignedWorkShift: "Weekdays Morning Shift",
          assignedUnit: "Dental Unit 01",
          username: "",
          password: ""
        });
      } else {
        console.error("Registration failed:", data);
        if (data.error?.includes("already exists")) {
          setErrorMessage(
            data.error +
            "\n\nMake sure to use UNIQUE values for:\n• Username\n• Email\n• NIC"
          );
        } else {
          setErrorMessage(data.error || `Registration failed (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error("Frontend fetch error:", error);
      setErrorMessage((error.message || "Cannot connect to backend server."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-card">
      <div className="form-header">
        <h2>Receptionist System User Access</h2>
      </div>

      {/* Added unique ID to connect external submission button */}
      <form id="receptionistRegistrationForm" className="reception-form" onSubmit={handleFormSubmit}>
        <fieldset className="form-section">
          <legend>Section 1: Personal Identity & Location Mapping</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="fullName">Full Name (With Initials)</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="govEmployeeId">Government Employee ID</label>
              <input
                type="text"
                id="govEmployeeId"
                name="govEmployeeId"
                value={formData.govEmployeeId}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                type="tel"
                id="contactNumber"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="nic">NIC</label>
              <input
                type="text"
                id="nic"
                name="nic"
                value={formData.nic}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="assignedUnit">Assigned Unit</label>
              <input
                type="text"
                id="assignedUnit"
                name="assignedUnit"
                value={formData.assignedUnit}
                onChange={handleChange}
                readOnly
              />
            </div>
            <div className="form-group">
              <label htmlFor="assignedWorkShift">Assigned Work Shift</label>
              <input
                type="text"
                id="assignedWorkShift"
                name="assignedWorkShift"
                value={formData.assignedWorkShift}
                onChange={handleChange}
                readOnly
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Section 2: System Access Credentials</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">System Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  👁
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {statusMessage && <p className="form-success-message">{statusMessage}</p>}
        {errorMessage && <p className="form-error-message">{errorMessage}</p>}
      </form>

      {/* Moved container outside the form block to bypass structural constraints */}
      <div className="form-actions">
        <button 
          type="submit" 
          form="receptionistRegistrationForm" 
          className="btn-submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Registering..." : "Register"}
        </button>
        <button type="button" className="btn-cancel" onClick={onExit}>Cancel</button>
      </div>
    </div>
  );
};

export default RegisterReceptionist;