export class EagleReport {
  locatePageByString(pdfData, searchString, offset = 0, options = {}) {
    if (!pdfData?.Pages?.length) {
      console.error('No pages found in the PDF.');
      return null;
    }

    // Add new option parameters here
    let { removeSpaces } = options;

    for (let i = offset; i < pdfData.Pages.length; i++) {
      const page = pdfData.Pages[i];
      const pageText = page.Texts
        .map(textObj => decodeURIComponent(textObj?.R?.[0]?.T || ''))
        .join(' ')
        .replace(/\s+/g, removeSpaces ? '' : ' ')
        .trim(); // Trim for better accuracy

      if (pageText.includes(searchString)) {
        console.log(`String ${searchString} found on page ${i}!`);
        return i;
      }
    }

    console.log('String NOT found in the PDF.');
    return null;
  }

  locateNumericValue(pdfData, pageNumber, searchString) {
    if (!pdfData?.Pages?.length) {
      console.error('No pages found in the PDF.');
      return null;
    }
  
    if (pageNumber < 1 || pageNumber > pdfData.Pages.length) {
      console.error('Invalid page number.');
      return null;
    }
  
    const page = pdfData.Pages[pageNumber];
  
    // Combine all text from the page into one string, separating chunks with spaces:
    const pageText = page.Texts
      .map(textObj => decodeURIComponent(textObj?.R?.[0]?.T || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  
    console.log(`Extracted Page Text: "${pageText}"`);
  
    // If the search string is not found at all, bail out
    if (!pageText.includes(searchString)) {
      console.log(`String NOT found on page ${pageNumber}.`);
      return null;
    }
  
    /**
     * Regex Explanation:
     * 
     * 1. We build a dynamic pattern with the user-defined "searchString" in front.
     * 2. "\\s*" - allows optional spaces between the search term and the number.
     * 3. "([0-9,]+\\.[\\s]*[0-9]{2})" - captures:
     *    - one or more digits or commas ([0-9,]+)
     *    - a literal dot (\\.)
     *    - optional whitespace ([\\s]*)
     *    - exactly 2 digits ([0-9]{2})
     * 
     * So it will match patterns like:
     *   31,708.80
     *   31,708. 80
     *   31708. 80
     * etc.
     */
    const regex = new RegExp(`${searchString}\\s*([0-9,]+\\.[\\s]*[0-9]{2})`);
  
    const match = pageText.match(regex);
    if (match) {
      // Remove all spaces (in case there's a space between dot and digits)
      // and remove commas for parseFloat
      let numericValue = match[1]
        .replace(/\s+/g, '')   // remove all spaces
        .replace(/,/g, '');    // remove commas (e.g. 31,708 => 31708)
  
      console.log(`Numeric value of "${searchString}" found: ${numericValue}`);
      return parseFloat(numericValue); // e.g. "31708.80" => 31708.8
    } else {
      console.log('Numeric value NOT found.');
      return null;
    }
  }  

  // Return true if **ORIGINAL** is found on the first page
  isFirstPageOriginalPreliminary(pdfData) {
    if (!pdfData?.Pages?.length) {
      console.error('No pages found in the PDF.');
      return null;
    }

    const firstPage = pdfData.Pages[0];
    const firstPageText = firstPage.Texts
      .map(textObj => decodeURIComponent(textObj?.R?.[0]?.T || ''))
      .join(' ')
      .replace(/\s+/g, '')
      .trim();

    const found = firstPageText.includes('**ORIGINAL**');

    if (found) {
      return true;
    } else {
      return false;
    }
  }

  getPageText(pdfData, pageNumber) {
    if (!pdfData?.Pages?.length) {
      console.error('No pages found in the PDF.');
      return null;
    }

    if (pageNumber < 0 || pageNumber >= pdfData.Pages.length) {
      console.error('Invalid page number.');
      return null;
    }

    const page = pdfData.Pages[pageNumber];
    const pageText = page.Texts
      .map(textObj => decodeURIComponent(textObj?.R?.[0]?.T || ''))
      .join('')
      .replace(/\s+/g, '')
      .trim();

    return pageText;
  }
}