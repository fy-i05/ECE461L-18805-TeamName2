// ProjectCard.jsx
// ============================================================================
// This component renders a single project card in the dashboard view.
// It is used inside Projects.jsx, which maps over all of a user's projects.
//
// What it shows:
//   • Project name, ID, description
//   • Number of members
//   • Live hardware availability pulled from MongoDB
//
// NOTE FOR MIDTERM QUESTIONS:
//   • You would NOT modify hardware here (checkout happens in ProjectView).
//   • But you might reference this file if asked “Where do you show per-project
//     hardware summaries?”
//   • If you later wanted to display *history* or *duration*, this would be a
//     possible place to show a summary.
//
// This is a pure UI component — it has no state and no backend calls.
// ============================================================================

import React from "react";

export default function ProjectCard({ name, id, description, members, hw }) {
  // Count number of members for display
  const memberCount = Array.isArray(members) ? members.length : 0;

  // ---------------------------------------------------------------------------
  // Pull live hardware status from "hw" prop.
  // hw is passed from App.jsx -> DashboardView -> Projects.jsx -> ProjectCard
  //
  // hw = {
  //   HWSET1: { capacity, checkedOut },
  //   HWSET2: { capacity, checkedOut }
  // }
  //
  // This makes each card show the *global* hardware availability (not per-project).
  // ---------------------------------------------------------------------------

  const hw1Cap = hw?.HWSET1?.capacity ?? 0;
  const hw1Used = hw?.HWSET1?.checkedOut ?? 0;

  const hw2Cap = hw?.HWSET2?.capacity ?? 0;
  const hw2Used = hw?.HWSET2?.checkedOut ?? 0;

  // Compute availability numbers
  const hw1Avail = hw1Cap - hw1Used;
  const hw2Avail = hw2Cap - hw2Used;

  // ========================================================================
  // Render: PROJECT CARD UI
  //
  // This is the box you see under "Your Projects".
  // Clicking the project name does NOT open anything — the parent determines
  // that when user selects from dropdown and clicks “Open Project”.
  //
  // Only responsibility here:
  //   - Show project info
  //   - Show live hardware numbers
  // ========================================================================

  return (
    <div className="w-full flex-shrink-0 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-6">

        {/* -----------------------------------------
            LEFT SIDE — PROJECT METADATA
            ----------------------------------------- */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-bold text-gray-900">
            {name || "Untitled Project"}
          </h4>

          <p className="text-sm text-gray-600">
            {description || "No description provided"}
          </p>

          <p className="text-sm text-gray-600 mt-1">ID: {id}</p>
          <p className="text-sm text-gray-600">Members: {memberCount}</p>
        </div>

        {/* -----------------------------------------
            RIGHT SIDE — GLOBAL HARDWARE STATUS
            This shows:
              HWSet1: available / total
              HWSet2: available / total
            ----------------------------------------- */}

        <div className="text-sm text-gray-700 whitespace-nowrap text-right">
          <p className="mb-1">
            HWSet1:{" "}
            <span className="font-semibold text-gray-900">
              {hw1Avail}/{hw1Cap}
            </span>
          </p>
          <p>
            HWSet2:{" "}
            <span className="font-semibold text-gray-900">
              {hw2Avail}/{hw2Cap}
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}