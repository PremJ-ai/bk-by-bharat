import { Scissors, Truck, RefreshCw, ShieldCheck } from "lucide-react";

export function ServiceHighlights() {
  const highlights = [
    {
      icon: Scissors,
      title: "Complimentary Alterations",
      desc: "Receive customized sleeve and hem alterations directly handled by our in-house master tailor.",
    },
    {
      icon: Truck,
      title: "Direct Insured Transit",
      desc: "Dispatched via verified courier with real-time tracking updates delivered directly to your WhatsApp.",
    },
    {
      icon: ShieldCheck,
      title: "Transparent Verification",
      desc: "Direct UPI/QR payment verified personally by our studio before garment preparation.",
    },
    {
      icon: RefreshCw,
      title: "7-Day Return Consideration",
      desc: "Unworn garments in original presentation may be exchanged or returned via studio customer care.",
    },
  ];

  return (
    <section className="bg-surface py-20 border-b border-border">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="space-y-3">
                <div className="w-10 h-10 rounded bg-surface-muted border border-border flex items-center justify-center text-gold">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-display text-lg text-ink font-medium">{item.title}</h4>
                <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
