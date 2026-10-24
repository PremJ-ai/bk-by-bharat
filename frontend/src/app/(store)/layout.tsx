import { StorefrontLayout } from "@/components/layout/StorefrontLayout";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontLayout>{children}</StorefrontLayout>;
}
