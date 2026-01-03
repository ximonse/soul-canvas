import React from 'react'
import ReactDOM from 'react-dom/client'
import Konva from 'konva'
import App from './App.tsx'
import './index.css' // <--- Denna rad måste finnas!

if (typeof window !== 'undefined') {
  Konva.pixelRatio = window.devicePixelRatio || 1
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
