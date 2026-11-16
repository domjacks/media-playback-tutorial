// Wraps each top-level h2 and the prose that follows it (up to the next h2 or the
// next JSX component) in <section class="text-section">.

function isComponent(node) {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxjsEsm" || node.type === "mdxFlowExpression";
}

function isHeading(node) {
  return node.type === "element" && node.tagName === "h2";
}

export default function rehypeSections() {
  return (tree) => {
    const children = [];
    let section = null;
    for (const node of tree.children) {
      if (isHeading(node)) {
        section = {
          type: "element",
          tagName: "section",
          properties: { className: ["text-section"] },
          children: [node]
        };
        children.push(section);
      } else if (isComponent(node)) {
        section = null;
        children.push(node);
      } else if (section) {
        section.children.push(node);
      } else {
        children.push(node);
      }
    }
    tree.children = children;
  };
}
