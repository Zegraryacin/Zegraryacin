const parameters: MandatInitParametersInterface = {
    mail: this.emailSelected!.email,
    emailJetable: this.Constantes.NON,
    modeImp: this.Constantes.TYPE_ENVOI_EDITION_CENTRALISEE,

    selectionRisque: multiMandat
        ? this.Constantes.OUI
        : this.Constantes.NON
};

if (multiMandat) {
    parameters.risques = JSON.stringify(
        risques.map(risque => ({
            cle: risque.cle,
            type: risque.type,
            usage: risque.usage,
            statut: risque.statut,
            nbPieces: risque.nbPieces,
            codePostal: risque.codePostal,
            ville: risque.ville,
            selection: true
        }))
    );
}
