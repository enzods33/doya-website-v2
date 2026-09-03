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
  portrait: {
    src: new URL('../assets/images/doya/doya-portrait-02.jpg', import.meta.url).href,
    width: 717, height: 478,
    alt: 'Portrait de DOYA face à l’objectif devant une paroi rocheuse.',
    sourcePage: 27,
  },
  about: {
    src: new URL('../assets/images/doya/doya-portrait-03.jpg', import.meta.url).href,
    width: 717, height: 478,
    alt: 'DOYA face à l’objectif devant la roche claire de Luna Bohemia.',
    sourcePage: 27,
  },
  desert: {
    src: new URL('../assets/images/doya/doya-desert-03.jpg', import.meta.url).href,
    width: 717, height: 1021,
    alt: 'DOYA dans l’étendue des reliefs désertiques de Luna Bohemia.',
    sourcePage: 27,
  },
  chairs: {
    src: new URL('../assets/images/luna-bohemia/luna-bohemia-landscape-09.jpg', import.meta.url).href,
    width: 717, height: 494,
    alt: 'Deux chaises se détachent sur une crête du paysage désertique.',
    sourcePage: 25,
  },
  gesture: {
    src: new URL('../assets/images/doya/doya-portrait-05.jpg', import.meta.url).href,
    width: 717, height: 478,
    alt: 'Une artiste de DOYA lève les bras vers le ciel bleu.',
    sourcePage: 29,
  },
}

export const galleryImages = [media.portrait, media.desert, media.editorial, media.gesture, media.chairs]
