// Script to generate the tmLanguage.json file.
// The easiest way to run this script, is with Bun.
// (Just run `bun generate-grammar.ts`.)
import fs from "fs/promises";

interface MapLike<T> {
  [s: string]: T;
}

interface TmGrammarRuleName {
  name: string;
}

interface TmGrammarRule {
  name?: string;
}
interface TmGrammarMatchRule extends TmGrammarRule {
  match: string;
  captures?: MapLike<TmGrammarRuleName>;
}
interface TmGrammarBeginEndRule extends TmGrammarRule {
  name?: string;
  begin: string;
  end: string;
  beginCaptures?: MapLike<TmGrammarRuleName>;
  endCaptures?: MapLike<TmGrammarRuleName>;
  patterns?: AnyTmGrammarRule[];
}
interface TmGrammarIncludeRule extends TmGrammarRule {
  include: string;
}
type AnyTmGrammarRule =
  | TmGrammarMatchRule
  | TmGrammarBeginEndRule
  | TmGrammarIncludeRule;
interface TmGrammarRepositoryPatterns {
  patterns: AnyTmGrammarRule[];
}
type TmGrammarRepositaryRule = AnyTmGrammarRule | TmGrammarRepositoryPatterns;
interface TmGrammar {
  $schema: string;
  name: string;
  scopeName: string;
  fileTypes?: string[];
  uuid?: string;
  variables?: MapLike<string>;
  patterns?: AnyTmGrammarRule[];
  repository: MapLike<TmGrammarRepositaryRule>;
}

interface TmThemeSetting {
  scope: string;
  settings: { vsclassificationtype: string };
}

interface TmTheme {
  name: string;
  uuid: string;
  settings: TmThemeSetting[];
}

function token(name: string) {
  return `(?i)(\\b${name}\\b)`;
}

const patterns: {
  priority: number;
  name: string;
  pattern: TmGrammarRepositaryRule;
}[] = [];
function addPattern(
  name: string,
  opts: { priority?: number } & TmGrammarRepositaryRule
) {
  const { priority, ...pattern } = opts;
  patterns.push({ priority: priority ?? 0, name, pattern });
}

function include(name: string) {
  return {
    include: "#" + name,
  };
}

// 1.1 Directive lines
addPattern("directive", {
  priority: 2,
  patterns: [
    {
      name: "comment.directive",
      match: "^%.*$",
    },
  ],
});

const IDENTIFIER = "\\p{L}[\\p{L}0-9]*";
const STRING = '"[^"]*"';

function wordBoundary(pattern: string) {
  return "\\b" + pattern + "\\b";
}

// 1.4 Identifiers
addPattern("identifier", {
  priority: -10,
  match: wordBoundary(IDENTIFIER),
  name: "entity.other",
});

// 1.5 Numbers
addPattern("number", {
  patterns: [
    {
      match: "(?i)([+-]?[1248]|(16))R[\\dA-F]+",
      name: "constant.numeric.radix",
    },
    {
      match: "[+-]?((\\d+\\.\\d[\\d_]*)|(\\.?\\d[\\d_]*))(&&?[+-]?\\d+)?",
      name: "constant.numeric.decimal",
    },
  ],
});

// 1.6 Strings
addPattern("string", {
  name: "string.quoted.double",
  begin: '"',
  end: '"',
  patterns: [
    {
      name: "constant.character.escape",
      match: '""',
    },
  ],
});

// 1.7 Character constants
addPattern("character", {
  patterns: [
    {
      name: "constant.character",
      match: "'!\\d{1,3}!'",
    },
    {
      name: "invalid.illegal.character.too_many",
      match: "'[^']{2,}'",
    },
    {
      name: "constant.character",
      match: "'.'",
    },
  ],
});

addPattern("label", {
  patterns: [
    {
      match: "(" + IDENTIFIER + ")\\s*:",
      name: "label",
      captures: {
        "1": {
          name: "entity.name.label",
        },
      },
    },
  ],
});

// 1.8 Comments
addPattern("comments", {
  priority: 2,
  patterns: [
    {
      name: "comment.block",
      begin: "!",
      end: ";",
    },
    {
      name: "comment.block",
      begin: "\\b(?i)comment\\b",
      end: ";",
    },
    {
      name: "comment.line",
      match: "--.*$",
    },
  ],
});

// MISC
addPattern("nulls", {
  patterns: [
    {
      match: "\\b(?i)(none|notext)\\b",
      name: "constant.language.null",
    },
  ],
});
addPattern("boolean", {
  match: "\\b(?i)(true|false)\\b",
  name: "constant.language.bool",
});
addPattern("types", {
  match: "\\b(?i)(boolean|character|integer|long|short|real|text|array)\\b",
  name: "storage.type",
});
addPattern("ref_types", {
  patterns: [
    {
      // "\\b([a-zA-Z_][a-zA-Z0-9_]*)\\s*(\\()"
      match: "\\b(?i)(ref)\\s*\\((" + IDENTIFIER + ")\\)",
      name: "storage.modifier",
      captures: {
        "1": {
          name: "keyword.other",
        },
        "2": {
          name: "entity.name.class",
        },
      },
    },
  ],
});

// Chapter 3: Expressions

const expressionPatterns = [
  include("number"),
  include("string"),
  include("character"),
  include("nulls"),
  include("boolean"),
  include("variable"),
];
/*
addPattern("expression", {
  patterns: [
    
  ],
});
*/

// Chapter 4 Statements
addPattern("assignment_statement", {
  priority: 1,
  patterns: [
    {
      match: "(" + IDENTIFIER + ")\\s*:=\\s*",
      captures: {
        "1": {
          name: "variable",
        },
      },
    },
  ],
});

// 4.2 Conditional statements
addPattern("conditional_statement", {
  patterns: [
    {
      match: token("if"),
      name: "keyword.control.if",
    },
    {
      match: token("then"),
      name: "keyword.control.then",
    },
    {
      match: token("else"),
      name: "keyword.control.else",
    },
  ],
});

addPattern("while_statement", {
  patterns: [
    {
      match: token("(do)\\s+(begin)"),
      captures: {
        "1": {
          name: "keyword.control.do",
        },
        "2": {
          name: "keyword.control.begin",
        },
      },
    },
  ],
});

/*
statement
 = { label : } unconditional-statement
 | DONE { label : } conditional-statement
 | { label : } for-statement
 unconditional-statement
 = DONE assignment-statement
 | ? while-statement
 | ? goto-statement
 | DONE procedure-statement
 | DONE object-generator
 | connection-statement
 | DONE compound-statement
 | DONE block
 | dummy-statement
 | activation-statement
 */

/*
addPattern("statement", {
  patterns: [
    include("comments"),
    include("directive"),
    include("procedure_statement"),
    include("compound_statement"),
  ],
});
*/

// 4.1 Assignment statement
// We might not need to define anything here.

addPattern("goto_statement", {
  patterns: [
    {
      match: "\\b(?i)(goto|go\\s+to)\\s+(" + IDENTIFIER + ")\\b",
      captures: {
        "1": {
          name: "keyword.control.goto",
        },
        "2": {
          name: "entity.name.label",
        },
      },
    },
  ],
});

// 4.6 Procedure statement
addPattern("procedure_statement", {
  patterns: [
    {
      begin: "\\b(" + IDENTIFIER + ")\\s*(\\()",
      beginCaptures: {
        "1": {
          name: "entity.name.function",
        },
        "2": {
          name: "punctuation.definition.arguments.begin",
        },
      },
      end: "\\)",
      endCaptures: {
        "1": {
          name: "punctuation.definition.arguments.end",
        },
      },
      patterns: [
        include("directive"),
        include("comments"),
        include("procedure_statement"),
        ...expressionPatterns,
      ],
    },
  ],
});

// 3.8 Object generator expression
addPattern("object_generator", {
  patterns: [
    {
      match: "\\b(?i)(new)\\s+\\b(" + IDENTIFIER + ")",
      captures: {
        "1": {
          name: "keyword.control.new",
        },
        "2": {
          name: "entity.name.class",
        },
      },
    },
    {
      begin: "\\b(?i)(new)\\s+\\b(" + IDENTIFIER + ")\\s*(\\()",
      beginCaptures: {
        "1": {
          name: "keyword.control.new",
        },
        "2": {
          name: "entity.name.class",
        },
      },
      end: "\\)",
      endCaptures: {
        "1": {
          name: "punctuation.definition.arguments.end",
        },
      },
      patterns: [
        include("directive"),
        include("comments"),
        include("procedure_statement"),
        ...expressionPatterns,
      ],
    },
  ],
});

// 4.8 Connection statements
addPattern("connection_statement", {
  patterns: [
    {
      match: "(?i)\\b(when)\\s+(" + IDENTIFIER + ")\\b",
      captures: {
        "1": {
          name: "keyword.control.when",
        },
        "2": {
          name: "entity.name.class",
        },
      },
    },
    {
      match: token("do\\s+begin"),
      captures: {
        "1": {
          name: "keyword.control.do",
        },
        "2": {
          name: "keyword.control.begin",
        },
      },
    },
    {
      match: token("otherwise\\s+begin"),
      captures: {
        "1": {
          name: "keyword.control.otherwise",
        },
        "2": {
          name: "keyword.control.begin",
        },
      },
    },
    {
      match: token("disconnect"),
      name: "keyword.control.disconnect",
    },
  ],
});

// 4.9 Compound statements
addPattern("compound_statement", {
  priority: -1,
  patterns: [
    {
      match: "\\b(" + IDENTIFIER + ")\\s*(?i)(begin)\\b",
      captures: {
        "1": {
          name: "entity.name.class",
        },
        "2": {
          name: "keyword.control.begin",
        },
      },
    },
    {
      match: "\\b(?i)(begin)\\b",
      name: "keyword.control.begin",
    },
  ],
});

// 1.8.1 End Comment
addPattern("end", {
  patterns: [
    {
      match: "(?i)(end)(?=;)",
      captures: {
        "1": {
          name: "keyword.control.end",
        },
        "2": {
          name: "punctuation.terminator.statement",
        },
      },
    },
    {
      begin: "\\s?(?i)(end)([^A-Za-z0-9;])",
      beginCaptures: {
        "1": {
          name: "keyword.control.end",
        },
        "2": {
          name: "comment.block",
        },
      },
      end: "(?=(?i)(;|\\bend\\b|\\belse\\b|\\bwhen\\b|\\botherwise\\b))",
      name: "comment.block",
    },
  ],
});

// Boolean expressions
addPattern("boolean_expression", {
  priority: 1,
  patterns: [
    {
      match:
        "(?i)(" +
        [
          "and\\s+then",
          "or\\s+else",
          "lt",
          "le",
          "eq",
          "ge",
          "gt",
          "ne",
          "in",
          "not",
          "and",
          "or",
          "imp",
          "eqv",
          "qua",
        ]
          .map((keyword) => "\\b" + keyword + "\\b")
          .join("|") +
        ")",
      name: "keyword.operator",
    },
  ],
});

// 5.4 Procedure declarations
addPattern("procedure_declaration", {
  patterns: [
    {
      begin: "(?i)(procedure)\\s*([A-z][A-z0-9_]*)?",
      beginCaptures: {
        "1": {
          name: "storage.type",
        },
        "2": {
          name: "entity.name.function",
        },
      },
      end: ";",
      endCaptures: {
        "1": {
          name: "punctuation.terminator.statement",
        },
      },
      patterns: [
        {
          // match the arguments
          begin: "\\(",
          end: "\\)",
          patterns: [
            include("directive"),
            include("comments"),
            {
              match: "\\b[A-z][A-z0-9_]*\\b",
              name: "variable.parameter",
            },
          ],
        },
      ],
    },
  ],
});

// 5.5 Class declarations
addPattern("class_declaration", {
  patterns: [
    {
      begin: "(?i)(class)\\s*([A-z][A-z0-9_]*)?",
      beginCaptures: {
        "1": {
          name: "keyword.other.class",
        },
        "2": {
          name: "entity.name.class",
        },
      },
      end: ";",
      endCaptures: {
        "1": {
          name: "punctuation.terminator.statement",
        },
      },
      patterns: [
        {
          // match the arguments
          begin: "\\(",
          end: "\\)",
          patterns: [
            include("directive"),
            include("comments"),
            {
              match: wordBoundary(IDENTIFIER),
              name: "variable.parameter",
            },
          ],
        },
      ],
    },
  ],
});

// 6: External
addPattern("external_class_declaration", {
  patterns: [
    {
      begin: "(?i)(external)\\s+(class)\\s+",
      end: ";",
      patterns: [
        include("directive"),
        include("comments"),
        include("string"),
        {
          match: wordBoundary(IDENTIFIER),
          name: "entity.name.class",
        },
      ],
      beginCaptures: {
        "1": {
          name: "keyword.other.external",
        },
        "2": {
          name: "keyword.other.class",
        },
      },
    },
  ],
});

addPattern("external_procedure_declaration", {
  priority: 4,
  patterns: [
    {
      begin: "(?i)(external)\\s+(procedure)\\s+",
      end: ";",
      patterns: [
        include("directive"),
        include("comments"),
        include("string"),
        {
          match: wordBoundary(IDENTIFIER),
          name: "entity.name.function",
        },
      ],
      beginCaptures: {
        "1": {
          name: "keyword.other.external",
        },
        "2": {
          name: "storage.type",
        },
      },
    },
    {
      begin: "(?i)(external)\\s+(" + IDENTIFIER + ")\\s+(procedure)\\s+",
      end: ";",
      patterns: [
        {
          match: "\\b(" + IDENTIFIER + ")\\s*=\\s*(" + STRING + ")",
          captures: {
            "1": {
              name: "entity.name.function",
            },
            "2": {
              name: "string",
            },
          },
        },
        {
          match: token("is"),
          name: "keyword.control.is",
        },
        include("procedure_declaration"),
      ],
      beginCaptures: {
        "1": {
          name: "keyword.other.external",
        },
        "2": {
          name: "entity.name.other",
        },
        "3": {
          name: "storage.type",
        },
      },
    },
  ],
});

addPattern("control_flow_keywords", {
  priority: -1,
  patterns: [
    "if",
    "then",
    "else",
    "while",
    "do",
    "for",
    "step",
    "until",
    "goto",
    "go",
    "to",
    "inspect",
    "when",
    "otherwise",
    "switch",
    "activate",
    "reactivate",
    "at",
    "delay",
    "before",
    "after",
    "prior",
  ].map((keyword) => ({
    match: token(keyword),
    name: "keyword.control." + keyword,
  })),
});

addPattern("misc_keywords", {
  priority: -1,
  patterns: [
    "ref",
    "new",
    "class",
    "inner",
    "name",
    "value",
    "external",
    "virtual",
    "hidden",
    "protected",
    "is",
  ].map((keyword) => ({
    match: token(keyword),
    name: "keyword.other." + keyword,
  })),
});

// MISC
addPattern("variable", {
  priority: -1,
  match: wordBoundary(IDENTIFIER),
  name: "variable",
});

const grammar: TmGrammar = {
  $schema:
    "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  name: "Simula",
  scopeName: "source.sim",
  patterns: patterns
    .sort((a, b) => b.priority - a.priority)
    .map((entry) => ({ include: "#" + entry.name })),
  repository: Object.fromEntries(
    patterns
      .sort((a, b) => b.priority - a.priority)
      .map((entry) => [entry.name, entry.pattern])
  ),
};

const output = JSON.stringify(grammar, null, 2);
console.log(output);

fs.writeFile("syntaxes/simula.tmLanguage.json", output);
