import Brand from "./Brand";

type LandingPageProps = { onStartDesigning: () => void };

const features = [
  {
    number: "01",
    title: "Design with UML",
    description:
      "Build class diagrams with classes, attributes, methods, and relationships.",
  },
  {
    number: "02",
    title: "Think visually",
    description:
      "Arrange your ideas on an open canvas and connect the pieces as your design takes shape.",
  },
  {
    number: "03",
    title: "Learn by building",
    description:
      "Practice low-level design in small steps, with a workspace made for exploration.",
  },
];

export default function LandingPage({ onStartDesigning }: LandingPageProps) {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Brand />
        <button
          className="landing-nav-link"
          type="button"
          onClick={onStartDesigning}
        >
          Open editor <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">LOW-LEVEL DESIGN, MADE PRACTICAL</p>
          <h1>
            Think it through.
            <br />
            <span>Diagram it clearly.</span>
          </h1>
          <p className="landing-intro">
            Learn low-level design by turning ideas into clear, editable UML
            class diagrams. Start with the structure, then shape the details.
          </p>
          <button
            className="landing-cta"
            type="button"
            onClick={onStartDesigning}
          >
            Start designing <span aria-hidden="true">→</span>
          </button>
          <p className="landing-caption">A focused workspace for your next design.</p>
        </div>

        <div className="landing-preview" aria-label="Example class diagram">
          <div className="preview-topline">
            <span className="preview-dots" aria-hidden="true">
              <i /> <i /> <i />
            </span>
            <span>CLASS DIAGRAM</span>
            <span className="preview-status">● &nbsp;Canvas ready</span>
          </div>
          <div className="preview-canvas">
            <div className="preview-connector" aria-hidden="true" />
            <article className="preview-class preview-class--user">
              <h2>User</h2>
              <p>id: string</p>
              <p>name: string</p>
              <footer>+ placeOrder(): Order</footer>
            </article>
            <article className="preview-class preview-class--order">
              <h2>Order</h2>
              <p>id: string</p>
              <p>status: string</p>
              <footer>+ cancel(): void</footer>
            </article>
            <span className="preview-relation">association</span>
          </div>
          <div className="preview-footer">
            <span>Drag to arrange</span>
            <span>Connect to relate <b>→</b></span>
          </div>
        </div>
      </section>

      <section className="landing-features" aria-labelledby="features-title">
        <div className="features-heading">
          <p className="landing-eyebrow">YOUR DESIGN WORKBENCH</p>
          <h2 id="features-title">A clear place to work through an idea.</h2>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <Brand />
        <span>Practice thoughtful software design, one diagram at a time.</span>
      </footer>
    </main>
  );
}
