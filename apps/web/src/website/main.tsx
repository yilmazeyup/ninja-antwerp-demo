import '../i18n/install';
import '../common/base.css';
import './site.css';

import { createRoot } from 'react-dom/client';

import { installBase } from '../common/install';
import { Site } from './Site';

installBase();

createRoot(document.getElementById('root')!).render(<Site />);
