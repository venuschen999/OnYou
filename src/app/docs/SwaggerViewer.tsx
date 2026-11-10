"use client";

import { useEffect, useRef, useState } from "react";
import "swagger-ui-react/swagger-ui.css";
import type { SwaggerUISystem } from "swagger-ui-bundle";

export const OPENAPI_SPEC_URL = "/api/openapi";

export function SwaggerViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return undefined;
    }

    let cancelled = false;
    let system: SwaggerUISystem | undefined;

    // swagger-ui-react's component loads ApiDOM source. Turbopack drops
    // OpenApi3_1Element.refract, so operation details never render. This
    // prebuilt bundle from the same package already includes that code.
    void import("swagger-ui-bundle")
      .then((ui) => {
        if (cancelled) {
          return;
        }
        system = ui.default({
          url: OPENAPI_SPEC_URL,
          domNode: container,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
      system?.destroy?.();
      container.replaceChildren();
    };
  }, []);

  return (
    <div>
      {status === "loading" ? <p>Loading API documentation…</p> : null}
      {status === "error" ? <p>Could not load API documentation.</p> : null}
      <div ref={containerRef} />
    </div>
  );
}
