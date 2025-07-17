const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const User = require('./models/User');
const Camp = require('./models/Camp');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

mongoose.connect('mongodb+srv://anuvargheseav123:<Anu@2002>@cluster0.kzygswn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  await new User({ username, password }).save();
  res.send('User Registered!');
});

app.get('/camps', async (req, res) => {
  const camps = await Camp.find();
  res.render('camps', { camps });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));


const mongoose = require('mongoose');

mongoose.connect(mongodb+srv://aravindgpillai666:<db_password>@cluster0.wi4cdum.mongodb.net/
)
  .then(() => console.log('MongoDB connected!'))
  .catch(err => console.log(err));







