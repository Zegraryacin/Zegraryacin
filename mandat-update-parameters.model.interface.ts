/**
 * Paramètres du 2e appel envoiavthabmandat (mise à jour G4EM).
 * Tous les champs correspondent aux JSON fournis.
 */
export interface MandatUpdateParametersInterface {
    voie?: string;
    codePostal?: string;
    localite?: string;
    numContrat?: string;
    fondementResiliation?: string;
    designation?: string;
    distribution?: string;
    lieuDit?: string;
    dateEvt?: string;
    motif?: string;
    validation?: string;
    civilite?: string;
    nom?: string;
    prenom?: string;
    nomAssureur?: string;
}
