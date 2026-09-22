// ============================================================
// IMPORTS à ajouter dans chgtadrhab-avenant.component.ts
// ============================================================

import {PopupMandatCommunComponent} from '@app/modules/parcours-chgtadrhab/components/popup/popup-mandat-commun/popup-mandat-commun.component';
import {PopupMandatResiliationComponent} from '@app/modules/parcours-chgtadrhab/components/popup/popup-mandat-resiliation/popup-mandat-resiliation.component';
import {MandatRisqueModelInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-risque.model.interface';
import {MandatInitParametersInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-init-parameters.model.interface';
import {
    MandatCreationMode,
    PopupMandatResiliationResultInterface
} from '@app/modules/parcours-chgtadrhab/models/mandat-dialog.model.interface';

// ============================================================
// TYPE LOCAL à placer avant @Component
// ============================================================

type MandatEtatLocal = {
    mode: MandatCreationMode;
    riskKeys: number[];
    groupId?: number;
};

// ============================================================
// CHAMPS à ajouter dans ChgtadrhabAvenantComponent
// ============================================================

public listMandats: MandatRisqueModelInterface[] = [];
public lettresResiliationSelectionnees = false;
public modeleLettreHamonProprietaireSelectionne = false;
public mandatMenuCle: number | null = null;

private readonly mandatEtatParRisque = new Map<number, MandatEtatLocal>();
private sequenceMandatCommun = 0;

// ============================================================
// 1) normalizeEditionCode : conserver votre logique existante et vérifier ce case
// ============================================================

// case 'listMandat':
//     return this.Constantes.HAB_EDITION_MANDAT_RESILIATION;

// ============================================================
// 2) isLoadDataOK : ajouter le case MANDAT
// ============================================================

/*
case this.Constantes.HAB_EDITION_MANDAT_RESILIATION:
    return 'listMandat' in result.data
        && Array.isArray(result.data.listMandat);
*/

// ============================================================
// 3) gereLoadDataOK : ajouter le case MANDAT
// ============================================================

/*
case this.Constantes.HAB_EDITION_MANDAT_RESILIATION:
    this.listMandats = Array.isArray(result.data.listMandat)
        ? (result.data.listMandat as MandatRisqueModelInterface[])
            .map(risque => ({...risque, selection: false}))
        : [];

    // Documentation initiale : un cas G4EM pouvait renvoyer listMandat = [].
    // Dans vos derniers tests réels, listMandat est alimentée.
    // Ne pas inventer un fallback tant que cadreCcr du risque courant n'est pas garanti côté contexte.
    if (this.listMandats.length === 0) {
        console.warn('Mandat de résiliation : listMandat vide. Aucun fallback backend confirmé.');
    }
    break;
*/

// ============================================================
// 4) Méthodes métier Mandat à ajouter dans la classe
// ============================================================

public getCadreMandatLib(cadreCcr: string): string {
    switch (cadreCcr) {
        case this.Constantes.CADRE_CCR_HAMON:
            return 'Loi Hamon';
        case this.Constantes.CADRE_CCR_CHATEL:
            return 'Loi Chatel';
        case this.Constantes.CADRE_CCR_AUTRE:
            return 'Autre';
        default:
            return cadreCcr;
    }
}

public isMandatCree(risque: MandatRisqueModelInterface): boolean {
    return this.mandatEtatParRisque.has(risque.cle);
}

public hasMandatCree(): boolean {
    return this.mandatEtatParRisque.size > 0;
}

public getMandatActionLib(risque: MandatRisqueModelInterface): string {
    return this.isMandatCree(risque)
        ? this.Constantes.HAB_MANDAT_RECREER_LIB
        : this.Constantes.HAB_MANDAT_CREER_LIB;
}

public onClickActionMandat(risque: MandatRisqueModelInterface): void {
    if (!this.isMandatCree(risque)) {
        this.ouvrirMandat([risque], 'unitaire');
        return;
    }

    this.mandatMenuCle = this.mandatMenuCle === risque.cle
        ? null
        : risque.cle;
}

public recreerMandatUnitaire(risque: MandatRisqueModelInterface): void {
    this.mandatMenuCle = null;
    this.ouvrirMandat([risque], 'unitaire');
}

public recreerMandatCommun(risque: MandatRisqueModelInterface): void {
    this.mandatMenuCle = null;

    const etat = this.mandatEtatParRisque.get(risque.cle);
    const clesPreselectionnees = etat?.mode === 'commun'
        ? etat.riskKeys
        : [risque.cle];

    this.ouvrirPopupMandatCommun(clesPreselectionnees);
}

public ouvrirPopupMandatCommun(clesPreselectionnees: number[] = []): void {
    const dialogRef = this.dialog.open(PopupMandatCommunComponent, {
        disableClose: true,
        data: {
            risques: this.listMandats,
            clesPreselectionnees
        }
    });

    dialogRef.afterClosed().subscribe((risques: MandatRisqueModelInterface[] | undefined) => {
        if (!risques || risques.length < 2) {
            return;
        }

        this.ouvrirMandat(risques, 'commun');
    });
}

private ouvrirMandat(
    risques: MandatRisqueModelInterface[],
    mode: MandatCreationMode
): void {
    if (risques.length === 0) {
        return;
    }

    const multiMandat = this.listMandats.length > 1;

    const parameters: MandatInitParametersInterface = {
        // L'adresse email existe déjà dans le parcours signature actuel.
        mail: this.emailSelected!.email,
        emailJetable: this.Constantes.NON,

        // Jira : aucun choix de canal d'envoi à afficher.
        // Le cas de test fourni appelle le worker avec modeImp = 'C'.
        modeImp: this.Constantes.TYPE_ENVOI_EDITION_CENTRALISEE,

        // Documentation fournie :
        // - O si on sélectionne un/des risque(s) dans un cas multiMandat
        // - N dans le cas mono-mandat
        selectionRisque: multiMandat
            ? this.Constantes.OUI
            : this.Constantes.NON
    };

    if (multiMandat) {
        parameters.risques = JSON.stringify(
            risques.map(risque => ({
                cle: risque.cle,
                selection: true
            }))
        );
    }

    const dataIn: DataInModelInterface = {
        idDossier: this.service.getCommunContexte().dossierId,
        resourceId: this.service.getCommunContexte().resourceId,
        parameters,
        screenkey: this.Constantes.SCREEN_GENERIC
    };

    this.spinner.show();

    // 1er appel envoiavthabmandat : affichage / initialisation G4EM + PF4 éventuelles.
    this.service.envoiAvenantMandat(dataIn).subscribe({
        next: result => {
            this.spinner.hide();

            if (!this.isMandatResponseOK(result)) {
                this.service.errorPopup(
                    result,
                    this.Constantes.AVENANT_COMPONENT,
                    'ouvrirMandat'
                );
                return;
            }

            const cadreCcr = risques[0].cadreCcr;
            const riskKeys = risques.map(risque => risque.cle);

            const dialogRef = this.dialog.open(PopupMandatResiliationComponent, {
                disableClose: true,
                data: {
                    result,
                    cadreCcr,
                    mode,
                    riskKeys
                }
            });

            dialogRef.afterClosed().subscribe(
                (retour: PopupMandatResiliationResultInterface | undefined) => {
                    if (!retour?.created) {
                        return;
                    }

                    this.enregistrerEtatMandat(retour);
                }
            );
        },
        error: () => {
            this.spinner.hide();
        }
    });
}

private enregistrerEtatMandat(
    retour: PopupMandatResiliationResultInterface
): void {
    if (retour.mode === 'unitaire') {
        const key = retour.riskKeys[0];

        this.mandatEtatParRisque.set(key, {
            mode: 'unitaire',
            riskKeys: [key]
        });
    } else {
        const groupId = ++this.sequenceMandatCommun;
        const keys = [...retour.riskKeys];

        keys.forEach(key => {
            this.mandatEtatParRisque.set(key, {
                mode: 'commun',
                riskKeys: keys,
                groupId
            });
        });
    }

    // Jira : lettres pré-cochées dès qu'au moins un mandat est créé.
    this.lettresResiliationSelectionnees = this.hasMandatCree();
}

public isMenuMandatOuvert(risque: MandatRisqueModelInterface): boolean {
    return this.mandatMenuCle === risque.cle;
}

public isModeleLettreHamonProprietaireVisible(): boolean {
    return this.listMandats.some(risque =>
        risque.cadreCcr === this.Constantes.CADRE_CCR_HAMON
        && risque.statut === 'Propr'
    );
}

private isMandatResponseOK(
    result: DataOutChgtadrhabModelInterface | ErrorModelInterface
): result is DataOutChgtadrhabModelInterface {
    return 'data' in result
        && 'message' in result
        && result.message?.type !== this.Constantes.TYPE_MESSAGE_ERREUR;
}

private getNbMandatsUnitaires(): number {
    return Array
        .from(this.mandatEtatParRisque.values())
        .filter(etat => etat.mode === 'unitaire')
        .length;
}

private getNbMandatsCommuns(): number {
    const groupIds = new Set<number>();

    Array
        .from(this.mandatEtatParRisque.values())
        .filter(etat => etat.mode === 'commun' && etat.groupId !== undefined)
        .forEach(etat => groupIds.add(etat.groupId!));

    return groupIds.size;
}

private getBilanEnvoiMandat(): string {
    const unitaires = this.getNbMandatsUnitaires();
    const communs = this.getNbMandatsCommuns();

    const parties: string[] = [];

    if (unitaires > 0) {
        parties.push(
            `${unitaires} mandat${unitaires > 1 ? 's' : ''} unitaire${unitaires > 1 ? 's' : ''}`
        );
    }

    if (communs > 0) {
        parties.push(
            `${communs} mandat${communs > 1 ? 's' : ''} commun${communs > 1 ? 's' : ''}`
        );
    }

    const total = unitaires + communs;

    return `${parties.join(' et ')} envoyé${total > 1 ? 's' : ''}`;
}

// ============================================================
// 5) isEnvoiDocumentDisabled : ajouter un traitement spécial EN PREMIER
// ============================================================

/*
public isEnvoiDocumentDisabled(code: string) {
    const edition = this.getEditionFromList(code)!;

    if (code === this.Constantes.HAB_EDITION_MANDAT_RESILIATION) {
        return edition.isEnvoyer || !this.hasMandatCree();
    }

    // ... conserver ensuite votre logique actuelle inchangée ...
}
*/

// ============================================================
// 6) gereEnvoiDocument : ajouter un traitement spécial EN PREMIER
// ============================================================

/*
private gereEnvoiDocument(code: string) {
    if (code === this.Constantes.HAB_EDITION_MANDAT_RESILIATION) {
        this.gereEnvoiMandatDocuments();
        return;
    }

    // ... conserver ensuite votre logique actuelle par transco ...
}
*/

private gereEnvoiMandatDocuments(): void {
    const dataIn: DataInModelInterface = {
        idDossier: this.service.getCommunContexte().dossierId,
        resourceId: this.service.getCommunContexte().resourceId,
        parameters: {},
        screenkey: this.Constantes.SCREEN_GENERIC
    };

    // 3e appel documenté : pas de paramètre métier nécessaire.
    this.service.envoiAvenantMandat(dataIn).subscribe({
        next: result => {
            if (!this.isMandatResponseOK(result)) {
                this.service.errorPopup(
                    result,
                    this.Constantes.AVENANT_COMPONENT,
                    'gereEnvoiMandatDocuments'
                );
                this.spinner.hide();
                return;
            }

            const edition = this.getEditionFromList(
                this.Constantes.HAB_EDITION_MANDAT_RESILIATION
            )!;

            edition.isEnvoyer = true;
            edition.isVoirPlus = true;
            edition.bilanEnvoi = this.getBilanEnvoiMandat();

            this.spinner.hide();
        },
        error: () => {
            this.spinner.hide();
        }
    });
}

// ============================================================
// 7) isActionDisabled : permettre de réouvrir le mandat envoyé
//    pour voir les documents envoyés, comme demandé dans la maquette.
// ============================================================

/*
public isActionDisabled(code: string) {
    if (code === this.Constantes.HAB_EDITION_MANDAT_RESILIATION) {
        return false;
    }

    return this.getEditionFromList(code)!.isEnvoyer;
}
*/

// ============================================================
// 8) Terminer : Jira = grisé dès qu'un document est sélectionné et non envoyé.
//    Remplacer isTerminerDisabled par cette version.
// ============================================================

public isTerminerDisabled(): boolean {
    return !(
        this.isSignatureEnvoye
        && this.listEditions.every(edition => edition.isVoirPlus)
        && !this.listEditions.some(edition => this.hasPendingDocumentSelection(edition))
    );
}

private hasPendingDocumentSelection(edition: EditionDocumentModelInterface): boolean {
    if (edition.isEnvoyer) {
        return false;
    }

    switch (edition.code) {
        case this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE:
            return this.listEnfants.some(item => item.selection);

        case this.Constantes.HAB_EDITION_ATTESTATION_HABITATION:
            return this.listHabitations.some(item => item.selection);

        case this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE:
            return this.listLocations.some(item => item.selection);

        case this.Constantes.HAB_EDITION_ACR_SUPPRESSION_HABITATION:
            return this.listAcrSuppressionHab.some(item => item.selection);

        case this.Constantes.HAB_EDITION_MANDAT_RESILIATION:
            return this.hasMandatCree();

        default:
            return false;
    }
}
