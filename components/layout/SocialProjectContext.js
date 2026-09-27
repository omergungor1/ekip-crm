"use client";

import { createContext, useContext } from "react";

export const SocialProjectContext = createContext({
  projectId: "",
  setProjectId: () => {},
  projects: [],
});

export function useSocialProject() {
  return useContext(SocialProjectContext);
}
