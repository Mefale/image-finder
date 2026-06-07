const { spawn } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "backend", ".env") });

async function main() {
  // @ngrok/ngrok requires NGROK_AUTHTOKEN in env or passed as authtoken
  const ngrok = require("@ngrok/ngrok");

  console.log("Creando túneles ngrok...\n");

  // Crear ambos túneles antes de arrancar los servidores
  // (ngrok los mantiene abiertos aunque nada escuche aún)
  const [backendListener, frontendListener] = await Promise.all([
    ngrok.forward({ addr: 3000, authtoken_from_env: true }),
    ngrok.forward({ addr: 5173, authtoken_from_env: true }),
  ]);

  const backendUrl = backendListener.url();
  const frontendUrl = frontendListener.url();

  console.log(`Backend:  ${backendUrl}`);
  console.log(`Frontend: ${frontendUrl}`);
  console.log(`\n✔  Compartí este link: ${frontendUrl}\n`);

  const isWindows = process.platform === "win32";
  const npmCmd = isWindows ? "npm.cmd" : "npm";

  // Arrancar backend con FRONTEND_URL para el CORS
  const backend = spawn(npmCmd, ["run", "dev"], {
    cwd: path.join(__dirname, "backend"),
    env: { ...process.env, FRONTEND_URL: frontendUrl, CORS_ALLOW_ALL: "true" },
    stdio: "inherit",
    shell: false,
  });

  // Arrancar frontend apuntando al túnel del backend
  const frontend = spawn(npmCmd, ["run", "dev"], {
    cwd: path.join(__dirname, "frontend"),
    env: { ...process.env, VITE_API_URL: `${backendUrl}/api` },
    stdio: "inherit",
    shell: false,
  });

  backend.on("error", (err) => console.error("Backend error:", err.message));
  frontend.on("error", (err) => console.error("Frontend error:", err.message));

  async function shutdown() {
    console.log("\nCerrando túneles...");
    backend.kill();
    frontend.kill();
    await ngrok.disconnect().catch(() => {});
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
