import type { Metadata } from "next";
import { ImportForm } from "@/components/import-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="stack">
      <PageHeader
        title="Import members"
        description="Moving from Mindbody, Punchpass, or Arketa? Bring members and the visits they have left. It’s free, and nothing changes until you press Import."
      />
      <ImportForm />
    </div>
  );
}
