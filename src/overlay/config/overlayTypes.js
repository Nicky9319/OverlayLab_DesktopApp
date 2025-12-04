// Overlay type configuration
export const OVERLAY_TYPES = {
  LEADFLOW: 'leadflow',
  AIRTYPE: 'airtype',
  CLIPVAULT: 'clipvault',
};

export const overlayTypesConfig = [
  {
    id: OVERLAY_TYPES.LEADFLOW,
    name: 'Leadflow',
    logoPath: '/src/renderer/assets/leadflow_logo.png',
    component: 'LeadflowOverlay', // Will be handled in mainPage
  },
  {
    id: OVERLAY_TYPES.AIRTYPE,
    name: 'Airtype',
    logoPath: '/src/renderer/assets/airtype_logo.png',
    component: 'AirtypeOverlay',
  },
  {
    id: OVERLAY_TYPES.CLIPVAULT,
    name: 'Clip Vault',
    logoPath: '/src/renderer/assets/clipvault_logo.png',
    component: 'ClipVaultOverlay',
  },
];

export const getOverlayTypeById = (id) => {
  return overlayTypesConfig.find(type => type.id === id);
};

export const getDefaultOverlayType = () => {
  return OVERLAY_TYPES.LEADFLOW;
};


