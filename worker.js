import MicrosoftGraph from "./modules/MicrosoftGraph";
import EaglePDFParse  from "./modules/EaglePDFParser";

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      for (const STORE_CODE of (env.SHAREPOINT_STORE_FOLDER_NAMES).split(',')) {
        console.log(STORE_CODE);

        // Folder path in format STORE_CODE/Daily Reports/yyyy-mm-dd
        // Adjust date from server time (UTC) to Pacific Time and subtract 1 day
        const reportDate = `${new Date(new Date().getTime() - (32 * 60 * 60 * 1000)).toISOString().split('T')[0]}`;
        const folderPath = `${STORE_CODE}/Daily Reports/${reportDate}`;
    
        try {
            let microsoftGraph = new MicrosoftGraph(env, folderPath);
            let files = await microsoftGraph.listFiles('Raw Files');
            let importantPrintables = [];
            let reportableDatas = {};
            for (let file of files.value) {
                if (file.folder) {
                    continue;
                }

                let fileContent = await microsoftGraph.downloadFile(file);
                let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
                const { importantPages, reportType, reportableData } = await eaglePDFParse.parseBuffer(Buffer.from(fileContent));
                if (!importantPages || importantPages.length === 0) {
                    console.error('No important pages found in the PDF.');
                    continue;
                }

                const pdfData = await eaglePDFParse.extractPages(Buffer.from(fileContent), importantPages);
                const filename = `${reportType.replace('Eagle', '')}_${reportDate.replaceAll('-','')}_${generateShortId()}.pdf`;

                // Upload the whole file to the 'Tagged Documents' folder
                await microsoftGraph.uploadFile(filename, 'Tagged Documents', fileContent);

                // Add the important pages to the list
                importantPrintables.push(pdfData);

                // If reportable data is present in the file, push that to the reportableDatas object
                if (reportableData) {
                  reportableDatas[filename] = reportableData;
                }
            }

            // Create a new PDF with only the important pages
            let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
            await microsoftGraph.uploadFile('ImportantPrintables.pdf', '', await eaglePDFParse.mergePDFs(importantPrintables));

            // Create a JSON file with the reportable data
            await microsoftGraph.uploadFile('ReportableData.json.txt', '', Buffer.from(JSON.stringify(reportableDatas, null, 2)));
        } catch (error) {
            console.error('Unexpected error:', error);
            process.exit(1);
        }
      }
    })());
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const performRerun = url.searchParams.get("performRerun");
    const dateas = url.searchParams.get("dateas");
    const storeCode = url.searchParams.get("storeCode");

    // If we have the "?performRerun=true&dateas=yyyy-mm-dd" parameters, do something special:
    if (performRerun === "true" && dateas && storeCode) {
        ctx.waitUntil((async () => {
            //Validate dateas format should be yyyy-mm-dd
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateas)) {
                console.error('Invalid date format.');
                return new Response('Invalid date format.', { status: 400 });
            }

            for (const STORE_CODE of (env.SHAREPOINT_STORE_FOLDER_NAMES).split(',')) {
                if (STORE_CODE !== storeCode) {
                    continue;
                }
        
                // Folder path in format STORE_CODE/Daily Reports/yyyy-mm-dd
                // Adjust date from server time (UTC) to Pacific Time and subtract 1 day
                const reportDate = dateas;
                const folderPath = `${STORE_CODE}/Daily Reports/${reportDate}`;
            
                try {
                    let microsoftGraph = new MicrosoftGraph(env, folderPath);
                    let files = await microsoftGraph.listFiles('Raw Files');
                    let importantPrintables = [];
                    let reportableDatas = {};
                    for (let file of files.value) {
                        if (file.folder) {
                            continue;
                        }
        
                        let fileContent = await microsoftGraph.downloadFile(file);
                        let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
                        try {
                            const { importantPages, reportType, reportableData } = await eaglePDFParse.parseBuffer(Buffer.from(fileContent));
                        
                            if (!importantPages || importantPages.length === 0) {
                                console.error('No important pages found in the PDF.');
                                continue;
                            }
            
                            const pdfData = await eaglePDFParse.extractPages(Buffer.from(fileContent), importantPages);
                            const filename = `${reportType.replace('Eagle', '')}_${reportDate.replaceAll('-','')}_${generateShortId()}.pdf`;
            
                            // Upload the whole file to the 'Tagged Documents' folder
                            await microsoftGraph.uploadFile(filename, 'Tagged Documents', fileContent);
            
                            // Add the important pages to the list
                            importantPrintables.push(pdfData);
                            reportableDatas[filename] = reportableData;
                        } catch (error) {
                            console.error('Error parsing PDF:', error);
                            continue;
                        }
                    }
        
                    // Create a new PDF with only the important pages
                    let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
                    await microsoftGraph.uploadFile('ImportantPrintables.pdf', '', await eaglePDFParse.mergePDFs(importantPrintables));
        
                    // Create a JSON file with the reportable data
                    await microsoftGraph.uploadFile('ReportableData.json', '', Buffer.from(JSON.stringify(reportableDatas, null, 2)));
                } catch (error) {
                    console.error('Unexpected error:', error);
                    process.exit(1);
                }
            }
        })());

      return new Response(`Rerun triggered for date: ${dateas}`, {
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Otherwise, return a simple HTML page with embedded CSS and JS
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <title>Rerun Page</title>
    <style>
      body {
        font-family: sans-serif;
        padding: 2em;
        max-width: 600px;
        margin: 0 auto;
      }
      label, button {
        display: inline-block;
        margin-top: 1em;
      }
      input[type="date"] {
        margin-left: 1em;
      }
        input[type="text"] {
        margin-left: 1em;
      }
      .notice {
        margin-top: 2em;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <h1>Trigger Rerun</h1>
    <label for="dateInput">Choose Date:</label>
    <input type="date" id="dateInput"/>
    <input type="text" id="storeCodeInput" placeholder="Store Code (Subfolder)"/>

    <button onclick="triggerRerun()">Perform Rerun</button>

    <div class="notice">
      <p>Select a date and click the button to rerun for that date.</p>
    </div>

    <script>
      async function triggerRerun() {
        const dateVal = document.getElementById("dateInput").value;
        const storeCode = document.getElementById("storeCodeInput").value;
        if (!dateVal || !storeCode) {
          alert("Please select a date first.");
          return;
        }
        // Send a GET request with the required parameters
        const response = await fetch(\`/?performRerun=true&dateas=\${dateVal}\&storeCode=\${storeCode}\`);
        const text = await response.text();
        alert(text);
      }
    </script>
  </body>
</html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
}

function generateShortId() {
    return Math.random().toString(36).substring(2, 6);
}
