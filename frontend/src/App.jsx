import React from 'react';
import { AppProviders } from './app/providers';
import { AppRouter } from './app/router';
import './index.css';

function App() {
  return (
    <AppProviders>
      <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500/30">
        <AppRouter />
      </div>
    </AppProviders>
  );
}

export default App;
