import React, { useState } from "react";
import "../App.css";

const LOGIN_CREDENTIALS = {
  Receptionist: {
    username: "receptionist",
    password: "reception123",
    name: "Receptionist",
  },
  Doctor: {
    username: "doctor",
    password: "doctor123",
    name: "Doctor",
  },
};

function LoginPortal({ onLogin, onSubmitResetRequest }) {
  const [role, setRole] = useState("Receptionist");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetFormData, setResetFormData] = useState({
    role: "Receptionist",
    employeeId: "",
    fullName: "",
    email: "",
  });

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedUsername = username.trim();
    const roleCredentials = LOGIN_CREDENTIALS[role];
    const isValidLogin =
      roleCredentials &&
      roleCredentials.username === trimmedUsername &&
      roleCredentials.password === password;

    if (!isValidLogin) {
      setErrorMessage(`Invalid ${role.toLowerCase()} credentials.`);
      return;
    }

    onLogin({
      role,
      username: roleCredentials.username,
      name: roleCredentials.name,
    });
  };

  const openResetForm = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setResetFormData({
      role,
      employeeId: username.trim(),
      fullName: "",
      email: "",
    });
    setShowResetForm(true);
  };

  const handleResetChange = (event) => {
    const { name, value } = event.target;
    setResetFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleResetSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (typeof onSubmitResetRequest !== "function") {
      setErrorMessage("Unable to submit password reset request. Please try again.");
      return;
    }

    const requestData = {
      role: resetFormData.role,
      name: resetFormData.fullName.trim(),
      username: resetFormData.employeeId.trim(),
      email: resetFormData.email.trim(),
    };

    try {
      const savedRequest = await onSubmitResetRequest(requestData);

      if (savedRequest === false) {
        setErrorMessage("Password reset request could not be saved. Please try again.");
        return;
      }

      setShowResetForm(false);
      setSuccessMessage("Password reset request submitted. Admin will review it shortly.");
      setResetFormData({
        role,
        employeeId: "",
        fullName: "",
        email: "",
      });
    } catch (error) {
      setErrorMessage("Password reset request could not be saved. Please try again.");
    }
  };

  return (
    <div className="login-page">
      <header className="top-header">
        <div className="profile-section">
          <div className="profile-circle">
            <img
              src="/gov-logo.jpg"
              alt="Government Logo"
              className="government-image"
            />
          </div>
          <span>WIJAYA KUMARATUNGA MEMORIAL HOSPITAL - DENTAL UNIT QUEUE SYSTEM</span>
        </div>
      </header>

      <div className="main-container">
        <div className="image-section">
          <img
            src="/hospital.jpg"
            alt="Hospital"
            className="hospital-image"
          />

          <div className="image-overlay">
            Welcome to Wijaya Kumaratunga Memorial Hospital.
            <p>"To provide excellent healthcare and set an example of a model hospital"</p>
          </div>
        </div>

        <div className="login-section">
          <h2>{role} Login Portal</h2>

          <form onSubmit={handleLoginSubmit}>
            <label>Select Access Role:</label>
            <select
              value={role}
              onChange={(event) => {
                const selectedRole = event.target.value;
                setRole(selectedRole);
                setResetFormData((currentData) => ({
                  ...currentData,
                  role: selectedRole,
                }));
                setErrorMessage("");
                setSuccessMessage("");
              }}
            >
              <option value="Receptionist">Receptionist</option>
              <option value="Doctor">Doctor</option>
            </select>

            <label>Assigned System Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />

            <label>Access Account Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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

            {errorMessage && <p className="login-error-message">{errorMessage}</p>}
            {successMessage && <p className="login-success-message">{successMessage}</p>}

            <div className="button-row">
              <button type="submit">Login</button>
              <button type="button" className="forgot" onClick={openResetForm}>
                Forgot Password
              </button>
            </div>
          </form>
        </div>
      </div>

      {showResetForm && (
        <div className="password-request-overlay" role="dialog" aria-modal="true">
          <form className="password-request-panel" onSubmit={handleResetSubmit}>
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

            <label>Access Role</label>
            <select
              name="role"
              value={resetFormData.role}
              onChange={handleResetChange}
              required
            >
              <option value="Receptionist">Receptionist</option>
              <option value="Doctor">Doctor</option>
            </select>

            <label>Employee ID / Username</label>
            <input
              name="employeeId"
              value={resetFormData.employeeId}
              onChange={handleResetChange}
              required
            />

            <label>Full Name</label>
            <input
              name="fullName"
              value={resetFormData.fullName}
              onChange={handleResetChange}
              required
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              value={resetFormData.email}
              onChange={handleResetChange}
              required
            />

            <div className="password-request-actions">
              <button type="submit">Submit Request</button>
              <button type="button" onClick={() => setShowResetForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="footer">
        <p>&copy; 2026 Ministry of Health, Sri Lanka. All Rights Reserved</p>
        <p>Authorized personnel only. Unauthorized access attempts are logged.</p>
      </footer>
    </div>
  );
}

export default LoginPortal;
