import { assetUrl } from '../utils/assets.js'

// Visuels boutique — CDN R2 uniquement (`shop/web/…`). Pas de fichiers locaux.
function shopImage(file) {
  const base = String(file).replace(/\.[^.]+$/, '')
  const isPng = /\.png$/i.test(file)
  const remoteName = isPng ? `${base}.webp` : `${base}.jpg`
  return assetUrl(`shop/web/${remoteName}`)
}

export const products = [
  {
    id: 'cd-luna-bohemia',
    typeKey: 'cd',
    colorKey: 'digipack',
    defaultView: 'front',
    front: shopImage('cd-luna-bohemia-front.jpg'),
    back: shopImage('cd-luna-bohemia-back.jpg'),
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
    width: 1400,
    height: 1400,
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
    width: 1070,
    height: 1070,
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
    width: 1400,
    height: 1400,
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
    width: 1070,
    height: 1070,
    price: null,
    url: null,
  },
]
