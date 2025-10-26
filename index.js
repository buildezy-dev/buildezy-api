import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------ MIDDLEWARE ------------------
app.use(
  cors({
    // IMPORTANT: In production, the origin MUST be set to your deployed frontend URL (e.g., https://buildezy.vercel.app)
    // CRITICAL FIX: Add your custom deployed domain to the whitelist
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://192.168.1.10:5173",
      "https://buildezyservices.sbs", // ✅ FIX: Added custom domain for CORS
      // Add your deployed Vercel URL here if you use the Vercel subdomain (e.g., https://buildezy-frontend.vercel.app)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// ------------------ DATABASE ------------------
// Production Ready: Use DATABASE_URL provided by Render/Railway. 
// Fallback to individual variables for local testing, but deployment relies on the connectionString.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // REQUIRED FOR DEPLOYMENT: Render/Railway/Heroku requires SSL for external connections
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false
  } : false, // Only use SSL if DATABASE_URL is set (i.e., in production)
});

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL successfully!"))
  .catch((err) =>
    console.error("❌ Error connecting to PostgreSQL:", err.message)
  );

// ------------------ BASE ROUTE ------------------
app.get("/", (req, res) => {
  res.send("🚀 Buildezy Backend Running Successfully!");
});

// ------------------ VENDORS ------------------
// Add new vendor
app.post("/api/vendors", async (req, res) => {
  const { name, email, mobile, service, description } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO vendors (name, email, mobile, service, description) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [name, email, mobile, service, description || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Vendor insert error:", err.message);
    res.status(500).json({ error: "Server error while adding vendor" });
  }
});

// Get all vendors
app.get("/api/vendors", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vendors ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error while fetching vendors" });
  }
});

// Delete vendor by ID
app.delete("/api/vendors/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM vendors WHERE id=$1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Vendor not found" });
    res.json({
      message: "Vendor deleted successfully",
      vendor: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Vendor delete error:", err.message);
    res.status(500).json({ error: "Server error while deleting vendor" });
  }
});

// Update vendor by ID
app.put("/api/vendors/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, service, description } = req.body;
  try {
    const result = await pool.query(
      "UPDATE vendors SET name=$1, email=$2, mobile=$3, service=$4, description=$5 WHERE id=$6 RETURNING *",
      [name, email, mobile, service, description, id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Vendor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Vendor update error:", err.message);
    res.status(500).json({ error: "Server error while updating vendor" });
  }
});

// ------------------ ENQUIRIES ------------------
// Add new enquiry
app.post("/api/enquiries", async (req, res) => {
  const { name, email, mobile, message } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO enquiries (name, email, mobile, message) VALUES ($1,$2,$3,$4) RETURNING *",
      [name, email, mobile, message || ""]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Enquiry insert error:", err.message);
    res.status(500).json({ error: "Server error while adding enquiry" });
  }
});

// Get all enquiries
app.get("/api/enquiries", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM enquiries ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Enquiry fetch error:", err.message);
    res.status(500).json({ error: "Server error while fetching enquiries" });
  }
});

// DELETE enquiry by ID
app.delete("/api/enquiries/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM enquiries WHERE id=$1 RETURNING *",
      [id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ error: "Enquiry not found" });

    res.json({
      message: "Enquiry deleted successfully",
      enquiry: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Enquiry delete error:", err.message);
    res.status(500).json({ error: "Server error while deleting enquiry" });
  }
});

// ------------------ START SERVER ------------------
// Bind to 0.0.0.0 for external access in production environments
app.listen(PORT, "0.0.0.0", () => {
  console.log(`⚡ Server running on http://localhost:${PORT}`);
  console.log(`🌐 Accessible on LAN: http://192.168.1.10:${PORT}`);
});
