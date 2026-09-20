traitent actuellement que les trois attestations ; le mandat n’est pas encore traité.

La correction V3 qu’on avait faite pour normalizeEditionCode() doit donc être conservée, car aujourd’hui gereEnvoiSignatureOK() injecte directement le code retourné par le backend dans listEditions.

1. chgtadrhab-avenant.component.ts — partie finale certaine

Ajoute d’abord ces propriétés avec tes autres listes :

public listMandats: any[] = [];
public mandatData: any = null;

Je mets volontairement any ici : tu ne m’as pas encore fourni la structure d’un élément de result.liste dans le cas multi-mandats. Déclarer maintenant une interface avec typeRisque, usage, statut, etc. serait inventer le contrat backend.

Ensuite conserve exactement cette normalisation :

private normalizeEditionCode(codeDocument: string): string {
    switch (codeDocument) {

        case 'listAttScolaire':
            return this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE;

        case 'listAttHabitation':
            return this.Constantes.HAB_EDITION_ATTESTATION_HABITATION;

        case 'listAttRcLocative':
            return this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE;

        case 'listMandat':
            return this.Constantes.HAB_EDITION_MANDAT_RESILIATION;

        case 'listAcrSuppressionHab':
            return this.Constantes.HAB_EDITION_ACR_SUPPRESSION_HABITATION;

        default:
            return codeDocument;
    }
}

Puis remplace ton gereEnvoiSignatureOK() actuel par :

private gereEnvoiSignatureOK(
    result: DataOutChgtadrhabModelInterface
): void {

    this.isSignatureEnvoye = true;
    this.listEditions = [] as EditionDocumentModelInterface[];

    if (
        'data' in result
        && result.data
        && 'listeEdition' in result.data
        && Array.isArray(result.data.listeEdition)
    ) {

        (result.data.listeEdition as string[])
            .forEach((codeDocument: string) => {

                const codeEdition: string =
                    this.normalizeEditionCode(codeDocument);

                this.listEditions.push({
                    code: codeEdition,
                    isVoirPlus: true,
                    isLoaded: false,
                    isEnvoyer: false,
                    canalEnvoi: this.Constantes.TYPE_ENVOI_EMAIL,
                    bilanEnvoi: this.Constantes.STRING_VIDE
                });
            });
    }

    this.scrollToBottom();
    this.spinner.hide();
}

Cela donne bien :

backend
listMandat
    ↓
normalizeEditionCode()
    ↓
HAB_EDITION_MANDAT_RESILIATION
    ↓
"Mandat de résiliation"
    ↓
listeeditionhab
parameters.typeEdition = "Mandat de résiliation"

C’est cohérent avec le document technique que tu as photographié.

2. getDataLoadData() : ne change pas son principe

Ton code existant est correct pour la JIRA :

private getDataLoadData(
    code: string
): DataInModelInterface {

    const dataIn: DataInModelInterface = {

        idDossier:
            this.service.getCommunContexte().dossierId,

        resourceId:
            this.service.getCommunContexte().resourceId,

        parameters: {
            typeEdition: code
        },

        screenkey:
            this.Constantes.SCREEN_GENERIC
    };

    return dataIn;
}

Il faut justement que pour le mandat code vaille :

this.Constantes.HAB_EDITION_MANDAT_RESILIATION

et pas :

'listMandat'
3. Corriger isLoadDataOK()

C’est important.

La documentation que tu as donnée dit :

Mandat unique
=> liste = []

Mandats multiples
=> liste alimentée

Donc surtout ne pas tester result.liste.length > 0 pour considérer le mandat valide, sinon le cas mandat unique serait rejeté.

Utilise :

private isLoadDataOK(
    code: string,
    result: DataOutChgtadrhabModelInterface | ErrorModelInterface
): boolean {

    if (
        !('message' in result)
        || result.message.type === this.Constantes.TYPE_MESSAGE_ERREUR
        || !('screenkey' in result)
        || result.screenkey !== this.Constantes.EDITION_DOCUMENT_SCREEN
        || !('data' in result)
    ) {
        return false;
    }

    switch (code) {

        case this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE:

            return 'listAttScolaire' in result.data
                && Array.isArray(result.data.listAttScolaire)
                && result.data.listAttScolaire.length > 0;

        case this.Constantes.HAB_EDITION_ATTESTATION_HABITATION:

            return 'listAttHabitation' in result.data
                && Array.isArray(result.data.listAttHabitation)
                && result.data.listAttHabitation.length > 0;

        case this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE:

            return 'listAttRcLocativePers' in result.data
                && Array.isArray(result.data.listAttRcLocativePers)
                && result.data.listAttRcLocativePers.length > 0
                && 'listAttRcLocativeRisque' in result.data
                && Array.isArray(result.data.listAttRcLocativeRisque)
                && result.data.listAttRcLocativeRisque.length > 0;

        /*
         * JIRA OPTIMEVO-397
         *
         * liste vide    = cas mandat unique
         * liste remplie = cas plusieurs mandats
         *
         * Les deux sont donc des retours fonctionnels valides.
         */
        case this.Constantes.HAB_EDITION_MANDAT_RESILIATION:

            return 'liste' in result
                && Array.isArray(result.liste);

        default:

            return true;
    }
}

C’est une différence essentielle avec les attestations.

4. Corriger gereLoadDataOK()

Remplace-la par :

private gereLoadDataOK(
    code: string,
    result: DataOutChgtadrhabModelInterface
): void {

    switch (code) {

        case this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE:

            this.listEnfants =
                result.data.listAttScolaire;

            break;


        case this.Constantes.HAB_EDITION_ATTESTATION_HABITATION:

            this.listHabitations =
                result.data.listAttHabitation;

            break;


        case this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE:

            this.listPersonnes =
                result.data.listAttRcLocativePers;

            this.listLocations =
                result.data.listAttRcLocativeRisque;

            break;


        case this.Constantes.HAB_EDITION_MANDAT_RESILIATION:

            /*
             * Ce sont exactement les deux informations
             * garanties par ta documentation :
             *
             * result.data
             * result.liste
             */
            this.mandatData = result.data;
            this.listMandats = Array.isArray(result.liste)
                ? result.liste
                : [];

            break;
    }
}

Je ne fais ici aucun mapping du style :

mandat.typeRisque
mandat.usage
mandat.statut
mandat.nbPieces
mandat.cadre

car aucun JSON de result.liste multi-mandats fourni dans tes captures ne donne les noms exacts de ces propriétés.

5. Méthodes permettant de distinguer les deux cas documentés

Ajoute :

public isMandatUnique(): boolean {
    return this.listMandats.length === 0;
}

public isMultiMandat(): boolean {
    return this.listMandats.length > 0;
}

Cela correspond directement à ton document :

écran G4EM
liste vide
→ un seul mandat

écran G4EL
liste alimentée
→ plusieurs mandats
6. Le worker mandat

Dans ta documentation, le worker est explicitement :

envoiavthabmandat

Donc dans chgtadrhab-constantes.ts, si cette constante n’existe pas encore :

public static readonly URL_ENVOI_MANDAT_HAB: string =
    'envoiavthabmandat';

Tu as déjà dans le service le mécanisme générique :

appelBackPost(...)

et appelLoadDataEditionDocument() est déjà basé sur le même mécanisme. Je resterais donc cohérent avec l’architecture existante.

Dans chgtadrhab.service.ts :

public appelMandatHab(
    dataIn: DataInModelInterface
): Observable<
    DataOutChgtadrhabModelInterface
    | ErrorModelInterface
> {

    return this.appelBackPost(
        this.Constantes.URL_ENVOI_MANDAT_HAB,
        dataIn
    );
}
7. Premier appel envoiavthabmandat

Le document technique donne exactement les paramètres suivants :

mail
emailJetable
modeImp
selectionRisque
risques

Donc :

private getDataCreationMandat(
    risques: Array<{
        cle: number;
        selection: boolean;
    }> = []
): DataInModelInterface {

    const multiMandat: boolean =
        risques.length > 0;

    return {

        idDossier:
            this.service.getCommunContexte().dossierId,

        resourceId:
            this.service.getCommunContexte().resourceId,

        parameters: {

            mail:
                this.emailSelected?.email
                ?? this.Constantes.STRING_VIDE,

            emailJetable:
                this.Constantes.NON,

            modeImp:
                'C',

            selectionRisque:
                multiMandat
                    ? this.Constantes.OUI
                    : this.Constantes.NON,

            risques:
                multiMandat
                    ? JSON.stringify(risques)
                    : this.Constantes.STRING_VIDE
        },

        screenkey:
            this.Constantes.SCREEN_GENERIC
    };
}

Ici modeImp: 'C' ne vient pas de moi : il apparaît explicitement dans la documentation que tu as photographiée.

8. Ouvrir le formulaire de mandat
public onClickCreerMandat(): void {

    this.spinner.show();

    const dataIn =
        this.getDataCreationMandat();

    this.service
        .appelMandatHab(dataIn)
        .subscribe(result => {

            if (
                !('message' in result)
                || result.message.type ===
                    this.Constantes.TYPE_MESSAGE_ERREUR
            ) {

                this.service.errorPopup(
                    result,
                    this.Constantes.AVENANT_COMPONENT,
                    'onClickCreerMandat'
                );

                this.spinner.hide();

                return;
            }

            /*
             * Ici le résultat contient le formulaire
             * retourné par envoiavthabmandat.
             *
             * Dans tes exemples :
             *
             * civilite
             * nom
             * prenom
             * nomAssureur
             * voie
             * distribution
             * lieuDit
             * localite
             * codePostal
             * numContrat
             * validation
             * fondementResiliation
             * motif
             * designation
             * dateEvt
             *
             * et, hors HAMON :
             * fondResil[]
             * motifResil[]
             */

            this.mandatData =
                'data' in result
                    ? result.data
                    : null;

            this.spinner.hide();

            /*
             * Ici doit ensuite être ouvert
             * le composant / popup formulaire mandat.
             */
        });
}
9. Deuxième appel : validation/modification du formulaire

Le document donne explicitement comme exemple :

voie
codePostal
localite
numContrat
fondementResiliation

avec :

fondementResiliation nécessaire uniquement hors Hamon

Donc on peut écrire sans inventer :

private getDataValidationMandat(): DataInModelInterface {

    const parameters: any = {

        voie:
            this.mandatData?.voie
            ?? this.Constantes.STRING_VIDE,

        codePostal:
            this.mandatData?.codePostal
            ?? this.Constantes.STRING_VIDE,

        localite:
            this.mandatData?.localite
            ?? this.Constantes.STRING_VIDE,

        numContrat:
            this.mandatData?.numContrat
            ?? this.Constantes.STRING_VIDE
    };

    /*
     * Le document indique explicitement :
     * fondementResiliation uniquement hors HAMON.
     *
     * On ne fabrique donc pas nous-mêmes
     * une règle "Hamon/Chatel".
     *
     * On l'envoie uniquement lorsqu'une valeur
     * existe réellement.
     */
    if (this.mandatData?.fondementResiliation) {

        parameters.fondementResiliation =
            this.mandatData.fondementResiliation;
    }

    return {

        idDossier:
            this.service.getCommunContexte().dossierId,

        resourceId:
            this.service.getCommunContexte().resourceId,

        parameters,

        screenkey:
            this.Constantes.SCREEN_GENERIC
    };
}

Puis :

public validerMandat(): void {

    this.spinner.show();

    this.service
        .appelMandatHab(
            this.getDataValidationMandat()
        )
        .subscribe(result => {

            if (
                !('message' in result)
                || result.message.type ===
                    this.Constantes.TYPE_MESSAGE_ERREUR
            ) {

                this.service.errorPopup(
                    result,
                    this.Constantes.AVENANT_COMPONENT,
                    'validerMandat'
                );

                this.spinner.hide();

                return;
            }

            if ('data' in result) {
                this.mandatData =
                    result.data;
            }

            this.spinner.hide();
        });
}
10. Troisième appel : envoyer le mandat + lettre

Ta documentation est très claire :

3ème appel envoiavthabmandat : pas de paramètre nécessaire.

Donc :

private getDataEnvoiMandat(): DataInModelInterface {

    return {

        idDossier:
            this.service.getCommunContexte().dossierId,

        resourceId:
            this.service.getCommunContexte().resourceId,

        parameters: {},

        screenkey:
            this.Constantes.SCREEN_GENERIC
    };
}

Et :

public envoyerMandat(): void {

    this.spinner.show();

    this.service
        .appelMandatHab(
            this.getDataEnvoiMandat()
        )
        .subscribe(result => {

            if (
                !('message' in result)
                || result.message.type ===
                    this.Constantes.TYPE_MESSAGE_ERREUR
            ) {

                this.service.errorPopup(
                    result,
                    this.Constantes.AVENANT_COMPONENT,
                    'envoyerMandat'
                );

                this.spinner.hide();

                return;
            }

            const edition =
                this.getEditionFromList(
                    this.Constantes
                        .HAB_EDITION_MANDAT_RESILIATION
                );

            if (edition) {

                edition.isEnvoyer = true;
                edition.isVoirPlus = true;

                /*
                 * La JIRA demande un bilan avec
                 * le nombre / nature des documents.
                 *
                 * Je ne construis PAS ici :
                 * "1 mandat commun..."
                 * car le retour backend permettant
                 * de déterminer commun/unitaire
                 * n'est pas fourni.
                 */
            }

            this.spinner.hide();
        });
}
11. Terminer : adaptation indispensable de la JIRA

Ton code actuel est :

public isTerminerDisabled() {
    return !(this.isSignatureEnvoye
        && this.listEditions.every(e => e.isVoirPlus));
}

La JIRA dit qu’à partir du moment où des documents doivent être envoyés, Terminer doit rester indisponible tant que l’envoi n’est pas effectué.

Donc je le rendrais explicite :

public isTerminerDisabled(): boolean {

    if (!this.isSignatureEnvoye) {
        return true;
    }

    /*
     * Une édition actuellement ouverte
     * empêche la finalisation.
     */
    if (
        this.listEditions.some(
            edition => !edition.isVoirPlus
        )
    ) {
        return true;
    }

    /*
     * Cas mandat de résiliation :
     * si l'édition existe,
     * elle doit avoir été envoyée.
     */
    const editionMandat =
        this.getEditionFromList(
            this.Constantes
                .HAB_EDITION_MANDAT_RESILIATION
        );

    if (
        editionMandat
        && !editionMandat.isEnvoyer
    ) {
        return true;
    }

    return false;
}
12. HTML du bloc mandat : ce que je peux écrire sans inventer

Dans ton gros bloc actuel qui contient :

<div *ngIf="isShow(code, Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE)">
...
</div>

<div *ngIf="isShow(code, Constantes.HAB_EDITION_ATTESTATION_HABITATION)">
...
</div>

<div *ngIf="isShow(code, Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE)">
...
</div>

tu peux ajouter :

<div
    *ngIf="
        isShow(
            code,
            Constantes.HAB_EDITION_MANDAT_RESILIATION
        )
    "
    class="document">

    <div class="bloc">

        <ng-container *ngIf="isMandatUnique()">

            <div class="ligne">
                <button
                    type="button"
                    class="chgt-link"
                    (click)="onClickCreerMandat()">

                    Créer le mandat

                </button>
            </div>

        </ng-container>


        <ng-container *ngIf="isMultiMandat()">

            <!--
                STOP volontaire ici.

                result.liste est bien disponible.

                Mais tu ne m'as pas encore fourni
                le JSON réel d'UN ELEMENT
                result.liste pour le cas G4EL.

                Je ne mets donc PAS :

                mandat.cadre
                mandat.usage
                mandat.statut
                mandat.nbPieces
                mandat.codePostal
                mandat.ville

                car ce seraient des propriétés inventées.
            -->

        </ng-container>

    </div>

</div>

Et c’est justement ici que je préfère m’arrêter plutôt que te donner du faux code.

Ce qui manque réellement pour que je puisse te donner le 100 % final copiable

Il ne manque qu’une information backend importante : le contenu réel de :

result.liste[0]

quand :

listeeditionhab
typeEdition = "Mandat de résiliation"

retourne le cas plusieurs mandats / écran G4EL.

Ta documentation dit bien :

cas un seul mandat
liste = []

cas plusieurs mandats
liste alimentée

mais elle ne montre pas le JSON d’un élément de cette liste.

Sans ça, je serais obligé d’inventer par exemple :

mandat.cadre
mandat.type
mandat.usage
mandat.statut
mandat.nbPieces
mandat.codePostal
mandat.ville
mandat.cle

et tu m’as précisément demandé de ne rien deviner.

Donc les corrections ci-dessus — normalisation listMandat, chargement via listeeditionhab, distinction liste vide/remplie, les trois appels envoiavthabmandat, absence de canal d’envoi et blocage de Terminer — sont fondées sur les éléments que tu as fournis. Pour terminer le HTML des cartes, la pop-in « mandat commun » et le payload de sélection sans aucune supposition, montre-moi simplement Network → Response de listeeditionhab pour un cas avec liste non vide. Ensuite je pourrai te donner les interfaces TypeScript et le HTML exacts, champ par champ, sans any et sans inventer.
