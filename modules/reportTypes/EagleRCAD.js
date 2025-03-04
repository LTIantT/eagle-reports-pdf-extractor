import { EagleReport } from './EagleReport.js';

export default class EagleRCAD extends EagleReport {
  constructor(idString) {
    super();
    this.idString = idString;
  }

  getImportantPages(pdfData) {
    // Return all pages
    let pages = Array.from(Array(pdfData.Pages.length).keys());

    // Set the preliminary page flag if '**ORIGINAL**' is found on first page
    let preliminaryPage = this.isFirstPageOriginalPreliminary(pdfData);
    if (preliminaryPage) {
      pages.shift();
    }
  
    // Remove the first page
    pages.shift();
    return pages;
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
      console.log(`String ${this.idString} found on the first page of RCAD!`);
      return true;
    } else {
        console.log(`String ${this.idString} NOT found on the first page of RCAD!`);
        return false;
    }
  }
}