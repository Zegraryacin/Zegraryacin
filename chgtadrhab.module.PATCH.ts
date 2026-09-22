// ============================================================
// chgtadrhab.module.ts (ou le module qui déclare ChgtadrhabAvenantComponent)
// ============================================================

import {PopupMandatCommunComponent} from './components/popup/popup-mandat-commun/popup-mandat-commun.component';
import {PopupMandatResiliationComponent} from './components/popup/popup-mandat-resiliation/popup-mandat-resiliation.component';

// Ajouter dans declarations :
// PopupMandatCommunComponent,
// PopupMandatResiliationComponent,

// FormsModule et MatDialogModule sont déjà nécessaires dans votre parcours actuel
// (ngModel + MatDialog sont déjà utilisés). Ne les réimporter que s'ils ne sont pas présents.
