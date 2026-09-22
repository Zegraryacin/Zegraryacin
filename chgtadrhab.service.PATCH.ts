// ============================================================
// A AJOUTER dans ChgtadrhabService
// Le service possède déjà appelBackPost(...), d'après le code fourni.
// ============================================================

public envoiAvenantMandat(
    dataIn?: DataInModelInterface
): Observable<DataOutChgtadrhabModelInterface | ErrorModelInterface> {
    return this.appelBackPost(
        this.Constantes.URL_ENVOI_MANDAT_HAB,
        dataIn ?? this.getDataIn({})
    );
}

// Rien à créer pour listeeditionhab si vous avez déjà :
// appelLoadDataEditionDocument(dataIn)
// qui appelle this.Constantes.URL_LISTE_EDITION_HAB.
