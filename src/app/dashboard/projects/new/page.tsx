import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          Create
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">
          New project
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Set up a new project. You can adjust everything later.
        </p>
      </div>

      <NewProjectForm />
    </div>
  );
}
