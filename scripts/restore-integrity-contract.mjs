const applicationPrivilegeNames = Object.freeze([
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
]);
const integrityConstraintTypes = new Set(["c", "f", "p", "t", "u", "x"]);
const integrityCatalogFields = Object.freeze({
  columns: Object.freeze([
    "table_name",
    "column_name",
    "data_type",
    "not_null",
    "identity_kind",
    "generated_kind",
    "default_expression",
    "catalog_row_count",
  ]),
  constraints: Object.freeze([
    "table_name",
    "constraint_name",
    "constraint_type",
    "validated",
    "definition",
    "catalog_row_count",
  ]),
  indexes: Object.freeze([
    "table_name",
    "index_name",
    "is_unique",
    "is_primary",
    "is_valid",
    "is_ready",
    "definition",
    "catalog_row_count",
  ]),
});

export function formatRestoreToolFailure(
  programName,
  stderr,
  { suppressStderr = false } = {},
) {
  if (suppressStderr) return `${programName} failed (stderr suppressed)`;
  const detail = typeof stderr === "string" ? stderr.trim() : "";
  return `${programName} failed${detail === "" ? "" : `: ${detail.slice(-1200)}`}`;
}

function isObjectRow(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactFields(value, fields) {
  if (!isObjectRow(value)) return false;
  const keys = Reflect.ownKeys(value);
  return (
    keys.length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isNonBlankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUniqueCatalogRows(rows, keyFields) {
  const seen = new Set();
  for (const row of rows) {
    const key = JSON.stringify(keyFields.map((field) => row[field]));
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function hasCompleteCatalogRows(rows, tableNames) {
  return tableNames.every((tableName) => {
    const tableRows = rows.filter((row) => row.table_name === tableName);
    const expectedCount = tableRows[0]?.catalog_row_count;
    return (
      Number.isSafeInteger(expectedCount) &&
      expectedCount > 0 &&
      expectedCount === tableRows.length &&
      tableRows.every((row) => row.catalog_row_count === expectedCount)
    );
  });
}

function canonicalCatalogRows(rows, fields, keyFields) {
  const keyIndexes = keyFields.map((field) => fields.indexOf(field));
  const normalizedRows = rows.map((row) => fields.map((field) => row[field]));
  normalizedRows.sort((left, right) => {
    const leftKey = JSON.stringify(keyIndexes.map((index) => left[index]));
    const rightKey = JSON.stringify(keyIndexes.map((index) => right[index]));
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
  return normalizedRows;
}

function canonicalIntegrityCatalog(catalog) {
  return {
    columns: canonicalCatalogRows(
      catalog.columns,
      integrityCatalogFields.columns,
      ["table_name", "column_name"],
    ),
    constraints: canonicalCatalogRows(
      catalog.constraints,
      integrityCatalogFields.constraints,
      ["table_name", "constraint_name"],
    ),
    indexes: canonicalCatalogRows(
      catalog.indexes,
      integrityCatalogFields.indexes,
      ["table_name", "index_name"],
    ),
  };
}

function isValidIntegrityCatalog(catalog, tableNames) {
  if (
    !hasExactFields(catalog, ["columns", "constraints", "indexes"]) ||
    !Array.isArray(catalog.columns) ||
    !Array.isArray(catalog.constraints) ||
    !Array.isArray(catalog.indexes)
  ) {
    return false;
  }

  const allowedTables = new Set(tableNames);
  const hasKnownTable = (row) =>
    isObjectRow(row) && allowedTables.has(row.table_name);
  const validColumns = catalog.columns.every(
    (column) =>
      hasExactFields(column, integrityCatalogFields.columns) &&
      hasKnownTable(column) &&
      isNonEmptyString(column.column_name) &&
      isNonBlankString(column.data_type) &&
      typeof column.not_null === "boolean" &&
      ["", "a", "d"].includes(column.identity_kind) &&
      ["", "s"].includes(column.generated_kind) &&
      (column.default_expression === null ||
        isNonBlankString(column.default_expression)) &&
      Number.isSafeInteger(column.catalog_row_count) &&
      column.catalog_row_count > 0,
  );
  const validConstraints = catalog.constraints.every(
    (constraint) =>
      hasExactFields(constraint, integrityCatalogFields.constraints) &&
      hasKnownTable(constraint) &&
      isNonEmptyString(constraint.constraint_name) &&
      integrityConstraintTypes.has(constraint.constraint_type) &&
      typeof constraint.validated === "boolean" &&
      isNonBlankString(constraint.definition) &&
      Number.isSafeInteger(constraint.catalog_row_count) &&
      constraint.catalog_row_count > 0,
  );
  const validIndexes = catalog.indexes.every(
    (index) =>
      hasExactFields(index, integrityCatalogFields.indexes) &&
      hasKnownTable(index) &&
      isNonEmptyString(index.index_name) &&
      typeof index.is_unique === "boolean" &&
      typeof index.is_primary === "boolean" &&
      (!index.is_primary || index.is_unique) &&
      typeof index.is_valid === "boolean" &&
      typeof index.is_ready === "boolean" &&
      isNonBlankString(index.definition) &&
      Number.isSafeInteger(index.catalog_row_count) &&
      index.catalog_row_count > 0,
  );

  return (
    validColumns &&
    validConstraints &&
    validIndexes &&
    hasCompleteCatalogRows(catalog.columns, tableNames) &&
    hasCompleteCatalogRows(catalog.constraints, tableNames) &&
    hasCompleteCatalogRows(catalog.indexes, tableNames) &&
    hasUniqueCatalogRows(catalog.columns, ["table_name", "column_name"]) &&
    hasUniqueCatalogRows(catalog.constraints, [
      "table_name",
      "constraint_name",
    ]) &&
    hasUniqueCatalogRows(catalog.indexes, ["table_name", "index_name"])
  );
}

export function restoreIntegrityCatalogMatches(
  sourceCatalog,
  targetCatalog,
  tableNames,
) {
  if (
    !Array.isArray(tableNames) ||
    tableNames.length === 0 ||
    tableNames.some((tableName) => !isNonEmptyString(tableName)) ||
    new Set(tableNames).size !== tableNames.length
  ) {
    return false;
  }

  for (const catalog of [sourceCatalog, targetCatalog]) {
    if (!isValidIntegrityCatalog(catalog, tableNames)) return false;
  }

  if (
    JSON.stringify(canonicalIntegrityCatalog(sourceCatalog)) !==
    JSON.stringify(canonicalIntegrityCatalog(targetCatalog))
  ) {
    return false;
  }

  return (
    tableNames.every(
      (tableName) =>
        sourceCatalog.columns.some(
          (column) => column.table_name === tableName,
        ) &&
        sourceCatalog.constraints.some(
          (constraint) => constraint.table_name === tableName,
        ) &&
        sourceCatalog.indexes.some((index) => index.table_name === tableName),
    ) &&
    targetCatalog.constraints.every(
      (constraint) => constraint.validated === true,
    ) &&
    targetCatalog.indexes.every(
      (index) => index.is_valid === true && index.is_ready === true,
    )
  );
}

export function restoreApplicationGrantMatrixMatches(
  catalogRows,
  tablePrivileges,
  requiredTables = [],
) {
  if (
    !Array.isArray(catalogRows) ||
    catalogRows.length === 0 ||
    tablePrivileges === null ||
    typeof tablePrivileges !== "object" ||
    Array.isArray(tablePrivileges) ||
    !Array.isArray(requiredTables) ||
    requiredTables.some(
      (tableName) => typeof tableName !== "string" || tableName.length === 0,
    ) ||
    new Set(requiredTables).size !== requiredTables.length
  ) {
    return false;
  }

  const expectedByTable = new Map();
  for (const [tableName, privileges] of Object.entries(tablePrivileges)) {
    if (
      tableName.length === 0 ||
      !Array.isArray(privileges) ||
      privileges.some(
        (privilege) =>
          !applicationPrivilegeNames.includes(privilege) ||
          typeof privilege !== "string",
      ) ||
      new Set(privileges).size !== privileges.length
    ) {
      return false;
    }
    expectedByTable.set(tableName, new Set(privileges));
  }
  if (
    expectedByTable.size === 0 ||
    requiredTables.some((tableName) => expectedByTable.has(tableName))
  ) {
    return false;
  }

  const actualByTable = new Map();
  for (const row of catalogRows) {
    if (
      row === null ||
      typeof row !== "object" ||
      typeof row.table_name !== "string" ||
      row.table_name.length === 0 ||
      !applicationPrivilegeNames.includes(row.privilege) ||
      typeof row.granted !== "boolean"
    ) {
      return false;
    }
    let privileges = actualByTable.get(row.table_name);
    if (privileges === undefined) {
      privileges = new Map();
      actualByTable.set(row.table_name, privileges);
    }
    if (privileges.has(row.privilege)) return false;
    privileges.set(row.privilege, row.granted);
  }

  for (const requiredTable of [...expectedByTable.keys(), ...requiredTables]) {
    if (!actualByTable.has(requiredTable)) return false;
  }

  for (const [tableName, actualPrivileges] of actualByTable) {
    if (actualPrivileges.size !== applicationPrivilegeNames.length) {
      return false;
    }
    const expectedPrivileges = expectedByTable.get(tableName);
    for (const privilege of applicationPrivilegeNames) {
      const expected = expectedPrivileges?.has(privilege) ?? false;
      if (actualPrivileges.get(privilege) !== expected) return false;
    }
  }

  return true;
}
