// Vercel serverless function wrapper for Express app
// This file is used by Vercel to create serverless functions from the Express app
const app = require('../app');

// Export the Express app directly - Vercel will handle it as a serverless function
module.exports = app;
