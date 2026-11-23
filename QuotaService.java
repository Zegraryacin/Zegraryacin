package covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.service;

import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.client.QuotaProxyClient;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.client.QuotaRendezvousProxyClient;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.output.QuotaOutput;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.request.CreationQuotaRequest;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.response.AgenceReponse;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.response.CreationQuotaResponse;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.response.OrganigrammeAgenceResponse;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.dto.response.QuotaResponse;
import covea.gmf.usg.quotasrappeltelephonique.gestionquotasrt.service.api.enums.ReferentielLibelleEnum;
import covea.jee.core.service.rs.client.exception.CoveuseRestGenericException;
import covea.jee.core.service.util.error.ErrorMessage;
import covea.jee.core.service.util.exception.TechnicalException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@ApplicationScoped
public class QuotaService {

    @Inject
    OrganigrammeAgenceService organigrammeAgenceService;

    private static final Logger LOGGER = LoggerFactory.getLogger(QuotaService.class);

    private final QuotaProxyClient quotaProxyClient;
    private final ReferentielLibelleService referentielLibelleService;
    private final QuotaRendezvousProxyClient quotaRendezvousProxyClient;

    @Inject
    public QuotaService(
            ReferentielLibelleService referentielLibelleService,
            @RestClient QuotaProxyClient quotaProxyClient,
            @RestClient QuotaRendezvousProxyClient quotaRendezvousProxyClient) {

        this.referentielLibelleService = referentielLibelleService;
        this.quotaProxyClient = quotaProxyClient;
        this.quotaRendezvousProxyClient = quotaRendezvousProxyClient;
    }

    public void update(List<QuotaOutput> input, String idUser) throws TechnicalException {
        try {
            quotaProxyClient.updateQuota(input, idUser);
        } catch (Exception e) {
            LOGGER.error("Un problème est survenue à la mise à jour des quotas. erreur : " + e.getMessage());
            throw new TechnicalException("Un problème est survenu lors de la mise à jour des quotas.");
        }
    }

   public List<QuotaResponse> listerQuotas(
        String structure,
        String dateDebut,
        String dateFin,
        String statutQuota) throws TechnicalException {

    try {
        List<QuotaResponse> quotas = quotaRendezvousProxyClient.listerQuotas(
                structure,
                dateDebut,
                dateFin,
                statutQuota
        );

        if (quotas.isEmpty()) {
            return quotas;
        }

        List<OrganigrammeAgenceResponse> organigramme =
                organigrammeAgenceService.getOrganigramme();

        // Ces recherches sont mémorisées uniquement pour cet appel.
        Map<String, Optional<OrganigrammeAgenceResponse>> agencesParCode =
                new HashMap<>();
        Map<String, Optional<OrganigrammeAgenceResponse>> zonesParCode =
                new HashMap<>();
        Map<String, Optional<OrganigrammeAgenceResponse>> regionsParCode =
                new HashMap<>();

        for (QuotaResponse quota : quotas) {
            String codeStructure = quota.getStructure();

            // 1. Agence
            Optional<OrganigrammeAgenceResponse> agence =
                    agencesParCode.computeIfAbsent(
                            codeStructure,
                            code -> organigramme.stream()
                                    .filter(entree -> code.equals(entree.getCodeAgence()))
                                    .findFirst()
                    );

            if (agence.isPresent()) {
                OrganigrammeAgenceResponse entree = agence.get();

                quota.setCodeRegion(entree.getCodeRegion());
                quota.setLibelleRegion(entree.getLibelleRegion());
                quota.setCodeZone(entree.getCodeZone());
                quota.setLibelleZone(entree.getLibelleZone());
                quota.setCodeAgence(entree.getCodeAgence());
                quota.setLibelleAgence(entree.getLibelleAgence());
            }

            // 2. National
            if ("0RA".equals(codeStructure)) {
                quota.setCodeRegion("");
                quota.setLibelleRegion("");
                quota.setCodeZone("");
                quota.setLibelleZone("");
                quota.setCodeAgence("");
                quota.setLibelleAgence("");
            }

            // 3. Zone, uniquement si le libellé zone est null
            if (quota.getLibelleZone() == null) {
                Optional<OrganigrammeAgenceResponse> zone =
                        zonesParCode.computeIfAbsent(
                                codeStructure,
                                code -> organigramme.stream()
                                        .filter(entree -> code.equals(entree.getCodeZone()))
                                        .findFirst()
                        );

                if (zone.isPresent()) {
                    OrganigrammeAgenceResponse entree = zone.get();

                    quota.setCodeRegion(entree.getCodeRegion());
                    quota.setLibelleRegion(entree.getLibelleRegion());
                    quota.setCodeZone(entree.getCodeZone());
                    quota.setLibelleZone(entree.getLibelleZone());
                    quota.setCodeAgence("");
                    quota.setLibelleAgence("");
                }
            }

            // 4. Région, uniquement si le libellé région est null
            if (quota.getLibelleRegion() == null) {
                Optional<OrganigrammeAgenceResponse> region =
                        regionsParCode.computeIfAbsent(
                                codeStructure,
                                code -> organigramme.stream()
                                        .filter(entree -> code.equals(entree.getCodeRegion()))
                                        .findFirst()
                        );

                if (region.isPresent()) {
                    OrganigrammeAgenceResponse entree = region.get();

                    quota.setCodeRegion(entree.getCodeRegion());
                    quota.setLibelleRegion(entree.getLibelleRegion());
                    quota.setCodeZone("");
                    quota.setLibelleZone("");
                    quota.setCodeAgence("");
                    quota.setLibelleAgence("");
                }
            }
        }

        return quotas;

    } catch (Exception e) {
        e.printStackTrace();

        throw buildTechnicalException(
                e,
                "Un problème est survenu lors de la récupération des quotas"
        );
    }
}

    public QuotaResponse lireQuota(String idQuota) throws TechnicalException {
        try {
            return quotaRendezvousProxyClient.lireQuota(idQuota);
        } catch (Exception e) {
            throw buildTechnicalException(e, "Un problème est survenu lors de la récupération d'un quota");
        }
    }

    public CreationQuotaResponse creationQuota(CreationQuotaRequest request)
            throws TechnicalException {

        try {

            return quotaRendezvousProxyClient.creationQuota(request);

        } catch (Exception e) {
            throw buildTechnicalException(e, "Un problème est survenu lors de la création d'un quota");
        }
    }

    public void suppressionQuota(String idQuota) throws TechnicalException {

        try {

            quotaRendezvousProxyClient.suppresionQuota(idQuota);

        } catch (Exception e) {
            throw buildTechnicalException(e, "Un problème est survenu lors de la suppression d'un quota");
        }
    }

    /**
     * Retourne la liste des agences
     * de type BU
     * depuis le fichier structureAgences
     *
     * @return
     * @throws TechnicalException
     */
    public List<AgenceReponse> getAgencesList() throws TechnicalException {
        Map<String, String> results = this.referentielLibelleService.getAllLibelles(ReferentielLibelleEnum.STRUCTURE_AGENCE);

        List<AgenceReponse> agences = new ArrayList<>();
        for (Map.Entry<String, String> entry : results.entrySet()) {
            agences.add(new AgenceReponse(entry.getKey(), entry.getValue()));
        }
        agences.sort(Comparator.comparing(AgenceReponse::getNom, String.CASE_INSENSITIVE_ORDER));
        return agences;
    }

    /**
     * Fonction pour jeter l exception en cas d erreurs
     *
     * @param e:            exception
     * @param errorMessage: errorMessage
     * @return une technical exception
     */
    private TechnicalException buildTechnicalException(Exception e, String errorMessage) {
        LOGGER.error("{} : {}", errorMessage, e.getMessage(), e);

        if (e instanceof CoveuseRestGenericException exception) {
            return new TechnicalException((ErrorMessage) exception.getErrorMessage());
        }
        return new TechnicalException(errorMessage);
    }

    public List<AgenceReponse> getRegions() {

        return organigrammeAgenceService
                .getOrganigramme()
                .stream()
                .collect(Collectors.toMap(
                        OrganigrammeAgenceResponse::getCodeRegion,
                        OrganigrammeAgenceResponse::getLibelleRegion,
                        (a, b) -> a))
                .entrySet()
                .stream()
                .map(e ->
                        new AgenceReponse(
                                e.getKey(),
                                e.getValue()))
                .sorted(
                        Comparator.comparing(
                                AgenceReponse::getNom))
                .toList();
    }
    public List<AgenceReponse> getZones(
            String region) {

        return organigrammeAgenceService
                .getOrganigramme()
                .stream()
                .filter(x ->
                        region.equals(
                                x.getCodeRegion()))
                .collect(Collectors.toMap(
                        OrganigrammeAgenceResponse::getCodeZone,
                        OrganigrammeAgenceResponse::getLibelleZone,
                        (a, b) -> a))
                .entrySet()
                .stream()
                .map(e ->
                        new AgenceReponse(
                                e.getKey(),
                                e.getValue()))
                .sorted(
                        Comparator.comparing(
                                AgenceReponse::getNom))
                .toList();
    }

    public List<AgenceReponse> getAgencesZone(
            String zone) {

        return organigrammeAgenceService
                .getOrganigramme()
                .stream()
                .filter(x ->
                        zone.equals(
                                x.getCodeZone()))
                .map(x ->
                        new AgenceReponse(
                                x.getCodeAgence(),
                                x.getLibelleAgence()))
                .sorted(
                        Comparator.comparing(
                                AgenceReponse::getNom))
                .toList();
    }


    public List<QuotaResponse> listerQuotasCascade(
            String type,
            String code,
            String statutQuota)
            throws TechnicalException {

        List<QuotaResponse> resultat =
                new ArrayList<>();
        try {

            List<QuotaResponse> quotasStructure =
                    quotaRendezvousProxyClient
                            .listerQuotas(
                                    code,
                                    "",
                                    "",
                                    statutQuota);


            resultat.addAll(quotasStructure);
            for (QuotaResponse quota : quotasStructure) {

                if ("NATIONAL".equals(type)) {

                    quota.setCodeRegion("");
                    quota.setLibelleRegion("");

                    quota.setCodeZone("");
                    quota.setLibelleZone("");

                    quota.setCodeAgence("");
                    quota.setLibelleAgence("");

                } else if ("REGION".equals(type)) {

                    OrganigrammeAgenceResponse region =
                            organigrammeAgenceService
                                    .getOrganigramme()
                                    .stream()
                                    .filter(o ->
                                            code.equals(
                                                    o.getCodeRegion()))
                                    .findFirst()
                                    .orElse(null);

                    if (region != null) {

                        quota.setCodeRegion(
                                region.getCodeRegion());

                        quota.setLibelleRegion(
                                region.getLibelleRegion());

                        quota.setCodeZone("");
                        quota.setLibelleZone("");

                        quota.setCodeAgence("");
                        quota.setLibelleAgence("");
                    }

                } else if ("ZONE".equals(type)) {

                    OrganigrammeAgenceResponse zone =
                            organigrammeAgenceService
                                    .getOrganigramme()
                                    .stream()
                                    .filter(o ->
                                            code.equals(
                                                    o.getCodeZone()))
                                    .findFirst()
                                    .orElse(null);

                    if (zone != null) {

                        quota.setCodeRegion(
                                zone.getCodeRegion());

                        quota.setLibelleRegion(
                                zone.getLibelleRegion());

                        quota.setCodeZone(
                                zone.getCodeZone());

                        quota.setLibelleZone(
                                zone.getLibelleZone());

                        quota.setCodeAgence("");
                        quota.setLibelleAgence("");
                    }
                }
            }


        } catch (Exception e) {

            e.printStackTrace();
        }

        List<OrganigrammeAgenceResponse> agences;

        if ("NATIONAL".equals(type)) {

            agences =
                    organigrammeAgenceService
                            .getOrganigramme();

            // Quota National (0RA)
            resultat.addAll(
                    listerQuotas(
                            "0RA",
                            "",
                            "",
                            statutQuota)
            );

            // Quotas Région
            organigrammeAgenceService
                    .getOrganigramme()
                    .stream()
                    .map(OrganigrammeAgenceResponse::getCodeRegion)
                    .distinct()
                    .forEach(region -> {

                        try {

                            resultat.addAll(
                                    listerQuotas(
                                            region,
                                            "",
                                            "",
                                            statutQuota)
                            );

                        } catch (TechnicalException e) {

                            e.printStackTrace();
                        }
                    });

            // Quotas Zone
            organigrammeAgenceService
                    .getOrganigramme()
                    .stream()
                    .map(OrganigrammeAgenceResponse::getCodeZone)
                    .distinct()
                    .forEach(zone -> {

                        try {

                            resultat.addAll(
                                    listerQuotas(
                                            zone,
                                            "",
                                            "",
                                            statutQuota)
                            );

                        } catch (TechnicalException e) {

                            e.printStackTrace();
                        }
                    });

        } else if ("REGION".equals(type)) {

            agences =
                    organigrammeAgenceService
                            .getOrganigramme()
                            .stream()
                            .filter(a ->
                                    code.equals(
                                            a.getCodeRegion()))
                            .toList();

        } else if ("ZONE".equals(type)) {

            agences =
                    organigrammeAgenceService
                            .getOrganigramme()
                            .stream()
                            .filter(a ->
                                    code.equals(
                                            a.getCodeZone()))
                            .toList();

        } else {

            agences =
                    organigrammeAgenceService
                            .getOrganigramme()
                            .stream()
                            .filter(a ->
                                    code.equals(
                                            a.getCodeAgence()))
                            .toList();
        }

        for (OrganigrammeAgenceResponse agence : agences) {

            try {

                List<QuotaResponse> quotas =
                        quotaRendezvousProxyClient
                                .listerQuotas(
                                        agence.getCodeAgence(),
                                        "",
                                        "",
                                        statutQuota);


                quotas.forEach(q -> {

                    q.setCodeRegion(
                            agence.getCodeRegion());

                    q.setLibelleRegion(
                            agence.getLibelleRegion());

                    q.setCodeZone(
                            agence.getCodeZone());

                    q.setLibelleZone(
                            agence.getLibelleZone());

                    q.setCodeAgence(
                            agence.getCodeAgence());

                    q.setLibelleAgence(
                            agence.getLibelleAgence());

                });

                resultat.addAll(quotas);

            } catch (Exception e) {

                e.printStackTrace();
            }
        }

        return resultat.stream()
                .collect(Collectors.toMap(
                        QuotaResponse::getIdQuota,
                        q -> q,
                        (a, b) -> a))
                .values()
                .stream()
                .toList();
    }

    public List<AgenceReponse> getAllZones() {

        return organigrammeAgenceService
                .getOrganigramme()
                .stream()
                .collect(Collectors.toMap(
                        OrganigrammeAgenceResponse::getCodeZone,
                        OrganigrammeAgenceResponse::getLibelleZone,
                        (a, b) -> a))
                .entrySet()
                .stream()
                .map(e ->
                        new AgenceReponse(
                                e.getKey(),
                                e.getValue()))
                .sorted(
                        Comparator.comparing(
                                AgenceReponse::getNom))
                .toList();
    }

    public List<AgenceReponse> getAgencesRegion(
            String region) {

        return organigrammeAgenceService
                .getOrganigramme()
                .stream()
                .filter(x ->
                        region.equals(
                                x.getCodeRegion()))
                .collect(Collectors.toMap(
                        OrganigrammeAgenceResponse::getCodeAgence,
                        OrganigrammeAgenceResponse::getLibelleAgence,
                        (a, b) -> a))
                .entrySet()
                .stream()
                .map(e ->
                        new AgenceReponse(
                                e.getKey(),
                                e.getValue()))
                .sorted(
                        Comparator.comparing(
                                AgenceReponse::getNom))
                .toList();
    }
}
