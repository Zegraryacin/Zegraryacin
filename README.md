public isEnvoiDocumentDisabled(code: string): boolean {

    const edition = this.getEditionFromList(code);

    if (!edition) {
        return true;
    }

    /*
     * Modèle Hamon :
     * - pas de mandat obligatoire
     * - pas de contrôle Hamon
     * - pas de contrôle Propriétaire
     * - uniquement la checkbox
     */
    if (
        code ===
        this.Constantes.HAB_EDITION_MODEL_RESILIATION
    ) {

        return edition.isEnvoyer
            || !this.modeleResiliationSelectionne
            || edition.canalEnvoi ===
               this.Constantes.STRING_VIDE;
    }

    /*
     * Fonctionnement existant
     */
    return !(
        !edition.isEnvoyer

        && edition.canalEnvoi !==
           this.Constantes.STRING_VIDE

        && (
            code !==
            this.Constantes.HAB_EDITION_ATTESTATION_SCOLAIRE
            || this.listEnfants.some(e => e.selection)
        )

        && (
            code !==
            this.Constantes.HAB_EDITION_ATTESTATION_HABITATION
            || this.listHabitations.some(h => h.selection)
        )

        && (
            code !==
            this.Constantes.HAB_EDITION_ATTESTATION_RC_LOCATIVE
            || this.listLocations.some(l => l.selection)
        )
    );
}
