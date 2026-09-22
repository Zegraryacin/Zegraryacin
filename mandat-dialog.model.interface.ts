import {DataOutChgtadrhabModelInterface} from '@app/modules/parcours-chgtadrhab/models/data-out-chgtadrhab.model.interface';
import {MandatDataModelInterface} from './mandat-data.model.interface';
import {MandatRisqueModelInterface} from './mandat-risque.model.interface';

export type MandatCreationMode = 'unitaire' | 'commun';

export interface PopupMandatCommunDataInterface {
    risques: MandatRisqueModelInterface[];
    clesPreselectionnees?: number[];
}

export interface PopupMandatResiliationDataInterface {
    result: DataOutChgtadrhabModelInterface;
    cadreCcr: string;
    mode: MandatCreationMode;
    riskKeys: number[];
}

export interface PopupMandatResiliationResultInterface {
    created: true;
    cadreCcr: string;
    mode: MandatCreationMode;
    riskKeys: number[];
    mandat: MandatDataModelInterface;
}
