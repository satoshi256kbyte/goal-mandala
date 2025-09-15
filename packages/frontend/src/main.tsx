import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { configureAmplify } from './config/amplify';

// Amplifyの設定を初期化
configureAmplify();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
