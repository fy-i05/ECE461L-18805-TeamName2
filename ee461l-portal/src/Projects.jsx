import React from "react";
import ProjectCard from "./ProjectCard";

/**
 * List-only renderer for projects. Header lives in App.jsx.
 */
export default function Projects({ projects }) {
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
    <div className="flex flex-col gap-6">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
          name={proj.name}
          id={proj.id}
          description={proj.description}
          members={proj.members}
        />
      ))}
    </div>
  );
}