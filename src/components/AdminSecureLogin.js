import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:5000`;

function AdminSecureLogin({ onLogin }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("Admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    try {
      const trimmedUsername = username.trim();
      const response = await fetch(`${API_BASE_URL}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin({
          role,
          username: data.username || trimmedUsername,
        });
        navigate("/dashboard", { replace: true });
      } else {
        setErrorMessage(data.message || "Invalid Admin Credentials");
      }
    } catch (error) {
      setErrorMessage("Server error. Connection failed.");
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
          <h2>Secure Administrator Portal</h2>

          <form onSubmit={handleSubmit}>
            <label>Select Access Role:</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Admin">Admin</option>
            </select>

            <label>Assigned System Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label>Access Account Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <div className="button-row">
              <button type="submit">Login</button>
            </div>
          </form>
        </div>
      </div>

      
        
      <footer className="footer">
        <p>&copy; 2026 Ministry of Health, Sri Lanka. All Rights Reserved</p>
        <p>Authorized personnel only. Unauthorized access attempts are logged.</p>
      </footer>
    </div>
  );
}



export default AdminSecureLogin;
