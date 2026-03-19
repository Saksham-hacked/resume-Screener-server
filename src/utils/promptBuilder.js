const MAX_RESUME_CHARS = 4000;
const MAX_JD_CHARS = 2500;

const buildScreeningPrompt = (jdText, resumeText, weightages) => {
  const jd = jdText.length > MAX_JD_CHARS ? jdText.slice(0, MAX_JD_CHARS) + '...' : jdText;
  const resume = resumeText.length > MAX_RESUME_CHARS ? resumeText.slice(0, MAX_RESUME_CHARS) + '...' : resumeText;

  const total =
    weightages.technicalSkills +
    weightages.experience +
    weightages.education +
    weightages.softSkills;

  const pct = (v) => (total > 0 ? ((v / total) * 100).toFixed(0) + '%' : '25%');

  return `You are a brutally honest hiring manager at a fast-growing, high-performance startup with hundreds of applicants. You REJECT most candidates. Your reputation depends on recommending only genuinely qualified people — false positives waste the team's time.

DIMENSION WEIGHTS (employer's priorities):
- Technical Skills : ${pct(weightages.technicalSkills)}
- Experience       : ${pct(weightages.experience)}
- Education        : ${pct(weightages.education)}
- Soft Skills      : ${pct(weightages.softSkills)}

════════════════════════════════════════
MANDATORY SCORING PROCESS — follow in order:
════════════════════════════════════════

STEP 1 — Extract required skills/qualifications from the JD.
STEP 2 — For each requirement, check if the resume explicitly demonstrates it.
STEP 3 — Count matched vs unmatched requirements per dimension.
STEP 4 — Apply the penalty table below to arrive at a score.
STEP 5 — Return the structured output.

PENALTY TABLE:
  100% of requirements met, with depth  → 85-100
  80% of requirements met               → 70-84
  60% of requirements met               → 55-69
  40% of requirements met               → 35-54
  < 40% of requirements met             → 0-34

ROLE CALIBRATION:
  - Assume this is an internship or entry-level role unless the JD explicitly requires experienced hiring.
  - For internship roles, strong academic projects, hackathons, personal projects, and deployed side projects are valid evidence.
  - However, projects should still be weighted lower than internships or professional work unless they show deployment, measurable outcomes, real users, or clear complexity.
  - Lack of formal work experience should NOT automatically disqualify a candidate for an intern role.

HARD RULES — these override everything else:
  ✗ Student or fresher applying for a role requiring 3+ years → Experience ≤ 35
  ✗ Missing a required core technology entirely → Technical Skills loses 5 points minimum per missing item
  ✗ Unrelated domain (e.g. management resume for engineering role) → Technical Skills ≤ 25
  ✗ No mention of required tool/framework → cannot score that skill above 50
  ✗ Do not infer skills from job titles alone
  ✗ Do not assume proficiency from coursework unless supported by projects, internships, or practical work
  ✗ If a technology is mentioned only once without context, treat it as weak evidence, not strong proficiency
  ✗ Scores ≥ 80 require explicit written evidence in the resume — not assumed
  ✗ "Strong Fit" is reserved for candidates who meet ≥ 80% of JD requirements with proof

SCORE DISTRIBUTION EXPECTATION:
  In a typical applicant pool: ~20% Strong Fit, ~40% Moderate Fit, ~40% Not Fit.
  If you are scoring everyone above 70, you are being too lenient. Recalibrate.

--- JOB DESCRIPTION ---
${jd}

--- CANDIDATE RESUME ---
${resume}`;
};

module.exports = { buildScreeningPrompt };