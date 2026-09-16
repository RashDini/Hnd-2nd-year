const RECEPTIONIST_STORAGE_KEY = "dentalSystemReceptionists";
const RECEPTIONIST_EVENT_NAME = "dental-receptionists-updated";

const fallbackReceptionists = [
  {
    id: 1,
    govId: "REC001",
    name: "Dini Perera",
    nic: "199512345V",
    contact: "0712345678",
    email: "dini@hospital.com",
    gender: "Female",
    assignedWorkShift: "Weekdays Morning Shift",
    assignedUnit: "Dental Unit 01",
    username: "reception-dini",
    password: "dini123",
  },
  {
    id: 2,
    govId: "REC002",
    name: "Amal Silva",
    nic: "199256789V",
    contact: "0778901234",
    email: "amal@hospital.com",
    gender: "Male",
    assignedWorkShift: "Weekdays Morning Shift",
    assignedUnit: "Dental Unit 01",
    username: "reception-amal",
    password: "amal123",
  },
];

// Inside ManageReceptionist.jsx -> useEffect()
fetch(`http://localhost:5000/api/receptionists`) // 👈 Add your explicit backend port here
  .then((response) => response.ok ? response.json() : Promise.reject(response))
  .then((data) => {
    const receptionistList = Array.isArray(data.receptionists)
      ? data.receptionists.map(mapReceptionistFromApi)
      : [];
    saveReceptionists(receptionistList);
    // setReceptionists(receptionistList);
  })

export function getReceptionists() {
  try {
    const storedReceptionists = window.localStorage.getItem(RECEPTIONIST_STORAGE_KEY);
    return storedReceptionists ? JSON.parse(storedReceptionists) : fallbackReceptionists;
  } catch (error) {
    return fallbackReceptionists;
  }
}

export function saveReceptionists(receptionists) {
  window.localStorage.setItem(RECEPTIONIST_STORAGE_KEY, JSON.stringify(receptionists));
  window.dispatchEvent(new CustomEvent(RECEPTIONIST_EVENT_NAME, { detail: receptionists }));
}

export function registerReceptionist(formData) {
  const currentReceptionists = getReceptionists();
  const newReceptionist = {
    id: formData.id || Date.now(),
    govId: formData.govEmployeeId,
    name: formData.fullName,
    nic: formData.nic,
    contact: formData.contactNumber,
    email: formData.email,
    gender: formData.gender,
    assignedWorkShift: formData.assignedWorkShift,
    assignedUnit: formData.assignedUnit,
    username: formData.username,
    password: formData.password,
  };

  saveReceptionists([...currentReceptionists, newReceptionist]);
  return newReceptionist;
}



export function updateReceptionist(id, updatedFormData) {
  const currentReceptionists = getReceptionists();
  
  const updateReceptionists = currentReceptionists.map((receptionist) => {
    if (receptionist.id === Number(id) || receptionist.id === id) {
      return {
        ...receptionist,
        govEmployeeId: updatedFormData.govEmployeeId || updatedFormData.govId || receptionist.govEmployeeId,
        name: updatedFormData.fullName || updatedFormData.name || receptionist.name,
        nic: updatedFormData.nic || receptionist.nic,
        contact: updatedFormData.contactNumber || updatedFormData.contact || receptionist.contact,
        email: updatedFormData.email || receptionist.email,
        jobTitle: updatedFormData.jobTitle || receptionist.jobTitle,
        username: updatedFormData.username || receptionist.username,
        password: updatedFormData.password || receptionist.password,
      };
    }
    return receptionist;
  });

  saveReceptionists(updateReceptionists);
  return updateReceptionists;
}





export function mapReceptionistFromApi(receptionist) {
  return {
    id: receptionist.id,
    govId: receptionist.govEmployeeId,
    name: receptionist.fullName,
    nic: receptionist.nic,
    contact: receptionist.contactNumber,
    email: receptionist.email,
    gender: receptionist.gender,
    assignedWorkShift: receptionist.assignedWorkShift,
    assignedUnit: receptionist.assignedUnit,
    username: receptionist.username,
    password: receptionist.password,
  };
}
export function subscribeToReceptionists(callback) {
  const handleReceptionistEvent = (event) => callback(event.detail || getReceptionists());
  const handleStorageEvent = (event) => {
    if (event.key === RECEPTIONIST_STORAGE_KEY) {
      callback(getReceptionists());
    }
  };

  window.addEventListener(RECEPTIONIST_EVENT_NAME, handleReceptionistEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(RECEPTIONIST_EVENT_NAME, handleReceptionistEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
