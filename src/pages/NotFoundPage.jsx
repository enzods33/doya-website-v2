import Link from '../components/Link.jsx'

function NotFoundPage() {
  return (
    <main id="main" className="page-main" tabIndex={-1}>
      <div className="page-shell">
        <p className="eyebrow section-kicker">DOYA</p>
        <h1 className="editorial-title page-title">Page introuvable</h1>
        <p className="page-back"><Link href="/" className="text-link">Retour à l’accueil <span aria-hidden="true">↗</span></Link></p>
      </div>
    </main>
  )
}

export default NotFoundPage
