const path = require('path');
require('dotenv').config({
    path: path.join(__dirname, '.env'),
    override: true
});

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const os = require('os');
const crypto = require('crypto');

const reportRoutes = require('./reportRoutes');

const app = express();

console.log('Starting backend from __dirname=', __dirname);
console.log('Starting backend from cwd=', process.cwd());

app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// Add logging middleware to debug all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

function normalizeIpAddress(ipAddress) {
    return (ipAddress || "").replace(/^::ffff:/, "");
}

function getCurrentMachineIps() {
    return Object.values(os.networkInterfaces())
        .flat()
        .filter((networkInterface) => networkInterface && !networkInterface.internal)
        .map((networkInterface) => normalizeIpAddress(networkInterface.address))
        .filter(Boolean);
}

const ADMIN_ALLOW_ALL = (process.env.ADMIN_ALLOW_ALL || "").trim().toLowerCase() === "true";

function getAdminAllowedIps() {
    return [
        ...(process.env.ADMIN_ALLOWED_IPS || "").split(","),
        "127.0.0.1",
        "::1",
        "localhost",
        ...getCurrentMachineIps()
    ]
        .map((ip) => normalizeIpAddress(ip.trim()))
        .filter(Boolean);
}

function isPrivateNetworkIp(ipAddress) {
    if (!ipAddress) {
        return false;
    }

    if (ipAddress === "localhost" || ipAddress === "127.0.0.1" || ipAddress === "::1") {
        return true;
    }

    const parts = ipAddress.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
        return false;
    }

    const [first, second] = parts;
    return (
        first === 10 ||
        (first === 172 && second >= 16 && second <= 31) ||
        (first === 192 && second === 168) ||
        (first === 169 && second === 254)
    );
}

app.post('/api/auth/login', (req, res) => handleLogin(req, res, req.body?.role || 'Admin'));

app.post('/api/auth/admin-login', (req, res) => handleLogin(req, res, 'Admin'));

const dbName = process.env.DB_NAME;

if (!/^[a-zA-Z0-9_]+$/.test(dbName || "")) {
    throw new Error("DB_NAME must contain only letters, numbers, and underscores.");
}

const setupDb = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 2
});

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10
});

const dbPromise = db.promise();

app.use("/api", reportRoutes(dbPromise));

function toBase64Url(value) {
    return Buffer.from(value).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function generateToken(payload) {
    const secret = process.env.JWT_SECRET || 'dental-system-secret';
    const headerSegment = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadSegment = toBase64Url(JSON.stringify(payload));
    const signature = crypto.createHmac('sha256', secret)
        .update(`${headerSegment}.${payloadSegment}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
    return `${headerSegment}.${payloadSegment}.${signature}`;
}

async function handleLogin(req, res, role) {
    const { username, password } = req.body;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const clientIp = normalizeIpAddress(req.ip || req.socket.remoteAddress);

    if (!normalizedUsername || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const adminAllowedIps = getAdminAllowedIps();
    if (role === 'Admin' && !ADMIN_ALLOW_ALL && !adminAllowedIps.includes(clientIp) && !isPrivateNetworkIp(clientIp)) {
        return res.status(403).json({ success: false, message: `Admin login is not allowed from this IP address: ${clientIp}` });
    }

    const tableName = role === 'Admin' ? 'administrators' : role === 'Receptionist' ? 'receptionists' : 'doctors';
    const roleName = role === 'Admin' ? 'Admin' : role === 'Receptionist' ? 'Receptionist' : 'Doctor';
    const usernameField = role === 'Admin' ? 'username' : 'username';

    try {
        const [rows] = await dbPromise.query(
            `SELECT id, username, full_name AS fullName, email, password FROM ${tableName} WHERE ${usernameField} = ? LIMIT 1`,
            [normalizedUsername]
        );

        const user = rows[0];
const validPassword = user && (user.password === password);

        if (normalizedUsername === 'Admin' && password === 'Admin123') {
            const token = generateToken({ sub: 1, role: 'Admin', username: normalizedUsername });
            return res.status(200).json({ success: true, message: 'Admin authentication successful', role: 'Admin', username: normalizedUsername, token });
        }

        if (!user || !validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const token = generateToken({ sub: user.id, role: roleName, username: user.username });
        return res.status(200).json({
            success: true,
            message: `${roleName} authentication successful`,
            role: roleName,
            username: user.username,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                username: user.username
            },
            token
        });
    } catch (error) {
        console.error('Login failed:', error);
        return res.status(500).json({ success: false, message: 'Unable to process login request.' });
    }
}

setupDb.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
    if (err) {
        console.error('Database creation failed: ' + err.message);
        return;
    }

    db.getConnection((connectionErr, connection) => {
        if (connectionErr) {
            console.error('MySQL Connection Failed: ' + connectionErr.message);
        } else {
            console.log('Successfully connected to MySQL Database !');
            connection.release();
            initializeDatabase();
        }
    });
});

function initializeDatabase() {
    const createAdministratorsTable = `
        CREATE TABLE IF NOT EXISTS administrators (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            contact_number VARCHAR(30) NOT NULL,
            nic VARCHAR(30) NOT NULL UNIQUE,
            gov_employee_id VARCHAR(50) NOT NULL,
            job_title VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            username VARCHAR(80) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createReceptionistsTable = `
        CREATE TABLE IF NOT EXISTS receptionists (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            employee_id VARCHAR(50) NOT NULL,
            contact_number VARCHAR(30) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            nic VARCHAR(30) NOT NULL UNIQUE,
            gender VARCHAR(20) NOT NULL,
            assigned_work_shift VARCHAR(100) NOT NULL,
            assigned_unit VARCHAR(100) NOT NULL,
            username VARCHAR(80) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // FIXED: Cleaned up duplicate keys, syntax punctuation, typos, and commas
const createDoctorsTable = `
    CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,

        -- Section 1: Personal Identity
        full_name VARCHAR(255) NOT NULL,
        dob VARCHAR(20) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        nic VARCHAR(20) NOT NULL UNIQUE,
        address VARCHAR(255) NOT NULL,
        contact_number VARCHAR(20) NOT NULL,

        -- Section 2: Government & Medical Credentials
        slmc_Reg_Number VARCHAR(20) NOT NULL UNIQUE,
        gov_Email VARCHAR(150) NOT NULL UNIQUE,
        gov_EmpId VARCHAR(50) NOT NULL UNIQUE,
        designation VARCHAR(50) NOT NULL DEFAULT 'Dental Surgeon',
        specialization VARCHAR(100) NULL,

        -- Section 3: System Access Credentials
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,

        -- Section 4: Emergency Contact
        contact_Person_name VARCHAR(100) NOT NULL,
        emergency_Contact_no VARCHAR(30) NOT NULL,

        -- Section 5: Availability / Status
        account_status VARCHAR(20) NOT NULL DEFAULT 'Active',
        assigned_unit VARCHAR(100) NULL,
        assigned_shift VARCHAR(50) NULL,
        available_date DATE NULL,
        available_time TIME NULL,
        inactive_reason TEXT NULL,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

    const createPasswordResetRequestsTable = `
        CREATE TABLE IF NOT EXISTS password_reset_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role VARCHAR(50) NOT NULL,
            name VARCHAR(150) NOT NULL,
            username VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'Pending',
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createPatientsTable = `
        CREATE TABLE IF NOT EXISTS patients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(255) NOT NULL,
            nic VARCHAR(20) NOT NULL UNIQUE,
            age INT NOT NULL,
            gender VARCHAR(10) NOT NULL,
            contact_number VARCHAR(20) NOT NULL,
            address TEXT NOT NULL,
            patient_category VARCHAR(50) DEFAULT 'standard-citizen',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

   const createTokensTable = `
        CREATE TABLE IF NOT EXISTS tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            patient_id INT NOT NULL,
            token_no VARCHAR(10) NOT NULL,
            assigned_doctor VARCHAR(10) NOT NULL,
            dental_reasons TEXT,
            status VARCHAR(20) DEFAULT 'Waiting',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        )
    `;

    const createActivityLogTable = `
        CREATE TABLE IF NOT EXISTS activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            message VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;



     db.query(createAdministratorsTable, (err) => {
        if (err) console.error("Failed to create administrators table:", err.message);
        else console.log("Administrators table is ready.");
    });

   


    db.query(createReceptionistsTable, (err) => {
        if (err) console.error("Failed to create receptionists table:", err.message);
        else console.log("Receptionists table is ready.");
    });

    db.query(createDoctorsTable, (err) => {
        if (err) console.error("Failed to create doctors table:", err.message);
        else {
            console.log("Doctors table is ready.");
            ensureDoctorSchema();
        }
    });

    db.query(createPasswordResetRequestsTable, (err) => {
        if (err) console.error("Failed to create password_reset_requests table:", err.message);
        else console.log("Password reset requests table is ready.");
    });

    db.query(createPatientsTable, (err) => {
        if (err) console.error("Failed to create patients table:", err.message);
        else console.log("Patients table is ready.");
    });

    db.query(createTokensTable, (err) => {
        if (err) console.error("Failed to create tokens table:", err.message);
        else console.log("Tokens table is ready.");
    });

    db.query(createActivityLogTable, (err) => {
        if (err) console.error("Failed to create activity_log table:", err.message);
        else console.log("Activity log table is ready.");
    });
}

async function ensureDoctorSchema() {
    const expectedColumns = [
        ["full_name", "VARCHAR(255) NULL"],
        ["dob", "VARCHAR(20) NULL"],
        ["gender", "VARCHAR(20) NULL"],
        ["nic", "VARCHAR(20) NULL"],
        ["address", "VARCHAR(255) NULL"],
        ["contact_number", "VARCHAR(20) NULL"],
        ["slmc_Reg_Number", "VARCHAR(20) NULL"],
        ["gov_Email", "VARCHAR(150) NULL"],
        ["gov_EmpId", "VARCHAR(50) NULL"],
        ["designation", "VARCHAR(50) NULL DEFAULT 'Dental Surgeon'"],
        ["specialization", "VARCHAR(100) NULL"],
        ["username", "VARCHAR(100) NULL"],
        ["password", "VARCHAR(255) NULL"],
        ["contact_Person_name", "VARCHAR(100) NULL"],
        ["emergency_Contact_no", "VARCHAR(30) NULL"],
        ["account_status", "VARCHAR(20) NULL DEFAULT 'Active'"],
        ["assigned_unit", "VARCHAR(100) NULL"],
        ["assigned_shift", "VARCHAR(50) NULL"],
        ["available_date", "DATE NULL"],
        ["available_time", "TIME NULL"],
        ["inactive_reason", "TEXT NULL"]
    ];

    try {
        const [columns] = await dbPromise.query(`SHOW COLUMNS FROM doctors`);
        const existingColumns = new Set(columns.map((column) => column.Field));

        for (const [columnName, definition] of expectedColumns) {
            if (!existingColumns.has(columnName)) {
                await dbPromise.query(`ALTER TABLE doctors ADD COLUMN \`${columnName}\` ${definition}`);
                console.log(`Doctors table repaired: added ${columnName}.`);
            }
        }
    } catch (err) {
        console.error("Failed to verify doctors table schema:", err.message);
    }
}

// Logs a short message into the activity_log table for the Admin Dashboard "Recent System Activities" panel
function logActivity(message) {
    db.query(`INSERT INTO activity_log (message) VALUES (?)`, [message], (err) => {
        if (err) console.error("Failed to log activity:", err.message);
    });
}

// Routes will be registered after database initialization
// See registerAllRoutes() function below

app.post('/api/register-admin', async (req, res) => {
    const { fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password } = req.body;
//recent system
  /*  app.post('/api/register-admin', async (req, res) => {
    const { fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password } = req.body;
    // ... existing validation and insert code ...

    logActivity(`New administrator registered: ${fullName}.`);   // ✅ correct placement

    res.status(201).json({
        message: "Administrator registered successfully!",
        // ...
    });
    //recent system
});*/

    if (!fullName || !contactNumber || !nic || !govEmployeeId || !jobTitle || !email || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    try {
        const sqlInsert = `
            INSERT INTO administrators (full_name, contact_number, nic, gov_employee_id, job_title, email, username, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        //const passwordHash = hashPassword(password);
        const [result] = await dbPromise.execute(sqlInsert, [fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password]);
        const token = generateToken({ sub: result.insertId, role: 'Admin', username });

        logActivity(`New administrator registered: ${fullName}.`);

        res.status(201).json({
            message: "Administrator registered successfully!",
            admin: { id: result.insertId, fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password },
            token
        });
    } catch (err) {
        console.error("Database Insert Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
        }
        return res.status(500).json({ error: `Database failed to save user: ${err.message}` });
    }
});

app.get('/api/admins', (req, res) => {
    // This query fetches and sorts the administrators by Gov Employee ID alphabetically/numerically
    const sqlSelect = `
        SELECT id, full_name AS fullName, contact_number AS contactNumber, nic, gov_employee_id AS govEmployeeId, job_title AS jobTitle, email, username, password
        FROM administrators
        ORDER BY gov_employee_id ASC
    `;

    db.query(sqlSelect, (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database fetch failed" });
        }
        // Sends the sorted array back to your React frontend
        res.json({ admins: result });
    });
});
//corrected


app.put('/api/admins/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password } = req.body;

    if (!fullName || !nic || !contactNumber  || !email || !govEmployeeId || !jobTitle || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    const sqlUpdate = `
        UPDATE administrators
        SET full_name = ?, contact_number = ?, nic = ?, gov_employee_id = ?, job_title = ?, email = ?, username = ?, password = ?
        WHERE id = ?
    `;

    db.query(sqlUpdate, [fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password, id], (err, result) => {
        if (err) {
            console.error("Database Update Error:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
            }
            return res.status(500).json({ error: `Database failed to update administrator: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Administrator not found." });
        }

         logActivity(`Administrator updated: ${fullName} (ID ${id}).`);

        res.status(200).json({
            message: "Administrator updated successfully!",
            admin: { id: Number(id), fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password }
        });
    });
});

app.delete('/api/admins/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM administrators WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error("Database Delete Error:", err);
            return res.status(500).json({ error: `Database failed to delete administrator: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Administrator not found." });
        }

        logActivity(`Administrator deleted (ID ${id}).`);

        res.status(200).json({ message: "Administrator deleted successfully!" });
    });
});
//admin registration end



// Recent system activities feed for the Admin Dashboard
app.get('/api/activity-log', (req, res) => {
    const sql = `
        SELECT id, message, created_at AS createdAt
        FROM activity_log
        ORDER BY id DESC
        LIMIT 10
    `;
 
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Select Error (activity_log):", err);
            return res.status(500).json({ error: `Failed to load activity log: ${err.message}` });
        }
        res.status(200).json({ activities: results });
    });
});
 




//register recep
/*app.post('/api/register-receptionist', async (req, res) => {
    const { fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password } = req.body;

   /* app.post('/api/register-admin', async (req, res) => {
    const { fullName, contactNumber, nic, govEmployeeId, jobTitle, email, username, password } = req.body;
    // ... existing validation and insert code ...
*/
   /* logActivity(`New receptionist registered: ${fullName}.`);   // ✅ correct placement

    res.status(201).json({
        message: "receptionist registered successfully!",
        // ...
    });
});*/
/*
    if (!fullName || !govEmployeeId || !contactNumber || !email || !nic || !gender || !assignedWorkShift || !assignedUnit || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    try {
        const sqlInsert = `
            INSERT INTO receptionists (full_name, gov_employee_id, contact_number, email, nic, gender, assigned_work_shift, assigned_unit, username, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

       // const passwordHash = hashPassword(password);
        const [result] = await dbPromise.execute(sqlInsert, [fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password]);
        const token = generateToken({ sub: result.insertId, role: 'Receptionist', username });

        logActivity(`New receptionist registered: ${fullName}.`);

        res.status(201).json({
            message: "Receptionist registered successfully!",
            receptionist: { id: result.insertId, fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password },
            token
        });
    } catch (err) {
        console.error("Database Insert Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
        }
        return res.status(500).json({ error: `Database failed to save receptionist: ${err.message}` });
    }
});

app.get('/api/receptionists', (req, res) => {
    const sqlSelect = `
        SELECT id, full_name AS fullName, gov_employee_id AS govEmployeeId, contact_number AS contactNumber, email, nic, gender, assigned_work_shift AS assignedWorkShift, assigned_unit AS assignedUnit, username, password
        FROM receptionists
        ORDER BY id DESC
    `;

    db.query(sqlSelect, (err, results) => {
        if (err) {
         //   setReceptionists(data.receptionists);
            console.error("Database Select Error:", err);
            return res.status(500).json({ error: `Failed to load receptionists: ${err.message}` });
        }
        res.status(200).json({ receptionists: results });
    });
});

app.put('/api/receptionists/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password } = req.body;

    if (!fullName || !govEmployeeId || !contactNumber || !email || !nic || !gender || !assignedWorkShift || !assignedUnit || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    const sqlUpdate = `
        UPDATE receptionists
        SET full_name = ?, gov_employee_id = ?, contact_number = ?, email = ?, nic = ?, gender = ?, assigned_work_shift = ?, assigned_unit = ?, username = ?, password = ?
        WHERE id = ?
    `;

    db.query(sqlUpdate, [fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password, id], (err, result) => {
        if (err) {
            console.error("Database Update Error:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
            }
            return res.status(500).json({ error: `Database failed to update receptionist: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receptionist not found." });
        }

        res.status(200).json({
            message: "Receptionist updated successfully!",
            receptionist: { id: Number(id), fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password }
        });
    });
});

app.delete('/api/receptionists/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM receptionists WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error("Database Delete Error:", err);
            return res.status(500).json({ error: `Database failed to delete receptionist: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receptionist not found." });
        }
        res.status(200).json({ message: "Receptionist deleted successfully!" });
    });
   // logActivity(`New receptionist registered: ${fullName}.`);

});
//register recep end
*/


// ==========================================
// 1. REGISTER RECEPTIONIST (POST)
// ==========================================
app.post('/api/register-receptionist', async (req, res) => {
    const { fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password } = req.body;

    if (!fullName || !govEmployeeId || !contactNumber || !email || !nic || !gender || !assignedWorkShift || !assignedUnit || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    try {
        // FIXED: Column name changed from gov_employee_id to employee_id to match your database image
        const sqlInsert = `
            INSERT INTO receptionists (full_name, employee_id, contact_number, email, nic, gender, assigned_work_shift, assigned_unit, username, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await dbPromise.execute(sqlInsert, [fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password]);
        const token = generateToken({ sub: result.insertId, role: 'Receptionist', username });

        logActivity(`New receptionist registered: ${fullName}.`);

        res.status(201).json({
            message: "Receptionist registered successfully!",
            receptionist: { id: result.insertId, fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username },
            token
        });
    } catch (err) {
        console.error("Database Insert Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
        }
        return res.status(500).json({ error: `Database failed to save receptionist: ${err.message}` });
    }
});

// ==========================================
// 2. GET ALL RECEPTIONISTS (GET)
// ==========================================
app.get('/api/receptionists', (req, res) => {
    const sqlSelect = `
        SELECT id, full_name AS fullName, employee_id AS govEmployeeId, contact_number AS contactNumber, email, nic, gender, assigned_work_shift AS assignedWorkShift, assigned_unit AS assignedUnit, username, password
        FROM receptionists
        ORDER BY id ASC
    `;

    db.query(sqlSelect, (err, results) => {
        if (err) {
            console.error("Database Select Error:", err);
            return res.status(500).json({ error: `Failed to load receptionists: ${err.message}` });
        }
        // Sends array wrapped in { receptionists: [...] }
        res.status(200).json({ receptionists: results }); 
    });
});

// ==========================================
// 3. UPDATE RECEPTIONIST (PUT)
// ==========================================
app.put('/api/receptionists/:id', (req, res) => {
    const { id } = req.params;
    const { fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password } = req.body;

    if (!fullName || !govEmployeeId || !contactNumber || !email || !nic || !gender || !assignedWorkShift || !assignedUnit || !username || !password) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    // FIXED: Changed gov_employee_id = ? to employee_id = ? to match DB
    const sqlUpdate = `
        UPDATE receptionists
        SET full_name = ?, employee_id = ?, contact_number = ?, email = ?, nic = ?, gender = ?, assigned_work_shift = ?, assigned_unit = ?, username = ?, password = ?
        WHERE id = ?
    `;

    db.query(sqlUpdate, [fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username, password, id], (err, result) => {
        if (err) {
            console.error("Database Update Error:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "Username, Email, or NIC already exists!" });
            }
            return res.status(500).json({ error: `Database failed to update receptionist: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receptionist not found." });
        }

        res.status(200).json({
            message: "Receptionist updated successfully!",
            receptionist: { id: Number(id), fullName, govEmployeeId, contactNumber, email, nic, gender, assignedWorkShift, assignedUnit, username }
        });
    });
});

// ==========================================
// 4. DELETE RECEPTIONIST (DELETE)
// ==========================================
app.delete('/api/receptionists/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM receptionists WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error("Database Delete Error:", err);
            return res.status(500).json({ error: `Database failed to delete receptionist: ${err.message}` });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Receptionist not found." });
        }
        res.status(200).json({ message: "Receptionist deleted successfully!" });
    });
});

// ==========================================
// 1. REGISTER DOCTOR (POST)
// ==========================================
app.post('/api/register_doctor', async (req, res) => {
    const { 
        full_name, nic, dob, address, contact_number, gender, 
        slmc_Reg_Number, gov_Email, gov_EmpId, designation, 
        username, password, contact_Person_name, emergency_Contact_no, account_status,
        assigned_unit, assigned_shift, available_date, available_time, inactive_reason
    } = req.body;

    // Strict validation check for mandatory fields
    if (!full_name || !nic || !dob || !address || !contact_number || !gender || 
        !slmc_Reg_Number || !gov_Email || !gov_EmpId || !username || !password || 
        !contact_Person_name || !emergency_Contact_no) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    const specialization = req.body.specialization || "";

    try {
        const sqlInsert = `
            INSERT INTO doctors (
                full_name, nic, dob, address, contact_number, gender, slmc_Reg_Number, 
                gov_Email, gov_EmpId, designation, specialization, contact_Person_name, 
                emergency_Contact_no, account_status, username, password,
                assigned_unit, assigned_shift, available_date, available_time, inactive_reason
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await dbPromise.execute(sqlInsert, [
            full_name, nic, dob, address, contact_number, gender, slmc_Reg_Number, 
            gov_Email, gov_EmpId, designation || "Dental Surgeon", specialization, contact_Person_name, 
            emergency_Contact_no, account_status || "Active", username, password,
            account_status === "Active" ? (assigned_unit || null) : null, 
            account_status === "Active" ? (assigned_shift || null) : null, 
            account_status === "Active" ? (available_date || null) : null, 
            account_status === "Active" ? (available_time || null) : null, 
            account_status === "Inactive" ? (inactive_reason || null) : null
        ]);

        const token = generateToken({ sub: result.insertId, role: 'Doctor', username });
        logActivity(`New doctor registered: ${full_name}.`);
          
        res.status(201).json({
            message: "Doctor registered successfully!",
            doctor: { 
                id: result.insertId, full_name, nic, dob, address, contact_number, gender, 
                slmc_Reg_Number, gov_Email, gov_EmpId, designation: designation || "Dental Surgeon", 
                specialization, account_status: account_status || "Active", username,
                assigned_unit, assigned_shift, available_date, available_time, inactive_reason
            },
            token
        });
    } catch (err) {
        console.error("Database Insert Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username, Email, SLMC Reg. No., or NIC already exists!" });
        }
        return res.status(500).json({ error: `Database failed to save doctor: ${err.message}` });
    }
});

// ==========================================
// 2. GET ALL DOCTORS (GET)
// ==========================================
app.get('/api/doctors', async (req, res) => {
    const sqlSelect = `
        SELECT id, full_name, nic, dob, address, contact_number, gender, 
               slmc_Reg_Number, gov_Email, gov_EmpId, designation, specialization, 
               username, password, contact_Person_name, emergency_Contact_no, account_status,
               assigned_unit, assigned_shift, available_date, available_time, inactive_reason
        FROM doctors
        ORDER BY id ASC
    `;

    try {
        const [results] = await dbPromise.execute(sqlSelect);
        res.status(200).json({ doctors: results }); 
    } catch (err) {
        console.error("Database Select Error:", err);
        return res.status(500).json({ error: `Failed to load doctors: ${err.message}` });
    }
});

// ==========================================
// 3. UPDATE DOCTOR (PUT)
// ==========================================
app.put('/api/doctors/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        full_name, nic, dob, address, contact_number, gender, 
        slmc_Reg_Number, gov_Email, gov_EmpId, designation, 
        username, password, contact_Person_name, emergency_Contact_no, account_status,
        assigned_unit, assigned_shift, available_date, available_time, inactive_reason
    } = req.body;

    if (!full_name || !nic || !dob || !address || !contact_number || !gender || 
        !slmc_Reg_Number || !gov_Email || !gov_EmpId || !username || !password || 
        !contact_Person_name || !emergency_Contact_no) {
        return res.status(400).json({ error: "Please fill in all mandatory fields." });
    }

    const specialization = req.body.specialization || "";

    const sqlUpdate = `
        UPDATE doctors
        SET full_name = ?, nic = ?, dob = ?, address = ?, contact_number = ?, gender = ?, 
            slmc_Reg_Number = ?, gov_Email = ?, gov_EmpId = ?, designation = ?, specialization = ?, 
            username = ?, password = ?, contact_Person_name = ?, emergency_Contact_no = ?, account_status = ?,
            assigned_unit = ?, assigned_shift = ?, available_date = ?, available_time = ?, inactive_reason = ?
        WHERE id = ?
    `;

    try {
        const [result] = await dbPromise.execute(sqlUpdate, [
            full_name, nic, dob, address, contact_number, gender, 
            slmc_Reg_Number, gov_Email, gov_EmpId, designation, specialization, 
            username, password, contact_Person_name, emergency_Contact_no, account_status,
            account_status === "Active" ? (assigned_unit || null) : null,
            account_status === "Active" ? (assigned_shift || null) : null,
            account_status === "Active" ? (available_date || null) : null,
            account_status === "Active" ? (available_time || null) : null,
            account_status === "Inactive" ? (inactive_reason || null) : null,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Doctor not found." });
        }

        res.status(200).json({
            message: "Doctor updated successfully!",
            doctor: { 
                id: Number(id), full_name, nic, dob, address, contact_number, gender, 
                slmc_Reg_Number, gov_Email, gov_EmpId, designation, specialization, 
                username, contact_Person_name, emergency_Contact_no, account_status,
                assigned_unit, assigned_shift, available_date, available_time, inactive_reason
            }
        });
    } catch (err) {
        console.error("Database Update Error:", err);
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "Username, Email, SLMC Reg. No., or NIC already exists!" });
        }
        return res.status(500).json({ error: `Database failed to update doctor: ${err.message}` });
    }
});

// ==========================================
// 4. DELETE DOCTOR (DELETE)
// ==========================================
app.delete('/api/doctors/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await dbPromise.execute('DELETE FROM doctors WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Doctor not found." });
        }
        res.status(200).json({ message: "Doctor deleted successfully!" });
    } catch (err) {
        console.error("Database Delete Error:", err);
        return res.status(500).json({ error: `Database failed to delete doctor: ${err.message}` });
    }
});






app.get('/api/patients', (req, res) => {
    const sql = `
        SELECT 
            t.id AS tokenId,
            t.token_no AS tokenNo,
            t.assigned_doctor AS assignedDoctor,
            t.dental_reasons AS dentalReasons,
            t.status,
            t.created_at AS createdAt,
            p.id AS patientId,
            p.full_name AS fullName,
            p.nic,
            p.age,
            p.gender,
            p.contact_number AS contactNumber,
            p.address,
            p.patient_category AS patientCategory,
            p.bht_file_no AS bhtFileNo
        FROM tokens t
        JOIN patients p ON t.patient_id = p.id
        ORDER BY t.id ASC    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Database Select Error (patients):", err);
            return res.status(500).json({ error: `Failed to load patients: ${err.message}` });
        }
        res.status(200).json({ patients: results });
    });
});
app.put('/api/tokens/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Waiting', 'Now Treating', 'Completed', 'Absent at Call'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }

    // If setting someone to "Now Treating", first reset anyone else who was already "Now Treating"
    const resetPrevious = () => new Promise((resolve, reject) => {
        if (status !== 'Now Treating') return resolve();
        db.query(
            `UPDATE tokens SET status = 'Waiting' WHERE status = 'Now Treating' AND id != ?`,
            [id],
            (err) => err ? reject(err) : resolve()
        );
    });

    resetPrevious()
        .then(() => {
            db.query(
                `UPDATE tokens SET status = ? WHERE id = ?`,
                [status, id],
                (err, result) => {
                    if (err) {
                        console.error("Database Update Error (token status):", err);
                        return res.status(500).json({ error: `Failed to update status: ${err.message}` });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Token not found.' });
                    }

                    logActivity(`Token status updated to "${status}" (Token ID ${id}).`);

                    res.status(200).json({ message: 'Status updated successfully.', id: Number(id), status });
                }
            );
        })
        .catch((err) => {
            console.error("Database Update Error (reset previous):", err);
            res.status(500).json({ error: `Failed to update status: ${err.message}` });
        });
});
app.post('/api/register-patient', async (req, res) => {
    const {
        fullName,
        nic,
        age,
        gender,
        contactNumber,
        address,
        patientCategory,
        assignedDoctor,
        dentalReasons,
        clinicalNotes,
        bhtFileNo,
        arrivalMode
    } = req.body;

    if (!fullName || !nic || !age || !gender || !contactNumber || !address) {
        return res.status(400).json({ error: 'Please fill in the mandatory patient details.' });
    }
   // logActivity(`Receptionist registered new patient: ${fullName} (Token ${tokenNo}).`);

    try {
        const patientInsert = `
            INSERT INTO patients (full_name, nic, age, gender, contact_number, address, patient_category,bht_file_no)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [patientResult] = await dbPromise.execute(patientInsert, [
            fullName,
            nic,
            Number(age),
            gender,
            contactNumber,
            address,
            patientCategory || 'standard-citizen',
            bhtFileNo || null
        ]);

        const [tokenRows] = await dbPromise.query(`
            SELECT COALESCE(MAX(CAST(SUBSTRING(token_no, 3) AS UNSIGNED)), 0) + 1 AS nextTokenNumber
            FROM tokens
        `);
        const nextTokenNumber = Number(tokenRows[0]?.nextTokenNumber || 1);
        const tokenNo = `T-${String(nextTokenNumber).padStart(4, '0')}`;

        const reasonsValue = Array.isArray(dentalReasons)
            ? JSON.stringify(dentalReasons)
            : (dentalReasons ? String(dentalReasons) : (clinicalNotes ? String(clinicalNotes) : null));

        const tokenInsert = `
            INSERT INTO tokens (patient_id, token_no, assigned_doctor, dental_reasons, status)
            VALUES (?, ?, ?, ?, ?)
        `;
        const [tokenResult] = await dbPromise.execute(tokenInsert, [
            patientResult.insertId,
            tokenNo,
            assignedDoctor || 'Unassigned',
            reasonsValue,
            'Waiting'
        ]);

        const [tokenDetails] = await dbPromise.query(`
            SELECT id, token_no AS tokenNo, assigned_doctor AS assignedDoctor, dental_reasons AS dentalReasons, status, created_at AS createdAt
            FROM tokens
            WHERE id = ?
        `, [tokenResult.insertId]);

        logActivity(`Receptionist registered new patient: ${fullName} (Token ${tokenNo}).`);


        res.status(201).json({
            message: 'Patient registered and token generated successfully.',
            patient: {
                id: patientResult.insertId,
                fullName,
                nic,
                age,
                gender,
                contactNumber,
                address,
                patientCategory: patientCategory || 'standard-citizen',
                bhtFileNo,
                arrivalMode
            },
            token: tokenDetails[0],
            tokenNumber: tokenNo,
            updatedQueue: [{
                id: tokenDetails[0]?.id,
                token_no: tokenNo,
                assigned_doctor: assignedDoctor || 'Unassigned',
                full_name: fullName,
                nic,
                age,
                gender,
                contact_number: contactNumber,
                address,
                patient_category: patientCategory || 'standard-citizen',
                dental_reasons: reasonsValue,
                status: 'Waiting'
            }]
            
        });
        //recent system act
        //logActivity(`Token status updated to "${status}" (Token ID ${id}).`);
    } catch (err) {
        console.error('Patient registration failed:', err);
        return res.status(500).json({ error: `Failed to register patient: ${err.message}` });
    }
});


// Register all API routes
function registerAllRoutes() {
    console.log('Registering all API routes...');
    
    // Reset requests routes
    console.log('  - POST /api/reset-requests');
    app.post('/api/reset-requests', (req, res) => {
        const { role, name, username, email } = req.body;
        if (!role || !name || !username || !email) {
            return res.status(400).json({ error: "Please provide role, name, username, and email." });
        }
        const insertRequest = `INSERT INTO password_reset_requests (role, name, username, email) VALUES (?, ?, ?, ?)`;
        db.query(insertRequest, [role, name, username, email], (err, result) => {
            if (err) {
                console.error("Database Insert Error (reset request):", err);
                return res.status(500).json({ error: `Failed to save reset request: ${err.message}` });
            }
            const selectRequest = `SELECT id, role, name, username, email, status, requested_at AS requestedAt FROM password_reset_requests WHERE id = ?`;
            db.query(selectRequest, [result.insertId], (selectErr, rows) => {
                if (selectErr) {
                    console.error("Database Select Error (reset request):", selectErr);
                    return res.status(500).json({ error: `Failed to load reset request: ${selectErr.message}` });
                }
                res.status(201).json({ request: rows[0] });
            });
        });
    });

    console.log('  - GET /api/reset-requests');
    app.get('/api/reset-requests', (req, res) => {
        const sqlSelect = `SELECT id, role, name, username, email, status, requested_at AS requestedAt FROM password_reset_requests ORDER BY id DESC`;
        db.query(sqlSelect, (err, results) => {
            if (err) {
                console.error("Database Select Error (reset requests):", err);
                return res.status(500).json({ error: `Failed to load reset requests: ${err.message}` });
            }
            res.status(200).json({ requests: results });
        });
    });

    console.log('  - PUT /api/reset-requests/:id');
    app.put('/api/reset-requests/:id', (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const updateStatus = status || "Completed";
        const sqlUpdate = `UPDATE password_reset_requests SET status = ? WHERE id = ?`;
        db.query(sqlUpdate, [updateStatus, id], (err, result) => {
            if (err) {
                console.error("Database Update Error (reset request):", err);
                return res.status(500).json({ error: `Failed to update reset request: ${err.message}` });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Reset request not found." });
            }
            const sqlSelect = `SELECT id, role, name, username, email, status, requested_at AS requestedAt FROM password_reset_requests WHERE id = ?`;
            db.query(sqlSelect, [id], (selectErr, rows) => {
                if (selectErr) {
                    console.error("Database Select Error (reset request update):", selectErr);
                    return res.status(500).json({ error: `Failed to load updated reset request: ${selectErr.message}` });
                }
                res.status(200).json({ request: rows[0] });
            });
        });
    });

    console.log('  - POST /api/register-admin');
    console.log('  - GET /api/admins');
    console.log('  - POST /api/register-receptionist');
    console.log('  - GET /api/receptionists');
    console.log('  - PUT /api/receptionists/:id');
    console.log('  - DELETE /api/receptionists/:id');
    console.log('  - POST /api/register_doctor');
    console.log('  - GET /api/doctors');
    console.log('  - PUT /api/doctors/:id');
    console.log('  - DELETE /api/doctors/:id');
    console.log('  - POST /api/register-patient');
    
    console.log('All routes registered successfully!');
}

// Initialize database and start server
function startServer() {
    // Register all routes
    registerAllRoutes();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Backend server running on all interfaces on port ${PORT}`);
        console.log(`Access from this machine: http://localhost:${PORT}`);
    });

    // Log registered routes for debugging
    try {
        const routes = [];
        if (app && app._router && app._router.stack) {
            app._router.stack.forEach((middleware) => {
                if (middleware.route) {
                    const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
                    routes.push(`${methods} ${middleware.route.path}`);
                } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
                    middleware.handle.stack.forEach((handler) => {
                        if (handler.route) {
                            const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
                            routes.push(`${methods} ${handler.route.path}`);
                        }
                    });
                }
            });
        }
      console.log('\nFinal registered routes:');        // <-- this line
        routes.forEach(r => console.log('  ' + r));         // <-- and this line
    } catch (e) {
        console.error('Failed to list registered routes:', e);
    }
}

// Start the server
startServer();
