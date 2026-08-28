import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { folder } = (await request.json()) as { folder: string };

    if (!folder || folder.includes("..") || /[<>:"|?*]/.test(folder)) {
      return Response.json({ error: "Invalid folder name" }, { status: 400 });
    }

    const fullPath = path.resolve(IMPORTS_DIR, folder);
    if (!fullPath.startsWith(IMPORTS_DIR)) {
      return Response.json({ error: "Path traversal not allowed" }, { status: 400 });
    }

    fs.mkdirSync(fullPath, { recursive: true });
    return Response.json({ success: true, path: folder });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
