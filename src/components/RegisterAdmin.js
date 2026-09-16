//reg admin
import React, { useState } from "react";
import "./RegisterAdmin.css";
import { mapAdminFromApi, registerAdmin, saveAdmins, getAdmins } from "./adminStore";

const RegisterAdmin = ({ onExit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    nic: "",
    govEmployeeId: "",
    jobTitle: "",
    email: "",
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

    // Client-side validation for unique fields
    if (!formData.username?.trim() || !formData.email?.trim() || !formData.nic?.trim()) {
      setErrorMessage("Username, Email, and NIC are required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/register-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data.admin) {
          saveAdmins([...getAdmins(), mapAdminFromApi(data.admin)]);
        } else {
          registerAdmin(formData);
        }
        setStatusMessage(data.message || "Administrator registered successfully.");
        setFormData({
          fullName: "",
          contactNumber: "",
          nic: "",
          govEmployeeId: "",
          jobTitle: "",
          email: "",
          username: "",
          password: ""
        });
      } else {
        console.error("Registration failed:", data);
        // More specific error messages for common issues
        if (data.error?.includes("already exists")) {
          setErrorMessage(
            data.error 
          );
        } else {
          setErrorMessage(data.error || `Registration failed (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error("Frontend fetch error:", error);
      setErrorMessage( (error.message || "Cannot connect to backend server. Start dental-backend on port 5000."));
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="form-card">
      <div className="form-header">
        <h2>Administrative System User Access</h2>
      </div>

      <form className="admin-form" onSubmit={handleFormSubmit}>
        <fieldset className="form-section">
          <legend>Section 1: Personal Identity & Contact Information</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="fullName">Full Name </label>
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
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Section 2: Ministry of Health Registration Status</legend>
          <div className="form-grid">
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
            
              <label htmlFor="jobTitle">Job Title</label>
              <select
                id="jobTitle"
                name="jobTitle"
                value={formData.jobTitle}
                onChange={handleChange}
                required
              >
                <option value="">Select Job Title</option>
                <option value="Admin">Admin</option>
                <option value="Receptionist">Receptionist</option>
                <option value="Doctor">Doctor</option>
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
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Section 3: System Access Credentials</legend>
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

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>
          <button type="button" className="btn-cancel" onClick={onExit}>Cancel</button>
        </div>

        {statusMessage && <p className="form-success-message">{statusMessage}</p>}
        {errorMessage && <p className="form-error-message">{errorMessage}</p>}
      </form>
    </div>
  );
};

export default RegisterAdmin;
