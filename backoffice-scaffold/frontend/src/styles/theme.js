// Petit système de styles partagé pour le back office (pas de Tailwind dans ce
// service séparé — on reste en styles inline pour éviter d'ajouter une chaîne de
// build supplémentaire, en reprenant la palette de l'app principale).
export const colors = {
  bg: '#F9EAE1',
  bg2: '#F0E1D8',
  card: '#FFFFFF',
  border: 'rgba(197, 160, 89, 0.18)',
  text: '#8C6239',
  textSoft: 'rgba(140, 98, 57, 0.65)',
  gold: '#C5A059',
  success: '#15803d',
  successBg: '#dcfce7',
  danger: '#b91c1c',
  dangerBg: '#fee2e2',
  warning: '#a16207',
  warningBg: '#fef9c3',
  info: '#1d4ed8',
  infoBg: '#dbeafe',
};

export const card = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  boxShadow: '0 8px 24px rgba(140, 98, 57, 0.06)',
};

export const input = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  fontSize: 14,
  color: colors.text,
  background: '#fff',
};

export const button = (variant = 'primary') => {
  const base = {
    padding: '10px 16px',
    borderRadius: 999,
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  };
  if (variant === 'primary') return { ...base, background: colors.text, color: '#fff' };
  if (variant === 'danger') return { ...base, background: colors.dangerBg, color: colors.danger };
  if (variant === 'ghost') return { ...base, background: 'transparent', color: colors.text, border: `1px solid ${colors.border}` };
  if (variant === 'success') return { ...base, background: colors.successBg, color: colors.success };
  return base;
};

export const badge = (tone = 'info') => {
  const map = {
    success: { background: colors.successBg, color: colors.success },
    danger: { background: colors.dangerBg, color: colors.danger },
    warning: { background: colors.warningBg, color: colors.warning },
    info: { background: colors.infoBg, color: colors.info },
    neutral: { background: '#f1f5f9', color: '#475569' },
  };
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    ...(map[tone] || map.info),
  };
};

export const table = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

export const th = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 12,
  fontWeight: 700,
  color: colors.text,
  background: 'rgba(249, 234, 225, 0.5)',
  borderBottom: `1px solid ${colors.border}`,
};

export const td = {
  padding: '12px 14px',
  borderBottom: `1px solid ${colors.border}`,
  color: colors.text,
  verticalAlign: 'top',
};
