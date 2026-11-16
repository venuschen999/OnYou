import { notFound } from "next/navigation";
import { HistoryPreview } from "@/components/HistoryPreview";

type HistoryPreviewPageProps = {
  searchParams: Promise<{ view?: string }>;
};

// Not a product route. Production builds respond with not found.
export default async function HistoryPreviewPage({
  searchParams,
}: HistoryPreviewPageProps) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  return <HistoryPreview view={params.view} />;
}
