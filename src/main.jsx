import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { unlockAudioOnFirstTouch } from './lib/audio.js'
import { setUpNativeShell } from './lib/native.js'

unlockAudioOnFirstTouch()
setUpNativeShell()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
