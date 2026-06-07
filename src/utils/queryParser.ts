import type {
  QueryParseResult,
  ParsedQuery,
  QueryCondition,
  QueryParseError,
  LogicalOperator,
  ComparisonOperator,
  TickerSummary,
} from "../types/index";

// Valid query fields and their mapping to TickerSummary properties
const FIELD_MAP: Record<string, keyof TickerSummary> = {
  "Market Cap": "market_cap",
  PE: "pe_ratio",
  ROE: "roe",
  ROCE: "roce",
  "Dividend Yield": "dividend_yield",
  AI_Rating: "ai_rating",
  AI_Confidence: "ai_confidence",
  TFT_Score: "tft_score",
};

const VALID_FIELDS = Object.keys(FIELD_MAP);

const COMPARISON_OPERATORS: ComparisonOperator[] = [
  ">=",
  "<=",
  "!=",
  ">",
  "<",
  "=",
];

// Token types for the tokenizer
type TokenType = "field" | "operator" | "value" | "logical" | "unknown";

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

function makeError(message: string, position: number): QueryParseResult {
  return { success: false, error: { message, position } };
}

/**
 * Tokenizes query input, respecting quoted strings and multi-word fields.
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (input[i] === " " || input[i] === "\t") {
      i++;
      continue;
    }

    // Quoted string value
    if (input[i] === '"') {
      const start = i;
      i++; // skip opening quote
      let str = "";
      while (i < input.length && input[i] !== '"') {
        str += input[i];
        i++;
      }
      if (i < input.length) {
        i++; // skip closing quote
      }
      tokens.push({ type: "value", value: str, position: start });
      continue;
    }

    // Comparison operators (check multi-char first)
    if (
      i + 1 < input.length &&
      (input.substring(i, i + 2) === ">=" ||
        input.substring(i, i + 2) === "<=" ||
        input.substring(i, i + 2) === "!=")
    ) {
      tokens.push({
        type: "operator",
        value: input.substring(i, i + 2),
        position: i,
      });
      i += 2;
      continue;
    }

    if (input[i] === ">" || input[i] === "<" || input[i] === "=") {
      tokens.push({ type: "operator", value: input[i], position: i });
      i++;
      continue;
    }

    // Numbers (including decimals and negative)
    if (
      input[i] >= "0" && input[i] <= "9" ||
      (input[i] === "-" && i + 1 < input.length && input[i + 1] >= "0" && input[i + 1] <= "9")
    ) {
      const start = i;
      if (input[i] === "-") i++;
      while (i < input.length && input[i] >= "0" && input[i] <= "9") {
        i++;
      }
      if (i < input.length && input[i] === ".") {
        i++;
        while (i < input.length && input[i] >= "0" && input[i] <= "9") {
          i++;
        }
      }
      tokens.push({
        type: "value",
        value: input.substring(start, i),
        position: start,
      });
      continue;
    }

    // Words (identifiers, logical operators, multi-word fields)
    if (
      (input[i] >= "a" && input[i] <= "z") ||
      (input[i] >= "A" && input[i] <= "Z") ||
      input[i] === "_"
    ) {
      const start = i;
      let word = "";
      while (
        i < input.length &&
        ((input[i] >= "a" && input[i] <= "z") ||
          (input[i] >= "A" && input[i] <= "Z") ||
          (input[i] >= "0" && input[i] <= "9") ||
          input[i] === "_")
      ) {
        word += input[i];
        i++;
      }

      // Check for logical operators
      if (word === "AND" || word === "OR") {
        tokens.push({ type: "logical", value: word, position: start });
        continue;
      }

      // Check for multi-word fields by trying to match longest known field
      let matched = false;
      for (const field of VALID_FIELDS) {
        if (field.startsWith(word)) {
          // Check if this might be a multi-word field
          const remaining = field.substring(word.length);
          if (remaining.length === 0) {
            // Exact match
            tokens.push({ type: "field", value: field, position: start });
            matched = true;
            break;
          }
          // Try matching the rest (e.g., "Market" then " Cap")
          if (remaining[0] === " ") {
            const nextWord = remaining.substring(1);
            // Check if remaining input has the next word
            let tempI = i;
            // Skip whitespace
            while (tempI < input.length && input[tempI] === " ") {
              tempI++;
            }
            // Read next word
            let nextPart = "";
            while (
              tempI < input.length &&
              ((input[tempI] >= "a" && input[tempI] <= "z") ||
                (input[tempI] >= "A" && input[tempI] <= "Z") ||
                (input[tempI] >= "0" && input[tempI] <= "9") ||
                input[tempI] === "_")
            ) {
              nextPart += input[tempI];
              tempI++;
            }
            if (nextPart === nextWord) {
              tokens.push({ type: "field", value: field, position: start });
              i = tempI;
              matched = true;
              break;
            }
          }
        }
      }

      if (!matched) {
        // Check if it's an exact single-word field
        if (VALID_FIELDS.includes(word)) {
          tokens.push({ type: "field", value: word, position: start });
        } else {
          tokens.push({ type: "unknown", value: word, position: start });
        }
      }
      continue;
    }

    // Unknown character
    tokens.push({ type: "unknown", value: input[i], position: i });
    i++;
  }

  return tokens;
}

/**
 * Suggests a correction for an invalid field name.
 */
function suggestField(input: string): string | null {
  const lower = input.toLowerCase().replace(/[\s_]/g, "");
  for (const field of VALID_FIELDS) {
    const fieldLower = field.toLowerCase().replace(/[\s_]/g, "");
    if (fieldLower === lower) {
      return field;
    }
  }
  // Partial match
  for (const field of VALID_FIELDS) {
    if (field.toLowerCase().includes(lower) || lower.includes(field.toLowerCase())) {
      return field;
    }
  }
  return null;
}

/**
 * Parses a query string into a structured ParsedQuery or returns an error.
 */
export function parseQuery(input: string): QueryParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return makeError("Empty query", 0);
  }

  const tokens = tokenize(trimmed);

  if (tokens.length === 0) {
    return makeError("Empty query", 0);
  }

  const conditions: QueryCondition[] = [];
  const logicalOperators: LogicalOperator[] = [];

  let i = 0;

  while (i < tokens.length) {
    // Expect a field
    if (i >= tokens.length) {
      return makeError("Expected a field name", trimmed.length);
    }

    const fieldToken = tokens[i];
    if (fieldToken.type === "unknown") {
      const suggestion = suggestField(fieldToken.value);
      const msg = suggestion
        ? `Unknown field: ${fieldToken.value}. Did you mean '${suggestion}'?`
        : `Unknown field: ${fieldToken.value}. Valid fields: ${VALID_FIELDS.join(", ")}`;
      return makeError(msg, fieldToken.position);
    }
    if (fieldToken.type !== "field") {
      return makeError(
        `Expected a field name but got '${fieldToken.value}'`,
        fieldToken.position
      );
    }
    i++;

    // Expect an operator
    if (i >= tokens.length) {
      return makeError(
        "Expected a comparison operator after field",
        trimmed.length
      );
    }

    const opToken = tokens[i];
    if (
      opToken.type !== "operator" ||
      !COMPARISON_OPERATORS.includes(opToken.value as ComparisonOperator)
    ) {
      return makeError(
        `Expected a comparison operator (>, <, >=, <=, =, !=) but got '${opToken.value}'`,
        opToken.position
      );
    }
    const operator = opToken.value as ComparisonOperator;
    i++;

    // Expect a value
    if (i >= tokens.length) {
      return makeError("Expected a value after operator", trimmed.length);
    }

    const valueToken = tokens[i];
    if (valueToken.type !== "value") {
      return makeError(
        `Expected a value but got '${valueToken.value}'`,
        valueToken.position
      );
    }

    let value: number | string;
    // Determine if value is numeric or string
    const numericValue = Number(valueToken.value);
    if (!isNaN(numericValue) && valueToken.value.length > 0) {
      value = numericValue;
    } else {
      value = valueToken.value;
    }

    conditions.push({
      field: fieldToken.value,
      operator,
      value,
    });
    i++;

    // Check for logical operator or end
    if (i < tokens.length) {
      const logToken = tokens[i];
      if (logToken.type === "logical") {
        logicalOperators.push(logToken.value as LogicalOperator);
        i++;
        // After a logical operator, we must have another condition
        if (i >= tokens.length) {
          return makeError(
            "Expected a condition after logical operator",
            trimmed.length
          );
        }
      } else {
        // Unexpected token
        return makeError(
          `Expected AND/OR or end of query but got '${logToken.value}'`,
          logToken.position
        );
      }
    }
  }

  if (conditions.length === 0) {
    return makeError("No conditions found in query", 0);
  }

  return {
    success: true,
    parsed: { conditions, logicalOperators },
  };
}

/**
 * Evaluates a parsed query against a ticker summary.
 * AND binds tighter than OR (standard precedence).
 */
export function evaluateQuery(
  query: ParsedQuery,
  ticker: TickerSummary
): boolean {
  const { conditions, logicalOperators } = query;

  if (conditions.length === 0) {
    return true;
  }

  // Evaluate each condition individually
  const results = conditions.map((condition) =>
    evaluateCondition(condition, ticker)
  );

  // Apply AND/OR precedence: AND binds tighter than OR.
  // Strategy: group by OR first, each OR-separated group is ANDed.
  // Split into OR-separated groups where each group is a set of AND-connected results.
  const orGroups: boolean[][] = [[]];

  orGroups[0].push(results[0]);

  for (let i = 0; i < logicalOperators.length; i++) {
    if (logicalOperators[i] === "OR") {
      orGroups.push([results[i + 1]]);
    } else {
      // AND: add to current group
      orGroups[orGroups.length - 1].push(results[i + 1]);
    }
  }

  // Each OR group passes if all conditions within it (ANDed) are true
  // The overall query passes if any OR group passes
  return orGroups.some((group) => group.every((result) => result));
}

/**
 * Evaluates a single condition against a ticker.
 */
function evaluateCondition(
  condition: QueryCondition,
  ticker: TickerSummary
): boolean {
  const fieldKey = FIELD_MAP[condition.field];
  if (!fieldKey) {
    return false;
  }

  const tickerValue = ticker[fieldKey];
  const conditionValue = condition.value;

  // String comparison (for AI_Rating)
  if (typeof conditionValue === "string") {
    const tickerStr = String(tickerValue);
    switch (condition.operator) {
      case "=":
        return tickerStr === conditionValue;
      case "!=":
        return tickerStr !== conditionValue;
      default:
        // Numeric operators on strings: do lexicographic comparison
        return tickerStr === conditionValue;
    }
  }

  // Numeric comparison
  const numValue = Number(tickerValue);
  if (isNaN(numValue)) {
    return false;
  }

  switch (condition.operator) {
    case ">":
      return numValue > conditionValue;
    case "<":
      return numValue < conditionValue;
    case ">=":
      return numValue >= conditionValue;
    case "<=":
      return numValue <= conditionValue;
    case "=":
      return numValue === conditionValue;
    case "!=":
      return numValue !== conditionValue;
    default:
      return false;
  }
}
