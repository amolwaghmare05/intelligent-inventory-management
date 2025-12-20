const { app } = require('./app');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Set port
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
