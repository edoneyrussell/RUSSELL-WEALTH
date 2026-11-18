import LoadingProgress from './components/LoadingProgress';
import { installRequestProgress } from './loading/requestProgress';
import './styles/loading-progress.css';
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { getLanguage } from './i18n/language.ts'

document.documentElement.lang = getLanguage();
installRequestProgress();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LoadingProgress />
    <App />
  </React.StrictMode>,
)

import './styles/dashboard-modern.css';

import './styles/soc-theme.css';

import './styles/experience.css';
