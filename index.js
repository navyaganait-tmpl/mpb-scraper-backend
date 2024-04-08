const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = 4000;

app.use(express.json());

const BASE_URL = "http://192.168.1.48:11439"; // Replace with your base URL

async function scrapeSingleUrl(url) {
  try {
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to load the HTML content
    const $ = cheerio.load(html);

    // Extract text from the main content
    const mainContentText = $("article").text();

    // Define chunk size as needed
    const chunkSize = 2000;

    // Split main content text into chunks
    const contentChunks = chunkText(mainContentText, chunkSize);

    let extractedDataArray = []; // Array to store extracted data from each chunk

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
**Format:** JSON Format
            `;

      // Send text content chunk and Mistral instructions for processing
      const mistralResponse = await axios.post(`${BASE_URL}/api/generate`, {
        model: "mistral:7b-instruct-v0.2-q8_0",
        prompt: HTML_PROCESSING_PROMPT,
        stream: false,
      });

      // Extract the processed data from the Mistral response
      const extractedData = mistralResponse.data;
      extractedDataArray.push(extractedData.response); // Store extracted data from this chunk
    }

    // Process the extracted data from all chunks
    console.log("All extracted data:", extractedDataArray);

    // Split main content into chunks
    const contentChunks2 = chunkText(JSON.stringify(extractedDataArray), 500);

    let extractedDataArray1 = []; // Array to store extracted data from each chunk

    for (const chunk of contentChunks2) {
      console.log(chunk);
      const tableFormatPrompt = `
      **Input Text:** ${chunk}
      **Task:** convert the extracted data into table format 
      **Format:** TABLE FORMAT
`;

      const mistralTableResponse = await axios.post(
        `${BASE_URL}/api/generate`,
        {
          model: "mistral:7b-instruct-v0.2-q8_0",
          prompt: tableFormatPrompt,
          stream: false,
        }
      );
      const extractedData = mistralTableResponse.data;
      extractedDataArray1.push(extractedData.response);
    }

    console.log("Table format response:", extractedDataArray1);
    return(extractedDataArray1);

    // Now you can send the table format response to your API or do further processing
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
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing URL parameter" });
    }

    const extractedData=await scrapeSingleUrl(url);

//     let data = JSON.stringify(extractedData); // Your provided data
 
// // Remove the trailing "has context menu" string
// data = data.replace(' has context menu', '');
 
// // Split the data by each recipe section
// const sections = data.split('", "');
 
// // Initialize an empty array to store the JSON objects
// let jsonResult = [];
 
// // Loop through each section and convert it to JSON
// sections.forEach(section => {
//     // Replace unnecessary characters from the section
//     section = section.replace(/"|{|}|[\n\r]+/g, '');
 
//     // Split the section by "|"
//     const fields = section.split('|').map(field => field.trim());
 
//     // Extract the keys and values
//     const keys = fields.filter((_, index) => index % 2 === 0);
//     const values = fields.filter((_, index) => index % 2 !== 0);
 
//     // Create JSON object
//     let jsonObject = {};
//     keys.forEach((key, index) => {
//         jsonObject[key] = values[index];
//     });
 
//     // Push JSON object to the result array
//     jsonResult.push(jsonObject);
// });
 
// // Print or use the JSON result
// console.log(JSON.stringify(jsonResult, null, 2));

    res.json(extractedData);
  } catch (error) {
    console.error("Error occurred while scraping data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
