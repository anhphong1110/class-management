/** Một nguồn duy nhất cho tông pastel (nền + chữ) dùng ở icon menu, nhãn và thẻ số liệu. */
export type Tone = "blue" | "purple" | "mint" | "star" | "pink";

export const TONES: Record<Tone, string> = {
  blue: "bg-[#E0EEFF] text-[#1D4ED8]",
  purple: "bg-[#EDE7FF] text-[#5B3CC4]",
  mint: "bg-[#D8F7EF] text-[#0E6156]",
  star: "bg-[#FFF3C4] text-[#7A4E00]",
  pink: "bg-[#FFE1EE] text-[#9B1D54]",
};
