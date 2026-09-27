import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import CallOverlay from './calls/CallOverlay.jsx';
import { CallProvider } from './calls/CallContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CallProvider>
          <App />
          <CallOverlay />
        </CallProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
