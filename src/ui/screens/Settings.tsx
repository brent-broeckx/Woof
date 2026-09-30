import { useState } from 'react';
import { useNav } from '../../store/navStore';
import { exportSave, useSave, type Settings as SettingsData } from '../../store/saveStore';
import { Modal, TopBar } from '../components/common';

const TOGGLES: { key: keyof SettingsData; label: string; help: string }[] = [
  { key: 'autoCross', label: 'Auto-cross', help: 'After placing a dog, mark every tile it rules out.' },
  { key: 'highlightDone', label: 'Highlight finished lines', help: 'Dim rows, columns and yards that already have their dog.' },
  { key: 'showTimer', label: 'Show timer', help: 'Show how long you have been playing a level.' },
  { key: 'reducedMotion', label: 'Reduce motion', help: 'Turn off bouncy animations.' },
];

export function Settings() {
  const go = useNav((s) => s.go);
  const settings = useSave((s) => s.settings);
  const update = useSave((s) => s.updateSettings);
  const [io, setIo] = useState<{ mode: 'export' | 'import'; text: string; error?: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="screen settings-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="⚙️ Settings" />
      <div className="card">
        {TOGGLES.map((t) => (
          <label key={t.key} className="toggle">
            <div>
              <div className="name">{t.label}</div>
              <div className="desc">{t.help}</div>
            </div>
            <input type="checkbox" checked={settings[t.key] as boolean} onChange={(e) => update({ [t.key]: e.target.checked })} />
          </label>
        ))}
        <label className="toggle">
          <div>
            <div className="name">Single tap places…</div>
            <div className="desc">What a single tap does. Double-tap / long-press does the other.</div>
          </div>
          <select value={settings.placementMode} onChange={(e) => update({ placementMode: e.target.value as 'x' | 'dog' })}>
            <option value="x">✕ Cross</option>
            <option value="dog">🐶 Dog</option>
          </select>
        </label>
      </div>
      <div className="card">
        <h3>Save data</h3>
        <p className="muted">Progress is saved in this browser. Copy it to move to another device.</p>
        <div className="row">
          <button className="btn" onClick={() => setIo({ mode: 'export', text: exportSave() })}>
            Export
          </button>
          <button className="btn" onClick={() => setIo({ mode: 'import', text: '' })}>
            Import
          </button>
          <button className="btn danger" onClick={() => setConfirmReset(true)}>
            Reset
          </button>
        </div>
      </div>

      {io && (
        <Modal onClose={() => setIo(null)}>
          <h2>{io.mode === 'export' ? 'Export save' : 'Import save'}</h2>
          <textarea
            className="save-text"
            value={io.text}
            readOnly={io.mode === 'export'}
            onFocus={(e) => io.mode === 'export' && e.target.select()}
            onChange={(e) => setIo({ ...io, text: e.target.value, error: undefined })}
          />
          {io.error && <p className="error">{io.error}</p>}
          <div className="modal-actions">
            {io.mode === 'export' ? (
              <button className="btn primary" onClick={() => void navigator.clipboard?.writeText(io.text).then(() => setIo(null))}>
                Copy
              </button>
            ) : (
              <button
                className="btn primary"
                onClick={() => (useSave.getState().importSave(io.text) ? setIo(null) : setIo({ ...io, error: 'That does not look like a Woofdoku save.' }))}
              >
                Import
              </button>
            )}
            <button className="btn ghost" onClick={() => setIo(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <h2>Reset everything?</h2>
          <p>All progress, treats and power-ups will be lost.</p>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
            <button
              className="btn danger"
              onClick={() => {
                useSave.getState().resetAll();
                setConfirmReset(false);
                go({ name: 'title' });
              }}
            >
              Reset
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
