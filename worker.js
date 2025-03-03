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
                let eaglePDFParse = new EaglePDFParse(env);
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
            }

            // Create a new PDF with only the important pages
            let eaglePDFParse = new EaglePDFParse(env);
            await microsoftGraph.uploadFile('ImportantPrintables.pdf', '', await eaglePDFParse.mergePDFs(importantPrintables));

            // Create a JSON file with the reportable data
            await microsoftGraph.uploadFile('ReportableData.json', '', Buffer.from(JSON.stringify(reportableDatas, null, 2)));
        } catch (error) {
            console.error('Unexpected error:', error);
            process.exit(1);
        }
      }
    })());

    // Parse the read files
    /**
    const eaglePDFParse = new EaglePDFParse(env);
    */
  }
}

function generateShortId() {
    return Math.random().toString(36).substring(2, 6);
}

async function downloadAndReuploadFile(accessToken, driveId, folderPath) {
  try {
      // Step 1: List files in the folder
      const folderEncoded = encodeURIComponent(folderPath);
      const filesResponse = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folderEncoded}:/children`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!filesResponse.ok) {
          console.error('Error listing files:', await filesResponse.text());
          return;
      }

      const files = await filesResponse.json();
      if (files.value.length === 0) {
          console.log('No files found in the directory.');
          return;
      }

      // Step 2: Pick the first file
      const file = files.value[0]; // Modify as needed
      const fileId = file.id;
      const fileName = file.name;
      console.log(`Downloading file: ${fileName}`);

      // Step 3: Download the file
      const downloadResponse = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!downloadResponse.ok) {
          console.error('Error downloading file:', await downloadResponse.text());
          return;
      }

      const fileBuffer = await downloadResponse.arrayBuffer();
      await fs.writeFile(fileName, Buffer.from(fileBuffer));
      console.log(`File downloaded locally as: ${fileName}`);

      // Step 4: Rename the file with the current date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const newFileName = `${today}_${fileName}`;
      await fs.rename(fileName, newFileName);
      console.log(`File renamed to: ${newFileName}`);

      // Step 5: Reupload the file
      const fileData = await fs.readFile(newFileName);

      const uploadResponse = await fetch(`https://graph.microsoft.com/v1.0/drives/${driveId}/root:/${folderEncoded}/${newFileName}:/content`, {
          method: 'PUT',
          headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/octet-stream'
          },
          body: fileData
      });

      if (!uploadResponse.ok) {
          console.error('Error uploading file:', await uploadResponse.text());
          return;
      }

      console.log(`File reuploaded successfully as: ${newFileName}`);

  } catch (error) {
      console.error('Unexpected error:', error);
  }
}

(async () => {
  env.SHAREPOINT_STORE_FOLDER_NAMES.split(',').forEach(async (STORE_CODE) => {
    // Folder path in format STORE_CODE/Daily Reports/yyyy-mm-dd
    // Adjust date from server time (UTC) to Pacific Time
    const folderPath = `${STORE_CODE}/Daily Reports/${new Date(new Date().getTime() - 8 * 60 * 60 * 1000).toISOString().split('T')[0]}`;

    try {
        const accessToken = await getAccessToken();
        const siteId = await getSiteId(accessToken);
        const driveId = await getDriveId(accessToken, siteId);
        await listFiles(accessToken, driveId);
        await downloadAndReuploadFile(accessToken, driveId, folderPath);
    } catch (error) {
        console.error('Unexpected error:', error);
        process.exit(1);
    }
  });
})();
