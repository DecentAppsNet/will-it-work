import React from 'react';
import ReactDOM from 'react-dom/client';
import { initApp } from './init/init.ts';
import Router from './router/Router.tsx';
import './index.css';

initApp().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Router />
    </React.StrictMode>
  );
});