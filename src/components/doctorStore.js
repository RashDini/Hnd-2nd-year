const DOCTOR_STORAGE_KEY = "dentalSystemDoctors";
const DOCTOR_EVENT_NAME = "dental-doctors-updated";

// 1. Updated Fallback data keys to match the new database structure
const fallbackDoctors = [
  {
    id: 1,
    full_name: "",
    nic: "",
    dob: "", 
    address: "",
    contact_number: "",
    gender: "",
    slmc_Reg_Number: "",
    gov_Email: "",
    gov_EmpId: "",
    designation: "Dental Surgeon",
    specialization: "", 
    username: "",
    password: "",
    contact_Person_name: "", 
    emergency_Contact_no: "", 
    account_status: "Active",
    assigned_unit: "Dental Unit 1",
    assigned_shift: "Weekdays Morning Shift",
    available_date: null,
    available_time: null,
    inactive_reason: null
  },
  {
    id: 2,
    full_name: "",
    nic: "",
    dob: "", 
    address: "",
    contact_number: "",
    gender: "",
    slmc_Reg_Number: "",
    gov_Email: "",
    gov_EmpId: "",
    designation: "Dental Surgeon",
    specialization: "", 
    username: "",
    password: "",
    contact_Person_name: "", 
    emergency_Contact_no: "", 
    account_status: "Active",
    assigned_unit: "Dental Unit 1",
    assigned_shift: "Weekdays Morning Shift",
    available_date: null,
    available_time: null,
    inactive_reason: null
  },
];

export function getDoctors() {
  try {
    const storedDoctors = window.localStorage.getItem(DOCTOR_STORAGE_KEY);
    return storedDoctors ? JSON.parse(storedDoctors) : fallbackDoctors;
  } catch (error) {
    return fallbackDoctors;
  }
}

export function saveDoctors(doctors) {
  window.localStorage.setItem(DOCTOR_STORAGE_KEY, JSON.stringify(doctors));
  window.dispatchEvent(new CustomEvent(DOCTOR_EVENT_NAME, { detail: doctors }));
}

// 2. Updated registration mapping to bridge form submission to new DB property names
export function registerDoctor(formData) {
  const currentDoctors = getDoctors();
  const newDoctor = {
    id: formData.id || Date.now(),
    full_name: formData.fullName || formData.full_name,
    gov_EmpId: formData.govEmployeeId || formData.gov_EmpId,
    slmc_Reg_Number: formData.slmcRegNumber || formData.slmc_Reg_Number,
    dob: formData.dob,
    specialization: formData.specialization,
    contact_Person_name: formData.contactPersonname || formData.contact_Person_name,
    emergency_Contact_no: formData.emergencyContactno || formData.emergency_Contact_no,
    account_status: formData.accountStatus || formData.account_status || "Active",
    gender: formData.gender,
    gov_Email: formData.govEmail || formData.gov_Email,
    contact_number: formData.contactNumber || formData.contact_number,
    nic: formData.nic,
    address: formData.address,
    designation: formData.designation,
    username: formData.username,
    password: formData.password,
    // Dynamic Fields Added Here
    assigned_unit: formData.accountStatus === "Active" ? (formData.assignedUnit || formData.assigned_unit) : null,
    assigned_shift: formData.accountStatus === "Active" ? (formData.assignedShift || formData.assigned_shift) : null,
    available_date: formData.accountStatus === "Active" ? (formData.availableDate || formData.available_date) : null,
    available_time: formData.accountStatus === "Active" ? (formData.availableTime || formData.available_time) : null,
    inactive_reason: formData.accountStatus === "Inactive" ? (formData.inactiveReason || formData.inactive_reason) : null
  };
saveDoctors([...currentDoctors, newDoctor]);
  return newDoctor;
}

// 3. Updated local updates tracking mutation modifications
export function updateDoctor(id, updatedFormData) {
  const currentDoctors = getDoctors();
const updatedDoctors = currentDoctors.map((doctor) => {
    if (doctor.id === Number(id) || doctor.id === id) {
      const currentStatus = updatedFormData.accountStatus || updatedFormData.account_status || doctor.account_status;
      return {
        ...doctor,
        gov_EmpId: updatedFormData.govEmployeeId || updatedFormData.gov_EmpId || doctor.gov_EmpId,
        full_name: updatedFormData.fullName || updatedFormData.full_name || doctor.full_name,
        nic: updatedFormData.nic || doctor.nic,
        dob: updatedFormData.dob || doctor.dob,
        specialization: updatedFormData.specialization || doctor.specialization,
        contact_Person_name: updatedFormData.emergencyContactName || updatedFormData.contactPersonname || updatedFormData.contact_Person_name || doctor.contact_Person_name,
        emergency_Contact_no: updatedFormData.emergencyContactPhone || updatedFormData.emergencyContactno || updatedFormData.emergency_Contact_no || doctor.emergency_Contact_no,
        account_status: currentStatus,
        gender: updatedFormData.gender || doctor.gender,
        gov_Email: updatedFormData.govEmail || updatedFormData.gov_Email || doctor.gov_Email,
        contact_number: updatedFormData.contactNumber || updatedFormData.contact_number || doctor.contact_number,
        address: updatedFormData.address || doctor.address,
        designation: updatedFormData.designation || doctor.designation,
        username: updatedFormData.username || doctor.username,
        password: updatedFormData.password || doctor.password,
        // Conditional structural checking for state updates
        assigned_unit: currentStatus === "Active" ? (updatedFormData.assignedUnit || updatedFormData.assigned_unit || doctor.assigned_unit) : null,
        assigned_shift: currentStatus === "Active" ? (updatedFormData.assignedShift || updatedFormData.assigned_shift || doctor.assigned_shift) : null,
        available_date: currentStatus === "Active" ? (updatedFormData.availableDate || updatedFormData.available_date || doctor.available_date) : null,
        available_time: currentStatus === "Active" ? (updatedFormData.availableTime || updatedFormData.available_time || doctor.available_time) : null,
        inactive_reason: currentStatus === "Inactive" ? (updatedFormData.inactiveReason || updatedFormData.inactive_reason || doctor.inactive_reason) : null
     };
    }
    return doctor;
  });
 saveDoctors(updatedDoctors);
  return updatedDoctors;
}
// 4. Crucial Fix: Maps incoming response directly to database keys visible in the schema image
export function mapDoctorFromApi(doctor) {
  const accountStatus = doctor.account_status || doctor.accountStatus || "Active";

  return {
    id: doctor.id,
    full_name: doctor.full_name || doctor.fullName || "",
    gov_EmpId: doctor.gov_EmpId || doctor.govEmployeeId || doctor.govEmId || "",
    slmc_Reg_Number: doctor.slmc_Reg_Number || doctor.slmcRegNumber || doctor.slmcNo || "",
    dob: doctor.dob,
    specialization: doctor.specialization,
    contact_Person_name: doctor.contact_Person_name || doctor.emergencyContactName || doctor.contactPersonName || "",
    emergency_Contact_no: doctor.emergency_Contact_no || doctor.emergencyContactPhone || doctor.emergencyContactNo || "",
    gender: doctor.gender,
    gov_Email: doctor.gov_Email || doctor.govEmail || doctor.email || "",
    contact_number: doctor.contact_number || doctor.contactNumber || doctor.contactNo || "",
    nic: doctor.nic,
    address: doctor.address,
    designation: doctor.designation || "Dental Surgeon",
    username: doctor.username,
    password: doctor.password,
    account_status: accountStatus,
    // Database column links mapped here
    assigned_unit: doctor.assigned_unit || doctor.assignedUnit || "",
    assigned_shift: doctor.assigned_shift || doctor.assignedShift || "",
    available_date: doctor.available_date || doctor.availableDate || "",
    available_time: doctor.available_time || doctor.availableTime || "",
    inactive_reason: doctor.inactive_reason || doctor.inactiveReason || ""
  };
}

export function subscribeToDoctors(callback) {
  const handleDoctorEvent = (event) => callback(event.detail || getDoctors());
  const handleStorageEvent = (event) => {
    if (event.key === DOCTOR_STORAGE_KEY) {
      callback(getDoctors());
    }
  };

  window.addEventListener(DOCTOR_EVENT_NAME, handleDoctorEvent);
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(DOCTOR_EVENT_NAME, handleDoctorEvent);
    window.removeEventListener("storage", handleStorageEvent);
  };
}
