// Visuels merch P224 — noms / types / couleurs → i18n (shop.product.*, shop.type.*, shop.color.*)

function shopImage(file) {
  return new URL(`../assets/images/shop/${file}`, import.meta.url).href
}

export const products = [
  {
    id: 'cd-luna-bohemia',
    typeKey: 'cd',
    colorKey: 'digipack',
    defaultView: 'front',
    front: shopImage('cd-luna-bohemia-front.jpg'),
    back: shopImage('cd-luna-bohemia-back.png'),
    width: 1024,
    height: 1024,
    price: null,
    url: null,
  },
  {
    id: 'luna-bohemia-white',
    typeKey: 'tshirt',
    colorKey: 'white',
    defaultView: 'front',
    front: shopImage('luna-bohemia-white-front.png'),
    back: shopImage('luna-bohemia-white-back.png'),
    width: 1600,
    height: 1600,
    price: null,
    url: null,
  },
  {
    id: 'luna-bohemia-black',
    typeKey: 'tshirt',
    colorKey: 'black',
    defaultView: 'front',
    front: shopImage('luna-bohemia-black-front.png'),
    back: shopImage('luna-bohemia-black-back.png'),
    width: 1600,
    height: 1600,
    price: null,
    url: null,
  },
  {
    id: 'doya-white',
    typeKey: 'tshirt',
    colorKey: 'white',
    defaultView: 'front',
    front: shopImage('doya-white-front.png'),
    back: shopImage('doya-white-back.png'),
    width: 1600,
    height: 1600,
    price: null,
    url: null,
  },
  {
    id: 'doya-black',
    typeKey: 'tshirt',
    colorKey: 'black',
    defaultView: 'front',
    front: shopImage('doya-black-front.png'),
    back: shopImage('doya-black-back.png'),
    width: 1600,
    height: 1600,
    price: null,
    url: null,
  },
]
