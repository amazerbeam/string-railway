import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.tsx'
// Imported by full path, NOT from the `./app` barrel: extensionless `./app` collides
// case-insensitively with `App.tsx` on NTFS — the trap documented at `src/App.tsx:41-45`.
import ErrorBoundary from './app/ErrorBoundary'

// DLR-131 — the boundary sits INSIDE StrictMode, not outside it. StrictMode's development
// double-render is exactly the condition under which a render-phase throw should be caught, and a
// boundary outside it would leave StrictMode's own subtree unguarded.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
