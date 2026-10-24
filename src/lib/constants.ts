export const SPECIALTIES = [
  "مدني", "إنشائي", "معماري", "كهرباء", "ميكانيكا", "مساحة", "تخطيط وإدارة مشروعات", "مكتب فني", "BIM وتقنيات هندسية", "أخرى",
] as const;

export const BADGE_OPTIONS = [
  { code: "PM", label: "Project Manager" },
  { code: "PMP", label: "Project Management Professional" },
  { code: "BSc", label: "Bachelor's degree" },
  { code: "BEng", label: "Bachelor of Engineering" },
  { code: "MSc", label: "Master's degree" },
  { code: "MEng", label: "Master of Engineering" },
  { code: "PhD", label: "Doctorate" },
] as const;

export const GLOSSARY = [
  { code: "JNR", title: "Junior Engineer", description: "مهندس مبتدئ: أقل من 3 سنوات خبرة هندسية معتمدة." },
  { code: "MID", title: "Mid-Level Engineer", description: "مهندس متوسط الخبرة: من 3 إلى أقل من 6 سنوات معتمدة." },
  { code: "SNR", title: "Senior Engineer", description: "مهندس أقدم: من 6 سنوات، أو مستوى خبرة أعلى وفق مراجعة الإدارة." },
  { code: "EXP", title: "Expert", description: "خبير: يتطلب 10 سنوات فأكثر مع مراجعة طبيعة الخبرة والمسؤوليات." },
  { code: "PM", title: "Project Manager", description: "مسمى مدير مشروع بعد مراجعة دليل مناسب على الدور." },
  { code: "PMP", title: "Project Management Professional", description: "شهادة مهنية بعد التحقق من مستندها." },
  { code: "MSc", title: "Master of Science", description: "ماجستير تم التحقق من مؤهله." },
  { code: "PhD", title: "Doctor of Philosophy", description: "دكتوراه تم التحقق من مؤهلها." },
];

export function seniorityFromYears(years: number, expertApproved = false): "JNR" | "MID" | "SNR" | "EXP" {
  if (years < 3) return "JNR";
  if (years < 6) return "MID";
  if (years < 10) return "SNR";
  return expertApproved ? "EXP" : "SNR";
}
