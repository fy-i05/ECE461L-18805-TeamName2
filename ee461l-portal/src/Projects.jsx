import React from "react";
import ProjectCard from "./ProjectCard";

/**
 * Properly stacked project list.
 * Removes horizontal flow issues by using block flow and spacing.
 */
export default function Projects({ projects, hw }) {
  if (!projects || projects.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600 text-sm">
          You don’t have any projects yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="block space-y-6 w-full">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
          name={proj.name}
          id={proj.id}
          description={proj.description}
          members={proj.members}
          hw={hw} // ✅ pass live hardware data
        />
      ))}
    </div>
  );
}