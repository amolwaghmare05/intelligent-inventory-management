/**
 * AI Chatbot Module
 * This module provides a chatbot API that can answer questions about inventory data
 * using the Gemini API and direct database queries.
 */

const axios = require("axios");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Database schema representation for the AI
const DATABASE_SCHEMA = `
Table: stockdb
Columns:
- ItemNo (INT): Unique identifier for each item
- ItemName (VARCHAR): Name of the item
- Size (VARCHAR): Size of the item (S, M, L, XL, etc.)
- Brand (VARCHAR): Brand name of the item
- Category (VARCHAR): Category of the item (Shirt, T-Shirt, Jeans, Capri, Trouser, etc.)
- Price (DECIMAL): Selling price of the item
- Quantity (INT): Available quantity in stock

Table: orderdb
Columns:
- OrderNo (INT): Unique identifier for each order
- OrderDate (DATE): Date when the order was placed
- CustName (VARCHAR): Customer name
- CustPhone (VARCHAR): Customer phone number
- CustEmail (VARCHAR): Customer email address
- TotalAmount (DECIMAL): Total amount of the order

Table: orderitemsdb
Columns:
- OrderItemID (INT): Unique identifier for each order item
- OrderNo (INT): Foreign key referencing orderdb.OrderNo
- ItemNo (INT): Foreign key referencing stockdb.ItemNo
- Quantity (INT): Quantity of items ordered
- Price (DECIMAL): Price of the item at the time of order
`;

// Function to generate SQL from natural language using AI
async function generateSQLFromQuestion(question) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
You are an expert SQL query generator for an inventory management system.
Given the following database schema:

${DATABASE_SCHEMA}

Generate a valid MySQL query to answer this question: "${question}"

Reply ONLY with the SQL query and nothing else. Don't include any explanations or markdown formatting.
If you cannot generate a SQL query for this question, respond with "NO_SQL_POSSIBLE".
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    if (response.includes("NO_SQL_POSSIBLE") || response.includes("```")) {
      return null;
    }

    // Clean up any potential markdown or extra formatting
    return response.replace(/```sql/g, '').replace(/```/g, '').trim();
  } catch (error) {
    console.error("Error generating SQL:", error);
    return null;
  }
}

// Function to validate and sanitize SQL query
function validateSQLQuery(sql) {
  // Basic validation to prevent harmful queries
  const disallowedPatterns = [
    /DROP\s+/i,
    /DELETE\s+/i,
    /UPDATE\s+/i,
    /INSERT\s+/i,
    /ALTER\s+/i,
    /CREATE\s+/i,
    /TRUNCATE\s+/i,
    /GRANT\s+/i,
    /REVOKE\s+/i
  ];

  // Only allow SELECT statements for safety
  if (!sql.trim().toUpperCase().startsWith('SELECT')) {
    return null;
  }

  // Check for disallowed patterns
  for (const pattern of disallowedPatterns) {
    if (pattern.test(sql)) {
      return null;
    }
  }

  return sql;
}

// Process messages and determine if they are SQL-related or require AI
async function processMessage(message, connection) {
  // First, try to generate SQL using AI
  const generatedSQL = await generateSQLFromQuestion(message);
  const validatedSQL = generatedSQL ? validateSQLQuery(generatedSQL) : null;

  if (validatedSQL) {
    try {
      // Execute the AI-generated SQL query
      const [results] = await connection.promise().query(validatedSQL);

      // Format results using AI
      return formatResponseWithAI(results, message, validatedSQL);
    } catch (error) {
      console.error("Error executing AI-generated SQL:", error);
      // If AI-generated SQL fails, fall back to pattern matching
    }
  }

  // Fall back to existing pattern matching logic if AI SQL generation fails
  const query = analyzeQuestion(message);

  if (query) {
    try {
      const [results] = await connection.promise().query(query.sql, query.params || []);

      if (results.length > 0) {
        if (query.type === 'stock') {
          let formattedItems = formatStockItems(results);
          return { reply: formattedItems, source: "database" };
        } else if (query.type === 'category') {
          let formattedCategoryItems = formatCategoryItems(results, query.params[0]);
          return { reply: formattedCategoryItems, source: "database" };
        }
        // Handle other query types...
        return { reply: `Found ${results.length} results: ${JSON.stringify(results)}`, source: "database" };
      } else {
        return { reply: "I couldn't find any data matching your query.", source: "database" };
      }
    } catch (error) {
      console.error("Error executing query:", error);
      return { reply: "Sorry, I encountered an error when trying to retrieve that information.", source: "database" };
    }
  }

  // If no SQL pattern matched, use AI for general response
  return sendToAI(message);
}

// Enhanced function to format response using AI
async function formatResponseWithAI(results, originalQuestion, sqlQuery) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // No results
  if (!results || results.length === 0) {
    return { reply: "I couldn't find any data matching your query.", source: "database" };
  }

  // Format the results as JSON for the AI to interpret
  const formattedResults = JSON.stringify(results, null, 2);

  const prompt = `
You are an inventory management assistant. A user asked: "${originalQuestion}"

I executed this SQL query to find the answer:
${sqlQuery}

Here are the results:
${formattedResults}

Please provide a natural, helpful response that answers the original question based on these results.
Format any tabular data neatly. Be concise but complete.
`;

  try {
    const result = await model.generateContent(prompt);
    return {
      reply: result.response.text(),
      source: "ai-database",
      results: results  // Include the raw results for frontend formatting if needed
    };
  } catch (error) {
    console.error("Error formatting response with AI:", error);
    // Fallback to simple formatting if AI fails
    return {
      reply: `Here are the results: ${JSON.stringify(results)}`,
      source: "database",
      results: results
    };
  }
}

/**
 * Initialize the chatbot module
 * @param {Object} app - Express application
 * @param {Object} connection - MySQL connection
 */
function initChatbot(app, connection) {
  console.log('Initializing AI Chatbot...');

  // Check if GEMINI_API_KEY is defined
  if (!process.env.GEMINI_API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined in environment variables');
    throw new Error('GEMINI_API_KEY is required');
  }

  // Clean up the API key (remove any whitespace)
  const apiKey = process.env.GEMINI_API_KEY.trim();

  // Log API key length for verification (don't log the actual key)
  console.log(`GEMINI_API_KEY is set (length: ${apiKey.length})`);

  // Verify database connection
  if (!connection || typeof connection.promise !== 'function') {
    console.error('Error: Invalid database connection object passed to chatbot');
    throw new Error('Valid database connection is required');
  }

  console.log('Database connection verified');

  // Verify required tables exist
  async function verifyDatabaseSchema() {
    try {
      console.log('Verifying database schema...');

      // Check stockdb table
      const [stockTablesRows] = await connection.promise().query(
        "SHOW TABLES LIKE 'stockdb'"
      );
      const stockTableExists = stockTablesRows.length > 0;
      console.log('stockdb table exists:', stockTableExists);

      // Check ordersdb table
      const [ordersTablesRows] = await connection.promise().query(
        "SHOW TABLES LIKE 'ordersdb'"
      );
      const ordersTableExists = ordersTablesRows.length > 0;
      console.log('ordersdb table exists:', ordersTableExists);

      if (!stockTableExists || !ordersTableExists) {
        console.error('Required tables missing:', {
          stockTableExists,
          ordersTableExists
        });
        return false;
      }

      // Check stockdb structure
      if (stockTableExists) {
        const [stockColumns] = await connection.promise().query(
          "SHOW COLUMNS FROM stockdb"
        );
        const stockColumnNames = stockColumns.map(col => col.Field);
        console.log('stockdb columns:', stockColumnNames);

        if (!stockColumnNames.includes('ItemName') || !stockColumnNames.includes('Amount')) {
          console.error('stockdb is missing required columns');
          return false;
        }
      }

      // Check ordersdb structure
      if (ordersTableExists) {
        const [ordersColumns] = await connection.promise().query(
          "SHOW COLUMNS FROM ordersdb"
        );
        const ordersColumnNames = ordersColumns.map(col => col.Field);
        console.log('ordersdb columns:', ordersColumnNames);

        if (!ordersColumnNames.includes('ItemName')) {
          console.error('ordersdb is missing required columns');
          return false;
        }
      }

      console.log('Database schema validation completed successfully');
      return true;
    } catch (error) {
      console.error('Error verifying database schema:', error);
      return false;
    }
  }

  // Verify database schema when initializing
  verifyDatabaseSchema().then(isValid => {
    if (!isValid) {
      console.warn('Database schema validation failed - chatbot may not work correctly');
    }
  });

  // Authentication middleware
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Authentication required' });
  }

  // Chatbot API endpoint with authentication
  app.post("/api/chatbot", checkAuthenticated, async (req, res) => {
    const userQuery = req.body.message;

    if (!userQuery) {
      return res.status(400).json({ error: "Message is required" });
    }

    try {
      // First, try to match with database queries
      let sqlQueryInfo = await generateSQLQuery(userQuery);
      let dbData = "";
      let dbQueryExecuted = false;
      let dbResults = null;

      console.log("SQL Query Info:", sqlQueryInfo);

      if (sqlQueryInfo) {
        try {
          console.log("Executing database query:", sqlQueryInfo.query);
          const [rows] = await connection.promise().query(sqlQueryInfo.query);
          console.log(`Query returned ${rows.length} rows:`, rows.slice(0, 3));

          // Store the raw results for use later
          dbResults = rows;
          dbQueryExecuted = true;

          if (rows.length === 0) {
            dbData = "The query was executed but returned no data. Our database doesn't have records matching your query.";
          } else {
            // Create a structured representation of the data
            dbData = JSON.stringify(rows, null, 2);
          }
        } catch (dbError) {
          console.error("Database query error:", dbError);
          dbData = `Error querying the database: ${dbError.message}`;
        }
      } else {
        dbData = "No direct database match found for your query.";
      }

      // Now, prepare the prompt for Gemini based on DB results
      const promptText = prepareGeminiPrompt(userQuery, dbData, sqlQueryInfo, dbQueryExecuted, dbResults);
      console.log("Sending prompt to Gemini:", promptText.substring(0, 200) + "...");

      try {
        // Call Gemini API with updated endpoint and request format
        const geminiResponse = await axios({
          method: 'post',
          url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
          params: {
            key: apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          },
          data: {
            contents: [
              {
                parts: [
                  { text: promptText }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.3,  // Lower temperature for more factual responses
              maxOutputTokens: 800
            }
          }
        });

        console.log("Gemini API response status:", geminiResponse.status);

        // Parse the response
        let aiResponse = "";

        if (geminiResponse.data &&
            geminiResponse.data.candidates &&
            geminiResponse.data.candidates[0]) {
          const candidate = geminiResponse.data.candidates[0];

          if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
            aiResponse = candidate.content.parts[0].text;
          } else if (candidate.text) {
            aiResponse = candidate.text;
          } else if (candidate.output) {
            aiResponse = candidate.output;
          } else {
            aiResponse = JSON.stringify(candidate);
          }
        } else {
          throw new Error("Invalid response format from Gemini API");
        }

        // If we have database results but Gemini couldn't provide a good answer,
        // fall back to a direct formatted response
        if (dbQueryExecuted && dbResults && dbResults.length > 0 &&
            (aiResponse.includes("I don't have access") ||
             aiResponse.includes("I cannot access") ||
             aiResponse.includes("I need access"))) {

          console.log("Falling back to direct database response");
          aiResponse = formatDatabaseResponse(sqlQueryInfo, dbResults);
        }

        res.json({
          reply: aiResponse,
          source: sqlQueryInfo ? 'database+ai' : 'ai'
        });
      } catch (apiError) {
        console.error("Gemini API Error:", apiError.message);

        // If API call fails but we have database results, return those directly
        if (dbQueryExecuted && dbResults) {
          const directResponse = formatDatabaseResponse(sqlQueryInfo, dbResults);
          return res.json({
            reply: directResponse,
            source: 'database_fallback'
          });
        }

        let errorMessage = "Error communicating with AI service";
        if (apiError.response && apiError.response.data && apiError.response.data.error) {
          errorMessage = `API Error: ${apiError.response.data.error.message || apiError.response.data.error}`;
        }

        res.status(500).json({
          error: errorMessage,
          details: apiError.message
        });
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({
        error: "Something went wrong with the chatbot",
        details: error.message
      });
    }
  });

  // Helper function to prepare a good prompt for Gemini
  function prepareGeminiPrompt(userQuery, dbData, sqlQueryInfo, dbQueryExecuted, dbResults) {
    let prompt = `You are an intelligent inventory assistant for a retail business.
You have access to warehouse data and can answer questions about inventory, sales, and stock levels.

USER QUERY: "${userQuery}"

`;

    if (dbQueryExecuted) {
      prompt += `I've queried our database based on this question. `;

      if (sqlQueryInfo) {
        prompt += `Here's what I found using this SQL query: ${sqlQueryInfo.query}\n\n`;

        if (dbResults && dbResults.length > 0) {
          // Format the results based on query type
          prompt += "DATABASE RESULTS:\n";

          switch(sqlQueryInfo.type) {
            case 'specific_category':
              prompt += `Items in category "${sqlQueryInfo.categoryName}":\n`;
              dbResults.forEach(item => {
                prompt += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
              });
              break;
            case 'stock':
              prompt += "Current stock levels:\n";
              dbResults.forEach(item => {
                prompt += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
              });
              break;
            case 'specific_stock':
              prompt += `Stock information for "${sqlQueryInfo.itemName}":\n`;
              dbResults.forEach(item => {
                prompt += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
              });
              break;
            case 'low_stock':
              prompt += "Items with low stock levels (less than 10 units):\n";
              dbResults.forEach(item => {
                prompt += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
              });
              break;
            case 'sales':
              prompt += "Top selling items:\n";
              dbResults.forEach((item, index) => {
                prompt += `${index + 1}. ${item.ItemName}: ${item.total_sold} units sold\n`;
              });
              break;
            case 'brand_sales':
              prompt += "Sales performance by brand:\n";
              dbResults.forEach(item => {
                prompt += `- ${item.Brand}: ${item.total_sold} units sold, Revenue: $${parseFloat(item.revenue || 0).toFixed(2)}\n`;
              });
              break;
            case 'category_sales':
              prompt += "Sales performance by category:\n";
              dbResults.forEach(item => {
                prompt += `- ${item.Category}: ${item.total_sold} units sold, Revenue: $${parseFloat(item.revenue || 0).toFixed(2)}\n`;
              });
              break;
            case 'revenue':
              prompt += `Total revenue: $${parseFloat(dbResults[0].total_revenue || 0).toFixed(2)}\n`;
              break;
            default:
              // Generic formatting for other types of queries
              prompt += JSON.stringify(dbResults, null, 2) + "\n";
          }
        } else {
          prompt += "The query returned no results.\n";
        }
      } else {
        prompt += "I couldn't determine a specific database query for this question.\n";
      }
    } else {
      prompt += "I don't have specific database results for this query.\n";
    }

    prompt += `\nBased on the database information above, please provide a helpful, concise response to the user's question.
Always use ONLY the data provided above to answer.
If the data contains the answer, provide it clearly and directly.
If the data doesn't contain the answer, explain what information would be needed.
NEVER say you don't have access to the data - you have the results above.
NEVER make up information not contained in the results.
`;

    return prompt;
  }

  // Helper function to format database responses when Gemini fails
  function formatDatabaseResponse(sqlQueryInfo, dbResults) {
    if (!sqlQueryInfo || !dbResults || dbResults.length === 0) {
      return "I couldn't find any relevant data in our database for your query.";
    }

    let response = "";

    switch(sqlQueryInfo.type) {
      case 'specific_category':
        if (dbResults.length === 0) {
          response = `I couldn't find any items in the category "${sqlQueryInfo.categoryName}".`;
        } else {
          response = `Here are the items in the "${sqlQueryInfo.categoryName}" category:\n\n`;
          dbResults.forEach(item => {
            response += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
          });
        }
        break;
      case 'stock':
        response = "Here are the items in our inventory with their quantities:\n\n";
        dbResults.forEach(item => {
          response += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
        });
        break;
      case 'specific_stock':
        response = `I found information about "${sqlQueryInfo.itemName}" in our inventory:\n\n`;
        dbResults.forEach(item => {
          response += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
        });
        break;
      case 'low_stock':
        response = "Here are items with low stock levels (less than 10 units):\n\n";
        dbResults.forEach(item => {
          response += `- ${item.ItemName} (${item.Brand}, ${item.Size}): ${item.Quantity} units in stock, Price: $${item.Amount}\n`;
        });
        break;
      case 'sales':
        response = "Here are our top selling items:\n\n";
        dbResults.forEach((item, index) => {
          response += `${index + 1}. ${item.ItemName}: ${item.total_sold} units sold\n`;
        });
        break;
      case 'brand_sales':
        response = "Here's our sales performance by brand:\n\n";
        dbResults.forEach(item => {
          response += `- ${item.Brand}: ${item.total_sold} units sold, Revenue: $${parseFloat(item.revenue || 0).toFixed(2)}\n`;
        });
        break;
      case 'category_sales':
        response = "Here's our sales performance by category:\n\n";
        dbResults.forEach(item => {
          response += `- ${item.Category}: ${item.total_sold} units sold, Revenue: $${parseFloat(item.revenue || 0).toFixed(2)}\n`;
        });
        break;
      case 'revenue':
        response = `Our total revenue is: $${parseFloat(dbResults[0].total_revenue || 0).toFixed(2)}`;
        break;
      default:
        response = "Here are the results from our database:\n\n" + JSON.stringify(dbResults, null, 2);
    }

    return response;
  }

  // Direct database query endpoint - bypass Gemini completely
  app.post("/api/db-query", checkAuthenticated, async (req, res) => {
    const { queryType, categoryName } = req.body;

    if (!queryType) {
      return res.status(400).json({ error: "Query type is required" });
    }

    try {
      let query = "";
      let queryDescription = "";

      // Map query types to actual SQL queries
      switch (queryType) {
        case 'category_items':
          if (!categoryName) {
            return res.status(400).json({ error: "Category name is required for category_items query" });
          }
          // Fix SQL injection vulnerability by using parameterized query
          query = "SELECT ItemID, ItemName, Brand, Category, Size, Amount, Quantity FROM stockdb WHERE LOWER(Category) LIKE LOWER(?) ORDER BY ItemName ASC";
          // We'll modify the execution below to use parameters
          queryDescription = `Items in category "${categoryName}"`;
          break;
        case 'stock_levels':
          query = "SELECT ItemID, ItemName, Brand, Category, Size, Amount, Quantity FROM stockdb ORDER BY Quantity DESC";
          queryDescription = "Current stock levels";
          break;
        case 'low_stock':
          query = "SELECT ItemID, ItemName, Brand, Category, Size, Amount, Quantity FROM stockdb WHERE Quantity < 10 ORDER BY Quantity ASC";
          queryDescription = "Items with low stock";
          break;
        case 'top_selling':
          query = "SELECT ItemName, COUNT(*) as total_sold FROM ordersdb GROUP BY ItemName ORDER BY total_sold DESC LIMIT 5";
          queryDescription = "Top selling items";
          break;
        case 'brand_performance':
          query = "SELECT Brand, COUNT(*) as total_sold, SUM(CAST(Amount AS DECIMAL(10,2))) as revenue FROM ordersdb GROUP BY Brand ORDER BY total_sold DESC";
          queryDescription = "Sales performance by brand";
          break;
        case 'category_performance':
          query = "SELECT Category, COUNT(*) as total_sold, SUM(CAST(Amount AS DECIMAL(10,2))) as revenue FROM ordersdb GROUP BY Category ORDER BY total_sold DESC";
          queryDescription = "Sales performance by category";
          break;
        case 'total_revenue':
          query = "SELECT SUM(CAST(Amount AS DECIMAL(10,2))) as total_revenue FROM ordersdb";
          queryDescription = "Total revenue";
          break;
        default:
          return res.status(400).json({ error: "Invalid query type" });
      }

      console.log(`Executing ${queryDescription} query:`, query);

      // Execute the query directly with parameters if needed
      let rows;
      if (queryType === 'category_items') {
        // Use parameterized query for category items to prevent SQL injection
        [rows] = await connection.promise().query(query, [`%${categoryName}%`]);
      } else {
        // For other queries without parameters
        [rows] = await connection.promise().query(query);
      }
      console.log(`Query returned ${rows.length} rows`);

      // Return the raw results
      return res.json({
        success: true,
        queryType,
        description: queryDescription,
        results: rows,
        hasQuantityTracking: true // Flag to indicate quantity tracking is available
      });
    } catch (error) {
      console.error("Database query error:", error);
      return res.status(500).json({
        error: "Database query failed",
        details: error.message,
        sqlState: error.sqlState || null,
        sqlMessage: error.sqlMessage || null
      });
    }
  });

  console.log('AI Chatbot initialized successfully');
}

module.exports = {
  initChatbot
};