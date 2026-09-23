import Link from "next/link";

export default function NotFound() {
  return <main className="standalone-state"><p>404</p><h1>Diese Seite wurde nicht gefunden.</h1><span>The page you requested could not be found.</span><Link className="button primary-button" href="/de">Zur Startseite</Link></main>;
}
