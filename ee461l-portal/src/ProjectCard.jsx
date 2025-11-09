import React, { useState } from "react";

// Helper for App-consistent primary button style (h-10, rounded-xl)
function ActionButton({ children, onClick, disabled }) {
  // Use h-10, standard padding, and rounded-xl for consistency with App.jsx
  const base = "h-10 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap";
  // The blue primary style from App.jsx's Button component
  const styles = "bg-blue-600 text-white hover:bg-blue-700"; 

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
    >
      {children}
    </button>
  );
}

// The main Project Card component with consistent gap-4 styling.
export default function ProjectCard({ name, id, description, members }) {
  // NOTE: State remains local here.
  const [hwSet1, setHwSet1] = useState(50);
  const [hwSet2, setHwSet2] = useState(0);
  const [qty, setQty] = useState("");
  const [message, setMessage] = useState(""); 

  // Single handler for both check-in and check-out actions (unchanged logic)
  const handleAction = (type) => {
    const val = parseInt(qty) || 0;
    
    if (val <= 0) {
      setMessage("Please enter a positive quantity.");
      return;
    }

    let actionMessage;
    let newHwSet1 = hwSet1;
    
    if (type === 'IN') {
      newHwSet1 = Math.min(hwSet1 + val, 100);
      actionMessage = `SUCCESS: Checked in ${val} units.`;
    } else { // 'OUT'
      newHwSet1 = Math.max(newHwSet1 - val, 0); 
      actionMessage = `SUCCESS: Checked out ${val} units.`;
    }

    setHwSet1(newHwSet1);
    setQty("");
    setMessage(actionMessage);
    
    setTimeout(() => setMessage(""), 5000); 
  };

  const isQtyValid = qty !== "" && parseInt(qty) > 0;
  const memberCount = Array.isArray(members) ? members.length : 0;

  return (
    <div className="w-full flex-shrink-0 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      
      {/* Main Container: Separates Project Info from the Actions/Status group */}
      <div className="flex items-center justify-between gap-6">

        {/* 1. Project Info (Left side) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h4 className="text-xl font-bold text-gray-900">
              {name || "New Project"}
            </h4>
            <p className="text-sm text-gray-600">
              {description || "hi"}
            </p>
          </div>
          <p className="text-sm text-gray-600 mt-1">ID: {id || '444444'}</p>
          <p className="text-sm text-gray-600">Members: {memberCount}</p>
        </div>

        {/* 2. HWSet Status and Actions (Right side) 
            This container uses the consistent medium gap of gap-4 between its children: 
            HWSet Status, Input field, and the button group.
        */}
        <div className="flex items-center gap-4 flex-shrink-0">
            
          {/* HWSet Status */}
          <div className="text-sm text-gray-700 whitespace-nowrap">
            <p className="mb-1">
              HWSet1: {hwSet1}/100
            </p>
            <p>
              HWSet2: {hwSet2}/100
            </p>
          </div>

          {/* Input Field: h-10, w-24 */}
          <input
            type="number"
            min="0"
            placeholder="Enter qty"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              setMessage(""); 
            }}
            // Standard h-10 height for consistency
            className="h-10 w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />

          {/* Button Container: Separates the two buttons with gap-3 */}
          <div className="flex items-center gap-3">
            <ActionButton 
              onClick={() => handleAction('OUT')} 
              disabled={!isQtyValid}
            >
              Check Out
            </ActionButton>
            <ActionButton 
              onClick={() => handleAction('IN')} 
              disabled={!isQtyValid}
            >
              Check In
            </ActionButton>
          </div>
        </div>
      </div>
      
      {/* Feedback Message Box */}
      {message && (
        <div className={`mt-4 text-sm font-medium p-3 rounded-lg border 
          ${message.startsWith('SUCCESS') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
        `}>
          {message}
        </div>
      )}
    </div>
  );
}