import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/globals.css';
import { Popup } from './Popup';

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root');
createRoot(el).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
