import { navigate } from '../utils/router.js'

function Link({ href, children, onClick, ...props }) {
  function handleClick(event) {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    navigate(`${url.pathname}${url.search}${url.hash}`)
  }

  return <a href={href} onClick={handleClick} {...props}>{children}</a>
}

export default Link
