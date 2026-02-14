import { prisma } from "./prisma";
import { addYears, isWithinInterval, startOfDay } from "date-fns";

export async function generateMemorialInstances(params: {
  deceasedId?: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  const from = params.fromDate ?? startOfDay(new Date());
  const to =
    params.toDate ?? addYears(from, 1);

  const rule = await prisma.memorialRule.findFirst({
    where: { isDefault: true },
  });

  if (!rule) {
    throw new Error("デフォルトの年忌ルールが見つかりません");
  }

  const years = rule.yearsJson as number[];

  const deceasedList = params.deceasedId
    ? await prisma.deceased.findMany({ where: { id: params.deceasedId } })
    : await prisma.deceased.findMany();

  let created = 0;
  let updated = 0;

  for (const deceased of deceasedList) {
    const deathDate = new Date(deceased.deathDate);

    for (const year of years) {
      const dueDate = addYears(deathDate, year);

      if (
        isWithinInterval(dueDate, { start: from, end: to })
      ) {
        const existing = await prisma.memorialInstance.findUnique({
          where: {
            deceasedId_year: {
              deceasedId: deceased.id,
              year,
            },
          },
        });

        if (existing) {
          await prisma.memorialInstance.update({
            where: { id: existing.id },
            data: { dueDate, memorialRuleId: rule.id },
          });
          updated++;
        } else {
          await prisma.memorialInstance.create({
            data: {
              deceasedId: deceased.id,
              memorialRuleId: rule.id,
              year,
              dueDate,
            },
          });
          created++;
        }
      }
    }
  }

  return { created, updated, total: created + updated };
}
