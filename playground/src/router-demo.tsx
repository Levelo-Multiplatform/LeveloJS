import { Pages, Page, navigate } from "levelojs";

function Home() {
  return (
    <section>
      <h2>Home</h2>
      <p>This is the home route.</p>
    </section>
  );
}

function About() {
  return (
    <section>
      <h2>About</h2>
      <p>This is the about route.</p>
    </section>
  );
}

function Contact() {
  return (
    <section>
      <h2>Contact</h2>
      <p>This is the contact route.</p>
    </section>
  );
}

export function RouterDemo() {
  return (
    <main style={{ padding: "32px", fontFamily: "system-ui, sans-serif" }}>
      <h1>Router Demo</h1>
      <p>
        Click a link below. The view should swap cleanly — no stacked
        headings, scroll resets to top on every navigation.
      </p>

      <nav style={{ display: "flex", gap: "16px", margin: "24px 0" }}>
        <a href="/">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/does-not-exist">404</a>
      </nav>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <button type="button" onClick={() => navigate("/")}>
          navigate("/")
        </button>
        <button type="button" onClick={() => navigate("/about")}>
          navigate("/about")
        </button>
        <button type="button" onClick={() => navigate("/contact")}>
          navigate("/contact")
        </button>
      </div>

      <hr />

      <Pages>
        <Page path="/router" component={Home} />
        <Page path="/router/about" component={About} />
        <Page path="/router/contact" component={Contact} />
      </Pages>

      <hr />

      <p style={{ color: "#64748b", fontSize: "14px" }}>
        Current path: <code>{window.location.pathname}</code>
      </p>
    </main>
  );
}