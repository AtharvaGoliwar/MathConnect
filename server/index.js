require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI

// Middleware
app.use(cors());
// Increase limit for Base64 file uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- MONGOOSE SCHEMAS ---

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // In production, hash this!
  role: { type: String, enum: ['ADMIN', 'STUDENT'], required: true },
  class: String,
  phone: String,
  address: String,
  joinDate: String,
  avatarUrl: String
});

const AttachmentSchema = new mongoose.Schema({
  id: String,
  name: String,
  url: String, // Base64 string or URL
  type: String,
  createdAt: String
});

const AssignmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  subject: String,
  description: String,
  dueDate: String,
  assignedTo: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'SUBMITTED', 'GRADED'], default: 'PENDING' },
  questionPapers: [AttachmentSchema], // Array of attachments
  submittedFiles: [AttachmentSchema],
  submittedAt: String,
  score: Number,
  maxScore: Number,
  remarks: String
});

const User = mongoose.model('User', UserSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);

// --- SEED DEFAULT ADMIN ---
const seedAdmin = async () => {
  try {
    const admin = await User.findOne({ email: 'admin@tuition.com' });
    if (!admin) {
      await User.create({
        id: 'admin-001',
        name: 'Super Admin',
        email: 'admin@tuition.com',
        password: 'admin-secure-access', 
        role: 'ADMIN',
        avatarUrl: ''
      });
      console.log('Default Admin (admin@tuition.com) Created');
    }
  } catch (error) {
    console.error("Error seeding admin:", error);
  }
};

// --- ROUTES ---

// Health Check
app.get('/', (req, res) => {
  res.send('MathConnect API is running.');
});

// Auth
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password }); // Simple check
  if (user) {
    const { password, ...userWithoutPassword } = user.toObject();
    return res.json(userWithoutPassword);
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// Users
app.get('/api/users', async (req, res) => {
  const { role, email, id } = req.query;
  const query = {};
  if (role) query.role = role;
  if (email) query.email = email;
  if (id) query.id = id;
  
  const users = await User.find(query).select('-password');
  res.json(users);
});

app.get('/api/users/:id', async (req, res) => {
  const user = await User.findOne({ id: req.params.id }).select('-password');
  res.json(user);
});

app.post('/api/users', async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    const { password, ...userWithoutPassword } = newUser.toObject();
    res.json(userWithoutPassword);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const updated = await User.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findOneAndDelete({ id: req.params.id });
    // Also cleanup assignments for this user
    await Assignment.deleteMany({ assignedTo: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Assignments
app.get('/api/assignments', async (req, res) => {
  const { assignedTo } = req.query;
  const query = {};
  if (assignedTo) query.assignedTo = assignedTo;
  
  const assignments = await Assignment.find(query).sort({ id: -1 });
  res.json(assignments);
});

app.post('/api/assignments', async (req, res) => {
  try {
    const newAssignment = await Assignment.create(req.body);
    res.json(newAssignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/assignments/:id', async (req, res) => {
  try {
    const updated = await Assignment.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/assignments/:id', async (req, res) => {
  try {
    await Assignment.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- INIT ---

if (!MONGODB_URI || MONGODB_URI === 'undefined') {
    console.error('Error: MONGODB_URI is not defined correctly.');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedAdmin();
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });