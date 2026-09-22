import {MandatPf4ModelInterface} from './mandat-pf4.model.interface';

/**
 * Champs réellement visibles dans les JSON G4EM fournis.
 *
 * Important : on ne rajoute pas de propriété backend qui n'a pas été fournie.
 * Le "Pays" et la question "êtes-vous l'assuré actuel ?" de la maquette
 * restent donc des données UI tant que leur nom de champ backend n'est pas confirmé.
 */
export interface MandatDataModelInterface {
    voie?: string;
    fondementResiliation?: string;
    localite?: string;
    numContrat?: string;
    codePostal?: string;
    nomAssureur?: string;
    distribution?: string;
    nom?: string;
    fondResil?: MandatPf4ModelInterface[];
    lieuDit?: string;
    dateEvt?: string;
    designation?: string;
    motif?: string;
    prenom?: string;
    motifResil?: MandatPf4ModelInterface[];
    validation?: string;
    civilite?: string;
}
