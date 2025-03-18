import { PDFDict, PDFField } from 'pdf-lib';
import { EagleReport } from './EagleReport.js';

export default class EagleRDJ extends EagleReport {
  constructor(idStringsObject, reportableDataVariables) {
    super();
    let { originalPreliminary, firstPage } = idStringsObject;
    this.ogPrelimIdString = originalPreliminary;
    this.firstPageIdString = firstPage;
    this.reportableDataVariables = reportableDataVariables;
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
    let cashTotalsPage = this.locatePageByString(pdfData, 'CASH TOTALS FOR STORE');
    let totalsPage = this.locatePageByString(pdfData, 'TOTALS FOR STORE', cashTotalsPage + 1);

    let reportableData = [];

    if (this.reportableDataVariables) {
      let envDefinedVariables = Object.keys(this.reportableDataVariables.data);
      envDefinedVariables = envDefinedVariables.map(x => { return {key: x, fulfilled: false, value: null, ...this.reportableDataVariables.data[`${x}`]} });
      // console.log(envDefinedVariables);
      envDefinedVariables.forEach(variable => {
        if (variable.type === "derived") {
          let dependenciesFulfilled = variable.depends.map(dependency => {
            return envDefinedVariables.find(x => x.key === dependency).fulfilled;
          });
          if (dependenciesFulfilled.every(x => x === true)) {
            // Calculation is a string that is evaluated
            switch (variable.calculation) {
              case "sum":
                variable.value = variable.depends.slice(1).reduce(
                  (acc, curr) => acc + (parseFloat(envDefinedVariables.find(x => x.key === curr)?.value) || 0),
                  parseFloat(envDefinedVariables.find(x => x.key === variable.depends[0])?.value) || 0
                );
                break;              
              case "difference":
                variable.value = variable.depends.slice(1).reduce(
                  (acc, curr) => acc - (parseFloat(envDefinedVariables.find(x => x.key === curr)?.value) || 0),
                  parseFloat(envDefinedVariables.find(x => x.key === variable.depends[0])?.value) || 0
                );
                break;
              case "product":
                variable.value = variable.depends.reduce((acc, curr) => acc * envDefinedVariables.find(x => x.key === curr).value, 1);
                break;
              case "quotient":
                variable.value = variable.depends.reduce((acc, curr) => acc / envDefinedVariables.find(x => x.key === curr).value, 1);
                break;
              default:
                console.error(`Calculation type ${variable.calculation} not recognized.`);
                break;
            }

            variable.fulfilled = true;
          }
        }

        if (variable.type === "locator") {
          variable.value = this.findNested(pdfData.Pages[totalsPage].Texts.map(x => decodeURIComponent(x?.R?.[0]?.T || '')).join(''), variable);
          variable.fulfilled = true;
        }
      });

      // Build the final reportable data object
      reportableData = envDefinedVariables
          .filter(x => x.fulfilled)
          .reduce((acc, x) => {
              acc[x.key] = x.value;
              return acc;
          }, {});
    }

    return {...(Array.isArray(reportableData) ? Object.assign({}, reportableData) : reportableData)};
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
        console.log(`String ${this.ogPrelimIdString} found on the first page of RDJ!`);
        return true;
      } else {
        console.log(`String ${this.ogPrelimIdString} NOT found on the first page of RDJ!`);
        return false;
      }
    }

    const found = firstPageText.includes(this.firstPageIdString);
    
    if (found) {
      console.log(`String ${this.firstPageIdString} found on the first page of RDJ!`);
      return true;
    } else {
        console.log(`String ${this.firstPageIdString} NOT found on the first page of RDJ!`);
        return false;
    }
  }
}