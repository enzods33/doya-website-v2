/** Libellés Stripe Checkout - alignés sur `shop.product.*` / `shop.color.*` i18n. */

export type CheckoutLocale = 'fr' | 'es' | 'en' | 'pt' | 'de' | 'ja' | 'ko' | 'zh' | 'ar'

const PRODUCT_BASE: Record<CheckoutLocale, Record<string, string>> = {
  fr: {
    'luna-bohemia-white': 'Étoiles',
    'luna-bohemia-black': 'Étoiles',
    'doya-white': 'Phases',
    'doya-black': 'Phases',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'Phases Kids',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  en: {
    'luna-bohemia-white': 'Stars',
    'luna-bohemia-black': 'Stars',
    'doya-white': 'Phases',
    'doya-black': 'Phases',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'Phases Kids',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  es: {
    'luna-bohemia-white': 'Estrellas',
    'luna-bohemia-black': 'Estrellas',
    'doya-white': 'Fases',
    'doya-black': 'Fases',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'Fases Kids',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  pt: {
    'luna-bohemia-white': 'Estrelas',
    'luna-bohemia-black': 'Estrelas',
    'doya-white': 'Fases',
    'doya-black': 'Fases',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'Fases Kids',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  de: {
    'luna-bohemia-white': 'Sterne',
    'luna-bohemia-black': 'Sterne',
    'doya-white': 'Phasen',
    'doya-black': 'Phasen',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'Phasen Kids',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  ja: {
    'luna-bohemia-white': '星',
    'luna-bohemia-black': '星',
    'doya-white': '月の満ち欠け',
    'doya-black': '月の満ち欠け',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': '月の満ち欠け キッズ',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  ko: {
    'luna-bohemia-white': '별',
    'luna-bohemia-black': '별',
    'doya-white': '달의 위상',
    'doya-black': '달의 위상',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': '달의 위상 키즈',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  ar: {
    'luna-bohemia-white': 'نجوم',
    'luna-bohemia-black': 'نجوم',
    'doya-white': 'الأطوار',
    'doya-black': 'الأطوار',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': 'الأطوار للأطفال',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
  zh: {
    'luna-bohemia-white': '星星',
    'luna-bohemia-black': '星星',
    'doya-white': '月相',
    'doya-black': '月相',
    'cd-luna-bohemia': 'Luna Bohemia',
    'tee-luna-mini-red': '月相儿童款',
    'cap-luna-black': 'Luna Bohemia',
    'tote-eclipse-black': 'DOYA',
  },
}

const COLOR: Record<CheckoutLocale, Record<string, string>> = {
  fr: { white: 'Blanc', black: 'Noir', red: 'Rouge', digipack: 'CD Digipack' },
  en: { white: 'White', black: 'Black', red: 'Red', digipack: 'Digipak CD' },
  es: { white: 'Blanco', black: 'Negro', red: 'Rojo', digipack: 'CD Digipack' },
  pt: { white: 'Branco', black: 'Preto', red: 'Vermelho', digipack: 'CD Digipack' },
  de: { white: 'Weiß', black: 'Schwarz', red: 'Rot', digipack: 'Digipak-CD' },
  ja: { white: 'ホワイト', black: 'ブラック', red: 'レッド', digipack: 'CDデジパック' },
  ko: { white: '화이트', black: '블랙', red: '레드', digipack: 'CD 디지팩' },
  zh: { white: '白色', black: '黑色', red: '红色', digipack: 'CD 纸盒装' },
  ar: { white: 'أبيض', black: 'أسود', red: 'أحمر', digipack: 'CD ديجيباك' },
}

const SIZE_LABEL: Record<CheckoutLocale, string> = {
  fr: 'Taille',
  en: 'Size',
  es: 'Talla',
  pt: 'Tamanho',
  de: 'Größe',
  ja: 'サイズ',
  ko: '사이즈',
  zh: '尺码',
  ar: 'المقاس',
}

const SPECIAL_SIZE: Record<CheckoutLocale, { U: string; VINYL: string; ENF: string }> = {
  fr: { U: 'Taille unique', VINYL: 'Vinyle', ENF: 'Taille enfant' },
  en: { U: 'One size', VINYL: 'Vinyl', ENF: 'Kids size' },
  es: { U: 'Talla única', VINYL: 'Vinilo', ENF: 'Talla infantil' },
  pt: { U: 'Tamanho único', VINYL: 'Vinil', ENF: 'Tamanho criança' },
  de: { U: 'Einheitsgröße', VINYL: 'Vinyl', ENF: 'Kindergröße' },
  ja: { U: 'ワンサイズ', VINYL: 'レコード', ENF: 'キッズサイズ' },
  ko: { U: '원사이즈', VINYL: '바이닐', ENF: '키즈 사이즈' },
  zh: { U: '均码', VINYL: '黑胶', ENF: '儿童尺码' },
  ar: { U: 'مقاس واحد', VINYL: 'فينيل', ENF: 'مقاس أطفال' },
}

const SHIPPING_NAME: Record<CheckoutLocale, Record<string, string>> = {
  fr: { fr: 'France métropole', eu: 'Europe (UE + Suisse)', dom: 'DOM-TOM (Réunion, Antilles…)' },
  en: { fr: 'Mainland France', eu: 'Europe (EU + Switzerland)', dom: 'French overseas (Réunion, Antilles…)' },
  es: { fr: 'Francia metropolitana', eu: 'Europa (UE + Suiza)', dom: 'Ultramar francés (Reunión, Antillas…)' },
  pt: { fr: 'França continental', eu: 'Europa (UE + Suíça)', dom: 'Ultramar francês (Reunião, Antilhas…)' },
  de: { fr: 'Französisches Festland', eu: 'Europa (EU + Schweiz)', dom: 'Französische Überseegebiete' },
  ja: { fr: 'フランス本土', eu: 'ヨーロッパ（EU + スイス）', dom: 'フランス海外領土' },
  ko: { fr: '프랑스 본토', eu: '유럽 (EU + 스위스)', dom: '프랑스 해외 영토' },
  zh: { fr: '法国本土', eu: '欧洲（欧盟 + 瑞士）', dom: '法国海外领地' },
  ar: { fr: 'فرنسا القارية', eu: 'أوروبا (الاتحاد الأوروبي + سويسرا)', dom: 'الأقاليم الفرنسية ما وراء البحار' },
}

export function normalizeCheckoutLocale(value: unknown): CheckoutLocale {
  const code = typeof value === 'string' ? value.trim().toLowerCase().split('-')[0] : ''
  if (code === 'es' || code === 'en' || code === 'pt' || code === 'de' || code === 'ja' || code === 'ko' || code === 'zh' || code === 'ar') return code
  return 'fr'
}

/** Locale Stripe Checkout Session (API). */
export function stripeCheckoutLocale(locale: CheckoutLocale): CheckoutLocale | 'auto' {
  // Stripe Checkout ne supporte pas actuellement la locale `ar`.
  // `auto` évite une erreur API tout en conservant nos libellés personnalisés en arabe.
  return locale === 'ar' ? 'auto' : locale
}

function colorKey(productId: string): 'white' | 'black' | 'red' | 'digipack' {
  if (productId === 'cd-luna-bohemia') return 'digipack'
  if (productId.endsWith('-black')) return 'black'
  if (productId.endsWith('-red')) return 'red'
  return 'white'
}

export function localizedProductName(productId: string, locale: CheckoutLocale, fallback = ''): string {
  return PRODUCT_BASE[locale][productId] || fallback.trim() || productId
}

export function stripeProductName(productId: string, locale: CheckoutLocale, fallback = ''): string {
  const base = localizedProductName(productId, locale, fallback)
  const color = COLOR[locale][colorKey(productId)]
  return `${base} - ${color}`
}

export function stripeLineDescription(size: string, locale: CheckoutLocale, variantLabel = ''): string {
  const customLabel = variantLabel.trim()
  if (customLabel && !['CD', 'U', 'VINYL', 'ENF'].includes(size)) return customLabel
  if (size === 'CD') return COLOR[locale].digipack
  if (size === 'U') return SPECIAL_SIZE[locale].U
  if (size === 'VINYL') return SPECIAL_SIZE[locale].VINYL
  if (size === 'ENF') return SPECIAL_SIZE[locale].ENF
  return `${SIZE_LABEL[locale]} ${size}`
}

export function stripeShippingDisplayName(zoneId: string, locale: CheckoutLocale, fallback: string): string {
  return SHIPPING_NAME[locale][zoneId] ?? fallback
}

/** Note sous l’adresse Stripe : changer de pays = annuler pour revenir au panier (même onglet). */
export function stripeShippingCountryHint(locale: CheckoutLocale, _cartUrl?: string): string {
  const messages: Record<CheckoutLocale, string> = {
    fr: 'Le pays est limité à la zone choisie. Pour un autre pays, annule ce paiement : tu reviens au panier dans le même onglet (aucun débit).',
    en: 'Shipping is limited to the zone you chose. For another country, cancel this payment to return to the cart in the same tab (nothing is charged).',
    es: 'El envío está limitado a la zona elegida. Para otro país, cancela este pago y volverás al carrito en la misma pestaña (sin cargo).',
    pt: 'O envio está limitado à zona escolhida. Para outro país, cancela este pagamento e voltas ao carrinho no mesmo separador (sem débito).',
    de: 'Der Versand ist auf die gewählte Zone beschränkt. Für ein anderes Land brich diese Zahlung ab; du kehrst im selben Tab zum Warenkorb zurück (keine Belastung).',
    ja: '配送先は選択した地域に限定されています。別の国へ配送する場合はこの支払いをキャンセルしてください。同じタブでカートに戻り、請求は発生しません。',
    ko: '배송 국가는 선택한 지역으로 제한됩니다. 다른 국가로 배송하려면 결제를 취소하세요. 같은 탭에서 장바구니로 돌아가며 결제 금액은 청구되지 않습니다.',
    zh: '配送国家/地区仅限所选区域。如需更换国家/地区，请取消本次支付；系统会在同一标签页返回购物车，且不会扣款。',
    ar: 'يقتصر الشحن على المنطقة التي اخترتها. لاختيار بلد آخر، ألغِ عملية الدفع للعودة إلى السلة في علامة التبويب نفسها من دون خصم أي مبلغ.',
  }
  return messages[locale] ?? messages.fr
}
