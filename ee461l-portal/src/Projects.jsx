// Projects.jsx
// ============================================================================
// This component is a simple wrapper that renders a VERTICAL LIST
// of ProjectCard components.
//
// It receives:
//   • projects  → list of all projects the user belongs to
//   • hw        → live hardware status (from MongoDB)
//
// This file contains NO state and NO backend calls.
// It is purely responsible for mapping data to UI.
//
// Exam relevance:
//   • If asked “Where are multiple ProjectCards rendered?” → here.
//   • If asked “How does hardware info flow into each card?”
//       App.jsx → DashboardView → Projects.jsx → ProjectCard.jsx
//   • If asked about adding history summaries per project,
//       you could show them inside each ProjectCard starting here.
// ============================================================================

import React from "react";
import ProjectCard from "./ProjectCard";

/**
 * Properly stacked project list.
 * Removes layout issues by forcing a block flow + spacing.
 */
export default function Projects({ projects, hw }) {
  // If user has no projects yet, display placeholder message
  if (!projects || projects.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600 text-sm">
          You don’t have any projects yet. Create one to get started!
        </p>
      </div>
    );
  }

  // ========================================================================
  // Render the list of projects.
  // Each project gets its own <ProjectCard>, which:
  //   • Displays project info
  //   • Displays live HWSET1/HWSET2 numbers
  //
  // IMPORTANT: "hw" prop is passed through directly to each card.
  // This is how the dashboard keeps project info synced with backend hardware.
  //
  // projects.map(...) is the key operation here.
  // ========================================================================

  return (
    <div className="block space-y-6 w-full">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
          name={proj.name}
          id={proj.id}
          description={proj.description}
          members={proj.members}
          hw={hw}  // Pass hardware data to each card
        />
      ))}
    </div>
  );
}