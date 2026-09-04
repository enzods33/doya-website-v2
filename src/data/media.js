const R2_BIO = 'https://pub-5b2b2b3b50ba46c485eeff926fa26420.r2.dev'

function bioWeb(file, width, height) {
  return {
    src: `${R2_BIO}/bio/web/${file}`,
    width,
    height,
    alt: 'Photographie DOYA — Luna Bohemia.',
  }
}

/** Médias encore locaux (hero + album). Le reste de la bio est sur R2. */
export const media = {
  hero: {
    src: new URL('../assets/images/doya/doya-desert-chairs-front.jpg', import.meta.url).href,
    width: 1024, height: 1024,
    alt: 'DOYA assises de face sur des chaises dans le désert, l’une en noir, l’autre en blanc.',
    sourcePage: 9,
  },
  cover: {
    src: new URL('../assets/images/luna-bohemia/luna-bohemia-cover.jpg', import.meta.url).href,
    width: 1004, height: 1004,
    alt: 'Pochette officielle de Luna Bohemia : DOYA assises dans le désert, entourées des lettres D O Y A.',
    sourcePage: 9,
  },
  editorial: {
    src: new URL('../assets/images/doya/doya-desert-02.jpg', import.meta.url).href,
    width: 717, height: 478,
    alt: 'Les deux artistes de DOYA se tiennent à distance sur une crête de roche claire.',
    sourcePage: 26,
  },
}

/** Galerie Bio — versions web optimisées sur Cloudflare R2 */
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
