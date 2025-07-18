

const express = require("express")
const cors = require("cors")
const fs = require("fs").promises
const path = require("path")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"


// Middleware
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.static("public")) // Serve HTML files from public folder

// Database file paths
const DB_PATH = path.join(__dirname, "database")
const USERS_FILE = path.join(DB_PATH, "users.json")
const CAMPS_FILE = path.join(DB_PATH, "camps.json")
const SELECTIONS_FILE = path.join(DB_PATH, "selections.json")

// Initialize database
async function initializeDatabase() {
  try {
    await fs.mkdir(DB_PATH, { recursive: true })

    // Initialize users file
    try {
      await fs.access(USERS_FILE)
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify([]))
    }

    // Initialize camps file with default camps
    try {
      await fs.access(CAMPS_FILE)
    } catch {
      const defaultCamps = [
        {
          id: 1,
          name: "Central School Grounds",
          beds: 24,
          originalBeds: 24,
          resources: ["Food", "Water", "Medical Aid", "Blankets"],
          contact: "+91 98765 43210",
          ambulance: "Yes",
          type: "default",
          addedBy: "System",
          addedDate: new Date().toISOString(),
        },
        {
          id: 2,
          name: "Community Hall",
          beds: 12,
          originalBeds: 12,
          resources: ["Food", "Water", "Blankets", "Clothing"],
          contact: "+91 98765 11223",
          ambulance: "Nearby",
          type: "default",
          addedBy: "System",
          addedDate: new Date().toISOString(),
        },
        {
          id: 3,
          name: "Government High School",
          beds: 30,
          originalBeds: 30,
          resources: ["Food", "Water", "First Aid", "Hygiene Kits"],
          contact: "+91 98765 77889",
          ambulance: "Yes",
          type: "default",
          addedBy: "System",
          addedDate: new Date().toISOString(),
        },
      ]
      await fs.writeFile(CAMPS_FILE, JSON.stringify(defaultCamps, null, 2))
    }

    // Initialize selections file
    try {
      await fs.access(SELECTIONS_FILE)
    } catch {
      await fs.writeFile(SELECTIONS_FILE, JSON.stringify([]))
    }

    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Error initializing database:", error)
  }
}

// Database helper functions
async function readUsers() {
  const data = await fs.readFile(USERS_FILE, "utf8")
  return JSON.parse(data)
}

async function writeUsers(users) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

async function readCamps() {
  const data = await fs.readFile(CAMPS_FILE, "utf8")
  return JSON.parse(data)
}

async function writeCamps(camps) {
  await fs.writeFile(CAMPS_FILE, JSON.stringify(camps, null, 2))
}

async function readSelections() {
  const data = await fs.readFile(SELECTIONS_FILE, "utf8")
  return JSON.parse(data)
}

async function writeSelections(selections) {
  await fs.writeFile(SELECTIONS_FILE, JSON.stringify(selections, null, 2))
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" })
    }
    req.user = user
    next()
  })
}

// Routes

// User Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, age, contact, address, needs, skills, availability } = req.body

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    if (!["volunteer", "refugee"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" })
    }

    const users = await readUsers()

    // Check if user already exists
    if (users.find((user) => user.email === email)) {
      return res.status(400).json({ error: "User already exists with this email" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user object
    const newUser = {
      id: users.length + 1,
      name,
      email,
      password: hashedPassword,
      role,
      age: Number.parseInt(age),
      contact,
      registeredDate: new Date().toISOString(),
    }

    // Add role-specific fields
    if (role === "refugee") {
      newUser.address = address
      newUser.needs = needs
    } else if (role === "volunteer") {
      newUser.skills = skills
      newUser.availability = availability
    }

    users.push(newUser)
    await writeUsers(users)

    // Generate JWT token
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, {
      expiresIn: "24h",
    })

    // Remove password from response
    const { password: _, ...userResponse } = newUser

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// User Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" })
    }

    const users = await readUsers()
    const user = users.find((u) => u.email === email)

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" })

    // Remove password from response
    const { password: _, ...userResponse } = user

    res.json({
      message: "Login successful",
      user: userResponse,
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get all camps
app.get("/api/camps", authenticateToken, async (req, res) => {
  try {
    const camps = await readCamps()
    res.json(camps)
  } catch (error) {
    console.error("Error fetching camps:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Add new camp (volunteers only)
app.post("/api/camps", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({ error: "Only volunteers can add camps" })
    }

    const { name, beds, resources, contact, ambulance } = req.body

    if (!name || !beds) {
      return res.status(400).json({ error: "Camp name and beds are required" })
    }

    const camps = await readCamps()
    const users = await readUsers()
    const volunteer = users.find((u) => u.id === req.user.id)

    const newCamp = {
      id: camps.length > 0 ? Math.max(...camps.map((c) => c.id)) + 1 : 1,
      name,
      beds: Number.parseInt(beds),
      originalBeds: Number.parseInt(beds),
      resources: resources
        ? resources
            .split(",")
            .map((r) => r.trim())
            .filter((r) => r)
        : ["Basic supplies"],
      contact: contact || "",
      ambulance: ambulance || "No",
      type: "volunteer-added",
      addedBy: volunteer.name,
      addedDate: new Date().toISOString(),
    }

    camps.push(newCamp)
    await writeCamps(camps)

    res.status(201).json({
      message: "Camp added successfully",
      camp: newCamp,
    })
  } catch (error) {
    console.error("Error adding camp:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Delete camp (volunteers only, non-default camps)
app.delete("/api/camps/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({ error: "Only volunteers can delete camps" })
    }

    const campId = Number.parseInt(req.params.id)
    const camps = await readCamps()
    const campIndex = camps.findIndex((c) => c.id === campId)

    if (campIndex === -1) {
      return res.status(404).json({ error: "Camp not found" })
    }

    if (camps[campIndex].type === "default") {
      return res.status(403).json({ error: "Cannot delete default camps" })
    }

    // Remove any selections for this camp
    const selections = await readSelections()
    const updatedSelections = selections.filter((s) => s.campId !== campId)
    await writeSelections(updatedSelections)

    camps.splice(campIndex, 1)
    await writeCamps(camps)

    res.json({ message: "Camp deleted successfully" })
  } catch (error) {
    console.error("Error deleting camp:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Select camp (refugees only)
app.post("/api/camps/:id/select", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "refugee") {
      return res.status(403).json({ error: "Only refugees can select camps" })
    }

    const campId = Number.parseInt(req.params.id)
    const camps = await readCamps()
    const selections = await readSelections()
    const users = await readUsers()

    const camp = camps.find((c) => c.id === campId)
    if (!camp) {
      return res.status(404).json({ error: "Camp not found" })
    }

    // Check if user already has a selection
    const existingSelection = selections.find((s) => s.userId === req.user.id)
    if (existingSelection) {
      return res.status(400).json({ error: "You already have a camp selected" })
    }

    // Check if camp has available beds
    if (camp.beds <= 0) {
      return res.status(400).json({ error: "This camp is full" })
    }

    // Decrease bed count
    camp.beds -= 1
    await writeCamps(camps)

    // Create selection
    const user = users.find((u) => u.id === req.user.id)
    const newSelection = {
      id: selections.length + 1,
      userId: req.user.id,
      userEmail: req.user.email,
      userName: user.name,
      campId: campId,
      campName: camp.name,
      selectedDate: new Date().toISOString(),
    }

    selections.push(newSelection)
    await writeSelections(selections)

    res.json({
      message: "Camp selected successfully",
      selection: newSelection,
    })
  } catch (error) {
    console.error("Error selecting camp:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Cancel camp selection
app.delete("/api/selections/my", authenticateToken, async (req, res) => {
  try {
    const selections = await readSelections()
    const camps = await readCamps()

    const selectionIndex = selections.findIndex((s) => s.userId === req.user.id)
    if (selectionIndex === -1) {
      return res.status(404).json({ error: "No selection found" })
    }

    const selection = selections[selectionIndex]

    // Increase bed count back
    const camp = camps.find((c) => c.id === selection.campId)
    if (camp) {
      camp.beds += 1
      await writeCamps(camps)
    }

    // Remove selection
    selections.splice(selectionIndex, 1)
    await writeSelections(selections)

    res.json({ message: "Selection cancelled successfully" })
  } catch (error) {
    console.error("Error cancelling selection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get user's selection
app.get("/api/selections/my", authenticateToken, async (req, res) => {
  try {
    const selections = await readSelections()
    const userSelection = selections.find((s) => s.userId === req.user.id)

    if (!userSelection) {
      return res.status(404).json({ error: "No selection found" })
    }

    res.json(userSelection)
  } catch (error) {
    console.error("Error fetching selection:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get volunteer assignments (for dashboard)
app.get("/api/volunteer-assignments", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "volunteer") {
      return res.status(403).json({ error: "Only volunteers can access this endpoint" })
    }

    // This is a placeholder - you can implement volunteer assignment logic
    res.json([])
  } catch (error) {
    console.error("Error fetching volunteer assignments:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Verify token endpoint
app.get("/api/verify", authenticateToken, async (req, res) => {
  try {
    const users = await readUsers()
    const user = users.find((u) => u.id === req.user.id)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const { password: _, ...userResponse } = user
    res.json({ user: userResponse })
  } catch (error) {
    console.error("Error verifying token:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log("Database files will be created in ./database/ directory")
  })
})
