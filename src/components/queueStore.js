import axios from "axios"; // Ensure axios is imported at the top
//const cors = require('cors'); app.use(cors());

const QUEUE_STORAGE_KEY = "dentalQueuePatients";
const QUEUE_EVENT_NAME = "dental-queue-updated";

const fallbackQueue = [
  {
   // --- Fields from 'tokens' table ---
    id: 1, // token id
    token_no: "T-1001",
    assigned_doctor: "Doctor 01",
    arrival_mode: "walk-in",
    dental_reasons: ["Tooth Extraction", "Toothache"], // Represented as an array matching JSON type
    clinical_notes: "Patient experiencing severe lower jaw pain.",
    status: "Waiting",
    created_at: new Date().toISOString(),

    // --- Related fields from 'patients' table ---
    patient_id: 101,
    full_name: "Dini Perera",
    nic: "199512345678", 
    age: 31,
    gender: "Female",
    contact_number: "0771234567",
    address: "No. 45, Kandy Road, Colombo",
    patient_category: "standard-citizen",
    bht_file_no: "BHT0001"
  },
  {
    id: 2,
    token_no: "T-1002",
    assigned_doctor: "Doctor 01",
    arrival_mode: "walk-in",
    dental_reasons: ["Dental Filling"],
    clinical_notes: "Routine checkup and filling replacement.",
    status: "Waiting",
    created_at: new Date().toISOString(),

    patient_id: 102,
    full_name: "Amal Silva",
    nic: "198887654321",
    age: 38,
    gender: "Male",
    contact_number: "0719876543",
    address: "12/A, Galle Road, Panadura",
    patient_category: "standard-citizen",
    bht_file_no: "BHT0002"
  },
  {
    id: 3,
    token_no: "T-1003",
    assigned_doctor: "Doctor 02",
    arrival_mode: "walk-in",
    dental_reasons: ["Toothache"],
    clinical_notes: "Gum inflammation near the upper molar.",
    status: "Waiting",
    created_at: new Date().toISOString(),

    patient_id: 103,
    full_name: "Nimali Fernando",
    nic: "200045678901",
    age: 26,
    gender: "Female",
    contact_number: "0751112223",
    address: "Negombo Road, Kurunegala",
    patient_category: "standard-citizen",
    bht_file_no: "BHT0003"
  },
];

export function getQueuePatients() {
  try {
    const storedQueue = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    return storedQueue ? JSON.parse(storedQueue) : fallbackQueue;
  } catch (error) {
    return fallbackQueue;
  }
}

export function saveQueuePatients(queue) {
  window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent(QUEUE_EVENT_NAME, { detail: queue }));
}

export const registerQueuePatient = async (patientData) => {
  try {
    // Map frontend naming conventions to the exact snake_case fields the backend expects
   const formattedPayload = {
    fullName: patientData.fullName || patientData.full_name,
    nic: patientData.nic,
    age: patientData.age,
    gender: patientData.gender,
    contactNumber: patientData.contactNumber || patientData.contact_number,
    address: patientData.address,
    patientCategory: patientData.patientCategory || patientData.patient_category,
    assignedDoctor: patientData.assignedDoctor || patientData.assigned_doctor,
    dentalReasons: patientData.dentalReasons || patientData.dental_reasons,
    clinicalNotes: patientData.clinicalNotes || patientData.clinical_notes,
    bhtFileNo: patientData.bhtFileNo || patientData.bht_file_no,
    arrivalMode: patientData.arrivalMode || patientData.arrival_mode
};

    console.log("Sending payload to backend:", formattedPayload); // Good for temporary verification

    const response = await axios.post('http://localhost:5000/api/register-patient', formattedPayload);
    const savedPatientFromDB = response.data;

  // Update your local storage queue so the dashboard updates live
    if (savedPatientFromDB.updatedQueue) {
      const currentQueue = getQueuePatients();
      saveQueuePatients([...currentQueue, ...savedPatientFromDB.updatedQueue]);
    } else {
      const currentQueue = getQueuePatients();
      saveQueuePatients([...currentQueue, savedPatientFromDB]);
    }
  } catch (error) {
    console.error("API Registration Error:", error);
    throw new Error(error.response?.data?.error || "Failed to save data to the server database.");  }
};

export function subscribeToQueue(callback) {
  const handleQueueEvent = (event) => callback(event.detail || getQueuePatients());
  const handleStorageEvent = (event) => {
    if (event.key === QUEUE_STORAGE_KEY) {
      callback(getQueuePatients());
    }
  };

  window.addEventListener(QUEUE_EVENT_NAME, handleQueueEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(QUEUE_EVENT_NAME, handleQueueEvent);
   // window.removeEventListener("storage", handleStorageEvent);
  };
}