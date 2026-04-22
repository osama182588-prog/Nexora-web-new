import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { evaluateAccess, serializeAccess } from "@/core/permissions";
import { serializeProject } from "@/lib/projects";
import { ProjectSettingsView } from "@/components/settings/ProjectSettingsView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/dashboard/projects/${id}/settings`);
  }
  await connectToDatabase();
  const project = await ProjectModel.findById(id).lean();
  if (!project) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-sm text-slate-400">Project not found.</p>
      </div>
    );
  }
  const access = evaluateAccess(session.user.id, project as { ownerId: string });
  if (!access.isMember) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-sm text-slate-400">
          You do not have access to this project&apos;s settings.
        </p>
      </div>
    );
  }
  const dto = serializeProject(
    project as unknown as Parameters<typeof serializeProject>[0]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          {dto.name}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Project settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Configure modules, manage roles &amp; permissions, and tune the
          internals of <span className="text-white">{dto.name}</span>.
        </p>
      </div>

      <ProjectSettingsView
        project={dto}
        access={serializeAccess(access)}
        currentUserId={session.user.id}
      />
    </div>
  );
}
