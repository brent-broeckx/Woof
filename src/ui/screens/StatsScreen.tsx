import { TOTAL_LEVELS } from '../../core/progression/levels';
import { useNav } from '../../store/navStore';
import { useSave } from '../../store/saveStore';
import { TopBar, formatTime } from '../components/common';
import { tierIcon, useBadges } from '../hooks/useBadges';

export function StatsScreen() {
  const go = useNav((s) => s.go);
  const { stats, progress, daily, inventory, treats } = useSave();
  const t = stats.totals;
  const levelsDone = Object.keys(progress).filter((id) => Number(id) <= TOTAL_LEVELS).length;
  const extraDone = Object.keys(progress).length - levelsDone;
  const stars = Object.values(progress).reduce((a, p) => a + p.stars, 0);
  const threeStars = Object.values(progress).filter((p) => p.stars === 3).length;
  const items = Object.values(inventory).reduce((a, n) => a + n, 0);

  const hardest = Object.entries(stats.levels)
    .map(([id, s]) => ({ id: Number(id), ...s, score: s.mistakes + 2 * s.losses + s.powerUps }))
    .filter((l) => l.wins > 0 || l.losses > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const tiles: [string, string | number][] = [
    ['Levels cleared', `${levelsDone}/${TOTAL_LEVELS}`],
    ...(extraDone > 0 ? ([['Extra levels', extraDone]] as [string, number][]) : []),
    ['Stars', stars],
    ['Perfect ★★★', threeStars],
    ['Puzzles solved', t.puzzlesSolved + t.dailySolved + t.endlessSolved],
    ['Bonus games', t.bonusPlayed],
    ['Daily best streak', daily.best],
    ['Endless solved', t.endlessSolved],
    ['Mistakes', t.mistakes],
    ['Power-ups used', t.powerUpsUsed],
    ['Power-ups owned', items],
    ['Treats', treats],
    ['Time played', formatTime(t.playMs)],
  ];

  const badges = useBadges();

  return (
    <div className="screen stats-screen">
      <TopBar onBack={() => go({ name: 'title' })} title="📊 Stats" />
      <div className="stats-grid">
        {tiles.map(([label, value]) => (
          <div key={label} className="stat-tile">
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="card badge-showcase">
        <h3>🏅 Badges</h3>
        <div className="badge-row">
          {badges.map((b) => (
            <span key={b.badge.id} className={`badge-mini ${b.earned ? '' : 'dim'}`} title={b.badge.name}>
              {b.badge.icon}
              <small>{tierIcon(b.earned)}</small>
            </span>
          ))}
        </div>
        <button className="btn small" onClick={() => go({ name: 'badges' })}>
          See all badges
        </button>
      </div>
      {hardest.length > 0 && (
        <div className="card">
          <h3>Toughest levels</h3>
          <table className="stats-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Tries</th>
                <th>Mistakes</th>
                <th>Losses</th>
                <th>Avg time</th>
              </tr>
            </thead>
            <tbody>
              {hardest.map((l) => (
                <tr key={l.id}>
                  <td>
                    <button className="link" onClick={() => go({ name: 'level', id: l.id })}>
                      {l.id}
                    </button>
                  </td>
                  <td>{l.attempts}</td>
                  <td>{l.mistakes}</td>
                  <td>{l.losses}</td>
                  <td>{l.wins ? formatTime(l.totalMs / l.wins) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
