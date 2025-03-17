// EaglePDFParser.js
import pdf2json from 'pdf2json';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';
import { EagleRAG, EagleRCAD, EagleRCK, EagleRDJ, EagleRTX, EagleRDS } from './reportTypes/index.js';
import IdentifyReport from './reportTypes/IdentifyReport.js';

export default class EaglePDFParser {
  constructor(idStringsObject, reportableDataVariables) {
    this.idStrings = idStringsObject;
    this.reportableDataVariables = reportableDataVariables;
  }

  /**
   * Parse a PDF from a file path (async).
   * @param {string} filePath - The path to the PDF file.
   * @returns {Promise<object>} Resolves with the parsed pdfData object.
   */
  async parseFile(filePath) {
    if (!filePath) {
      throw new Error('No PDF file path provided.');
    }

    const pdfParser = new pdf2json();
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', errData => {
        console.error('PDF Parsing Error:', errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', pdfData => {
        console.log('PDF data ready (from file).');
        this.#processPDFData(pdfData, resolve);
      });

      pdfParser.loadPDF(filePath);
    });
  }

  /**
   * Parse a PDF from a Buffer (async).
   * @param {Buffer} pdfBuffer - The PDF data as a buffer.
   * @returns {Promise<object>} Resolves with the parsed pdfData object.
   */
  async parseBuffer(pdfBuffer) {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Invalid buffer provided.');
    }

    const pdfParser = new pdf2json();
    return new Promise((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', errData => {
        console.error('PDF Parsing Error:', errData.parserError);
        reject(errData.parserError);
      });

      pdfParser.on('pdfParser_dataReady', async pdfData => {
        console.log('PDF data ready (from buffer).');
        this.#processPDFData(pdfData, resolve);
      });

      pdfParser.parseBuffer(pdfBuffer);
    });
  }

  /**
   * Parse a PDF from a Readable stream (async).
   * Note that pdf2json doesn’t have a direct parseStream method,
   * so you typically read the stream to a buffer or rely on parseBuffer.
   * This method demonstrates reading the stream fully and then parsing.
   * @param {Readable} pdfStream - A readable stream containing PDF data.
   * @returns {Promise<object>} Resolves with the parsed pdfData object.
   */
  async parseStream(pdfStream) {
    if (!pdfStream || !(pdfStream instanceof Readable)) {
      throw new Error('Invalid readable stream provided.');
    }

    // Read the entire stream into a buffer
    const chunks = [];
    for await (const chunk of pdfStream) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);

    // Now parse from buffer
    return this.parseBuffer(pdfBuffer);
  }

  /**
   * Parse a PDF from an ArrayBuffer (async).
   * @param {ArrayBuffer} pdfArrayBuffer - The PDF data as an ArrayBuffer.
   * @returns {Promise<object>} Resolves with the parsed pdfData object.
   */
  async parseArrayBuffer(pdfArrayBuffer) {
    if (!pdfArrayBuffer) {
      throw new Error('Invalid ArrayBuffer provided.');
    }
    return this.parseBuffer(Buffer.from(pdfArrayBuffer));
  }

  // Extracts the specified pages from the PDF data.
  // @param {object} pdf - The PDF buffer data
  // @param {array} pages - The page numbers to extract.
  // @returns {object} - The extracted PDF data.
  async extractPages(pdf, pages) {
    if (!pdf || !pages || !Array.isArray(pages) || pages.length === 0) {
      throw new Error('Invalid PDF or pages provided.');
    }

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdf);

    // Create a new PDF with only the specified pages
    const newPdfDoc = await PDFDocument.create();
    for (let i = 0; i < pages.length; i++) {
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pages[i]]);
      newPdfDoc.addPage(copiedPage);
    }

    // Serialize the new PDF
    return newPdfDoc.save();
  }

  // Merges the specified PDFs into a single PDF.
  // @param {array} pdfs - The PDF buffers to merge.
  // @returns {object} - The merged PDF data.
  async mergePDFs(pdfs) {
    if (!pdfs || !Array.isArray(pdfs) || pdfs.length === 0) {
      throw new Error('Invalid PDFs provided.');
    }

    // Load the PDFs
    const pdfDocs = await Promise.all(pdfs.map(pdf => PDFDocument.load(pdf)));

    // Create a new PDF with all the pages
    const newPdfDoc = await PDFDocument.create();
    for (let i = 0; i < pdfDocs.length; i++) {
      for (let j = 0; j < pdfDocs[i].getPages().length; j++) {
        const [copiedPage] = await newPdfDoc.copyPages(pdfDocs[i], [j]);
        newPdfDoc.addPage(copiedPage);
      }
    }

    // Serialize the new PDF
    return newPdfDoc.save();
  }

  /**
   * Internal helper that processes the parsed pdfData:
   *   - Identifies the report type
   *   - Uses the appropriate handler
   *   - Resolves the promise once done
   */
  async #processPDFData(pdfData, resolve) {
    // Identify the report type
    const reportType = IdentifyReport(this.idStrings, pdfData);
    console.log(`Report type: ${reportType}`);

    if (!reportType) {
      console.error('Report type could not be identified.');
      return resolve(pdfData);
    }

    // Create the handler
    const handler = this.#getHandlerForReportType(reportType);
    if (handler) {
      console.log(`Parsing ${reportType} report...`);
      try {
        const importantPages = handler.getImportantPages(pdfData);
        const reportableData = handler.getReportableData(pdfData);

        // Do something with masterReportPages if needed
        return resolve({ importantPages, reportType, reportableData });        
      } catch (error) {
        console.error('Error parsing report:', error);
        return resolve({importantPages: null, reportType, reportableData: null});
      }
    } else {
      console.error('No handler found for the report type.');
    }

    // Resolve with the entire pdfData for further use
    resolve(pdfData);
  }

  /**
   * Internal helper that returns the correct handler class instance
   * based on the identified report type.
   */
  #getHandlerForReportType(reportType) {
    switch (reportType) {
      case 'EagleRAG':
        return new EagleRAG(this.idStrings.EAGLE_RAG_ID_STRING);// this.reportableDataVariables.find((x) => x.reportType === 'EagleRAG'));
      case 'EagleRCAD':
        return new EagleRCAD(this.idStrings.EAGLE_RCAD_ID_STRING);// this.reportableDataVariables.find((x) => x.reportType === 'EagleRCAD'));
      case 'EagleRCK':
        return new EagleRCK(this.idStrings.EAGLE_RCK_ID_STRING);// this.reportableDataVariables.find((x) => x.reportType === 'EagleRCK'));
      case 'EagleRDJ':
        return new EagleRDJ(this.idStrings.EAGLE_RDJ_ID_STRING, this.reportableDataVariables.find((x) => x.report === 'EagleRDJ'));
      case 'EagleRTX':
        return new EagleRTX(this.idStrings.EAGLE_RTX_ID_STRING);// this.reportableDataVariables.find((x) => x.reportType === 'EagleRTX'));
      case 'EagleRDS':
        return new EagleRDS(this.idStrings.EAGLE_RDS_ID_STRING);// this.reportableDataVariables.find((x) => x.reportType === 'EagleRDS'));
      default:
        console.warn('Unknown report type.');
        return null;
    }
  }
}
