import React, { useState } from "react";
import "./RegisterDoctor.css";
import { mapDoctorFromApi, registerDoctor, saveDoctors, getDoctors } from "./doctorStore";

const RegisterDoctor = ({ onExit }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    nic: "",
    dob: "", 
    address: "",
    contactNumber: "",
    gender: "",
    slmcRegNumber: "",
    govEmail: "",
    govEmployeeId: "",
    designation: "Dental Surgeon",
    specialization: "", 
    username: "",
    password: "",
    emergencyContactName: "", 
    emergencyContactPhone: "", 
    accountStatus: "Active" ,
    // New fields added here
    assignedUnit: "Dental Unit 1",
    assignedShift: "Weekdays Morning Shift",
    availableDate: "",
    availableTime: "",
    inactiveReason: ""
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

    if (!formData.username?.trim() || !formData.govEmail?.trim() || !formData.nic?.trim() || !formData.slmcRegNumber?.trim()) {
      setErrorMessage("Username, Email, NIC, and SLMC Reg. No. are required.");
      setIsSubmitting(false);
      return;
    }

    // Map frontend state to match new database snake_case field properties
    const backendPayload = {
      full_name: formData.fullName,
      nic: formData.nic,
      dob: formData.dob,
      address: formData.address,
      contact_number: formData.contactNumber,
      gender: formData.gender,
      slmc_Reg_Number: formData.slmcRegNumber,
      gov_Email: formData.govEmail,
      gov_EmpId: formData.govEmployeeId,
      designation: formData.designation,
      specialization: formData.specialization,
      username: formData.username,
      password: formData.password,
      contact_Person_name: formData.emergencyContactName, 
      emergency_Contact_no: formData.emergencyContactPhone, 
      account_status: formData.accountStatus,
      // Pass the new data based on conditional selection or nullify the non-selected fields
      assigned_unit: formData.accountStatus === "Active" ? formData.assignedUnit : null,
      assigned_shift: formData.accountStatus === "Active" ? formData.assignedShift : null,
      available_date: formData.accountStatus === "Active" ? formData.availableDate : null,
      available_time: formData.accountStatus === "Active" ? formData.availableTime : null,
      inactive_reason: formData.accountStatus === "Inactive" ? formData.inactiveReason : null
    };

    try {
      const response = await fetch(`http://localhost:5000/api/register_doctor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(backendPayload) // Changed from formData to backendPayload
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        if (data.doctor) {
          saveDoctors([...getDoctors(), mapDoctorFromApi(data.doctor)]);
        } else {
          registerDoctor(formData);
        }
        
        setStatusMessage(data.message || "Doctor registered successfully!");
        
        // Reset Form back to initial values
        setFormData({
          fullName: "", nic: "", dob: "", address: "", contactNumber: "", gender: "",
          slmcRegNumber: "", govEmail: "", govEmployeeId: "", designation: "Dental Surgeon",
          specialization: "", username: "", password: "",
          emergencyContactName: "", emergencyContactPhone: "", accountStatus: "Active",
          assignedUnit: "", assignedShift: "", availableDate: "", availableTime: "", inactiveReason: ""
        });
      } else {
        if (data.error?.includes("already exists")) {
          setErrorMessage(
            + data.error + 
            "\n\nMake sure to use UNIQUE values for:\n• Username\n• Email\n• NIC"
          );
        } else {
          setErrorMessage(data.error || `Registration failed (Status: ${response.status})`);
        }
      }
    } catch (error) {
      console.error("Frontend fetch error:", error);
      setErrorMessage(+ (error.message || "Cannot connect to backend server. Start dental-backend on port 5000."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-doctor-panel form-card">
      <div className="register-doctor-header">
        <h2>Register Doctor</h2>
      </div>

      <form className="registration-form doctor-form" onSubmit={handleFormSubmit}>
        
        {/* Section 1: Personal Identity */}
        <fieldset className="form-section">
          <legend>Section 1: Personal Identity</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="fullName">Full Name (with initials)</label>
              <input type="text" id="fullName" name="fullName" placeholder="e.g. W.A. Perera" value={formData.fullName} onChange={handleChange} required/>
            </div>
            
            <div className="form-group">
              <label htmlFor="dob">Date of Birth</label>
              <input type="date" id="dob" name="dob" value={formData.dob} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select id="gender" name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="" disabled>Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="nic">NIC</label>
              <input type="text" id="nic" name="nic" value={formData.nic} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input type="text" id="address" name="address" value={formData.address} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="contactNumber">Contact No</label>
              <input type="text" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required />
            </div>
          </div>
        </fieldset>

        {/* Section 2: Government & Medical Credentials */}
        <fieldset className="form-section">
          <legend>Section 2: Government & Medical Credentials</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="slmcRegNumber">SLMC Reg. No.</label>
              <input type="text" id="slmcRegNumber" name="slmcRegNumber" value={formData.slmcRegNumber} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="govEmail">Government Email</label>
              <input type="email" id="govEmail" name="govEmail" value={formData.govEmail} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="govEmployeeId">Government Employee ID</label>
              <input type="text" id="govEmployeeId" name="govEmployeeId" value={formData.govEmployeeId} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <input 
                type="text" 
                id="designation" 
                name="designation" 
                value={formData.designation} 
                onChange={handleChange} 
                disabled 
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="specialization">Specialization / Qualifications</label>
              <input type="text" id="specialization" name="specialization" placeholder="e.g. BDS, MDS (Orthodontics)" value={formData.specialization} onChange={handleChange} />
            </div>
          </div>
        </fieldset>

        {/* Section 3: System Access Credentials */}
        <fieldset className="form-section">
          <legend>Section 3: System Access Credentials</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="username">System Username</label>
              <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input type={showPassword ? "text" : "password"} id="password" name="password" value={formData.password} onChange={handleChange} required />
                <button
                  type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>
                  👁
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Section 4: Emergency Contact */}
        <fieldset className="form-section">
          <legend>Section 4: Emergency Contact</legend>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="emergencyContactName">Contact Person Name</label>
              <input type="text" id="emergencyContactName" name="emergencyContactName" placeholder="e.g. Spouse / Parent Name" value={formData.emergencyContactName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="emergencyContactPhone">Emergency Contact No</label>
              <input type="text" id="emergencyContactPhone" name="emergencyContactPhone" value={formData.emergencyContactPhone} onChange={handleChange} required />
            </div>
          </div>
        </fieldset>

        {/* Section 5: Availability Status */}
        <fieldset className="form-section availability-register-section">
          <legend>Section 5: Availability / Status</legend>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Account Status</label>
              <div className="register-radio-options">
                <label className="register-radio-option">
                  <input type="radio" name="accountStatus" value="Active" checked={formData.accountStatus === "Active"} onChange={handleChange} />
                  Active
                </label>
                <label className="register-radio-option">
                  <input type="radio" name="accountStatus" value="Inactive" checked={formData.accountStatus === "Inactive"} onChange={handleChange} />
                  Inactive
                </label>
              </div>
            </div>

{/* Conditionally rendered active fields */}
            {formData.accountStatus === "Active" && (
              <>
                <div className="form-group">
                  <label htmlFor="assignedUnit">Assigned Unit</label>
                  <input type="text" id="assignedUnit" name="assignedUnit" placeholder="Dental Unit 1" value={formData.assignedUnit} onChange={handleChange} readOnly />
                </div>
                <div className="form-group">
                  <label htmlFor="assignedShift">Assigned Shift</label>
                  <input id="assignedShift" name="assignedShift" placeholder="Weekdays Morning Shift"value={formData.assignedShift} onChange={handleChange} readOnly/>
                   
                </div>
                <div className="form-group">
                  <label htmlFor="availableDate">Available Date</label>
                  <input type="date" id="availableDate" name="availableDate" value={formData.availableDate} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label htmlFor="availableTime">Available Time</label>
                  <input type="text" id="availableTime" name="availableTime" placeholder="8.00 AM to 1.00 PM" value={formData.availableTime} onChange={handleChange}  />
                </div>
              </>
            )}

            {/* Conditionally rendered inactive reason field */}
            {formData.accountStatus === "Inactive" && (
              <div className="form-group full-width">
                <label htmlFor="inactiveReason">Inactive Reason</label>
                <textarea 
                  id="inactiveReason" 
                  name="inactiveReason" 
                  placeholder="Provide details regarding the inactivity (e.g., Medical Leave, Resigned)" 
                  value={formData.inactiveReason} 
                  onChange={handleChange} 
                  required
                  rows={3}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </button>
          <button type="button" className="btn-cancel" onClick={onExit}>Cancel</button>
        </div>

        {statusMessage && <p className="form-success-message">{statusMessage}</p>}
        {errorMessage && <pre className="form-error-message">{errorMessage}</pre>}
      </form>
    </div>
  );
};

export default RegisterDoctor;