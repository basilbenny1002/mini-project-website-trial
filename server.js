const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));


const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// ✅ MongoDB Connection

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ✅ Mongoose Schemas & Models
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  age: Number,
  contact: String,
  address: String,
  needs: String,
  skills: String,
  availability: String,
  registeredDate: { type: Date, default: Date.now },
});

const campSchema = new mongoose.Schema({
  name: String,
  beds: Number,
  originalBeds: Number,
  resources: [String],
  contact: String,
  ambulance: String,
  type: String,
  addedBy: String,
  addedDate: { type: Date, default: Date.now },
});

const selectionSchema = new mongoose.Schema({
  userId: mongoose.Types.ObjectId,
  userEmail: String,
  userName: String,
  campId: mongoose.Types.ObjectId,
  campName: String,
  selectedDate: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Camp = mongoose.model("Camp", campSchema);
const Selection = mongoose.model("Selection", selectionSchema);

// ✅ Middleware to verify JWT
function authenticateToken(req, res, next) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// ✅ Routes

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, age, contact, address, needs, skills, availability } = req.body;

    if (!name || !email || !password || !role) return res.status(400).json({ error: "Missing required fields" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      age,
      contact,
      address,
      needs,
      skills,
      availability,
    });

    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ message: "User registered successfully", user: userData, token });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    const { password: _, ...userData } = user.toObject();
    res.json({ message: "Login successful", user: userData, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Initialize Default Camps (Run once)
app.get("/api/init-camps", async (req, res) => {
  try {
    const count = await Camp.countDocuments();
    if (count === 0) {
      await Camp.insertMany([
        { name: "Central School Grounds", beds: 24, originalBeds: 24, resources: ["Food", "Water"], contact: "+91 98765 43210", ambulance: "Yes", type: "default", addedBy: "System" },
        { name: "Community Hall", beds: 12, originalBeds: 12, resources: ["Food", "Water"], contact: "+91 98765 11223", ambulance: "Nearby", type: "default", addedBy: "System" },
      ]);
    }
    res.send("Default camps initialized");
  } catch (err) {
    res.status(500).send("Error initializing camps");
  }
});

// Get all Camps
app.get("/api/camps", authenticateToken, async (req, res) => {
  try {
    const camps = await Camp.find();
    res.json(camps);
  } catch (err) {
    res.status(500).json({ error: "Error fetching camps" });
  }
});

// Add Camp
app.post("/api/camps", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") return res.status(403).json({ error: "Only volunteers can add camps" });

    const { name, beds, resources, contact, ambulance } = req.body;
    if (!name || !beds) return res.status(400).json({ error: "Name and beds are required" });

    const camp = new Camp({
      name,
      beds,
      originalBeds: beds,
      resources,
      contact,
      ambulance,
      type: "volunteer-added",
      addedBy: req.user.email,
    });

    await camp.save();
    res.status(201).json({ message: "Camp added successfully", camp });
  } catch (err) {
    res.status(500).json({ error: "Error adding camp" });
  }
});

// Select Camp
app.post("/api/camps/:id/select", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "refugee") return res.status(403).json({ error: "Only refugees can select camps" });

    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ error: "Camp not found" });
    if (camp.beds <= 0) return res.status(400).json({ error: "Camp is full" });

    const existing = await Selection.findOne({ userId: req.user.id });
    if (existing) return res.status(400).json({ error: "Already selected a camp" });

    camp.beds -= 1;
    await camp.save();

    const selection = new Selection({
      userId: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      campId: camp._id,
      campName: camp.name,
    });

    await selection.save();
    res.json({ message: "Camp selected", selection });
  } catch (err) {
    res.status(500).json({ error: "Error selecting camp" });
  }
});

// Verify Token
app.get("/api/verify", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Error verifying token" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
