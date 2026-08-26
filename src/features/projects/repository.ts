// Projects repository stub — not used in PropCare.
// Kept for compatibility with inherited test infrastructure.
import type { NewProject, Project } from "./models";

export async function findById(_id: string): Promise<Project | undefined> {
  return undefined;
}

export async function findBySlug(_slug: string): Promise<Project | undefined> {
  return undefined;
}

export async function findByOwnerId(_ownerId: string): Promise<Project[]> {
  return [];
}

export async function findByIdAndOwner(_id: string, _ownerId: string): Promise<Project | undefined> {
  return undefined;
}

export async function create(_data: NewProject): Promise<Project> {
  throw new Error("Projects feature is not enabled in PropCare");
}

export async function update(
  _id: string,
  _data: Partial<Pick<Project, "name" | "description" | "isPublic">>,
): Promise<Project | undefined> {
  return undefined;
}

export async function deleteById(_id: string): Promise<boolean> {
  return false;
}

export async function countByOwnerId(_ownerId: string): Promise<number> {
  return 0;
}
