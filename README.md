# Hnd-2nd-year

# 🏷️ System Name
**Web-Based Dental Queue Management System for Government Hospitals**  
*(Custom deployed for the Dental Unit at Wijaya Kumaratunga Memorial Hospital, Seeduwa, Sri Lanka)*

---

## 💻 Tech Stack & Implementation Environment

### Core Technologies
* **Frontend Architecture:** React.js (Component-driven UI)
* **Backend Runtime Engine:** Node.js with Express.js framework
* **Database Management:** MySQL Server

* **Development Environment:** Visual Studio Code on Windows 11
* **Database Administration:** MySQL Workbench
* **API Testing Suite:** Postman
* **Functional Test Automation:** Selenium IDE

## ⚙️ How the Project Works
### 1. The Administrator Workflow 
* **IP-Restricted Entry:** Administrators access the control dashboard under strict IP security validation to prevent external network breaches.
* **System Management:** The admin creates, updates, or revokes system credentials for new Doctors and Receptionists.
* **Analytics Reporting:** The admin monitors live system activity logs and compiles automated operational metrics into Daily, Weekly, Monthly, or Custom Range performance reports.

### 2. The Receptionist Workflow 
* **Registration:** The receptionist logs in securely and registers arriving patients digitally with their details (NIC, Age, Gender, and BHT File Number).
* **Token Issuance:** The receptionist selects the primary treatment reason (e.g., Tooth Extraction, Filling, Cleaning, or Toothache). The system automatically generates a unique, sequential queue token.

### 3. The Doctor Workflow 
* **Queue Tracking:** The doctor logs into their personal dashboard and views a live, ordered list of all patients assigned specifically to them.
* **Status Updates:** As patients move through treatment rooms, the doctor triggers status updates in real time:
  * `Waiting` ➔ `Called` ➔ `Completed` (or `Absent` if the patient misses their slot).
* Updating the status instantly clears the doctor's queue and triggers the lobby display.

### 4. The Public Display Workflow 
* **Real-Time Lobby Broadcast:** Mounted monitors in the hospital lobby display a clean interface showing the `Current Token Number`, the `Assigned Treatment Room`, and the corresponding `Doctor's Name`.
* **Instant Updates:** The display syncs automatically via live database changes when doctors cycle their queues, eliminating verbal shouting and lobby confusion.

