import React, { useEffect, useState } from 'react';
import './ManageAdmin.css';
import { toast } from 'react-toastify';
import { getAdmins, mapAdminFromApi, saveAdmins, subscribeToAdmins } from './adminStore';

const API_BASE = "http://localhost:5000";

function ManageAdmin({ onExit }) {
  // State for Admin List
  const [admins, setAdmins] = useState(() => getAdmins());

  // State for handling which admin is being edited (null means creating or no active edit)
  const [editingId, setEditingId] = useState(null);

  // Search Input State
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form State for "Edit Profile"
  const [formData, setFormData] = useState({
    fullName: '',
    contactNo: '',
    govEmId: '',
    nic: '',
    email: '',
    jobTitle: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    const unsubscribe = subscribeToAdmins(setAdmins);

    fetch(`/api/admins`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((data) => {
        const fetchedData = Array.isArray(data) ? data : data.admins;
        const adminList = Array.isArray(fetchedData)
          ? fetchedData.map(mapAdminFromApi)
          : [];
        saveAdmins(adminList);
      })
      .catch(() => {
        setAdmins(getAdmins());
      });

    return unsubscribe;
  }, []);

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Populate form when 'Edit' is clicked
  const handleEditClick = (admin) => {
    setEditingId(admin.id);
    setFormData({
      fullName: admin.name || '',
      contactNo: admin.contact || '',
      govEmId: admin.govId || admin.govEmId || admin.govEmployeeId || '',
      nic: admin.nic || '',
      email: admin.email || '',
      jobTitle: admin.jobTitle || '',
      username: admin.username || '',
      password: admin.password || ''
    });
  };

 const handleDeleteClick = async (admin) => {
    if (!admin || !admin.id) {
      toast.error("Invalid administrator selected for deletion.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete administrator ${admin.name || ''} `)) {
      return;
    }

    const nextAdmins = admins.filter((adm) => adm.id !== admin.id);

    try {
      const response = await fetch(`${API_BASE}/api/admins/${admin.id}`, { 
        method: "DELETE" 
      });

      if (response.ok) {
        toast.success("Admin deleted from database successfully!");
        saveAdmins(nextAdmins);
        if (editingId === admin.id) handleClear();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(data.error || `Server returned error status ${response.status}`);
      }
    } catch (error) {
      console.error("Failed deleting database record:", error);
      toast.warning("Server connection lost. Saved changes locally.");
      saveAdmins(nextAdmins);
      if (editingId === admin.id) handleClear();
    }
  };
  // Clear Form fields
  const handleClear = () => {
    setFormData({
      fullName: '',
      contactNo: '',
      govEmId: '',
      nic: '',
      email: '',
      jobTitle: '',
      username: '',
      password: ''
    });
    setEditingId(null);
    setShowEditPassword(false);
  };

const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingId) {
      toast.error("Please select an administrator from the table to edit first.");
      return;
    }

    const updatedAdminFields = {
      name: formData.fullName,
      contact: formData.contactNo,
      nic: formData.nic,
      govEmployeeId: formData.govEmId,
      jobTitle: formData.jobTitle,
      email: formData.email,
      username: formData.username,
      password: formData.password
    };

    const nextAdmins = admins.map((admin) =>
      admin.id === editingId ? { ...admin, ...updatedAdminFields } : admin
    );

    try {
      // ✅ FIXED: Added `${API_BASE}` to the beginning of the URL path
      const response = await fetch(`${API_BASE}/api/admins/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          contactNumber: formData.contactNo,
          nic: formData.nic,
          govEmployeeId: formData.govEmId,
          jobTitle: formData.jobTitle,
          email: formData.email,
          username: formData.username,
          password: formData.password
        })
      });

      // Parse the JSON data safely if any exists
      const data = await response.json().catch(() => ({}));

      if (response.ok || response.status === 404) {
         toast.success("Admin profile updated successfully!");
         saveAdmins(nextAdmins);
         handleClear();
      } else {
         toast.error(data.error || "Failed to update profile details.");
         console.warn(`Backend returned status ${response.status}.`);
      }

    } catch (error) {
      console.error("Network error:", error);
      toast.warning("Network connection error. Saved changes locally.");
      
      saveAdmins(nextAdmins);
      handleClear();
    }
  };

  const filteredAdmins = admins.filter((admin) => {
    const search = searchTerm.toLowerCase();
    return (
      (admin.name || "").toLowerCase().includes(search) ||
      (admin.govEmployeeId || "").toLowerCase().includes(search) ||
      (admin.nic || "").toLowerCase().includes(search)
    );
  });

  return (
    <div className="manage-admin-panel manage-admin-page">
      <div className="form-header">
        <h2>Manage Administrator</h2>
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
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gov. Em. ID</th>
                <th>Name</th>
                <th>NIC</th>
                <th>Contact No</th>
                <th>Email</th>
                <th>Job Title</th>
                <th>Username</th>
                <th>Password</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.govEmployeeId}</td>
                    <td>{admin.name}</td>
                    <td>{admin.nic}</td>
                    <td>{admin.contact}</td>
                    <td>{admin.email}</td>
                    <td>{admin.jobTitle}</td>
                    <td>{admin.username}</td>
                    <td>********</td>
                    <td>
                      <div className="action-buttons">
                        <button type="button" className="btn-edit" onClick={() => handleEditClick(admin)}>Update</button>
                        <button type="button" className="btn-delete" onClick={() => handleDeleteClick(admin)}>Delete</button>                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No administrators found.</td>
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
                <label>NIC</label>
                <input type="text" name="nic" value={formData.nic} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input type="text" name="jobTitle" value={formData.jobTitle} onChange={handleInputChange} required />
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

export default ManageAdmin;