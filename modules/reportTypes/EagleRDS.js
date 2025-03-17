import { EagleReport } from './EagleReport.js';
import { parsePaidOutBlock } from '../helpers/parsePaidOutBlock.js';

export default class EagleRDS extends EagleReport {
  constructor(idStringsObject, reportableDataVariables) {
    super();
    let { originalPreliminary, firstPage } = idStringsObject;
    this.ogPrelimIdString = originalPreliminary;
    this.firstPageIdString = firstPage;
    this.reportableDataVariables = reportableDataVariables;
  }

  getImportantPages(pdfData) {
    let importantPages = [];
    importantPages.push(this.locatePageByString(pdfData, 'C A S H B A L A N C I N G W O R K S H E E T'));
    importantPages.push(this.locatePageByString(pdfData, '** TRANSACTION TOTALS **'));

    // Remove null values
    importantPages = importantPages.filter(function (el) {
      return el != null;
    });

    return importantPages;
  }

  getReportableData(pdfData) {
    let reportableData = [];
    let transactionsTotalPage = this.locatePageByString(pdfData, '**PAIDOUTS**', 0, {removeSpaces: true});
    let paidOuts = parsePaidOutBlock(pdfData.Pages[transactionsTotalPage]);

    //let taxableMerchandise = this.locateNumericValue(pdfData, transactionsTotalPage, 'TAXABLE MERCHANDISE');
    let nonTaxableMerchandise = this.locateNumericValue(pdfData, transactionsTotalPage, 'NON-TAXABLE MERCHANDISE');
    let salesTax = this.locateNumericValue(pdfData, transactionsTotalPage, 'SALES TAX');
    let orderDepositsTaken = this.locateNumericValue(pdfData, transactionsTotalPage, 'ORDER DEPOSITS TAKEN');
    let giftCardsUsed = this.locateNumericValue(pdfData, transactionsTotalPage, 'In-Store Gift Card');
    
    let departmentTotalsPage = this.locatePageByString(pdfData, 'DEPARTMENTTOTALS', 0, {removeSpaces: true});
    let giftCardSales = this.locateNumericValue(pdfData, departmentTotalsPage, 'GIFT CARD');
    
    if (this.reportableDataVariables) {
      let envDefinedVariables = Object.keys(this.reportableDataVariables.data).map(x => ({
          key: x,
          fulfilled: false,
          value: null,
          ...this.reportableDataVariables.data[x]
      }));
  
      // console.log("Initial Variables:", envDefinedVariables);
  
      // Function to safely parse numbers (handles commas)
      const safeParseFloat = (value) => {
          if (typeof value === "string") {
              value = value.replace(/,/g, ''); // Remove commas
          }
          return parseFloat(value) || 0; // Convert and default to 0 if NaN
      };
  
      // Process all locator variables first
      envDefinedVariables.forEach(variable => {
          if (variable.type === "locator") {
              variable.value = this.findNested(
                  pdfData.Pages[transactionsTotalPage].Texts.map(x => x.R[0].T).join(''), 
                  variable
              );
              variable.value = safeParseFloat(variable.value); // Ensure numerical parsing
              variable.fulfilled = true;
          }
      });
  
      // Process derived variables iteratively in the correct dependency order
      let remainingVariables = envDefinedVariables.filter(v => v.type === "derived");
  
      while (remainingVariables.length > 0) {
          let newlyFulfilled = [];
  
          remainingVariables.forEach(variable => {
              let dependencies = variable.depends.map(depKey => 
                  envDefinedVariables.find(x => x.key === depKey)
              );
  
              let dependenciesFulfilled = dependencies.every(dep => dep?.fulfilled);
  
              if (dependenciesFulfilled) {
                  switch (variable.calculation) {
                      case "sum":
                          variable.value = dependencies.reduce(
                              (acc, dep) => acc + safeParseFloat(dep?.value),
                              0
                          );
                          break;
                      case "difference":
                          variable.value = dependencies.slice(1).reduce(
                              (acc, dep) => acc - safeParseFloat(dep?.value),
                              safeParseFloat(dependencies[0]?.value) || 0
                          );
                          break;
                      case "product":
                          variable.value = dependencies.reduce(
                              (acc, dep) => acc * safeParseFloat(dep?.value || 1),
                              1
                          );
                          break;
                      case "quotient":
                          variable.value = dependencies.reduce(
                              (acc, dep) => acc / (safeParseFloat(dep?.value) || 1),
                              safeParseFloat(dependencies[0]?.value) || 1
                          );
                          break;
                      default:
                          console.error(`Calculation type ${variable.calculation} not recognized.`);
                          break;
                  }
  
                  variable.fulfilled = true;
                  newlyFulfilled.push(variable.key);
              }
          });
  
          if (newlyFulfilled.length === 0) {
              console.error("Circular dependency detected or unresolved dependencies.");
              break;
          }
  
          // Remove fulfilled variables from remaining list
          remainingVariables = remainingVariables.filter(v => !v.fulfilled);
      }
  
      // Build the final reportable data object
      reportableData = envDefinedVariables
          .filter(x => x.fulfilled)
          .reduce((acc, x) => {
              acc[x.key] = x.value;
              return acc;
          }, {});
    }  
  
    return {
      ...(Array.isArray(reportableData) ? Object.assign({}, reportableData) : reportableData),
      paidOuts,
      nonTaxableMerchandise,
      salesTax,
      orderDepositsTaken,
      giftCardsUsed,
      giftCardSales
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
        console.log(`String ${this.ogPrelimIdString} found on the first page of RDS!`);
        return true;
      } else {
        console.log(`String ${this.ogPrelimIdString} NOT found on the first page of RDS!`);
        return false;
      }
    }
    
    const found = firstPageText.includes(this.firstPageIdString);
    
    if (found) {
      console.log(`String ${this.firstPageIdString} found on the first page of RDS!`);
      return true;
    } else {
        console.log(`String ${this.firstPageIdString} NOT found on the first page of RDS!`);
        return false;
    }
  }
}