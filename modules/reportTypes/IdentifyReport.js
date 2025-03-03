import { EagleRAG, EagleRCAD, EagleRCK, EagleRDJ, EagleRTX, EagleRDS } from './index.js';

export default function IdentifyReport(env, pdfdata) {
    if ((new EagleRAG(env.EAGLE_RAG_ID_STRING)).id(pdfdata)) return 'EagleRAG';
    if ((new EagleRCAD(env.EAGLE_RCAD_ID_STRING)).id(pdfdata)) return 'EagleRCAD';
    if ((new EagleRCK(env.EAGLE_RCK_ID_STRING)).id(pdfdata)) return 'EagleRCK';
    if ((new EagleRDJ(env.EAGLE_RDJ_ID_STRING)).id(pdfdata)) return 'EagleRDJ';
    if ((new EagleRTX(env.EAGLE_RTX_ID_STRING)).id(pdfdata)) return 'EagleRTX';
    if ((new EagleRDS(env.EAGLE_RDS_ID_STRING)).id(pdfdata)) return 'EagleRDS';
    return null;
}