// Emails / ids stables. Labels, notes, sujets, CTAs → i18n (contact.<id>.*)
import { assetUrl } from '../utils/assets.js'

export const contacts = [
  {
    id: 'booking',
    email: 'almenaprod@gmail.com',
  },
  {
    id: 'press',
    email: 'doyamusicofficial@gmail.com',
  },
]

/** Destinataires des demandes de devis port (gros volumes). */
export const shippingQuoteEmails = contacts.map((contact) => contact.email)

export const pressKit = {
  href: assetUrl('pressbook/press book Fr A.pdf'),
}
