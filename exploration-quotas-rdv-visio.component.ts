import {Component, OnInit} from '@angular/core';
import {QuotaService} from '@app/gestion-quotas-rdv-visio/services/quota.service';
import {SecurityService} from '@coveuse/core';
import {Agence} from '@app/gestion-quotas-rdv-visio/models/agence.model';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {TableModule} from 'primeng/table';
import {PanelModule} from 'primeng/panel';
import {ButtonModule} from 'primeng/button';
import {DropdownModule} from 'primeng/dropdown';
import {InputTextModule} from 'primeng/inputtext';
import {ToastModule} from 'primeng/toast';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ProgressSpinnerModule} from 'primeng/progressspinner';

interface QuotaRow {
    id: string;
    dateDebut: string;
    dateFin: string;
    tel: number | null;
    web: number | null;
    agence: number | null;
    maxQuota: number | null;
    coefficientQuota: number | null;
    statutQuota: string;
    validated: boolean;
    codeRegion?: string;
    libelleRegion?: string;
    codeZone?: string;
    libelleZone?: string;
    codeAgence?: string;
    libelleAgence?: string;
    flagSamedi?: boolean;
}

@Component({
    selector: 'quota-exploration-quotas-rdv-visio',
    standalone: true,
    imports: [
        CommonModule, FormsModule, TableModule, PanelModule, ButtonModule,
        DropdownModule, InputTextModule, ToastModule, ConfirmDialogModule,
        ProgressSpinnerModule
    ],
    templateUrl: './exploration-quotas-rdv-visio.component.html',
    styleUrls: ['./exploration-quotas-rdv-visio.component.scss']
})
export class ExplorationQuotasRdvVisioComponent implements OnInit {
    constructor(private quotaService: QuotaService, private securityService: SecurityService) {}

    agenceSelectionnee = '';
    regionSelectionnee = '';
    zoneSelectionnee = '';
    nationalSelectionne = '';
    agences: Agence[] = [];
    regions: Agence[] = [];
    zones: Agence[] = [];
    nationaux = [{code: '0RA', nom: 'National', label: '0RA - National'}];
    rows: QuotaRow[] = [];

    ngOnInit(): void {
        this.loadAgences();
        this.loadRegions();
        this.quotaService.loadAllZones().subscribe({
            next: data => {
                this.zones = data.map(z => ({...z, nom: `${z.code} - ${z.nom}`}));
            },
            error: err => console.error(err)
        });
    }

    loadQuotas(structure: string): void {
        if (this.isBlankValue(structure)) {
            return;
        }

        this.quotaService.listerQuotas(structure, '', '').subscribe({
            next: quotas => {
                this.rows = quotas.map(quota => {
                    const row: QuotaRow = {
                        id: quota.idQuota,
                        dateDebut: quota.dateDebut,
                        dateFin: quota.dateFin,
                        coefficientQuota: Number(quota.coefficientQuota || 0),
                        agence: Number(quota.quotaAgencePourcentage || quota.quotaAgent),
                        web: Number(quota.quotaWebPourcentage || quota.quotaWeb),
                        tel: Number(quota.quotaCentreTelephoniquePourcentage || quota.quotaTel),
                        statutQuota: quota.statutQuota,
                        codeRegion: quota.codeRegion,
                        libelleRegion: quota.libelleRegion,
                        codeZone: quota.codeZone,
                        libelleZone: quota.libelleZone,
                        codeAgence: quota.codeAgence,
                        libelleAgence: quota.libelleAgence,
                        flagSamedi: quota.flagSamedi === 'Y',
                        maxQuota: 0,
                        validated: true
                    };
                    this.updateMaxQuota(row);
                    return row;
                });
            },
            error: error => {
                console.error('Erreur API :');
                console.error(error);
            }
        });
    }

    updateMaxQuota(row: QuotaRow): void {
        row.maxQuota = Math.max(Number(row.tel) || 0, Number(row.web) || 0, Number(row.agence) || 0);
    }

    limitQuota(event: Event, row: QuotaRow, field: 'agence' | 'tel' | 'web'): void {
        const input = event.target as HTMLInputElement;
        let value = input.value;
        if (value.length > 3) {
            value = value.substring(0, 3);
        }
        if (+value > 100) {
            value = '100';
        }
        input.value = value;
        row[field] = value === '' ? null : Number(value);
        this.updateMaxQuota(row);
    }

    loadAgences(): void {
        this.quotaService.loadAgences().subscribe({
            next: data => {
                this.agences = data.map(a => ({...a, label: `${a.code} - ${a.nom}`}));
            },
            error: err => console.error('Une erreur est survenue lors de la récupération des agences', err)
        });
    }

    selectRegion(): void {
        this.zoneSelectionnee = '';
        this.agenceSelectionnee = '';
        this.rows = [];

        if (this.regionSelectionnee) {
            this.quotaService.loadZones(this.regionSelectionnee).subscribe(data => {
                this.zones = data.map(z => ({...z, nom: `${z.code} - ${z.nom}`}));
            });
            this.quotaService.loadAgencesRegion(this.regionSelectionnee).subscribe({
                next: data => {
                    this.agences = data.map(a => ({...a, label: `${a.code} - ${a.nom}`}));
                }
            });
        }
        if (this.cascadeActive) {
            this.loadingCascade = true;
            this.quotaService.loadCascade('REGION', this.regionSelectionnee).subscribe(quotas => {
                this.mapQuotas(quotas);
                this.loadingCascade = false;
            });
        } else {
            this.loadQuotas(this.regionSelectionnee);
        }
    }

    selectZone(): void {
        this.agenceSelectionnee = '';
        this.rows = [];

        this.quotaService.loadAgencesZone(this.zoneSelectionnee).subscribe(data => {
            this.agences = data.map(a => ({...a, label: `${a.code} - ${a.nom}`}));
        });

        if (this.cascadeActive) {
            this.loadingCascade = true;
            this.quotaService.loadCascade('ZONE', this.zoneSelectionnee).subscribe(quotas => {
                this.mapQuotas(quotas);
                this.loadingCascade = false;
            });
        } else {
            this.loadQuotas(this.zoneSelectionnee);
        }
    }

    selectAgence(event: any): void {
        this.loadQuotas(this.agenceSelectionnee);
    }

    isBlankValue(value: unknown): boolean {
        return value === null || value === undefined || value === '';
    }

    historiqueQuotas = false;

    isQuotaActif(row: QuotaRow): boolean {
        return row.statutQuota?.trim() === 'A';
    }

    get displayedRows(): QuotaRow[] {
        if (this.historiqueQuotas) {
            return this.rows;
        }
        return this.rows.filter(row => row.statutQuota?.trim() === 'A');
    }

    get nomAgenceSelectionnee(): string {
        const agence = this.agences.find(a => a.code === this.agenceSelectionnee);
        return agence?.nom ?? '';
    }

    loadRegions(): void {
        this.quotaService.loadRegions().subscribe({
            next: data => {
                this.regions = data.map(r => ({...r, nom: `${r.code} - ${r.nom}`}));
            },
            error: err => console.error(err)
        });
    }

    cascadeActive = false;

    private mapQuotas(quotas: any[]): void {
        this.rows = quotas.map(quota => {
            const row: QuotaRow = {
                id: quota.idQuota,
                codeRegion: quota.codeRegion,
                libelleRegion: quota.libelleRegion,
                codeZone: quota.codeZone,
                libelleZone: quota.libelleZone,
                codeAgence: quota.codeAgence,
                libelleAgence: quota.libelleAgence,
                dateDebut: quota.dateDebut,
                dateFin: quota.dateFin,
                coefficientQuota: Number(quota.coefficientQuota || 0),
                agence: Number(quota.quotaAgencePourcentage || quota.quotaAgent),
                web: Number(quota.quotaWebPourcentage || quota.quotaWeb),
                tel: Number(quota.quotaCentreTelephoniquePourcentage || quota.quotaTel),
                statutQuota: quota.statutQuota,
                flagSamedi: quota.flagSamedi === 'Y',
                maxQuota: 0,
                validated: true
            };
            return row;
        });

        this.rows.sort((a, b) => {
            const compareRegion = (a.libelleRegion || '').localeCompare(
                b.libelleRegion || '', 'fr', {sensitivity: 'base'}
            );
            if (compareRegion !== 0) {
                return compareRegion;
            }

            const niveau = (row: QuotaRow): number => {
                if (row.libelleRegion && !row.libelleZone && !row.libelleAgence) {
                    return 1;
                }
                if (row.libelleRegion && row.libelleZone && !row.libelleAgence) {
                    return 2;
                }
                return 3;
            };
            const niveauA = niveau(a);
            const niveauB = niveau(b);
            if (niveauA !== niveauB) {
                return niveauA - niveauB;
            }

            const compareZone = (a.libelleZone || '').localeCompare(
                b.libelleZone || '', 'fr', {sensitivity: 'base'}
            );
            if (compareZone !== 0) {
                return compareZone;
            }
            return (a.libelleAgence || '').localeCompare(
                b.libelleAgence || '', 'fr', {sensitivity: 'base'}
            );
        });
    }

    loadingCascade = false;

    onCascadeChange(): void {
        if (!this.cascadeActive) {
            this.rows = [];
            return;
        }

        if (this.nationalSelectionne === '0RA') {
            this.loadingCascade = true;
            this.quotaService.loadCascade('NATIONAL', '0RA').subscribe(quotas => {
                this.mapQuotas(quotas);
                this.loadingCascade = false;
            });
            return;
        }
        if (this.zoneSelectionnee) {
            this.quotaService.loadCascade('ZONE', this.zoneSelectionnee).subscribe(quotas => {
                this.mapQuotas(quotas);
            });
            return;
        }
        if (this.regionSelectionnee) {
            this.quotaService.loadCascade('REGION', this.regionSelectionnee).subscribe(quotas => {
                this.mapQuotas(quotas);
            });
        }
    }

    selectNational(): void {
        this.regionSelectionnee = '';
        this.zoneSelectionnee = '';
        this.agenceSelectionnee = '';
        this.rows = [];
        if (this.cascadeActive) {
            this.onCascadeChange();
        } else {
            this.loadQuotas(this.nationalSelectionne);
        }
    }

    resetRegion(): void {
        this.regionSelectionnee = '';
        this.rows = [];
        this.zones = [];
        this.loadAgences();
    }

    resetZone(): void {
        this.zoneSelectionnee = '';
        this.rows = [];
        this.loadAgences();
    }

    resetAgence(): void {
        this.agenceSelectionnee = '';
        this.rows = [];
    }

    resetNational(): void {
        this.nationalSelectionne = '';
        this.rows = [];
    }
}
