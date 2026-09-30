import { POWER_UPS, POWER_UP_IDS, type PowerUpId } from '../../core/economy/powerups';

interface PowerUpTrayProps {
  inventory: Record<PowerUpId, number>;
  active: PowerUpId | null;
  disabled: boolean;
  onUse(id: PowerUpId): void;
}

export function PowerUpTray({ inventory, active, disabled, onUse }: PowerUpTrayProps) {
  return (
    <div className="tray" role="toolbar" aria-label="Power-ups">
      {POWER_UP_IDS.map((id) => {
        const def = POWER_UPS[id];
        const count = inventory[id];
        return (
          <button
            key={id}
            className={`powerup rarity-${def.rarity} ${active === id ? 'active' : ''}`}
            disabled={disabled || count <= 0}
            onClick={() => onUse(id)}
            title={`${def.name}: ${def.description}`}
            aria-label={`${def.name} (${count})`}
          >
            <span className="icon">{def.icon}</span>
            <span className="count">{count}</span>
            <span className="label">{def.name}</span>
          </button>
        );
      })}
    </div>
  );
}
