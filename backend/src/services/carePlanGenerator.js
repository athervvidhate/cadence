function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function buildCheckIns(medications) {
  const morningTasks = ["weight", "breathing", "morning_meds"];
  const eveningTasks = ["symptom_review", "evening_meds"];
  if (!medications?.length) {
    return [
      { time: "08:00", type: "morning", tasks: morningTasks },
      { time: "20:00", type: "evening", tasks: eveningTasks },
    ];
  }
  return [
    { time: "08:00", type: "morning", tasks: morningTasks },
    { time: "20:00", type: "evening", tasks: eveningTasks },
  ];
}

function generateCarePlanDays({ startDate, medications }) {
  const enhancedDays = new Set([3, 7, 14, 21, 28]);
  const followUpDays = new Set([7, 14, 30]);

  return Array.from({ length: 30 }, (_, index) => {
    const dayNumber = index + 1;
    const appointments = [];
    if (followUpDays.has(dayNumber)) {
      appointments.push("clinical_follow_up");
    }
    if (enhancedDays.has(dayNumber)) {
      appointments.push("enhanced_check_in");
    }
    return {
      dayNumber,
      date: addDays(startDate, index),
      checkIns: buildCheckIns(medications),
      appointments,
    };
  });
}

module.exports = { generateCarePlanDays };
