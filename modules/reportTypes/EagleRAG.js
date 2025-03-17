import { EagleReport } from './EagleReport.js';

export default class EagleRAG extends EagleReport {
  constructor(idStringsObject) {
    super();
    let { originalPreliminary, firstPage } = idStringsObject;
    this.ogPrelimIdString = originalPreliminary;
    this.firstPageIdString = firstPage;
  }

  getImportantPages(pdfData) {
    if (this.isFirstPageOriginalPreliminary(pdfData) && pdfData.Pages.length > 1) {
      return [2];
    }

    return [1];
  }

  getReportableData(pdfData) {
    let arTotalPage = this.locatePageByString(pdfData, 'BALANCEFORWARDANDOPENITEMACCOUNTS', 0, {removeSpaces: true});
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

    // Search for the original preliminary string if this page is an original preliminary page
    if (this.isFirstPageOriginalPreliminary(pdfData)) {
      const found = firstPageText.includes(this.ogPrelimIdString);
      if (found) {
        console.log(`String ${this.ogPrelimIdString} found on the first page of RAG!`);
        return true;
      } else {
        console.log(`String ${this.ogPrelimIdString} NOT found on the first page of RAG!`);
        return false;
      }
    }

    const found = firstPageText.includes(this.firstPageIdString);
    
    if (found) {
      console.log(`String ${this.firstPageIdString} found on the first page of RAG!`);
      return true;
    } else {
        console.log(`String ${this.firstPageIdString} NOT found on the first page of RAG!`);
        return false;
    }
  }
}