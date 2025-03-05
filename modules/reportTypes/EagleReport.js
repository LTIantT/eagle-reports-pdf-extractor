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

    const pageText = page.Texts
      .map(textObj => decodeURIComponent(textObj?.R?.[0]?.T || ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`Extracted Page Text: "${pageText}"`);

    if (!pageText.includes(searchString)) {
      console.log(`String NOT found on page ${pageNumber}.`);
      return null;
    }

    // Improved regex: Extracts numeric values more flexibly, ensuring decimals and spacing are handled
    const regex = new RegExp(`${searchString}\\s*([0-9,]+(?:\\.[0-9]{2})?)`);
    const match = pageText.match(regex);

    if (match) {
      const numericValue = match[1].replace(/,/g, ''); // Remove commas for parsing (e.g., "1,234.56")
      console.log(`Numeric value of ${searchString} found: ${numericValue}`);
      return parseFloat(numericValue);
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
}