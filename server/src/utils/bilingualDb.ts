/** Mirror legacy single-language writes into explicit EN/AR columns during W8 transition. */

export function bilingualTitleFromLegacy(title: string, titleAr = title) {
  return {
    title,
    titleEn: title,
    titleAr,
  };
}

export function bilingualDescriptionFromLegacy(
  description: string | null | undefined,
  descriptionAr = description ?? null,
) {
  return {
    description: description ?? null,
    descriptionEn: description ?? null,
    descriptionAr: descriptionAr ?? null,
  };
}

export function bilingualLocationFromLegacy(
  location: string | null | undefined,
  locationAr = location ?? null,
) {
  return {
    location: location ?? null,
    locationEn: location ?? null,
    locationAr: locationAr ?? null,
  };
}

export function bilingualDisplayNameFromLegacy(displayName: string, displayNameAr = displayName) {
  return {
    displayName,
    displayNameEn: displayName,
    displayNameAr,
  };
}

export function bilingualNameFromLegacy(name: string, nameAr = name) {
  return {
    name,
    nameEn: name,
    nameAr,
  };
}

export function bilingualTitleFields(titleEn: string, titleAr: string) {
  return {
    title: titleEn,
    titleEn,
    titleAr,
  };
}

export function bilingualDescriptionFields(
  descriptionEn: string | null | undefined,
  descriptionAr: string | null | undefined,
) {
  return {
    description: descriptionEn ?? null,
    descriptionEn: descriptionEn ?? null,
    descriptionAr: descriptionAr ?? null,
  };
}

export function bilingualLocationFields(
  locationEn: string | null | undefined,
  locationAr: string | null | undefined,
) {
  return {
    location: locationEn ?? null,
    locationEn: locationEn ?? null,
    locationAr: locationAr ?? null,
  };
}

export function bilingualDisplayNameFields(displayNameEn: string, displayNameAr: string) {
  return {
    displayName: displayNameEn,
    displayNameEn,
    displayNameAr,
  };
}

export function bilingualNameFields(nameEn: string, nameAr: string) {
  return {
    name: nameEn,
    nameEn,
    nameAr,
  };
}

export function bilingualCertificateTitleFields(titleEn: string, titleAr: string) {
  return {
    certificateTitle: titleEn,
    certificateTitleEn: titleEn,
    certificateTitleAr: titleAr,
  };
}

export function bilingualCertificateDescriptionFields(
  descriptionEn: string | null | undefined,
  descriptionAr: string | null | undefined,
) {
  return {
    certificateDescription: descriptionEn ?? null,
    certificateDescriptionEn: descriptionEn ?? null,
    certificateDescriptionAr: descriptionAr ?? null,
  };
}

export function bilingualCustomMessageFields(
  messageEn: string | null | undefined,
  messageAr: string | null | undefined,
) {
  return {
    customMessage: messageEn ?? null,
    customMessageEn: messageEn ?? null,
    customMessageAr: messageAr ?? null,
  };
}
