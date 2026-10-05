// Emails / ids stables. Labels, notes, sujets, CTAs → i18n (contact.<id>.*)
import { DOYA_CONTACT_EMAIL, DOYA_ORDER_NOTIFY_EMAIL } from '../config/contact.js'
import { assetUrl } from '../utils/assets.js'

export const contacts = [
  {
    id: 'booking',
    email: DOYA_CONTACT_EMAIL,
  },
  {
    id: 'press',
    email: DOYA_CONTACT_EMAIL,
  },
]

/** Destinataires des demandes de devis port (gros volumes). */
export const shippingQuoteEmails = [
  DOYA_ORDER_NOTIFY_EMAIL,
  'stephanedasil@gmail.com',
]

export const pressKit = {
  href: assetUrl('pressbook/press book Fr A.pdf'),
}
