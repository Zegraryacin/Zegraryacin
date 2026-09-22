/**
 * Données réellement observées dans result.data.listMandat de listeeditionhab.
 */
export interface MandatRisqueModelInterface {
    cle: number;
    type: string;
    usage: string;
    statut: string;
    nbPieces: string;
    codePostal: string;
    ville: string;
    selection: boolean;
    cadreCcr: string;
}
