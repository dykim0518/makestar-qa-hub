import ts from "typescript";
import { extractFeatureTags } from "./coverage-tag";

const UNRESOLVED = Symbol("coverage-static-map-unresolved");

type Unresolved = typeof UNRESOLVED;
type StaticPrimitive = boolean | number | RegExp | string | null;
type StaticValue = StaticPrimitive | StaticArray | StaticObject | Unresolved;

interface StaticArray extends Array<StaticValue> {
  readonly __staticArrayBrand?: never;
}

interface StaticObject {
  [key: string]: StaticValue;
}

const TEST_CALL_MODIFIERS = new Set(["fail", "fixme", "only", "skip"]);
const DESCRIBE_CALL_MODIFIERS = new Set(["only", "parallel", "serial"]);

export const FILE_TO_PRODUCT: {
  pattern: RegExp;
  product: string;
  suite: string;
}[] = [
  { pattern: /^admin_poca_/, product: "admin_pocaalbum", suite: "admin" },
  { pattern: /^ab_/, product: "admin_albumbuddy", suite: "albumbuddy" },
  { pattern: /^admin_/, product: "admin_makestar", suite: "admin" },
  { pattern: /^cmr_/, product: "cmr", suite: "cmr" },
];

export const FILE_KEYWORD_MAP: Record<string, string[]> = {
  order: ["/order"],
  artist: ["/artist"],
  product: ["/product"],
  user: ["/user", "/customer"],
  auth: ["/login"],
  album: ["/album"],
  content: ["/content", "/notice"],
  shop: ["/shop"],
  dashboard: ["/dashboard"],
  monitoring: ["/dashboard"],
  excel: ["/excel"],
  readonly: [],
};

export type CoverageStaticWarning = {
  file: string;
  line: number;
  kind:
    | "cross_product_tag"
    | "unknown_feature_tag"
    | "unresolved_describe_title"
    | "unresolved_if_condition"
    | "unresolved_loop_iterable"
    | "unresolved_test_title";
  message: string;
  tag?: string;
};

export type CoverageStaticDescribe = {
  title: string;
  tags: string[];
  startLine: number;
  testTitles: string[];
};

type CoverageTaggedTest = {
  line: number;
  tags: string[];
  title: string;
};

export type CoverageStaticSpec = {
  describes: CoverageStaticDescribe[];
  file: string;
  taggedTests: CoverageTaggedTest[];
  titles: string[];
  warnings: CoverageStaticWarning[];
};

export type CoverageStaticFeature = {
  featureName: string;
  id: string;
  pagePath: string;
  pageTitle: string | null;
  product: string;
  tag: string | null;
};

export type CoverageStaticProposal = {
  file: string;
  keywordMatches: {
    featureId: string;
    featureName: string;
    matchedKeyword: string;
    pagePath: string;
  }[];
  keywordTestTitles: string[];
  keywords: string[];
  product: string;
  suite: string;
  tagMatches: {
    featureId: string;
    featureName: string;
    ownerKind: "describe" | "test";
    ownerTitle: string;
    pagePath: string;
    tag: string;
    testTitles: string[];
  }[];
};

export type CoverageStaticPlan = {
  proposals: CoverageStaticProposal[];
  warnings: CoverageStaticWarning[];
};

function cloneEnv(env: Map<string, StaticValue>): Map<string, StaticValue> {
  return new Map(env);
}

function getLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isStaticObject(value: StaticValue): value is StaticObject {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof RegExp);
}

function toStringValue(value: StaticValue): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value === null) return "null";
  return null;
}

function parseRegExpLiteral(text: string): RegExp | Unresolved {
  const match = text.match(/^\/([\s\S]*)\/([a-z]*)$/);
  if (!match) return UNRESOLVED;
  try {
    return new RegExp(match[1], match[2]);
  } catch {
    return UNRESOLVED;
  }
}

function evaluateExpression(
  node: ts.Expression,
  env: Map<string, StaticValue>,
  sourceFile: ts.SourceFile,
): StaticValue {
  if (ts.isParenthesizedExpression(node)) {
    return evaluateExpression(node.expression, env, sourceFile);
  }
  if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return evaluateExpression(node.expression, env, sourceFile);
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isRegularExpressionLiteral(node)) {
    return parseRegExpLiteral(node.getText(sourceFile));
  }
  if (ts.isIdentifier(node)) {
    return env.get(node.text) ?? UNRESOLVED;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expressionValue = evaluateExpression(span.expression, env, sourceFile);
      const stringValue = toStringValue(expressionValue);
      if (stringValue === null) return UNRESOLVED;
      value += stringValue + span.literal.text;
    }
    return value;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const values: StaticValue[] = [];
    for (const element of node.elements) {
      if (ts.isSpreadElement(element)) return UNRESOLVED;
      values.push(evaluateExpression(element, env, sourceFile));
    }
    return values;
  }
  if (ts.isObjectLiteralExpression(node)) {
    const objectValue: StaticObject = {};
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        const key = getPropertyName(property.name);
        if (!key) continue;
        objectValue[key] = evaluateExpression(property.initializer, env, sourceFile);
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        objectValue[property.name.text] = env.get(property.name.text) ?? UNRESOLVED;
        continue;
      }
      if (ts.isSpreadAssignment(property)) {
        const spreadValue = evaluateExpression(property.expression, env, sourceFile);
        if (isStaticObject(spreadValue)) {
          Object.assign(objectValue, spreadValue);
        }
        continue;
      }
    }
    return objectValue;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const target = evaluateExpression(node.expression, env, sourceFile);
    if (!isStaticObject(target)) return UNRESOLVED;
    return target[node.name.text] ?? UNRESOLVED;
  }
  if (ts.isElementAccessExpression(node)) {
    const target = evaluateExpression(node.expression, env, sourceFile);
    const index = node.argumentExpression
      ? evaluateExpression(node.argumentExpression, env, sourceFile)
      : UNRESOLVED;
    if (Array.isArray(target) && typeof index === "number") {
      return target[index] ?? UNRESOLVED;
    }
    if (isStaticObject(target) && (typeof index === "number" || typeof index === "string")) {
      return target[String(index)] ?? UNRESOLVED;
    }
    return UNRESOLVED;
  }
  if (ts.isPrefixUnaryExpression(node)) {
    const value = evaluateExpression(node.operand, env, sourceFile);
    if (typeof value !== "number") return UNRESOLVED;
    if (node.operator === ts.SyntaxKind.MinusToken) return -value;
    if (node.operator === ts.SyntaxKind.PlusToken) return value;
  }
  return UNRESOLVED;
}

function getPropertyName(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function getCallChain(expression: ts.Expression): string[] {
  if (ts.isIdentifier(expression)) return [expression.text];
  if (ts.isPropertyAccessExpression(expression)) {
    const parent = getCallChain(expression.expression);
    return parent.length > 0 ? [...parent, expression.name.text] : [];
  }
  return [];
}

function isDescribeCall(chain: string[]): boolean {
  if (chain.length < 2 || chain[0] !== "test" || chain[1] !== "describe") {
    return false;
  }
  return chain.slice(2).every((segment) => DESCRIBE_CALL_MODIFIERS.has(segment));
}

function isTestCall(chain: string[]): boolean {
  if (chain.length === 1) return chain[0] === "test";
  if (chain[0] !== "test") return false;
  return chain.slice(1).every((segment) => TEST_CALL_MODIFIERS.has(segment));
}

function extractOptionTags(
  argument: ts.Expression | undefined,
  env: Map<string, StaticValue>,
  sourceFile: ts.SourceFile,
): string[] {
  if (!argument) return [];
  const value = evaluateExpression(argument, env, sourceFile);
  if (!isStaticObject(value)) return [];
  const optionTags = value.tag ?? value.tags;
  if (typeof optionTags === "string") {
    return extractFeatureTags(optionTags);
  }
  if (Array.isArray(optionTags)) {
    return Array.from(
      new Set(
        optionTags.flatMap((tagValue) =>
          typeof tagValue === "string" ? extractFeatureTags(tagValue) : [],
        ),
      ),
    );
  }
  return [];
}

function findBlockCallback(callExpression: ts.CallExpression): ts.Block | null {
  for (let index = callExpression.arguments.length - 1; index >= 0; index -= 1) {
    const argument = callExpression.arguments[index];
    if (!ts.isArrowFunction(argument) && !ts.isFunctionExpression(argument)) {
      continue;
    }
    return ts.isBlock(argument.body) ? argument.body : null;
  }
  return null;
}

function setBindingFromDeclaration(
  declaration: ts.VariableDeclaration,
  env: Map<string, StaticValue>,
  sourceFile: ts.SourceFile,
) {
  if (!ts.isIdentifier(declaration.name) || !declaration.initializer) return;
  env.set(
    declaration.name.text,
    evaluateExpression(declaration.initializer, env, sourceFile),
  );
}

export function inferCoverageProduct(
  file: string,
): { product: string; suite: string } | null {
  for (const { pattern, product, suite } of FILE_TO_PRODUCT) {
    if (pattern.test(file)) return { product, suite };
  }
  return null;
}

export function inferCoverageKeywords(file: string): string[] {
  const keywords: string[] = [];
  for (const [keyword, hints] of Object.entries(FILE_KEYWORD_MAP)) {
    if (file.includes(keyword)) keywords.push(...hints);
  }
  return keywords;
}

export function parseCoverageSpec(
  file: string,
  content: string,
): CoverageStaticSpec {
  const sourceFile = ts.createSourceFile(
    file,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const describes: CoverageStaticDescribe[] = [];
  const taggedTests: CoverageTaggedTest[] = [];
  const titles: string[] = [];
  const titleSet = new Set<string>();
  const warnings: CoverageStaticWarning[] = [];

  function addTitle(title: string) {
    if (titleSet.has(title)) return;
    titleSet.add(title);
    titles.push(title);
  }

  function walkStatements(
    statements: ts.NodeArray<ts.Statement>,
    env: Map<string, StaticValue>,
    describeStack: CoverageStaticDescribe[],
  ) {
    const scope = cloneEnv(env);
    for (const statement of statements) {
      walkStatement(statement, scope, describeStack);
    }
  }

  function walkStatement(
    statement: ts.Statement,
    env: Map<string, StaticValue>,
    describeStack: CoverageStaticDescribe[],
  ) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        setBindingFromDeclaration(declaration, env, sourceFile);
      }
      return;
    }

    if (ts.isBlock(statement)) {
      walkStatements(statement.statements, env, describeStack);
      return;
    }

    if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
      handleCall(statement.expression, env, describeStack);
      return;
    }

    if (ts.isForOfStatement(statement)) {
      const iterableValue = evaluateExpression(statement.expression, env, sourceFile);
      if (!Array.isArray(iterableValue)) {
        warnings.push({
          file,
          kind: "unresolved_loop_iterable",
          line: getLine(sourceFile, statement.expression),
          message: "for...of 대상을 정적으로 해석하지 못해 내부 테스트를 스킵했습니다.",
        });
        return;
      }

      const loopVariable = ts.isVariableDeclarationList(statement.initializer)
        ? statement.initializer.declarations[0]
        : null;
      const loopIdentifier =
        loopVariable && ts.isIdentifier(loopVariable.name)
          ? loopVariable.name.text
          : ts.isIdentifier(statement.initializer)
            ? statement.initializer.text
            : null;

      if (!loopIdentifier) {
        warnings.push({
          file,
          kind: "unresolved_loop_iterable",
          line: getLine(sourceFile, statement),
          message: "for...of 루프 변수 형태를 해석하지 못해 내부 테스트를 스킵했습니다.",
        });
        return;
      }

      for (const item of iterableValue) {
        const loopEnv = cloneEnv(env);
        loopEnv.set(loopIdentifier, item);
        if (ts.isBlock(statement.statement)) {
          walkStatements(statement.statement.statements, loopEnv, describeStack);
        } else {
          walkStatement(statement.statement, loopEnv, describeStack);
        }
      }
      return;
    }

    if (ts.isIfStatement(statement)) {
      const condition = evaluateExpression(statement.expression, env, sourceFile);
      if (condition === true) {
        walkStatement(statement.thenStatement, env, describeStack);
        return;
      }
      if (condition === false) {
        if (statement.elseStatement) {
          walkStatement(statement.elseStatement, env, describeStack);
        }
        return;
      }
      warnings.push({
        file,
        kind: "unresolved_if_condition",
        line: getLine(sourceFile, statement.expression),
        message: "if 조건을 정적으로 해석하지 못해 내부 테스트를 스킵했습니다.",
      });
    }
  }

  function handleCall(
    callExpression: ts.CallExpression,
    env: Map<string, StaticValue>,
    describeStack: CoverageStaticDescribe[],
  ) {
    const chain = getCallChain(callExpression.expression);
    if (isDescribeCall(chain)) {
      const titleArgument = callExpression.arguments[0];
      const titleValue =
        titleArgument && ts.isExpression(titleArgument)
          ? evaluateExpression(titleArgument, env, sourceFile)
          : UNRESOLVED;
      const title = typeof titleValue === "string" ? titleValue : null;
      const optionTags = extractOptionTags(callExpression.arguments[1], env, sourceFile);
      if (title === null && optionTags.length === 0) {
        warnings.push({
          file,
          kind: "unresolved_describe_title",
          line: getLine(sourceFile, callExpression),
          message: "describe 제목을 정적으로 해석하지 못해 태그 매핑을 건너뜁니다.",
        });
      }

      const describeBlock: CoverageStaticDescribe = {
        startLine: getLine(sourceFile, callExpression),
        tags: Array.from(
          new Set([...(title ? extractFeatureTags(title) : []), ...optionTags]),
        ),
        testTitles: [],
        title: title ?? `<dynamic describe @${getLine(sourceFile, callExpression)}>`,
      };
      describes.push(describeBlock);

      const callbackBody = findBlockCallback(callExpression);
      if (callbackBody) {
        walkStatements(callbackBody.statements, env, [...describeStack, describeBlock]);
      }
      return;
    }

    if (!isTestCall(chain)) return;

    const titleArgument = callExpression.arguments[0];
    const titleValue =
      titleArgument && ts.isExpression(titleArgument)
        ? evaluateExpression(titleArgument, env, sourceFile)
        : UNRESOLVED;
    if (typeof titleValue !== "string") {
      warnings.push({
        file,
        kind: "unresolved_test_title",
        line: getLine(sourceFile, callExpression),
        message: "test 제목을 정적으로 해석하지 못해 정적 매핑에서 제외했습니다.",
      });
      return;
    }

    addTitle(titleValue);
    const currentDescribe = describeStack.at(-1);
    if (currentDescribe) {
      currentDescribe.testTitles.push(titleValue);
    }

    const optionTags = extractOptionTags(callExpression.arguments[1], env, sourceFile);
    const tags = Array.from(
      new Set([...extractFeatureTags(titleValue), ...optionTags]),
    );
    if (tags.length > 0) {
      taggedTests.push({
        line: getLine(sourceFile, callExpression),
        tags,
        title: titleValue,
      });
    }
  }

  walkStatements(sourceFile.statements, new Map<string, StaticValue>(), []);

  return {
    describes,
    file,
    taggedTests,
    titles,
    warnings,
  };
}

export function buildCoverageStaticPlan(
  specs: CoverageStaticSpec[],
  allFeatures: CoverageStaticFeature[],
): CoverageStaticPlan {
  const proposals: CoverageStaticProposal[] = [];
  const warnings: CoverageStaticWarning[] = [];

  for (const spec of specs) {
    const productHint = inferCoverageProduct(spec.file);
    if (!productHint) continue;

    const productFeatures = allFeatures.filter(
      (feature) => feature.product === productHint.product,
    );
    const explicitTagTitles = new Set<string>();
    const tagMatches: CoverageStaticProposal["tagMatches"] = [];

    for (const warning of spec.warnings) {
      warnings.push(warning);
    }

    for (const taggedTest of spec.taggedTests) {
      explicitTagTitles.add(taggedTest.title);
      for (const tag of taggedTest.tags) {
        const productHits = productFeatures.filter((feature) => feature.tag === tag);
        if (productHits.length === 0) {
          warnings.push(buildTagWarning(spec.file, taggedTest.line, tag, allFeatures, productHint.product));
          continue;
        }
        for (const feature of productHits) {
          tagMatches.push({
            featureId: feature.id,
            featureName: feature.featureName,
            ownerKind: "test",
            ownerTitle: taggedTest.title,
            pagePath: feature.pagePath,
            tag,
            testTitles: [taggedTest.title],
          });
        }
      }
    }

    for (const describeBlock of spec.describes) {
      if (describeBlock.tags.length === 0 || describeBlock.testTitles.length === 0) {
        continue;
      }
      for (const title of describeBlock.testTitles) {
        explicitTagTitles.add(title);
      }
      for (const tag of describeBlock.tags) {
        const productHits = productFeatures.filter((feature) => feature.tag === tag);
        if (productHits.length === 0) {
          warnings.push(
            buildTagWarning(
              spec.file,
              describeBlock.startLine,
              tag,
              allFeatures,
              productHint.product,
            ),
          );
          continue;
        }
        for (const feature of productHits) {
          tagMatches.push({
            featureId: feature.id,
            featureName: feature.featureName,
            ownerKind: "describe",
            ownerTitle: describeBlock.title,
            pagePath: feature.pagePath,
            tag,
            testTitles: [...describeBlock.testTitles],
          });
        }
      }
    }

    const keywords = inferCoverageKeywords(spec.file);
    const keywordTestTitles = spec.titles.filter(
      (title) => !explicitTagTitles.has(title),
    );
    const keywordMatches: CoverageStaticProposal["keywordMatches"] = [];

    if (keywords.length > 0 && keywordTestTitles.length > 0) {
      for (const feature of productFeatures) {
        for (const keyword of keywords) {
          const haystack = `${feature.pagePath} ${feature.featureName} ${feature.pageTitle ?? ""}`;
          if (!haystack.includes(keyword)) continue;
          keywordMatches.push({
            featureId: feature.id,
            featureName: feature.featureName,
            matchedKeyword: keyword,
            pagePath: feature.pagePath,
          });
          break;
        }
      }
    }

    if (tagMatches.length === 0 && keywordMatches.length === 0) {
      continue;
    }

    proposals.push({
      file: spec.file,
      keywordMatches,
      keywordTestTitles,
      keywords,
      product: productHint.product,
      suite: productHint.suite,
      tagMatches,
    });
  }

  return { proposals, warnings };
}

function buildTagWarning(
  file: string,
  line: number,
  tag: string,
  allFeatures: CoverageStaticFeature[],
  product: string,
): CoverageStaticWarning {
  const matches = allFeatures.filter((feature) => feature.tag === tag);
  if (matches.length === 0) {
    return {
      file,
      kind: "unknown_feature_tag",
      line,
      message: `정적 태그 "${tag}" 가 qa_coverage_features.tag 어디에도 없습니다.`,
      tag,
    };
  }
  const otherProducts = Array.from(new Set(matches.map((feature) => feature.product))).join(", ");
  return {
    file,
    kind: "cross_product_tag",
    line,
    message: `정적 태그 "${tag}" 는 ${product} 제품에 없고 다른 제품(${otherProducts})에만 존재합니다.`,
    tag,
  };
}
