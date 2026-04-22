import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-7xl">
      <ProjectDetailView projectId={id} />
    </div>
  );
}
