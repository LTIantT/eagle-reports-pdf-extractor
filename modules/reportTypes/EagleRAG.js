import { EagleReport } from './EagleReport.js';

export default class EagleRAG extends EagleReport {
  constructor(idString) {
    super();
    this.idString = idString;
  }

  getImportantPages(pdfData) {
    return [1];
  }

  getReportableData(pdfData) {
    let arTotalPage = this.locatePageByString(pdfData, 'BALANCE FORWARD AND OPEN ITEM ACCOUNTS');
    let arTotal = this.locateNumericValue(pdfData, arTotalPage, 'ACCOUNTS RECEIVABLE');
    return {
      arTotal
    };
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
      console.log(`String ${this.idString} found on the first page of RAG!`);
      return true;
  } else {
      console.log(`String ${this.idString} NOT found on the first page of RAG!`);
      return false;
  }
  }
}