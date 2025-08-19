import React from 'react';

type Props = {
  /** Array of display names (or userIds) currently typing */
  users: string[];
  className?: string;
};

/** Named export */
export function TypingIndicator({ users, className = '' }: Props) {
  if (!users || users.length === 0) return null;

  const label = formatTyping(users);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center text-sm text-gray-500 ${className}`}
      title={label}
    >
      <span className="mr-1">{label}</span>
      <Dots />
    </div>
  );
}

/** Default export (so `import TypingIndicator from '…'` works) */
export default TypingIndicator;

/* ---------- helpers ---------- */

function formatTyping(users: string[]) {
  const unique = Array.from(new Set(users));
  if (unique.length === 1) return `${display(unique[0])} is typing`;
  if (unique.length === 2) return `${display(unique[0])} and ${display(unique[1])} are typing`;
  return `${display(unique[0])}, ${display(unique[1])} and ${unique.length - 2} others are typing`;
}

function display(idOrName: string) {
  // If you pass IDs, map to display names here as needed.
  return idOrName;
}

function Dots() {
  // Simple accessible "typing" animation via CSS classes
  return (
    <span aria-hidden="true" className="inline-flex ml-1">
      <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
      <span className="w-1 h-1 rounded-full bg-current mx-1 animate-pulse" style={{ animationDelay: '120ms' }} />
      <span className="w-1 h-1 rounded-full bg-current animate-pulse" style={{ animationDelay: '240ms' }} />
    </span>
  );
}