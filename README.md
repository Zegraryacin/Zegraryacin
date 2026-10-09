Oui. Je me base sur le code que tu m’avais fourni pour OPTIMEVO-397, notamment chgtadrhab-avenant.component.ts, PopupMandatResiliationComponent et le nouveau parcours à 2 appels mandat.
Le point important : ne remplace pas this.listEditions avec la nouvelle data.listeEdition, sinon "Mandat de résiliation" disparaîtra complètement du HTML à cause de isWithEdition(code). Ton besoin est différent : le panel doit rester visible mais devenir disabled.
Comme l’appel de création/envoi du mandat se fait aussi dans la popup, le plus propre dans ton code est de mémoriser la disponibilité dans ChgtadrhabService. Ainsi le parent et la popup utilisent exactement le même état.
1. Dans chgtadrhab.service.ts
Dans les déclarations de ChgtadrhabService, ajoute :
private mandatResiliationDisponible = true;

Puis ajoute ces méthodes :
public majDisponibiliteMandat(
    result: DataOutChgtadrhabModelInterface | ErrorModelInterface
): void {

    if (
        !('data' in result)
        || !result.data
        || !('listeEdition' in result.data)
        || !Array.isArray(result.data.listeEdition)
    ) {
        return;
    }

    const listeEdition = result.data.listeEdition as string[];

    this.mandatResiliationDisponible =
        listeEdition.includes(
            this.Constantes.HAB_EDITION_MANDAT_RESILIATION
        )
        // Je garde aussi ce cas car ton code normalizeEditionCode()
        // connaît déjà listMandat.
        || listeEdition.includes('listMandat');
}

public isMandatResiliationDisponible(): boolean {
    return this.mandatResiliationDisponible;
}

public resetDisponibiliteMandat(): void {
    this.mandatResiliationDisponible = true;
}

Le return lorsque listeEdition n’existe pas est volontaire : absence du champ ≠ mandat interdit. On conserve alors la dernière valeur connue.
2. Dans chgtadrhab-avenant.component.ts, modifie isActionDisabled
Dans ton code actuel tu as cette méthode :
public isActionDisabled(code: string) {
    return this.getEditionFromList(code)!.isEnvoyer;
}

Et dans la version mandat on avait justement autorisé la réouverture du mandat même envoyé.
Remplace-la par :
public isActionDisabled(code: string): boolean {

    if (
        code === this.Constantes.HAB_EDITION_MANDAT_RESILIATION
    ) {
        return !this.service.isMandatResiliationDisponible();
    }

    return this.getEditionFromList(code)!.isEnvoyer;
}

C'est important parce que ça conserve le besoin précédent :
Mandat disponible + déjà créé/envoyé
→ le panel reste cliquable pour "Gérer/Recréer"

Mandat absent de listeEdition
→ panel disabled

Ton HTML actuel contient déjà :
<div
    (click)="onClickVoir(code)"
    [class.disabled]="isActionDisabled(code)"
    [class.moins]="!isVoirPlus(code)"
    [class.plus]="isVoirPlus(code)"
    class="recapitulatif">

Donc pas besoin de changer ce HTML.
Et ton onClickVoir() est déjà bien protégé :
public onClickVoir(code: string) {
    if (!this.isActionDisabled(code)) {
        ...
    }
}

Donc même si quelqu’un clique sur le panel disabled, il ne s’ouvrira pas.
3. Modifie aussi isVoirPlus()
Tu as actuellement :
public isVoirPlus(code: string) {
    return this.getEditionFromList(code)!.isVoirPlus;
}

Remplace par :
public isVoirPlus(code: string): boolean {

    if (
        code === this.Constantes.HAB_EDITION_MANDAT_RESILIATION
        && !this.service.isMandatResiliationDisponible()
    ) {
        return true;
    }

    return this.getEditionFromList(code)!.isVoirPlus;
}

Pourquoi c’est important ?
Imaginons que le mandat soit actuellement ouvert :
Mandat(s) et lettre(s) de résiliation   ^
   [contenu du mandat]

Puis tu fais un autre worker et il répond :
"listeEdition": [
    "Attestation Habitation",
    "ACR de suppression habitation"
]

Donc "Mandat de résiliation" a disparu.
Grâce à la modification de isVoirPlus() :
Mandat(s) et lettre(s) de résiliation   v

le contenu est automatiquement refermé.
Et ta méthode existante :
public isShow(code: string, codeAAfficher: string) {
    const isShow =
        code === codeAAfficher
        && !this.isVoirPlus(code);

    ...
}

fonctionnera toute seule. Pas besoin de la modifier.
4. Dans gereEnvoiSignature()
Tu as actuellement :
private gereEnvoiSignature() {
    this.service
        .appelEnvoiSignature(this.getDataEnvoiSignature())
        .subscribe(result => {

            if (this.isEnvoiSignatureOK(result)) {
                this.gereEnvoiSignatureOK(
                    result as DataOutChgtadrhabModelInterface
                );
            } else {
                this.gereEnvoiSignatureKO(result);
            }
        });
}

Ajoute la mise à jour immédiatement après réception :
private gereEnvoiSignature() {
    this.service
        .appelEnvoiSignature(this.getDataEnvoiSignature())
        .subscribe(result => {

            this.service.majDisponibiliteMandat(result);

            if (this.isEnvoiSignatureOK(result)) {
                this.gereEnvoiSignatureOK(
                    result as DataOutChgtadrhabModelInterface
                );
            } else {
                this.gereEnvoiSignatureKO(result);
            }
        });
}

Remarque : ton gereEnvoiSignatureOK() continue à initialiser this.listEditions exactement comme aujourd’hui. Ne change pas cette partie.
5. Dans gereLoadData()
Dans ton code tu as :
this.service
    .appelLoadDataEditionDocument(dataIn)
    .subscribe(result => {

        console.log('RESULT LOAD EDITION =', result);

        if ('data' in result) {
            console.log('DATA LOAD EDITION =', result.data);
        }

        if (this.isLoadDataOK(code, result)) {
            ...
        }
    });

Ajoute une seule ligne juste au début :
this.service
    .appelLoadDataEditionDocument(dataIn)
    .subscribe(result => {

        this.service.majDisponibiliteMandat(result);

        console.log('RESULT LOAD EDITION =', result);

        if ('data' in result) {
            console.log('DATA LOAD EDITION =', result.data);
        }

        if (this.isLoadDataOK(code, result)) {

            this.gereLoadDataOK(
                code,
                result as DataOutChgtadrhabModelInterface
            );

        } else {

            this.gereLoadDataKO(
                code,
                result
            );
        }
    });

Ça couvre notamment listeeditionhab.
6. Dans gereEnvoiDocument()
Tu as actuellement :
this.service
    .appelEnvoiDocument(
        url,
        this.getDataEnvoiDocument(code)
    )
    .subscribe(result => {

        if (this.isEnvoiDocumentOK(code, result)) {
            this.gereEnvoiDocumentOK(
                code,
                result as DataOutChgtadrhabModelInterface
            );
        } else {
            this.gereEnvoiDocumentKO(result);
        }
    });

Devient :
this.service
    .appelEnvoiDocument(
        url,
        this.getDataEnvoiDocument(code)
    )
    .subscribe(result => {

        this.service.majDisponibiliteMandat(result);

        if (this.isEnvoiDocumentOK(code, result)) {
            this.gereEnvoiDocumentOK(
                code,
                result as DataOutChgtadrhabModelInterface
            );
        } else {
            this.gereEnvoiDocumentKO(result);
        }
    });

Ça couvre notamment ton ACR :
envoiavthabacrsup

Donc sur ta troisième capture, si le retour devenait par exemple :
"listeEdition": [
    "Attestation Habitation",
    "ACR de suppression habitation"
]

le mandat serait immédiatement désactivé, même si le message worker n’est pas un retour fonctionnel normal.
C’est justement pourquoi je mets :
this.service.majDisponibiliteMandat(result);

avant :
isEnvoiDocumentOK(...)

et pas après.
7. Très important : premier appel envoiavthabmandat
Dans ton ouvrirMandat(...), on avait :
this.service.envoiAvenantMandat(dataIn).subscribe({
    next: result => {
        this.spinner.hide();

        if (!this.isMandatResponseOK(result)) {
            ...
            return;
        }

        ...
    }
});

Modifie en :
this.service.envoiAvenantMandat(dataIn).subscribe({
    next: result => {

        this.service.majDisponibiliteMandat(result);

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

        const dialogRef = this.dialog.open(
            PopupMandatResiliationComponent,
            {
                disableClose: true,
                data: {
                    result,
                    cadreCcr,
                    mode,
                    riskKeys
                }
            }
        );

        dialogRef.afterClosed().subscribe(retour => {
            if (!retour?.created) {
                return;
            }

            this.enregistrerEtatMandat(retour);
        });
    },
    error: () => {
        this.spinner.hide();
    }
});

8. Et surtout le deuxième appel dans PopupMandatResiliationComponent
Comme tu es maintenant sur le fonctionnement 2 appels et que création + envoi sont gérés par le backend sur le bouton Créer le mandat, c’est ici qu’il ne faut pas oublier la mise à jour.
Dans :
public enregistrerMandat(): void {

tu as :
this.service.envoiAvenantMandat(dataIn).subscribe({
    next: result => {
        this.loading = false;

        if (!this.isMandatResponseOK(result)) {
            ...
            return;
        }

        ...
    }
});

Ajoute la ligne avant le test d’erreur :
this.service.envoiAvenantMandat(dataIn).subscribe({
    next: result => {

        this.service.majDisponibiliteMandat(result);

        this.loading = false;

        if (!this.isMandatResponseOK(result)) {
            this.erreur =
                'La création du mandat n\'a pas abouti.';
            return;
        }

        if (result.data) {
            this.mandat = {
                ...this.mandat,
                ...(result.data as MandatDataModelInterface)
            };
        }

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
        this.erreur =
            'Erreur technique lors de la création du mandat.';
    }
});

Ça, c’est important : la popup et l’écran Avenant utilisent la même instance de ChgtadrhabService, donc dès que le worker de création/envoi répond, l’état est mémorisé dans le service.
9. Réinitialiser au début d’un nouveau parcours
Comme le service reste vivant, il ne faut pas qu’un ancien dossier ayant désactivé le mandat rende le prochain dossier disabled.
Dans getDataComponent() au tout début, ajoute :
private getDataComponent(): void {

    this.service.resetDisponibiliteMandat();

    // ton code actuel...
}

Au final, tu ne modifies pas le HTML et tu ne touches pas à this.listEditions.
Le comportement devient exactement :
listeEdition contient "Mandat de résiliation"
        ↓
service.isMandatResiliationDisponible() = true
        ↓
panel Mandat actif
        ↓
création / recréation autorisée


listeEdition ne contient plus "Mandat de résiliation"
        ↓
service.isMandatResiliationDisponible() = false
        ↓
panel Mandat toujours affiché
        ↓
panel replié
        ↓
panel grisé
        ↓
impossible de cliquer / créer / recréer

Et si un worker suivant renvoie à nouveau "Mandat de résiliation", il sera réactivé automatiquement, ce qui respecte bien ton nouveau besoin « vérifier après chaque appel ».
