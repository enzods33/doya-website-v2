// Ancres publiques stables : ne jamais renommer #music, #about, #gallery, #live, #shop, #contact.
export const navigation = [
  { labelKey: 'nav.music', href: '#music' },
  { labelKey: 'nav.about', href: '#about' },
  { labelKey: 'nav.gallery', href: '#gallery' },
  { labelKey: 'nav.live', href: '#live' },
  { labelKey: 'nav.shop', href: '#shop' },
  { labelKey: 'nav.contact', href: '#contact' },
]

// Même structure que desktop (Bio inclus).
export const mobileNavigation = navigation

export const siteContent = {
  name: 'DOYA',
  year: 2026,
  albumTitle: 'Luna Bohemia',
  biography: null, // fallback i18n ; source live = table site_bio (admin)
  contactUrl: '#contact',
}
