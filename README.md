// Structure dont la cascade est actuellement demandée.
private cascadeCourante?: { type: TypeCascade; code: string };

// undefined = historique complet jamais chargé pour cette sélection.
// [] = historique complet chargé, mais aucun quota trouvé.
private historiqueComplet?: QuotaRow[];

// Empêche une ancienne réponse de remplacer une sélection plus récente.
private versionLecture = 0;

private invaliderLecture(): void {
    this.versionLecture++;
    this.cascadeCourante = undefined;
    this.historiqueComplet = undefined;
    this.loadingCascade = false;
}

private chargerNouvelleCascade(
    type: TypeCascade,
    code: string,
    afficherIndicateur: boolean
): void {
    this.invaliderLecture();

    if (!code) {
        this.rows = [];
        return;
    }

    this.cascadeCourante = { type, code };
    this.lireCascadeCourante(afficherIndicateur);
}

private lireCascadeCourante(afficherIndicateur: boolean): void {
    const cascade = this.cascadeCourante;

    if (!cascade) {
        return;
    }

    const version = ++this.versionLecture;
    const demanderHistorique = this.historiqueQuotas;
    const statutQuota = demanderHistorique ? undefined : 'A';

    this.loadingCascade = afficherIndicateur;

    this.quotaService
        .loadCascade(cascade.type, cascade.code, statutQuota)
        .pipe(
            finalize(() => {
                if (version === this.versionLecture) {
                    this.loadingCascade = false;
                }
            })
        )
        .subscribe({
            next: quotas => {
                if (version !== this.versionLecture) {
                    return;
                }

                // Conserve ton mapping et ton tri actuels.
                this.mapQuotas(quotas);

                // Seule une réponse demandée avec historique est complète.
                if (demanderHistorique) {
                    this.historiqueComplet = this.rows.slice();
                }
            },
            error: err => {
                if (version === this.versionLecture) {
                    console.error('Erreur lors du chargement des quotas en cascade', err);
                }
            }
        });
}

onHistoriqueChange(actif: boolean): void {
    this.historiqueQuotas = actif;

    if (!this.cascadeActive || !this.cascadeCourante) {
        return;
    }

    if (this.historiqueComplet !== undefined) {
        this.rows = actif
            ? this.historiqueComplet.slice()
            : this.historiqueComplet.filter(row => this.isQuotaActif(row));

        return;
    }

    // La liste complète manque : demander les données correspondant à la case.
    this.lireCascadeCourante(2. Remplace les cinq appels de cascade dans ton composant

À chaque emplacement, remplace le bloc entier qui appelle loadCascade(...).pipe(...).subscribe(...) par la ligne indiquée. La nouvelle méthode se charge de l’appel, du mapping et de l’indicateur. Garde les appels qui alimentent les listes déroulantes, ainsi que les else et les return existants.













ggghhEmplacement

Code de remplacement

selectRegion(), dans if (this.cascadeActive)

this.chargerNouvelleCascade('REGION', this.regionSelectionnee, true);

selectZone(), dans if (this.cascadeActive)

this.chargerNouvelleCascade('ZONE', this.zoneSelectionnee, true);

onCascadeChange(), branche nationale

this.chargerNouvelleCascade('NATIONAL', '0RA', true);

onCascadeChange(), branche zone

this.chargerNouvelleCascade('ZONE', this.zoneSelectionnee, false);

onCascadeChange(), branche région

this.chargerNouvelleCascade('REGION', this.regionSelectionnee, false);








Les valeurs true et false reprennent les endroits où ton code initial affichait le spinner. Par exemple, la fin de selectZone() devient simplement :
if (this.cascadeActive) {
    this.chargerNouvelleCascade('ZONE', this.zoneSelectionnee, true);
} else {
    this.loadQuotas(this.zoneSelectionnee);
}





Dans selectRegion(), garde également this.zones = []; avant loadZones(...). C’est la correction qui empêche de proposer les anciennes zones si le chargement de la nouvelle région échoue.

3. Oublie l’historique lorsqu’on quitte la sélection

Dans onCascadeChange(), quand l’utilisateur décoche la cascade :



if (!this.cascadeActive) {
    this.invaliderLecture();
    this.rows = [];
    return;
}



Ajoute aussi this.invaliderLecture(); au début de resetRegion(), resetZone(), resetAgence() et resetNational().

Enfin, dans loadQuotas(), ajoute ces deux lignes au début, avant le test sur structure

this.invaliderLecture();
const version = this.versionLecture;


Puis, au début de son next, avant this.rows = quotas.map(...), ajoute :

if (version !== this.versionLecture) {
    return;
}


Ainsi, si tu passes d’une cascade de zone à une agence, l’historique de la zone est oublié. La vérification protège également ton tableau si une ancienne lecture se termine après un changement de sélection.

4. Branche la case Historique existante

Sur ta case actuelle, remplace uniquement la liaison [(ngModel)]="historiqueQuotas" par :



[ngModel]="historiqueQuotas"
(ngModelChange)="onHistoriqueChange($event)"
















