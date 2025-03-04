import { EagleReport } from './EagleReport.js';

export default class EagleRDJ extends EagleReport {
  constructor(idString) {
    super();
    this.idString = idString;
  }

  getImportantPages(pdfData) {
    let importantPages = [];

    importantPages.push(this.locatePageByString(pdfData, 'CASH TOTALS FOR STORE'));
    importantPages.push(this.locatePageByString(pdfData, 'TOTALS FOR STORE', importantPages[0] + 1));

    // Push the page number of all pages before the 'TOTALS FOR STORE' page (skip first page at idx = 0)
    let isFirstPageOriginalPreliminary = this.isFirstPageOriginalPreliminary(pdfData) ? 1 : 0;
    let transactionTotalsPage = importantPages[1];
    for (let i = (1  + isFirstPageOriginalPreliminary); i < transactionTotalsPage; i++) {
      importantPages.push(i);
    }

    // Use set to remove duplicates
    importantPages = [...new Set(importantPages)];

    // Remove null values
    importantPages = importantPages.filter(function (el) {
      return el != null;
    });

    return importantPages;
  }

  getReportableData(pdfData) {
    return null;
  }

  id (pdfData) {
    if (!pdfData || !pdfData.Pages || pdfData.Pages.length === 0) {
      console.error('No pages found in the PDF.');
      return null;
    }

    // Extract the first page
    const firstPage = pdfData.Pages[0];

    // Convert page text into a string
    const firstPageText = firstPage.Texts.map(textObj => decodeURIComponent(textObj.R[0].T)).join(' ').replace(/\s+/g, '');

    // Search for the string
    const found = firstPageText.includes(this.idString);
    
    if (found) {
        console.log(`String ${this.idString} found on the first page of RDJ!`);
        return true;
    } else {
        console.log(`String ${this.idString} NOT found on the first page of RDJ!`);
        return false;
    }
  }
}