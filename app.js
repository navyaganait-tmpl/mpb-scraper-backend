const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
 
const app = express();
const PORT = 4000;
 
app.use(express.json());
app.use(cors());
 
const BASE_URL = "http://tunica.zapto.org:11439"; // Replace with your base URL
 
async function scrapeSingleUrl(url) {
  console.log("HJEHEH");
    try {
      const response = await axios.get(url);
      const html = response.data;
 
      // Use cheerio to load the HTML content
      const $ = cheerio.load(html);
 
      // Extract text from the main content
      const mainContentText = $("article").text();
 
      // Define chunk size as needed
      const chunkSize = 3000;
 
      // Split main content text into chunks
      const contentChunks = chunkText(mainContentText, chunkSize);
 
      let extractedData = ""; // Initialize extracted data as an empty string
 
      for (const chunk of contentChunks) {
        console.log(chunk);
 
        const HTML_PROCESSING_PROMPT = `
        **Input HTML:** ${chunk}
  **Task:** extract only content from the given html
  **Additional Instructions:**
      * Do not include any tags  in the output you generate
      * Remove svg tags from the output
      * Do not include any react tags in the output
      * Do not provide any information about any tags
      * Do not provide me with a script or a code but the information I need
      * If a detail is missing, return null.
      * Do not generate data of your own and send it in the output generated
  **Task:** convert the extracted data into table format
  **Format:** Table Format for md
              `;
 
        // Send text content chunk and Mistral instructions for processing
        const mistralResponse = await axios.post(`${BASE_URL}/api/generate`, {
          model: "mistral:7b-instruct-v0.2-q8_0",
          prompt: HTML_PROCESSING_PROMPT,
          stream: false,
        });
 
        // Extract the processed data from the Mistral response
        const processedData = mistralResponse.data;
        extractedData += processedData.response; // Append processed data from this chunk
      }
 
      console.log("Extracted data:", extractedData);
      return extractedData // Parse extracted data as JSON
    } catch (error) {
      console.error("Error occurred while scraping and processing data:", error);
    }
  }
 
 
function chunkText(text, size) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.substr(i, size));
  }
  return chunks;
}

 
// Endpoint to scrape a URL
app.post("/scrape", async (req, res) => {
  try {
    console.log("herre");
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }
 
    const extractedData=await scrapeSingleUrl(url);
 
 
    res.json(extractedData);
  } catch (error) {
    console.error("Error occurred while scraping data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
 
app.get('/',async (req, res) =>{
    console.log("Hello world");
    res.send("Hello World")
})
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});