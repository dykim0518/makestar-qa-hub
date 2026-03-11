import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tcTemplateProfiles } from "@/db/schema";
import { getProjectById } from "@/lib/tc-projects";
import {
  buildTemplateProfileFromCsv,
  extractGoogleSheetInfo,
} from "@/lib/tc-template-parser";

interface ImportGoogleSheetBody {
  sheetUrl?: string;
  gid?: string;
  csvText?: string;
  name?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let body: ImportGoogleSheetBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const csvTextFromBody = body.csvText?.trim();
  const sheetUrl = body.sheetUrl?.trim();

  let csvText = csvTextFromBody || "";
  let sourceRef = "";
  let profileName = body.name?.trim() || "Imported Template Profile";

  if (!csvText) {
    if (!sheetUrl) {
      return NextResponse.json(
        { error: "sheetUrl 또는 csvText 중 하나는 필수입니다." },
        { status: 400 }
      );
    }

    const info = extractGoogleSheetInfo(sheetUrl);
    const exportUrl = body.gid
      ? `https://docs.google.com/spreadsheets/d/${info.spreadsheetId}/export?format=csv&gid=${body.gid}`
      : info.exportUrl;

    const response = await fetch(exportUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `시트 CSV 가져오기 실패: ${response.status}` },
        { status: 400 }
      );
    }

    csvText = await response.text();
    sourceRef = sheetUrl;
    if (!body.name && info.gid) {
      profileName = `Imported Template (gid=${info.gid})`;
    }
  } else {
    sourceRef = sheetUrl || "inline-csv";
  }

  let profile;
  try {
    profile = buildTemplateProfileFromCsv(csvText);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "템플릿 분석 중 오류가 발생했습니다.",
      },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(tcTemplateProfiles)
    .values({
      projectId,
      sourceRef,
      name: profileName,
      status: "draft",
      headerRowIndex: profile.headerRowIndex,
      columnMapping: profile.columnMapping,
      styleProfile: profile.styleProfile,
      previewRows: profile.previewRows,
    })
    .returning();

  return NextResponse.json(
    {
      profile: created,
      detected: profile,
    },
    { status: 201 }
  );
}

