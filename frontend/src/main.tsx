import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getLanguage } from './i18n/language.ts'

document.documentElement.lang = getLanguage();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import './styles/dashboard-modern.css';
