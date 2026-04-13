import { Link } from "react-router-dom";

export default function HomePage() {
  const features = [
    {
      title: "Secure Auth",
      text: "Register and login with JWT access + refresh flow built for your assignment."
    },
    {
      title: "Document Dashboard",
      text: "Create, rename, and delete documents with latest updated time visibility."
    },
    {
      title: "Block-first Vision",
      text: "Prepared architecture for paragraph, heading, todo, code, divider, and image blocks."
    }
  ];

  const milestones = [
    "Day 1: Auth + Dashboard + DB schema",
    "Day 2-3: Core block editor interactions",
    "Day 4: Reorder, autosave, share read-only link",
    "Day 5: Edge-case hardening + final docs"
  ];

  return (
    <main className="home-shell">
      <nav className="home-nav">
        <Link to="/" className="home-brand">BlockNote</Link>
        <div className="home-nav-actions">
          <Link to="/login" className="home-link">Login</Link>
          <Link to="/register" className="home-link home-link-primary">Register</Link>
        </div>
      </nav>

      <div className="home-content">
        <div className="home-stack">
          <section className="home-hero home-info-card">
            <h1>Write your ideas in blocks.</h1>
            <p className="subtle">
              A clean editor workflow inspired by modern block-based docs. Start by logging in or creating an account.
            </p>
            <div className="actions home-actions">
              <Link to="/login" className="home-link home-link-primary">Go to Login</Link>
              <Link to="/register" className="home-link">Create Account</Link>
            </div>
          </section>

          <section className="home-grid">
            {features.map((item) => (
              <article className="home-info-card" key={item.title}>
                <h2>{item.title}</h2>
                <p className="subtle">{item.text}</p>
              </article>
            ))}
          </section>

          <section className="home-split">
            <article className="home-info-card">
              <h2>Block Types You Will Build</h2>
              <div className="home-chip-wrap">
                <span className="home-chip">paragraph</span>
                <span className="home-chip">heading_1</span>
                <span className="home-chip">heading_2</span>
                <span className="home-chip">todo</span>
                <span className="home-chip">code</span>
                <span className="home-chip">divider</span>
                <span className="home-chip">image</span>
              </div>
            </article>

            <article className="home-info-card">
              <h2>Practical Timeline</h2>
              <ul className="home-list">
                {milestones.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </article>
          </section>
        </div>
      </div>
    </main>
  );
}
