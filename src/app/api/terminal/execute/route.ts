import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Comando inválido" }, { status: 400 });
    }

    const trimmed = command.trim();

    // Standard preset command handler
    let executionCmd = trimmed;

    // Map high-level friendly commands if user types them directly
    if (trimmed === "install baileys" || trimmed === "npm i @whiskeysockets/baileys") {
      executionCmd = "npm install @whiskeysockets/baileys --no-audit --no-fund";
    } else if (trimmed === "check baileys" || trimmed === "npm list @whiskeysockets/baileys") {
      executionCmd = "npm list @whiskeysockets/baileys";
    } else if (trimmed === "system info" || trimmed === "uname") {
      executionCmd = "node -v && npm -v && uname -a";
    }

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await execAsync(executionCmd, {
        cwd: process.cwd(),
        timeout: 60000, // 60s max execution timeout
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer
      });

      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        command: executionCmd,
        stdout: stdout || "Comando ejecutado con éxito sin salida adicional.",
        stderr: stderr || "",
        durationMs: duration,
        exitCode: 0,
        timestamp: new Date().toISOString()
      });
    } catch (execError: any) {
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        command: executionCmd,
        stdout: execError.stdout || "",
        stderr: execError.stderr || execError.message || "Error al ejecutar comando",
        durationMs: duration,
        exitCode: execError.code || 1,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
