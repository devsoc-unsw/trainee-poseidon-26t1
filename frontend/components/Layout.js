import Link from 'next/link'
import Head from 'next/head'

export default function Layout({ children, title, hideCta }) {
  return (
    <div className="page">
      <Head>
        <title>{title ? `${title} · freeup` : 'freeup'}</title>
        <meta
          name="description"
          content="freeup — find a time your crew is actually free. No sign-up, just a link."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand">
            <span className="brand-dot">f</span>
            freeup
          </Link>
          <div className="nav-links">
            <Link href="/#how">how it works</Link>
            <Link href="/#features">features</Link>
            {!hideCta && (
              <Link href="/create" className="btn btn-primary">
                create a plan
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="main">{children}</main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>freeup — plans that actually happen.</span>
          <span>no accounts · no ads · just a link</span>
        </div>
      </footer>
    </div>
  )
}
