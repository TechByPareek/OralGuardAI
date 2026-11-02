import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import ScrollToTop from './components/ScrollToTop'

const Home = lazy(() => import('./pages/Home'))
const AssessmentForm = lazy(() => import('./pages/AssessmentForm'))
const Results = lazy(() => import('./pages/Results'))

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<div className="page-shell" aria-label="Loading OralGuard" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/assess" element={<AssessmentForm />} />
            <Route path="/results" element={<Results />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  )
}
