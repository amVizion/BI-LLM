export const getSampleTexts = (texts:string[], sample:number) => texts
    .sort(() => 0.5 - Math.random()).filter((_, i) => i < sample)
