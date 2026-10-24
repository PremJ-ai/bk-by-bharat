const routes = [
  "/",
  "/collections/shirts",
  "/products/riviera-camp-collar-shirt",
  "/checkout",
  "/orders/confirmation/test-token",
  "/order-status/test-token",
  "/admin/login",
  "/admin"
];

async function testRoutes() {
  let allPass = true;
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3000${route}`);
      console.log(`[STATUS ${res.status}] ${route}`);
      if (res.status !== 200 && res.status !== 307 && res.status !== 308) {
        allPass = false;
      }
    } catch (err) {
      console.error(`[FAIL] ${route} ->`, err.message);
      allPass = false;
    }
  }
  if (!allPass) {
    process.exit(1);
  }
  console.log("All routes returned healthy status!");
}

testRoutes();
