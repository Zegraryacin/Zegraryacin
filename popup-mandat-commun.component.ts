import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {MandatRisqueModelInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-risque.model.interface';
import {PopupMandatCommunDataInterface} from '@app/modules/parcours-chgtadrhab/models/mandat-dialog.model.interface';
import {ChgtadrhabConstantes} from '@app/modules/parcours-chgtadrhab/chgtadrhab-constantes';

@Component({
    selector: 'popup-mandat-commun',
    templateUrl: './popup-mandat-commun.component.html',
    styleUrls: ['./popup-mandat-commun.component.scss']
})
export class PopupMandatCommunComponent {

    protected readonly Constantes = ChgtadrhabConstantes;

    public risques: MandatRisqueModelInterface[];

    constructor(
        @Inject(MAT_DIALOG_DATA) public dialogData: PopupMandatCommunDataInterface,
        private readonly dialogRef: MatDialogRef<PopupMandatCommunComponent>
    ) {
        const preselection = new Set(dialogData.clesPreselectionnees ?? []);

        // Clone : la popup ne modifie pas directement la liste du parent.
        this.risques = dialogData.risques.map(risque => ({
            ...risque,
            selection: preselection.has(risque.cle)
        }));
    }

    public get risquesSelectionnes(): MandatRisqueModelInterface[] {
        return this.risques.filter(risque => risque.selection);
    }

    public getCadreLib(cadreCcr: string): string {
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

    /**
     * Jira : un mandat commun porte sur des risques compatibles.
     * Avec les données listMandat fournies, le front peut contrôler cadreCcr et statut.
     *
     * IMPORTANT : nomAssureur et numContrat ne sont PAS présents dans listMandat
     * dans les JSON fournis. On ne les invente donc pas ici.
     * Leur validation doit rester côté worker tant que le contrat backend ne les expose pas.
     */
    public isSelectionValide(): boolean {
        const selection = this.risquesSelectionnes;

        if (selection.length < 2) {
            return false;
        }

        const premier = selection[0];

        return selection.every(risque =>
            risque.cadreCcr === premier.cadreCcr
            && risque.statut === premier.statut
        );
    }

    public getMessageBlocage(): string {
        const selection = this.risquesSelectionnes;

        if (selection.length === 0) {
            return '';
        }

        if (selection.length === 1) {
            return 'Sélectionnez au moins deux risques pour créer un mandat commun.';
        }

        const premier = selection[0];
        const cadreDifferent = selection.some(risque => risque.cadreCcr !== premier.cadreCcr);
        const statutDifferent = selection.some(risque => risque.statut !== premier.statut);

        if (cadreDifferent) {
            return 'Les risques sélectionnés doivent avoir le même cadre de reprise concurrence.';
        }

        if (statutDifferent) {
            return 'Les risques sélectionnés doivent avoir le même statut.';
        }

        return '';
    }

    public annuler(): void {
        this.dialogRef.close();
    }

    public creerMandatCommun(): void {
        if (!this.isSelectionValide()) {
            return;
        }

        this.dialogRef.close(this.risquesSelectionnes);
    }
}
