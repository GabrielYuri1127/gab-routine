import { SubjectDetailView } from "@/features/academic/components/subject-detail-view";
import { mockSubjects } from "@/features/academic/data/mock";

export function generateStaticParams() {
  return mockSubjects.map((subject) => ({ id: subject.id }));
}

export default function SubjectPage({ params }: { params: { id: string } }) {
  return <SubjectDetailView subjectId={params.id} />;
}
