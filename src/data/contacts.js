// Emails / ids stables. Labels, notes, sujets, CTAs → i18n (contact.<id>.*)
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
  href: 'https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev/pressbook/press%20book%20Fr%20A.pdf',
}
