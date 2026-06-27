import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    if (previousScrollRestoration) {
      window.history.scrollRestoration = 'manual'
    }

    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    scrollToTop()
    const frame = window.requestAnimationFrame(scrollToTop)

    return () => {
      if (previousScrollRestoration) {
        window.history.scrollRestoration = previousScrollRestoration
      }
      window.cancelAnimationFrame(frame)
    }
  }, [pathname])

  return null
}
