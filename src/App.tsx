import { useState } from 'react'
import { AppMode } from './app/index'

function App() {
  const [mode] = useState<AppMode>(AppMode.Campaign)

  return (
    <main>
      <h1>Prototype</h1>
      <p>Empty slate. Nothing is built here yet.</p>
      <p>Mode: {mode}</p>
    </main>
  )
}

export default App
