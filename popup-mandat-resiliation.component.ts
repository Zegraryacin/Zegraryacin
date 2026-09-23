import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ChgtadrhabConstantes} from '@app/modules/parcours-chgtadrhab/chgtadrhab-constantes';
import {ChgtadrhabService} from '@app/modules/parcours-chgtadrhab/services/chgtadrhab.service';
import {DataInModelInterface} from '@app/modules/commun/models/data-in/data-in.model.interface';
import {DataOutChgtadrhabModelInterface} from '@app/modules/parcours-chgtadrhab/models/data-out-chgtadrhab.model.interface';
import {ErrorModelInterface} from '@app/modules/commun/models/error/error.model.interface';
import {MandatDataModelInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-data.model.interface';
import {MandatPf4ModelInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-pf4.model.interface';
import {MandatUpdateParametersInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-update-parameters.model.interface';
import {
    PopupMandatResiliationDataInterface,
    PopupMandatResiliationResultInterface
} from '@app/modules/parcours-chgtadrhab/models/mandat-dialog.model.interface';

@Component({
    selector: 'popup-mandat-resiliation',
    templateUrl: './popup-mandat-resiliation.component.html',
    styleUrls: ['./popup-mandat-resiliation.component.scss']
})
export class PopupMandatResiliationComponent implements OnInit {

    protected readonly Constantes = ChgtadrhabConstantes;

    public mandat: MandatDataModelInterface = {};
    public fondResil: MandatPf4ModelInterface[] = [];
    public motifResil: MandatPf4ModelInterface[] = [];

    /**
     * Présent dans la maquette Jira, mais aucun champ backend correspondant
     * n'a été fourni dans les entrées/sorties envoiavthabmandat.
     * Cette valeur reste donc uniquement dans l'UI et n'est jamais envoyée.
     */
    public assureActuel = '';

    /**
     * La maquette Jira affiche Pays = France, mais le contrat G4EM fourni
     * ne contient aucun champ "pays". Affichage uniquement, jamais envoyé.
     */
    public readonly paysAffiche = 'France';

    public loading = false;
    public erreur = '';

    constructor(
        @Inject(MAT_DIALOG_DATA) public dialogData: PopupMandatResiliationDataInterface,
        private readonly dialogRef: MatDialogRef<PopupMandatResiliationComponent>,
        private readonly service: ChgtadrhabService
    ) {}

    public ngOnInit(): void {
        const data = this.dialogData.result.data as MandatDataModelInterface;

        this.mandat = {
            ...data
        };

        this.fondResil = Array.isArray(this.mandat.fondResil)
            ? this.mandat.fondResil
            : [];

        this.motifResil = Array.isArray(this.mandat.motifResil)
            ? this.mandat.motifResil
            : [];
    }

    /**
     * Règle Jira / worker :
     * - H = Hamon  -> le bloc Résiliation ne doit pas être affiché.
     * - C = Chatel -> le bloc Résiliation doit être affiché.
     * - A = Autre  -> le bloc Résiliation doit être affiché.
     */
    public afficherBlocResiliation(): boolean {
        return this.dialogData.cadreCcr !== this.Constantes.CADRE_CCR_HAMON;
    }

    public isFormulaireValide(): boolean {
        const baseValide = Boolean(
            this.assureActuel
            && this.mandat.civilite
            && this.mandat.nom
            && this.mandat.prenom
            && this.mandat.nomAssureur
            && this.mandat.voie
            && this.mandat.localite
            && this.mandat.codePostal
            && this.mandat.validation
            && this.mandat.numContrat
        );

        if (!baseValide) {
            return false;
        }

        if (!this.afficherBlocResiliation()) {
            return true;
        }

        return Boolean(
            this.mandat.fondementResiliation
            && this.mandat.motif
        );

        /*
         * Ne pas rendre dateEvt obligatoire ici sans règle complémentaire.
         * La Jira dit : "Si vente ou perte du risque, date de cet événement",
         * mais le code exact de fondement/motif déclenchant cette obligation
         * n'a pas été fourni dans les éléments disponibles.
         */
    }

    public annuler(): void {
        this.dialogRef.close();
    }

    /**
     * Bouton "Créer le mandat" de la pop-in.
     *
     * Ce bouton fait uniquement le 2e appel envoiavthabmandat :
     * mise à jour / validation de l'écran G4EM.
     *
     * Le 3e appel envoiavthabmandat appartient au bouton
     * "Envoyer les documents" de l'écran d'édition et ne doit pas être fait ici.
     */
    public enregistrerMandat(): void {
        if (!this.isFormulaireValide() || this.loading) {
            return;
        }

        this.loading = true;
        this.erreur = '';

        const dataIn: DataInModelInterface = {
            idDossier: this.service.getCommunContexte().dossierId,
            resourceId: this.service.getCommunContexte().resourceId,
            parameters: this.buildUpdateParameters(),
            screenkey: this.Constantes.SCREEN_GENERIC
        };

        this.service.envoiAvenantMandat(dataIn).subscribe({
            next: result => {
                this.loading = false;

                if (!this.isMandatResponseOK(result)) {
                    this.erreur = 'La création du mandat n\'a pas abouti.';
                    return;
                }

                if (result.data) {
                    this.mandat = {
                        ...this.mandat,
                        ...(result.data as MandatDataModelInterface)
                    };
                }

                // Règle confirmée : retour OK sans exception => mandat créé.
                const retour: PopupMandatResiliationResultInterface = {
                    created: true,
                    cadreCcr: this.dialogData.cadreCcr,
                    mode: this.dialogData.mode,
                    riskKeys: this.dialogData.riskKeys,
                    mandat: this.mandat
                };

                this.dialogRef.close(retour);
            },
            error: () => {
                this.loading = false;
                this.erreur = 'Erreur technique lors de la création du mandat.';
            }
        });
    }

    /**
     * 2e appel envoiavthabmandat.
     * On envoie uniquement les champs documentés par le worker.
     * Les champs du bloc Résiliation ne sont ajoutés que si le bloc existe.
     */
    private buildUpdateParameters(): MandatUpdateParametersInterface {
        const parameters: MandatUpdateParametersInterface = {
            voie: this.mandat.voie,
            codePostal: this.mandat.codePostal,
            localite: this.mandat.localite,
            numContrat: this.mandat.numContrat,
            designation: this.mandat.designation,
            distribution: this.mandat.distribution,
            lieuDit: this.mandat.lieuDit,
            validation: this.mandat.validation,
            civilite: this.mandat.civilite,
            nom: this.mandat.nom,
            prenom: this.mandat.prenom,
            nomAssureur: this.mandat.nomAssureur
        };

        if (this.afficherBlocResiliation()) {
            parameters.fondementResiliation = this.mandat.fondementResiliation;
            parameters.motif = this.mandat.motif;
            parameters.dateEvt = this.mandat.dateEvt;
        }

        return parameters;
    }

    private isMandatResponseOK(
        result: DataOutChgtadrhabModelInterface | ErrorModelInterface
    ): result is DataOutChgtadrhabModelInterface {
        return 'data' in result
            && 'message' in result
            && result.message?.type !== this.Constantes.TYPE_MESSAGE_ERREUR;
    }
}
