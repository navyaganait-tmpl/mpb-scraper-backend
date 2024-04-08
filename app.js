const axios = require("axios");

const BASE_URL = "http://192.168.1.48:11439"; // Replace with your base URL

async function scrapeSingleUrl(url, outputFilename, mistralInstructions) {
  try {
    const response = await axios.get(url);
    const html = response.data;

    // Extract the main tag content
    const mainContent = extractMainContent(html);

    // Define chunk size as needed
    const chunkSize = 1000;

    // Split main content into chunks
    const contentChunks = chunkHtml(mainContent, chunkSize);

    let extractedDataArray = []; // Array to store extracted data from each chunk

    for (const chunk of contentChunks) {
      console.log(chunk);

      const HTML_PROCESSING_PROMPT = `
            **Input HTML:** ${chunk}
**Task:** extract only content from the given html
**Additional Instructions:**
* Do not provide me with a script or a code but the information I need
 *Do not include any div in the output generated
    * Do not include any tags in the output you generate
    * Do not provide any information about any tags
    * Do not generate data of your own 
**Format:** JSON Format`;

      // Send HTML content chunk and Mistral instructions for processing
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
    const contentChunks2 = chunkHtml(JSON.stringify(extractedDataArray), 500);

    // Send the accumulated extracted data back to Mistral in table format

    let extractedDataArray1 = []; // Array to store extracted data from each chunk

    for (const chunk of contentChunks2) {
      console.log(chunk);
      const tableFormatPrompt = `
        **Data:** ${chunk}
**Task:** convert the extracted data into a table format
**Format:** Table Format`;

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

    // Now you can send the table format response to your API or do further processing
  } catch (error) {
    console.error("Error occurred while scraping and processing data:", error);
  }
}

function chunkHtml(html, size) {
  const chunks = [];
  for (let i = 0; i < html.length; i += size) {
    chunks.push(html.substr(i, size));
  }
  return chunks;
}

function extractMainContent(html) {
  // You can use libraries like cheerio for easier DOM manipulation in Node.js
  // For simplicity, we'll use a basic approach to extract the main tag content
  const startTag = "<article";
  const endTag = "</article>";

  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag, startIndex);

  let mainContent;
  if (startIndex !== -1 && endIndex !== -1) {
    mainContent = html.substring(startIndex, endIndex + endTag.length);
  } else {
    // If main tag is not found, return the entire body content
    mainContent = html;
  }

  // Remove <svg> elements from the main content
  mainContent = mainContent.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  mainContent = mainContent.replace(/<img[\s\S]*?>/gi, "");

  return mainContent;
}

// Example usage
const url = "https://www.allrecipes.com/recipe/81108/classic-macaroni-salad/";
const outputFilename = "output.json";

scrapeSingleUrl(url, outputFilename);
