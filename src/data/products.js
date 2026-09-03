const front = new URL('../assets/images/shop/shop-tshirt-doya-black-front.png', import.meta.url).href
const wordmarkFront = new URL('../assets/images/shop/shop-tshirt-wordmark-black-front.png', import.meta.url).href

// Noms / types / couleurs → i18n (shop.product.*, shop.type.*, shop.color.*)
export const products = [
  { id: 'luna-a', typeKey: 'tshirt', colorKey: 'black', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-a-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 18 },
  { id: 'luna-b', typeKey: 'tshirt', colorKey: 'black', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-b-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 19 },
  { id: 'luna-c', typeKey: 'tshirt', colorKey: 'black', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-c-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 20 },
  { id: 'doya', typeKey: 'tshirt', colorKey: 'black', front: wordmarkFront,
    back: new URL('../assets/images/shop/shop-tshirt-logo-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 21 },
  { id: 'test', typeKey: 'test', colorKey: 'black', front,
    back: new URL('../assets/images/shop/shop-tshirt-logo-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: null },
]
