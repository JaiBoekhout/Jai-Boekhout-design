import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");

export async function DELETE(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { path: itemPath, type } = (await request.json()) as { path: string; type: "file" | "folder" };

    const fullPath = path.resolve(IMPORTS_DIR, itemPath);

    if (!fullPath.startsWith(IMPORTS_DIR + path.sep) && fullPath !== IMPORTS_DIR) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    if (type === "folder") {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
