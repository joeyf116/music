import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { unlockAudioOnFirstTouch } from './lib/audio.js'
import { registerOffline } from './lib/offline.js'
import { migrateSettings } from './lib/storageMigrations.js'
import { AuthProvider } from './lib/useAuth.jsx'

migrateSettings()
unlockAudioOnFirstTouch()
registerOffline()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
