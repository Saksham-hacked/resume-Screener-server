const calculateFinalScore = (rawScores, weightages) => {
  const total =
    weightages.technicalSkills +
    weightages.experience +
    weightages.education +
    weightages.softSkills;

  if (total === 0) return 0;

  const final =
    (rawScores.technicalSkills * weightages.technicalSkills) / total +
    (rawScores.experience * weightages.experience) / total +
    (rawScores.education * weightages.education) / total +
    (rawScores.softSkills * weightages.softSkills) / total;

  return Math.round(final * 10) / 10;
};

module.exports = { calculateFinalScore };
