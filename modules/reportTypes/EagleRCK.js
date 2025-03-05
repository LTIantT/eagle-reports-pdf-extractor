import { EagleReport } from './EagleReport.js';

export default class EagleRCK extends EagleReport {
  constructor(idStringsObject) {
    super();
    let { originalPreliminary, firstPage } = idStringsObject;
    this.ogPrelimIdString = originalPreliminary;
    this.firstPageIdString = firstPage;
  }

  getImportantPages(pdfData) {
    // Return all pages
    let pages =  Array.from(Array(pdfData.Pages.length).keys());

    // Remove the first page if it is a preliminary page
    if (this.isFirstPageOriginalPreliminary(pdfData)) {
      pages.shift();
    }

    // This report has a blank page at the end (maybe)
    let lastPage = pages[pages.length - 1];
    let lastPageText = this.getPageText(pdfData, lastPage);
    if (lastPageText === '') {
      pages.pop();
    }

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

    // Search for the original preliminary string if this page is an original preliminary page
    if (this.isFirstPageOriginalPreliminary(pdfData)) {
      const found = firstPageText.includes(this.ogPrelimIdString);
      if (found) {
        console.log(`String ${this.ogPrelimIdString} found on the first page of RCK!`);
        return true;
      } else {
        console.log(`String ${this.ogPrelimIdString} NOT found on the first page of RCK!`);
        return false;
      }
    }

    const found = firstPageText.includes(this.firstPageIdString);
    
    if (found) {
      console.log(`String ${this.firstPageIdString} found on the first page of RCK!`);
      return true;
    } else {
        console.log(`String ${this.firstPageIdString} NOT found on the first page of RCK!`);
        return false;
    }
  }
}