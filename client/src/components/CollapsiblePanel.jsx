export default function CollapsiblePanel({
  side = 'left',
  title,
  collapsed,
  onToggle,
  className = '',
  children,
}) {
  return (
    <div
      className={[
        'collapsible-panel',
        `collapsible-panel--${side}`,
        collapsed ? 'collapsible-panel--collapsed' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="collapsible-panel-toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expandir ${title}` : `Contraer ${title}`}
        title={collapsed ? `Expandir ${title}` : `Contraer ${title}`}
      >
        {side === 'left' ?
          collapsed ?
            '›'
          : '‹'
        : collapsed ?
          '‹'
        : '›'}
      </button>
      {collapsed ?
        <span className="collapsible-panel-collapsed-label">{title}</span>
      : children}
    </div>
  );
}
