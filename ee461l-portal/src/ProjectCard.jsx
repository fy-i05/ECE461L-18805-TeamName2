import React from "react";

export default function ProjectCard({ name, id, description, members, hw }) {
  const memberCount = Array.isArray(members) ? members.length : 0;

  // Safely pull live hardware data
  const hw1Cap = hw?.HWSET1?.capacity ?? 0;
  const hw1Used = hw?.HWSET1?.checkedOut ?? 0;
  const hw2Cap = hw?.HWSET2?.capacity ?? 0;
  const hw2Used = hw?.HWSET2?.checkedOut ?? 0;

  const hw1Avail = hw1Cap - hw1Used;
  const hw2Avail = hw2Cap - hw2Used;

  return (
    <div className="w-full flex-shrink-0 rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-6">
        {/* Left side — Project Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-xl font-bold text-gray-900">{name || "Untitled Project"}</h4>
          <p className="text-sm text-gray-600">{description || "No description provided"}</p>
          <p className="text-sm text-gray-600 mt-1">ID: {id}</p>
          <p className="text-sm text-gray-600">Members: {memberCount}</p>
        </div>

        {/* Right side — Live Hardware Status */}
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