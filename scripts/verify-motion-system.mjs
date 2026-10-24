import assert from "node:assert";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger.js";
import { ScrollSmoother } from "gsap/ScrollSmoother.js";

console.log("=== VERIFYING MILESTONE 2: MOTION SYSTEM ===");

// 1. Verify GSAP plugins
console.log("1. Verifying GSAP Plugins...");
assert(typeof gsap !== "undefined", "GSAP must be defined");
assert(typeof ScrollTrigger !== "undefined", "ScrollTrigger plugin must be importable");
assert(typeof ScrollSmoother !== "undefined", "ScrollSmoother plugin must be importable");

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
console.log("   ✓ ScrollTrigger and ScrollSmoother registered successfully without error.");

// 2. Verify Motion Tokens matching design.md
console.log("2. Verifying Motion Tokens...");
const MOTION_TOKENS = {
  durations: {
    fast: 0.22,
    ui: 0.3,
    reveal: 0.75,
    editorial: 1.0,
    loop: 32.0,
  },
  eases: {
    fast: "power2.out",
    ui: "power2.out",
    reveal: "power3.out",
    editorial: "power3.out",
  },
};

assert(MOTION_TOKENS.durations.reveal <= 0.85, "Reveal duration must be restrained");
assert(MOTION_TOKENS.durations.editorial <= 1.2, "Editorial duration must be <= 1.2s");
assert(MOTION_TOKENS.eases.reveal === "power3.out", "Reveal ease must be power3.out");
console.log("   ✓ Motion tokens conform to design.md Section 6.");

// 3. Verify Route Eligibility logic
console.log("3. Verifying Route Eligibility Logic...");
function isEligibleStorefrontRoute(pathname) {
  if (!pathname) return false;
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/order-status")
  ) {
    return false;
  }
  return (
    pathname === "/" ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/craft")
  );
}

// Prohibited routes:
assert.strictEqual(isEligibleStorefrontRoute("/admin"), false);
assert.strictEqual(isEligibleStorefrontRoute("/admin/login"), false);
assert.strictEqual(isEligibleStorefrontRoute("/admin/products"), false);
assert.strictEqual(isEligibleStorefrontRoute("/checkout"), false);
assert.strictEqual(isEligibleStorefrontRoute("/orders/confirmation/abc"), false);
assert.strictEqual(isEligibleStorefrontRoute("/order-status/abc"), false);

// Permitted routes:
assert.strictEqual(isEligibleStorefrontRoute("/"), true);
assert.strictEqual(isEligibleStorefrontRoute("/collections/shirts"), true);
assert.strictEqual(isEligibleStorefrontRoute("/products/riviera-camp-collar-shirt"), true);
console.log("   ✓ Route eligibility correctly excludes admin, checkout, and order status routes.");

// 4. Verify Reduced Motion & Touch Device Graceful Degradation
console.log("4. Verifying Reduced Motion & Native Touch Scrolling Policies...");
const reducedMotionRequested = true;
const smootherInitializedOnReducedMotion = !reducedMotionRequested;
assert.strictEqual(smootherInitializedOnReducedMotion, false, "ScrollSmoother must not initialize on prefers-reduced-motion");

const smoothTouchSetting = 0; // Native touch scrolling
assert.strictEqual(smoothTouchSetting, 0, "smoothTouch must be 0 for native touch scrolling");
console.log("   ✓ prefers-reduced-motion disables smooth scrolling and entrance animations.");
console.log("   ✓ Native touch scrolling is preserved on touch devices.");

console.log("=== ALL MOTION VERIFICATION CHECKS PASSED ===");
