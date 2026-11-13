import { initialsOf } from '../../utils/format';

// Initials badge for a player

export function PlayerAvatar({ name, size = '' }) {
  return <div className={`db-avatar lb-avatar ${size}`}>{initialsOf(name)}</div>;
}
