import React, { useState, useEffect } from 'react';
import './ManageDoctor.css';
import { toast } from 'react-toastify';
import { getDoctors, mapDoctorFromApi, saveDoctors, subscribeToDoctors } from './doctorStore';

// Explicitly define the base URL to prevent port 3000 proxy mismatches
const API_BASE = "http://localhost:5000";

function ManageDoctor({ onExit }) {
  const [doctors, setDoctors] = useState(() => getDoctors());
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showEditPassword, setShowEditPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    slmcNo: '',
    fullName: '',
    govEmId: '',
    nic: '',
    dob: '',
    age: '',
    gender: '',
    address: '',
    contactNo: '',
    email: '',
    designation: 'Dental Surgeon',
    specialization: '',
    accountStatus: 'Active', 
    assignedUnit: 'Dental Unit 01',
    assignedShift: 'Weekdays Morning Shift',
    availableDate: '',
    availableTime: '',
    inactiveReason: '',
    username: '',
    password: '',
    contactPersonName: '',
    emergencyContactNo: ''
  });

  useEffect(() => {
    const unsubscribe = subscribeToDoctors(setDoctors);

    fetch(`${API_BASE}/api/doctors`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((data) => {
        const fetchedData = Array.isArray(data) ? data : data.doctors;
        const doctorList = Array.isArray(fetchedData) 
          ? fetchedData.map(mapDoctorFromApi)
          : [];
        saveDoctors(doctorList);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        saveDoctors(getDoctors());
      });

    return unsubscribe;
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditClick = (doctor) => {
    setEditingId(doctor.id);
    setFormData({
      slmcNo: doctor.slmc_Reg_Number || doctor.slmcNo || '',
      fullName: doctor.full_name || doctor.fullName || '',
      govEmId: doctor.gov_EmpId || doctor.govEmId || '',
      nic: doctor.nic || '',
      dob: doctor.dob || '',
      gender: doctor.gender || '',
      address: doctor.address || '',
      designation: doctor.designation || 'Dental Surgeon',
      specialization: doctor.specialization || '',
      contactNo: doctor.contact_number || doctor.contactNo || '',
      email: doctor.gov_Email || doctor.email || '',
      accountStatus: doctor.account_status || 'Active',
      assignedUnit: doctor.assigned_unit || 'Dental Unit 01',
      assignedShift: doctor.assigned_shift || 'Weekdays Morning Shift',
      availableDate: doctor.available_date ? doctor.available_date.substring(0, 10) : '',
      availableTime: doctor.available_time || '',
      inactiveReason: doctor.inactive_reason || '',
      username: doctor.username || '',
      password: doctor.password || '',
      contactPersonName: doctor.contact_Person_name || '',
      emergencyContactNo: doctor.emergency_Contact_no || ''
    });
  };

  const handleDeleteClick = async (doctor) => {
    if (!doctor || !doctor.id) {
      toast.error("Invalid doctor selected for deletion.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete doctor ${doctor.full_name || ''} `)) {
      return;
    }

    const nextDoctors = doctors.filter((doc) => doc.id !== doctor.id);
  
    try {
      const response = await fetch(`${API_BASE}/api/doctors/${doctor.id}`, { 
        method: "DELETE" 
      });

      if (response.ok) {
        toast.success("Doctor deleted from database successfully!"); 
        saveDoctors(nextDoctors);
        if (editingId === doctor.id) handleClear();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || `Server returned error code status ${response.status}`);
      }
    } catch (error) {
      console.error("Failed deleting database record:", error);
      toast.warning("Server connection lost. Saved changes locally.");
      saveDoctors(nextDoctors);
      if (editingId === doctor.id) handleClear();
    }
  };

  const handleClear = () => {
    setFormData({
      fullName: "",
      govEmId: "",
      slmcNo: "",
      nic: "",
      dob: "",
      age: "",
      gender: "",
      email: "",
      contactNo: "",
      address: "",
      designation: "Dental Surgeon",
      specialization: "",
      accountStatus: "Active",
      assignedUnit: "Dental Unit 01",
      assignedShift: "Weekdays Morning Shift",
      availableDate: "",
      availableTime: "",
      inactiveReason: "",
      username: "",
      password: "",
      contactPersonName: "",
      emergencyContactNo: ""
    });
    setEditingId(null);
    setShowEditPassword(false);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) {
      alert("Please select a doctor from the table to edit first.");
      return;
    }

    const updatedPayload = {
      full_name: formData.fullName,
      nic: formData.nic,
      dob: formData.dob,
      address: formData.address,
      contact_number: formData.contactNo,
      gender: formData.gender,
      slmc_Reg_Number: formData.slmcNo,
      gov_Email: formData.email,
      gov_EmpId: formData.govEmId,
      designation: formData.designation,
      specialization: formData.specialization,
      username: formData.username,
      password: formData.password,
      contact_Person_name: formData.contactPersonName,
      emergency_Contact_no: formData.emergencyContactNo,
      account_status: formData.accountStatus,
      assigned_unit: formData.accountStatus === 'Active' ? formData.assignedUnit : null,
      assigned_shift: formData.accountStatus === 'Active' ? formData.assignedShift : null,
      available_date: formData.accountStatus === 'Active' ? formData.availableDate : null,
      available_time: formData.accountStatus === 'Active' ? formData.availableTime : null,
      inactive_reason: formData.accountStatus === 'Inactive' ? formData.inactiveReason : null
    };

    try {
      const response = await fetch(`${API_BASE}/api/doctors/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPayload)
      });

      const data = await response.json().catch(() => ({}));
            
      if (response.ok) {
        toast.success("Doctor profile updated successfully!");
        
        const nextDoctors = doctors.map((doc) =>
          doc.id === editingId ? { ...doc, ...updatedPayload } : doc
        );
        saveDoctors(nextDoctors);
        handleClear();
      } else {
        toast.error(data.error || "Failed to update profile details.");
      }
    } catch (error) {
      console.error("Network error:", error);
      toast.error("Network error. Could not update doctor record.");
    }
  };

  const filteredDoctors = doctors.filter((doctor) => {
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = 
      (doctor.full_name || "").toLowerCase().includes(search) ||
      (doctor.gov_EmpId || "").toLowerCase().includes(search) ||
      (doctor.slmc_Reg_Number || "").toLowerCase().includes(search) ||
      (doctor.nic || "").toLowerCase().includes(search);

    const matchesStatus = 
      statusFilter === "All" || 
      (doctor.account_status || "").toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formIsActive = formData.accountStatus === 'Active';

  return (
    <div className="manage-doctor-panel">
      <div className="form-header">
        <h2>Manage Doctor</h2>
      </div>

      <div className="content-card">
        <div className="search-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <span className="search-icon" aria-hidden="true">&#128269;</span>
            <input
              type="text"
              placeholder="Search by Name, Employee ID | SLMC No | NIC..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdown-wrapper">
            <select 
              className="status-filter-select"
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                fontSize: '14px',
                height: '100%',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="doctor-styled-table">
            <thead>
              <tr>
                <th>Gov. Em. ID</th>
                <th>Full Name</th>
                <th>NIC</th>
                <th>Date Of Birth</th>
                <th>SLMC Reg.No</th>
                <th>Gender</th>
                <th>Address</th>
                <th>Contact No</th>
                <th>Gov.Email</th>
                <th>Designation</th>
                <th>Specialization</th>
                <th>Status</th>
                
                {/* Dynamically display structural headers matching the global filter view state */}
                {statusFilter.toLowerCase() !== 'inactive' && (
                  <>
                    <th>Assigned Unit</th>
                    <th>Assigned Shift</th>
                    <th>Available Date</th>
                    <th>Available Time</th>
                  </>
                )}
                {statusFilter.toLowerCase() !== 'active' && <th>Inactive Reason</th>}
                
                <th>Emergency Contact</th>
                <th>Emergency No</th>
                <th>Username</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor) => {
                  const currentStatus = (doctor.account_status || "").toLowerCase();
                  const isActiveRow = currentStatus === 'active';

                  return (
                    <tr key={doctor.id}>
                      <td>{doctor.gov_EmpId || "—"}</td>  
                      <td>{doctor.full_name || "—"}</td>
                      <td>{doctor.nic || "—"}</td> 
                      <td>{doctor.dob || "—"}</td> 
                      <td>{doctor.slmc_Reg_Number || "—"}</td>
                      <td>{doctor.gender || "—"}</td>
                      <td>{doctor.address || "—"}</td>
                      <td>{doctor.contact_number || "—"}</td>
                      <td>{doctor.gov_Email || "—"}</td>
                      <td>{doctor.designation || "—"}</td> 
                      <td>{doctor.specialization || "—"}</td> 
                      <td>{doctor.account_status || "—"}</td>
                      
                      {/* Structure cells to align exactly with structural dynamic headers */}
                      {statusFilter.toLowerCase() !== 'inactive' && (
                        <>
                          <td>{isActiveRow ? (doctor.assigned_unit || "—") : "—"}</td>
                          <td>{isActiveRow ? (doctor.assigned_shift || "—") : "—"}</td>
                          <td>{isActiveRow ? (doctor.available_date ? doctor.available_date.substring(0, 10) : "—") : "—"}</td>
                          <td>{isActiveRow ? (doctor.available_time || "—") : "—"}</td>
                        </>
                      )}

                      {statusFilter.toLowerCase() !== 'active' && (
                        <td>{!isActiveRow ? (doctor.inactive_reason || "—") : "—"}</td>
                      )}
                      
                      <td>{doctor.contact_Person_name || "—"}</td>
                      <td>{doctor.emergency_Contact_no || "—"}</td>
                      <td>{doctor.username || "—"}</td>
                      
                      <td>
                        <div className="doctor-action-buttons">
                          <button className="btn-table-update" type="button" onClick={() => handleEditClick(doctor)}>Update</button>
                          <button className="btn-table-delete" type="button" onClick={() => handleDeleteClick(doctor)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="25" className="doctor-no-data" style={{ textAlign: "center", padding: "20px" }}>
                    No doctor records found matching search definitions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <hr className="section-divider" />

        <div className="update-profile-section">
          <h3>Update Profile {editingId && `(Updating Object ID: ${editingId})`}</h3>
          <form className="grid-form" onSubmit={handleUpdateSubmit}>
            <div className="form-column">
              <div className="form-group">
                <label>Full Name :</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>SLMC Reg. No :</label>
                <input type="text" name="slmcNo" value={formData.slmcNo} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>NIC :</label>
                <input type="text" name="nic" value={formData.nic} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Date of Birth :</label>
                <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="gender">Gender</label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Gov.Email :</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Contact No :</label>
                <input type="text" name="contactNo" value={formData.contactNo} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Gov. Em. ID :</label>
                <input type="text" name="govEmId" value={formData.govEmId} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="form-column">
              <div className="form-group">
                <label>Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input type="text" name="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g. Orthodontics" />
              </div>
              <div className="form-group">
                <label htmlFor="accountStatus">Account Status</label>
                <select id="accountStatus" name="accountStatus" value={formData.accountStatus} onChange={handleInputChange} required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {formIsActive ? (
                <>
                  <div className="form-group">
                    <label>Assigned Unit :</label>
                    <input type="text" name="assignedUnit" value={formData.assignedUnit} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Assigned Shift :</label>
                    <input type="text" name="assignedShift" value={formData.assignedShift} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Available Date :</label>
                    <input type="date" name="availableDate" value={formData.availableDate} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Available Time Range :</label>
                    <input type="text" name="availableTime" value={formData.availableTime} onChange={handleInputChange} required placeholder="08.00 AM - 01.00 PM" />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>Inactive Reason :</label>
                  <input type="text" name="inactiveReason" value={formData.inactiveReason} onChange={handleInputChange} required placeholder="e.g. On Leave / Transferred" />
                </div>
              )}
            </div>

            <div className="form-column">
              <div className="form-group">
                <label>Emergency Contact Person :</label>
                <input type="text" name="contactPersonName" value={formData.contactPersonName} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Emergency Contact No :</label>
                <input type="text" name="emergencyContactNo" value={formData.emergencyContactNo} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="password-field">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowEditPassword((curr) => !curr)}
                  >
                    👁
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ gridColumn: "span 3" }}>
              <button type="submit" className="btn-update">Update Profile</button>
              <button type="button" className="btn-clear" onClick={handleClear}>Clear</button>
              <button type="button" className="btn-cancel" onClick={onExit}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ManageDoctor;