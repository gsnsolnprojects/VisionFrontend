import React from "react";
import { Navigate, useParams } from "react-router-dom";

/** Old address of label practice (/practice/:sampleId): it's now a step of Level 1 */
const LabelPracticePage: React.FC = () => {
  const { sampleId = "" } = useParams<{ sampleId: string }>();
  return <Navigate to={`/level-1/${encodeURIComponent(sampleId)}?step=practice`} replace />;
};

export default LabelPracticePage;
