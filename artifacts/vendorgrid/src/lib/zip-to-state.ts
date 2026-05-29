const ZIP_PREFIX_TO_STATE: [number, number, string][] = [
  [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"],
  [39, 49, "ME"], [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"],
  [100, 149, "NY"], [150, 196, "PA"], [197, 199, "DE"], [200, 205, "DC"],
  [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"], [270, 289, "NC"],
  [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"],
  [370, 385, "TN"], [386, 397, "MS"], [400, 427, "KY"], [430, 459, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"],
  [550, 567, "MN"], [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"],
  [600, 629, "IL"], [630, 658, "MO"], [660, 679, "KS"], [680, 693, "NE"],
  [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"], [750, 799, "TX"],
  [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
  [850, 865, "AZ"], [870, 884, "NM"], [889, 898, "NV"], [900, 962, "CA"],
  [967, 968, "HI"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

export function zipToState(zip: string): string | null {
  if (!zip) return null;
  const prefix = parseInt(zip.slice(0, 3), 10);
  if (isNaN(prefix)) return null;
  for (const [lo, hi, state] of ZIP_PREFIX_TO_STATE) {
    if (prefix >= lo && prefix <= hi) return state;
  }
  return null;
}

export const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AK", name: "Alaska" }, { abbr: "AL", name: "Alabama" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DC", name: "Washington D.C." },
  { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" },
  { abbr: "IA", name: "Iowa" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" },
  { abbr: "LA", name: "Louisiana" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MD", name: "Maryland" }, { abbr: "ME", name: "Maine" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MT", name: "Montana" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NV", name: "Nevada" },
  { abbr: "NY", name: "New York" }, { abbr: "OH", name: "Ohio" },
  { abbr: "OK", name: "Oklahoma" }, { abbr: "OR", name: "Oregon" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "PR", name: "Puerto Rico" },
  { abbr: "RI", name: "Rhode Island" }, { abbr: "SC", name: "South Carolina" },
  { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" },
  { abbr: "VA", name: "Virginia" }, { abbr: "VT", name: "Vermont" },
  { abbr: "WA", name: "Washington" }, { abbr: "WI", name: "Wisconsin" },
  { abbr: "WV", name: "West Virginia" }, { abbr: "WY", name: "Wyoming" },
];
