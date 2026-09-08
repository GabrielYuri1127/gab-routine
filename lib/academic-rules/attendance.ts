import type { AcademicRules, AttendanceRecord } from "@/types/academic";

export type AttendanceAlertLevel = "normal" | "attention" | "caution" | "critical" | "limit_reached";

export interface AttendanceSummary {
  frequency: number;
  usedAbsences: number;
  absenceLimit: number;
  limitUsagePercent: number;
  remainingAbsences: number;
  alertLevel: AttendanceAlertLevel;
  alertTitle: string;
  alertMessage: string;
}

export function getAbsenceLimit(totalExpectedClasses: number, minimumAttendance: number) {
  if (totalExpectedClasses <= 0) {
    return 0;
  }

  const absencePercent = Math.max(0, 100 - minimumAttendance);
  return Math.floor((totalExpectedClasses * absencePercent) / 100 + Number.EPSILON);
}

export function countUsedAbsences(records: AttendanceRecord[]) {
  return records.reduce((total, record) => {
    if (record.status === "absence" || record.status === "justified") {
      return total + record.quantity;
    }

    return total;
  }, 0);
}

export function calculateFrequency(totalExpectedClasses: number, usedAbsences: number) {
  if (totalExpectedClasses <= 0) {
    return 100;
  }

  const attendedClasses = Math.max(0, totalExpectedClasses - usedAbsences);
  return (attendedClasses / totalExpectedClasses) * 100;
}

export function getAttendanceAlertLevel(limitUsagePercent: number): AttendanceAlertLevel {
  if (limitUsagePercent >= 100) {
    return "limit_reached";
  }

  if (limitUsagePercent >= 90) {
    return "critical";
  }

  if (limitUsagePercent >= 75) {
    return "caution";
  }

  if (limitUsagePercent >= 50) {
    return "attention";
  }

  return "normal";
}

export function buildAttendanceAlert(subjectName: string, summary: Pick<AttendanceSummary, "alertLevel" | "limitUsagePercent" | "remainingAbsences">) {
  const usage = Math.round(summary.limitUsagePercent);

  if (summary.alertLevel === "limit_reached") {
    return {
      alertTitle: "Limite atingido",
      alertMessage: `Você já atingiu o limite de faltas em ${subjectName}.`
    };
  }

  if (summary.alertLevel === "critical") {
    return {
      alertTitle: "Crítico",
      alertMessage: `Cuidado: faltar às próximas aulas pode deixar sua frequência abaixo do mínimo.`
    };
  }

  if (summary.alertLevel === "caution") {
    return {
      alertTitle: "Cuidado",
      alertMessage: `Você já utilizou ${usage}% do seu limite de faltas em ${subjectName}.`
    };
  }

  if (summary.alertLevel === "attention") {
    return {
      alertTitle: "Atenção",
      alertMessage: `Você ainda pode faltar aproximadamente ${summary.remainingAbsences} aulas.`
    };
  }

  return {
    alertTitle: "Normal",
    alertMessage: `Frequência dentro do esperado. Restam aproximadamente ${summary.remainingAbsences} faltas.`
  };
}

export function calculateAttendanceSummary(
  records: AttendanceRecord[],
  rules: Pick<AcademicRules, "minimumAttendance" | "totalExpectedClasses">,
  subjectName = "esta disciplina"
): AttendanceSummary {
  const usedAbsences = countUsedAbsences(records);
  const absenceLimit = getAbsenceLimit(rules.totalExpectedClasses, rules.minimumAttendance);
  const frequency = calculateFrequency(rules.totalExpectedClasses, usedAbsences);
  const remainingAbsences = Math.max(0, absenceLimit - usedAbsences);
  const limitUsagePercent = absenceLimit > 0 ? (usedAbsences / absenceLimit) * 100 : 100;
  const alertLevel = getAttendanceAlertLevel(limitUsagePercent);
  const alert = buildAttendanceAlert(subjectName, {
    alertLevel,
    limitUsagePercent,
    remainingAbsences
  });

  return {
    frequency,
    usedAbsences,
    absenceLimit,
    limitUsagePercent,
    remainingAbsences,
    alertLevel,
    ...alert
  };
}
