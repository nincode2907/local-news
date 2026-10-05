import { db } from "@/lib/db";
import { getBrief } from "@/lib/repository";
import { BriefView } from "@/components/brief-view";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const brief = await getBrief(db, id);
  if (!brief) notFound();
  return <BriefView brief={brief} detail />;
}
