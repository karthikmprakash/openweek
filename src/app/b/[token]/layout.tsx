import { RegisterSw } from "@/components/register-sw";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ConfirmationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterSw />
      {children}
    </>
  );
}
