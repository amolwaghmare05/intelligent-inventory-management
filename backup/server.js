if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }

  const express = require('express');
  const { app, mysqlConnection } = require('./app');
  const bcrypt = require('bcrypt')
  const passport = require('passport')
  const flash = require('express-flash')
  const session = require('express-session')
  const methodOverride = require('method-override')
  const bodyparser = require('body-parser');
  const dotenv = require('dotenv');
  const aiModule = require('./ai/index');
  const { hashPassword, isPasswordHashed } = require('./utils/passwordUtils');
  const csrf = require('csurf');
  const rateLimit = require('express-rate-limit');
  const helmet = require('helmet');

  const port = process.env.PORT || 3000;
  app.use(bodyparser.json());

  // Setup security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://code.jquery.com", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      },
    },
    xssFilter: true,
    noSniff: true,
    referrerPolicy: { policy: 'same-origin' }
  }));

  // Setup CSRF protection
  const csrfProtection = csrf({ cookie: true });
  app.use(csrfProtection);

  // Setup rate limiting
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // Apply rate limiting to login route
  app.use('/login', loginLimiter);

  // Add security headers to all API routes
  app.use('/api', (req, res, next) => {
    // Set security headers for API routes
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  const users = []

    users.push({
      id: Date.now().toString(),
      name: 'Admin',
      email: process.env.login_id,
      password: process.env.login_password
    })


  const initializePassport = require('./passport-config')
  initializePassport(

    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
  )

  // Only set view engine and static files here
  app.use(express.static("public"))
  app.set('view engine', 'ejs')
  app.use(express.urlencoded({ extended: true }))
  app.use(flash())
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side JS from reading the cookie
      secure: process.env.NODE_ENV === 'production', // Requires HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' // Prevents CSRF attacks
    }
  }))
  app.use(passport.initialize())
  app.use(passport.session())
  app.use(methodOverride('_method'))

  // Initialize AI features
  // const ai = aiModule.initAI(app, mysqlConnection); // Removed duplicate initialization since it's done in app.js

  app.get('/dashboard', checkAuthenticated, async (req, res) => {
    try {
      const [totalSales] = await mysqlConnection.promise().query('SELECT SUM(Amount) AS TotalItemsOrdered FROM ordersdb');
      const [orderCount] = await mysqlConnection.promise().query('SELECT COUNT(ItemID) AS NumberOfProducts FROM ordersdb');
      const [stockCount] = await mysqlConnection.promise().query('SELECT COUNT(ItemID) AS NumberOfProducts FROM stockdb');
      const [totalStock] = await mysqlConnection.promise().query('SELECT SUM(Amount) AS TotalItemsOrdered FROM stockdb');
      const topSellingItems = await aiModule.getTopSellingItems(mysqlConnection, 5);

      res.render('index.ejs', {
        total_sales: totalSales,
        ord_num: orderCount,
        stock_num: stockCount,
        total_stock: totalStock,
        topSellingItems: topSellingItems
      });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).send('Database error');
    }
  });

  app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
  })

  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/welcome',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/welcome', checkAuthenticated, (req, res) => {
    res.render('welcome.ejs');
  });

  app.get('/', checkAuthenticated, (req, res) => {
    res.redirect('/dashboard');
  });

  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
  })

  app.post('/register', checkNotAuthenticated, [
    // Input validation
    check('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    check('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address')
      .normalizeEmail(),
    check('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
    check('password-confirm')
      .notEmpty().withMessage('Password confirmation is required')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true;
      }),
  ], async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // If there are validation errors, render the register page with error messages
        return res.render('register.ejs', {
          errors: errors.array(),
          name: req.body.name,
          email: req.body.email
        });
      }

      // If validation passes, hash the password and create the user
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      users.push({
        id: Date.now().toString(),
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword
      })
      console.log(users)
      req.flash('success', 'Registration successful! You can now log in.');
      res.redirect('/login')
    } catch (error) {
      console.error('Registration error:', error);
      req.flash('error', 'An error occurred during registration');
      res.redirect('/register')
    }
  })

  app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/login')
  })

  // Admin route to hash all plain-text passwords
  app.get('/admin/hash-passwords', checkAuthenticated, async (req, res) => {
    try {
      // Only allow admin users to access this route
      if (req.user.email !== process.env.login_id) {
        req.flash('error', 'You do not have permission to access this page');
        return res.redirect('/dashboard');
      }

      // Get all users with plain-text passwords
      const [usersWithPlainTextPasswords] = await mysqlConnection.promise().query(
        'SELECT * FROM users WHERE password NOT LIKE "$2b$%" AND password NOT LIKE "$2a$%"'
      );

      if (usersWithPlainTextPasswords.length === 0) {
        req.flash('info', 'All passwords are already hashed');
        return res.redirect('/dashboard');
      }

      // Hash each plain-text password
      let updatedCount = 0;
      for (const user of usersWithPlainTextPasswords) {
        const hashedPassword = await hashPassword(user.password);
        await mysqlConnection.promise().query(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, user.id]
        );
        updatedCount++;
      }

      req.flash('success', `Successfully hashed ${updatedCount} passwords`);
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Error hashing passwords:', error);
      req.flash('error', 'An error occurred while hashing passwords');
      res.redirect('/dashboard');
    }
  })

  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }

    res.redirect('/login')
  }

  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
  }

  // AI Feature Routes
  // Sales Forecast page
  app.get('/sales-forecast', checkAuthenticated, (req, res) => {
    res.render('sales_forecast.ejs');
  });

  // Top Selling Items Prediction
  app.get('/top-selling-prediction', checkAuthenticated, (req, res) => {
    // Get historical best-selling items
    const bestSellersQuery = `
      SELECT
        ItemName,
        Brand,
        Category,
        COUNT(*) as totalSales,
        SUM(CAST(Amount AS DECIMAL(10,2))) as revenue
      FROM ordersdb
      GROUP BY ItemName, Brand, Category
      ORDER BY totalSales DESC, revenue DESC
      LIMIT 10
    `;

    mysqlConnection.query(bestSellersQuery, (err, bestSellers) => {
      if (err) {
        console.error('Error fetching best sellers:', err);
        return res.status(500).send('Error fetching product insights');
      }

      // Format data for display
      const processedData = bestSellers.map(item => ({
        name: item.ItemName,
        brand: item.Brand,
        category: item.Category,
        totalSales: parseInt(item.totalSales) || 0,
        revenue: parseFloat(item.revenue) || 0,
        // Simple prediction algorithm - can be enhanced with actual ML model
        prediction7Days: Math.round((parseInt(item.totalSales) || 0) * 0.2),
        prediction14Days: Math.round((parseInt(item.totalSales) || 0) * 0.4),
        prediction30Days: Math.round((parseInt(item.totalSales) || 0) * 0.7),
        confidence: Math.floor(70 + Math.random() * 20) // Mock confidence level
      }));

      res.render('top_selling_prediction.ejs', {
        bestSellers: processedData
      });
    });
  });

  // Route to generate sample data for top-selling items testing
  app.get('/seed-top-selling-items', checkAuthenticated, (req, res) => {
    try {
      // Sample products for testing
      const sampleOrders = [
        { ItemName: "Men's T-Shirt", Brand: "Fashion", Category: "Clothing", Amount: 599, quantity: 25 },
        { ItemName: "Women's Jeans", Brand: "Denim", Category: "Clothing", Amount: 1299, quantity: 18 },
        { ItemName: "Casual Shoes", Brand: "Comfort", Category: "Footwear", Amount: 999, quantity: 12 },
        { ItemName: "Running Shoes", Brand: "Sports", Category: "Footwear", Amount: 1499, quantity: 15 },
        { ItemName: "Cotton Shirt", Brand: "Casual", Category: "Clothing", Amount: 799, quantity: 30 },
        { ItemName: "Leather Jacket", Brand: "Premium", Category: "Outerwear", Amount: 2999, quantity: 5 },
        { ItemName: "Watch", Brand: "Timepiece", Category: "Accessories", Amount: 1799, quantity: 8 },
        { ItemName: "Sunglasses", Brand: "Vision", Category: "Accessories", Amount: 599, quantity: 10 },
        { ItemName: "Backpack", Brand: "Travel", Category: "Bags", Amount: 899, quantity: 7 },
        { ItemName: "Wallet", Brand: "Leather", Category: "Accessories", Amount: 499, quantity: 20 }
      ];

      // Insert sample orders into database
      let successCount = 0;
      let failCount = 0;

      // Function to insert a single order with random date in last 30 days
      function insertOrder(order, index) {
        return new Promise((resolve, reject) => {
          // Create a random date within the last 30 days
          const now = new Date();
          const daysAgo = Math.floor(Math.random() * 30);
          const orderDate = new Date(now.setDate(now.getDate() - daysAgo));

          // Create transaction ID
          const transactionId = `TR${Date.now()}${index}`;

          // Insert multiple entries based on quantity
          const promises = [];

          for (let i = 0; i < order.quantity; i++) {
            const query = `INSERT INTO ordersdb (TransactionID, ItemName, Brand, Category, Amount, Date)
                          VALUES (?, ?, ?, ?, ?, ?)`;

            const promise = new Promise((innerResolve, innerReject) => {
              mysqlConnection.query(
                query,
                [transactionId, order.ItemName, order.Brand, order.Category, order.Amount, orderDate],
                (err) => {
                  if (err) {
                    console.error('Error inserting sample order:', err);
                    innerReject(err);
                  } else {
                    innerResolve();
                  }
                }
              );
            });

            promises.push(promise);
          }

          Promise.all(promises)
            .then(() => {
              successCount += order.quantity;
              resolve();
            })
            .catch(err => {
              failCount += order.quantity;
              reject(err);
            });
        });
      }

      // Insert all orders
      const insertPromises = sampleOrders.map((order, index) => insertOrder(order, index));

      Promise.all(insertPromises)
        .then(() => {
          res.redirect('/top-selling-prediction?success=true&message=Successfully added sample data for top selling items prediction.');
        })
        .catch(error => {
          console.error('Error inserting sample data:', error);
          res.redirect('/top-selling-prediction?error=true&message=Error generating sample data: ' + error.message);
        });
    } catch (error) {
      console.error('Exception in sample data generation:', error);
      res.redirect('/top-selling-prediction?error=true&message=Error generating sample data: ' + error.message);
    }
  });

  // Inventory optimization page (placeholder for future implementation)
  app.get('/inventory-optimization', checkAuthenticated, (req, res) => {
    res.send('Inventory Optimization feature coming soon!');
  });

  // Route to generate sample sales data
  app.get('/seed-sample-sales', checkAuthenticated, async (req, res) => {
    try {
      const sampleProducts = [
        { id: 1, ItemName: "Men's T-Shirt", category: "Clothing", brand: "Fashion", size: "L", basePrice: 599 },
        { id: 2, ItemName: "Women's Jeans", category: "Clothing", brand: "Denim", size: "M", basePrice: 1299 },
        { id: 3, ItemName: "Casual Shoes", category: "Footwear", brand: "Comfort", size: "42", basePrice: 999 },
        { id: 4, ItemName: "Sports Watch", category: "Accessories", brand: "Active", size: "One Size", basePrice: 2499 },
        { id: 5, ItemName: "Backpack", category: "Bags", brand: "Travel", size: "Standard", basePrice: 1499 }
      ];

      // Daily volume pattern (0 = Sunday, 6 = Saturday)
      const dailyVolume = [15, 10, 12, 10, 14, 20, 25]; // More orders on weekends

      // Generate orders for the last 30 days
      const orders = [];
      const now = new Date();
      let successCount = 0;
      let failCount = 0;

      for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dayOfWeek = date.getDay();
        const numOrders = dailyVolume[dayOfWeek];

        // Format date as DD/MM/YYYY
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        // Generate orders for this day
        for (let j = 0; j < numOrders; j++) {
          const transactionId = 'TR' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-4);
          const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order

          for (let k = 0; k < numItems; k++) {
            const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
            const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity per item
            const amount = product.basePrice * quantity;

            // Add validation
            if (isNaN(amount)) {
                console.error('Invalid amount calculated:', {
                    basePrice: product.basePrice,
                    quantity: quantity
                });
                continue;
            }

            // Generate unique ItemID by combining product id with timestamp and random string
            const uniqueItemId = `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

            const order = {
              ItemID: uniqueItemId, // Use the unique ItemID instead of product.id
              ItemName: product.ItemName,
              Category: product.category,
              Brand: product.brand,
              Size: product.size,
              Amount: amount,
              CustomerNumber: String(Math.floor(Math.random() * 9000000000) + 1000000000),
              TransactionDate: formattedDate,
              TransactionTime: new Date(date.setHours(Math.random() * 12 + 9)).toTimeString().slice(0, 8),
              TransactionID: transactionId,
              TMonth: date.getMonth() + 1,
              TYear: date.getFullYear(),
              TDay: date.getDate()
            };

            orders.push(order);
          }
        }
      }

      // Insert orders in smaller batches
      const batchSize = 50; // Reduced batch size
      for (let i = 0; i < orders.length; i += batchSize) {
        const batch = orders.slice(i, i + batchSize);
        const values = batch.map(order => [
          order.ItemID,
          order.ItemName,
          order.Category,
          order.Brand,
          order.Size,
          order.Amount,
          order.CustomerNumber,
          order.TransactionDate,
          order.TransactionTime,
          order.TransactionID,
          order.TMonth,
          order.TYear,
          order.TDay
        ]);

        try {
          await new Promise((resolve, reject) => {
            const sql = 'INSERT INTO ordersdb (ItemID, ItemName, Category, Brand, Size, Amount, CustomerNumber, TransactionDate, TransactionTime, TransactionID, TMonth, TYear, TDay) VALUES ?';
            mysqlConnection.query(sql, [values], (err, result) => {
              if (err) {
                console.error('Database error:', err);
                reject(err);
              } else {
                resolve(result);
              }
            });
          });
          successCount += batch.length;
        } catch (err) {
          console.error('Error inserting batch:', err);
          failCount += batch.length;
        }
      }

      res.redirect('/sales-forecast?success=true&message=Successfully added ' + successCount + ' sample orders. Failed: ' + failCount);
    } catch (error) {
      console.error('Error generating sample data:', error);
      res.redirect('/sales-forecast?error=true&message=Error generating sample data: ' + error.message);
    }
  });

  app.get('/employees', (req,res) =>{
    mysqlConnection.query('SELECT * FROM warehouse', (err, rows, fields)=>{
      if(!err)
      res.send(rows);
      else
      console.log(err);
    })
  })

//View Orders
app.get('/orders', checkAuthenticated, async (req, res) => {
  try {
    // Query to get all orders for initial view
    const [orders] = await mysqlConnection.promise().query(
      'SELECT * FROM ordersdb ORDER BY TransactionDate DESC, TransactionTime DESC'
    );

    // Get transaction IDs from orders
    const transactionIds = orders.map(order => order.TransactionID);

    // Get sub-orders if there are any transactions
    let sub_orders = [];
    if (transactionIds.length > 0) {
      const [subOrderRows] = await mysqlConnection.promise().query(
        'SELECT * FROM ordersdb WHERE TransactionID IN (?)',
        [transactionIds]
      );
      sub_orders = subOrderRows;
    }

    res.render('orders.ejs', {
      orders: orders,
      sub_orders: sub_orders,
      display_content: [],
      selected_item: 'None',
      month_name: '',
      year: ''
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.render('orders.ejs', {
      orders: [],
      sub_orders: [],
      display_content: [],
      selected_item: 'None',
      month_name: '',
      year: ''
    });
  }
});

// Handle orders view filter
app.post('/orders_query', checkAuthenticated, async (req, res) => {
  try {
    const time_type = req.body.exampleRadios;
    let sql, params;

    if (time_type === 'month') {
      const month = req.body.selected_month;
      const year = req.body.selected_year;

      if (!month || !year) {
        return res.render('orders.ejs', {
          orders: [],
          sub_orders: [],
          display_content: [],
          selected_item: 'None',
          month_name: '',
          year: ''
        });
      }

      sql = `SELECT * FROM ordersdb WHERE TMonth = ? AND TYear = ? ORDER BY TransactionDate, TransactionTime`;
      params = [month, year];

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const month_name = monthNames[month - 1];

      const [orders] = await mysqlConnection.promise().query(sql, params);

      // Get transaction IDs from orders
      const transactionIds = orders.map(order => order.TransactionID);

      // Get sub-orders if there are any transactions
      let sub_orders = [];
      if (transactionIds.length > 0) {
        const [subOrderRows] = await mysqlConnection.promise().query(
          'SELECT * FROM ordersdb WHERE TransactionID IN (?)',
          [transactionIds]
        );
        sub_orders = subOrderRows;
      }

      res.render('orders.ejs', {
        orders: orders,
        sub_orders: sub_orders,
        display_content: orders,
        selected_item: 'month',
        month_name: month_name,
        year: year
      });

    } else if (time_type === 'year') {
      const year = req.body.selected_year;

      if (!year) {
        return res.render('orders.ejs', {
          orders: [],
          sub_orders: [],
          display_content: [],
          selected_item: 'None',
          month_name: '',
          year: ''
        });
      }

      sql = `SELECT * FROM ordersdb WHERE TYear = ? ORDER BY TMonth, TransactionDate, TransactionTime`;
      params = [year];

      const [orders] = await mysqlConnection.promise().query(sql, params);

      // Get transaction IDs from orders
      const transactionIds = orders.map(order => order.TransactionID);

      // Get sub-orders if there are any transactions
      let sub_orders = [];
      if (transactionIds.length > 0) {
        const [subOrderRows] = await mysqlConnection.promise().query(
          'SELECT * FROM ordersdb WHERE TransactionID IN (?)',
          [transactionIds]
        );
        sub_orders = subOrderRows;
      }

      res.render('orders.ejs', {
        orders: orders,
        sub_orders: sub_orders,
        display_content: orders,
        selected_item: 'year',
        month_name: '',
        year: year
      });
    } else {
      res.render('orders.ejs', {
        orders: [],
        sub_orders: [],
        display_content: [],
        selected_item: 'None',
        month_name: '',
        year: ''
      });
    }

  } catch (err) {
    console.error('Error processing orders query:', err);
    res.render('orders.ejs', {
      orders: [],
      sub_orders: [],
      display_content: [],
      selected_item: 'None',
      month_name: '',
      year: ''
    });
  }
});

//View Stocks
app.get('/viewstocks', checkAuthenticated, async (req, res) => {
  try {
    const [stocks] = await mysqlConnection.promise().query(
      'SELECT * FROM stockdb ORDER BY TYear DESC,Tmonth DESC, TDay DESC,StockTime DESC'
    );
    const [brands] = await mysqlConnection.promise().query('SELECT * FROM branddb');
    const [categories] = await mysqlConnection.promise().query('SELECT * FROM categorydb');

    res.render('viewstocks.ejs', {
      all_stocks: stocks,
      brands: brands,
      categories: categories,
      display_content: 'None',
      filter_type: 'None',
      filter_name: 'None'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send('Database error');
  }
});

//Stocks Query Filter
app.post('/stocks_query', checkAuthenticated, async (req, res) => {
  try {
    const [stocks] = await mysqlConnection.promise().query(
      'SELECT * FROM stockdb ORDER BY TYear DESC,Tmonth DESC, TDay DESC,StockTime DESC'
    );
    const [brands] = await mysqlConnection.promise().query('SELECT * FROM branddb');
    const [categories] = await mysqlConnection.promise().query('SELECT * FROM categorydb');

    const selected_item = req.body['exampleRadios'];
    let filteredStocks = [];

    if (selected_item === 'brand') {
      const brand_name = req.body['selected_brand'];
      [filteredStocks] = await mysqlConnection.promise().query(
        'SELECT * FROM stockdb WHERE Brand = ?',
        [brand_name]
      );
    } else if (selected_item === 'category') {
      const category_name = req.body['selected_category'];
      [filteredStocks] = await mysqlConnection.promise().query(
        'SELECT * FROM stockdb WHERE Category = ?',
        [category_name]
      );
    }

    res.render('viewstocks.ejs', {
      all_stocks: stocks,
      brands: brands,
      categories: categories,
      display_content: filteredStocks,
      filter_type: selected_item,
      filter_name: selected_item === 'brand' ? req.body['selected_brand'] : req.body['selected_category']
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send('Database error');
  }
});

  //Fetch Items by ID for billing
  app.post('/fetchitem',checkAuthenticated, (req, res) =>{
    item_id = req.body.itemid
    console.log(req.body)

    let sql = 'SELECT * FROM stockdb WHERE ItemID = ?'
    var response = {
      status  : 'success',
      success : 'Updated Successfully'
  }

    let query = mysqlConnection.query(sql, [item_id], (err, rows, fields)=>{
      if(!err)
      {
      console.log(rows)
      // res.render('viewstocks.ejs',{
      //   orders:rows
      // });
      res.json({success : "Updated Successfully", status : 200, rows:rows});
      }
      else
      console.log(err);
    });
  })

  //Billing
  app.get('/billing',checkAuthenticated, (req, res) => {
    let sql1 = 'SELECT * FROM categorydb'

    let query1 = mysqlConnection.query(sql1, (err1, rows1, fields1)=>{
      if(!err1)
      {
        var category = rows1
        let sql2 = 'SELECT * FROM branddb'
        let query2 = mysqlConnection.query(sql2, (err2, rows2, fields2)=>{
          if(!err2)
          {
            var brand = rows2
            let sql3 = 'SELECT * FROM sizedb'
            let query3 = mysqlConnection.query(sql3, (err3, rows3, fields3)=>{
              if(!err3)
              {
                var size = rows3
                console.log(typeof(category))
                console.log(category)
                console.log(brand)
                console.log(size)
                res.render('bill.ejs',{category:category, brand:brand, size:size})
              }
              else
              console.log(err3)
            })
          }
          else
          console.log(err2)
        })
      }
      else
      console.log(err1)


  })

})

//Add New Category
app.post('/addcategory', checkAuthenticated, (req, res) => {
  let sql = 'INSERT INTO categorydb(Category) VALUES (?)';
  let query = mysqlConnection.query(sql, [req.body.new], (err, rows, fields) => {
    if(!err) {
      res.redirect('/categories');
    } else {
      console.error(err);
      res.status(500).send('Database error');
    }
  });
});

  //Add New Brand
app.post('/addbrand', checkAuthenticated, (req, res) => {
  let sql = 'INSERT INTO branddb(Brand) VALUES (?)';
  let query = mysqlConnection.query(sql, [req.body.new], (err, rows, fields) => {
    if(!err) {
      res.redirect('/brands');
    } else {
      console.error(err);
      res.status(500).send('Database error');
    }
  });
});

  //Add New Size
app.post('/addsize', checkAuthenticated, (req, res) => {
  let sql = 'INSERT INTO sizedb(Size) VALUES (?)';
  let query = mysqlConnection.query(sql, [req.body.new], (err, rows, fields) => {
    if(!err) {
      res.redirect('/sizes');
    } else {
      console.error(err);
      res.status(500).send('Database error');
    }
  });
});

  //Orders Filter Query
  app.post('/orders_query', checkAuthenticated,(req,res) => {
  console.log("Received query request:", req.body);
  var time_type = req.body['exampleRadios'];
  var month = req.body['selected_month'];
  var year = req.body['selected_year'];

  console.log(`Filter type: ${time_type}, Month: ${month}, Year: ${year}`);

  if (!time_type || !year) {
    console.log("Missing required parameters");
    return res.redirect('/orders');
  }

      const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
  var month_name = time_type === 'month' ? monthNames[parseInt(month)-1] : 'None';

  // Get filtered orders (main query)
  let sql, params;
  if (time_type === 'month') {
    // For month filtering, get orders from that specific month and year
    sql = `SELECT TransactionID, SUM(Amount) as Amount, TransactionDate, TransactionTime
           FROM ordersdb
           WHERE TMonth = ? AND TYear = ?
           GROUP BY TransactionID, TransactionDate, TransactionTime`;
    params = [month, year];
  } else if (time_type === 'year') {
    // For year filtering, get orders from that specific year
    sql = `SELECT TransactionID, SUM(Amount) as Amount, TransactionDate, TransactionTime
           FROM ordersdb
           WHERE TYear = ?
           GROUP BY TransactionID, TransactionDate, TransactionTime`;
    params = [year];
  }

  console.log(`Executing SQL query: ${sql} with params:`, params);

  // Execute the main query with the appropriate parameters
  mysqlConnection.query(sql, params, (err, rows, fields) => {
    if(!err) {
      console.log(`Found ${rows.length} orders matching the filter criteria`);

      // Get transaction IDs from filtered results for sub-query
      const transactionIds = rows.map(row => row.TransactionID);

      if (transactionIds.length > 0) {
        // Only get sub-orders for the filtered transactions
        let sql1 = 'SELECT * FROM ordersdb WHERE TransactionID IN (?)';
        mysqlConnection.query(sql1, [transactionIds], (err1, rows1, fields1) => {
          if(!err1) {
            console.log(`Found ${rows1.length} order details for the sub-orders view`);

            // Render the orders page with the filtered results
            res.render('orders.ejs', {
              orders: rows,
              sub_orders: rows1,
              selected_item: time_type,
              month_name: month_name,
              year: year
            });
          } else {
            console.log("Error fetching sub_orders:", err1);
            res.redirect('/orders');
          }
        });
      } else {
        // No results found, render with empty arrays
        console.log("No matching orders found");
        res.render('orders.ejs', {
          orders: [],
          sub_orders: [],
          selected_item: time_type,
          month_name: month_name,
          year: year
        });
      }
    } else {
      console.log("Error in main query:", err);
      res.redirect('/orders');
    }
  });
  })

  //Sales Filter
app.get('/sales_filter', checkAuthenticated, async (req, res) => {
  try {
    res.render('sales_filter.ejs', {
      is_paramater_set: false,
      time_type: 'none',
      filter_type: 'none',
      display_content: {},
      month_name: 'None',
      year: 'None',
      total_amount: 'None'
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send('Database error');
  }
  })

  app.get('/stock_filter', (req, res) => {
    res.render('stock_filter.ejs', {filter_type: 'None',display_content: {}, total_items:{}})
  })

  //Stock Filter
  app.post('/stock_filter_query', checkAuthenticated,(req, res) => {
    var filter_type = req.body['exampleRadios1']
    if(filter_type == 'brand'){
      let sql = 'SELECT Brand,count(*) AS Count,SUM(Amount) AS Amount FROM stockdb GROUP BY Brand'
      let query = mysqlConnection.query(sql, (err, rows, fields) => {
        if(!err)
        {
          let sql1 = 'SELECT count(*) AS Count FROM stockdb'
          let query1 = mysqlConnection.query(sql1, (err1, rows1, fields1) => {
            if(!err1)
            {
              res.render('stock_filter.ejs',{filter_type: filter_type,display_content: rows, total_items:rows1})
            }
            else
            console.log(err1)
          })
        }
        else
        console.log(err)
      })
    }
    if(filter_type == 'category'){
      let sql = 'SELECT Category,count(*) AS Count,SUM(Amount) AS Amount FROM stockdb GROUP BY Category'
      let query = mysqlConnection.query(sql, (err, rows, fields) => {
        if(!err)
        {
          let sql1 = 'SELECT count(*) AS Count FROM stockdb'
          let query1 = mysqlConnection.query(sql1, (err1, rows1, fields1) => {
            if(!err1)
            {
              res.render('stock_filter.ejs',{filter_type: filter_type,display_content: rows, total_items:rows1})
            }
            else
            console.log(err1)
          })
        }
        else
        console.log(err)
      })
    }
  })

  //Sales Filter
  app.post('/sales_filter_query', checkAuthenticated,(req, res) => {
  console.log("Received filter request:", req.body);
  var time_type = req.body['exampleRadios'];
  var filter_type = req.body['exampleRadios1'];

  if (!time_type || !filter_type) {
    console.log("Missing required parameters");
    return res.redirect('/sales_filter');
  }

  if (time_type == 'month') {
    var month = req.body['selected_month'];
    var year = req.body['selected_year'];

    if (!month || !year) {
      console.log("Missing month or year parameters");
      return res.redirect('/sales_filter');
    }

      const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];
    var month_name = monthNames[parseInt(month-1)];

    let sql, params;

    if (filter_type == 'all') {
      sql = `SELECT TransactionDate, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TMonth = ? AND TYear = ?
             GROUP BY TransactionDate
             ORDER BY TransactionDate`;
      params = [month, year];
    } else if (filter_type == 'brand') {
      sql = `SELECT Brand, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TMonth = ? AND TYear = ?
             GROUP BY Brand
             ORDER BY Amount DESC`;
      params = [month, year];
    } else if (filter_type == 'category') {
      sql = `SELECT Category, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TMonth = ? AND TYear = ?
             GROUP BY Category
             ORDER BY Amount DESC`;
      params = [month, year];
    }

    mysqlConnection.query(sql, params, (err, rows, fields) => {
      if (!err) {
        let sql1 = `SELECT SUM(Amount) as Amount, COUNT(*) as Count
                   FROM ordersdb
                   WHERE TMonth = ? AND TYear = ?`;

        mysqlConnection.query(sql1, params, (err1, rows1, fields1) => {
          if (!err1) {
            console.log("Rendering results:", {
              filter_type,
              rows_count: rows.length,
              total_amount: rows1
            });

            res.render('sales_filter.ejs', {
              is_paramater_set: true,
              time_type: 'month',
              filter_type: filter_type,
              display_content: rows,
              month_name: month_name,
              year: year,
              total_amount: rows1
            });
          } else {
            console.log("Error getting totals:", err1);
            res.redirect('/sales_filter');
          }
        });
      } else {
        console.log("Error getting filtered data:", err);
        res.redirect('/sales_filter');
      }
    });
  } else if (time_type == 'year') {
    var year = req.body['selected_year'];

    if (!year) {
      console.log("Missing year parameter");
      return res.redirect('/sales_filter');
    }

    let sql, params;

    if (filter_type == 'all') {
      sql = `SELECT TMonth, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TYear = ?
             GROUP BY TMonth
             ORDER BY TMonth`;
      params = [year];
    } else if (filter_type == 'brand') {
      sql = `SELECT Brand, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TYear = ?
             GROUP BY Brand
             ORDER BY Amount DESC`;
      params = [year];
    } else if (filter_type == 'category') {
      sql = `SELECT Category, COUNT(*) as Count, SUM(Amount) as Amount
             FROM ordersdb
             WHERE TYear = ?
             GROUP BY Category
             ORDER BY Amount DESC`;
      params = [year];
    }

    mysqlConnection.query(sql, params, (err, rows, fields) => {
      if (!err) {
        let sql1 = `SELECT SUM(Amount) as Amount, COUNT(*) as Count
                   FROM ordersdb
                   WHERE TYear = ?`;

        mysqlConnection.query(sql1, params, (err1, rows1, fields1) => {
          if (!err1) {
            console.log("Rendering results:", {
              filter_type,
              rows_count: rows.length,
              total_amount: rows1
            });

            res.render('sales_filter.ejs', {
              is_paramater_set: true,
              time_type: 'year',
              filter_type: filter_type,
              display_content: rows,
              month_name: 'None',
              year: year,
              total_amount: rows1
            });
          } else {
            console.log("Error getting totals:", err1);
            res.redirect('/sales_filter');
          }
        });
      } else {
        console.log("Error getting filtered data:", err);
        res.redirect('/sales_filter');
      }
    });
  }
  })

  //View Categories
  app.get('/categories', checkAuthenticated,(req, res) => {
    let sql1 = 'SELECT * FROM categorydb'
    let query1 = mysqlConnection.query(sql1, (err1, rows1, fields1)=>{
      if(!err1)
      {
        var category = rows1
        res.render('categories.ejs', {category:category})
      }
      else
      console.log(err1)
  })
})

//View Brands
  app.get('/brands', checkAuthenticated,(req, res) => {
    let sql2 = 'SELECT * FROM branddb'
    let query2 = mysqlConnection.query(sql2, (err2, rows2, fields2)=>{
      if(!err2)
      {
        var brand = rows2
        res.render('brands.ejs',{brand:brand})
      }
      else
      console.log(err2)
  })
})

//View Sizes
  app.get('/sizes', checkAuthenticated,(req, res) => {
    let sql2 = 'SELECT * FROM sizedb'
    let query2 = mysqlConnection.query(sql2, (err2, rows2, fields2)=>{
      if(!err2)
      {
        var size = rows2
        res.render('sizes.ejs',{size:size})
      }
      else
      console.log(err2)
    })
  })

  //View Stocks
app.get('/stocks', checkAuthenticated, (req, res) => {
  let sql1 = 'SELECT * FROM categorydb';

  let query1 = mysqlConnection.query(sql1, (err1, rows1, fields1) => {
    if(!err1) {
      const category = rows1;
      let sql2 = 'SELECT * FROM branddb';
      let query2 = mysqlConnection.query(sql2, (err2, rows2, fields2) => {
        if(!err2) {
          const brand = rows2;
          let sql3 = 'SELECT * FROM sizedb';
          let query3 = mysqlConnection.query(sql3, (err3, rows3, fields3) => {
            if(!err3) {
              const size = rows3;
              res.render('stocks.ejs', {
                category: category,
                brand: brand,
                size: size
              });
            } else {
              console.error('Database error:', err3);
              res.status(500).send('Error fetching size data');
            }
          });
        } else {
          console.error('Database error:', err2);
          res.status(500).send('Error fetching brand data');
        }
      });
    } else {
      console.error('Database error:', err1);
      res.status(500).send('Error fetching category data');
    }
  });
});

  //Submit Bill
  // Import express-validator at the top of the file
  const { body, validationResult, check } = require('express-validator');

  // Add validation middleware to submitbill route
  app.post('/submitbill', [
    // Validate that at least one item exists
    check('itemid1').exists().withMessage('At least one item is required'),

    // Validate item details dynamically
    (req, res, next) => {
      const itemKeys = Object.keys(req.body).filter(key => key.startsWith('itemid'));

      // For each item, validate its properties
      itemKeys.forEach(key => {
        const index = key.replace('itemid', '');

        // Validate item name
        check(`itemname${index}`)
          .notEmpty().withMessage(`Item name for item ${index} is required`)
          .run(req);

        // Validate amount as a number
        check(`amount${index}`)
          .notEmpty().withMessage(`Amount for item ${index} is required`)
          .isNumeric().withMessage(`Amount for item ${index} must be a number`)
          .run(req);

        // Validate category
        check(`category${index}`)
          .notEmpty().withMessage(`Category for item ${index} is required`)
          .run(req);

        // Validate brand
        check(`brand${index}`)
          .notEmpty().withMessage(`Brand for item ${index} is required`)
          .run(req);

        // Validate size
        check(`size${index}`)
          .notEmpty().withMessage(`Size for item ${index} is required`)
          .run(req);
      });

      next();
    },

    // Validate customer number
    check('customernumber')
      .notEmpty().withMessage('Customer number is required')
      .isLength({ min: 10, max: 15 }).withMessage('Customer number should be between 10 and 15 digits')
      .isNumeric().withMessage('Customer number should contain only digits'),
  ],
  checkAuthenticated, (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, flash them and redirect back
      req.flash('error', errors.array().map(err => err.msg).join(', '));
      return res.redirect('/billing');
    }

    // Continue with the existing code
    console.log(`\nRequest body = `)
    console.log(req.body)
    var request1 = req.body

    var date_format = new Date();
  var transaction_date = date_format.getDate()+ '/' +(parseInt(date_format.getMonth()+1)).toString() +'/'+ date_format.getFullYear()
    var transaction_time = date_format.getHours() + ':' + date_format.getMinutes() + ':' + date_format.getSeconds()
    var transaction_id = "SHW"+ date_format.getDate() + date_format.getMonth() + date_format.getFullYear() + date_format.getHours() + date_format.getMinutes() + date_format.getSeconds()
    let new_req = {};

    var item_ids = []

    for(i in request1) {
      if(i.includes("itemid")){
        item_ids.push(request1[i])
      }
    }

      for (i in request1){
      if(i.includes("number") || i.includes("total")){
      delete i
      }
      else
      new_req[i] = request1[i]
      }

      const data = Object.entries(new_req).reduce((carry, [key, value]) => {
          const [text] = key.split(/\d+/);
          const index = key.substring(text.length) - 1;
          if (!Array.isArray(carry[index])) carry[index] = [];
          carry[index].push(value);
          return carry;
      }, []);

      for (let i = 0; i < data.length; i++) {
        data[i].push(transaction_date);
        data[i].push(transaction_time);
        data[i].push(transaction_id);
        data[i].push(date_format.getDate())
        data[i].push(date_format.getMonth() + 1)
        data[i].push(date_format.getFullYear())
       }

    console.log(`\nINSERT Array = `)
    console.log(data)
    let sql = `INSERT INTO ordersdb(ItemID,ItemName,Category,Brand,Size,Amount,CustomerNumber,TransactionDate,TransactionTime,TransactionID,TDay,TMonth,TYear) VALUES ? `
    let query = mysqlConnection.query(sql,[ data], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully inserted values into ordersdb')
     var sql2 = 'DELETE FROM stockdb WHERE ItemID = ?'
      for(j=0;j<item_ids.length;j++){
        var query2 = mysqlConnection.query(sql2,[item_ids[j]], (err2, rows2, fields2)=>{
          if(!err2)
          {
          console.log('Successfully deleted corresponding values from stockdb')

          }
          else
          console.log(err2);
        });
      }
      res.redirect('/orders')

      }
      else
      console.log(err);
    });
  })

  //Submit Stock
  app.post('/submitstock', [
    // Validate that at least one item exists
    check('itemid1').exists().withMessage('At least one item is required'),

    // Validate item details dynamically
    (req, res, next) => {
      const itemKeys = Object.keys(req.body).filter(key => key.startsWith('itemid'));

      // For each item, validate its properties
      itemKeys.forEach(key => {
        const index = key.replace('itemid', '');

        // Validate item name
        check(`itemname${index}`)
          .notEmpty().withMessage(`Item name for item ${index} is required`)
          .run(req);

        // Validate amount as a number
        check(`amount${index}`)
          .notEmpty().withMessage(`Amount for item ${index} is required`)
          .isNumeric().withMessage(`Amount for item ${index} must be a number`)
          .isFloat({ min: 0 }).withMessage(`Amount for item ${index} must be a positive number`)
          .run(req);

        // Validate category
        check(`category${index}`)
          .notEmpty().withMessage(`Category for item ${index} is required`)
          .run(req);

        // Validate brand
        check(`brand${index}`)
          .notEmpty().withMessage(`Brand for item ${index} is required`)
          .run(req);

        // Validate size
        check(`size${index}`)
          .notEmpty().withMessage(`Size for item ${index} is required`)
          .run(req);
      });

      next();
    },
  ],
  checkAuthenticated, (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // If there are validation errors, flash them and redirect back
      req.flash('error', errors.array().map(err => err.msg).join(', '));
      return res.redirect('/stocks');
    }
    console.log(req.body)
    var request1 = req.body

    var date_format = new Date();
    var transaction_date = date_format.getDate()+ '/'+ (parseInt(date_format.getMonth()+1)).toString() +'/'+date_format.getFullYear()
    console.log((parseInt(date_format.getMonth()+1)).toString())
    var transaction_time = date_format.getHours() + ':' + date_format.getMinutes() + ':' + date_format.getSeconds()
    let new_req = {};

      for (i in request1){
      if(i.includes("number") || i.includes("total")){
      delete i
      }
      else
      new_req[i] = request1[i]
      }

      const data = Object.entries(new_req).reduce((carry, [key, value]) => {
          const [text] = key.split(/\d+/);
          const index = key.substring(text.length) - 1;
          if (!Array.isArray(carry[index])) carry[index] = [];
          carry[index].push(value);
          return carry;
      }, []);

      for (let i = 0; i < data.length; i++) {
        data[i].push(transaction_date);
        data[i].push(transaction_time);
        data[i].push(date_format.getDate())
        data[i].push(date_format.getMonth() + 1)
        data[i].push(date_format.getFullYear())
       }


    let sql = `INSERT INTO stockdb(ItemID,ItemName,Category,Brand,Size,Amount,StockDate,StockTime,TDay,TMonth,TYear) VALUES ? `
    let query = mysqlConnection.query(sql,[ data], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully inserted values')
      res.redirect('/viewstocks')
      }
      else
      console.log(err);
    });
  })

  //Delete Order
  app.post('/deleteitem', checkAuthenticated,(req,res) => {
    console.log("Received delete request with body:", req.body);
    var deleteid = req.body.deleteid
    let sql = 'DELETE FROM ordersdb WHERE ItemID = ?'
    let query = mysqlConnection.query(sql,[ deleteid], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully deleted a value')
      res.redirect('/orders')

      }
      else
      console.log(err);
    });
  })

  //Delete Category
  app.post('/deletecategory', checkAuthenticated,(req,res) => {
    console.log('deletecategory called')
    var deleteid = req.body.deleteid
    let sql = 'DELETE FROM categorydb WHERE Category = ?'
    let query = mysqlConnection.query(sql,[ deleteid], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully deleted a category')
      res.redirect('/categories')

      }
      else
      console.log(err);
    });
  })

  //Delete Brand
  app.post('/deletebrand', checkAuthenticated,(req,res) => {
    console.log('deletebrand called')
    var deleteid = req.body.deleteid
    let sql = 'DELETE FROM branddb WHERE Brand = ?'
    let query = mysqlConnection.query(sql,[ deleteid], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully deleted a brand')
    res.redirect('/brands?deleted=true')
      }
      else
      console.log(err);
    });
  })

  //Delete Size
app.post('/deletesize', checkAuthenticated, (req, res) => {
  console.log('deletesize called');
  var deleteid = req.body.deleteid;
  let sql = 'DELETE FROM sizedb WHERE Size = ?';

  mysqlConnection.query(sql, [deleteid], (err, rows, fields) => {
    if(!err) {
      console.log('Successfully deleted size:', deleteid);
      // Using 302 redirect to ensure query parameters are preserved
      res.status(302).redirect('/sizes?deleted=true');
    } else {
      console.log('Error deleting size:', err);
      res.status(302).redirect('/sizes?error=true');
    }
    });
  })

  //Delete Stock
  app.post('/deletestock', checkAuthenticated,(req,res) => {
    console.log('deleteitem called')
    var deleteid = req.body.deleteid
    let sql = 'DELETE FROM stockdb WHERE ItemID = ?'
    let query = mysqlConnection.query(sql,[ deleteid], (err, rows, fields)=>{
      if(!err)
      {
      console.log('Successfully deleted a value')
      res.redirect('/viewstocks')

      }
      else
      console.log(err);
    });
  })

// Chatbot route
app.get('/chatbot', checkAuthenticated, (req, res) => {
  res.render('chatbot');
});

// Test Gemini API route
app.get('/test-gemini', checkAuthenticated, async (req, res) => {
  const axios = require('axios');
  try {
    // Use a very simple request to test API connectivity
    const response = await axios({
      method: 'post',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      params: {
        key: process.env.GEMINI_API_KEY.trim()
      },
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        contents: [
          {
            parts: [
              { text: "Respond with just one word: Hello" }
            ]
          }
        ]
      }
    });

    res.json({
      status: 'success',
      apiResponse: response.data
    });
  } catch (error) {
    console.error('Gemini API Test Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// List available Gemini models
app.get('/list-models', checkAuthenticated, async (req, res) => {
  const axios = require('axios');
  try {
    const response = await axios({
      method: 'get',
      url: 'https://generativelanguage.googleapis.com/v1beta/models',
      params: {
        key: process.env.GEMINI_API_KEY.trim()
      }
    });

    res.json({
      status: 'success',
      models: response.data
    });
  } catch (error) {
    console.error('Gemini List Models Error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      details: error.response ? error.response.data : null
    });
  }
});

// Start the server
app.listen(port, () => console.log(`Express Server is running at port ${port}`));
