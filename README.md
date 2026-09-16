Oui. Je te donne cette fois la solution VBI complète de bout en bout, avec la commande Angular, le nouveau composant, le TS, le HTML, le SCSS, les constantes, le service, l’intégration dans le landing et la modification du traitement après l’envoi ACR.

Je reste cohérent avec ce que tu m’as montré dans ton projet : Angular avec NgModule, ngModel, global-container, global-button, global-link, ChgtadrhabService, ChgtadrhabConstantes, et navigation par stepNumber.

Seul point à vérifier chez toi : les chemins exacts des imports de tes interfaces (DataInModelInterface, DataOutChgtadrhabModelInterface, etc.), car je ne vois pas toute ton arborescence. La logique, elle, est complète.

1. Créer le composant Angular

Depuis la racine du projet CAP-UP_optimevo-front, lance :

ng generate component modules/parcours-chgtadrhab/components/chgtadrhab-agenda-vbi --skip-tests

Version courte :

ng g c modules/parcours-chgtadrhab/components/chgtadrhab-agenda-vbi --skip-tests

Tu obtiendras normalement :

src/app/modules/parcours-chgtadrhab/components/chgtadrhab-agenda-vbi/
├── chgtadrhab-agenda-vbi.component.ts
├── chgtadrhab-agenda-vbi.component.html
└── chgtadrhab-agenda-vbi.component.scss

Si Angular ajoute automatiquement le composant dans un mauvais module, retire-le de ce module et mets-le dans parcours-chgtadrhab.module.ts comme je te montre plus bas.

2. chgtadrhab-constantes.ts

Ajoute ces constantes dans ChgtadrhabConstantes.

// ============================================================================
// AGENDA VBI
// ============================================================================

public static readonly AGENDA_VBI_STEP: number = 8;

/**
 * Screenkey retourné par envoiavthabacrsup
 * indiquant qu'il faut afficher l'écran Agenda VBI.
 */
public static readonly AGENDA_VBI_SCREEN: string = 'z6320f';

/**
 * Screenkey retourné après création réussie de l'agenda.
 */
public static readonly AGENDA_VBI_CREATION_SCREEN: string = 'g4al0f';

/**
 * Worker backend de création d'agenda VBI.
 */
public static readonly URL_CREATION_AGENDA_VBI: string = 'creationagendavbi';

/**
 * Longueur demandée par le backend pour le découpage du commentaire.
 */
public static readonly AGENDA_VBI_COMMENTAIRE_LENGTH: number = 60;

/**
 * Nom du composant utilisé notamment pour les erreurs.
 */
public static readonly AGENDA_VBI_COMPONENT: string =
  'ChgtadrhabAgendaVbiComponent';

/**
 * Libellés IHM.
 */
public static readonly AGENDA_VBI_TITLE: string =
  'Agenda Vente Bien Immobilier (VBI)';

public static readonly AGENDA_VBI_INFORMATIONS: string =
  'Informations';

public static readonly AGENDA_VBI_CLIENT_LIB: string =
  'Client :';

public static readonly AGENDA_VBI_EMIS_PAR_LIB: string =
  'Emise par :';

public static readonly AGENDA_VBI_DESTINE_A_LIB: string =
  'Destiné à :';

public static readonly AGENDA_VBI_POUR_LE_LIB: string =
  'Pour le :';

public static readonly AGENDA_VBI_OBJET_LIB: string =
  'Objet :';

public static readonly AGENDA_VBI_TEXTE_LIB: string =
  'Texte :';

public static readonly AGENDA_VBI_ENVOYER_LIB: string =
  "Envoyer l'agenda";

public static readonly AGENDA_VBI_RETOUR_LIB: string =
  "Ne pas générer l'agenda, retour aux éditions";
Attention sur AGENDA_VBI_STEP = 8

D’après les constantes que tu m’as montrées, j’ai vu notamment :

LISTE_RISQUES_STEP = 1;
AVENANT_RISQUES_STEP = 4;
AVENANT_STEP = 5;
DETAIL_RISQUE_FAM_STEP = 6;
CONSULTATION_RISQUE_HAB_STEP = 7;

Donc 8 semble logique.

Fais quand même une recherche globale :

_STEP: 8

Si aucun résultat n’existe, tu gardes 8.

3. chgtadrhab.service.ts

On va conserver temporairement la réponse de envoiavthabacrsup dans le service afin que le composant Agenda puisse récupérer data et liste.

Ajoute dans les imports :

import { BehaviorSubject, Observable } from 'rxjs';

Tu dois déjà avoir Observable, donc ne le duplique pas.

Dans la classe ChgtadrhabService, ajoute :

// ============================================================================
// AGENDA VBI
// ============================================================================

private readonly agendaVbiSubject:
  BehaviorSubject<DataOutChgtadrhabModelInterface | null> =
    new BehaviorSubject<DataOutChgtadrhabModelInterface | null>(null);

public readonly agendaVbi$:
  Observable<DataOutChgtadrhabModelInterface | null> =
    this.agendaVbiSubject.asObservable();

Puis ajoute les méthodes suivantes :

public setAgendaVbi(
  result: DataOutChgtadrhabModelInterface
): void {
  this.agendaVbiSubject.next(result);
}


public getAgendaVbi():
  DataOutChgtadrhabModelInterface | null {

  return this.agendaVbiSubject.getValue();
}


public clearAgendaVbi(): void {
  this.agendaVbiSubject.next(null);
}
Méthode pour afficher l'écran Agenda

Toujours dans chgtadrhab.service.ts :

public ouvrirAgendaVbi(
  result: DataOutChgtadrhabModelInterface
): void {

  // On garde les données retournées par envoiavthabacrsup
  this.setAgendaVbi(result);

  const contexte:
    ContexteChgtadrhabModelInterface =
      this.context.getValue();

  contexte.communContexte.step =
    this.Constantes.AGENDA_VBI_STEP;

  this.context.next(contexte);
}

Si chez toi le type du contexte porte un autre nom, garde exactement le type que tu utilises déjà dans ton service.

Tu peux même éviter de typer explicitement :

public ouvrirAgendaVbi(
  result: DataOutChgtadrhabModelInterface
): void {

  this.setAgendaVbi(result);

  const contexte = this.context.getValue();

  contexte.communContexte.step =
    this.Constantes.AGENDA_VBI_STEP;

  this.context.next(contexte);
}

Cette version risque moins de provoquer un problème d'import.

Retour aux éditions

Ajoute :

public retourAgendaVbiVersEditions(): void {

  const contexte = this.context.getValue();

  contexte.communContexte.step =
    this.Constantes.AVENANT_STEP;

  this.context.next(contexte);

  this.clearAgendaVbi();
}
4. Appel au worker creationagendavbi

Toujours dans chgtadrhab.service.ts, à côté de :

public appelEnvoiDocument(...)

ajoute :

public creationAgendaVbi(
  dataIn?: DataInModelInterface
): Observable<
  DataOutChgtadrhabModelInterface | ErrorModelInterface
> {

  return this.appelBackPost(
    this.Constantes.URL_CREATION_AGENDA_VBI,
    dataIn ?? this.getDataIn({})
  );
}

Donc ton service aura en gros :

public appelEnvoiDocument(
  url: string,
  dataIn?: DataInModelInterface
): Observable<
  DataOutChgtadrhabModelInterface | ErrorModelInterface
> {

  return this.appelBackPost(
    url,
    dataIn ?? this.getDataIn({})
  );
}


public creationAgendaVbi(
  dataIn?: DataInModelInterface
): Observable<
  DataOutChgtadrhabModelInterface | ErrorModelInterface
> {

  return this.appelBackPost(
    this.Constantes.URL_CREATION_AGENDA_VBI,
    dataIn ?? this.getDataIn({})
  );
}
5. Modification de chgtadrhab-avenant.component.ts

C'est ici que l'ACR est envoyé.

Tu as actuellement :

public onClickEnvoiDocument(code: string): void {
  if (!this.isEnvoiDocumentDisabled(code)) {
    this.spinner.show();
    this.gereEnvoiDocument(code);
  }
}

Ça reste pareil.

Tu as aussi quelque chose comme :

private gereEnvoiDocument(code: string): void {

  const url: string =
    this.Converter.getTranscoLibelle(
      this.Constantes.TRANSCO_HAB_EDITION_DOCUMENT_URL,
      code,
      this.Constantes.STRING_VIDE
    );

  if (url !== this.Constantes.STRING_VIDE) {

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
  }
}
6. Modifier isEnvoiDocumentOK()

C'est très important.

D'après ta JIRA, z6320f peut être renvoyé avec :

"message": {
  "type": "E"
}

mais ce retour doit quand même provoquer l'affichage de l'Agenda.

Donc utilise ceci :

private isEnvoiDocumentOK(
  code: string,
  result:
    DataOutChgtadrhabModelInterface
    | ErrorModelInterface
): boolean {

  /*
   * Cas particulier :
   *
   * ACR suppression habitation + screenkey z6320f
   *
   * La JIRA demande explicitement d'enchaîner vers
   * l'écran Agenda VBI même si le message possède type = 'E'.
   */
  if (
    code ===
      this.Constantes.HAB_EDITION_ACR_SUPPRESSION_HABITATION
    && 'screenkey' in result
    && result.screenkey ===
      this.Constantes.AGENDA_VBI_SCREEN
    && 'data' in result
  ) {
    return true;
  }


  /*
   * Fonctionnement standard des autres éditions.
   */
  return (
    'message' in result
    && result.message.type !==
      this.Constantes.TYPE_MESSAGE_ERREUR
    && 'data' in result
  );
}
7. Modification de gereEnvoiDocumentOK()

Tu gardes tout ton traitement actuel.

La partie importante à ajouter est à la fin.

Exemple complet basé sur ton code :

private gereEnvoiDocumentOK(
  code: string,
  result: DataOutChgtadrhabModelInterface
): void {

  const edition:
    EditionDocumentModelInterface | undefined =
      this.getEditionFromList(code);

  if (!edition) {
    this.spinner.hide();
    return;
  }


  let nbDocuments: number = 0;


  switch (code) {

    case this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE:

      nbDocuments =
        this.listEnfants
          .filter(
            (e: PersonneModelInterface) =>
              e.selection
          )
          .length;

      break;


    case this.Constantes.HAB_EDITION_ATTESTATION_HABITATION:

      nbDocuments = 1;

      break;


    case this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE:

      nbDocuments =
        this.listLocations
          .filter(
            (l: HabitationModelInterface) =>
              l.selection
          )
          .length;

      break;


    case this.Constantes.HAB_EDITION_ACR_SUPPRESSION_HABITATION:

      nbDocuments =
        this.listAcrSuppressionHab
          .filter(
            (h: RisqueModelInterface & {
              selection?: boolean;
            }) =>
              h.selection
          )
          .length;

      break;
  }


  const pluriel: '' | 's' =
    nbDocuments > 1
      ? 's'
      : '';


  const typeEnvoiLib: string =
    this.Converter.getTranscoLibelle(
      this.Constantes.TRANSCO_TYPE_ENVOI_LIB,
      edition.canalEnvoi
    );


  if (
    nbDocuments > 0
    && typeEnvoiLib !==
      this.Constantes.REF_LIB_INDEFINI
  ) {

    edition.isEnvoyer = true;
    edition.isVoirPlus = true;

    edition.bilanEnvoi =
      nbDocuments
        .toString()
        .concat(' document')
        .concat(pluriel)
        .concat(' envoyé')
        .concat(pluriel)
        .concat(' par ')
        .concat(typeEnvoiLib);
  }


  // ==========================================================
  // CAS VBI
  // ==========================================================

  if (
    code ===
      this.Constantes.HAB_EDITION_ACR_SUPPRESSION_HABITATION
    && result.screenkey ===
      this.Constantes.AGENDA_VBI_SCREEN
  ) {

    this.service.ouvrirAgendaVbi(result);

    this.spinner.hide();

    return;
  }


  this.spinner.hide();
}
8. Nouveau fichier chgtadrhab-agenda-vbi.component.ts

Voici maintenant le TS complet du nouveau composant.

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { Subscription } from 'rxjs';

import { ConverterService } from
  '@app/modules/commun/services/converter.service';

import { ChgtadrhabConstantes } from
  '../../chgtadrhab-constantes';

import { ChgtadrhabService } from
  '../../services/chgtadrhab.service';

import { DataInModelInterface } from
  '../../models/data-in-model.interface';

import { DataOutChgtadrhabModelInterface } from
  '../../models/data-out-chgtadrhab-model.interface';


interface AgendaVbiDataInterface {

  idDestinataire?: string;

  objetSaisissable?: boolean;

  heureTraitement?: string;

  nomDestinataire?: string;

  idEmetteur?: string;

  nomCelluleEmetteur?: string;

  dateTraitement?: string;

  destinataire?: string;

  nomCelluleDestinataire?: string;

  commentaireSaisissable?: boolean;

  objet?: string;

  codeDefaut?: string;

  codeAction?: string;

  emetteur?: string;

  dateEmission?: string;

  nomEmetteur?: string;

  nomPrenom?: string;
}


interface AgendaVbiListeInterface {
  cle: string;
  libelle: string;
}


@Component({
  selector: 'chgtadrhab-agenda-vbi',
  templateUrl: './chgtadrhab-agenda-vbi.component.html',
  styleUrls: ['./chgtadrhab-agenda-vbi.component.scss']
})
export class ChgtadrhabAgendaVbiComponent
  implements OnInit, OnDestroy {

  // ============================================================
  // CONSTANTES
  // ============================================================

  protected readonly Constantes:
    typeof ChgtadrhabConstantes =
      ChgtadrhabConstantes;

  protected readonly Converter:
    typeof ConverterService =
      ConverterService;


  // ============================================================
  // DONNEES IHM
  // ============================================================

  public agenda:
    AgendaVbiDataInterface =
      {};

  public liste:
    AgendaVbiListeInterface[] =
      [];

  public dateTraitement: string =
    '';

  public heureTraitement: string =
    '';

  public commentaire: string =
    '';

  public objet: string =
    '';

  public envoiEnCours: boolean =
    false;


  private agendaSubscription?:
    Subscription;


  constructor(
    private readonly service:
      ChgtadrhabService
  ) {
  }


  // ============================================================
  // INIT
  // ============================================================

  public ngOnInit(): void {

    this.agendaSubscription =
      this.service.agendaVbi$
        .subscribe(
          (
            result:
              DataOutChgtadrhabModelInterface
              | null
          ) => {

            if (!result) {
              return;
            }

            this.initialiserAgenda(result);
          }
        );
  }


  public ngOnDestroy(): void {

    this.agendaSubscription
      ?.unsubscribe();
  }


  // ============================================================
  // INITIALISATION
  // ============================================================

  private initialiserAgenda(
    result:
      DataOutChgtadrhabModelInterface
  ): void {

    /*
     * Selon le JSON de la JIRA :
     *
     * result.data
     * result.liste
     */

    const resultat: any =
      result as any;


    this.agenda =
      resultat.data
      ?? {};


    this.liste =
      resultat.liste
      ?? [];


    this.dateTraitement =
      this.convertirDateBackendVersHtml(
        this.agenda.dateTraitement
          ?? ''
      );


    this.heureTraitement =
      this.agenda.heureTraitement
      ?? '';


    this.objet =
      this.agenda.objet
      ?? '';


    /*
     * Le texte initial de l'Agenda est récupéré
     * dans la liste retournée.
     *
     * Dans ton exemple :
     *
     * cle 11 =
     * "REBOND EPARGNE SUITE A VENTE D'UN BIEN IMMOBILIER"
     */

    this.commentaire =
      this.liste
        .map(
          (
            element:
              AgendaVbiListeInterface
          ) =>
            element.libelle
        )
        .filter(
          (libelle: string) =>
            !!libelle
            && libelle.trim().length > 0
        )
        .join('\n');
  }


  // ============================================================
  // ACTIONS
  // ============================================================

  public envoyerAgenda(): void {

    if (!this.isFormulaireValide()) {
      return;
    }


    this.envoiEnCours = true;


    /*
     * JIRA :
     *
     * commentaire =
     * splitTexteAvantEnvoi(
     *   replaceSpecialChars(commentaire),
     *   60
     * )
     */

    const commentaireFormate:
      string =
        this.Converter
          .splitTexteAvantEnvoi(
            this.Converter
              .replaceSpecialChars(
                this.commentaire
              ),
            this.Constantes
              .AGENDA_VBI_COMMENTAIRE_LENGTH
          );


    const dataIn:
      DataInModelInterface =
        {

          idDossier:
            this.service
              .getCommunContexte()
              .dossierId,

          resourceId:
            this.service
              .getCommunContexte()
              .resourceId,

          parameters: {

            dateTraitement:
              this.dateTraitement,

            heureTraitement:
              this.heureTraitement,

            commentaire:
              commentaireFormate
          },

          screenkey:
            this.Constantes
              .SCREEN_GENERIC
        };


    this.service
      .creationAgendaVbi(dataIn)
      .subscribe({

        next: result => {

          this.envoiEnCours =
            false;


          if (
            'screenkey' in result
            && result.screenkey ===
              this.Constantes
                .AGENDA_VBI_CREATION_SCREEN
            && 'message' in result
            && result.message.type !==
              this.Constantes
                .TYPE_MESSAGE_ERREUR
          ) {

            this.service
              .retourAgendaVbiVersEditions();

            return;
          }


          this.service.errorPopup(
            result,
            this.Constantes
              .AGENDA_VBI_COMPONENT,
            'creationAgendaVbi'
          );
        },


        error: error => {

          this.envoiEnCours =
            false;

          this.service.errorPopup(
            error,
            this.Constantes
              .AGENDA_VBI_COMPONENT,
            'creationAgendaVbi'
          );
        }
      });
  }


  public retourAuxEditions(): void {

    this.service
      .retourAgendaVbiVersEditions();
  }


  // ============================================================
  // VALIDATION
  // ============================================================

  public isFormulaireValide():
    boolean {

    return (
      !!this.dateTraitement
      && !!this.heureTraitement
      && !this.envoiEnCours
    );
  }


  // ============================================================
  // CONVERSION DATE
  // ============================================================

  private convertirDateBackendVersHtml(
    dateBackend: string
  ): string {

    if (!dateBackend) {
      return '';
    }


    /*
     * Si déjà :
     * 2026-06-12
     */
    if (
      /^\d{4}-\d{2}-\d{2}$/
        .test(dateBackend)
    ) {
      return dateBackend;
    }


    /*
     * Exemple backend :
     *
     * 10-JUN-2026
     *
     * devient :
     *
     * 2026-06-10
     */

    const mois:
      Record<string, string> =
        {
          JAN: '01',
          FEB: '02',
          MAR: '03',
          APR: '04',
          MAY: '05',
          JUN: '06',
          JUL: '07',
          AUG: '08',
          SEP: '09',
          OCT: '10',
          NOV: '11',
          DEC: '12'
        };


    const parties:
      string[] =
        dateBackend
          .toUpperCase()
          .split('-');


    if (parties.length !== 3) {
      return '';
    }


    const jour: string =
      parties[0]
        .padStart(2, '0');

    const moisNumero:
      string | undefined =
        mois[parties[1]];

    const annee: string =
      parties[2];


    if (!moisNumero) {
      return '';
    }


    return (
      annee
      + '-'
      + moisNumero
      + '-'
      + jour
    );
  }
}
9. HTML complet de l'Agenda VBI

Fichier :

chgtadrhab-agenda-vbi.component.html

Mets :

<div class="agenda-vbi">

  <div class="global-container">

    <!-- ===================================================== -->
    <!-- TITRE -->
    <!-- ===================================================== -->

    <div class="agenda-vbi-header">

      <h2 class="agenda-vbi-title">
        {{ Constantes.AGENDA_VBI_TITLE }}
      </h2>

    </div>


    <!-- ===================================================== -->
    <!-- CONTENU -->
    <!-- ===================================================== -->

    <div class="agenda-vbi-content">

      <div class="agenda-vbi-form">

        <!-- INFORMATIONS -->

        <div class="agenda-vbi-section-title">
          {{ Constantes.AGENDA_VBI_INFORMATIONS }}
        </div>


        <!-- CLIENT -->

        <div class="agenda-vbi-row">

          <span class="agenda-vbi-label">
            {{ Constantes.AGENDA_VBI_CLIENT_LIB }}
          </span>

          <span class="agenda-vbi-value">
            {{ agenda.nomPrenom }}
          </span>

        </div>


        <!-- EMISE PAR -->

        <div class="agenda-vbi-row">

          <span class="agenda-vbi-label">
            {{ Constantes.AGENDA_VBI_EMIS_PAR_LIB }}
          </span>

          <span class="agenda-vbi-value">

            {{ agenda.emetteur }}

            <ng-container
              *ngIf="agenda.nomCelluleEmetteur">

              -
              {{ agenda.nomCelluleEmetteur }}

            </ng-container>

          </span>

          <span
            class="agenda-vbi-date-emission"
            *ngIf="agenda.dateEmission">

            Le :
            {{ agenda.dateEmission }}

          </span>

        </div>


        <!-- DESTINE A -->

        <div class="agenda-vbi-row">

          <span class="agenda-vbi-label">
            {{ Constantes.AGENDA_VBI_DESTINE_A_LIB }}
          </span>

          <span class="agenda-vbi-value">

            {{ agenda.destinataire }}

            <ng-container
              *ngIf="agenda.nomCelluleDestinataire">

              -
              {{ agenda.nomCelluleDestinataire }}

            </ng-container>

          </span>

        </div>


        <!-- DATE + HEURE -->

        <div class="agenda-vbi-row agenda-vbi-row-date">

          <label
            class="agenda-vbi-label"
            for="agendaVbiDate">

            {{ Constantes.AGENDA_VBI_POUR_LE_LIB }}

          </label>


          <div class="agenda-vbi-date-fields">

            <input
              id="agendaVbiDate"
              name="agendaVbiDate"
              class="agenda-vbi-input agenda-vbi-date"
              type="date"
              [(ngModel)]="dateTraitement">


            <span class="agenda-vbi-a">
              à :
            </span>


            <input
              id="agendaVbiHeure"
              name="agendaVbiHeure"
              class="agenda-vbi-input agenda-vbi-time"
              type="time"
              [(ngModel)]="heureTraitement">

          </div>

        </div>


        <!-- OBJET -->

        <div class="agenda-vbi-row agenda-vbi-row-column">

          <label
            class="agenda-vbi-label"
            for="agendaVbiObjet">

            {{ Constantes.AGENDA_VBI_OBJET_LIB }}

          </label>


          <input
            id="agendaVbiObjet"
            name="agendaVbiObjet"
            class="agenda-vbi-input agenda-vbi-object"
            type="text"
            [(ngModel)]="objet"
            [readonly]="!agenda.objetSaisissable"
            autocomplete="off">

        </div>


        <!-- COMMENTAIRE -->

        <div class="agenda-vbi-row agenda-vbi-row-column">

          <label
            class="agenda-vbi-label"
            for="agendaVbiCommentaire">

            {{ Constantes.AGENDA_VBI_TEXTE_LIB }}

          </label>


          <textarea
            id="agendaVbiCommentaire"
            name="agendaVbiCommentaire"
            class="agenda-vbi-textarea"
            [(ngModel)]="commentaire"
            [readonly]="agenda.commentaireSaisissable === false"
            maxlength="1000">
          </textarea>

        </div>


        <!-- CHAMPS OBLIGATOIRES -->

        <div class="agenda-vbi-required">
          *Champs obligatoires
        </div>

      </div>

    </div>


    <!-- ===================================================== -->
    <!-- FOOTER -->
    <!-- ===================================================== -->

    <div class="global-container-footer">

      <div class="global-container-footer-wrapper">

        <!-- GAUCHE -->

        <div class="global-box-left">

          <div
            class="global-link agenda-vbi-return"
            (click)="retourAuxEditions()">

            {{ Constantes.AGENDA_VBI_RETOUR_LIB }}

          </div>

        </div>


        <!-- DROITE -->

        <div class="global-box-right">

          <button
            type="button"
            class="global-button"
            (click)="envoyerAgenda()"
            [disabled]="!isFormulaireValide()"
            [ngClass]="
              isFormulaireValide()
                ? 'orange'
                : 'disabled grey'
            ">

            {{ Constantes.AGENDA_VBI_ENVOYER_LIB }}

          </button>

        </div>

      </div>

    </div>

  </div>

</div>
10. SCSS complet

Fichier :

chgtadrhab-agenda-vbi.component.scss

Voici une version volontairement simple qui réutilise le style général de tes écrans existants au lieu de recréer tout le design.

.agenda-vbi {
  width: 100%;
  box-sizing: border-box;
}


.agenda-vbi-header {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  margin: 20px 0 28px;
}


.agenda-vbi-title {
  margin: 0;

  font-size: 24px;
  font-weight: 700;
  line-height: 30px;

  color: var(--Color-Blue, #245787);
}


/* ========================================================= */
/* CONTENU */
/* ========================================================= */

.agenda-vbi-content {
  width: 100%;

  display: flex;
  justify-content: center;

  box-sizing: border-box;
}


.agenda-vbi-form {
  width: 78%;
  max-width: 900px;

  box-sizing: border-box;
}


.agenda-vbi-section-title {
  margin-bottom: 22px;

  font-size: 16px;
  line-height: 22px;
  font-weight: 700;

  color: var(--Color-Blue, #245787);
}


/* ========================================================= */
/* LIGNES */
/* ========================================================= */

.agenda-vbi-row {
  position: relative;

  width: 100%;

  display: flex;
  align-items: center;

  box-sizing: border-box;

  margin-bottom: 16px;
}


.agenda-vbi-row-column {
  flex-direction: column;
  align-items: flex-start;
}


.agenda-vbi-label {
  min-width: 110px;

  margin-right: 10px;

  color: var(--Color-Black, #1a0b00);

  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}


.agenda-vbi-value {
  color: var(--Color-Black, #1a0b00);

  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
}


.agenda-vbi-date-emission {
  margin-left: auto;

  color: var(--Color-Black, #1a0b00);

  font-size: 14px;
  font-weight: 400;
}


/* ========================================================= */
/* DATE / HEURE */
/* ========================================================= */

.agenda-vbi-row-date {
  align-items: center;
}


.agenda-vbi-date-fields {
  display: flex;
  align-items: center;
  gap: 12px;
}


.agenda-vbi-a {
  font-size: 14px;
  color: var(--Color-Black, #1a0b00);
}


/* ========================================================= */
/* INPUTS */
/* ========================================================= */

.agenda-vbi-input {
  height: 40px;

  box-sizing: border-box;

  padding: 0 12px;

  border: 1px solid var(--color-grey-20, #d1d1d1);
  border-radius: 8px;

  background: var(--Color-White, #ffffff);

  color: var(--Color-Black, #1a0b00);

  font-size: 14px;
  font-weight: 400;

  outline: none;
}


.agenda-vbi-input:focus {
  border-color: var(--Color-Blue, #245787);
}


.agenda-vbi-date {
  width: 160px;
}


.agenda-vbi-time {
  width: 105px;
}


.agenda-vbi-object {
  width: 100%;

  margin-top: 7px;
}


.agenda-vbi-input[readonly] {
  background: var(--color-grey-5, #f5f5f5);
}


/* ========================================================= */
/* TEXTAREA */
/* ========================================================= */

.agenda-vbi-textarea {
  width: 100%;
  min-height: 120px;

  box-sizing: border-box;

  margin-top: 7px;

  padding: 12px;

  resize: vertical;

  border: 1px solid var(--color-grey-20, #d1d1d1);
  border-radius: 8px;

  background: var(--Color-White, #ffffff);

  color: var(--Color-Black, #1a0b00);

  font-size: 14px;
  font-family: inherit;
  font-weight: 400;
  line-height: 20px;

  outline: none;
}


.agenda-vbi-textarea:focus {
  border-color: var(--Color-Blue, #245787);
}


.agenda-vbi-textarea[readonly] {
  background: var(--color-grey-5, #f5f5f5);
}


/* ========================================================= */
/* CHAMPS OBLIGATOIRES */
/* ========================================================= */

.agenda-vbi-required {
  width: 100%;

  margin-top: 8px;

  text-align: right;

  font-size: 11px;
  font-style: italic;

  color: var(--Color-Grey, #666666);
}


/* ========================================================= */
/* FOOTER */
/* ========================================================= */

.agenda-vbi-return {
  cursor: pointer;
}


/* ========================================================= */
/* RESPONSIVE */
/* ========================================================= */

@media screen and (max-width: 900px) {

  .agenda-vbi-form {
    width: 92%;
  }


  .agenda-vbi-row {
    align-items: flex-start;
  }


  .agenda-vbi-date-emission {
    margin-left: 15px;
  }
}

J'ai volontairement évité de refaire .global-button, .orange, .grey, .global-link, etc., puisque ces classes existent déjà dans ton projet.

C'est justement ce qu'il faut faire pour garder le standard de ton application.

11. Ajouter le composant dans parcours-chgtadrhab.module.ts

Dans les imports en haut :

import {
  ChgtadrhabAgendaVbiComponent
} from
  '@app/modules/parcours-chgtadrhab/components/chgtadrhab-agenda-vbi/chgtadrhab-agenda-vbi.component';

Puis dans :

@NgModule({
  declarations: [

ajoute :

ChgtadrhabAgendaVbiComponent,

Par exemple :

@NgModule({
  declarations: [

    LandingParcoursChgtadrhabComponent,

    ChgtadrhabListeRisqueComponent,

    PopupMenuActionsComponent,

    PopupSupprRisqueComponent,

    PopupChoixFormuleComponent,

    PopupAjoutCoordonneeComponent,

    PopupNiveauxFranchiseComponent,

    ChgtadrhabDetailHabitationComponent,

    ChgtadrhabConsultationHabitationComponent,

    ChgtadrhabDetailFamilleComponent,

    ChgtadrhabFormulesRisqueComponent,

    PopupPackDemenagComponent,

    PopupCoeffZoniersComponent,

    PopupFranchiseCapitauxComponent,

    PopupRemiseComponent,

    ChgtadrhabAvenantRisqueComponent,

    ChgtadrhabAvenantComponent,

    // NOUVEAU
    ChgtadrhabAgendaVbiComponent
  ],

  imports: [
    ParcoursChgtadrhabRoutingModule,
    CommunModule
  ]
})
export class ParcoursChgtadrhabModule {
}
12. Vérifie FormsModule

Le nouveau composant utilise :

[(ngModel)]

Ton projet l'utilise déjà beaucoup, donc normalement FormsModule est déjà apporté par CommunModule.

Si Angular affiche :

Can't bind to 'ngModel' since it isn't a known property

alors ajoute :

import { FormsModule } from '@angular/forms';

puis :

imports: [
  FormsModule,
  ParcoursChgtadrhabRoutingModule,
  CommunModule
]
13. landing-parcours-chgtadrhab.component.html

Tu m'as montré actuellement :

<chgtadrhab-liste-risque
  [hidden]="stepNumber !== Constantes.LISTE_RISQUES_STEP">
</chgtadrhab-liste-risque>

<chgtadrhab-detail-habitation
  [hidden]="stepNumber !== Constantes.DETAIL_RISQUE_HAB_STEP">
</chgtadrhab-detail-habitation>

<chgtadrhab-detail-famille
  [hidden]="stepNumber !== Constantes.DETAIL_RISQUE_FAM_STEP
    && stepNumber !== Constantes.DETAIL_RISQUE_FAM_CONV_STEP">
</chgtadrhab-detail-famille>

<chgtadrhab-formules-risque
  [hidden]="stepNumber !== Constantes.FORMULES_RISQUE_STEP
    && stepNumber !== Constantes.FORMULES_RISQUE_CORRECTION_STEP">
</chgtadrhab-formules-risque>

<chgtadrhab-avenant-risque
  [hidden]="stepNumber !== Constantes.AVENANT_RISQUES_STEP">
</chgtadrhab-avenant-risque>

<chgtadrhab-avenant
  [hidden]="stepNumber !== Constantes.AVENANT_STEP">
</chgtadrhab-avenant>

<chgtadrhab-consultation-habitation
  [hidden]="stepNumber !== Constantes.CONSULTATION_RISQUE_HAB_STEP">
</chgtadrhab-consultation-habitation>

Ajoute simplement le nouvel écran après chgtadrhab-avenant :

<chgtadrhab-agenda-vbi
  [hidden]="stepNumber !== Constantes.AGENDA_VBI_STEP">
</chgtadrhab-agenda-vbi>

Donc :

<div class="global-container-body">

  <chgtadrhab-liste-risque
    [hidden]="stepNumber !== Constantes.LISTE_RISQUES_STEP">
  </chgtadrhab-liste-risque>


  <chgtadrhab-detail-habitation
    [hidden]="stepNumber !== Constantes.DETAIL_RISQUE_HAB_STEP">
  </chgtadrhab-detail-habitation>


  <chgtadrhab-detail-famille
    [hidden]="
      stepNumber !== Constantes.DETAIL_RISQUE_FAM_STEP
      && stepNumber !== Constantes.DETAIL_RISQUE_FAM_CONV_STEP
    ">
  </chgtadrhab-detail-famille>


  <chgtadrhab-formules-risque
    [hidden]="
      stepNumber !== Constantes.FORMULES_RISQUE_STEP
      && stepNumber !== Constantes.FORMULES_RISQUE_CORRECTION_STEP
    ">
  </chgtadrhab-formules-risque>


  <chgtadrhab-avenant-risque
    [hidden]="stepNumber !== Constantes.AVENANT_RISQUES_STEP">
  </chgtadrhab-avenant-risque>


  <chgtadrhab-avenant
    [hidden]="stepNumber !== Constantes.AVENANT_STEP">
  </chgtadrhab-avenant>


  <!-- ===================================================== -->
  <!-- NOUVEAU : AGENDA VBI -->
  <!-- ===================================================== -->

  <chgtadrhab-agenda-vbi
    [hidden]="stepNumber !== Constantes.AGENDA_VBI_STEP">
  </chgtadrhab-agenda-vbi>


  <chgtadrhab-consultation-habitation
    [hidden]="stepNumber !== Constantes.CONSULTATION_RISQUE_HAB_STEP">
  </chgtadrhab-consultation-habitation>

</div>
14. Pas besoin de modifier landing-parcours-chgtadrhab.component.ts

C'est justement l'avantage de ton architecture actuelle.

Tu as déjà :

this.service.context
  .asObservable()
  .subscribe(contexte => {

    this.context = contexte;

    this.stepNumber =
      this.context
        .communContexte
        .step;
  });

Donc quand on fait :

contexte.communContexte.step =
  this.Constantes.AGENDA_VBI_STEP;

this.context.next(contexte);

le landing reçoit automatiquement :

stepNumber = 8;

et :

<chgtadrhab-agenda-vbi
  [hidden]="stepNumber !== Constantes.AGENDA_VBI_STEP">
</chgtadrhab-agenda-vbi>

devient visible.

15. Payload exact vers creationagendavbi

Quand l'utilisateur clique sur :

Envoyer l'agenda

le JSON envoyé sera conceptuellement :

{
  "idDossier": "...",
  "resourceId": "...",
  "parameters": {
    "dateTraitement": "2026-06-12",
    "heureTraitement": "12:00",
    "commentaire": "..."
  },
  "screenkey": "generic"
}

Et surtout le commentaire passe par :

this.Converter.splitTexteAvantEnvoi(
  this.Converter.replaceSpecialChars(
    this.commentaire
  ),
  60
);

Ce point vient directement de ce que tu m'as montré dans la JIRA.

16. Comportement final

Le fonctionnement complet sera :

Écran Avenant
      |
      |
      v
Envoi ACR suppression habitation
      |
      |
      v
worker envoiavthabacrsup
      |
      |
      +--------------------------------+
      |                                |
      | screenkey différent            | screenkey = z6320f
      | de z6320f                      |
      |                                |
      v                                v
fonctionnement normal          sauvegarde result
                               data + liste
                                      |
                                      v
                            AGENDA_VBI_STEP = 8
                                      |
                                      v
                         Agenda Vente Bien Immobilier
                                      |
                           +----------+----------+
                           |                     |
                           |                     |
                    Ne pas générer         Envoyer agenda
                           |                     |
                           v                     v
                     AVENANT_STEP       replaceSpecialChars
                                              |
                                              v
                                     splitTexteAvantEnvoi
                                              |
                                              v
                                      creationagendavbi
                                              |
                                              v
                                       screenkey g4al0f
                                              |
                                              v
                                         AVENANT_STEP
Et un point important

Pour la toute première version, je te conseille de garder :

<input type="date">
<input type="time">

plutôt que de recopier immédiatement tout le calendrier custom de popup-modif-adresse.

Pourquoi ? Parce que toute la logique fonctionnelle VBI peut d'abord être validée : z6320f → affichage Agenda → modification date/heure → creationagendavbi → g4al0f.

Ensuite, une fois que ça fonctionne, on peut remplacer uniquement la zone date/heure par exactement le même CalendrierComponent et le même sélecteur d'heure que celui de popup-modif-adresse, sans toucher au reste du VBI. Ça évite de mélanger un problème de navigation/backend et un problème purement graphique.
