import { useEffect, useRef, useState } from 'react'
import { m, useReducedMotion } from 'motion/react'
import { navigation, mobileNavigation, siteContent } from '../data/siteContent.js'
import { commerceConfigured } from '../commerce/config.js'
import { useCart } from '../commerce/CartProvider.jsx'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { Stars, Wordmark, MenuIcon, CartIcon, HomeIcon } from './Brand.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NewsletterSignup from './NewsletterSignup.jsx'
import StudioCredit from './StudioCredit.jsx'
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
    if (!dialog) return undefined

    if (menuOpen) {
      if (!dialog.open) {
        bodyOverflowRef.current = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        dialog.show()
      }
      return undefined
    }

    return undefined
  }, [menuOpen])

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) dialog.close()
      if (bodyOverflowRef.current !== null) document.body.style.overflow = bodyOverflowRef.current
    }
  }, [])

  function finishClosingMenu() {
    if (menuOpen || !dialogRef.current?.open) return
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

  useEffect(() => {
    if (!menuOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  function keepFocusInMenu(event) {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    if (!dialog) return
    const controls = [
      triggerRef.current,
      ...dialog.querySelectorAll('button, a[href], input, select, textarea'),
    ].filter(Boolean)
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

  function toggleMenu() {
    setMenuOpen((open) => !open)
  }

  return (
    <m.header
      className={`site-header${path === '/' ? '' : ' is-page'}${menuOpen ? ' is-menu-open' : ''}`}
      initial={reducedMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : 0.1, ease: editorialEase }}
    >
      <div className="header-start">
        <Link
          href={path === '/' ? '#top' : '/'}
          className="header-home"
          aria-label={t('a11y.home')}
          onClick={() => setMenuOpen(false)}
        >
          <HomeIcon className="header-home-icon" />
        </Link>
        <Link
          href={path === '/' ? '#about' : '/#about'}
          className="header-brand"
          aria-label={t('a11y.brandBio')}
          onClick={() => setMenuOpen(false)}
        >
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
            onClick={() => setMenuOpen(false)}
          >
            <CartIcon className="header-cart-icon" />
            {count > 0 && <span className="header-cart-badge">{count > 99 ? '99+' : count}</span>}
          </Link>
        )}
        <button
          ref={triggerRef}
          type="button"
          className={`menu-trigger${menuOpen ? ' is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t('a11y.menuClose') : t('a11y.menuOpen')}
          onClick={toggleMenu}
        >
          <MenuIcon open={menuOpen} />
        </button>
      </div>
      {menuOpen ? (
        <button
          type="button"
          className="mobile-menu-backdrop"
          aria-label={t('a11y.menuClose')}
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <m.dialog
        ref={dialogRef}
        id="mobile-menu"
        className="mobile-menu"
        aria-label={t('a11y.menuDialog')}
        onKeyDown={keepFocusInMenu}
        onCancel={(event) => { event.preventDefault(); setMenuOpen(false) }}
        onClose={() => setMenuOpen(false)}
        initial={false}
        animate={{ opacity: menuOpen ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.28 }}
        onAnimationComplete={finishClosingMenu}
      >
        <m.nav
          aria-label={t('a11y.navMobile')}
          initial={false}
          animate={menuOpen ? 'open' : 'closed'}
          variants={{ open: { transition: { delayChildren: reducedMotion ? 0 : 0.08, staggerChildren: reducedMotion ? 0 : 0.055 } }, closed: {} }}
        >
          {mobileNavigation.map((item) => (
            <m.div
              key={item.href}
              variants={{ open: { opacity: 1, y: 0 }, closed: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 } }}
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: editorialEase }}
            >
              <Link
                href={item.href.startsWith('#') ? sectionHref(item.href) : item.href}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.labelKey)}
              </Link>
            </m.div>
          ))}
        </m.nav>
        <div className="mobile-menu-foot">
          <div className="mobile-menu-mid">
            <NewsletterSignup variant="menu" className="mobile-menu-newsletter" />
          </div>
          <div className="mobile-menu-foot-bar">
            <p className="mobile-menu-meta">{siteContent.name} {siteContent.year}</p>
            <LanguageSwitcher className="mobile-language-switcher" />
          </div>
          <div className="mobile-menu-studio">
            <StudioCredit className="mobile-menu-studio-credit" />
          </div>
        </div>
      </m.dialog>
    </m.header>
  )
}

export default Header
