import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? session?.user?.username ?? "there";

  return (
    <div className="mx-auto max-w-7xl">
      <DashboardOverview greetingName={name} />
    </div>
  );
}
