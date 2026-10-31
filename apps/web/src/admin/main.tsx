import '../i18n/install';
import '../common/base.css';
import './admin.css';
import './pages.css';

import { createRoot } from 'react-dom/client';

import { installBase } from '../common/install';
import { App } from './App';

installBase();

createRoot(document.getElementById('root')!).render(<App />);
