import { BrandLogo } from './BrandLogo.jsx';

export function AppLayout({ views, activeView, onChangeView, title, user, actions, children, refreshing = false }) {
  const groupedViews = views.reduce((groups, view) => {
    const group = view.group || 'Menu';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(view);
    return groups;
  }, new Map());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo />
        </div>
        <nav>
          {Array.from(groupedViews.entries()).map(([group, groupViews]) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {groupViews.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    className={view.id === activeView ? 'active' : ''}
                    onClick={() => onChangeView(view.id)}
                  >
                    <Icon size={16} />
                    <span>{view.label}</span>
                    {view.pending ? <small>breve</small> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{(user?.email || 'B').slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user?.email || 'Usuário'}</strong>
            <span>Binhotti Gestão</span>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <h1>{title}</h1>
          <div>{actions}</div>
        </header>
        <div className={`content-area ${refreshing ? 'is-refreshing' : ''}`} aria-busy={refreshing}>
          {children}
        </div>
      </main>
    </div>
  );
}
