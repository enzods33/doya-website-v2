import mark from '../assets/logos/luna-bohemia-mark.png'

/** Logo LUNA BOHEMIA (noir, fond transparent). */
function LunaBohemiaMark({ className = '' }) {
  return (
    <img
      className={`luna-bohemia-mark${className ? ` ${className}` : ''}`}
      src={mark}
      width="1959"
      height="460"
      alt="Luna Bohemia"
    />
  )
}

export default LunaBohemiaMark
