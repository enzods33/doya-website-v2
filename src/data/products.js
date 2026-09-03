const front = new URL('../assets/images/shop/shop-tshirt-doya-black-front.png', import.meta.url).href
const wordmarkFront = new URL('../assets/images/shop/shop-tshirt-wordmark-black-front.png', import.meta.url).href

export const products = [
  { id: 'luna-a', name: 'Luna Bohemia A', type: 'T-shirt', color: 'Noir', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-a-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 18 },
  { id: 'luna-b', name: 'Luna Bohemia B', type: 'T-shirt', color: 'Noir', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-b-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 19 },
  { id: 'luna-c', name: 'Luna Bohemia C', type: 'T-shirt', color: 'Noir', front,
    back: new URL('../assets/images/shop/shop-tshirt-luna-c-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 20 },
  { id: 'doya', name: 'DOYA', type: 'T-shirt', color: 'Noir', front: wordmarkFront,
    back: new URL('../assets/images/shop/shop-tshirt-logo-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: 21 },
  { id: 'test', name: 'Article test', type: 'Test', color: 'Noir', front,
    back: new URL('../assets/images/shop/shop-tshirt-logo-black-back.png', import.meta.url).href,
    width: 1070, height: 1070, price: null, url: null, sourcePage: null },
]

export const shopContent = {
  title: 'Shop',
  label: 'Collection Luna Bohemia',
  note: 'Visuels de collection. Disponibilités, prix et liens boutique à confirmer.',
}
