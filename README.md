Oui. Avec le nouveau besoin, il faut surtout retirer complètement le 3ᵉ appel d’envoi du mandat et considérer que le 2ᵉ appel = création + envoi du mandat + LR, puisque le back prend maintenant cette responsabilité.
J’ai aussi repris le problème que tu viens de trouver sur fondResil / motifResil, et le besoin récent disant que le panneau Mandat doit rester utilisable même lorsqu’un premier mandat a déjà été envoyé.
Dans ta base v3, le bloc devient aujourd’hui inactif parce que isActionDisabled() retourne directement edition.isEnvoyer; le HTML applique ensuite la classe disabled.   De même, le mécanisme générique d’envoi des documents part encore par appelEnvoiDocument(...) et le succès met isEnvoyer = true.  
Le nouveau parcours à obtenir
1. Créer un mandat / Recommencer un mandat déclenche le premier appel envoiavthabmandat. Ce premier appel prépare le formulaire, retourne les données du mandat et, lorsqu'elles sont encore disponibles, les PF4 fondResil et motifResil. La popup s'ouvre. L'utilisateur modifie le formulaire. Le clic Créer le mandat fait le deuxième appel avec les données du formulaire. Ce deuxième appel crée ET envoie désormais le mandat + lettre de résiliation. Il n'y a plus de troisième appel avec parameters: {}. Si le deuxième appel réussit, les risques concernés passent en état mandat créé/envoyé, la case orange apparaît, Créer le mandat devient Gérer le mandat, la LR devient cochée et le bilan est mis à jour. Le panneau peut se replier, mais il doit rester cliquable et réouvrable. Les autres risques non créés continuent d'afficher Créer le mandat. Un mandat déjà créé peut être recommencé. En cas d'échec du deuxième appel, on ne change aucun état front. Pour une recréation échouée, l'ancien mandat reste considéré comme existant. Enfin, fondResil et motifResil doivent être mémorisés lors du premier appel qui les fournit, parce que le worker ne les renvoie pas obligatoirement lors d'une recréation.
Les attestations, l'ACR et VBI ne doivent pas être modifiés par ce changement de contrat mandat.
1. chgtadrhab.service.ts — ajouter le cache PF4
Tu as déjà un fichier mandat-pf4.model.interface.ts. Utilise son vrai chemin d'import.
Ajoute dans ChgtadrhabService :
import {
    MandatPf4ModelInterface
} from '../models/mandat-pf4.model.interface';

Puis dans la classe :
interface MandatPf4Cache {
    fondResil: MandatPf4ModelInterface[];
    motifResil: MandatPf4ModelInterface[];
}

Si TypeScript n'accepte pas l'interface au milieu de ton fichier, mets-la avant @Injectable.
Dans ChgtadrhabService :
private readonly mandatPf4Cache:
    Map<string, MandatPf4Cache> =
    new Map<string, MandatPf4Cache>();


private getMandatPf4CacheKey(cadreCcr: string): string {

    const contexte = this.getCommunContexte();

    return [
        contexte.dossierId ?? '',
        contexte.resourceId ?? '',
        cadreCcr ?? ''
    ].join('|');
}


public memoriserMandatPf4(
    cadreCcr: string,
    fondResil?: MandatPf4ModelInterface[],
    motifResil?: MandatPf4ModelInterface[]
): void {

    const key = this.getMandatPf4CacheKey(cadreCcr);

    const cacheExistant: MandatPf4Cache =
        this.mandatPf4Cache.get(key) ?? {
            fondResil: [],
            motifResil: []
        };

    /*
     * IMPORTANT :
     * une liste vide lors d'une recréation ne doit PAS
     * écraser la liste récupérée au premier appel.
     */
    if (Array.isArray(fondResil) && fondResil.length > 0) {
        cacheExistant.fondResil = fondResil.map(item => ({
            ...item
        }));
    }

    if (Array.isArray(motifResil) && motifResil.length > 0) {
        cacheExistant.motifResil = motifResil.map(item => ({
            ...item
        }));
    }

    this.mandatPf4Cache.set(
        key,
        cacheExistant
    );
}


public getMandatFondResil(
    cadreCcr: string
): MandatPf4ModelInterface[] {

    const key = this.getMandatPf4CacheKey(cadreCcr);

    return (
        this.mandatPf4Cache.get(key)?.fondResil ?? []
    ).map(item => ({
        ...item
    }));
}


public getMandatMotifResil(
    cadreCcr: string
): MandatPf4ModelInterface[] {

    const key = this.getMandatPf4CacheKey(cadreCcr);

    return (
        this.mandatPf4Cache.get(key)?.motifResil ?? []
    ).map(item => ({
        ...item
    }));
}


public clearMandatPf4Cache(): void {
    this.mandatPf4Cache.clear();
}

Le fait de mettre dossierId + resourceId + cadreCcr dans la clé évite de récupérer accidentellement les PF4 d'un autre dossier ou d'un autre cadre.
2. popup-mandat-resiliation.component.ts
Le bug actuel est ici :
this.fondResil = Array.isArray(this.mandat.fondResil)
    ? this.mandat.fondResil
    : [];

this.motifResil = Array.isArray(this.mandat.motifResil)
    ? this.mandat.motifResil
    : [];

À supprimer.
Remplace ton ngOnInit() par ceci
public ngOnInit(): void {

    const data =
        this.dialogData.result.data
        as MandatDataModelInterface;

    this.mandat = {
        ...data
    };

    const cadreCcr: string =
        this.mandat.cadreCcr ?? '';

    /*
     * HAMON :
     * le bloc résiliation n'est pas affiché.
     *
     * Donc inutile de charger fondResil / motifResil.
     */
    if (!this.afficherBlocResiliation()) {

        this.fondResil = [];
        this.motifResil = [];

        return;
    }

    /*
     * Si le backend renvoie les PF4 :
     * on les conserve.
     *
     * Premier appel worker normalement.
     */
    this.service.memoriserMandatPf4(
        cadreCcr,
        Array.isArray(data.fondResil)
            ? data.fondResil
            : undefined,
        Array.isArray(data.motifResil)
            ? data.motifResil
            : undefined
    );

    /*
     * Premier passage :
     * utilisation de la réponse backend.
     *
     * Recréation :
     * si le backend ne renvoie plus les PF4,
     * récupération du cache.
     */
    this.fondResil =
        Array.isArray(data.fondResil)
        && data.fondResil.length > 0

            ? data.fondResil.map(item => ({
                ...item
            }))

            : this.service.getMandatFondResil(
                cadreCcr
            );


    this.motifResil =
        Array.isArray(data.motifResil)
        && data.motifResil.length > 0

            ? data.motifResil.map(item => ({
                ...item
            }))

            : this.service.getMandatMotifResil(
                cadreCcr
            );
}

Cela corrige ton bug :
première création
→ PF4 reçus
→ cache

recréation
→ PF4 absents
→ récupération du cache

Et surtout on ne fait plus :
: [];

automatiquement lorsqu'ils ne sont pas renvoyés.
3. Le gros changement : le bouton Créer le mandat
Avant, tu avais conceptuellement :
appel 1
→ ouverture formulaire

appel 2
→ modification/création

appel 3
→ parameters: {}
→ envoi mandat + LR

Maintenant il faut :
appel 1
→ ouverture formulaire

appel 2
→ création + envoi mandat + LR
→ terminé

Donc le 3ᵉ appel doit disparaître complètement.
Dans PopupMandatResiliationComponent, importe si nécessaire :
import { finalize } from 'rxjs';

Je te conseille que les données d'ouverture de la popup contiennent aussi :
export type MandatMode =
    'unitaire'
    | 'commun';


export interface PopupMandatResiliationData {

    result: DataOutChgtadrhabModelInterface;

    mode: MandatMode;

    riskKeys: number[];
}


export interface PopupMandatResiliationResult {

    success: boolean;

    mode: MandatMode;

    riskKeys: number[];
}

Puis ton injection :
constructor(
    @Inject(MAT_DIALOG_DATA)
    public dialogData: PopupMandatResiliationData,

    private readonly dialogRef:
        MatDialogRef<PopupMandatResiliationComponent>,

    public readonly service: ChgtadrhabService,

    private readonly spinner: NgxSpinnerService,

    private readonly dialogCalendrier: MatDialog
) {
}

Adapte uniquement les injections déjà présentes dans ton fichier.
4. Méthode complète appelée par « Créer le mandat »
Le point central est celui-ci.
public onClickCreerMandat(): void {

    if (
        this.loading
        || !this.isFormulaireValide()
    ) {
        return;
    }

    this.loading = true;
    this.spinner.show();

    const dataIn:
        DataInModelInterface =
        this.getDataCreationEtEnvoiMandat();

    /*
     * NOUVEAU CONTRAT BACK :
     *
     * ce deuxième appel :
     * - valide les informations
     * - crée le mandat
     * - envoie le mandat
     * - envoie la LR
     *
     * PAS DE TROISIÈME APPEL.
     */
    this.service
        .envoiAvenantMandat(dataIn)
        .pipe(
            finalize(() => {

                this.loading = false;
                this.spinner.hide();
            })
        )
        .subscribe({

            next: result => {

                if (
                    !this.isMandatResponseOK(
                        result
                    )
                ) {

                    this.service.errorPopup(
                        result,
                        this.Constantes.AVENANT_COMPONENT,
                        'creationEtEnvoiMandat'
                    );

                    return;
                }

                /*
                 * On ferme uniquement après
                 * création + envoi réussis.
                 */
                this.dialogRef.close({
                    success: true,
                    mode: this.dialogData.mode,
                    riskKeys:
                        this.dialogData.riskKeys
                } as PopupMandatResiliationResult);
            },

            error: error => {

                this.service.errorPopup(
                    error,
                    this.Constantes.AVENANT_COMPONENT,
                    'creationEtEnvoiMandat'
                );
            }
        });
}

Et le contrôle de succès :
private isMandatResponseOK(
    result:
        DataOutChgtadrhabModelInterface
        | ErrorModelInterface
): result is DataOutChgtadrhabModelInterface {

    if (!result) {
        return false;
    }

    if (!('message' in result)) {
        return false;
    }

    /*
     * Le métier nous avait indiqué :
     * si ce n'est pas une exception / erreur,
     * on considère l'opération OK.
     *
     * Donc ne bloque pas uniquement parce que
     * le message est de type information.
     */
    return result.message?.type
        !== this.Constantes.TYPE_MESSAGE_ERREUR;
}

5. Payload du deuxième appel
Tu dois conserver le même payload que celui que tu envoies actuellement au deuxième appel.
Par exemple :
private getDataCreationEtEnvoiMandat():
    DataInModelInterface {

    const parameters: any = {

        civilite:
            this.mandat.civilite,

        nom:
            this.mandat.nom,

        prenom:
            this.mandat.prenom,

        nomAssureur:
            this.mandat.nomAssureur,

        designation:
            this.mandat.designation,

        distribution:
            this.mandat.distribution,

        voie:
            this.mandat.voie,

        lieuDit:
            this.mandat.lieuDit,

        localite:
            this.mandat.localite,

        codePostal:
            this.mandat.codePostal,

        validation:
            this.mandat.validation,

        numContrat:
            this.mandat.numContrat
    };


    /*
     * HAMON :
     * ces champs n'apparaissent pas
     * et ne doivent donc pas être envoyés.
     */
    if (this.afficherBlocResiliation()) {

        parameters.fondementResiliation =
            this.mandat.fondementResiliation;

        parameters.motif =
            this.mandat.motif;

        if (this.mandat.dateEvt) {

            /*
             * Garde ici la conversion date
             * déjà utilisée dans ton code actuel
             * si le worker attend AAAA-MM-JJ.
             */
            parameters.dateEvt =
                this.mandat.dateEvt;
        }
    }


    return {

        idDossier:
            this.service
                .getCommunContexte()
                .dossierId,

        resourceId:
            this.service
                .getCommunContexte()
                .resourceId,

        parameters,

        screenkey:
            this.Constantes.SCREEN_GENERIC
    };
}

Important : ne remplace pas une conversion de date qui marche déjà chez toi. Sur tes traces réseau précédentes, le backend recevait notamment dateEvt au format worker. Si ton code actuel transforme JJ/MM/AAAA en AAAA-MM-JJ, garde cette transformation.
6. Supprimer le troisième appel
Tu m'avais montré une méthode du genre :
private gereEnvoiMandatDocuments(): void {
    ...
}

Elle servait à faire l'ancien appel final d'envoi.
Supprime son appel.
Si elle n'est utilisée nulle part ailleurs, supprime également toute la méthode.
Il ne doit plus rester quelque chose comme :
this.service.envoiAvenantMandat({
    ...
    parameters: {}
})

après le succès du deuxième appel.
C'est précisément ce qui ramène le parcours de 3 appels à 2 appels.
7. chgtadrhab-avenant.component.ts — le panneau mandat ne doit plus être désactivé
Remplace :
public isActionDisabled(code: string) {
    return this.getEditionFromList(code)!.isEnvoyer;
}

par :
public isActionDisabled(
    code: string
): boolean {

    /*
     * Le bloc mandat reste toujours accessible :
     *
     * - création d'un autre mandat
     * - recréation unitaire
     * - recréation commune
     */
    if (
        code ===
        this.Constantes
            .HAB_EDITION_MANDAT_RESILIATION
    ) {
        return false;
    }

    /*
     * Comportement historique conservé
     * pour les autres documents.
     */
    return this.getEditionFromList(code)
        ?.isEnvoyer === true;
}

C'est une modification essentielle.
Tu peux donc continuer à faire :
edition.isEnvoyer = true;

pour mémoriser qu'au moins un mandat a été envoyé et afficher le bilan.
Mais ça ne grise plus le panneau mandat.
8. Sécuriser l'ancien envoi générique
Puisque l'envoi est maintenant intégré à la création, le mandat ne doit plus passer par gereEnvoiDocument().
Remplace le début de cette méthode par :
private gereEnvoiDocument(
    code: string
): void {

    /*
     * Sécurité :
     * le mandat n'utilise plus
     * l'envoi générique des documents.
     *
     * L'envoi est effectué par le deuxième
     * appel envoiAvenantMandat.
     */
    if (
        code ===
        this.Constantes
            .HAB_EDITION_MANDAT_RESILIATION
    ) {
        this.spinner.hide();
        return;
    }

    const url =
        this.Converter.getTranscoLibelle(
            this.Constantes
                .TRANSCO_HAB_EDITION_DOCUMENT_URL,
            code,
            this.Constantes.STRING_VIDE
        );

    if (
        url ===
        this.Constantes.STRING_VIDE
    ) {
        this.spinner.hide();
        return;
    }

    this.service
        .appelEnvoiDocument(
            url,
            this.getDataEnvoiDocument(code)
        )
        .subscribe(result => {

            if (
                this.isEnvoiDocumentOK(
                    code,
                    result
                )
            ) {

                this.gereEnvoiDocumentOK(
                    code,
                    result
                        as DataOutChgtadrhabModelInterface
                );

            } else {

                this.gereEnvoiDocumentKO(
                    result
                );
            }
        });
}

Ainsi, même si quelqu'un remet accidentellement le bouton dans le HTML, tu ne feras pas un deuxième envoi.
9. Même sécurité dans isEnvoiDocumentDisabled()
Remplace par :
public isEnvoiDocumentDisabled(
    code: string
): boolean {

    /*
     * Plus de bouton "Envoyer les documents"
     * pour le mandat.
     */
    if (
        code ===
        this.Constantes
            .HAB_EDITION_MANDAT_RESILIATION
    ) {
        return true;
    }

    const edition =
        this.getEditionFromList(code);

    return !(
        !edition!.isEnvoyer

        && edition!.canalEnvoi
            !== this.Constantes.STRING_VIDE

        && (
            code !==
            this.Constantes
                .HAB_EDITION_ATTESTATION_SCOLAIRE

            || this.listEnfants
                .some(e => e.selection)
        )

        && (
            code !==
            this.Constantes
                .HAB_EDITION_ATTESTATION_HABITATION

            || this.listHabitations
                .some(h => h.selection)
        )

        && (
            code !==
            this.Constantes
                .HAB_EDITION_ATTESTATION_RC_LOCATIVE

            || this.listLocations
                .some(l => l.selection)
        )

        && (
            code !==
            this.Constantes
                .HAB_EDITION_ACR_SUPPRESSION_HABITATION

            || this.listAcrSuppressionHab
                .some(h => h.selection)
        )
    );
}

Les attestations et l'ACR gardent donc exactement leur comportement actuel.
10. Après fermeture de la popup : mettre à jour le front
Dans ta méthode actuelle ouvrirMandat(...), tu fais le premier appel puis tu ouvres PopupMandatResiliationComponent.
Le afterClosed() doit maintenant ressembler à cela :
dialogRef
    .afterClosed()
    .subscribe(
        (
            retour:
                PopupMandatResiliationResult
                | undefined
        ) => {

            if (
                !retour
                || !retour.success
            ) {
                return;
            }

            /*
             * IMPORTANT :
             *
             * appelle ici ta logique ACTUELLE
             * qui alimente :
             *
             * - isMandatCree(risque)
             * - etat.riskKeys
             * - mandat commun/unitaire
             *
             * Cette logique fonctionnait déjà
             * dans ton dernier code.
             */
            this.marquerMandatCree(
                retour.riskKeys,
                retour.mode
            );

            /*
             * Plus besoin d'appeler :
             *
             * gereEnvoiMandatDocuments()
             *
             * puisque le back vient déjà
             * de créer + envoyer.
             */
            this.gereMandatCreeEtEnvoyeOK();
        }
    );

Et ajoute/remplace :
private gereMandatCreeEtEnvoyeOK():
    void {

    const edition =
        this.getEditionFromList(
            this.Constantes
                .HAB_EDITION_MANDAT_RESILIATION
        );

    if (!edition) {
        return;
    }

    /*
     * Cela permet toujours d'afficher
     * le bilan / coche verte du récap.
     *
     * MAIS isActionDisabled() retourne false
     * pour le mandat, donc le bloc reste
     * accessible.
     */
    edition.isEnvoyer = true;

    /*
     * Tu peux le replier après création.
     * L'utilisateur pourra le rouvrir.
     *
     * Cela conserve également ton fonctionnement
     * actuel du bouton Terminer.
     */
    edition.isVoirPlus = true;

    /*
     * Tu avais déjà cette méthode
     * dans ton dernier code.
     */
    edition.bilanEnvoi =
        this.getBilanEnvoiMandat();

    this.mandatMenuCle = null;

    this.spinner.hide();
}

Donc l'ancien :
gereEnvoiMandatDocuments();

disparaît.
11. Très important : ne change pas l'état avant le succès back
Pour une recréation, ne fais surtout pas :
this.supprimerEtatMandat(risque);

avant le deuxième appel.
Exemple :
mandat existant
→ Recommencer le mandat
→ deuxième appel KO

Le mandat précédent existe toujours.
Donc l'état orange doit rester.
La bonne règle est :
avant appel :
conserver état actuel

appel OK :
remplacer / mettre à jour état

appel KO :
ne rien modifier

12. listMandat : conserve la correction précédente
Pour le cas où le backend retourne :
"listMandat": []

mais où le front construit le mandat unique depuis le contexte, ton isLoadDataOK() ne doit pas demander length > 0.
Il faut garder :
case this.Constantes
    .HAB_EDITION_MANDAT_RESILIATION:

    return 'listMandat' in result.data
        && Array.isArray(
            result.data.listMandat
        );

Puis :
case this.Constantes
    .HAB_EDITION_MANDAT_RESILIATION:

    if (
        'listMandat' in result.data
        && Array.isArray(
            result.data.listMandat
        )
        && result.data.listMandat.length > 0
    ) {

        this.listMandats =
            (
                result.data.listMandat
                as MandatRisqueModelInterface[]
            )
            .map(risque => ({
                ...risque,
                selection: false
            }));

        return;
    }

    /*
     * Cas mandat construit côté front.
     */
    this.initialiserMandatUniqueDepuisContexte();

    break;

Ça, il ne faut pas le casser avec le nouveau besoin.
13. Le HTML du mandat : ne plus utiliser else mandatEnvoye
Le bloc mandat doit être affiché même si :
edition.isEnvoyer === true

Donc ne fais plus :
<ng-container
    *ngIf="!isDocumentEnvoye(code);
           else mandatEnvoye">

pour la partie mandat.
Il faut directement :
<div
    *ngIf="
        isShow(
            code,
            Constantes.HAB_EDITION_MANDAT_RESILIATION
        )
    "
    class="document edition-mandat">

    <!-- BANDEAU MANDAT COMMUN -->

    <div
        class="mandat-commun-info"
        *ngIf="listMandats.length > 1">

        <div class="mandat-commun-text">
            Veuillez créer un seul mandat
            si plusieurs risques émanent
            d'un même assureur, même cadre,
            même statut et même numéro de contrat.
        </div>

        <button
            type="button"
            class="
                mandat-link
                mandat-common-action
            "
            [disabled]="
                !peutCreerNouveauMandatCommun()
            "
            (click)="
                ouvrirPopupMandatCommun()
            ">

            Créer un mandat commun

        </button>
    </div>


    <!-- RISQUES -->

    <div class="mandat-risks">

        <div
            class="mandat-risk"
            *ngFor="
                let risque of listMandats
            "
            [class.mandat-risk-created]="
                isMandatCree(risque)
            ">

            <div class="mandat-risk-header">

                <div class="mandat-risk-title">

                    <!-- CASE ORANGE -->
                    <input
                        *ngIf="
                            isMandatCree(risque)
                        "
                        class="mandat-created-check"
                        type="checkbox"
                        checked
                        disabled>

                    <span
                        class="
                            mandat-risk-cadre
                        ">
                        {{
                            getCadreMandatLib(
                                risque.cadreCcr
                            )
                        }}
                    </span>

                </div>


                <!--
                    NON CRÉÉ :
                    "Créer le mandat"

                    CRÉÉ :
                    "Gérer le mandat"
                -->
                <button
                    type="button"
                    class="mandat-link"
                    (click)="
                        onClickActionMandat(
                            risque
                        )
                    ">

                    {{
                        getMandatActionLib(
                            risque
                        )
                    }}

                </button>

            </div>


            <div class="mandat-risk-content">

                <!--
                    Garde ici ton affichage actuel :
                    icon + type + usage/statut/pièces
                    + CP/ville
                -->

            </div>


            <!-- MENU GÉRER LE MANDAT -->

            <div
                class="mandat-action-menu"
                *ngIf="
                    isMandatCree(risque)
                    &&
                    mandatMenuCle === risque.cle
                ">

                <button
                    type="button"
                    (click)="
                        recreerMandatUnitaire(
                            risque
                        )
                    ">
                    Recommencer le mandat unitaire
                </button>

                <button
                    type="button"
                    *ngIf="
                        peutRecreerMandatCommun(
                            risque
                        )
                    "
                    (click)="
                        recreerMandatCommun(
                            risque
                        )
                    ">
                    Recommencer le mandat commun
                </button>

            </div>

        </div>
    </div>


    <!-- LR AUTOMATIQUE -->

    <div
        class="
            mandat-lettre-resiliation
        ">

        <input
            type="checkbox"
            [checked]="hasMandatCree()"
            disabled>

        <span>
            Lettres de résiliation
        </span>

    </div>


    <!--
        SUPPRIMÉ :

        <button>
            Envoyer les documents
        </button>

        L'ENVOI EST MAINTENANT
        EFFECTUÉ DANS CRÉER LE MANDAT.
    -->

</div>

14. Créer un autre mandat après un premier mandat envoyé
Ajoute par exemple :
public hasMandatCree(): boolean {

    return this.listMandats.some(
        risque =>
            this.isMandatCree(risque)
    );
}


public peutCreerNouveauMandatCommun():
    boolean {

    const risquesNonCrees =
        this.listMandats.filter(
            risque =>
                !this.isMandatCree(risque)
        );

    /*
     * Au moins deux candidats.
     *
     * Les règles :
     * même assureur
     * même cadre
     * même statut
     * même contrat
     *
     * restent vérifiées dans ta popup
     * de mandat commun.
     */
    return risquesNonCrees.length >= 2;
}

Quand tu ouvres une nouvelle création commune, je te conseille également de ne montrer que les risques qui n'ont pas encore de mandat :
public ouvrirPopupMandatCommun(
    clesPreselectionnees: number[] = []
): void {

    const isRecreation =
        clesPreselectionnees.length > 0;

    const risquesDisponibles =
        isRecreation

            /*
             * RECRÉATION COMMUNE :
             * reprendre le groupe existant.
             */
            ? this.listMandats.filter(
                risque =>
                    clesPreselectionnees
                        .includes(
                            Number(risque.cle)
                        )
            )

            /*
             * NOUVEAU MANDAT COMMUN :
             * seulement les risques
             * pas encore créés.
             */
            : this.listMandats.filter(
                risque =>
                    !this.isMandatCree(
                        risque
                    )
            );


    const dialogRef =
        this.dialog.open(
            PopupMandatCommunComponent,
            {
                width: '760px',
                maxWidth: '95vw',
                disableClose: true,

                data: {

                    risques:
                        risquesDisponibles,

                    clesPreselectionnees
                }
            }
        );


    dialogRef
        .afterClosed()
        .subscribe(
            (
                risques:
                    MandatRisqueModelInterface[]
                    | undefined
            ) => {

                if (
                    !risques
                    || risques.length < 2
                ) {
                    return;
                }

                this.ouvrirMandat(
                    risques,
                    'commun'
                );
            }
        );
}

15. SCSS : la case orange doit réellement être une checkbox
Tu avais auparavant obtenu un simple carré orange.
Utilise :
.mandat-created-check {
    appearance: none;
    -webkit-appearance: none;

    width: 18px;
    height: 18px;

    flex: 0 0 18px;

    margin: 0 6px 0 0;

    border: 1px solid #cc4c00;
    border-radius: 3px;

    background: #cc4c00;

    position: relative;

    opacity: 1;

    cursor: default;
}

.mandat-created-check:checked::after {
    content: '✓';

    position: absolute;

    left: 50%;
    top: 50%;

    transform:
        translate(-50%, -54%);

    color: #ffffff;

    font-size: 14px;
    font-weight: 700;

    line-height: 1;
}

.mandat-created-check:disabled {
    opacity: 1;
}

Et le panneau mandat ne doit jamais recevoir :
pointer-events: none;
opacity: 0.5;

après envoi.
Ce qui doit être supprimé de ton code
Fais une recherche projet sur ces anciens éléments :
gereEnvoiMandatDocuments
envoyerMandat3
parameters: {}
onClickEnvoiDocument(...HAB_EDITION_MANDAT_RESILIATION...)

L'ancien troisième appel ne doit plus exister dans le parcours mandat.
En revanche, ne supprime surtout pas :
appelEnvoiDocument(...)
gereEnvoiDocument(...)

globalement, parce qu'ils servent encore aux attestations et à l'ACR.
Résultat final attendu
Scénario	Résultat front
Premier mandat non créé	Créer le mandat
1er appel OK	ouverture formulaire
2e appel OK	mandat créé + envoyé, LR envoyée
2e appel KO	rien n'est marqué créé
Mandat créé	case orange + Gérer le mandat
Autre risque non créé	reste Créer le mandat
Bloc mandat déjà envoyé	reste actif et réouvrable
Recréer unitaire	1er appel + formulaire + 2e appel
Recréer commun	même parcours, groupe concerné
Recréation KO	ancien mandat reste présent
Au moins 1 mandat réussi	LR automatiquement cochée
Nouveau mandat réussi	bilan mis à jour
Envoyer les documents mandat	supprimé
Attestation / ACR	parcours actuel inchangé
Recréation sans PF4	récupération de fondResil / motifResil depuis cache


Le point le plus important est donc : edition.isEnvoyer = true peut rester pour le bilan, mais ne doit plus signifier “bloc mandat verrouillé”. Pour le mandat, l'état d'envoi et l'autorisation d'interagir sont maintenant deux choses différentes.
