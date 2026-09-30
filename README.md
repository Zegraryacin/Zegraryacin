Oui. Avec ce nouveau besoin, il faut combiner proprement trois comportements sans casser ce qu’on a déjà fait :
- fondResil / motifResil ne sont pas forcément renvoyés lors d’une recréation → on les met en cache.
- après une exception métier, le prochain clic envoie {} si l’utilisateur n’a rien modifié, ou tous les champs si le formulaire est dirty.
- si cette exception contient data, on réinjecte immédiatement ces données dans this.mandat pour rafraîchir les champs affichés.
Il y a un détail très important dans ta dernière capture : la réponse que tu montres contient message.type: "I" et pourtant c’est une réponse intermédiaire du worker avec des données à reprendre. Donc ne code pas “exception = type E uniquement”. Il faut te baser sur ta règle de fin de transaction actuelle : si ce n’est pas la réponse finale OK, c’est une réponse métier intermédiaire/exception à traiter.
1. chgtadrhab.service.ts — cache des listes PF4
Le cache doit être dans le service et non dans la popup, sinon il disparaît lorsque tu fermes la popup puis fais « Recommencer le mandat ».
J’utilise MandatPf4ModelInterface ci-dessous car tu as déjà le fichier mandat-pf4.model.interface.ts. Adapte seulement le chemin de l’import si nécessaire.
import { MandatPf4ModelInterface } from '../models/mandat-pf4.model.interface';

interface MandatPf4Cache {
    fondResil: MandatPf4ModelInterface[];
    motifResil: MandatPf4ModelInterface[];
}

Dans ChgtadrhabService ajoute :
private readonly mandatPf4Cache:
    Map<string, MandatPf4Cache> =
    new Map<string, MandatPf4Cache>();


private getMandatPf4CacheKey(
    cadreCcr: string
): string {

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

    const key =
        this.getMandatPf4CacheKey(cadreCcr);

    const cache:
        MandatPf4Cache =
        this.mandatPf4Cache.get(key) ?? {
            fondResil: [],
            motifResil: []
        };


    /*
     * Très important :
     *
     * une liste [] renvoyée pendant une recréation
     * ne doit PAS écraser la liste PF4 mémorisée
     * lors du premier appel.
     */
    if (
        Array.isArray(fondResil)
        && fondResil.length > 0
    ) {

        cache.fondResil =
            fondResil.map(item => ({
                ...item
            }));
    }


    if (
        Array.isArray(motifResil)
        && motifResil.length > 0
    ) {

        cache.motifResil =
            motifResil.map(item => ({
                ...item
            }));
    }


    this.mandatPf4Cache.set(
        key,
        cache
    );
}


public getMandatFondResil(
    cadreCcr: string
): MandatPf4ModelInterface[] {

    const key =
        this.getMandatPf4CacheKey(cadreCcr);

    return (
        this.mandatPf4Cache.get(key)
            ?.fondResil
        ?? []
    ).map(item => ({
        ...item
    }));
}


public getMandatMotifResil(
    cadreCcr: string
): MandatPf4ModelInterface[] {

    const key =
        this.getMandatPf4CacheKey(cadreCcr);

    return (
        this.mandatPf4Cache.get(key)
            ?.motifResil
        ?? []
    ).map(item => ({
        ...item
    }));
}

Ici, si le premier appel donne les PF4, ils sont sauvegardés. Si « Recommencer le mandat » retourne ensuite seulement les données du mandat sans les listes, tu récupères les listes précédentes.
2. Donne explicitement cadreCcr à la popup
Dans ton ChgtadrhabAvenantComponent, au moment d’ouvrir PopupMandatResiliationComponent, je te conseille de passer le cadre.
Par exemple dans ouvrirMandat(...) :
const cadreCcr: string =
    risques.length > 0
        ? risques[0].cadreCcr ?? ''
        : '';

const dialogRef =
    this.dialog.open(
        PopupMandatResiliationComponent,
        {
            width: '...',
            disableClose: true,

            data: {
                result,
                mode,
                riskKeys:
                    risques.map(
                        risque =>
                            Number(risque.cle)
                    ),
                cadreCcr
            }
        }
    );

Et ton interface de données popup :
export interface PopupMandatResiliationData {
    result: DataOutChgtadrhabModelInterface;
    mode: 'unitaire' | 'commun';
    riskKeys: number[];
    cadreCcr: string;
}

Cela évite de dépendre du fait que cadreCcr soit ou non renvoyé dans chaque réponse worker.
3. popup-mandat-resiliation.component.html
Pour utiliser dirty, il te faut ton NgForm.
Au niveau du formulaire :
<form
    #mandatForm="ngForm"
    class="mandat-resiliation-popup"
    novalidate>

    <!-- ton HTML existant -->

</form>

Tous les champs modifiables avec [(ngModel)] doivent avoir un name.
Exemple :
<input
    id="mandatVoie"
    name="mandatVoie"
    type="text"
    [(ngModel)]="mandat.voie">

<input
    id="mandatLocalite"
    name="mandatLocalite"
    type="text"
    [(ngModel)]="mandat.localite">

<select
    id="mandatFondement"
    name="mandatFondement"
    [(ngModel)]="mandat.fondementResiliation">

    <option
        *ngFor="let fondement of fondResil"
        [value]="fondement.cle">

        {{ fondement.libelle }}

    </option>

</select>

<select
    id="mandatMotif"
    name="mandatMotif"
    [(ngModel)]="mandat.motif">

    <option
        *ngFor="let motif of motifResil"
        [value]="motif.cle">

        {{ motif.libelle }}

    </option>

</select>

Les champs Nom / Prénom qui sont disabled peuvent rester disabled.
4. popup-mandat-resiliation.component.ts — imports
Ajoute :
import {
    ViewChild
} from '@angular/core';

import {
    NgForm
} from '@angular/forms';

import {
    finalize
} from 'rxjs/operators';

Puis dans la classe :
@ViewChild('mandatForm')
private mandatForm!: NgForm;


/**
 * true uniquement après une réponse
 * intermédiaire / exception du worker.
 */
private retryApresException:
    boolean = false;

5. Remplace ton ngOnInit() actuel
Tu as aujourd’hui quelque chose comme :
public ngOnInit(): void {

    const data =
        this.dialogData.result.data
        as MandatDataModelInterface;

    this.mandat = {
        ...data
    };

    this.fondResil =
        Array.isArray(
            this.mandat.fondResil
        )
            ? this.mandat.fondResil
            : [];

    this.motifResil =
        Array.isArray(
            this.mandat.motifResil
        )
            ? this.mandat.motifResil
            : [];
}

Remplace complètement par :
public ngOnInit(): void {

    const data =
        this.dialogData.result.data
        as MandatDataModelInterface;

    this.mandat = {
        ...data
    };


    /*
     * Premier appel :
     *
     * si les listes PF4 sont présentes,
     * on les mémorise.
     */
    this.memoriserPf4DepuisData(
        data
    );


    /*
     * On résout ensuite les listes :
     *
     * réponse courante si présentes,
     * sinon cache du premier appel.
     */
    this.chargerListesPf4(
        data
    );
}

Ajoute les deux méthodes suivantes.
private memoriserPf4DepuisData(
    data: Partial<MandatDataModelInterface>
): void {

    this.service.memoriserMandatPf4(
        this.getCadreCcrMandat(),

        Array.isArray(data.fondResil)
            ? data.fondResil
            : undefined,

        Array.isArray(data.motifResil)
            ? data.motifResil
            : undefined
    );
}


private chargerListesPf4(
    data?: Partial<MandatDataModelInterface>
): void {

    const cadreCcr =
        this.getCadreCcrMandat();


    /*
     * fondResil
     */
    if (
        Array.isArray(data?.fondResil)
        && data!.fondResil!.length > 0
    ) {

        this.fondResil =
            data!.fondResil!.map(
                item => ({
                    ...item
                })
            );

    } else {

        this.fondResil =
            this.service
                .getMandatFondResil(
                    cadreCcr
                );
    }


    /*
     * motifResil
     */
    if (
        Array.isArray(data?.motifResil)
        && data!.motifResil!.length > 0
    ) {

        this.motifResil =
            data!.motifResil!.map(
                item => ({
                    ...item
                })
            );

    } else {

        this.motifResil =
            this.service
                .getMandatMotifResil(
                    cadreCcr
                );
    }
}

Et :
private getCadreCcrMandat(): string {

    return this.mandat?.cadreCcr
        ?? this.dialogData.cadreCcr
        ?? '';
}

6. Nouvelle méthode importante : appliquer result.data en cas d’exception
C’est la nouvelle demande métier.
Dans ton exemple, le backend te renvoie :
{
    "data": {
        "voie": "49 RUE DE LA GARE",
        "fondementResiliation": "ECH",
        "localite": "PLAISIR CEDEX",
        "numContrat": "AX01241",
        "codePostal": "78374",
        "nomAssureur": "AXA FRANCE IARD",
        "distribution": "",
        "nom": "ETIENNE",
        "lieuDit": "",
        "dateEvt": "",
        "designation": "",
        "motif": "",
        "prenom": "SHUI",
        "validation": "O",
        "civilite": "M"
    }
}

Donc après cette réponse, le formulaire doit afficher par exemple :
localite = PLAISIR CEDEX
codePostal = 78374
validation = O
fondementResiliation = ECH
...

Ajoute :
private appliquerDataExceptionMandat(
    data:
        Partial<MandatDataModelInterface>
        | undefined
        | null
): void {

    if (
        !data
        || typeof data !== 'object'
        || Object.keys(data).length === 0
    ) {
        return;
    }


    /*
     * Si exceptionnellement cette réponse
     * contient aussi les PF4,
     * on les mémorise.
     */
    this.memoriserPf4DepuisData(
        data
    );


    /*
     * ATTENTION :
     *
     * on ne doit pas laisser
     * fondResil: []
     * ou motifResil: []
     * écraser les listes mémorisées.
     */
    const {
        fondResil,
        motifResil,
        ...dataMandat
    } = data;


    /*
     * On MERGE et on ne remplace pas
     * entièrement le mandat.
     *
     * Ainsi les propriétés absentes
     * dans la réponse restent présentes.
     *
     * Les chaînes vides venant du backend
     * sont bien appliquées.
     */
    this.mandat = {

        ...this.mandat,

        ...dataMandat

    } as MandatDataModelInterface;


    /*
     * Réapplique ensuite les listes PF4
     * correctes.
     */
    this.chargerListesPf4(
        data
    );


    /*
     * Si fondResil / motifResil font partie
     * également de MandatDataModelInterface,
     * on peut garder le modèle cohérent.
     */
    this.mandat.fondResil =
        this.fondResil;

    this.mandat.motifResil =
        this.motifResil;
}

Grâce au :
this.mandat = {
    ...this.mandat,
    ...dataMandat
};

Angular rafraîchira automatiquement les champs liés avec :
[(ngModel)]="mandat.localite"

etc.
7. Détecter si la réponse contient réellement data
Ajoute :
private hasMandatData(
    result:
        DataOutChgtadrhabModelInterface
        | ErrorModelInterface
): result is DataOutChgtadrhabModelInterface {

    if (!result) {
        return false;
    }

    if (!('data' in result)) {
        return false;
    }

    if (
        !result.data
        || typeof result.data !== 'object'
    ) {
        return false;
    }

    return Object.keys(
        result.data
    ).length > 0;
}

8. Ne teste surtout pas seulement message.type === 'E'
Ta dernière capture montre justement :
"message": {
    "code": "PG4EMI0 -0030-",
    "type": "I",
    "message": "Adresse Valide; Presser 'Entrée' pour la créer ou la modifier"
}

Donc ton worker peut être non terminé tout en retournant type = I.
Il faut avoir une notion de :
transaction finale OK

versus :
réponse métier intermédiaire / exception

Tu avais déjà une méthode comme :
isMandatResponseOK(...)

Garde-la comme référence.
Puis ajoute :
private isMandatException(
    result:
        DataOutChgtadrhabModelInterface
        | ErrorModelInterface
): result is DataOutChgtadrhabModelInterface {

    /*
     * Ce qui nous intéresse :
     *
     * réponse métier du worker,
     * mais PAS réponse finale de succès.
     *
     * Ne pas réduire ce test à type === 'E'.
     */
    return (
        !!result
        && 'message' in result
        && 'data' in result
        && !this.isMandatResponseOK(
            result
        )
    );
}

Si votre back fournit demain un flag ou un code officiel indiquant exactement « exception worker », tu remplaceras seulement cette méthode.
9. Construction des paramètres complets
Garde ta construction existante si elle marche. Je te conseille simplement de la centraliser.
private getParametresMandatComplets():
    any {

    const parameters: any = {

        civilite:
            this.mandat.civilite ?? '',

        nom:
            this.mandat.nom ?? '',

        prenom:
            this.mandat.prenom ?? '',

        nomAssureur:
            this.mandat.nomAssureur ?? '',

        designation:
            this.mandat.designation ?? '',

        distribution:
            this.mandat.distribution ?? '',

        voie:
            this.mandat.voie ?? '',

        lieuDit:
            this.mandat.lieuDit ?? '',

        localite:
            this.mandat.localite ?? '',

        codePostal:
            this.mandat.codePostal ?? '',

        validation:
            this.mandat.validation ?? '',

        numContrat:
            this.mandat.numContrat ?? ''
    };


    /*
     * Hors Hamon seulement.
     */
    if (
        this.afficherBlocResiliation()
    ) {

        parameters.fondementResiliation =
            this.mandat
                .fondementResiliation
            ?? '';

        parameters.motif =
            this.mandat.motif
            ?? '';

        parameters.dateEvt =
            this.getDateEvtPourBack();
    }


    return parameters;
}

Garde dans :
getDateEvtPourBack()

la conversion de date que tu utilises déjà actuellement.
10. La règle dirty
Ajoute :
private doitEnvoyerTousLesParametres():
    boolean {

    /*
     * Appel normal :
     * envoi complet.
     */
    if (
        !this.retryApresException
    ) {
        return true;
    }


    /*
     * Après exception :
     *
     * dirty = true
     * => utilisateur a modifié quelque chose
     * => tous les champs
     *
     * dirty = false
     * => aucune modification utilisateur
     * => parameters: {}
     */
    return this.mandatForm
        ?.dirty === true;
}

11. Maintenant remplace ta méthode Créer le mandat
Voici la version combinant tous les nouveaux besoins.
public onClickCreerMandat(): void {

    if (
        this.loading
        || !this.isFormulaireValide()
    ) {
        return;
    }


    /*
     * Premier appel :
     * toujours tous les paramètres.
     *
     * Après exception :
     * dirty ? tous : {}
     */
    const envoyerTousLesParametres:
        boolean =
        this.doitEnvoyerTousLesParametres();


    const parameters: any =
        envoyerTousLesParametres

            ? this.getParametresMandatComplets()

            : {};


    const dataIn:
        DataInModelInterface = {

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
            'generic'
    };


    this.loading = true;
    this.spinner.show();


    /*
     * NOUVEAU CONTRAT :
     *
     * ce deuxième appel réalise maintenant :
     * - création mandat
     * - envoi mandat
     * - envoi LR
     *
     * Il n'y a plus de 3e appel.
     */
    this.service
        .envoiAvenantMandat(
            dataIn
        )
        .pipe(
            finalize(() => {

                this.loading = false;
                this.spinner.hide();
            })
        )
        .subscribe({

            next: result => {

                /*
                 * =====================================
                 * 1. SUCCÈS FINAL
                 * =====================================
                 */
                if (
                    this.isMandatResponseOK(
                        result
                    )
                ) {

                    this.retryApresException =
                        false;


                    /*
                     * Seulement ici :
                     *
                     * le parent pourra considérer
                     * mandat créé + envoyé.
                     */
                    this.dialogRef.close({

                        success: true,

                        mode:
                            this.dialogData.mode,

                        riskKeys:
                            this.dialogData.riskKeys

                    });

                    return;
                }


                /*
                 * =====================================
                 * 2. EXCEPTION / RÉPONSE INTERMÉDIAIRE
                 * =====================================
                 */
                if (
                    this.isMandatException(
                        result
                    )
                ) {

                    /*
                     * Nouveau besoin :
                     *
                     * si data existe,
                     * on met à jour le mandat
                     * et donc l'affichage.
                     */
                    if (
                        this.hasMandatData(
                            result
                        )
                    ) {

                        this.appliquerDataExceptionMandat(
                            result.data
                                as Partial<
                                    MandatDataModelInterface
                                >
                        );
                    }


                    /*
                     * On entre maintenant
                     * dans le mode retry.
                     */
                    this.retryApresException =
                        true;


                    /*
                     * CRUCIAL :
                     *
                     * les valeurs éventuellement
                     * renvoyées par le back deviennent
                     * le nouvel état de référence.
                     *
                     * Elles ne sont PAS considérées
                     * comme une modification utilisateur.
                     */
                    setTimeout(() => {

                        this.mandatForm
                            ?.form
                            .markAsPristine();

                    });


                    /*
                     * On affiche le message backend
                     * avec ton mécanisme actuel.
                     */
                    this.service.errorPopup(
                        result,
                        this.Constantes
                            .AVENANT_COMPONENT,
                        'creationEnvoiMandat'
                    );


                    /*
                     * IMPORTANT :
                     *
                     * NE PAS fermer la popup.
                     *
                     * NE PAS marquer le mandat créé.
                     *
                     * NE PAS afficher la case orange.
                     */
                    return;
                }


                /*
                 * =====================================
                 * 3. AUTRE KO MÉTIER
                 * =====================================
                 */
                this.retryApresException =
                    false;


                this.service.errorPopup(
                    result,
                    this.Constantes
                        .AVENANT_COMPONENT,
                    'creationEnvoiMandat'
                );
            },


            /*
             * =========================================
             * 4. ERREUR HTTP / TECHNIQUE
             * =========================================
             */
            error: error => {

                /*
                 * Ce n'est pas l'exception
                 * métier demandée.
                 *
                 * Au prochain clic,
                 * on recommence avec tous
                 * les paramètres.
                 */
                this.retryApresException =
                    false;


                this.service.errorPopup(
                    error,
                    this.Constantes
                        .AVENANT_COMPONENT,
                    'creationEnvoiMandat'
                );
            }
        });
}

12. Pourquoi markAsPristine() doit venir APRÈS la mise à jour de data
L’ordre est essentiel.
Il faut :
exception reçue
       ↓
result.data existe
       ↓
mettre à jour this.mandat
       ↓
mettre à jour les listes éventuelles
       ↓
rafraîchissement écran
       ↓
markAsPristine()
       ↓
attendre une vraie action utilisateur

Pas :
markAsPristine()
↓
mettre à jour mandat

Sinon tes changements programmatiques risqueraient d’interférer avec ta détection.
Après la réponse de ta capture, par exemple, ton modèle devient :
this.mandat.voie =
    '49 RUE DE LA GARE';

this.mandat.localite =
    'PLAISIR CEDEX';

this.mandat.codePostal =
    '78374';

this.mandat.validation =
    'O';

this.mandat.fondementResiliation =
    'ECH';

Puis :
this.mandatForm.form.markAsPristine();

Donc si l’utilisateur reclique sans rien toucher :
{
    "parameters": {}
}

S’il change ensuite seulement :
PLAISIR CEDEX → PLAISIR

le formulaire devient :
dirty === true

et tu renvoies tous les champs actuels, y compris les valeurs réinjectées par le backend.
13. Cas du calendrier dateEvt
Garde ce qu’on avait dit : comme ton calendrier met la valeur depuis TypeScript, marque explicitement le formulaire dirty.
dialogCalendrier
    .afterClosed()
    .subscribe(result => {

        if (
            !result
            || !result.selectedDate
        ) {
            return;
        }


        const formattedDate =
            this.converter
                .fromDateStringToString(
                    result.selectedDate,
                    this.Constantes
                        .DATE_DEFAULT_AFFICHAGE
                );


        if (
            !formattedDate
            || formattedDate.includes(
                'NaN'
            )
        ) {
            return;
        }


        this.mandat.dateEvt =
            formattedDate;


        /*
         * Le changement vient bien
         * de l'utilisateur.
         */
        this.mandatForm
            ?.form
            .markAsDirty();
    });

14. Ce qu’il ne faut surtout pas faire lors d’une exception
Une exception, même avec data, n’est pas encore une création réussie.
Donc à ce moment-là tu ne dois pas faire :
edition.isEnvoyer = true;

ni :
marquerMandatCree(...)

ni :
case orange cochée

ni :
Créer le mandat → Gérer le mandat

ni fermer la popup.
result.data sert uniquement à mettre à jour le formulaire courant.
L’état mandat créé/envoyé ne change qu’après :
this.isMandatResponseOK(result) === true

Le parcours final devient donc :
Ouverture mandat
    ↓
PF4 reçus au premier appel
    ↓
cache fondResil + motifResil
    ↓
utilisateur clique Créer le mandat
    ↓
2e appel = création + envoi
    ↓
             ┌── FINAL OK
             │      ↓
             │ mandat créé + envoyé
             │ fermeture popup
             │ case orange / Gérer le mandat
             │
réponse ─────┤
             │
             └── EXCEPTION
                    ↓
              data présente ?
               /         \
             oui         non
              ↓           ↓
      merge dans mandat   rien
              \           /
               ↓         ↓
             retry = true
                   ↓
             markAsPristine
                   ↓
             popup reste ouverte
                   ↓
              nouveau clic
                   ↓
       form dirty ? 
          /       \
        oui       non
         ↓         ↓
   tous champs   parameters: {}

C’est la combinaison qui respecte les trois besoins sans perdre les listes PF4 et sans considérer une donnée retournée par le back comme une modification faite par l’utilisateur.
