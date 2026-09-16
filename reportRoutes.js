// reportRoutes.js
const express = require("express");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

module.exports = function (pool) {
  const router = express.Router();
  console.log("reportRoutes.js loaded");

  function buildFilter({ range, date, startDate, endDate, doctor, status }) {
    const conditions = [];
    const params = [];
    const safeDate = date || new Date().toISOString().split("T")[0];

    if (range === "custom" && startDate && endDate) {
      conditions.push("t.created_at BETWEEN ? AND ?");
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    } else if (range === "weekly") {
      conditions.push("t.created_at BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(safeDate, safeDate);
    } else if (range === "monthly") {
      conditions.push("DATE_FORMAT(t.created_at, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')");
      params.push(safeDate);
    } else {
      conditions.push("DATE(t.created_at) = ?");
      params.push(safeDate);
    }

    if (doctor && doctor !== "all") {
      conditions.push(`
        (
          TRIM(t.assigned_doctor) = TRIM(?)
          OR TRIM(t.assigned_doctor) IN (
            SELECT TRIM(username)
            FROM doctors
            WHERE TRIM(username) = TRIM(?) OR TRIM(full_name) = TRIM(?)
          )
          OR TRIM(t.assigned_doctor) IN (
            SELECT TRIM(full_name)
            FROM doctors
            WHERE TRIM(username) = TRIM(?) OR TRIM(full_name) = TRIM(?)
          )
        )
      `);
      params.push(doctor, doctor, doctor, doctor, doctor);
    }

    if (status && status !== "all") {
      if (status.toLowerCase() === "absent") {
        conditions.push("LOWER(t.status) LIKE ?");
        params.push("%absent%");
      } else {
        conditions.push("LOWER(t.status) = ?");
        params.push(status.toLowerCase());
      }
    }

    return {
      whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
      params,
    };
  }

  async function fetchRows(criteria) {
    const { whereClause, params } = buildFilter(criteria);
    const query = `
      SELECT t.id, t.token_no AS tokenNo, t.created_at AS createdAt,
             COALESCE(d.full_name, t.assigned_doctor) AS doctor, t.status
      FROM tokens t
      LEFT JOIN doctors d
        ON TRIM(t.assigned_doctor) = TRIM(d.username)
        OR TRIM(t.assigned_doctor) = TRIM(d.full_name)
      ${whereClause}
      ORDER BY t.created_at ASC
    `;
    const [rows] = await pool.query(query, params);
    return rows;
  }

  function summarize(rows) {
    const issued = rows.length;
    const completed = rows.filter((r) => (r.status || "").toLowerCase() === "completed").length;
    const absent = rows.filter((r) => (r.status || "").toLowerCase().includes("absent")).length;
    return { issued, completed, absent };
  }

  router.get("/doctors", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        id,
        full_name,
        nic,
        dob,
        address,
        contact_number,
        gender,
        slmc_Reg_Number,
        gov_Email,
        gov_EmpId,
        designation,
        specialization,
        username,
        password,
        contact_Person_name,
        emergency_Contact_no,
        account_status,
        assigned_unit,
        assigned_shift,
        available_date,
        available_time,
        inactive_reason
      FROM doctors
        ORDER BY id ASC
    `);

    res.json({ doctors: rows });

  } catch (err) {
    console.error("Error loading doctors:", err);
    res.status(500).json({ error: "Failed to load doctors." });
  }
});

  // Keep /report/export BEFORE /report to prevent route collision confusion
  router.get("/report/export", async (req, res) => {
    try {
      const rows = await fetchRows(req.query);
      const summary = summarize(rows);
      const { format = "pdf", range, date, startDate, endDate } = req.query;
      const safeDate = date || new Date().toISOString().split("T")[0];
      const period = range === "custom" && startDate && endDate ? `${startDate}_to_${endDate}` : safeDate;

      if (format === "excel") {
        return await sendExcel(res, rows, summary, range || "daily", period);
      }
      return sendPdf(res, rows, summary, range || "daily", period);
    } catch (err) {
      console.error("CRITICAL EXPORT ERROR:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate report file." });
      }
    }
  });

  router.get("/report", async (req, res) => {
    try {
      const rows = await fetchRows(req.query);
      res.json({ rows, summary: summarize(rows) });
    } catch (err) {
      console.error("Error in /report preview:", err);
      res.status(500).json({ error: "Failed to load report." });
    }
  });
  async function sendExcel(res, rows, summary, range, period) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Token Report");

    sheet.mergeCells("A1:D1");
    sheet.getCell("A1").value = "Wijaya Kumaratunga Memorial Hospital - Dental Unit Queue System";
    sheet.getCell("A1").font = { bold: true, size: 13 };

    sheet.getCell("A3").value = `Report Type: ${range}`;
    sheet.getCell("A4").value = `Period: ${period}`;
    sheet.getCell("A5").value = `Total Issued: ${summary.issued}  |  Completed: ${summary.completed}  |  Absent: ${summary.absent}`;

    sheet.addRow([]);
    const headerRow = sheet.addRow(["Token No", "Printed Time", "Attending Doctor", "Status"]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    });

    rows.forEach((r) => {
      sheet.addRow([
        r.tokenNo || "",
        r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
        r.doctor || "N/A",
        r.status || ""
      ]);
    });

    sheet.columns.forEach((col) => (col.width = 24));

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="token-report-${period}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  function sendPdf(res, rows, summary, range, period) {
    const doc = new PDFDocument({ margin: 36, size: "A4" });
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentLeft = 40;
    const contentRight = pageWidth - 40;
    const contentWidth = contentRight - contentLeft;
    const navy = "#10284C";
    const blue = "#006FCF";
    const gold = "#D5A021";
    const lightBlue = "#EAF2FB";
    const border = "#CAD7E6";
    const text = "#17233A";
    const muted = "#5B6B82";
    const logoPath = path.join(__dirname, "..", "dentalqueue-system", "public", "gov-logo.jpg");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="token-report-${period}.pdf"`);
    doc.pipe(res);

    const drawHeader = () => {
      doc.rect(0, 0, pageWidth, 92).fill(navy);
      doc.rect(0, 92, pageWidth, 5).fill(gold);

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, contentLeft, 18, { width: 54, height: 54 });
      }

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(15)
        .text("WIJAYA KUMARATUNGA MEMORIAL HOSPITAL", contentLeft + 70, 24, {
          width: contentWidth - 70,
          align: "center",
        })
        .fontSize(11)
        .text("Dental Unit Queue System", contentLeft + 70, 46, {
          width: contentWidth - 70,
          align: "center",
        })
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#DDE8F7")
        .text("Ministry of Health, Sri Lanka", contentLeft + 70, 64, {
          width: contentWidth - 70,
          align: "center",
        });
    };

    let pageNumber = 1;

    const drawFooter = () => {
      const footerY = pageHeight - 58;
      doc
        .strokeColor(border)
        .lineWidth(0.8)
        .moveTo(contentLeft, footerY - 8)
        .lineTo(contentRight, footerY - 8)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(muted)
        .text("Authorized personnel only. Computer generated report.", contentLeft, footerY, {
          width: contentWidth - 80,
          align: "center",
        })
        .text(`Page ${pageNumber}`, contentRight - 70, footerY, {
          width: 70,
          align: "right",
        });
    };

    const drawReportInfo = () => {
      doc
        .roundedRect(contentLeft, 118, contentWidth, 62, 6)
        .fillAndStroke("#FFFFFF", border);

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(navy)
        .text("Token Report", contentLeft + 18, 134);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(text)
        .text(`Report Type: ${String(range || "daily").toUpperCase()}`, contentLeft + 18, 156)
        .text(`Period: ${period}`, contentLeft + 190, 156)
        .text(`Generated: ${new Date().toLocaleString()}`, contentLeft + 330, 156);
    };

    const drawSummaryBox = (x, label, value, color) => {
      doc.roundedRect(x, 198, 160, 62, 5).fillAndStroke("#FFFFFF", border);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(muted)
        .text(label, x + 14, 214, { width: 132 });
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(color)
        .text(String(value), x + 14, 232, { width: 132 });
    };

    const drawTableHeader = (y) => {
      doc.rect(contentLeft, y, contentWidth, 28).fill(navy);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#FFFFFF")
        .text("Token", contentLeft + 10, y + 9, { width: 70 })
        .text("Printed Time", contentLeft + 90, y + 9, { width: 115 })
        .text("Attending Doctor", contentLeft + 220, y + 9, { width: 190 })
        .text("Status", contentLeft + 430, y + 9, { width: 80 });
      return y + 28;
    };

    const drawNewPage = () => {
      drawFooter();
      doc.addPage();
      pageNumber += 1;
      drawHeader();
      return drawTableHeader(122);
    };

    drawHeader();
    drawReportInfo();
    drawSummaryBox(contentLeft, "Total Token Issued", summary.issued, navy);
    drawSummaryBox(contentLeft + 178, "Sessions Completed", summary.completed, blue);
    drawSummaryBox(contentLeft + 356, "Absent at Call", summary.absent, "#B42318");

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(blue)
      .text("Token Breakdown", contentLeft, 288);

    let y = drawTableHeader(312);
    const rowHeight = 30;

    if (!rows.length) {
      doc.rect(contentLeft, y, contentWidth, 42).fillAndStroke("#FFFFFF", border);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(muted)
        .text("No tokens found for this period.", contentLeft, y + 14, {
          width: contentWidth,
          align: "center",
        });
    } else {
      rows.forEach((r, index) => {
        if (y + rowHeight > pageHeight - 60) {
          y = drawNewPage();
        }

        const rowFill = index % 2 === 0 ? "#FFFFFF" : lightBlue;
        const statusValue = String(r.status || "");
        const statusColor = statusValue.toLowerCase() === "completed"
          ? "#0F7A3D"
          : statusValue.toLowerCase().includes("absent")
            ? "#B42318"
            : "#7A5A00";

        doc.rect(contentLeft, y, contentWidth, rowHeight).fillAndStroke(rowFill, border);
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(text)
          .text(String(r.tokenNo || ""), contentLeft + 10, y + 10, { width: 70 })
          .text(r.createdAt ? new Date(r.createdAt).toLocaleString() : "", contentLeft + 90, y + 10, { width: 115 })
          .text(String(r.doctor || "N/A"), contentLeft + 220, y + 10, { width: 190 })
          .font("Helvetica-Bold")
          .fillColor(statusColor)
          .text(statusValue || "-", contentLeft + 430, y + 10, { width: 80 });

        y += rowHeight;
      });
    }

    drawFooter();

    doc.end();
  }

  return router;
};
