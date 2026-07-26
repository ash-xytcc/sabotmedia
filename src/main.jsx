import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './public-mobile.css'
import './public-admin-toolbar-fix.css'
import './admin-polish.css'
import './admin-editor-form-fix.css'
import './printlab-disabled-tools.css'
import './audio-lab.css'
import './audio-lab-recording.css'
import './audio-lab-phase4.css'
import './audio-lab-phase5.css'
import './audio-lab-phase6.css'
import './audio-lab-phase7.css'
import './audio-lab-phase8.css'
import './audio-lab-fullscreen.css'
import './audio-lab-workspace.css'
import './audio-lab-workspace-final.css'
import './audio-lab-waveform-focus.css'
import './audio-lab-professional-polish.css'
import './audio-lab-task-pages.css'
import './audio-lab-transcription.css'
import './audio-lab-direct-manipulation.css'
import './audio-lab-shortcuts.css'
import './admin-media-library.css'
import './admin-media-library-grid-fix.css'
import './audioLabKeyboardShortcuts.js'
import './audioLabWorkspaceControls.js'
import './audioLabTaskPages.js'
import './audioLabTaskNavigationFix.js'
import './audioLabBestTranscriptionResume.js'
import './audioLabLocalTranscription.js'
import './adminFileMediaInsert.js'
import './audioLabDirectManipulation.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
