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
                let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS, env.REPORTABLE_DATA_LOCATORS);
                const { importantPages, reportType, reportableData } = await eaglePDFParse.parseBuffer(Buffer.from(fileContent));
                if (!importantPages || importantPages.length === 0) {
                    console.log('No important pages found in the PDF.');
                } else {
                  const pdfData = await eaglePDFParse.extractPages(Buffer.from(fileContent), importantPages);
                  
                  // Add the important pages to the list
                  importantPrintables.push(pdfData);
                }

                const filename = `${reportType.replace('Eagle', '')}_${reportDate.replaceAll('-','')}_${generateShortId()}.pdf`;

                // Upload the whole file to the 'Tagged Documents' folder
                await microsoftGraph.uploadFile(filename, 'Tagged Documents', fileContent);

                // If reportable data is present in the file, push that to the reportableDatas object
                if (reportableData) {
                  reportableDatas[filename] = reportableData;
                }
            }

            // Create a new PDF with only the important pages
            let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
            let mergedPDF = await eaglePDFParse.mergePDFs(importantPrintables);
            await microsoftGraph.uploadFile('ImportantPrintables.pdf', '', mergedPDF);

            // Upload a copy of the merged PDF to the R2 for debugging purposes
            await env.R2.put(`${folderPath}/ImportantPrintables.pdf`, mergedPDF);

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

    // If the request is for the /R2/* endpoint, return the file from R2:
    if (url.pathname.startsWith('/R2/')) {
        const filePath = decodeURI(url.pathname.replace('/R2/', ''));
        console.log(`Fetching file from R2: ${filePath}`);
        const file = await env.R2.get(filePath);
        if (!file) {
            return new Response('File not found.', { status: 404 });
        }
        return new Response(file.body, {
            headers: { "Content-Type": file.httpMetadata.contentType },
        });
    }

    // If we have only the ?dateas and ?storeCode parameters return an R2 URL for a file (if it exists):
    if (dateas && storeCode && !performRerun) {
        const folderPath = `${storeCode}/Daily Reports/${dateas}`;
        const fileName = 'ImportantPrintables.pdf';
        const file = await env.R2.head(`${folderPath}/${fileName}`);
        if (!file) {
            return new Response(JSON.stringify({'message': 'File not found.'}), { status: 404 });
        }

        // Return file object as JSON if exists:
        return new Response(JSON.stringify(file), {
            headers: { "Content-Type": "application/json" },
        });
    }

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
                    console.log(`Skipping store code: ${STORE_CODE} as it does not match the provided store code: ${storeCode}`);
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
                      let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS, env.REPORTABLE_DATA_LOCATORS);
                      const { importantPages, reportType, reportableData } = await eaglePDFParse.parseBuffer(Buffer.from(fileContent));
                      if (!importantPages || importantPages.length === 0) {
                          console.log('No important pages found in the PDF.');
                      } else {
                        const pdfData = await eaglePDFParse.extractPages(Buffer.from(fileContent), importantPages);
                        
                        // Add the important pages to the list
                        importantPrintables.push(pdfData);
                      }
      
                      const filename = `${reportType.replace('Eagle', '')}_${reportDate.replaceAll('-','')}_${generateShortId()}.pdf`;
      
                      // Upload the whole file to the 'Tagged Documents' folder
                      await microsoftGraph.uploadFile(filename, 'Tagged Documents', fileContent);
      
                      // If reportable data is present in the file, push that to the reportableDatas object
                      if (reportableData) {
                        reportableDatas[filename] = reportableData;
                      }
                    }
        
                    // Create a new PDF with only the important pages
                    let eaglePDFParse = new EaglePDFParse(env.ID_STRINGS);
                    let mergedPDF = await eaglePDFParse.mergePDFs(importantPrintables);
                    await microsoftGraph.uploadFile('ImportantPrintables.pdf', '', mergedPDF);

                    // Upload a copy of the merged PDF to the R2 for debugging purposes
                    await env.R2.put(`${folderPath}/ImportantPrintables.pdf`, mergedPDF);
        
                    // Create a JSON file with the reportable data
                    await microsoftGraph.uploadFile('ReportableData.json.txt', '', Buffer.from(JSON.stringify(reportableDatas, null, 2)));
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

    // Otherwise, return a static files
    return await env.ASSETS.fetch(request);
  },
}

function generateShortId() {
    return Math.random().toString(36).substring(2, 6);
}
