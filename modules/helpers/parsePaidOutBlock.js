// parsePaidOutBlock.js

/**
 * Parse the "PAID OUTS" block from a pdf2json JSON object.
 *
 * @param {Object} pdfData - The JSON object from pdf2json
 * @returns {Array<Object>} An array of objects, each representing a paid-out entry.
 *                         Returns an empty array if none found or on any error.
 */
export function parsePaidOutBlock(pdfData) {
  try {
    // Quick sanity check: must have "Texts" in the expected format
    if (!pdfData || !Array.isArray(pdfData.Texts)) {
      return [];
    }

    // Step 1: Extract lines for the Paid Outs block
    const paidOutBlock = extractPaidOutBlock(pdfData);

    if (!paidOutBlock.length) {
      return [];
    }

    // Step 2: Filter lines down to the relevant bits containing code + description + amount
    const filteredPaidOuts = filterPaidOutLines(paidOutBlock);

    if (!filteredPaidOuts.length) {
      return [];
    }

    // Step 3: Parse them into a structured array of objects
    const parsedPaidOuts = parsePaidOutLines(filteredPaidOuts);
    return parsedPaidOuts || [];
  } catch (err) {
    // In case anything goes wrong (bad data, unexpected format, etc.)
    console.error('Error parsing Paid Outs:', err);
    return [];
  }
}

/**
 * Extract just the block of lines for "PAID OUTS" from pdf2json output.
 * @param {Object} pdfData - The JSON object from pdf2json
 * @returns {Array<string>} lines relevant to the PAID OUTS block
 */
function extractPaidOutBlock(pdfData) {
  // 1) Group all text from pdf2json by approx. the same Y coordinate
  const lineMap = new Map();

  for (const textItem of pdfData.Texts) {
    // Round y so that e.g. 15.4020000001 ~ 15.402
    const roundedY = Math.round(textItem.y * 100);
    const rawText = textItem.R.map(r => decodeURIComponent(r.T)).join('');

    if (!lineMap.has(roundedY)) {
      lineMap.set(roundedY, []);
    }
    lineMap.get(roundedY).push(rawText);
  }

  // 2) Build an array of lines (sorted by Y)
  const sortedY = Array.from(lineMap.keys()).sort((a, b) => a - b);
  const lines = sortedY.map(yKey => lineMap.get(yKey).join(' '));

  // 3) Find "** PAID OUTS **" as the start
  const paidOutStartIndex = lines.findIndex(ln => ln.includes('** PAID OUTS **'));
  if (paidOutStartIndex === -1) {
    return [];
  }

  // 4) End before the next "** BANKCARD DATA **" or go to the end if not found
  let paidOutEndIndex = lines.findIndex(
    (ln, idx) => idx > paidOutStartIndex && ln.includes('** BANKCARD DATA **')
  );
  if (paidOutEndIndex === -1) {
    paidOutEndIndex = lines.length;
  }

  // 5) Slice out just the lines after "** PAID OUTS **"
  return lines.slice(paidOutStartIndex + 1, paidOutEndIndex);
}

/**
 * Filter lines to only capture substrings of interest from each line.
 * Looks for at least 3 spaces, then a single digit, then text, then a decimal number with 2 decimals.
 * @param {Array<string>} lines
 * @returns {Array<string>} lines that match the format
 */
function filterPaidOutLines(lines) {
  const regex = /\s{3,}([1-9])\s+(.+?)\s+(\d{1,3}(,\d{3})*\.\d{2})/;
  return lines
    .map(line => {
      const match = line.match(regex);
      return match ? match[0].trim() : null;
    })
    .filter(Boolean);
}

/**
 * Parse the filtered lines into an array of { code, description, amount } objects.
 * @param {Array<string>} lines
 * @returns {Array<Object>}
 */
function parsePaidOutLines(lines) {
  // Adjust the regex so it matches from the start, ignoring leading spaces if needed
  const regex = /^([1-9])\s+(.+?)\s+(\d{1,3}(,\d{3})*\.\d{2})/;
  const results = [];
  for (const line of lines) {
    const m = line.match(regex);
    if (m) {
      // m[1] = digit (e.g. 8)
      // m[2] = textual description
      // m[3] = numeric string (e.g. "43.68", "1,234.50")
      results.push({
        code: m[1],
        description: m[2].trim(),
        amount: parseFloat(m[3].replace(/,/g, '')),
      });
    }
  }
  return results;
}