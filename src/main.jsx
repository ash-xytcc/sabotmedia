import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './admin-polish.css'
import './printlab-disabled-tools.css'
import './audio-lab.css'
import './audio-lab-recording.css'
import './audio-lab-phase4.css'
import './audio-lab-phase5.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
