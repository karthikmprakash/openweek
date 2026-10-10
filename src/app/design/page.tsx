export const metadata = { title: "Interface" };

export default function DesignPage() {
  return (
    <main id="main" className="wrap page stack">
      <h1>Interface</h1>
      <p className="lede">Buttons, fields, and states used across the studio and the member schedule.</p>
      <div className="row">
        <button className="btn btn-primary" type="button">
          Primary
        </button>
        <button className="btn btn-secondary" type="button">
          Secondary
        </button>
        <button className="btn btn-ghost" type="button">
          Ghost
        </button>
        <button className="btn btn-danger" type="button">
          Danger
        </button>
        <button className="btn btn-primary" type="button" disabled>
          Disabled
        </button>
      </div>
      <form className="card grid-form">
        <label className="field">
          <span>Name</span>
          <input name="sample" defaultValue="Avery Lane" />
        </label>
        <p className="banner" role="alert">
          This class is full.
        </p>
        <p className="ok">You’re in.</p>
      </form>
    </main>
  );
}
