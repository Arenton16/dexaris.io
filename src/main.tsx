import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { PoolsProvider } from './contexts/PoolsContext';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PoolsProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app" element={<App />} />
          </Routes>
        </BrowserRouter>
      </PoolsProvider>
    </ErrorBoundary>
  </StrictMode>
);
