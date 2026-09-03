// Hrefs stables (#music, etc.) — seuls les labels passent par i18n (labelKey).
export const navigation = [
  { labelKey: 'nav.music', href: '#music' },
  { labelKey: 'nav.live', href: '#live' },
  { labelKey: 'nav.shop', href: '#shop' },
  { labelKey: 'nav.about', href: '#about' },
  { labelKey: 'nav.contact', href: '#contact' },
]

// Même structure que desktop (Bio inclus).
export const mobileNavigation = navigation

export const siteContent = {
  name: 'DOYA',
  year: 2026,
  albumTitle: 'Luna Bohemia',
  biography: null,
  contactUrl: '#contact',
}
