const { loadEnv } = require("../config/env");
const { syncShiprocketDispatches } = require("../services/shiprocket.service");

loadEnv();

async function main() {
  const result = await syncShiprocketDispatches({}, {
    appUser: {
      displayName: "CLI Shiprocket Sync",
    },
    email: "system@wayveda.local",
    id: null,
    role: "system_admin",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
