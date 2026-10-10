import { RegisterSw } from "@/components/register-sw";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RegisterSw />
      {children}
    </>
  );
}
