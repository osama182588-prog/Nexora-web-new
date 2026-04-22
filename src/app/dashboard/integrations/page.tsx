import { Suspense } from "react";
import { connectToDatabase } from "@/lib/mongoose";
import { ProjectModel } from "@/models/Project";
import { serializeProject, type ProjectDTO } from "@/lib/projects";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IntegrationsBoard } from "@/components/integrations/IntegrationsBoard";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/integrations");
  }
  await connectToDatabase();
  const projects = await ProjectModel.find({ ownerId: session.user.id })
    .sort({ lastActivityAt: -1 })
    .lean();
  const dtos: ProjectDTO[] = projects.map((p) =>
    serializeProject(p as unknown as Parameters<typeof serializeProject>[0])
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neon-purple">
          External
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Integrations
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Modular external integrations for each project. Toggle modules on or off,
          configure them, and watch every interaction stream back into your
          dashboard in realtime — no extra setup, same project, same database.
        </p>
      </div>

      <Suspense>
        <IntegrationsBoard projects={dtos} />
      </Suspense>
    </div>
  );
}
