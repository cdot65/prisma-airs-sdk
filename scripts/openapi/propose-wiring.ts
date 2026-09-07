/** @internal Emit a reviewable patch wiring existing request models into endpoint calls. */
import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';
import { collectCallSites, root } from './inventory.js';
import { requestSchemaName, resolveValidator } from './validators.js';

const calls = collectCallSites().filter(
  (c) =>
    c.plane !== 'gateway' &&
    !c.requestSchema &&
    resolveValidator(requestSchemaName(c)) &&
    (!process.argv[2] || c.source === process.argv[2]),
);
const patches: string[] = [];
const changes: string[] = [];
for (const source of new Set(calls.map((c) => c.source))) {
  const file = resolve(root, source);
  const before = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, before, ts.ScriptTarget.Latest, true);
  const imports = new Set<string>();
  const values = new Set<string>();
  for (const stmt of tree.statements)
    if (ts.isImportDeclaration(stmt) && !stmt.importClause?.isTypeOnly) {
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements)
          if (!element.isTypeOnly) values.add(element.name.text);
    }
  const edits: { start: number; value: string }[] = [];
  const visit = (node: ts.Node, member = '') => {
    if (ts.isMethodDeclaration(node)) member = node.name.getText(tree);
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === 'request' &&
      node.arguments[0] &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      const call = calls.find((c) => c.source === source && c.member === member);
      if (call) {
        const schema = requestSchemaName(call)!;
        const names = schema.match(/\b[A-Za-z]\w*Schema\b/g) ?? [];
        for (const name of names) if (!values.has(name)) imports.add(name);
        edits.push({
          start: node.arguments[0].getStart(tree) + 1,
          value: `\n      requestSchema: ${schema},`,
        });
        changes.push(`${source}:${member}`);
      }
    }
    ts.forEachChild(node, (child) => visit(child, member));
  };
  visit(tree);
  let after = before;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    after = after.slice(0, edit.start) + edit.value + after.slice(edit.start);
  if (imports.size) {
    let module = relative(dirname(file), resolve(root, 'src/models/index.js')).replaceAll(
      '\\',
      '/',
    );
    if (!module.startsWith('.')) module = './' + module;
    after = `import { ${[...imports].sort().join(', ')} } from '${module}';\n` + after;
  }
  if (after !== before)
    patches.push(
      `*** Update File: ${file}\n@@\n` +
        before
          .trimEnd()
          .split('\n')
          .map((l) => '-' + l)
          .join('\n') +
        '\n' +
        after
          .trimEnd()
          .split('\n')
          .map((l) => '+' + l)
          .join('\n'),
    );
}
console.log(
  JSON.stringify({ changes, patch: '*** Begin Patch\n' + patches.join('\n') + '\n*** End Patch' }),
);
