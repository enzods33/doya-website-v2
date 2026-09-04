import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { navigation, mobileNavigation, siteContent } from '../data/siteContent.js'
import { commerceConfigured } from '../commerce/config.js'
import { useCart } from '../commerce/CartProvider.jsx'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Stars, Wordmark, MenuIcon, CartIcon, HomeIcon } from './Brand.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import Link from './Link.jsx'
import { editorialEase } from '../utils/motion.js'
import { useRoute } from '../utils/router.js'

function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const dialogRef = useRef(null)
  const triggerRef = useRef(null)
  const bodyOverflowRef = useRef(null)
  const reducedMotion = useReducedMotion()
  const { path } = useRoute()
  const { count } = useCart()
  const { t } = useI18n()
  const prevCountRef = useRef(count)
  const [cartPulse, setCartPulse] = useState(false)

  useEffect(() => {
    if (count > prevCountRef.current) {
      setCartPulse(true)
      const timer = window.setTimeout(() => setCartPulse(false), 700)
      prevCountRef.current = count
      return () => window.clearTimeout(timer)
    }
    prevCountRef.current = count
  }, [count])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!menuOpen || dialog.open) return
    bodyOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
  }, [menuOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      dialog.close()
      if (bodyOverflowRef.current !== null) document.body.style.overflow = bodyOverflowRef.current
    }
  }, [])

  function finishClosingMenu() {
    if (menuOpen || !dialogRef.current.open) return
    dialogRef.current.close()
    document.body.style.overflow = bodyOverflowRef.current ?? ''
    bodyOverflowRef.current = null
    triggerRef.current?.focus({ preventScroll: true })
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = (event) => { if (event.matches) setMenuOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [])

  function keepFocusInMenu(event) {
    if (event.key !== 'Tab') return
    const controls = [...dialogRef.current.querySelectorAll('button, a[href]')]
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function sectionHref(href) {
    return path === '/' ? href : `/${href}`
  }

  const tools = []

  return (
    <m.header className={`site-header${path === '/' ? '' : ' is-page'}`} initial={reducedMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.1, ease: editorialEase }}>
      <div className="header-start">
        <Link
          href={path === '/' ? '#top' : '/'}
          className="header-home"
          aria-label={t('a11y.home')}
        >
          <HomeIcon className="header-home-icon" />
        </Link>
        <Link href={path === '/' ? '#about' : '/#about'} className="header-brand" aria-label={t('a11y.brandBio')}>
          <Wordmark className="header-brand-wordmark" />
        </Link>
        <Stars color="red" className="header-stars" />
      </div>
      <nav className="desktop-navigation" aria-label={t('a11y.navMain')}>
        {navigation.map((item) => (
          <Link key={item.href} href={sectionHref(item.href)}>
            {t(item.labelKey)}
          </Link>
        ))}
        <LanguageSwitcher className="header-language-switcher header-nav-language" />
      </nav>
      <div className="header-end">
        {commerceConfigured && (
          <Link
            href="/panier"
            className={`header-cart${cartPulse ? ' is-pulse' : ''}`}
            aria-label={count ? t('nav.cartWithCount', { count }) : t('nav.cart')}
          >
            <CartIcon className="header-cart-icon" />
            {count > 0 && <span className="header-cart-badge">{count > 99 ? '99+' : count}</span>}
          </Link>
        )}
        <button ref={triggerRef} type="button" className="menu-trigger" aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={t('a11y.menuOpen')} onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </button>
      </div>
      <m.dialog ref={dialogRef} id="mobile-menu" className="mobile-menu" aria-label={t('a11y.menuDialog')} onKeyDown={keepFocusInMenu}
        onCancel={(event) => { event.preventDefault(); setMenuOpen(false) }} onClose={() => setMenuOpen(false)}
        initial={false} animate={{ opacity: menuOpen ? 1 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.28 }}
        onAnimationComplete={finishClosingMenu}>
        <div className="mobile-menu-top">
          <Wordmark className="mobile-wordmark" />
          <button type="button" autoFocus onClick={() => setMenuOpen(false)} aria-label={t('a11y.menuClose')}>{t('nav.menuClose')} <span aria-hidden="true">×</span></button>
        </div>
        <m.nav aria-label={t('a11y.navMobile')} initial={false} animate={menuOpen ? 'open' : 'closed'}
          variants={{ open: { transition: { delayChildren: reducedMotion ? 0 : 0.08, staggerChildren: reducedMotion ? 0 : 0.055 } }, closed: {} }}>
          {[...mobileNavigation.map((item) => ({ ...item, label: t(item.labelKey) })), ...tools].map((item, index) => (
            <m.a key={item.href} href={item.href.startsWith('#') ? sectionHref(item.href) : item.href} onClick={() => setMenuOpen(false)}
              variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 } }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: editorialEase }}><span>{String(index + 1).padStart(2, '0')}</span>{item.label}</m.a>
          ))}
        </m.nav>
        <LanguageSwitcher className="mobile-language-switcher" />
        <div className="mobile-menu-bottom">
          <p>{siteContent.albumTitle}<br />{siteContent.year}</p>
        </div>
        <Stars className="mobile-menu-stars" />
      </m.dialog>
    </m.header>
  )
}

export default Header
