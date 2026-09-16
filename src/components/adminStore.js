const ADMIN_STORAGE_KEY = "dentalSystemAdmins";
const ADMIN_EVENT_NAME = "dental-admins-updated";

// REVERTED to standard short keys to match what your table component is rendering
const fallbackAdmins = [
  {
    id: 1,
    govEmployeeId: "ADM001", // Keep this to fix the Gov Em ID column
    name: "Dini Perera",     // Matches your table's 'name' property
    nic: "199512345V",
    contact: "0712345678",   // Matches your table's 'contact' property
    email: "dini@hospital.com",
    jobTitle: "Admin",
    username: "admin-dini",
    password: "dini123",
  },
  {
    id: 2,
    govEmployeeId: "ADM002",
    name: "Amal Silva",
    nic: "199256789V",
    contact: "0778901234",
    email: "amal@hospital.com",
    jobTitle: "Admin",
    username: "admin-amal",
    password: "amal123",
  },
];

// Inside ManageReceptionist.jsx -> useEffect()
fetch(`http://localhost:5000/api/admins`) // 👈 Add your explicit backend port here
  .then((response) => response.ok ? response.json() : Promise.reject(response))
  .then((data) => {
    const adminList = Array.isArray(data.admins)
      ? data.admins.map(mapAdminFromApi)
      : [];
    saveAdmins(adminList);
    // setReceptionists(receptionistList);
  })

export function getAdmins() {
  try {
    const storedAdmins = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return storedAdmins ? JSON.parse(storedAdmins) : fallbackAdmins;
  } catch (error) {
    return fallbackAdmins;
  }
}

export function saveAdmins(admins) {
  window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
  window.dispatchEvent(new CustomEvent(ADMIN_EVENT_NAME, { detail: admins }));
}

export function registerAdmin(formData) {
  const currentAdmins = getAdmins();
  const newAdmin = {
    id: formData.id || Date.now(),
    govEmployeeId: formData.govEmployeeId || formData.govId,
    name: formData.fullName || formData.name,
    nic: formData.nic,
    contact: formData.contactNumber || formData.contact,
    email: formData.email,
    jobTitle: formData.jobTitle,
    username: formData.username,
    password: formData.password,
  };

  saveAdmins([...currentAdmins, newAdmin]);
  return newAdmin;
}

export function updateAdmin(id, updatedFormData) {
  const currentAdmins = getAdmins();
  
  const updatedAdmins = currentAdmins.map((admin) => {
    if (admin.id === Number(id) || admin.id === id) {
      return {
        ...admin,
        govEmployeeId: updatedFormData.govEmployeeId || updatedFormData.govId || admin.govEmployeeId,
        name: updatedFormData.fullName || updatedFormData.name || admin.name,
        nic: updatedFormData.nic || admin.nic,
        contact: updatedFormData.contactNumber || updatedFormData.contact || admin.contact,
        email: updatedFormData.email || admin.email,
        jobTitle: updatedFormData.jobTitle || admin.jobTitle,
        username: updatedFormData.username || admin.username,
        password: updatedFormData.password || admin.password,
      };
    }
    return admin;
  });

  saveAdmins(updatedAdmins);
  return updatedAdmins;
}

export function mapAdminFromApi(admin) {
  return {
    id: admin.id,
    govEmployeeId: admin.govEmployeeId || admin.govId,
    name: admin.fullName || admin.name,
    nic: admin.nic,
    contact: admin.contactNumber || admin.contact,
    email: admin.email,
    jobTitle: admin.jobTitle,
    username: admin.username,
    password: admin.password,
  };
}

export function subscribeToAdmins(callback) {
  const handleAdminEvent = (event) => callback(event.detail || getAdmins());
  const handleStorageEvent = (event) => {
    if (event.key === ADMIN_STORAGE_KEY) {
      callback(getAdmins());
    }
  };

  window.addEventListener(ADMIN_EVENT_NAME, handleAdminEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(ADMIN_EVENT_NAME, handleAdminEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}