import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up" });
  } catch (error) {
    return NextResponse.json(
      { status: "error", database: "down", message: (error as Error).message },
      { status: 503 },
    );
  }
}
