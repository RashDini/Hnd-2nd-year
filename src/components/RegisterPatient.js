import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from 'react-toastify';
import { registerQueuePatient } from "./queueStore";
import "./RegisterPatient.css";

const initialFormData = {
  fullName: "",
  nic: "",
  age: "",
  address: "",
  contactNumber: "",
  gender: "",
  dentalReasons: [],
  clinicalNotes: "",
  bhtFileNo: "",
  arrivalMode: "walk-in",
  assignedDoctor: "",
  patientCategory: "standard-citizen",
};

const dentalReasons = [
  { value: "tooth-extraction", label: "Tooth Extraction" },
  { value: "cleaning", label: "Cleaning" },
  { value: "dental-filling", label: "Dental Filling" },
  { value: "toothache", label: "Toothache" },
];

const RegisterPatient = ({ onExit }) => {
  const [formData, setFormData] = useState(initialFormData);
  // State to hold dynamically loaded doctors
  const [activeDoctors, setActiveDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Fetch doctors list automatically on component load context
  useEffect(() => {
    axios.get("http://localhost:5000/api/doctors")
      .then((res) => {
        // Handle array responses directly or wrapped response types safely
        const incomingData = Array.isArray(res.data) ? res.data : res.data.doctors || [];
        
        // Filter down explicitly to active personnel profiles
        const activeOnly = incomingData.filter(
          (doc) => (doc.account_status || "").toLowerCase() === "active"
        );
        setActiveDoctors(activeOnly);
      })
      .catch((err) => {
        console.error("Failed loading active doctors configuration context list:", err);
      })
      .finally(() => {
        setLoadingDoctors(false);
      });
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleReasonChange = (e) => {
    const { value, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      dentalReasons: checked
        ? [...prev.dentalReasons, value]
        : prev.dentalReasons.filter((reason) => reason !== value),
    }));
  };

  const handleClear = () => {
    setFormData(initialFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const registeredPatient = await registerQueuePatient(formData);
      toast.success(`Patient registered. Token ${registeredPatient?.tokenNumber || registeredPatient?.token?.tokenNo || 'tokenNo'} generated and sent to display screen.`);      
      setFormData(initialFormData);
    } catch (error) {
      toast.error(`Error: ${error.message || "Could not register patient."}`);
    }
  };

  return (
    <div className="patient-register-panel">
      <div className="patient-form-header">
        <h2>Register Patients</h2>
      </div>

      <form className="patient-form" onSubmit={handleSubmit}>
        <fieldset className="patient-section">
          <legend>Section 1: Identity & Demographics</legend>
          <div className="patient-grid demographics-grid">
            <div className="patient-field wide-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-field">
              <label htmlFor="age">Age</label>
              <input
                id="age"
                type="number"
                min="0"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-field">
              <label htmlFor="contactNumber">Contact No</label>
              <input
                id="contactNumber"
                type="tel"
                value={formData.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-field wide-field">
              <label htmlFor="nic">NIC</label>
              <input
                id="nic"
                type="text"
                value={formData.nic}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-field wide-field">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>

            <div className="patient-field">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  Select Gender
                </option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className="patient-section">
          <legend>Section 2: Dental Reason</legend>
          <p className="section-helper">Select Primary Treatment Reason</p>

          <div className="reason-grid">
            {dentalReasons.map((reason) => (
              <label className="reason-option" key={reason.value}>
                <input
                  type="checkbox"
                  value={reason.value}
                  checked={formData.dentalReasons.includes(reason.value)}
                  onChange={handleReasonChange}
                />
                {reason.label}
              </label>
            ))}
          </div>

          <div className="patient-field notes-field">
            <label htmlFor="clinicalNotes">Other specific clinical notes</label>
            <textarea
              id="clinicalNotes"
              value={formData.clinicalNotes}
              onChange={handleChange}
              rows="3"
            />
          </div>
        </fieldset>

        <fieldset className="patient-section">
          <legend>Section 3: Hospital Routing & Auditing</legend>
          <div className="patient-grid routing-grid">
            <div className="patient-field">
              <label htmlFor="bhtFileNo">BHT / Clinic File No</label>
              <input
                id="bhtFileNo"
                type="text"
                value={formData.bhtFileNo}
                onChange={handleChange}
              />
            </div>

            <div className="patient-field">
              <label htmlFor="arrivalMode">Mode of Arrival</label>
              <select
                id="arrivalMode"
                value={formData.arrivalMode}
                onChange={handleChange}
              >
                <option value="walk-in/self-referral">Walk-In/Self-Referral</option>
                <option value="opd-referral">OPD-Referral</option>
                <option value="inter-hospital">Inter-Hospital</option>
              </select>
            </div>

            {/* Completely Dynamic Dropdown Input Selection Row */}
            <div className="patient-field">
              <label htmlFor="assignedDoctor">Assign to Doctor</label>
              <select
                id="assignedDoctor"
                value={formData.assignedDoctor}
                onChange={handleChange}
                required
              >
                <option value="" disabled>
                  {loadingDoctors ? "Loading active doctors..." : "Select Doctor"}
                </option>
                {activeDoctors.map((doc) => {
                  const doctorName = doc.full_name || doc.fullName;
                  return (
                    <option key={doc.id || doc._id || doctorName} value={doctorName}>
                      {doctorName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="patient-field">
              <label htmlFor="patientCategory">Patient Category Type</label>
              <select
                id="patientCategory"
                value={formData.patientCategory}
                onChange={handleChange}
              >
                <option value="standard-citizen">Standard Citizen</option>
                <option value="hospital-staff">Hospital Staff/Ministry of Health Employee</option>
                <option value="armed-forces/Police">Armed Forces/Police</option>
                <option value="forign-national">Foreign-National</option>
              </select>
            </div>
          </div>
        </fieldset>

        <div className="patient-actions">
          <button type="submit" className="btn-submit patient-submit">
            Generate Token & Broadcast to Display Screen
          </button>
          <button type="button" className="btn-clear" onClick={handleClear}>
            Clear
          </button>
          <button type="button" className="btn-cancel" onClick={onExit}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterPatient;