import { assetUrl } from '../utils/assets.js'
import { heroImage } from '../config/heroImage.js'
import cover400 from '../assets/music/cover-400.webp'
import cover640 from '../assets/music/cover-640.webp'

const cover1004 = assetUrl('site/cover.jpg')

function bioWeb(file, width, height) {
  return {
    src: assetUrl(`bio/web/${file}`),
    width,
    height,
    alt: 'Photographie DOYA - Luna Bohemia.',
  }
}

/** Hero responsive local ; album et éditorial sur Cloudflare R2 (`VITE_ASSETS_URL`). */
export const media = {
  hero: {
    ...heroImage,
    alt: 'DOYA assises de face sur des chaises dans le désert, l’une en noir, l’autre en blanc.',
    sourcePage: 9,
  },
  cover: {
    src: cover1004,
    srcSet: `${cover400} 400w, ${cover640} 640w, ${cover1004} 1004w`,
    sizes: '(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 45vw, 610px',
    width: 1004,
    height: 1004,
    alt: 'Pochette officielle de Luna Bohemia : DOYA assises dans le désert, entourées des lettres D O Y A.',
    sourcePage: 9,
  },
  editorial: {
    src: assetUrl('site/editorial.jpg'),
    width: 717,
    height: 478,
    alt: 'Les deux artistes de DOYA se tiennent à distance sur une crête de roche claire.',
    sourcePage: 26,
  },
}

/** Galerie Bio - versions web optimisées sur Cloudflare R2 */
export const galleryImages = [
  bioWeb('_1460826_C.jpg', 1201, 1600),
  bioWeb('_ENF7092_C.jpg', 1066, 1600),
  bioWeb('_ENF7125_C.jpg', 1067, 1600),
  bioWeb('_ENF7191_C.jpg', 1600, 1067),
  bioWeb('_ENF7222_C.jpg', 1600, 1066),
  bioWeb('_ENF7231_C.jpg', 1600, 1067),
  bioWeb('_ENF7237_C.jpg', 1600, 1067),
  bioWeb('_ENF7240_C.jpg', 1067, 1600),
  bioWeb('_ENF7252_C.jpg', 1600, 1067),
  bioWeb('_ENF7254_C.jpg', 1067, 1600),
  bioWeb('_ENF7267_C.jpg', 1066, 1600),
  bioWeb('_ENF7270_C.jpg', 1600, 1067),
  bioWeb('_ENF7292_C.jpg', 1600, 1066),
  bioWeb('_ENF7322_C.jpg', 1067, 1600),
  bioWeb('_ENF7328_C.jpg', 1066, 1600),
  bioWeb('_ENF7421_C.jpg', 1067, 1600),
  bioWeb('_ENF7445_C.jpg', 1600, 1600),
  bioWeb('_ENF7453_C.jpg', 1067, 1600),
  bioWeb('_ENF7460_C.jpg', 1067, 1600),
  bioWeb('_ENF7461_C.jpg', 1067, 1600),
  bioWeb('_ENF7468_C.jpg', 1067, 1600),
  bioWeb('_ENF7472_C.jpg', 1111, 1600),
  bioWeb('_ENF7535_C.jpg', 1067, 1600),
  bioWeb('_ENF7545_C.jpg', 1067, 1600),
  bioWeb('_ENF7561_C.jpg', 1067, 1600),
  bioWeb('_ENF7568_C.jpg', 1067, 1600),
  bioWeb('_ENF7578_C.jpg', 1600, 1067),
  bioWeb('_ENF7582_C.jpg', 1600, 1067),
  bioWeb('_ENF7591_C.jpg', 1600, 1067),
]
