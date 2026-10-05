const SERVICE_CONTEXT =
  "current_setting('cvg.service_role'::text, true) = 'content-indexer'::text";
const PUBLISHED_VERSION_LINK = `EXISTS ( SELECT 1 FROM content_versions version_record WHERE ((version_record.content_id = ai_suggestions.content_id) AND (version_record.version = ai_suggestions.version) AND (version_record.status = 'PUBLICADO'::text)))`;
const CONTENT_VERSIONS_SELECT = `((${SERVICE_CONTEXT}) AND (status = 'PUBLICADO'::text))`;
const AI_SUGGESTIONS_VERSION_POLICY = `((${SERVICE_CONTEXT}) AND (${PUBLISHED_VERSION_LINK}))`;
const SQL_STRING_LITERAL_RE = /'(?:''|[^'])*'/gu;

const EXPECTED_POLICIES = Object.freeze([
  {
    name: "content_versions_indexer_select_policy",
    table: "content_versions",
    command: "SELECT",
    predicate: "qual",
    expression: CONTENT_VERSIONS_SELECT,
  },
  {
    name: "ai_suggestions_indexer_select_policy",
    table: "ai_suggestions",
    command: "SELECT",
    predicate: "qual",
    expression: AI_SUGGESTIONS_VERSION_POLICY,
  },
  {
    name: "ai_suggestions_indexer_insert_policy",
    table: "ai_suggestions",
    command: "INSERT",
    predicate: "with_check",
    expression: AI_SUGGESTIONS_VERSION_POLICY,
  },
  {
    name: "ai_suggestions_indexer_update_policy",
    table: "ai_suggestions",
    command: "UPDATE",
    predicate: "both",
    expression: AI_SUGGESTIONS_VERSION_POLICY,
  },
]);

function normalizePolicyExpression(value) {
  if (typeof value !== "string") return null;

  const literals = [];
  const structural = value.replace(SQL_STRING_LITERAL_RE, (literal) => {
    literals.push(literal.slice(1, -1).replaceAll("''", "'"));
    return `__literal_${literals.length - 1}__`;
  });
  const expression = structural
    .replace(/\s+/gu, " ")
    .replace(/\s*([(),=])\s*/gu, "$1")
    .trim()
    .toLowerCase();

  return { expression, literals };
}

function isExpectedExpression(value, expected) {
  const actual = normalizePolicyExpression(value);
  const normalizedExpected = normalizePolicyExpression(expected);
  return (
    actual !== null &&
    actual.expression === normalizedExpected.expression &&
    actual.literals.length === 3 &&
    actual.literals[0] === "cvg.service_role" &&
    actual.literals[1] === "content-indexer" &&
    actual.literals[2] === "PUBLICADO"
  );
}

function matchesExpectedPredicate(row, expectation) {
  const usingPredicate = row.qual;
  const checkPredicate = row.with_check;
  switch (expectation.predicate) {
    case "qual":
      return (
        isExpectedExpression(usingPredicate, expectation.expression) &&
        checkPredicate === null
      );
    case "with_check":
      return (
        usingPredicate === null &&
        isExpectedExpression(checkPredicate, expectation.expression)
      );
    case "both":
      return (
        isExpectedExpression(usingPredicate, expectation.expression) &&
        isExpectedExpression(checkPredicate, expectation.expression)
      );
    default:
      return false;
  }
}

export function verifyIndexerPolicyContract(rows) {
  if (!Array.isArray(rows) || rows.length !== EXPECTED_POLICIES.length)
    return false;
  const byName = new Map();
  for (const row of rows) {
    if (row === null || typeof row !== "object" || byName.has(row.policyname)) {
      return false;
    }
    byName.set(row.policyname, row);
  }

  return EXPECTED_POLICIES.every((expectation) => {
    const row = byName.get(expectation.name);
    return (
      row !== undefined &&
      row.tablename === expectation.table &&
      row.permissive === "PERMISSIVE" &&
      Array.isArray(row.roles) &&
      row.roles.length === 1 &&
      row.roles[0] === "public" &&
      row.cmd === expectation.command &&
      matchesExpectedPredicate(row, expectation)
    );
  });
}
