// Same photograph and crop as the original. Versioned filenames allow long caching.
export const heroImage = {
  src: '/site/hero-95679591479f-1600.webp',
  srcSet: [768, 1200, 1600, 1920, 2400]
    .map((width) => `/site/hero-95679591479f-${width}.webp ${width}w`)
    .join(', '),
  // The square image covers the viewport, including portrait mobile screens.
  sizes: 'max(100vw, 100svh)',
  mobile: {
    src: '/assets/hero-95679591479f-mobile45-1600.avif',
    srcSet: [768, 1200, 1600, 1920]
      .map((width) => `/assets/hero-95679591479f-mobile45-${width}.avif ${width}w`)
      .join(', '),
    sizes: 'max(100vw, 100svh)',
    type: 'image/avif',
    media: '(max-width: 767px)',
  },
  backgroundSrc: '/site/hero-95679591479f-768.webp',
  width: 2400,
  height: 2400,
}
