// Projects feature is not used in PropCare.
// Kept as a stub to preserve test infrastructure from the base template.
export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewProject = Omit<Project, "id" | "createdAt" | "updatedAt">;
