import { useEffect, useRef } from "react";

export const DEFAULT_DISPATCH_PLACEHOLDER = "";

type UseDocumentTitleOptions = {
  disabled?: boolean;
};

export function useDocumentTitle(title: string | null | undefined, options?: UseDocumentTitleOptions) {
  const { disabled = false } = options ?? {};
  const originalTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
        originalTitleRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined" || disabled) return;
    const nextTitle = title && title.trim() ? title : originalTitleRef.current;
    if (nextTitle) {
      document.title = nextTitle;
    }
  }, [title, disabled]);
}
