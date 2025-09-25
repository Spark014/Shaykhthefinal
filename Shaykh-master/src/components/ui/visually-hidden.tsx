import React from "react";

/**
 * VisuallyHidden component hides content visually but keeps it accessible to screen readers.
 */
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
  return (
    <span
      style={{
        border: 0,
        clip: "rect(0 0 0 0)",
        height: "1px",
        margin: "-1px",
        overflow: "hidden",
        padding: 0,
        position: "absolute",
        width: "1px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
};

export default VisuallyHidden;
