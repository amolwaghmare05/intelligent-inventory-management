const mysql = require('mysql2');

// Create the database connection
const createConnection = () => {
  // Validate required environment variables
  const requiredEnvVars = ['db_user_name', 'db_name'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars.join(', '));
    process.exit(1);
  }

  const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.db_user_name,
    password: process.env.db_password,
    database: process.env.db_name
  });

  // Connect to database
  connection.connect((err) => {
    if (!err) {
      console.log('DB connection succeeded');
    } else {
      console.log('DB connection failed \n Error:', JSON.stringify(err, undefined, 2));
      setTimeout(() => handleDisconnect(connection), 2000);
    }
  });

  // Handle disconnects
  connection.on('error', err => {
    console.error('MySQL error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      handleDisconnect(connection);
    } else {
      throw err;
    }
  });

  return connection;
};

// Handle disconnects
function handleDisconnect(connection) {
  connection.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      setTimeout(() => handleDisconnect(connection), 2000);
    } else {
      console.log('Reconnected to MySQL database.');
    }
  });
}

const mysqlConnection = createConnection();

module.exports = mysqlConnection;
