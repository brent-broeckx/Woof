import { useState } from 'react';
import { TIER_NAMES, tierReward, type BadgeReward, type BadgeStatus } from '../../core/progression/badges';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { cosmeticLabel, tierIcon, useBadges } from '../hooks/useBadges';
import { sfx } from '../audio';
import { Confetti } from '../components/Confetti';
import { Modal, TopBar } from '../components/common';

function rewardText(r: BadgeReward): string {
  return [`+${r.kibble} 🥣`, `+${r.treats} 🍖`, r.cosmetic ? cosmeticLabel(r.cosmetic) : null].filter(Boolean).join(' · ');
}

export function BadgesScreen() {
  const go = useNav((s) => s.go);
  const badges = useBadges();
  const [claimed, setClaimed] = useState<{ name: string; rewards: BadgeReward[] } | null>(null);
  const earnedTiers = badges.reduce((n, b) => n + b.earned, 0);
  const totalTiers = badges.reduce((n, b) => n + b.badge.tiers.length, 0);

  const claim = (b: BadgeStatus) => {
    const rewards = useSave.getState().claimBadge(b.badge.id);
    if (!rewards) return;
    sfx('reward');
    setClaimed({ name: b.badge.name, rewards });
  };

  return (
    <div className="screen badges-screen">
      <TopBar
        onBack={() => go({ name: 'title' })}
        title="🏅 Badges"
        right={
          <span className="chip">
            {earnedTiers}/{totalTiers}
          </span>
        }
      />
      <p className="muted center">Earn bronze, silver and gold tiers. Some gold badges come with outfits you can't buy.</p>
      <div className="badge-list">
        {badges.map((b) => {
          const pending = b.earned - b.claimed;
          const max = b.badge.tiers[b.badge.tiers.length - 1];
          const target = b.next ?? max;
          const prevTarget = b.earned > 0 ? b.badge.tiers[b.earned - 1] : 0;
          const pct = b.next === null ? 100 : Math.max(0, Math.min(100, ((b.value - prevTarget) / (target - prevTarget)) * 100));
          const nextReward = b.next !== null ? tierReward(b.badge, b.earned + 1) : null;
          return (
            <div key={b.badge.id} className={`badge-card tier-${b.earned} ${pending ? 'claimable' : ''}`} aria-label={`${b.badge.name} badge`}>
              <div className="badge-icon">
                <span>{b.badge.icon}</span>
                <span className="badge-tier">{tierIcon(b.earned)}</span>
              </div>
              <div className="badge-info">
                <div className="name">
                  {b.badge.name}
                  {b.earned > 0 && <span className="muted small"> · {TIER_NAMES[b.earned - 1]}</span>}
                </div>
                <div className="desc">{b.next !== null ? b.badge.goal(b.next) : `${b.badge.goal(max)} — complete!`}</div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${pct}%` }} />
                </div>
                <div className="badge-foot muted small">
                  {b.next !== null ? `${Math.min(b.value, target)}/${target}` : 'All tiers earned'}
                  {nextReward && !pending && <> · Next: {rewardText(nextReward)}</>}
                </div>
              </div>
              {pending > 0 && (
                <button className="btn small primary" onClick={() => claim(b)}>
                  Claim{pending > 1 ? ` ×${pending}` : ''}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {claimed && (
        <>
          <Confetti count={40} />
          <Modal onClose={() => setClaimed(null)}>
            <h2>🏅 {claimed.name}</h2>
            {claimed.rewards.map((r, i) => (
              <p key={i} className="reward">
                {rewardText(r)}
              </p>
            ))}
            <button className="btn primary" onClick={() => setClaimed(null)}>
              Woof!
            </button>
          </Modal>
        </>
      )}
    </div>
  );
}
