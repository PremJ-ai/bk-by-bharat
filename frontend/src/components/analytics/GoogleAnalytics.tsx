"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!measurementId) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      ((...args: unknown[]) => {
        window.dataLayer?.push(args);
      });

    // Guest order routes embed an opaque tracking token in the pathname.
    // Never forward that token or arbitrary query strings to an analytics provider.
    const safePath = pathname
      .replace(/\/orders\/confirmation\/[^/]+(?:\/.*)?$/, "/orders/confirmation")
      .replace(/\/order-status\/[^/]+(?:\/.*)?$/, "/order-status");

    window.gtag("event", "page_view", {
      page_path: safePath,
      page_location: `${window.location.origin}${safePath}`,
      page_title: document.title,
    });
  }, [measurementId, pathname]);

  if (!measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-initialise" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  );
}
