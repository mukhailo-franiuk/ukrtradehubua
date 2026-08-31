
import { db } from "@/lib/prisma";

import HeaderClient from "./HeaderClient";

export default async function Header() {
  const categories = await db.category.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      parentId: true,
      name: true,
      slug: true,
      icon: true,
      sortOrder: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });

  const rootCategories = categories.filter(
    (category) => category.parentId === null
  );

  const categoryTree = rootCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    children: categories
      .filter(
        (child) =>
          child.parentId === category.id
      )
      .map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        icon: child.icon,
      })),
  }));

  return (
    <HeaderClient
      categories={categoryTree}
    />
  );
}