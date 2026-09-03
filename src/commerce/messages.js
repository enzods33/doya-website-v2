export const commerceMessages = {
  empty_cart: 'Le panier est vide.',
  invalid_cart: 'Le panier n’est plus valide.',
  invalid_quantity: 'Quantité impossible.',
  too_many_lines: 'Trop de lignes dans le panier.',
  too_many_items: 'Trop d’articles dans le panier.',
  duplicate_line: 'Cette taille est déjà dans le panier.',
  out_of_stock: 'Cette taille n’est plus disponible.',
  product_unavailable: 'Cette pièce n’est pas en vente.',
  promo_invalid: 'Code invalide ou expiré.',
  promo_already_used: 'Ce code a déjà été utilisé avec cet e-mail.',
  email_required: 'Indiquer un e-mail pour le reçu.',
  invalid_email: 'E-mail invalide.',
  invalid_session: 'Session expirée. Se reconnecter.',
  shipping_not_configured: 'Livraison encore en configuration.',
  stripe_unavailable: 'Paiement indisponible pour le moment.',
  origin_not_allowed: 'Origine non autorisée.',
  commerce_disabled: 'La boutique n’est pas encore connectée.',
  added: 'Ajouté au panier.',
  choose_size: 'Choisir une taille.',
  magic_sent: 'Lien de connexion envoyé. Vérifier la boîte mail.',
  canceled: 'Paiement annulé. Le stock n’a pas été débité.',
}

export function commerceMessage(code) {
  return commerceMessages[code] ?? 'Action impossible pour le moment.'
}
