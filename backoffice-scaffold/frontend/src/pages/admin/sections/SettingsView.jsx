import { useState } from 'react';
import { colors, card, input, button } from '../../../styles/theme.js';

export default function SettingsView({ auditLogs, onChangePassword }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      await onChangePassword(form);
      setForm({ currentPassword: '', newPassword: '' });
      setFeedback({ type: 'success', message: 'Mot de passe modifié. Reconnexion nécessaire.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Erreur lors du changement de mot de passe' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 6 }}>Sécurité admin</h2>
        <p style={{ fontSize: 13, color: colors.textSoft, marginBottom: 14 }}>Changer le mot de passe invalide toutes les sessions actives.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
          <input
            type="password"
            style={input}
            value={form.currentPassword}
            onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
            placeholder="Mot de passe actuel"
            required
          />
          <input
            type="password"
            style={input}
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
            placeholder="Nouveau mot de passe (8+ caractères)"
            minLength={8}
            required
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button type="submit" style={button('primary')}>Mettre à jour</button>
            {feedback.message && <span style={{ fontSize: 13, color: feedback.type === 'success' ? colors.success : colors.danger }}>{feedback.message}</span>}
          </div>
        </form>
      </div>

      <div style={{ ...card, padding: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 6 }}>Journal d'audit</h2>
        <p style={{ fontSize: 13, color: colors.textSoft, marginBottom: 14 }}>Dernières actions sensibles effectuées par les admins.</p>
        <ul>
          {auditLogs.map((log) => (
            <li key={log._id} style={{ padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{log.action}</p>
              <p style={{ fontSize: 12, color: colors.textSoft }}>
                {new Date(log.createdAt).toLocaleString('fr-FR')} · {log.actorEmail} · {log.targetType}:{log.targetId}
              </p>
            </li>
          ))}
          {auditLogs.length === 0 && <li style={{ padding: '10px 0', fontSize: 13, color: colors.textSoft }}>Aucune entrée.</li>}
        </ul>
      </div>
    </div>
  );
}
