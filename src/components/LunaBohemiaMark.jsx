import mark from '../assets/logos/luna-bohemia-mark.webp'
import mark320 from '../assets/logos/luna-bohemia-mark-320.webp'
import mark640 from '../assets/logos/luna-bohemia-mark-640.webp'

/** Logo LUNA BOHEMIA (noir, fond transparent). */
function LunaBohemiaMark({ className = '' }) {
  return (
    <img
      className={`luna-bohemia-mark${className ? ` ${className}` : ''}`}
      src={mark}
      srcSet={`${mark320} 320w, ${mark640} 640w, ${mark} 1959w`}
      sizes="(max-width: 767px) 200px, 300px"
      width="1959"
      height="460"
      alt="Luna Bohemia"
    />
  )
}

export default LunaBohemiaMark
