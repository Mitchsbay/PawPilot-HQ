import React from 'react';

type PresenceStatus = 'online' | 'away' | 'offline';

type Props = {
  status: PresenceStatus;
  /** ISO string or Date for tooltip (optional) */
  lastSeen?: string | Date;
  /** Pixel size of the dot (default 10) */
  size?: number;
  className?: string;
  /** Accessible label override */
  ariaLabel?: string;
};

function statusColor(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'bg-green-500';
    case 'away':
      return 'bg-yellow-400';
    default:
      return 'bg-gray-400';
  }
}

function statusText(status: PresenceStatus) {
  switch (status) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    default:
      return 'Offline';
  }
}

export default function OnlineIndicator({
  status,
  lastSeen,
  size = 10,
  className = '',
  ariaLabel,
}: Props) {
  const dotStyle: React.CSSProperties = {
    width: size,
    height: size,
  };

  const label = ariaLabel ?? (() => {
    if (!lastSeen || status === 'online') return statusText(status);
    const d = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen;
    // Keep tooltip simple to avoid extra deps
    const ts = isNaN(d.getTime()) ? '' : ` • last seen ${d.toLocaleString()}`;
    return `${statusText(status)}${ts}`;
  })();

  // Title acts as a lightweight tooltip
  const title = label;

  return (
    <span
      role="status"
      aria-label={label}
      title={title}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block rounded-full ${statusColor(status)}`}
        style={dotStyle}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}