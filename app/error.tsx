"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="standalone-state"><p>500</p><h1>Etwas ist schiefgelaufen.</h1><span>Something went wrong. Your cart has not been changed.</span><button className="button primary-button" onClick={reset}>Erneut versuchen</button></main>;
}
