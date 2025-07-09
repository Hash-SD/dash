import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

// Helper function to get the python executable
function getPythonExecutable(): string {
  // In a Vercel environment, 'python3' should be available.
  // For local development, ensure 'python3' or 'python' is in PATH.
  return process.env.VERCEL ? "python3" : (process.env.PYTHON_PATH || "python3");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { features, k } = body;

    // Basic validation
    if (!features || !Array.isArray(features) || features.length === 0) {
      return NextResponse.json(
        { error: "Input 'features' must be a non-empty array." },
        { status: 400 }
      );
    }
    if (!k || typeof k !== "number" || k <= 0) {
      return NextResponse.json(
        { error: "Input 'k' must be a positive number." },
        { status: 400 }
      );
    }
    if (features.some(row => !Array.isArray(row))) {
        return NextResponse.json(
            { error: "'features' must be a list of lists." },
            { status: 400 }
        );
    }
    if (features.length < k) {
      return NextResponse.json(
        { error: "Number of data points must be greater than or equal to k." },
        { status: 400 }
      );
    }

    const pythonExecutable = getPythonExecutable();
    // Construct the absolute path to the script
    // process.cwd() gives the root of the Next.js project
    const scriptPath = path.join(process.cwd(), "python_scripts", "kmeans_processor.py");

    // Data to send to the Python script
    const pythonInput = JSON.stringify({ features, k });

    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, [scriptPath]);

      let stdoutData = "";
      let stderrData = "";

      pythonProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pythonProcess.on("close", (code) => {
        if (stderrData) {
          // If there's anything in stderr, attempt to parse it as JSON error from script first
          try {
            const errorJson = JSON.parse(stderrData);
            if (errorJson.error) {
              console.error(`Python script error (stderr JSON): ${errorJson.error}`);
              resolve(NextResponse.json({ error: `Python script error: ${errorJson.error}` }, { status: 500 }));
              return;
            }
          } catch (e) {
            // If stderr is not JSON, treat as a general script error
            console.error(`Python script error (stderr raw): ${stderrData}`);
            resolve(NextResponse.json({ error: `Python script execution failed: ${stderrData}`}, { status: 500 }));
            return;
          }
        }

        if (code !== 0) {
          console.error(`Python script exited with code ${code}. Stderr: ${stderrData}. Stdout: ${stdoutData}`);
          resolve(NextResponse.json({ error: `Python script exited with code ${code}. ${stderrData || stdoutData}` }, { status: 500 }));
          return;
        }

        try {
          const result = JSON.parse(stdoutData);
          if (result.error) {
            console.error(`Python script returned an error in stdout: ${result.error}`);
            resolve(NextResponse.json({ error: `K-Means clustering error: ${result.error}` }, { status: 500 }));
          } else {
            resolve(NextResponse.json(result, { status: 200 }));
          }
        } catch (error) {
          console.error("Failed to parse Python script output:", error);
          console.error("Python script stdout:", stdoutData); // Log what was actually received
          resolve(NextResponse.json({ error: "Failed to parse K-Means result from Python script.", details: stdoutData }, { status: 500 }));
        }
      });

      pythonProcess.on("error", (error) => {
        console.error("Failed to start Python script:", error);
        resolve(NextResponse.json({ error: `Failed to start Python script: ${error.message}` }, { status: 500 }));
      });

      // Send data to Python script's stdin
      pythonProcess.stdin.write(pythonInput);
      pythonProcess.stdin.end();
    });

  } catch (error: any) {
    console.error("Error in K-Means API route:", error);
    if (error instanceof SyntaxError) { // JSON parsing error for request body
        return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error in K-Means API.", details: error.message }, { status: 500 });
  }
}
