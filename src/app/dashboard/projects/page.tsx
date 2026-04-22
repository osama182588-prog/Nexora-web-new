import { Suspense } from "react";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
            Workspace
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
            Projects
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Create, organize, and track every project in your workspace.
          </p>
        </div>
      </div>

      <Suspense>
        <ProjectsBoard />
      </Suspense>
    </div>
  );
}
