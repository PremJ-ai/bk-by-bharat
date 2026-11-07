import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StorefrontLayout>
      <GoogleAnalytics />
      {children}
    </StorefrontLayout>
  );
}
