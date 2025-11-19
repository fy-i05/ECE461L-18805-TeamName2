// main.jsx
// ============================================================================
// This is the ENTRY POINT of the React application.
//
// React projects always need a file that:
//   • Selects the root <div> in index.html
//   • Renders the top-level <App /> component into it
//
// In Vite + React, this file is usually called main.jsx.
// It replaces the old ReactDOM.render() calls used in older versions.
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Global CSS import — tailwind and custom styling.
// Make sure index.css exists or Vite will throw an error.
import './index.css';

// ============================================================================
// ReactDOM.createRoot(...)
//
//
// This tells React:
//
//   1. Find <div id="root"></div> in the HTML file (index.html).
//   2. Start the React component tree from the <App /> component.
//   3. Use <React.StrictMode> to help catch warnings in development.
//
// The ENTIRE frontend rendering starts HERE.
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* The entire UI is inside <App /> */}
    <App />
  </React.StrictMode>
);