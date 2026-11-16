import { lessonOrder } from "./order.js";

const modules = import.meta.glob("./*.mdx", { eager: true });

const bySlug = new Map();
for (const [path, module] of Object.entries(modules)) {
  const fileSlug = path.replace(/^\.\//, "").replace(/\.mdx$/, "");
  if (module.frontmatter?.slug !== fileSlug) {
    throw new Error(`Lesson ${path}: frontmatter slug "${module.frontmatter?.slug}" does not match filename "${fileSlug}"`);
  }
  if (!lessonOrder.includes(fileSlug)) {
    throw new Error(`Lesson ${path} is not listed in src/lessons/order.js`);
  }
  bySlug.set(fileSlug, module);
}

export const lessons = lessonOrder.map((slug) => {
  const module = bySlug.get(slug);
  if (!module) throw new Error(`Lesson "${slug}" is in src/lessons/order.js but src/lessons/${slug}.mdx does not exist`);
  return { ...module.frontmatter, Content: module.default };
});
