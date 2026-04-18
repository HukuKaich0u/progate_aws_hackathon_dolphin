import { Button } from '../../components/ui/button'

export function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">Dolphin Calls</p>
        <h1 className="hero-title">Room-centered video calls for quick team sessions.</h1>
        <p className="hero-copy">
          Cognito-backed auth, Rust control plane, and a room UI built for realtime calls.
        </p>
        <div className="hero-actions">
          <a href="/login">
            <Button type="button">Sign in with Cognito</Button>
          </a>
          <a href="/rooms/demo-room">
            <Button type="button">Open demo room</Button>
          </a>
        </div>
      </section>
    </main>
  )
}
