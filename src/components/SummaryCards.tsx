"use client";

import type { TestRun } from "@/db/schema";
import { getPassRate } from "@/lib/format";

export function SummaryCards({ latestRun }: { latestRun: TestRun | null }) {
  if (!latestRun) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
        아직 테스트 결과가 없습니다.
      </div>
    );
  }

  const cards = [
    {
      label: "총 테스트",
      value: latestRun.total,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "통과",
      value: latestRun.passed,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "실패",
      value: latestRun.failed,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "성공률",
      value: getPassRate(latestRun.passed, latestRun.total),
      color: latestRun.failed > 0 ? "text-red-600" : "text-green-600",
      bg: latestRun.failed > 0 ? "bg-red-50" : "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-lg ${card.bg} p-4 border border-gray-100`}
        >
          <p className="text-sm text-gray-600">{card.label}</p>
          <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
