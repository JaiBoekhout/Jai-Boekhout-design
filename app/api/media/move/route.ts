import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { from, toFolder } = (await request.json()) as { from: string; toFolder: string };

    const fromFull = path.resolve(IMPORTS_DIR, from);
    const fileName = path.basename(fromFull);
    const toDirFull = path.resolve(IMPORTS_DIR, toFolder);
    const toFull = path.join(toDirFull, fileName);

    if (!fromFull.startsWith(IMPORTS_DIR) || !toDirFull.startsWith(IMPORTS_DIR)) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    if (fromFull === toFull) {
      return Response.json({ error: "Source and destination are the same" }, { status: 400 });
    }

    fs.mkdirSync(toDirFull, { recursive: true });
    fs.renameSync(fromFull, toFull);

    const newRelPath = path.relative(IMPORTS_DIR, toFull).replace(/\\/g, "/");
    return Response.json({ success: true, path: newRelPath, src: `/imports/${newRelPath}` });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
