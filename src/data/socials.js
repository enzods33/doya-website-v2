// Profils du duo vérifiés : reference/social-links.md.
// group: listen = plateformes d’écoute + YouTube ; social = réseaux.
export const socials = [
  { id: 'spotify', name: 'Spotify', url: 'https://open.spotify.com/artist/1JGqJy0whUevjrA3Tw6OMA', group: 'listen' },
  { id: 'apple', name: 'Apple Music', url: 'https://music.apple.com/fr/artist/doya/1646461706', group: 'listen' },
  { id: 'deezer', name: 'Deezer', url: 'https://www.deezer.com/artist/184643787', group: 'listen' },
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com/@DOYAofficial_', group: 'listen' },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com/doyaofficial_/', group: 'social' },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com/@doyaofficial_', group: 'social' },
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com/doya.music/', group: 'social' },
]

export const listenSocials = socials.filter((social) => social.group === 'listen')
export const networkSocials = socials.filter((social) => social.group === 'social')
