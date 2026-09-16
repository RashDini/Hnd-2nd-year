import React, { useEffect, useState } from 'react';
import './ManageReceptionist.css';
import { toast } from 'react-toastify';
import { getReceptionists, mapReceptionistFromApi, saveReceptionists, subscribeToReceptionists } from './receptionistStore';

const API_BASE = "http://localhost:5000";


function ManageReceptionist({ onExit }) {
  // Initialize state with store records
  const [receptionists, setReceptionists] = useState(() => getReceptionists());
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    contactNo: '',
    govEmId: '',
    nic: '',
    email: '',
    gender: '',
    assignedWorkShift: '',
    assignedUnit: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    const unsubscribe = subscribeToReceptionists(setReceptionists);

    fetch(`/api/receptionists`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((data) => {
       const fetchedData = Array.isArray(data) ? data : data.receptionists;
               const receptionistList = Array.isArray(fetchedData)
                 ? fetchedData.map(mapReceptionistFromApi)
                 : [];
               saveReceptionists(receptionistList);
             })
             .catch(() => {
               setReceptionists(getReceptionists());
             });
       

    return unsubscribe;
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleEditClick = (receptionist) => {
    setEditingId(receptionist.id);
    setFormData({
      fullName: receptionist.name || '',
      contactNo: receptionist.contact || '',
      govEmId: receptionist.govId || '',
      nic: receptionist.nic || '',
      email: receptionist.email || '',
      gender: receptionist.gender || '',
      assignedWorkShift: receptionist.assignedWorkShift || '',
      assignedUnit: receptionist.assignedUnit || '',
      username: receptionist.username || '',
      password: receptionist.password || ''
    });
  };

  
  const handleDeleteClick = async (receptionist) => {
    if (!receptionist || !receptionist.id) {
      toast.error("Invalid receptionist selected for deletion.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete receptionist ${receptionist.name || ''} `)) {
      return;
    }

    const nextReceptionists = receptionists.filter((rec) => rec.id !== receptionist.id);

    try {
      const response = await fetch(`${API_BASE}/api/receptionists/${receptionist.id}`, { 
        method: "DELETE" 
      });

      if (response.ok) {
        toast.success("Receptionist deleted from database successfully!");
        saveReceptionists(nextReceptionists);
        if (editingId === receptionist.id) handleClear();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || `Server returned error status ${response.status}`);
      }
    } catch (error) {
      console.error("Failed deleting database record:", error);
      toast.warning("Server connection lost. Saved changes locally.");
      saveReceptionists(nextReceptionists);
      if (editingId === receptionist.id) handleClear();
    }
  };
  const handleClear = () => {
    setFormData({
      fullName: '',
      contactNo: '',
      govEmId: '',
      nic: '',
      email: '',
      gender: '',
      assignedWorkShift: '',
      assignedUnit: '',
      username: '',
      password: ''
    });
    setEditingId(null);
    setShowEditPassword(false);
  };

const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) {
      toast.error("Please select a receptionist from the table to edit first.");
      return;
    }

    const updatedReceptionistFields = {
      name: formData.fullName,
      govId: formData.govEmId,
      nic: formData.nic,
      contact: formData.contactNo,
      email: formData.email,
      gender: formData.gender,
      assignedWorkShift: formData.assignedWorkShift,
      assignedUnit: formData.assignedUnit,
      username: formData.username,
      password: formData.password
    };

    const nextReceptionists = receptionists.map((receptionist) =>
      receptionist.id === editingId ? { ...receptionist, ...updatedReceptionistFields } : receptionist
    );

    try {
      // ✅ FIXED: Changed from /api/admins/ to /api/receptionists/
      const response = await fetch(`${API_BASE}/api/receptionists/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          govEmployeeId: formData.govEmId,
          contactNumber: formData.contactNo,
          email: formData.email,
          nic: formData.nic,
          gender: formData.gender,
          assignedWorkShift: formData.assignedWorkShift,
          assignedUnit: formData.assignedUnit,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok || response.status === 404) {
         toast.success("Receptionist profile updated successfully!");
         saveReceptionists(nextReceptionists);
         handleClear();
      } else {
         toast.error(data.error || "Failed to update profile details.");
      }

    } catch (error) {
      console.error("Network error:", error);
      toast.warning("Network connection error. Could not update database.");
    }
  };
  
  const filteredReceptionists= receptionists.filter((receptionist) => {
    const search = searchTerm.toLowerCase();
    return (
      (receptionist.name || "").toLowerCase().includes(search) ||
      (receptionist.govEmployeeId || "").toLowerCase().includes(search) ||
      (receptionist.nic || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="manage-receptionist-panel">
      <div className="form-header">
        <h2>Manage Receptionist</h2>
      </div>

      <div className="content-card">
        <div className="search-container">
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">&#128269;</span>
            <input
              type="text"
              placeholder="Search by Name, Employee ID | NIC..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="receptionist-table">
            <thead>
              <tr>
                <th>Gov. Em. ID</th>
                <th>Name</th>
                <th>NIC</th>
                <th>Contact No</th>
                <th>Email</th>
                <th>Gender</th>
                <th>Assigned Work Shift</th>
                <th>Assigned Unit</th>
                <th>Username</th>
                <th>Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceptionists.length > 0 ? (
                filteredReceptionists.map((receptionist) => (
                  <tr key={receptionist.id}>
                    <td>{receptionist.govId}</td>
                    <td>{receptionist.name}</td>
                    <td>{receptionist.nic}</td>
                    <td>{receptionist.contact}</td>
                    <td>{receptionist.email}</td>
                    <td>{receptionist.gender}</td>
                    <td>{receptionist.assignedWorkShift}</td>
                    <td>{receptionist.assignedUnit}</td>
                    <td>{receptionist.username}</td>
                    <td>********</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-update" onClick={() => handleEditClick(receptionist)}>Update</button>
                       <button className="btn-delete" onClick={() => handleDeleteClick(receptionist)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '20px' }}>No Receptionists found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <hr className="section-divider" />

        <div className="update-profile-section">
          <h3>Update Profile {editingId && `(Updating: ${formData.govEmId})`}</h3>
          <form className="grid-form" onSubmit={handleUpdateSubmit}>
            <div className="form-column">
              <div className="form-group">
                <label>Full Name :</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Gov. Em. ID :</label>
                <input type="text" name="govEmId" value={formData.govEmId} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>NIC</label>
                <input type="text" name="nic" value={formData.nic} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Gender :</label>
                <input type="text" name="gender" value={formData.gender} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="form-column">
              <div className="form-group">
                <label>Contact No :</label>
                <input type="text" name="contactNo" value={formData.contactNo} onChange={handleInputChange} required />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Assigned Work Shift :</label>
                <input type="text" name="assignedWorkShift" value={formData.assignedWorkShift} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label>Assigned Unit :</label>
                <input type="text" name="assignedUnit" value={formData.assignedUnit} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-column">
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
                    aria-label={showEditPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowEditPassword((current) => !current)}
                  >
                    👁
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ gridColumn: "span 3" }}>
              <button type="submit" className="btn-update">Update</button>
              <button type="button" className="btn-clear" onClick={handleClear}>Clear</button>
              <button type="button" className="btn-cancel" onClick={onExit}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ManageReceptionist;